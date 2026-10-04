// Backs ContinuationFeeAdmin.tsx — the log of $199 Legacy Continuation Fee
// payments/activations, distinct from pricing.ts (plan pricing config).
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const subscriptions = new Hono();

// GET /admin/subscriptions?status=
subscriptions.get("/", async (c) => {
  const status = c.req.query("status");
  let q = adminClient()
    .from("legacy_continuation_fees")
    .select("*, users:user_id(email, full_name, plan)")
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);

  // A paid fee is "ready to activate" once a legacy claim on that account has
  // been approved (Master Admin → Legacy Claims).
  const { data: approved, error: claimErr } = await adminClient()
    .from("legacy_claims")
    .select("owner_user_id, death_cert_override")
    .eq("status", "approved");
  if (claimErr) return c.json({ error: claimErr.message }, 500);
  // owner → whether their approved claim still lacks the death certificate
  const approvedOwners = new Map((approved ?? []).map((r) => [r.owner_user_id, Boolean(r.death_cert_override)]));

  return c.json({
    fees: (data ?? []).map((f) => ({
      ...f,
      claim_approved: approvedOwners.has(f.user_id),
      death_cert_override: approvedOwners.get(f.user_id) ?? false,
    })),
  });
});

// POST /admin/subscriptions/:id/activate
// Marks a paid continuation fee as activated (user has passed) and computes
// expires_at from the admin-configured continuation_fee_period_months setting.
subscriptions.post("/:id/activate", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const { data: fee, error: feeErr } = await db.from("legacy_continuation_fees").select("*").eq("id", id).maybeSingle();
  if (feeErr) return c.json({ error: feeErr.message }, 500);
  if (!fee) return c.json({ error: "Fee record not found" }, 404);
  if (fee.status !== "paid") return c.json({ error: "Fee must be paid before it can be activated" }, 400);

  const { data: setting } = await db.from("admin_settings").select("value").eq("key", "continuation_fee_period_months").maybeSingle();
  const months = parseInt(setting?.value ?? "24", 10);
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const { data, error } = await db
    .from("legacy_continuation_fees")
    .update({ activated_at: activatedAt.toISOString(), expires_at: expiresAt.toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ fee: data });
});

export default subscriptions;
