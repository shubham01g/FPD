// Twilio Verify wrapper — used for the email_otp factor.
//
// Credentials are Edge Function secrets, never in the repo:
//   npx supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... \
//     TWILIO_VERIFY_SERVICE_SID=... --project-ref <ref>
// Until those are set TWILIO_CONFIGURED is false and callers return a clear
// 503 instead of throwing — same graceful-degradation shape as PUSH_CONFIGURED
// in routes/notifications.ts.
//
// Verify (rather than the raw Messaging API) generates the code, expires it,
// rate-limits sends and caps check attempts on Twilio's side, so this codebase
// never stores a verification code anywhere.
//
// The email channel additionally needs a SendGrid-backed Email Integration
// configured on the Verify Service in the Twilio Console; the template must
// contain the {{twilio_code}} substitution.

const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

export const TWILIO_CONFIGURED = Boolean(ACCOUNT_SID && AUTH_TOKEN && SERVICE_SID);

export const TWILIO_NOT_CONFIGURED_MESSAGE =
  "Verification codes aren't set up on this deployment. Set TWILIO_ACCOUNT_SID, " +
  "TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID as Edge Function secrets.";

export type VerifyChannel = "email" | "sms";

export interface VerifyResult {
  ok: boolean;
  /** Safe to show the user. */
  error?: string;
  /** HTTP status to hand back to the caller. */
  status?: number;
}

const BASE = "https://verify.twilio.com/v2/Services";

function authHeader(): string {
  return "Basic " + btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
}

// Twilio error codes worth translating into something a person can act on.
// Everything else falls back to Twilio's own message.
// https://www.twilio.com/docs/api/errors
function friendlyError(code: number | undefined, fallback: string): string {
  switch (code) {
    case 60200: return "That address or phone number isn't valid.";
    case 60202: return "Too many incorrect attempts. Request a new code.";
    case 60203: return "Too many codes requested. Wait a few minutes and try again.";
    case 60212: return "Too many attempts for this account. Try again shortly.";
    case 20404: return "That code has expired. Request a new one.";
    case 20429: return "Too many requests. Wait a moment and try again.";
    default:    return fallback;
  }
}

async function post(path: string, form: Record<string, string>) {
  const res = await fetch(`${BASE}/${SERVICE_SID}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
  });
  const body = await res.json().catch(() => null);
  return { res, body } as { res: Response; body: Record<string, unknown> | null };
}

/** Sends a code. `to` is an email address or an E.164 phone number. */
export async function startVerification(to: string, channel: VerifyChannel): Promise<VerifyResult> {
  if (!TWILIO_CONFIGURED) {
    return { ok: false, error: TWILIO_NOT_CONFIGURED_MESSAGE, status: 503 };
  }

  try {
    const { res, body } = await post("/Verifications", { To: to, Channel: channel });
    if (!res.ok) {
      const code = typeof body?.code === "number" ? body.code : undefined;
      const message = typeof body?.message === "string" ? body.message : "Could not send the verification code.";
      console.error("twilio start failed", res.status, body);
      return { ok: false, error: friendlyError(code, message), status: 502 };
    }
    return { ok: true };
  } catch (err) {
    console.error("twilio start threw", err);
    return { ok: false, error: "Could not reach the verification service.", status: 502 };
  }
}

/**
 * Checks a code. Returns ok:true only when Twilio reports status "approved" —
 * a 200 response with any other status is still a rejection.
 */
export async function checkVerification(to: string, code: string): Promise<VerifyResult> {
  if (!TWILIO_CONFIGURED) {
    return { ok: false, error: TWILIO_NOT_CONFIGURED_MESSAGE, status: 503 };
  }

  try {
    const { res, body } = await post("/VerificationCheck", { To: to, Code: code });

    if (!res.ok) {
      const errCode = typeof body?.code === "number" ? body.code : undefined;
      // A 404 here means there is no pending verification for this address —
      // expired, already consumed, or never sent. Not a server fault.
      const status = res.status === 404 ? 400 : 502;
      console.error("twilio check failed", res.status, body);
      return { ok: false, error: friendlyError(errCode, "That code didn't work. Request a new one."), status };
    }

    if (body?.status !== "approved") {
      return { ok: false, error: "That code isn't right.", status: 400 };
    }
    return { ok: true };
  } catch (err) {
    console.error("twilio check threw", err);
    return { ok: false, error: "Could not reach the verification service.", status: 502 };
  }
}
