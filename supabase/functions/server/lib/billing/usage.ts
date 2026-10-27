// Billing storage overage (framework §3.6). The database meters and closes
// usage periods (migration 040); this file turns unbilled closures into
// Stripe charges:
//
//   monthly plans  invoice.created for a renewal (billing_reason
//                  subscription_cycle) leaves a draft for about an hour;
//                  the closures are added to it as invoice items, so overage
//                  rides on the renewal invoice.
//   annual plans,  the hourly rollover bills unbilled closures older than an
//   anything else  hour as one standalone invoice (metadata.purpose =
//                  usage_overage). Below Stripe's $0.50 minimum it waits and
//                  batches with the next period, unless the plan has ended.
//
// A closure is claimed (claimed_at) before it is billed so two runs can't
// bill it twice; Stripe calls carry idempotency keys derived from the
// closure id, so a retry after a crash finds the same item or invoice.
import { adminClient } from "../supabaseAdmin.ts";
import { isLivemode, stripe } from "../stripe.ts";
import { findCustomer } from "./customers.ts";
import { ACCESS_STATUSES } from "./provision.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

const STRIPE_MINIMUM_CENTS = 50;
const CLAIM_TIMEOUT_MS = 60 * 60 * 1000;

interface Closure {
  id: string; user_id: string; subscription_id: string | null; plan_id: string;
  period_start: string; period_end: string; overage_units: number; rate_cents: number; amount_cents: number;
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function describe(c: Closure): string {
  return `Storage overage: ${c.overage_units} GB over your plan, ${day(c.period_start)} – ${day(c.period_end)}, at $${(c.rate_cents / 100).toFixed(2)}/GB`;
}

/** Claims the account's unbilled closures (and stale claims from a crashed run). */
async function claimClosures(userId: string, filter: (q: Obj) => Obj = (q) => q): Promise<Closure[]> {
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  const now = new Date().toISOString();
  const db = adminClient();
  const { data, error } = await filter(
    db.from("usage_period_closures")
      .update({ claimed_at: now })
      .eq("user_id", userId)
      .is("billed_at", null)
      .is("skipped_reason", null)
      .gt("amount_cents", 0)
      .eq("livemode", isLivemode())
      .or(`claimed_at.is.null,claimed_at.lt."${staleBefore}"`),
  ).select("id, user_id, subscription_id, plan_id, period_start, period_end, overage_units, rate_cents, amount_cents");
  if (error) throw new Error(`claiming closures failed: ${error.message}`);
  return (data ?? []) as Closure[];
}

async function unclaim(ids: string[]) {
  if (ids.length) await adminClient().from("usage_period_closures").update({ claimed_at: null }).in("id", ids).is("billed_at", null);
}

/**
 * invoice.created for a monthly renewal: close the usage period at the
 * renewal boundary and add every unbilled closure to the draft invoice.
 * Returns the number of items added. Errors are logged, never thrown — an
 * error answer to invoice.created holds the invoice back for up to 72 hours.
 */
export async function attachOverageToRenewal(invoice: Obj, userId: string, boundaryIso: string | null): Promise<number> {
  const db = adminClient();
  // The database's clock is real time even under a Stripe test clock
  // (pitfall 4.5), so never close a period later than now.
  const boundary = boundaryIso && new Date(boundaryIso).getTime() < Date.now() ? boundaryIso : new Date().toISOString();
  const { error: rollErr } = await db.rpc("roll_usage_period", { p_user: userId, p_boundary: boundary });
  if (rollErr) console.error(`roll_usage_period(${userId}) failed:`, rollErr.message);

  const closures = await claimClosures(userId);
  let added = 0;
  for (const c of closures) {
    try {
      const item = await stripe<{ id: string }>("POST", "/invoiceitems", {
        customer: invoice.customer,
        invoice: invoice.id,
        amount: c.amount_cents,
        currency: "usd",
        description: describe(c),
        metadata: { purpose: "usage_overage", closureId: c.id, userId },
      }, { idempotencyKey: `overage-item:${c.id}` });
      await db.from("usage_period_closures").update({
        stripe_invoice_item_id: item.id, stripe_invoice_id: invoice.id, billed_via: "renewal_invoice", billed_at: new Date().toISOString(),
      }).eq("id", c.id);
      added++;
    } catch (err) {
      console.error(`overage closure ${c.id} not added to ${invoice.id}:`, err);
      await unclaim([c.id]);
    }
  }
  return added;
}

/** The account's plan subscription with access, if any. */
async function livePlan(userId: string) {
  const { data } = await adminClient().from("subscriptions")
    .select("id, interval, current_period_start, default_payment_method")
    .eq("user_id", userId).eq("product_line", "plan").in("status", ACCESS_STATUSES).not("id", "like", "comp%")
    .order("updated_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

/** The card to charge: the plan subscription's, or the last one used. */
async function lastPaymentMethod(userId: string): Promise<string | null> {
  const { data } = await adminClient().from("subscriptions").select("default_payment_method")
    .eq("user_id", userId).not("default_payment_method", "is", null)
    .order("updated_at", { ascending: false }).limit(1);
  return data?.[0]?.default_payment_method ?? null;
}

export interface RolloverResult {
  periodsClosed: number;
  invoiced: { userId: string; invoiceId: string; amountCents: number; status: string }[];
  waiting: { userId: string; amountCents: number; reason: string }[];
  errors: { userId: string; error: string }[];
}

/**
 * The hourly job: close ended periods, then bill what monthly renewals won't
 * carry. Closures of an account on an active MONTHLY plan are left for its
 * next renewal invoice unless they are over 35 days old (a missed renewal).
 */
export async function runRollover(): Promise<RolloverResult> {
  const db = adminClient();
  const result: RolloverResult = { periodsClosed: 0, invoiced: [], waiting: [], errors: [] };

  const { data: closed, error: closeErr } = await db.rpc("close_ended_usage_periods");
  if (closeErr) throw new Error(`close_ended_usage_periods failed: ${closeErr.message}`);
  result.periodsClosed = Number(closed ?? 0);

  const hourAgo = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  const { data: pending } = await db.from("usage_period_closures")
    .select("user_id, amount_cents, created_at")
    .is("billed_at", null).is("skipped_reason", null).gt("amount_cents", 0)
    .eq("livemode", isLivemode()).lt("created_at", hourAgo);

  const byUser = new Map<string, { total: number; oldest: string }>();
  for (const r of pending ?? []) {
    const cur = byUser.get(r.user_id) ?? { total: 0, oldest: r.created_at };
    cur.total += r.amount_cents;
    if (r.created_at < cur.oldest) cur.oldest = r.created_at;
    byUser.set(r.user_id, cur);
  }

  for (const [userId, { total, oldest }] of byUser) {
    try {
      const plan = await livePlan(userId);
      const ageDays = (Date.now() - new Date(oldest).getTime()) / 86_400_000;
      if (plan?.interval === "month" && ageDays < 35) {
        result.waiting.push({ userId, amountCents: total, reason: "rides on the next monthly renewal" });
        continue;
      }
      if (total < STRIPE_MINIMUM_CENTS && plan) {
        result.waiting.push({ userId, amountCents: total, reason: "below Stripe's $0.50 minimum; batching" });
        continue;
      }
      const customer = await findCustomer(userId);
      if (!customer) {
        result.errors.push({ userId, error: "no Stripe customer in this mode" });
        continue;
      }

      const closures = await claimClosures(userId, (q) => q.lt("created_at", hourAgo));
      if (!closures.length) continue;
      const amount = closures.reduce((s, c) => s + c.amount_cents, 0);
      const firstId = [...closures].sort((a, b) => a.id.localeCompare(b.id))[0].id;
      const paymentMethod = plan?.default_payment_method ?? await lastPaymentMethod(userId);

      try {
        const invoice = await stripe<Obj>("POST", "/invoices", {
          customer,
          collection_method: "charge_automatically",
          auto_advance: true,
          pending_invoice_items_behavior: "exclude",
          currency: "usd",
          description: "Storage overage",
          ...(paymentMethod ? { default_payment_method: paymentMethod } : {}),
          metadata: { purpose: "usage_overage", userId },
        }, { idempotencyKey: `overage-invoice:${userId}:${firstId}` });

        for (const c of closures) {
          await stripe("POST", "/invoiceitems", {
            customer, invoice: invoice.id, amount: c.amount_cents, currency: "usd", description: describe(c),
            metadata: { purpose: "usage_overage", closureId: c.id, userId },
          }, { idempotencyKey: `overage-item:${c.id}` });
        }
        await db.from("usage_period_closures").update({
          stripe_invoice_id: invoice.id, billed_via: "standalone", billed_at: new Date().toISOString(),
        }).in("id", closures.map((c) => c.id));

        let status = "open";
        const finalized = await stripe<Obj>("POST", `/invoices/${invoice.id}/finalize`, { auto_advance: true },
          { idempotencyKey: `overage-finalize:${invoice.id}` }).catch((e) => ({ status: "draft", error: e }));
        if (finalized.status === "open") {
          // A decline comes back here as an error; invoice.payment_failed
          // marks the closures and blocks further overage.
          const paid = await stripe<Obj>("POST", `/invoices/${invoice.id}/pay`, { off_session: true },
            { idempotencyKey: `overage-pay:${invoice.id}` }).catch(() => null);
          status = paid?.status ?? "payment_failed";
        } else {
          status = finalized.status;
        }
        result.invoiced.push({ userId, invoiceId: invoice.id, amountCents: amount, status });
      } catch (err) {
        await unclaim(closures.map((c) => c.id));
        throw err;
      }
    } catch (err) {
      result.errors.push({ userId, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return result;
}
