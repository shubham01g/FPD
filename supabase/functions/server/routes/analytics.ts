// Backs the Command Center overview/analytics tabs in MasterAdmin.tsx.
// Only computes metrics the schema actually supports (users, plans, payments,
// storage_usage, and — since migration 020 — gender/birthdate/country/
// device_type/referral_source on public.users). Geography (state/city),
// engagement (DAU/MAU, feature usage) and satisfaction (NPS) still have no
// backing column or event table anywhere, so those panels remain
// "NotCollected" in MasterAdmin.tsx — that's a larger, separate build
// (session/event tracking, a survey feature), not covered here.
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

// GET /admin/analytics/demographics — gender / age / country / device /
// referral-source breakdowns from public.users (migration 020). Counts only
// non-null values per field so an account that skipped one question doesn't
// skew another field's distribution; each panel's own total is returned
// alongside so the frontend can show "N of totalUsers reported".
analytics.get("/demographics", async (c) => {
  const db = adminClient();

  const { data: rows, error } = await db
    .from("users")
    .select("gender, birthdate, country, device_type, referral_source");

  if (error) return c.json({ error: error.message }, 500);

  const count = (field: "gender" | "country" | "device_type" | "referral_source") => {
    const out: Record<string, number> = {};
    for (const r of rows ?? []) {
      const v = r[field];
      if (!v) continue;
      out[v] = (out[v] ?? 0) + 1;
    }
    return out;
  };

  const AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
  function ageBucket(birthdate: string): typeof AGE_BUCKETS[number] | null {
    const dob = new Date(birthdate);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
    if (age < 18) return null;
    if (age <= 24) return "18-24";
    if (age <= 34) return "25-34";
    if (age <= 44) return "35-44";
    if (age <= 54) return "45-54";
    if (age <= 64) return "55-64";
    return "65+";
  }

  const ageDistribution: Record<string, number> = {};
  let ageReported = 0;
  for (const r of rows ?? []) {
    if (!r.birthdate) continue;
    const bucket = ageBucket(r.birthdate);
    if (!bucket) continue;
    ageDistribution[bucket] = (ageDistribution[bucket] ?? 0) + 1;
    ageReported++;
  }

  const totalUsers = (rows ?? []).length;

  return c.json({
    totalUsers,
    gender: { counts: count("gender"), reported: (rows ?? []).filter((r) => r.gender).length },
    age: { counts: ageDistribution, reported: ageReported },
    country: { counts: count("country"), reported: (rows ?? []).filter((r) => r.country).length },
    device: { counts: count("device_type"), reported: (rows ?? []).filter((r) => r.device_type).length },
    referralSource: { counts: count("referral_source"), reported: (rows ?? []).filter((r) => r.referral_source).length },
  });
});

export default analytics;
