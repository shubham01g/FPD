// Email one-time codes for the email_otp factor, delivered through SendGrid.
//
// Replaces the Twilio Verify email channel. Twilio used to generate, store and
// rate-limit the codes; now this file does, against email_otp_challenges
// (026). Guarantees:
//   - 6 digits from crypto.getRandomValues, no modulo bias
//   - only sha256(user_id:code) is stored
//   - 10-minute expiry, single use, burned after 5 wrong guesses
//   - at most 5 sends per user per 15 minutes
//   - sending a new code retires any older open one
//   - the destination is always the session's own address (callers pass
//     AuthedUser, never a request-body email)

import { adminClient } from "./supabaseAdmin.ts";
import { EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, otpEmail, sendEmail } from "./email.ts";

export const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 5;
const SEND_WINDOW_MINUTES = 15;

export interface OtpResult {
  ok: boolean;
  /** Safe to show the user. */
  error?: string;
  /** HTTP status to hand back to the caller. */
  status?: number;
}

function generateCode(): string {
  // Reject values in the top partial bucket so every code is equally likely.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

async function hashCode(userId: string, code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${code}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Generates a fresh code for this user and emails it to their own address. */
export async function startEmailOtp(user: { id: string; email: string }): Promise<OtpResult> {
  if (!EMAIL_CONFIGURED) return { ok: false, error: EMAIL_NOT_CONFIGURED_MESSAGE, status: 503 };

  const db = adminClient();
  const windowStart = new Date(Date.now() - SEND_WINDOW_MINUTES * 60_000).toISOString();

  const { count, error: countErr } = await db
    .from("email_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);
  if (countErr) {
    console.error("email otp count failed", countErr);
    return { ok: false, error: "Could not send the verification code.", status: 500 };
  }
  if ((count ?? 0) >= MAX_SENDS) {
    return { ok: false, error: `Too many codes requested. Try again in ${SEND_WINDOW_MINUTES} minutes.`, status: 429 };
  }

  const now = new Date();
  // Only the newest code is ever valid.
  await db.from("email_otp_challenges")
    .update({ consumed_at: now.toISOString() })
    .eq("user_id", user.id)
    .is("consumed_at", null);

  const code = generateCode();
  const { data: row, error } = await db.from("email_otp_challenges").insert({
    user_id: user.id,
    code_hash: await hashCode(user.id, code),
    expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000).toISOString(),
  }).select("id").single();
  if (error || !row) {
    console.error("email otp insert failed", error);
    return { ok: false, error: "Could not send the verification code.", status: 500 };
  }

  try {
    await sendEmail({ to: user.email, ...otpEmail(code, CODE_TTL_MINUTES) });
  } catch (err) {
    console.error("email otp send failed", err);
    // A code nobody received shouldn't sit open, but it still counts toward
    // the rate limit so a failing send can't be retried in a tight loop.
    await db.from("email_otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: false, error: "We couldn't send the email. Try again in a moment.", status: 502 };
  }

  // Housekeeping, fire-and-forget.
  db.from("email_otp_challenges")
    .delete()
    .lt("expires_at", new Date(Date.now() - 86400000).toISOString())
    .then(() => {}, () => {});

  return { ok: true };
}

/** Checks a code against the user's newest open challenge and consumes it on success. */
export async function checkEmailOtp(userId: string, code: string): Promise<OtpResult> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code from your email.", status: 400 };

  const db = adminClient();
  const { data: ch, error } = await db
    .from("email_otp_challenges")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("email otp lookup failed", error);
    return { ok: false, error: "Could not check the code.", status: 500 };
  }
  if (!ch) return { ok: false, error: "No code is pending. Request a new one.", status: 400 };

  const burn = () =>
    db.from("email_otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);

  if (new Date(ch.expires_at) < new Date()) {
    await burn();
    return { ok: false, error: "That code has expired. Request a new one.", status: 400 };
  }
  if (ch.attempts >= MAX_ATTEMPTS) {
    await burn();
    return { ok: false, error: "Too many incorrect attempts. Request a new code.", status: 429 };
  }

  if (!timingSafeEqual(await hashCode(userId, code), ch.code_hash)) {
    const attempts = ch.attempts + 1;
    await db.from("email_otp_challenges")
      .update(attempts >= MAX_ATTEMPTS ? { attempts, consumed_at: new Date().toISOString() } : { attempts })
      .eq("id", ch.id);
    const left = MAX_ATTEMPTS - attempts;
    return {
      ok: false,
      error: left > 0
        ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} remaining.`
        : "Too many incorrect attempts. Request a new code.",
      status: left > 0 ? 400 : 429,
    };
  }

  // Conditional on consumed_at still being null so two concurrent checks of
  // the same correct code can't both succeed.
  const { data: claimed } = await db.from("email_otp_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", ch.id)
    .is("consumed_at", null)
    .select("id");
  if (!claimed?.length) return { ok: false, error: "That code was already used. Request a new one.", status: 400 };

  return { ok: true };
}
