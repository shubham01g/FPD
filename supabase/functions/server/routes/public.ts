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

// POST /public/wl-sales — a prospective partner submits the onboarding
// wizard. No admin session exists at this point, so this writes through the
// service-role client directly rather than requireAdmin's /admin/* routes.
pub.post("/wl-sales", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { org, contact, email, packageId, subdomain, processor } = body;

  if (!org?.trim() || !contact?.trim() || !email?.trim() || !packageId) {
    return c.json({ error: "'org', 'contact', 'email' and 'packageId' are required" }, 400);
  }

  const db = adminClient();
  const { data: pkg } = await db.from("wl_packages").select("setup_fee").eq("id", packageId).maybeSingle();
  if (!pkg) return c.json({ error: "Unknown package" }, 400);

  const { count } = await db.from("wl_sales").select("id", { count: "exact", head: true });
  const id = `WL-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await db
    .from("wl_sales")
    .insert({
      id, org, contact, email, package_id: packageId, subdomain: subdomain || null, processor: processor || null,
      total_paid: Number(pkg.setup_fee) || 0,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ sale: data }, 201);
});

export default pub;
