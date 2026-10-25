// Test-mode helpers for proving billing (GO_LIVE_CHECKLIST.md, Phase B),
// mounted at /admin/billing/test. Every route answers 404 unless the Stripe
// key is a TEST key, so none of this can touch live billing.
//
// Stripe test clocks move only Stripe's time; the database's now() stays
// real (pitfall 4.5). These let a tester line the two up and shrink the meter
// so overage can be produced with small files.
import { Hono } from "npm:hono";
import type { Context, Next } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { stripe, stripeMode } from "../lib/stripe.ts";
import { runRollover } from "../lib/billing/usage.ts";

const testRoutes = new Hono();

testRoutes.use("*", async (c: Context, next: Next) => {
  if (stripeMode() !== "test") return c.json({ error: "Not found" }, 404);
  await next();
});

async function openPeriod(userId: string) {
  const { data } = await adminClient().from("usage_periods").select("*").eq("user_id", userId).eq("status", "open").maybeSingle();
  return data;
}

// POST /set-meter { userId, unitBytes?, includedBytes? } — e.g. 1 MB units and
// 5 MB included, on the open period only.
testRoutes.post("/set-meter", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const db = adminClient();
  await db.rpc("ensure_open_usage_period", { p_user: body.userId });
  const period = await openPeriod(body.userId);
  if (!period) return c.json({ error: "No open usage period" }, 404);
  const patch: Record<string, number> = {};
  if (Number(body.unitBytes) > 0) patch.unit_bytes = Math.round(Number(body.unitBytes));
  if (Number(body.includedBytes) >= 0 && body.includedBytes !== undefined) patch.included_bytes = Math.round(Number(body.includedBytes));
  await db.from("usage_periods").update(patch).eq("id", period.id);
  await db.rpc("refresh_storage_usage", { p_user: body.userId });
  return c.json({ period: await openPeriod(body.userId) });
});

// POST /shift-usage-period { userId, hours } — moves the open period earlier
// by `hours` (after advancing a test clock), or { userId, endNow: true } to
// end it a minute ago so the next rollover closes it.
testRoutes.post("/shift-usage-period", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const period = await openPeriod(body.userId);
  if (!period) return c.json({ error: "No open usage period" }, 404);
  const db = adminClient();
  if (body.endNow) {
    const end = new Date(Date.now() - 60_000);
    const start = new Date(Math.min(new Date(period.period_start).getTime(), end.getTime() - 60_000));
    await db.from("usage_periods").update({ period_start: start.toISOString(), period_end: end.toISOString() }).eq("id", period.id);
  } else {
    const ms = Number(body.hours) * 3_600_000;
    if (!Number.isFinite(ms) || ms <= 0) return c.json({ error: "hours must be positive" }, 400);
    await db.from("usage_periods").update({
      period_start: new Date(new Date(period.period_start).getTime() - ms).toISOString(),
      period_end: new Date(new Date(period.period_end).getTime() - ms).toISOString(),
    }).eq("id", period.id);
  }
  return c.json({ period: await openPeriod(body.userId) });
});

// POST /age-closures { userId, hours } — makes the account's unbilled
// closures look older, so the rollover's one-hour wait doesn't hold a test up.
testRoutes.post("/age-closures", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const hours = Number(body.hours ?? 2);
  const db = adminClient();
  const { data } = await db.from("usage_period_closures").select("id, created_at").eq("user_id", body.userId).is("billed_at", null);
  for (const r of data ?? []) {
    await db.from("usage_period_closures").update({ created_at: new Date(new Date(r.created_at).getTime() - hours * 3_600_000).toISOString() }).eq("id", r.id);
  }
  return c.json({ aged: data?.length ?? 0 });
});

// POST /link-customer { userId, stripeCustomerId } — use a customer created
// on a Stripe test clock for this account (it must be a test customer).
testRoutes.post("/link-customer", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const customer = await stripe<Record<string, any>>("GET", `/customers/${body.stripeCustomerId}`).catch(() => null);
  if (!customer || customer.livemode || customer.deleted) return c.json({ error: "Not a test customer" }, 400);
  if (customer.metadata?.userId !== body.userId) {
    await stripe("POST", `/customers/${customer.id}`, { metadata: { userId: body.userId } });
  }
  const { error } = await adminClient().from("billing_customers").upsert({
    user_id: body.userId, livemode: false, stripe_customer_id: customer.id,
    test_clock_id: typeof customer.test_clock === "string" ? customer.test_clock : customer.test_clock?.id ?? null,
  }, { onConflict: "user_id,livemode" });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true, testClock: customer.test_clock ?? null });
});

