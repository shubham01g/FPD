import { Hono } from "npm:hono";
import bcrypt from "npm:bcryptjs@2.4.3";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

const concierge = new Hono();

function genTempPassword(): string {
  // Readable-enough one-time credential the admin hands to the employee
  // themselves — there's no email delivery wired up to send it automatically.
  return Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// GET /admin/concierge — never returns password_hash
concierge.get("/", async (c) => {
  const { data, error } = await adminClient()
    .from("concierge_employees")
    .select("id, name, email, phone, role, status, invited_at, last_login_at, invite_token")
    .order("invited_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ employees: data });
});

// POST /admin/concierge — invite a new concierge employee. Generates a real
// one-time password, hashes it with bcrypt before it ever touches the
// database, and returns the plaintext exactly once so the admin can hand it
// to the employee — there is no email provider to send it automatically.
concierge.post("/", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const body = await c.req.json().catch(() => ({}));
  const { name, email, phone, role } = body;

  if (!name?.trim() || !email?.trim()) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const tempPassword = genTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  const { data, error } = await adminClient()
    .from("concierge_employees")
    .insert({
      name, email, phone: phone || null, role: role || "junior_concierge",
      status: "invited", password_hash: passwordHash, invited_by: admin.id,
    })
    .select("id, name, email, phone, role, status, invited_at, last_login_at, invite_token")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ employee: data, tempPassword }, 201);
});

// PATCH /admin/concierge/:id — role/status
concierge.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["role", "status", "phone"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient()
    .from("concierge_employees")
    .update(patch)
    .eq("id", id)
    .select("id, name, email, phone, role, status, invited_at, last_login_at, invite_token")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Employee not found" }, 404);
  return c.json({ employee: data });
});

// POST /admin/concierge/:id/reset-password — issues a new one-time password
concierge.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const tempPassword = genTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  const { data, error } = await adminClient()
    .from("concierge_employees")
    .update({ password_hash: passwordHash })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Employee not found" }, 404);
  return c.json({ tempPassword });
});

export default concierge;
