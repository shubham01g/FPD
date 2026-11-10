// Has this session passed the account's second factor?
//
// Authenticator and SMS are native Supabase factors: passing them puts
// aal2 in the JWT. Email OTP is ours: passing it records a
// two_factor_sessions row keyed by the JWT's session_id (see
// routes/twoFactor.ts). An account with 2FA switched off always passes.
import { adminClient } from "./supabaseAdmin.ts";

/**
 * Reads claims out of an *already verified* token. Callers must have checked
 * the signature with auth.getUser() first; this only pulls fields that
 * getUser()'s response does not expose.
 */
export function tokenClaims(token: string): { sessionId: string | null; aal: string } {
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { session_id?: string; aal?: string };
    return { sessionId: payload.session_id ?? null, aal: payload.aal ?? "aal1" };
  } catch {
    return { sessionId: null, aal: "aal1" };
  }
}

export type SecondFactorState =
  | { enrolled: false; passed: true }
  | { enrolled: true; passed: boolean; method: string };

export async function secondFactorState(userId: string, token: string): Promise<SecondFactorState> {
  const db = adminClient();
  const { data: row } = await db
    .from("account_2fa_settings")
    .select("enabled, method")
    .eq("user_id", userId)
    .maybeSingle();

  const { sessionId, aal } = tokenClaims(token);

  if (!row?.enabled) {
    // A native factor can be verified without the settings row saying so
    // (enrolled straight through Supabase). Supabase itself then only issues
    // aal1 until it is challenged, so honour that too.
    const { data } = await db.auth.admin.mfa.listFactors({ userId });
    const verified = (data?.factors ?? []).some((f: { status: string }) => f.status === "verified");
    if (verified) return { enrolled: true, passed: aal === "aal2", method: "native" };
    return { enrolled: false, passed: true };
  }

  if (row.method === "email_otp") {
    if (!sessionId) return { enrolled: true, passed: false, method: row.method };
    const { data: gate } = await db
      .from("two_factor_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return { enrolled: true, passed: Boolean(gate), method: row.method };
  }

  return { enrolled: true, passed: aal === "aal2", method: row.method ?? "native" };
}

/** Has this account set up any second factor (our settings row, or a verified
 *  native Supabase factor)? Used by the admin "Enforce 2FA" switch. */
export async function hasSecondFactor(userId: string): Promise<boolean> {
  const db = adminClient();
  const { data: row } = await db
    .from("account_2fa_settings")
    .select("enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (row?.enabled) return true;
  const { data } = await db.auth.admin.mfa.listFactors({ userId });
  return (data?.factors ?? []).some((f: { status: string }) => f.status === "verified");
}
