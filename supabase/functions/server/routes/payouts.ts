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

// POST /admin/payouts/generate { type: "affiliate"|"partnership", period? }
// Turns every unpaid commission balance into a pending payout (migration 056
// create_commission_payouts). Nothing created payouts before, so earned
// commissions could never be paid. FPD records the payout; the money itself
// is sent outside the app, then the payout is marked paid here.
payouts.post("/generate", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { type?: string; period?: string };
  if (body.type !== "affiliate" && body.type !== "partnership") {
    return c.json({ error: "type must be 'affiliate' or 'partnership'" }, 400);
  }
  const period = /^\d{4}-\d{2}$/.test(String(body.period ?? "")) ? String(body.period) : new Date().toISOString().slice(0, 7);
  const { data, error } = await adminClient().rpc("create_commission_payouts", { p_type: body.type, p_period: period });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ created: Number(data ?? 0), period });
});

// POST /admin/payouts/:id/mark-paid — only an open payout (pending/processing).
payouts.post("/:id/mark-paid", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("payouts")
    .update({ status: "paid", processed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "processing"])
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Payout not found, or it is already paid, failed or cancelled" }, 404);
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

  if ("status" in patch && !["processing", "failed", "cancelled"].includes(String(patch.status))) {
    return c.json({ error: "Status can be set to processing, failed or cancelled here (use Mark paid for paid)" }, 400);
  }
  const db = adminClient();
  // A paid payout is final; changing it would double-count the commissions.
  const { data, error } = await db.from("payouts").update(patch).eq("id", id).neq("status", "paid").select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Payout not found, or it is already paid" }, 404);
  if (patch.status === "failed" || patch.status === "cancelled") {
    // Its commissions go back into the balance, to be paid in a later payout.
    const { error: relErr } = await db.rpc("release_payout", { p_payout: id });
    if (relErr) return c.json({ error: `Status saved, but the commissions could not be released: ${relErr.message}` }, 500);
  }
  return c.json({ payout: data });
});

export default payouts;
