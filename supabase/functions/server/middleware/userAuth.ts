// Verifies the caller is any logged-in Supabase user — no is_admin check.
//
// requireAdmin (adminAuth.ts) guards /admin/*, which is everything the edge
// function served before 2FA. This is its counterpart for /account/*: routes a
// customer calls about their own account.
import type { Context, Next } from "npm:hono";
import { anonClient } from "../lib/supabaseAdmin.ts";
import { secondFactorState, tokenClaims } from "../lib/twoFactorGate.ts";

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

/**
 * Runs after requireUser. Refuses a session that has not passed the account's
 * own second factor (an account without 2FA always passes). The app only lets
 * a 2FA account past sign-in after the challenge, but the API is reachable
 * directly with a password-only token, so sensitive account routes check it
 * here too — the same rule password.ts and secretVault.ts already apply.
 */
export async function requireSecondFactor(c: Context, next: Next) {
  const user = c.get("user") as AuthedUser;
  const token = (c.req.header("Authorization") ?? "").slice(7);
  let mfa;
  try {
    mfa = await secondFactorState(user.id, token);
  } catch (err) {
    console.error("requireSecondFactor: 2FA check failed", err);
    return c.json({ error: "Failed to verify two-step verification" }, 500);
  }
  if (!mfa.passed) return c.json({ error: "Two-step verification required", code: "2fa_required" }, 403);
  await next();
}

/** requireSecondFactor for anything that changes state; reads pass through. */
export async function requireSecondFactorForWrites(c: Context, next: Next) {
  if (c.req.method === "GET" || c.req.method === "HEAD" || c.req.method === "OPTIONS") return next();
  return requireSecondFactor(c, next);
}
