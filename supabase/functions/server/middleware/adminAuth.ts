// Verifies the caller is a logged-in Supabase user with users.is_admin = true.
// Every /admin/* route is expected to run this before its handler.
import type { Context, Next } from "npm:hono";
import { adminClient, anonClient } from "../lib/supabaseAdmin.ts";

export interface ModulePermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  /**
   * null = full legacy access (users.is_admin=true with no admin_accounts
   * row yet — the pre-Phase-5 behavior, kept for backward compatibility).
   * An array = granular permissions must be checked per module; see
   * requireModulePermission in modulePermission.ts.
   */
  permissions: ModulePermission[] | null;
}

export async function requireAdmin(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ error: "Missing Authorization bearer token" }, 401);
  }

  const { data: sessionData, error: sessionError } = await anonClient().auth.getUser(token);
  if (sessionError || !sessionData?.user) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  const authedUser = sessionData.user;
  const db = adminClient();

  const { data: row, error: lookupError } = await db
    .from("users")
    .select("id, email, is_admin")
    .eq("id", authedUser.id)
    .maybeSingle();

  if (lookupError) {
    return c.json({ error: "Failed to verify admin status" }, 500);
  }
  if (!row?.is_admin) {
    return c.json({ error: "Admin access required" }, 403);
  }

  const { data: account, error: accountError } = await db
    .from("admin_accounts")
    .select("role, status, permissions")
    .eq("email", row.email)
    .maybeSingle();

  if (accountError) {
    return c.json({ error: "Failed to resolve admin permissions" }, 500);
  }

  if (account) {
    if (account.status === "suspended") {
      return c.json({ error: "This admin account has been suspended" }, 403);
    }
    if (account.status === "invited") {
      return c.json({ error: "This admin account has not accepted its invite yet" }, 403);
    }
  }

  const admin: AdminUser = {
    id: row.id,
    email: row.email,
    role: account?.role ?? "super_admin",
    // No admin_accounts row => legacy is_admin account => unrestricted, same as before Phase 5.
    permissions: account ? (account.permissions as ModulePermission[]) : null,
  };
  c.set("admin", admin);
  await next();
}
