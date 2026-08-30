// Backs WhiteLabelContext.tsx (per-partner config) and WLPackagesContext.tsx
// (the 3 sellable WL package tiers). Reads/writes white_label_configs and
// wl_packages so branding/feature-flag changes reflect live on the main app
// instead of living only in React state.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const whiteLabel = new Hono();

// POST /admin/white-label/configs — create a config row (used the first time
// there's nothing to edit yet; white_label_configs has no default seed row).
whiteLabel.post("/configs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.organization || !body.company_name) {
    return c.json({ error: "'organization' and 'company_name' are required" }, 400);
  }
  const { data, error } = await adminClient().from("white_label_configs").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ config: data }, 201);
});

// GET /admin/white-label/configs?active=true
whiteLabel.get("/configs", async (c) => {
  const active = c.req.query("active");
  let q = adminClient().from("white_label_configs").select("*").order("created_at", { ascending: false });
  if (active === "true") q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ configs: data });
});

// PATCH /admin/white-label/configs/:id — branding/colors/features/plan_names
whiteLabel.patch("/configs/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = [
    "company_name", "tagline", "primary_color", "accent_color", "logo_url", "logo_text",
    "domain", "support_email", "sender_name", "terms_url", "privacy_url",
    "features", "plan_names", "footer_text", "is_active",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("white_label_configs").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Config not found" }, 404);
  return c.json({ config: data });
});

// GET /admin/white-label/packages
whiteLabel.get("/packages", async (c) => {
  const { data, error } = await adminClient().from("wl_packages").select("*").order("flat_monthly", { ascending: true, nullsFirst: true });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ packages: data });
});

// POST /admin/white-label/packages — create a new WL tier
whiteLabel.post("/packages", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body.id || !body.name || !body.tier || !body.billing_type || !body.user_limit_label || body.setup_fee === undefined || !body.onboarding_link) {
    return c.json({ error: "'id', 'name', 'tier', 'billing_type', 'user_limit_label', 'setup_fee' and 'onboarding_link' are required" }, 400);
  }
  const { data, error } = await adminClient().from("wl_packages").insert(body).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ package: data }, 201);
});

// DELETE /admin/white-label/packages/:id
whiteLabel.delete("/packages/:id", async (c) => {
  const id = c.req.param("id");
  const { error } = await adminClient().from("wl_packages").delete().eq("id", id);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// PATCH /admin/white-label/packages/:id — pricing/features for a WL tier
whiteLabel.patch("/packages/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = [
    "name", "tier", "user_limit", "user_limit_label", "billing_type", "flat_monthly", "per_user_amount",
    "percent_of_revenue", "min_monthly", "setup_fee", "commission_pct",
    "color", "badge", "features", "active",
    "stripe_product_id", "stripe_price_id", "onboarding_link", "processor_override",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("wl_packages").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Package not found" }, 404);
  return c.json({ package: data });
});

export default whiteLabel;
