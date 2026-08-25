import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const payouts = new Hono();

// GET /admin/payouts?type=&status=
payouts.get("/", async (c) => {
  const { type, status } = c.req.query();
  let q = adminClient()
    .from("payouts")
    .select("*, users:recipient_user_id(email, full_name)")
    .order("created_at", { ascending: false });

  if (type) q = q.eq("payout_type", type);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ payouts: data });
});

// POST /admin/payouts/:id/mark-paid
payouts.post("/:id/mark-paid", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("payouts")
    .update({ status: "paid", processed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Payout not found" }, 404);
  return c.json({ payout: data });
});

// PATCH /admin/payouts/:id — status update (processing/failed/cancelled)
payouts.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "payment_method"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("payouts").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Payout not found" }, 404);
  return c.json({ payout: data });
});

export default payouts;
