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

// POST /admin/concierge — invite a new concierge employee.
//
// Creates a real Supabase Auth user so the portal can sign them in properly and
// they can enrol a second factor; the roster row just points at it. The
// account_type metadata is what keeps them out of public.users (see the trigger
// guard in migration 023) — staff are not customers.
//
// Returns the one-time password exactly once so the admin can hand it over;
// there is still no email provider to send it automatically.
concierge.post("/", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const body = await c.req.json().catch(() => ({}));
  const { name, email, phone, role } = body;

  if (!name?.trim() || !email?.trim()) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const db = adminClient();
  const tempPassword = genTempPassword();

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: name, account_type: "concierge" },
  });

  if (authError || !created?.user) {
    return c.json({ error: authError?.message ?? "Could not create the staff sign-in" }, 500);
  }

  const { data, error } = await db
    .from("concierge_employees")
    .insert({
      name, email, phone: phone || null, role: role || "junior_concierge",
      status: "invited", user_id: created.user.id, invited_by: admin.id,
    })
    .select("id, name, email, phone, role, status, invited_at, last_login_at, invite_token")
    .maybeSingle();

  if (error) {
    // Don't leave an orphaned auth user behind if the roster insert fails —
    // its email would then block a retry with the same address.
    await db.auth.admin.deleteUser(created.user.id).catch(() => {});
    return c.json({ error: error.message }, 500);
  }

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

  const db = adminClient();
  const { data, error } = await db
    .from("concierge_employees")
    .update(patch)
    .eq("id", id)
    .select("id, user_id, name, email, phone, role, status, invited_at, last_login_at, invite_token")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Employee not found" }, 404);

  // Suspending has to reach the auth user too. A status flip alone would leave
  // an already-signed-in session working until it expired.
  if ("status" in patch && data.user_id) {
    await db.auth.admin.updateUserById(data.user_id, {
      ban_duration: patch.status === "suspended" ? "876000h" : "none",
    }).catch(() => {});
  }

  const { user_id: _omit, ...employee } = data;
  return c.json({ employee });
});

// POST /admin/concierge/:id/reset-password — issues a new one-time password
concierge.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();
  const tempPassword = genTempPassword();

  const { data: row, error: lookupError } = await db
    .from("concierge_employees")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) return c.json({ error: lookupError.message }, 500);
  if (!row) return c.json({ error: "Employee not found" }, 404);

  if (row.user_id) {
    const { error } = await db.auth.admin.updateUserById(row.user_id, { password: tempPassword });
    if (error) return c.json({ error: error.message }, 500);
  } else {
    // Invited before the auth.users linkage existed; still on the legacy hash.
    const { error } = await db
      .from("concierge_employees")
      .update({ password_hash: bcrypt.hashSync(tempPassword, 10) })
      .eq("id", id);
    if (error) return c.json({ error: error.message }, 500);
  }

  return c.json({ tempPassword });
});

export default concierge;
