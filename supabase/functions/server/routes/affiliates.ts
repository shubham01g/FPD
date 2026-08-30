import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const affiliates = new Hono();

// GET /admin/affiliates?status=
affiliates.get("/", async (c) => {
  const status = c.req.query("status");
  let q = adminClient()
    .from("affiliates")
    .select("*, users(email, full_name)")
    .order("total_earned", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ affiliates: data });
});

// GET /admin/affiliates/:id/referrals
affiliates.get("/:id/referrals", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("affiliate_referrals")
    .select("*, users(email, full_name)")
    .eq("affiliate_id", id)
    .order("referred_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ referrals: data });
});

// PATCH /admin/affiliates/:id — status/tier override
affiliates.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "tier", "commission_rate"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("affiliates").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Affiliate not found" }, 404);
  return c.json({ affiliate: data });
});

export default affiliates;
