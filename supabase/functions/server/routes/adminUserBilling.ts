// Admin → one account's billing (mounted at /admin/user-billing, module
// "users"): what the account has and has paid, and the actions that change
// it — Refund & end, refund a one-time charge, comp (free) plan, change plan.
//
// Every refund is recorded in billing_refunds with the admin's email; the
// webhook (charge.refunded) then reverses any affiliate commission.
import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "../lib/stripe.ts";
import { invoiceChargeId } from "../lib/stripeShapes.ts";
import { findCustomer } from "../lib/billing/customers.ts";
import { provisionSubscription, retrieveSubscription } from "../lib/billing/provision.ts";
import { changePlan, liveSubscriptionRow, PlanChangeError } from "../lib/billing/planChange.ts";
import { CatalogError } from "../lib/billing/catalog.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;
type Env = { Variables: { admin: AdminUser } };
const userBilling = new Hono<Env>();

function fail(c: Context, err: unknown) {
  if (err instanceof PlanChangeError || err instanceof CatalogError) return c.json({ error: err.message }, err.status);
  console.error("admin billing:", err);
  return c.json({ error: err instanceof Error ? err.message : "Billing request failed" }, 502);
}

const needsStripe = (c: Context) => stripeMode() ? null : c.json({ error: "Stripe is not configured" }, 503);

// GET /admin/user-billing/:id — the whole billing picture for one account.
userBilling.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();
  const [account, customers, subs, consents, periods, closures, refunds, payments, card, commissions] = await Promise.all([
    db.from("users").select("id, email, full_name, plan, plan_status, subscription_waived, waive_reason, overage_blocked, deceased_at").eq("id", id).maybeSingle(),
    db.from("billing_customers").select("*").eq("user_id", id),
    db.from("subscriptions").select("*").eq("user_id", id).order("updated_at", { ascending: false }),
    db.from("billing_consents").select("id, purpose, plan_id, product_slug, interval, amount_cents, consent_version, checkout_session_id, livemode, created_at, completed_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("usage_periods").select("*").eq("user_id", id).order("period_start", { ascending: false }).limit(6),
    db.from("usage_period_closures").select("*").eq("user_id", id).order("period_end", { ascending: false }).limit(12),
    db.from("billing_refunds").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(25),
    db.from("wg_payment_methods").select("card_brand, card_last4, card_expiry, livemode, updated_at").eq("user_id", id).maybeSingle(),
    db.from("affiliate_commissions").select("*").eq("referred_user_id", id).order("created_at", { ascending: false }),
  ]);
  if (!account.data) return c.json({ error: "User not found" }, 404);

  let invoices: Obj[] = [];
  let invoiceError: string | null = null;
  const customer = stripeMode() ? await findCustomer(id) : null;
  if (customer) {
    try {
      const list = await stripe<{ data: Obj[] }>("GET", "/invoices", { customer, limit: 12 });
      invoices = list.data.map((i) => ({
        id: i.id, number: i.number, status: i.status, amountDue: i.amount_due, amountPaid: i.amount_paid,
        billingReason: i.billing_reason, created: i.created, hostedInvoiceUrl: i.hosted_invoice_url,
        chargeId: invoiceChargeId(i), purpose: i.metadata?.purpose ?? i.metadata?.purchaseType ?? null,
      }));
    } catch (err) {
      invoiceError = err instanceof Error ? err.message : String(err);
    }
  }

  return c.json({
    account: account.data, customers: customers.data ?? [], subscriptions: subs.data ?? [], consents: consents.data ?? [],
    usagePeriods: periods.data ?? [], closures: closures.data ?? [], refunds: refunds.data ?? [], payments: payments.data ?? [],
    wgCard: card.data ?? null, commissions: commissions.data ?? [], invoices, invoiceError, livemode: isLivemode(),
    stripeCustomerId: customer,
  });
});

async function recordRefund(userId: string, refund: Obj, o: { chargeId: string; invoiceId?: string | null; subscriptionId?: string | null; reason: string; source: string; admin: AdminUser }) {
  await adminClient().from("billing_refunds").upsert({
    user_id: userId, stripe_refund_id: refund.id, stripe_charge_id: o.chargeId, stripe_invoice_id: o.invoiceId ?? null,
    stripe_subscription_id: o.subscriptionId ?? null, amount_cents: refund.amount, reason: o.reason, source: o.source,
    initiated_by: o.admin.email, livemode: isLivemode(),
  }, { onConflict: "stripe_refund_id" });
}

