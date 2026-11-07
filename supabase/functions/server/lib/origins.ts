// Which web origins count as "ours".
//
// Used for CORS (index.tsx) and for the links in outgoing mail
// (email.ts linkOrigin). Both used to trust whatever Origin the caller sent.
//
// Ours = APP_URL, the public domain (with and without www), anything listed
// in BILLING_RETURN_ORIGINS, this project's Vercel deployments
// (fpd-*.vercel.app, which covers previews), and localhost dev servers.

export const PUBLIC_SITE = "https://finalpassdown.com";

export function originOf(url: string | undefined | null): string | null {
  try { return url ? new URL(url.trim()).origin : null; } catch { return null; }
}

/** Where to send people when the caller's own origin can't be used. */
export function defaultOrigin(): string {
  return originOf(Deno.env.get("APP_URL")) ?? PUBLIC_SITE;
}

export function isOurOrigin(origin: string | null | undefined): boolean {
  const o = originOf(origin);
  if (!o) return false;
  if (o === defaultOrigin() || o === PUBLIC_SITE || o === PUBLIC_SITE.replace("https://", "https://www.")) return true;
  for (const extra of (Deno.env.get("BILLING_RETURN_ORIGINS") ?? "").split(",")) {
    if (originOf(extra) === o) return true;
  }
  return /^https:\/\/fpd[a-z0-9-]*\.vercel\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
}
