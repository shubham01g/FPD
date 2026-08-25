// Backs the Command Center overview/analytics tabs in MasterAdmin.tsx.
// Only computes metrics the schema actually supports (users, plans, payments,
// storage_usage). MasterAdmin.tsx's demo data also shows gender/age/state
// breakdowns — there is no column for any of that anywhere in the schema, so
// those charts have nothing to bind to yet. That's a product decision (add
// the columns, collect the data some other way, or drop the charts), not a
// backend wiring gap — flagging it here rather than fabricating fake fields.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const analytics = new Hono();

// GET /admin/analytics/overview
analytics.get("/overview", async (c) => {
  const db = adminClient();

  const [
    { count: totalUsers, error: usersErr },
    { data: planRows, error: planErr },
    { data: plans, error: plansDefErr },
    { data: payments, error: paymentsErr },
  ] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("users").select("plan, plan_status"),
    db.from("subscription_plans").select("id, price_monthly"),
    db.from("payments").select("amount_usd, status, type, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);

  if (usersErr) return c.json({ error: usersErr.message }, 500);
  if (planErr) return c.json({ error: planErr.message }, 500);
  if (plansDefErr) return c.json({ error: plansDefErr.message }, 500);
  if (paymentsErr) return c.json({ error: paymentsErr.message }, 500);

  const priceByPlan = new Map((plans ?? []).map((p) => [p.id, Number(p.price_monthly)]));

  const usersByPlan: Record<string, number> = {};
  let mrr = 0;
  for (const row of planRows ?? []) {
    usersByPlan[row.plan] = (usersByPlan[row.plan] ?? 0) + 1;
    if (row.plan_status === "active") mrr += priceByPlan.get(row.plan) ?? 0;
  }

  const revenueByType: Record<string, number> = {};
  let totalRevenue = 0;
  for (const p of payments ?? []) {
    if (p.status !== "succeeded") continue;
    revenueByType[p.type] = (revenueByType[p.type] ?? 0) + Number(p.amount_usd);
    totalRevenue += Number(p.amount_usd);
  }

  return c.json({
    totalUsers,
    usersByPlan,
    mrr: Math.round(mrr * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    revenueByType,
  });
});

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

// GET /admin/analytics/revenue-trend — last 6 months of subscription / overage
// / affiliate-commission dollars, for the Revenue tab's bar chart.
analytics.get("/revenue-trend", async (c) => {
  const db = adminClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const since = sixMonthsAgo.toISOString();

  const [{ data: payments, error: paymentsErr }, { data: payouts, error: payoutsErr }] = await Promise.all([
    db.from("payments").select("amount_usd, type, status, created_at").eq("status", "succeeded").gte("created_at", since),
    db.from("payouts").select("amount, payout_type, status, processed_at").eq("status", "paid").gte("processed_at", since),
  ]);

  if (paymentsErr) return c.json({ error: paymentsErr.message }, 500);
  if (payoutsErr) return c.json({ error: payoutsErr.message }, 500);

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d.toISOString()));
  }

  const byMonth: Record<string, { month: string; mrr: number; overage: number; affiliates: number }> = {};
  for (const m of months) byMonth[m] = { month: m, mrr: 0, overage: 0, affiliates: 0 };

  for (const p of payments ?? []) {
    const m = monthKey(p.created_at);
    if (!byMonth[m]) continue;
    if (p.type === "subscription" || p.type === "upgrade") byMonth[m].mrr += Number(p.amount_usd);
    else if (p.type === "overage") byMonth[m].overage += Number(p.amount_usd);
  }
  for (const p of payouts ?? []) {
    if (p.payout_type !== "affiliate" || !p.processed_at) continue;
    const m = monthKey(p.processed_at);
    if (!byMonth[m]) continue;
    byMonth[m].affiliates += Number(p.amount);
  }

  return c.json({ trend: months.map((m) => byMonth[m]) });
});

// GET /admin/analytics/storage — per-plan average utilization + platform totals.
analytics.get("/storage", async (c) => {
  const db = adminClient();
  const period = new Date().toISOString().slice(0, 7);

  const [{ data: plans, error: plansErr }, { data: usage, error: usageErr }, { data: setting }] = await Promise.all([
    db.from("subscription_plans").select("id, name, storage_gb"),
    db.from("storage_usage").select("user_id, used_bytes, overage_bytes, plan_limit_gb, billing_period, users(plan)").eq("billing_period", period),
    db.from("admin_settings").select("value").eq("key", "overage_rate_per_gb").maybeSingle(),
  ]);

  if (plansErr) return c.json({ error: plansErr.message }, 500);
  if (usageErr) return c.json({ error: usageErr.message }, 500);

  type UsageRow = { used_bytes: number; overage_bytes: number; users: { plan: string } | null };
  const rows = (usage ?? []) as unknown as UsageRow[];

  const byPlan: Record<string, { totalBytes: number; count: number }> = {};
  let totalBytes = 0;
  let totalOverageBytes = 0;
  for (const row of rows) {
    const planId = row.users?.plan;
    if (planId) {
      byPlan[planId] ??= { totalBytes: 0, count: 0 };
      byPlan[planId].totalBytes += Number(row.used_bytes);
      byPlan[planId].count += 1;
    }
    totalBytes += Number(row.used_bytes);
    totalOverageBytes += Number(row.overage_bytes);
  }

  const GB = 1024 ** 3;
  const perPlan = (plans ?? []).map((p) => {
    const agg = byPlan[p.id];
    const avgUsedGb = agg && agg.count ? agg.totalBytes / agg.count / GB : 0;
    return { plan: p.id, planName: p.name, avgUsedGb: Math.round(avgUsedGb * 10) / 10, limitGb: p.storage_gb };
  });

  const userCount = rows.length;

  return c.json({
    perPlan,
    totals: {
      totalStorageGb: Math.round(totalBytes / GB),
      totalOverageGb: Math.round(totalOverageBytes / GB),
      avgPerUserGb: userCount ? Math.round((totalBytes / userCount / GB) * 10) / 10 : 0,
      overageRatePerGb: setting?.value ? Number(setting.value) : null,
    },
  });
});

export default analytics;
