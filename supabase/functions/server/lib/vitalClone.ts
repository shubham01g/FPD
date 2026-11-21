// Vital Clone partnership: the partner link Vital Clone assigned to Final Pass
// Down, and the clickwrap members accept before FPD shares their details.
//
// Final Pass Down is a partner in Vital Clone's partner program. Vital Clone
// gives each partner a unique link (https://<vital clone>/r/<slug>); FPD loads
// Vital Clone through that link and puts the slug in the sign-in token, so
// Vital Clone credits every member who arrives from FPD to FPD (visible in
// Vital Clone's master admin → Partners). An admin pastes the link in
// System → Settings → Feature Flags (platform.vitalClone.partnerUrl).
//
// The clickwrap text lives here, on the server, which both sends it to the
// page and stores it word for word when accepted. What a member saw is
// therefore always what was recorded. Any change to the wording needs a new
// VITAL_CLONE_CONSENT_VERSION, which asks every member to accept again.

/** Used when no partner link is saved yet: sign-in still works, without partner credit. */
export const DEFAULT_VITAL_CLONE_ORIGIN = "https://vital-clone.vercel.app";

// Same shape Vital Clone accepts for a partner slug (its src/utils/referral.ts).
const SLUG_RE = /^[A-Za-z0-9_-]{3,64}$/;

export interface PartnerLink {
  /** The link exactly as Vital Clone issued it, normalised (no trailing slash). */
  url: string;
  /** https://host of the Vital Clone deployment. */
  origin: string;
  slug: string;
}

/**
 * Accepts only https://<host>/r/<slug> or https://<host>/partner/<slug>, the
 * two forms Vital Clone issues. Anything else returns null.
 */
export function parsePartnerUrl(raw: unknown): PartnerLink | null {
  if (typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const m = u.pathname.replace(/\/+$/, "").match(/^\/(r|partner)\/([^/]+)$/);
  if (!m) return null;
  const slug = decodeURIComponent(m[2]);
  if (!SLUG_RE.test(slug)) return null;
  return { url: `${u.origin}/${m[1]}/${encodeURIComponent(slug)}`, origin: u.origin, slug };
}

export const VITAL_CLONE_CONSENT_VERSION = "2026-11-21";

export interface VitalCloneConsent {
  version: string;
  title: string;
  paragraphs: string[];
  checkbox: string;
  termsUrl: string;
  privacyUrl: string;
}

/** The clickwrap, with Vital Clone's legal pages on the given deployment. */
export function vitalCloneConsent(origin: string = DEFAULT_VITAL_CLONE_ORIGIN): VitalCloneConsent {
  return {
    version: VITAL_CLONE_CONSENT_VERSION,
    title: "Before you open Vital Clone",
    paragraphs: [
      "Vital Clone is a separate service operated by Vital Clone, LLC. It is not part of Final Pass Down, and " +
        "it has its own Terms of Service and Privacy Policy.",
      "To open it for you, Final Pass Down will share your name and email address with Vital Clone. Vital Clone " +
        "uses them to create your Vital Clone account, or to sign you in to the one you already have.",
      "Everything you create or upload in Vital Clone, including voice recordings and photos, is held by " +
        "Vital Clone under its Terms of Service and Privacy Policy, not by Final Pass Down.",
      "Final Pass Down is a Vital Clone partner and may receive a commission if you buy a Vital Clone plan. " +
        "This does not change the price you pay.",
      "You can stop using Vital Clone at any time. Your Final Pass Down account is not affected.",
    ],
    checkbox:
      "I agree that Final Pass Down may share my name and email address with Vital Clone, LLC, and I accept " +
      "Vital Clone's Terms of Service and Privacy Policy.",
    termsUrl: `${origin}/terms`,
    privacyUrl: `${origin}/privacy-policy`,
  };
}

/** The exact text stored with an acceptance. */
export function consentAgreementText(c: VitalCloneConsent): string {
  return [
    c.title,
    ...c.paragraphs,
    `Terms of Service: ${c.termsUrl}`,
    `Privacy Policy: ${c.privacyUrl}`,
    `[x] ${c.checkbox}`,
  ].join("\n\n");
}
