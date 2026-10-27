// Admin → billing setup and health (mounted at /admin/billing, module
// "subscription"). Per-account billing actions live in adminUserBilling.ts.
//
// Nothing here ever returns a key: status reports the mode from the key's
// prefix only.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { billingStatus } from "../lib/billingConfig.ts";
import { syncCatalog } from "../lib/billing/catalog.ts";
import { checkWebhook, portalConfigurationId, setupPortal, WEBHOOK_EVENTS } from "../lib/billing/setup.ts";
import { stripeMode } from "../lib/stripe.ts";

const adminBilling = new Hono();

/** The deployed function's name ("server" or "server-billing"), from the path. */
function functionName(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? "server";
}

function failure(err: unknown) {
  return { error: err instanceof Error ? err.message : "Stripe request failed" };
}

// GET /admin/billing/status — mode, switches, and whether the catalog and
// portal are set up in this mode.
adminBilling.get("/status", async (c) => {
  const db = adminClient();
  const [{ data: plans }, { data: products }, portalId] = await Promise.all([
    db.from("subscription_plans").select("id, price_monthly, price_annual, stripe_price_id_monthly, stripe_price_id_annual, synced_price_monthly_cents, synced_price_annual_cents, billable, is_active"),
    db.from("billing_products").select("slug, amount_cents, stripe_price_id, synced_amount_cents, active"),
    stripeMode() ? portalConfigurationId() : Promise.resolve(null),
  ]);
  const cents = (v: number) => Math.round(Number(v) * 100);
  const unsyncedPlans = (plans ?? []).filter((p) => p.billable && p.is_active && (
    !p.stripe_price_id_monthly || !p.stripe_price_id_annual ||
    p.synced_price_monthly_cents !== cents(p.price_monthly) || p.synced_price_annual_cents !== cents(p.price_annual))).map((p) => p.id);
  const unsyncedProducts = (products ?? []).filter((p) => p.active && (!p.stripe_price_id || p.synced_amount_cents !== p.amount_cents)).map((p) => p.slug);
  const fn = functionName(c.req.path);
  return c.json({
    ...billingStatus(),
    functionName: fn,
    webhookUrl: `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/${fn}/make-server-b5ad85e0/public/stripe/webhook`,
    webhookEvents: WEBHOOK_EVENTS,
    portalConfigured: Boolean(portalId),
    catalogInSync: unsyncedPlans.length === 0 && unsyncedProducts.length === 0,
    unsyncedPlans,
    unsyncedProducts,
  });
});

// POST /admin/billing/catalog/sync { dryRun } — dry run first, then for real.
adminBilling.post("/catalog/sync", async (c) => {
  if (!stripeMode()) return c.json({ error: "Stripe is not configured" }, 503);
  const { dryRun } = await c.req.json().catch(() => ({ dryRun: true }));
  try {
    return c.json(await syncCatalog(dryRun !== false));
  } catch (err) {
    return c.json(failure(err), 502);
  }
});

// POST /admin/billing/setup/portal — create or update the portal configuration.
adminBilling.post("/setup/portal", async (c) => {
  if (!stripeMode()) return c.json({ error: "Stripe is not configured" }, 503);
  try {
    return c.json(await setupPortal());
  } catch (err) {
    return c.json(failure(err), 502);
  }
});

// GET /admin/billing/setup/webhook — is an endpoint pointed here with every event?
adminBilling.get("/setup/webhook", async (c) => {
  if (!stripeMode()) return c.json({ error: "Stripe is not configured" }, 503);
  try {
    return c.json(await checkWebhook(functionName(c.req.path)));
  } catch (err) {
    return c.json(failure(err), 502);
  }
});

// GET /admin/billing/health — the Phase E daily checks: webhook events that
// failed or never finished, overage not billed after 2 hours, declined
// overage, and the dispute rate (keep it under 0.75%).
adminBilling.get("/health", async (c) => {
  const db = adminClient();
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [events, unbilled, failed, paid, disputed] = await Promise.all([
    db.from("stripe_events").select("id, type, received_at, attempts, last_error").is("processed_at", null).lt("received_at", tenMinAgo).order("received_at", { ascending: false }).limit(50),
    db.from("usage_period_closures").select("id, user_id, amount_cents, period_end, created_at").is("billed_at", null).is("skipped_reason", null).gt("amount_cents", 0).lt("created_at", twoHoursAgo).limit(100),
    db.from("usage_period_closures").select("id, user_id, amount_cents, stripe_invoice_id, payment_failed_at").not("payment_failed_at", "is", null).is("paid_at", null).limit(100),
    db.from("payments").select("id", { count: "exact", head: true }).gte("created_at", ninetyDaysAgo),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "disputed").gte("created_at", ninetyDaysAgo),
  ]);
  const paidCount = paid.count ?? 0;
  const disputedCount = disputed.count ?? 0;
  return c.json({
    failedOrStuckEvents: events.data ?? [],
    unbilledClosuresOver2h: unbilled.data ?? [],
    declinedOverage: failed.data ?? [],
    disputes90d: disputedCount,
    payments90d: paidCount,
    disputeRatePct: paidCount ? Math.round((disputedCount / paidCount) * 10000) / 100 : 0,
  });
});

export default adminBilling;
