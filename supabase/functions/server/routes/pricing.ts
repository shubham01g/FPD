// Backs the Pricing config screen (Milestone 3, Phase 3 — not yet built on the
// frontend). Reads/writes subscription_plans and the storage-threshold keys in
// admin_settings, so plan pricing and storage tiers can be edited live.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const pricing = new Hono();

const THRESHOLD_KEYS = [
  "overage_rate_per_gb", "storage_alert_80", "storage_alert_90", "storage_alert_95",
  "continuation_fee_amount", "continuation_fee_period_months", "starter_trial_days",
] as const;

// GET /admin/pricing — plans + storage/overage thresholds in one payload
pricing.get("/", async (c) => {
  const db = adminClient();
  const [{ data: plans, error: plansErr }, { data: settings, error: settingsErr }, { data: products, error: productsErr }] = await Promise.all([
    db.from("subscription_plans").select("*").order("price_monthly", { ascending: true }),
    db.from("admin_settings").select("key, value, updated_at").in("key", THRESHOLD_KEYS as unknown as string[]),
    db.from("billing_products").select("*").order("sort_order"),
  ]);

  if (plansErr) return c.json({ error: plansErr.message }, 500);
  if (settingsErr) return c.json({ error: settingsErr.message }, 500);
  if (productsErr) return c.json({ error: productsErr.message }, 500);

  return c.json({ plans, thresholds: settings, products });
});

// PATCH /admin/pricing/plans/:id — edit a plan's pricing/storage/limits
pricing.patch("/plans/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["name", "price_monthly", "price_annual", "storage_gb", "max_contacts", "overage_rate", "is_active"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("subscription_plans").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Plan not found" }, 404);
  // A new price only reaches checkout after Billing → Sync catalog creates it
  // in Stripe (until then checkout for this plan says it's being updated).
  const needsSync = "price_monthly" in patch || "price_annual" in patch;
  return c.json({ plan: data, needsSync });
});

// PATCH /admin/pricing/products/:slug { amount_cents?, name?, active? } — an
// add-on or one-time price. Like plans, a new amount needs a catalog sync.
pricing.patch("/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const body = await c.req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.amount_cents !== undefined) {
    const cents = Math.round(Number(body.amount_cents));
    if (!Number.isFinite(cents) || cents < 50) return c.json({ error: "Price must be at least $0.50 (Stripe's minimum)" }, 400);
    patch.amount_cents = cents;
  }
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.active === "boolean") patch.active = body.active;

  const db = adminClient();
  const { data, error } = await db.from("billing_products").update(patch).eq("slug", slug).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Product not found" }, 404);
  // The Legacy Fee page reads the fee from admin_settings; keep the two equal.
  if (slug === "continuation_fee" && patch.amount_cents !== undefined) {
    await db.from("admin_settings").upsert({ key: "continuation_fee_amount", value: (Number(patch.amount_cents) / 100).toFixed(2), updated_at: new Date().toISOString() });
  }
  return c.json({ product: data, needsSync: patch.amount_cents !== undefined });
});

// PATCH /admin/pricing/settings/:key — edit a threshold/admin_settings value
pricing.patch("/settings/:key", async (c) => {
  const key = c.req.param("key");
  if (!THRESHOLD_KEYS.includes(key as (typeof THRESHOLD_KEYS)[number])) {
    return c.json({ error: `Unknown setting key: ${key}` }, 400);
  }
  const { value } = await c.req.json().catch(() => ({ value: undefined }));
  if (typeof value !== "string") return c.json({ error: "'value' must be a string" }, 400);

  const admin = c.get("admin") as { id: string } | undefined;
  const { data, error } = await adminClient()
    .from("admin_settings")
    .upsert({ key, value, updated_by: admin?.id, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  // ...and the other way round: the fee set on the Legacy Fee page is the
  // catalog's continuation_fee price (a catalog sync then creates it in Stripe).
  if (key === "continuation_fee_amount" && /^[0-9]+(\.[0-9]+)?$/.test(value)) {
    await adminClient().from("billing_products").update({ amount_cents: Math.round(Number(value) * 100), updated_at: new Date().toISOString() }).eq("slug", "continuation_fee");
  }
  return c.json({ setting: data });
});

export default pricing;
