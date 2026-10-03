import { Hono } from "npm:hono";
import bcrypt from "npm:bcryptjs@2.4.3";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { checkEmailOtp, startEmailOtp } from "../lib/emailOtp.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

// Two-step verification for customer accounts. Mounted at /account/2fa behind
// requireUser.
//
// Division of labour:
//   authenticator / sms -> Supabase native MFA factors. Enrolled and challenged
//     client-side by the browser SDK; this file only mirrors the outcome into
//     account_2fa_settings (the table the admin portal reads) after confirming
//     with the auth server that the factor really is verified.
//   email_otp -> 6-digit code emailed via SendGrid (lib/emailOtp.ts), start/check
//     below. Supabase has no email factor type, so this one cannot reach aal2;
//     clearing it records a two_factor_sessions row instead.
//
// account_2fa_settings is read-only to the browser (see 023_two_factor_auth),
// so the writes here are the only path that can enable or disable 2FA — and
// each one happens after a code check or Supabase has actually approved something.

const twoFactor = new Hono();

type Method = "sms" | "email_otp" | "authenticator";
const NATIVE_METHODS: Method[] = ["sms", "authenticator"];

// two_factor_sessions rows are keyed by session_id and only matter while that
// session lives; this is a garbage-collection horizon, not a security window.
const GATE_TTL_DAYS = 30;

const BACKUP_CODE_COUNT = 10;
// No I/O/0/1 — these get read off a screen and typed back in under stress.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBackupCodes(): string[] {
  const bytes = new Uint8Array(BACKUP_CODE_COUNT * 8);
  crypto.getRandomValues(bytes);
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let raw = "";
    for (let j = 0; j < 8; j++) raw += CODE_ALPHABET[bytes[i * 8 + j] % CODE_ALPHABET.length];
    codes.push(raw.slice(0, 4) + "-" + raw.slice(4));
  }
  return codes;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Asks the auth server what factors this user actually holds. */
async function listFactors(userId: string) {
  try {
    const { data, error } = await adminClient().auth.admin.mfa.listFactors({ userId });
    if (error) {
      console.error("listFactors failed", error);
      return [];
    }
    return (data?.factors ?? []) as { id: string; factor_type: string; status: string }[];
  } catch (err) {
    console.error("listFactors threw", err);
    return [];
  }
}

async function deleteAllFactors(userId: string) {
  const factors = await listFactors(userId);
  for (const f of factors) {
    try {
      await adminClient().auth.admin.mfa.deleteFactor({ id: f.id, userId });
    } catch (err) {
      console.error("deleteFactor threw", f.id, err);
    }
  }
}

async function clearGate(userId: string) {
  await adminClient().from("two_factor_sessions").delete().eq("user_id", userId);
}

/** Records that this session cleared the email-OTP gate. */
async function openGate(user: AuthedUser) {
  if (!user.sessionId) return;
  const expires = new Date(Date.now() + GATE_TTL_DAYS * 86400000).toISOString();
  await adminClient().from("two_factor_sessions").upsert({
    session_id: user.sessionId,
    user_id: user.id,
    verified_at: new Date().toISOString(),
    expires_at: expires,
  });
}

/** Everything the settings screen and the login gate both need. */
twoFactor.get("/", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();

  const { data: row, error } = await db
    .from("account_2fa_settings")
    .select("enabled, method, phone, phone_verified, email_verified, backup_codes, enabled_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  const factors = await listFactors(user.id);
  const verified = factors.filter((f) => f.status === "verified");

  // The gate only applies to email_otp; native factors put aal2 in the token.
  let gateCleared = true;
  if (row?.enabled && row.method === "email_otp") {
    if (!user.sessionId) {
      gateCleared = false;
    } else {
      const { data: gate } = await db
        .from("two_factor_sessions")
        .select("session_id")
        .eq("session_id", user.sessionId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      gateCleared = Boolean(gate);
    }
  }

  return c.json({
    enabled: row?.enabled ?? false,
    method: row?.method ?? null,
    phone: row?.phone ?? null,
    phoneVerified: row?.phone_verified ?? false,
    emailVerified: row?.email_verified ?? false,
    enabledAt: row?.enabled_at ?? null,
    backupCodesRemaining: row?.backup_codes?.length ?? 0,
    factors: verified.map((f) => ({ id: f.id, type: f.factor_type })),
    gateCleared,
  });
});

// Sends a code to the session's own email. The address is never taken from the
// request body: a caller must not be able to redirect their own verification
// code to an inbox they control.
twoFactor.post("/email/start", async (c) => {
  const user = c.get("user") as AuthedUser;
  const result = await startEmailOtp(user);
  if (!result.ok) return c.json({ error: result.error }, (result.status ?? 502) as 400);
  return c.json({ sent: true, destination: user.email });
});

// POST /email/check { code, purpose: 'enroll' | 'login' }
twoFactor.post("/email/check", async (c) => {
  const user = c.get("user") as AuthedUser;
  const body = await c.req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const purpose = body.purpose === "enroll" ? "enroll" : "login";

  if (!/^\d{6}$/.test(code)) return c.json({ error: "Enter the 6-digit code from your email." }, 400);

  const result = await checkEmailOtp(user.id, code);
  if (!result.ok) return c.json({ error: result.error }, (result.status ?? 400) as 400);

  const db = adminClient();
  const now = new Date().toISOString();

  if (purpose === "enroll") {
    const codes = generateBackupCodes();
    const hashed = codes.map((v) => bcrypt.hashSync(normalizeCode(v), 10));

    const { error } = await db.from("account_2fa_settings").upsert({
      user_id: user.id,
      enabled: true,
      method: "email_otp",
      email_verified: true,
      backup_codes: hashed,
      enabled_at: now,
      updated_at: now,
    });
    if (error) return c.json({ error: error.message }, 500);

    // Enrolling from inside a session also clears that session's gate, so the
    // user is not challenged on the very screen they just enrolled from.
    await openGate(user);
    return c.json({ verified: true, backupCodes: codes });
  }

  await openGate(user);
  return c.json({ verified: true });
});

// POST /enrolled { method, phone? }
// Called after the browser SDK finishes a native TOTP or phone enrollment, to
// mirror it into account_2fa_settings. The claim is checked against the auth
// server rather than trusted — a client cannot mark itself protected.
twoFactor.post("/enrolled", async (c) => {
  const user = c.get("user") as AuthedUser;
  const body = await c.req.json().catch(() => ({}));
  const method = body.method as Method;
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;

  if (!NATIVE_METHODS.includes(method)) {
    return c.json({ error: "Method must be 'authenticator' or 'sms'." }, 400);
  }

  const wanted = method === "sms" ? "phone" : "totp";
  const factors = await listFactors(user.id);
  const match = factors.find((f) => f.factor_type === wanted && f.status === "verified");
  if (!match) {
    return c.json({ error: "No verified factor of that type is enrolled." }, 409);
  }

  const codes = generateBackupCodes();
  const hashed = codes.map((v) => bcrypt.hashSync(normalizeCode(v), 10));
  const now = new Date().toISOString();

  const { error } = await adminClient().from("account_2fa_settings").upsert({
    user_id: user.id,
    enabled: true,
    method,
    phone: method === "sms" ? phone : null,
    phone_verified: method === "sms",
    backup_codes: hashed,
    enabled_at: now,
    updated_at: now,
  });
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ enabled: true, backupCodes: codes });
});

