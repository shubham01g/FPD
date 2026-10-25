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

  // affiliates.active_referrals is never maintained, so count the active
  // referrals here (the same rule the member's Affiliate Program page uses).
  const { data: refs, error: refsErr } = await adminClient()
    .from("affiliate_referrals").select("affiliate_id").eq("status", "active");
  if (refsErr) return c.json({ error: refsErr.message }, 500);
  const counts = new Map<string, number>();
  for (const r of refs ?? []) counts.set(r.affiliate_id, (counts.get(r.affiliate_id) ?? 0) + 1);

  return c.json({ affiliates: (data ?? []).map((a) => ({ ...a, active_referrals: counts.get(a.id) ?? 0 })) });
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
