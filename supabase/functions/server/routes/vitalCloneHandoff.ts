// /account/vital-clone — Vital Clone inside Final Pass Down.
//
//   GET  /status   → the clickwrap (current wording), whether this member has
//                    accepted it, and the address to load Vital Clone from.
//   POST /consent  { version } → records acceptance of the current wording.
//   POST /handoff  → a one-click sign-in token for Vital Clone.
//
// Vital Clone is a separate app with its own Supabase project, so its users
// are separate accounts. /handoff mints a short-lived, single-use HS256 JWT
// for the signed-in FPD member; the browser carries it to Vital Clone (in the
// URL fragment) through FPD's partner link, and Vital Clone's `sso` edge
// function verifies it, finds or creates the matching account by email, and
// signs them in.
//
// Partner credit: FPD is a partner in Vital Clone's partner program. The
// token's `ref` claim is FPD's partner slug, taken from the partner link an
// admin saved (platform.vitalClone.partnerUrl, see lib/vitalClone.ts). Vital
// Clone credits the member to FPD from that signed claim.
//
// The two apps share one secret: VITAL_CLONE_SSO_SECRET here, FPD_SSO_SECRET
// on the Vital Clone project. Same value in both.
//
// Security:
//   - No token until the member has accepted the current clickwrap: FPD shares
//     their name and email with another company only with their agreement.
//     Enforced here, not just on the page.
//   - Only a CONFIRMED email gets a token. Vital Clone matches accounts by
//     email, so an unconfirmed address would let someone who registered here
//     with another person's email walk into that person's Vital Clone account.
//   - Mounted behind requireSecondFactor (index.tsx): signing into another app
//     is as sensitive as anything else on /account.
//   - 60-second lifetime and a random jti, which Vital Clone records so each
//     token works once.
import { Hono } from "npm:hono";
import { SignJWT } from "npm:jose@5.9.6";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { clientIp, readPlatformSection } from "../lib/platformSettings.ts";
import {
  consentAgreementText,
  DEFAULT_VITAL_CLONE_ORIGIN,
  parsePartnerUrl,
  type PartnerLink,
  VITAL_CLONE_CONSENT_VERSION,
  vitalCloneConsent,
} from "../lib/vitalClone.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

export const SSO_ISSUER = "finalpassdown";
export const SSO_AUDIENCE = "vitalclone";
export const SSO_TTL_SECONDS = 60;

const vitalClone = new Hono();

/** Signs the handoff token. Exported so it can be tested without HTTP. */
export async function signHandoffToken(
  secret: string,
  claims: { sub: string; email: string; name: string; ref?: string | null },
  now: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  return await new SignJWT({ email: claims.email, name: claims.name, ...(claims.ref ? { ref: claims.ref } : {}) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SSO_ISSUER)
    .setAudience(SSO_AUDIENCE)
    .setSubject(claims.sub)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + SSO_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}

/** The saved partner link, or null when none (or an invalid one) is saved. */
async function partnerLink(): Promise<PartnerLink | null> {
  const section = await readPlatformSection("vitalClone").catch((err) => {
    console.error("vital-clone: could not read platform.vitalClone", err);
    return {} as Record<string, unknown>;
  });
  return parsePartnerUrl(section.partnerUrl);
}

async function vitalCloneOff(): Promise<boolean> {
  // System → Settings → Feature Flags → Vital Clone switches this off too,
  // not just the sidebar item.
  const flags = await readPlatformSection("flags").catch(() => ({} as Record<string, unknown>));
  return flags.vitalClone === false;
}

async function hasConsented(userId: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("vital_clone_consents")
    .select("id")
    .eq("user_id", userId)
    .eq("version", VITAL_CLONE_CONSENT_VERSION)
    .maybeSingle();
  if (error) throw new Error(`vital_clone_consents: ${error.message}`);
  return !!data;
}

vitalClone.get("/status", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const link = await partnerLink();
  const origin = link?.origin ?? DEFAULT_VITAL_CLONE_ORIGIN;
  let consented: boolean;
  try {
    consented = await hasConsented(user.id);
  } catch (err) {
    console.error("vital-clone status:", err);
    return c.json({ error: "Could not load Vital Clone right now" }, 500);
  }
  return c.json({
    enabled: !(await vitalCloneOff()),
    consented,
    consent: vitalCloneConsent(origin),
    // Where the page loads Vital Clone from: the partner link when one is
    // saved, so every visit counts for FPD; otherwise the sign-in page.
    origin,
    entryUrl: link ? link.url : `${origin}/sso`,
    partnerLinked: !!link,
  });
});

