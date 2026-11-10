// Verifies the caller is a logged-in Supabase user with users.is_admin = true.
// Every /admin/* route is expected to run this before its handler.
import type { Context, Next } from "npm:hono";
import { adminClient, anonClient } from "../lib/supabaseAdmin.ts";
import { secondFactorState } from "../lib/twoFactorGate.ts";
import { securitySettings } from "./ipAllowlist.ts";

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

  // Second factor, enforced here and not only in AdminLogin: without this a
  // stolen admin password plus a direct API call skipped 2FA entirely.
  // Admins who have not enrolled any factor still pass, so nobody is locked
  // out. Enrolment for every admin is a separate step.
  let mfa;
  try {
    mfa = await secondFactorState(authedUser.id, token);
  } catch (err) {
    console.error("requireAdmin: 2FA check failed", err);
    return c.json({ error: "Failed to verify two-step verification" }, 500);
  }
  if (!mfa.passed) {
    return c.json({ error: "Two-step verification required", code: "2fa_required" }, 403);
  }
  // System → Settings → Security → "Enforce 2FA for all admins". While it is
  // on, an admin with no factor at all is refused everywhere except GET
  // /admin/me, which tells the login screen why (twoFactorEnrollmentRequired)
  // so it can send them to Account Settings to enrol. routes/settings.ts will
  // not save the switch ON while any active admin is unenrolled.
  let enrollmentRequired = false;
  if (!mfa.enrolled) {
    const security = await securitySettings().catch(() => ({} as Record<string, unknown>));
    if (security.enforce2FA === true) {
      enrollmentRequired = true;
      const isMe = c.req.method === "GET" && /\/admin\/me\/?$/.test(c.req.path);
      if (!isMe) {
        return c.json({
          error: "Two-step verification must be set up before using the admin portal. Sign in to the app, open Account Settings → Two-Step Verification, then sign in here again.",
          code: "2fa_enrollment_required",
        }, 403);
      }
    } else {
      console.warn(`requireAdmin: admin ${row.email} has no two-step verification enrolled`);
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
  c.set("twoFactorEnrollmentRequired", enrollmentRequired);
  await next();
}