// Regenerate backup codes, invalidating the old set.
twoFactor.post("/backup-codes", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();

  const { data: row } = await db
    .from("account_2fa_settings")
    .select("enabled, method")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.enabled) return c.json({ error: "Two-factor authentication isn't enabled." }, 409);

  // Regenerating is as sensitive as disabling: for a native factor the session
  // must already have satisfied it this sign-in.
  if (NATIVE_METHODS.includes(row.method as Method) && user.aal !== "aal2") {
    return c.json({ error: "Sign in with your second factor before regenerating codes." }, 403);
  }

  const codes = generateBackupCodes();
  const hashed = codes.map((v) => bcrypt.hashSync(normalizeCode(v), 10));

  const { error } = await db
    .from("account_2fa_settings")
    .update({ backup_codes: hashed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ backupCodes: codes });
});

// POST /backup-codes/redeem { code }
// A backup code means "I no longer have the device". Redeeming one tears down
// the enrolled factors and switches 2FA off, so the user lands in a working
// account and is prompted to re-enroll — the same end state as the admin
// reset-mfa endpoint, but self-service.
twoFactor.post("/backup-codes/redeem", async (c) => {
  const user = c.get("user") as AuthedUser;
  const body = await c.req.json().catch(() => ({}));
  const supplied = normalizeCode(typeof body.code === "string" ? body.code : "");

  if (supplied.length < 6) return c.json({ error: "Enter one of your backup codes." }, 400);

  const db = adminClient();
  const { data: row } = await db
    .from("account_2fa_settings")
    .select("enabled, backup_codes")
    .eq("user_id", user.id)
    .maybeSingle();

  const hashes: string[] = row?.backup_codes ?? [];
  if (!row?.enabled || hashes.length === 0) {
    return c.json({ error: "No backup codes are set up for this account." }, 409);
  }

  const index = hashes.findIndex((h) => {
    try { return bcrypt.compareSync(supplied, h); } catch { return false; }
  });
  if (index === -1) return c.json({ error: "That backup code isn't valid." }, 400);

  await deleteAllFactors(user.id);

  const { error } = await db.from("account_2fa_settings").update({
    enabled: false,
    method: null,
    phone: null,
    phone_verified: false,
    email_verified: false,
    backup_codes: null,
    enabled_at: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 500);

  await clearGate(user.id);
  return c.json({ redeemed: true, twoFactorDisabled: true });
});

// POST /disable { code? }
// Turning 2FA off has to be at least as hard as getting past it, otherwise a
// stolen password plus an unchallenged AAL1 session is enough to remove it.
twoFactor.post("/disable", async (c) => {
  const user = c.get("user") as AuthedUser;
  const body = await c.req.json().catch(() => ({}));
  const db = adminClient();

  const { data: row } = await db
    .from("account_2fa_settings")
    .select("enabled, method")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.enabled) return c.json({ disabled: true });

  if (NATIVE_METHODS.includes(row.method as Method)) {
    if (user.aal !== "aal2") {
      return c.json({ error: "Sign in with your second factor before turning it off." }, 403);
    }
  } else {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      return c.json({ error: "Enter a fresh emailed code to turn off two-factor." }, 400);
    }
    const result = await checkEmailOtp(user.id, code);
    if (!result.ok) return c.json({ error: result.error }, (result.status ?? 400) as 400);
  }

  await deleteAllFactors(user.id);

  const { error } = await db.from("account_2fa_settings").update({
    enabled: false,
    method: null,
    phone: null,
    phone_verified: false,
    email_verified: false,
    backup_codes: null,
    enabled_at: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id);
  if (error) return c.json({ error: error.message }, 500);

  await clearGate(user.id);
  return c.json({ disabled: true });
});

export default twoFactor;
