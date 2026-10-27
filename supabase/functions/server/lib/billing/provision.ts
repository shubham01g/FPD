// Mirrors a Stripe subscription into the subscriptions table and re-derives
// the account's plan / status / Disaster Recovery through the database's
// provision_subscription (migration 039). Checkout, plan changes, renewals,
// failed payments and cancellations all come through here.
//
// The subscription is always re-read with the pinned API version, never taken
// from a webhook payload (pitfall 4.4).
import { adminClient } from "../supabaseAdmin.ts";
import { stripe } from "../stripe.ts";
import { idOf, subscriptionPeriod, subscriptionPrice, unixToIso } from "../stripeShapes.ts";
import { catalogItemForPrice } from "./catalog.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

export const ACCESS_STATUSES = ["active", "trialing", "past_due"];

/** Thrown when the account already has another subscription with access on
 *  the same product line (the database's unique index refused it). */
export class DuplicateSubscriptionError extends Error {
  subscriptionId: string;
  userId: string;
  constructor(subscriptionId: string, userId: string) {
    super(`Account ${userId} already has a live subscription on this product line; ${subscriptionId} is a duplicate`);
    this.subscriptionId = subscriptionId;
    this.userId = userId;
  }
}

export async function retrieveSubscription(id: string): Promise<Obj> {
  return await stripe<Obj>("GET", `/subscriptions/${id}`, {}, { expand: ["schedule"] });
}

/** The next schedule phase, when it changes what is sold (a pending downgrade
 *  or annual → monthly). */
async function pendingChange(sub: Obj, currentPriceId: string | null) {
  const schedule = sub.schedule && typeof sub.schedule === "object" ? sub.schedule : null;
  if (!schedule || schedule.status !== "active") return null;
  const currentEnd = schedule.current_phase?.end_date;
  const next = (schedule.phases ?? []).find((p: Obj) => currentEnd && p.start_date >= currentEnd);
  const nextPriceId = idOf(next?.items?.[0]?.price);
  if (!nextPriceId || nextPriceId === currentPriceId) return null;
  const price = await stripe<Obj>("GET", `/prices/${nextPriceId}`);
  const item = await catalogItemForPrice(price);
  if (item?.kind !== "plan") return null;
  return { planId: item.planId, interval: item.interval, at: unixToIso(next.start_date), scheduleId: schedule.id as string };
}

/**
 * Upserts the row for a Stripe subscription and applies entitlements.
 * Returns null for subscriptions this app didn't create (no userId metadata,
 * e.g. hand-made enterprise invoicing) or prices outside the catalog.
 */
export async function provisionSubscription(sub: Obj): Promise<{ userId: string; productLine: "plan" | "dr_addon"; row: Obj } | null> {
  const userId = sub.metadata?.userId as string | undefined;
  if (!userId) return null;

  const firstPrice = sub.items?.data?.[0]?.price ?? null;
  const item = await catalogItemForPrice(firstPrice);
  if (!item) {
    console.warn(`subscription ${sub.id}: price ${idOf(firstPrice)} is not in the catalog; ignored`);
    return null;
  }
  const productLine = item.kind === "plan" ? "plan" : item.group === "dr_addon" ? "dr_addon" : null;
  if (!productLine) return null;

  const { priceId, interval } = subscriptionPrice(sub);
  const period = subscriptionPeriod(sub);
  const pending = productLine === "plan" ? await pendingChange(sub, priceId) : null;

  const payload = {
    id: sub.id,
    user_id: userId,
    product_line: productLine,
    plan_id: item.kind === "plan" ? item.planId : null,
    product_slug: item.kind === "product" ? item.slug : null,
    status: sub.status,
    livemode: Boolean(sub.livemode),
    stripe_customer_id: idOf(sub.customer),
    stripe_price_id: priceId,
    interval,
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    cancel_at: unixToIso(sub.cancel_at),
    canceled_at: unixToIso(sub.canceled_at),
    ended_at: unixToIso(sub.ended_at),
    pending_plan_id: pending?.planId ?? null,
    pending_interval: pending?.interval ?? null,
    pending_change_at: pending?.at ?? null,
    stripe_schedule_id: idOf(sub.schedule),
    default_payment_method: idOf(sub.default_payment_method),
    metadata: {},
  };

  const { data, error } = await adminClient().rpc("provision_subscription", { p: payload });
  if (error) {
    if (error.code === "23505") throw new DuplicateSubscriptionError(sub.id, userId);
    throw new Error(`provision_subscription failed: ${error.message}`);
  }
  return { userId, productLine, row: data as Obj };
}

/** Re-reads and provisions in one step. */
export async function syncSubscription(id: string) {
  return await provisionSubscription(await retrieveSubscription(id));
}