// POST /clock { userId } — a Stripe test clock at the current time with a new
// test customer on it, linked to the account, so its next checkout bills on
// the clock. (The old customer's subscriptions keep working through their rows.)
testRoutes.post("/clock", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { data: user } = await adminClient().from("users").select("id, email, full_name").eq("id", body.userId).maybeSingle();
  if (!user) return c.json({ error: "No such account" }, 404);
  const clock = await stripe<Record<string, any>>("POST", "/test_helpers/test_clocks", {
    frozen_time: Math.floor(Date.now() / 1000), name: `FPD ${user.email}`.slice(0, 300),
  });
  const customer = await stripe<Record<string, any>>("POST", "/customers", {
    email: user.email, name: user.full_name ?? undefined, test_clock: clock.id, metadata: { userId: user.id },
  });
  const { error } = await adminClient().from("billing_customers").upsert({
    user_id: user.id, livemode: false, stripe_customer_id: customer.id, test_clock_id: clock.id,
  }, { onConflict: "user_id,livemode" });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ clockId: clock.id, customerId: customer.id, frozenTime: new Date(clock.frozen_time * 1000).toISOString() });
});

// POST /clock/advance { clockId, days } — moves the clock forward and waits
// (up to about 50 s) for Stripe to finish processing it.
testRoutes.post("/clock/advance", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const days = Number(body.days);
  if (!/^clock_/.test(String(body.clockId ?? "")) || !Number.isFinite(days) || days <= 0) return c.json({ error: "clockId and a positive days are required" }, 400);
  const clock = await stripe<Record<string, any>>("GET", `/test_helpers/test_clocks/${body.clockId}`);
  await stripe("POST", `/test_helpers/test_clocks/${body.clockId}/advance`, { frozen_time: clock.frozen_time + Math.round(days * 86_400) });
  let now = clock;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    now = await stripe<Record<string, any>>("GET", `/test_helpers/test_clocks/${body.clockId}`);
    if (now.status === "ready") break;
  }
  return c.json({ status: now.status, frozenTime: new Date(now.frozen_time * 1000).toISOString() });
});

// POST /set-card { userId, paymentMethod } — attaches a Stripe test card
// (e.g. "pm_card_chargeCustomerFail": attaches, then every charge fails) and
// makes it the default on the account's live plan subscription and customer.
testRoutes.post("/set-card", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const pmToken = String(body.paymentMethod ?? "");
  if (!/^pm_card_\w+$/.test(pmToken)) return c.json({ error: "paymentMethod must be a Stripe test token like pm_card_chargeCustomerFail" }, 400);
  const db = adminClient();
  const { data: sub } = await db.from("subscriptions").select("id, stripe_customer_id")
    .eq("user_id", body.userId).eq("product_line", "plan").in("status", ["active", "trialing", "past_due"]).not("id", "like", "comp%")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!sub) return c.json({ error: "No paid plan subscription" }, 404);
  const pm = await stripe<Record<string, any>>("POST", `/payment_methods/${pmToken}/attach`, { customer: sub.stripe_customer_id });
  await stripe("POST", `/customers/${sub.stripe_customer_id}`, { invoice_settings: { default_payment_method: pm.id } });
  await stripe("POST", `/subscriptions/${sub.id}`, { default_payment_method: pm.id });
  return c.json({ paymentMethod: pm.id, subscriptionId: sub.id });
});

// POST /win-dispute { chargeId } — submits Stripe's test evidence
// "winning_evidence" on the charge's dispute, so it closes as won.
testRoutes.post("/win-dispute", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const disputes = await stripe<{ data: Record<string, any>[] }>("GET", "/disputes", { charge: String(body.chargeId ?? ""), limit: 1 });
  const dispute = disputes.data[0];
  if (!dispute) return c.json({ error: "No dispute on that charge" }, 404);
  const updated = await stripe<Record<string, any>>("POST", `/disputes/${dispute.id}`, {
    evidence: { uncategorized_text: "winning_evidence" }, submit: true,
  });
  return c.json({ disputeId: updated.id, status: updated.status });
});

// POST /rollover — the hourly job, on demand.
testRoutes.post("/rollover", async (c) => c.json(await runRollover()));

export default testRoutes;
