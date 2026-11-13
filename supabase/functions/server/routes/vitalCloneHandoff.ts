// POST /account/vital-clone/handoff — one-click sign-in into Vital Clone.
//
// Vital Clone is a separate app with its own Supabase project, so its users
// are separate accounts. This route mints a short-lived, single-use HS256 JWT
// for the signed-in FPD member; the browser carries it to Vital Clone's /sso
// page (in the URL fragment), and Vital Clone's `sso` edge function verifies
// it, finds or creates the matching account by email, and signs them in.
//
// The two apps share one secret: VITAL_CLONE_SSO_SECRET here, FPD_SSO_SECRET
// on the Vital Clone project. Same value in both.
//
// Security:
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
import { readPlatformSection } from "../lib/platformSettings.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

export const SSO_ISSUER = "finalpassdown";
export const SSO_AUDIENCE = "vitalclone";
export const SSO_TTL_SECONDS = 60;

const vitalCloneHandoff = new Hono();

/** Signs the handoff token. Exported so it can be tested without HTTP. */
export async function signHandoffToken(
  secret: string,
  claims: { sub: string; email: string; name: string },
  now: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  return await new SignJWT({ email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SSO_ISSUER)
    .setAudience(SSO_AUDIENCE)
    .setSubject(claims.sub)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + SSO_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}

vitalCloneHandoff.post("/", async (c) => {
  const secret = Deno.env.get("VITAL_CLONE_SSO_SECRET") ?? "";
  if (secret.length < 32) {
    console.error("vital-clone handoff: VITAL_CLONE_SSO_SECRET is missing or shorter than 32 characters");
    return c.json({ error: "Vital Clone sign-in isn't set up yet" }, 503);
  }

  // System → Settings → Feature Flags → Vital Clone switches this off too,
  // not just the sidebar item.
  const flags = await readPlatformSection("flags").catch(() => ({} as Record<string, unknown>));
  if (flags.vitalClone === false) {
    return c.json({ error: "Vital Clone is turned off right now", code: "disabled" }, 403);
  }

  const user = c.get("user" as never) as AuthedUser;
  const db = adminClient();

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

  const token = await signHandoffToken(secret, {
    sub: user.id,
    email: authUser.email.toLowerCase(),
    name: (profile?.full_name ?? "").trim(),
  });
  return c.json({ token, expiresIn: SSO_TTL_SECONDS });
});

export default vitalCloneHandoff;
