// Unauthenticated, read-only endpoints for the customer-facing app (pricing
// page, plan selection, white-label marketing section). No requireAdmin and
// no auditLog here — these are public data, not admin actions.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const pub = new Hono();

// GET /public/plans — live subscription plan pricing for the marketing/pricing pages.
pub.get("/plans", async (c) => {
  const { data, error } = await adminClient()
    .from("subscription_plans")
    .select("id, name, price_monthly, price_annual, storage_gb, max_contacts, overage_rate")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ plans: data });
});

// GET /public/wl-packages — live White Label package tiers for the marketing
// section and the partner onboarding wizard.
pub.get("/wl-packages", async (c) => {
  const { data, error } = await adminClient()
    .from("wl_packages")
    .select("*")
    .eq("active", true)
    .order("flat_monthly", { ascending: true, nullsFirst: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ packages: data });
});

export default pub;
