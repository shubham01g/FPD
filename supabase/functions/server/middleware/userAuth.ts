// Verifies the caller is any logged-in Supabase user — no is_admin check.
//
// requireAdmin (adminAuth.ts) guards /admin/*, which is everything the edge
// function served before 2FA. This is its counterpart for /account/*: routes a
// customer calls about their own account.
import type { Context, Next } from "npm:hono";
import { anonClient } from "../lib/supabaseAdmin.ts";
import { tokenClaims } from "../lib/twoFactorGate.ts";

export interface AuthedUser {
  id: string;
  email: string;
  /**
   * The JWT's session_id claim — stable for one sign-in, new on every
   * subsequent sign-in. two_factor_sessions is keyed by it, which is what
   * makes the email-OTP gate survive a page reload without surviving a
   * sign-out.
   */
  sessionId: string | null;
  /** 'aal1' or 'aal2'. aal2 means a native TOTP/phone factor was satisfied. */
  aal: string;
}

// getUser() below checks the token's signature; tokenClaims only reads
// fields its response does not expose.
const claims = tokenClaims;

export async function requireUser(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ error: "Missing Authorization bearer token" }, 401);
  }

  const { data, error } = await anonClient().auth.getUser(token);
  if (error || !data?.user?.email) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }

  const { sessionId, aal } = claims(token);
  const user: AuthedUser = { id: data.user.id, email: data.user.email, sessionId, aal };
  c.set("user", user);
  await next();
}
