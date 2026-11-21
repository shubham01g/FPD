// deno test --no-config supabase/functions/server/lib/vitalClone.test.ts
import { decodeJwt } from "npm:jose@5.9.6";
import { consentAgreementText, parsePartnerUrl, VITAL_CLONE_CONSENT_VERSION, vitalCloneConsent } from "./vitalClone.ts";
import { signHandoffToken } from "../routes/vitalCloneHandoff.ts";

function eq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

Deno.test("partner links Vital Clone issues are accepted and normalised", () => {
  eq(parsePartnerUrl("https://vital-clone.vercel.app/r/final-pass-down"),
    { url: "https://vital-clone.vercel.app/r/final-pass-down", origin: "https://vital-clone.vercel.app", slug: "final-pass-down" }, "/r/");
  eq(parsePartnerUrl("  https://www.vitalclone.ai/partner/Final_Pass_Down/  ")?.url,
    "https://www.vitalclone.ai/partner/Final_Pass_Down", "/partner/ with spaces and trailing slash");
  eq(parsePartnerUrl("https://vital-clone.vercel.app/r/final-pass-down?utm=x#y")?.url,
    "https://vital-clone.vercel.app/r/final-pass-down", "query and hash dropped");
});

Deno.test("anything else is refused", () => {
  for (const bad of [
    "", "   ", null, undefined, 42, "not a url",
    "http://vital-clone.vercel.app/r/final-pass-down", // not https
    "https://vital-clone.vercel.app/", // no slug
    "https://vital-clone.vercel.app/r/", // empty slug
    "https://vital-clone.vercel.app/r/a/b", // extra segment
    "https://vital-clone.vercel.app/signup?ref=x", // wrong form
    "https://vital-clone.vercel.app/r/x", // too short
    "https://vital-clone.vercel.app/r/has%20space",
    "https://user:pw@vital-clone.vercel.app/r/final-pass-down",
    "https://vital-clone.vercel.app:8443/r/final-pass-down",
    "javascript:alert(1)//r/final-pass-down",
  ]) {
    eq(parsePartnerUrl(bad), null, `refused ${JSON.stringify(bad)}`);
  }
});

Deno.test("clickwrap points at Vital Clone's legal pages and stores every line", () => {
  const c = vitalCloneConsent("https://www.vitalclone.ai");
  eq(c.version, VITAL_CLONE_CONSENT_VERSION, "version");
  eq(c.termsUrl, "https://www.vitalclone.ai/terms", "terms");
  eq(c.privacyUrl, "https://www.vitalclone.ai/privacy-policy", "privacy");
  const text = consentAgreementText(c);
  for (const part of [c.title, ...c.paragraphs, c.checkbox, c.termsUrl, c.privacyUrl]) {
    if (!text.includes(part)) throw new Error(`stored text is missing: ${part.slice(0, 40)}`);
  }
});

Deno.test("handoff token carries the partner slug only when there is one", async () => {
  const secret = "x".repeat(48);
  const base = { sub: "u1", email: "a@b.co", name: "A" };
  eq(decodeJwt(await signHandoffToken(secret, { ...base, ref: "final-pass-down" })).ref, "final-pass-down", "with ref");
  eq(decodeJwt(await signHandoffToken(secret, { ...base, ref: null })).ref, undefined, "null ref");
  eq(decodeJwt(await signHandoffToken(secret, base)).ref, undefined, "no ref");
});
