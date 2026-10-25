// Plan changes go through the app, not the portal (framework §3.5):
//
//   upgrade            immediate and prorated (always_invoice). Usage is closed
//   (or same plan,     at the old rate when the new plan lands. payment_behavior
//   monthly → annual)  pending_if_incomplete: if the card is declined the
//                      change simply doesn't happen.
//   downgrade          at the end of the period, through a subscription
//   (or annual →       schedule, shown as pending until then. Nothing is
//   monthly)           charged today.
//
// "Higher" means a higher monthly-equivalent price. Used by the account's own
// /account/billing/change-plan and by the admin's change-plan button.
import { adminClient } from "../supabaseAdmin.ts";
import { stripe } from "../stripe.ts";
import { idOf } from "../stripeShapes.ts";
import { CatalogError, cents, planPrice, type Interval, type PlanRow } from "./catalog.ts";
import { ACCESS_STATUSES, provisionSubscription, retrieveSubscription } from "./provision.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

export class PlanChangeError extends Error {
  status: 400 | 409;
  constructor(message: string, status: 400 | 409 = 409) { super(message); this.status = status; }
}

/** The account's live subscription on a product line (comp rows included). */
export async function liveSubscriptionRow(userId: string, line: "plan" | "dr_addon") {
  const { data } = await adminClient().from("subscriptions").select("*")
    .eq("user_id", userId).eq("product_line", line).in("status", ACCESS_STATUSES)
    .order("updated_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

async function paidRow(userId: string, line: "plan" | "dr_addon") {
  const row = await liveSubscriptionRow(userId, line);
  if (!row) throw new PlanChangeError(line === "plan" ? "There is no paid plan on this account to change." : "Disaster Recovery isn't active on this account.");
  if (row.id.startsWith("comp_")) throw new PlanChangeError("This plan was given by an admin. Please contact support to change it.");
  return row;
}

const monthlyEquivalent = (plan: PlanRow, interval: Interval) =>
  interval === "year" ? cents(plan.price_annual) / 12 : cents(plan.price_monthly);

async function releaseSchedule(scheduleId: string | null) {
  if (!scheduleId) return;
  const schedule = await stripe<Obj>("GET", `/subscription_schedules/${scheduleId}`);
  if (schedule.status === "active" || schedule.status === "not_started") {
    await stripe("POST", `/subscription_schedules/${scheduleId}/release`, {});
  }
}

export interface PlanChangeResult {
  applied: "now" | "period_end" | "pending_payment";
  effectiveAt: string | null;
  planId: string;
  interval: Interval;
}

export async function changePlan(userId: string, planId: string, interval: Interval): Promise<PlanChangeResult> {
  const row = await paidRow(userId, "plan");
  const db = adminClient();
  const [{ data: current }, target] = await Promise.all([
    db.from("subscription_plans").select("*").eq("id", row.plan_id).maybeSingle<PlanRow>(),
    planPrice(planId, interval),
  ]);
  if (!current) throw new PlanChangeError("The current plan could not be found.", 400);
  if (row.plan_id === planId && row.interval === interval && !row.pending_plan_id) {
    throw new PlanChangeError("You're already on that plan.");
  }

  const sub = await retrieveSubscription(row.id);
  const metadata = { userId, planId, interval, purchaseType: "plan" };
  const sameTarget = row.plan_id === planId && row.interval === interval;
  // Yearly → monthly is never immediate: proration would credit back most of
  // the paid year. It waits for the year to end, like a downgrade.
  const higher = !(row.interval === "year" && interval === "month")
    && (monthlyEquivalent(target.plan, interval) > monthlyEquivalent(current, row.interval as Interval)
      || (row.plan_id === planId && row.interval === "month" && interval === "year"));

  // Switching back to the current plan just drops the pending downgrade.
  if (sameTarget) {
    await releaseSchedule(idOf(sub.schedule));
    await provisionSubscription(await retrieveSubscription(row.id));
    return { applied: "now", effectiveAt: null, planId, interval };
  }

  if (higher) {
    await releaseSchedule(idOf(sub.schedule));
    // Bring the meter up to date. Usage is closed at the old plan's rate by
    // apply_user_entitlements once the new plan is provisioned (and not at all
    // if the payment fails). Rolling the period here instead would reopen it on
    // the old plan for a moment, and that sliver would bill the overage twice.
    const { error } = await db.rpc("refresh_storage_usage", { p_user: userId });
    if (error) throw new Error(`refresh_storage_usage failed: ${error.message}`);
    // An upgrade means staying, so drop any cancellation first: a
    // pending_if_incomplete update accepts only items and proration fields.
    if (sub.cancel_at_period_end) await stripe("POST", `/subscriptions/${row.id}`, { cancel_at_period_end: false });
    const updated = await stripe<Obj>("POST", `/subscriptions/${row.id}`, {
      items: [{ id: sub.items.data[0].id, price: target.priceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
    });
    await provisionSubscription(await retrieveSubscription(row.id));
    return { applied: updated.pending_update ? "pending_payment" : "now", effectiveAt: null, planId, interval };
  }

  // Downgrade: keep the current price to the end of the period, then switch.
  const scheduleId = idOf(sub.schedule)
    ?? (await stripe<Obj>("POST", "/subscription_schedules", { from_subscription: row.id })).id;
  const schedule = await stripe<Obj>("GET", `/subscription_schedules/${scheduleId}`);
  const phase = schedule.current_phase ?? {};
  const currentPrice = idOf(sub.items.data[0].price);
  const currentMeta = { userId, planId: row.plan_id, interval: row.interval, purchaseType: "plan" };
  await stripe("POST", `/subscription_schedules/${scheduleId}`, {
    end_behavior: "release",
    proration_behavior: "none",
    phases: [
      { items: [{ price: currentPrice, quantity: 1 }], start_date: phase.start_date, end_date: phase.end_date, metadata: currentMeta },
      { items: [{ price: target.priceId, quantity: 1 }], iterations: 1, metadata },
    ],
  });
  if (sub.cancel_at_period_end) {
    // A schedule-managed subscription can't also be set to cancel; keep the
    // owner's intent visible instead of silently dropping it.
    console.warn(`subscription ${row.id} was set to cancel; the scheduled downgrade replaces that`);
  }
  const fresh = await provisionSubscription(await retrieveSubscription(row.id));
  return { applied: "period_end", effectiveAt: fresh?.row.pending_change_at ?? null, planId, interval };
}

/** Drops a pending downgrade (releases the schedule). */
export async function cancelPendingChange(userId: string) {
  const row = await paidRow(userId, "plan");
  if (!row.stripe_schedule_id) throw new PlanChangeError("There is no pending plan change.");
  await releaseSchedule(row.stripe_schedule_id);
  await provisionSubscription(await retrieveSubscription(row.id));
}

/** Cancel at period end (resume undoes it). The plan or add-on stays active
 *  until the end of what was paid for. */
export async function setCancelAtPeriodEnd(userId: string, line: "plan" | "dr_addon", cancel: boolean) {
  const row = await paidRow(userId, line);
  if (cancel) await releaseSchedule(row.stripe_schedule_id);
  await stripe("POST", `/subscriptions/${row.id}`, { cancel_at_period_end: cancel });
  await provisionSubscription(await retrieveSubscription(row.id));
}

export { CatalogError };
