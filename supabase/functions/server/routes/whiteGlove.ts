import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const whiteGlove = new Hono();

// GET /admin/white-glove/clients
whiteGlove.get("/clients", async (c) => {
  const { data, error } = await adminClient()
    .from("wg_clients")
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .order("intake_date", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ clients: data });
});

// POST /admin/white-glove/clients — enrolls an EXISTING user account (there's
// no name/email column on wg_clients; it's keyed to a real users.id).
whiteGlove.post("/clients", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { userId, specialistId, reason, notes, subscriptionWaived } = body;

  if (!userId) return c.json({ error: "userId is required" }, 400);

  const db = adminClient();
  const { data: existing } = await db.from("wg_clients").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return c.json({ error: "This user is already enrolled in White Glove" }, 409);

  const { data, error } = await db
    .from("wg_clients")
    .insert({ user_id: userId, specialist_id: specialistId || null, reason: reason || null, notes: notes || null })
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  await db.from("users").update({ white_glove: true, ...(subscriptionWaived ? { subscription_waived: true } : {}) }).eq("id", userId);

  return c.json({ client: data }, 201);
});

// PATCH /admin/white-glove/clients/:id
whiteGlove.patch("/clients/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "completion_pct", "notes", "specialist_id", "next_session_at"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  if (patch.status === "completed") patch.completed_at = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient()
    .from("wg_clients")
    .update(patch)
    .eq("id", id)
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Client not found" }, 404);
  return c.json({ client: data });
});

export default whiteGlove;
