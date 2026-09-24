/**
 * Two-step verification — the single place the app talks to 2FA.
 *
 * There are two backends behind this module and callers should not have to
 * care which is which:
 *
 *   authenticator / sms  Supabase native MFA factors. Enroll and challenge run
 *                        in the browser SDK and put aal2 in the access token,
 *                        so they are enforced by Supabase itself.
 *   email_otp            Twilio Verify email channel via our edge function.
 *                        Supabase has no email factor type, so this one cannot
 *                        reach aal2 — it is enforced by a server-recorded
 *                        two_factor_sessions row plus the guard in UserRoute.
 *
 * The HTTP half mirrors services/adminApi.ts (fresh token per call, typed
 * error, non-JSON 200 treated as failure) but points at /account/2fa, which is
 * gated by requireUser rather than requireAdmin.
 */
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/account/2fa`
  : null;

export type TwoFAMethod = "sms" | "email_otp" | "authenticator";

export interface TwoFactorState {
  enabled: boolean;
  method: TwoFAMethod | null;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  enabledAt: string | null;
  backupCodesRemaining: number;
  factors: { id: string; type: string }[];
  /** False only when an email_otp account has a session that never passed the gate. */
  gateCleared: boolean;
}

export class TwoFactorError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "TwoFactorError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Same reasoning as adminApi: a bare relative path would be SPA-fallbacked
  // to index.html with a 200 and read as valid empty data. Fail loudly.
  if (!FUNCTIONS_BASE) {
    throw new TwoFactorError(0, "No Supabase project connected (VITE_SUPABASE_URL is not set)", null);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok || !isJson) {
    const message = (isJson && body && typeof body === "object" && "error" in body)
      ? String((body as { error: unknown }).error)
      : !isJson
        ? `Unexpected non-JSON response (status ${res.status}) — is the backend deployed and reachable?`
        : `Request failed with status ${res.status}`;
    throw new TwoFactorError(res.status, message, body);
  }

  return body as T;
}

/* ── Server-backed state ─────────────────────────────────────────── */

export function getTwoFactorState() {
  return request<TwoFactorState>("", { method: "GET" });
}

/**
 * Just what is switched on, read straight from the table over PostgREST.
 *
 * Deliberately does not go through the edge function. The sign-in path has to
 * know whether an account owes a second factor, and routing that question
 * through /account/2fa would mean an edge-function outage locks out every user
 * — including the majority who have no 2FA at all. This asks the database
 * directly, so the only people an outage can block are the email-OTP users who
 * genuinely need the function to receive a code.
 *
 * Migration 023 grants these three columns and no more; totp_secret and
 * backup_codes are unreadable from the browser.
 */
export async function getLocalTwoFactorSettings(): Promise<{
  enabled: boolean; method: TwoFAMethod | null; phone: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, method: null, phone: null };

  const { data, error } = await supabase
    .from("account_2fa_settings")
    .select("enabled, method, phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    enabled: data?.enabled ?? false,
    method: (data?.method as TwoFAMethod | null) ?? null,
    phone: data?.phone ?? null,
  };
}

/** Sends an email OTP to the signed-in account's own address. */
export function startEmailCode() {
  return request<{ sent: boolean; destination: string }>("/email/start", { method: "POST" });
}

export function checkEmailCode(code: string, purpose: "enroll" | "login") {
  return request<{ verified: boolean; backupCodes?: string[] }>("/email/check", {
    method: "POST",
    body: JSON.stringify({ code, purpose }),
  });
}

/** Mirrors a finished native enrollment into account_2fa_settings. */
export function confirmNativeEnrollment(method: "authenticator" | "sms", phone?: string) {
  return request<{ enabled: boolean; backupCodes: string[] }>("/enrolled", {
    method: "POST",
    body: JSON.stringify({ method, phone }),
  });
}

export function regenerateBackupCodes() {
  return request<{ backupCodes: string[] }>("/backup-codes", { method: "POST" });
}

export function redeemBackupCode(code: string) {
  return request<{ redeemed: boolean; twoFactorDisabled: boolean }>("/backup-codes/redeem", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/** `code` is required only for email_otp; native methods need an aal2 session. */
export function disableTwoFactor(code?: string) {
  return request<{ disabled: boolean }>("/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/* ── Supabase native MFA ─────────────────────────────────────────── */

export interface TotpEnrollment {
  factorId: string;
  /** SVG data URI, ready for an <img src>. */
  qrCode: string;
  /** The same secret in text form, for authenticator apps that take manual entry. */
  secret: string;
}

export async function enrollTotp(): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) throw new Error(error?.message ?? "Could not start authenticator setup.");
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** `phone` must be E.164, e.g. +14155552671. Supabase sends the SMS itself. */
export async function enrollPhone(phone: string): Promise<{ factorId: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "phone", phone });
  if (error || !data) throw new Error(error?.message ?? "Could not start SMS setup.");
  return { factorId: data.id };
}

/**
 * Opens a challenge and returns its id.
 *
 * For a phone factor this is the call that actually sends the SMS, so it has
 * to happen before the user is shown a code box — not alongside the verify.
 * For TOTP it sends nothing and is effectively free.
 */
export async function challengeFactor(factorId: string): Promise<string> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error || !data) throw new Error(error?.message ?? "Could not send a verification code.");
  return data.id;
}

export async function verifyChallenge(factorId: string, challengeId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
  if (error) throw new Error(error.message);
}

/**
 * Challenge + verify in one step. Safe for TOTP, where the challenge delivers
 * nothing; use the split pair above for phone.
 */
export async function verifyFactor(factorId: string, code: string): Promise<void> {
  const challengeId = await challengeFactor(factorId);
  await verifyChallenge(factorId, challengeId, code);
}

/** Abandoned enrollments leave an unverified factor behind; clean it up. */
export async function unenrollFactor(factorId: string): Promise<void> {
  await supabase.auth.mfa.unenroll({ factorId });
}

export type NativeChallengeState =
  /** Nothing outstanding — the session is already at the level it needs. */
  | { status: "satisfied" }
  /** A native factor is enrolled and this session has not satisfied it yet. */
  | { status: "challenge"; factorId: string; type: "totp" | "phone" }
  /**
   * AAL2 is required but no factor is enrolled, so there is nothing the user
   * can be challenged with. Callers must sign the half-session out rather than
   * strand them on a screen they cannot complete.
   */
  | { status: "orphaned" };

/**
 * Whether the current session still owes a native second factor.
 *
 * This is the check AdminLogin has run since Phase 5, centralised here so the
 * user, admin and concierge sign-ins cannot drift apart.
 */
export async function getNativeChallengeState(): Promise<NativeChallengeState> {
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel !== "aal2" || aal.nextLevel === aal.currentLevel) {
    return { status: "satisfied" };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (totp) return { status: "challenge", factorId: totp.id, type: "totp" };

  const phone = factors?.phone?.[0];
  if (phone) return { status: "challenge", factorId: phone.id, type: "phone" };

  return { status: "orphaned" };
}