// POST /admin/user-billing/:id/refund-and-end { productLine?, reason, amountCents? }
// Refunds the subscription's latest paid invoice (in full unless an amount is
// given) and cancels the subscription now.
userBilling.post("/:id/refund-and-end", async (c) => {
  const stop = needsStripe(c);
  if (stop) return stop;
  const id = c.req.param("id");
  const admin = c.get("admin");
  const body = await c.req.json().catch(() => ({}));
  const line = body.productLine === "dr_addon" ? "dr_addon" : "plan";
  const reason = String(body.reason ?? "").trim();
  if (!reason) return c.json({ error: "A reason is required" }, 400);

  try {
    const row = await liveSubscriptionRow(id, line);
    if (!row || row.id.startsWith("comp_")) return c.json({ error: "No paid subscription to refund on this account" }, 409);
    const paid = await stripe<{ data: Obj[] }>("GET", "/invoices", { subscription: row.id, status: "paid", limit: 1 });
    const invoice = paid.data[0];
    const chargeId = invoice ? invoiceChargeId(invoice) : null;

    let refund: Obj | null = null;
    if (chargeId && (invoice.amount_paid ?? 0) > 0) {
      const amount = body.amountCents ? Math.min(Number(body.amountCents), invoice.amount_paid) : undefined;
      refund = await stripe<Obj>("POST", "/refunds", {
        charge: chargeId, amount, reason: "requested_by_customer",
        metadata: { source: "admin_refund_and_end", userId: id, admin: admin.email, reason: reason.slice(0, 400) },
      }, { idempotencyKey: `refund-end:${row.id}` });
      await recordRefund(id, refund, { chargeId, invoiceId: invoice.id, subscriptionId: row.id, reason, source: "admin_refund_and_end", admin });
    }
    await stripe("DELETE", `/subscriptions/${row.id}`, { prorate: false, invoice_now: false }).catch((err) => {
      if (!(err instanceof Error && /canceled|No such subscription/i.test(err.message))) throw err;
    });
    await provisionSubscription(await retrieveSubscription(row.id));
    return c.json({ ok: true, refundedCents: refund?.amount ?? 0, refundId: refund?.id ?? null, subscriptionId: row.id });
  } catch (err) {
    return fail(c, err);
  }
});

// POST /admin/user-billing/:id/refund { chargeId, amountCents?, reason } —
// a one-time charge (Continuation Fee, White Glove) or part of any charge.
userBilling.post("/:id/refund", async (c) => {
  const stop = needsStripe(c);
  if (stop) return stop;
  const id = c.req.param("id");
  const admin = c.get("admin");
  const body = await c.req.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!reason || !body.chargeId) return c.json({ error: "A charge and a reason are required" }, 400);
  try {
    const customer = await findCustomer(id);
    const charge = await stripe<Obj>("GET", `/charges/${body.chargeId}`);
    if (!customer || charge.customer !== customer) return c.json({ error: "That charge doesn't belong to this account" }, 400);
    const refund = await stripe<Obj>("POST", "/refunds", {
      charge: charge.id, amount: body.amountCents ? Number(body.amountCents) : undefined, reason: "requested_by_customer",
      metadata: { source: "admin_refund", userId: id, admin: admin.email, reason: reason.slice(0, 400) },
    }, { idempotencyKey: `refund:${charge.id}:${body.amountCents ?? "full"}:${charge.amount_refunded}` });
    await recordRefund(id, refund, { chargeId: charge.id, invoiceId: typeof charge.invoice === "string" ? charge.invoice : null, reason, source: "admin_refund", admin });
    return c.json({ ok: true, refundedCents: refund.amount, refundId: refund.id });
  } catch (err) {
    return fail(c, err);
  }
});

// POST /admin/user-billing/:id/comp { planId, reason } — a free plan, never invoiced.
userBilling.post("/:id/comp", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("admin");
  const body = await c.req.json().catch(() => ({}));
  const reason = String(body.reason ?? "").trim();
  if (!body.planId || !reason) return c.json({ error: "A plan and a reason are required" }, 400);
  const db = adminClient();
  const { data: plan } = await db.from("subscription_plans").select("id, billable, is_active").eq("id", body.planId).maybeSingle();
  if (!plan || !plan.billable || !plan.is_active) return c.json({ error: "Choose a paid plan to comp" }, 400);
  const live = await liveSubscriptionRow(id, "plan");
  if (live && !live.id.startsWith("comp_")) {
    return c.json({ error: "This account pays for a plan. Use Refund & end (or let it cancel) before comping." }, 409);
  }
  const { error } = await db.rpc("provision_subscription", { p: {
    id: `comp_${id}`, user_id: id, product_line: "plan", plan_id: plan.id, status: "active",
    canceled_at: null, ended_at: null, comp_reason: reason, comp_granted_by: admin.email,
  } });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// DELETE /admin/user-billing/:id/comp — ends the free plan (the account then
// sees Reactivate and can buy a plan).
userBilling.delete("/:id/comp", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();
  const { data: row } = await db.from("subscriptions").select("*").eq("id", `comp_${id}`).maybeSingle();
  if (!row || row.status !== "active") return c.json({ error: "This account has no comped plan" }, 409);
  const { error } = await db.rpc("provision_subscription", { p: {
    ...row, status: "canceled", canceled_at: new Date().toISOString(), ended_at: new Date().toISOString(),
  } });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// POST /admin/user-billing/:id/change-plan { planId, interval } — same rules
// as the account's own change (upgrade now, downgrade at period end).
userBilling.post("/:id/change-plan", async (c) => {
  const stop = needsStripe(c);
  if (stop) return stop;
  const body = await c.req.json().catch(() => ({}));
  try {
    return c.json(await changePlan(c.req.param("id"), String(body.planId ?? ""), body.interval === "year" ? "year" : "month"));
  } catch (err) {
    return fail(c, err);
  }
});

export default userBilling;
