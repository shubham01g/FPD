import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const partnerships = new Hono();

// GET /admin/partnerships?status=
partnerships.get("/", async (c) => {
  const status = c.req.query("status");
  let q = adminClient()
    .from("partners")
    .select("*")
    .order("total_earned", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ partners: data });
});

// GET /admin/partnerships/:id/accounts
partnerships.get("/:id/accounts", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("partner_accounts")
    .select("*, users(email, full_name)")
    .eq("partner_id", id)
    .order("referred_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ accounts: data });
});

// PATCH /admin/partnerships/:id — status/tier override
partnerships.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "tier", "commission_rate"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("partners").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Partner not found" }, 404);
  return c.json({ partner: data });
});

export default partnerships;