vitalClone.post("/consent", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { version?: unknown };
  // The page must have shown the current wording; an outdated page is asked to reload.
  if (body.version !== VITAL_CLONE_CONSENT_VERSION) {
    return c.json({ error: "The agreement has been updated. Reload the page to read the current version.", code: "consent_outdated" }, 409);
  }
  const link = await partnerLink();
  const text = consentAgreementText(vitalCloneConsent(link?.origin ?? DEFAULT_VITAL_CLONE_ORIGIN));
  const { error } = await adminClient().from("vital_clone_consents").upsert(
    {
      user_id: user.id,
      version: VITAL_CLONE_CONSENT_VERSION,
      agreement_text: text,
      ip_address: clientIp(c.req.header("x-forwarded-for")),
      user_agent: (c.req.header("user-agent") ?? "").slice(0, 500) || null,
    },
    // Accepting twice keeps the first acceptance, not the latest click.
    { onConflict: "user_id,version", ignoreDuplicates: true },
  );
  if (error) {
    console.error("vital-clone consent: insert failed", error);
    return c.json({ error: "We couldn't save your agreement. Please try again." }, 500);
  }
  return c.json({ consented: true, version: VITAL_CLONE_CONSENT_VERSION });
});

vitalClone.post("/handoff", async (c) => {
  const secret = Deno.env.get("VITAL_CLONE_SSO_SECRET") ?? "";
  if (secret.length < 32) {
    console.error("vital-clone handoff: VITAL_CLONE_SSO_SECRET is missing or shorter than 32 characters");
    return c.json({ error: "Vital Clone sign-in isn't set up yet" }, 503);
  }

  if (await vitalCloneOff()) {
    return c.json({ error: "Vital Clone is turned off right now", code: "disabled" }, 403);
  }

  const user = c.get("user" as never) as AuthedUser;
  const db = adminClient();

  try {
    if (!(await hasConsented(user.id))) {
      return c.json({ error: "Please read and accept the agreement before opening Vital Clone", code: "consent_required" }, 403);
    }
  } catch (err) {
    console.error("vital-clone handoff:", err);
    return c.json({ error: "Could not load your account" }, 500);
  }

  const { data: authData, error: authErr } = await db.auth.admin.getUserById(user.id);
  if (authErr || !authData?.user) {
    console.error("vital-clone handoff: getUserById failed", authErr);
    return c.json({ error: "Could not load your account" }, 500);
  }
  const authUser = authData.user;
  if (!authUser.email || !authUser.email_confirmed_at) {
    return c.json({ error: "Confirm your email address before opening Vital Clone", code: "email_unconfirmed" }, 403);
  }

  const { data: profile } = await db.from("users")
    .select("full_name, plan_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.plan_status === "paused") {
    return c.json({ error: "Your account is paused", code: "account_paused" }, 403);
  }

  const link = await partnerLink();
  const token = await signHandoffToken(secret, {
    sub: user.id,
    email: authUser.email.toLowerCase(),
    name: (profile?.full_name ?? "").trim(),
    ref: link?.slug ?? null,
  });
  return c.json({
    token,
    expiresIn: SSO_TTL_SECONDS,
    origin: link?.origin ?? DEFAULT_VITAL_CLONE_ORIGIN,
    entryUrl: link ? link.url : `${DEFAULT_VITAL_CLONE_ORIGIN}/sso`,
  });
});

export default vitalClone;
