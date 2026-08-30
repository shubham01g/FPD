// Backs AdminRoles.tsx — the admin team roster (invite, role/permission
// edits, suspend/reactivate). Gated behind the 'admin_team' module so only
// admins explicitly granted that permission (super_admin by default) can
// manage who else has admin access — see modulePermission.ts.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

const adminAccounts = new Hono();

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function canGrantSuperAdmin(actor: AdminUser): boolean {
  // Legacy accounts (permissions === null) are treated as super_admin-equivalent.
  return actor.permissions === null || actor.role === "super_admin";
}

// GET /admin/admin-accounts?status=&role=
adminAccounts.get("/", async (c) => {
  const { status, role } = c.req.query();
  let q = adminClient().from("admin_accounts").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  if (role) q = q.eq("role", role);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ accounts: data });
});

// POST /admin/admin-accounts — invite a new admin.
// Real email delivery isn't wired (no email provider integrated anywhere in
// this backend yet) — the invite link is returned in the response instead,
// same "not really sent" gap as other invite flows already in the app.
adminAccounts.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name, email, role, notes, permissions } = body;
  const actor = c.get("admin") as AdminUser;

  if (!name || !email || !role || !Array.isArray(permissions)) {
    return c.json({ error: "'name', 'email', 'role', and 'permissions' are required" }, 400);
  }
  if (role === "super_admin" && !canGrantSuperAdmin(actor)) {
    return c.json({ error: "Only a super admin can grant the super_admin role" }, 403);
  }

  const inviteToken = randomToken();
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminClient()
    .from("admin_accounts")
    .insert({
      name, email, role, notes: notes ?? null, permissions,
      status: "invited",
      invited_by: actor.id,
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ account: data, inviteToken }, 201);
});

// PATCH /admin/admin-accounts/:id — role/permission changes, status changes, notes.
adminAccounts.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const actor = c.get("admin") as AdminUser;

  const allowed = ["role", "status", "permissions", "notes"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }
  if (patch.role === "super_admin" && !canGrantSuperAdmin(actor)) {
    return c.json({ error: "Only a super admin can grant the super_admin role" }, 403);
  }

  const { data, error } = await adminClient().from("admin_accounts").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Admin account not found" }, 404);
  return c.json({ account: data });
});

// POST /admin/admin-accounts/:id/resend-invite — new token + expiry.
adminAccounts.post("/:id/resend-invite", async (c) => {
  const id = c.req.param("id");
  const inviteToken = randomToken();
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminClient()
    .from("admin_accounts")
    .update({ invite_token: inviteToken, invite_expires_at: inviteExpiresAt, status: "invited" })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Admin account not found" }, 404);
  return c.json({ account: data, inviteToken });
});

export default adminAccounts;
