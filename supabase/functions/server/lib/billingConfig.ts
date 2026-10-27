// Billing switches and settings, all read from the function's secrets
// (GO_LIVE_CHECKLIST.md, "Secrets and flags"):
//
//   BILLING_PAUSED=true            checkout and plan changes answer 503; cancel,
//                                  the portal and webhooks keep working. Used in
//                                  the cutover window and for rollback.
//   RENEWAL_CONSENT_REQUIRED=false checkout accepts a request without the
//                                  auto-renewal consent. Only until the front end
//                                  that sends consent is live in production.
//   STRIPE_TAX_ENABLED=true        Stripe Tax on Checkout. Only once it is set up.
//   APP_URL                        where Stripe sends the buyer back to.
//   BILLING_RETURN_ORIGINS         other allowed return origins (comma list).
import { STRIPE_API_VERSION, stripeMode, stripeWebhookSecret } from "./stripe.ts";

function flag(name: string): boolean {
  return (Deno.env.get(name) ?? "").trim().toLowerCase() === "true";
}

export function billingPaused(): boolean {
  return flag("BILLING_PAUSED");
}

/** On unless explicitly turned off. */
export function consentRequired(): boolean {
  return (Deno.env.get("RENEWAL_CONSENT_REQUIRED") ?? "").trim().toLowerCase() !== "false";
}

export function taxEnabled(): boolean {
  return flag("STRIPE_TAX_ENABLED");
}

function originOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

export function appOrigin(): string | null {
  return originOf(Deno.env.get("APP_URL"));
}

/**
 * Where Stripe sends the browser back to. The page's own Origin is used when
 * it is APP_URL, listed in BILLING_RETURN_ORIGINS, or (test mode only) a
 * localhost dev server; anything else falls back to APP_URL, so a forged
 * request can't turn checkout into an open redirect.
 */
export function returnOrigin(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const requested = originOf(c.req.header("origin"));
  const app = appOrigin();
  if (requested) {
    if (requested === app) return requested;
    const extra = (Deno.env.get("BILLING_RETURN_ORIGINS") ?? "").split(",").map((o) => originOf(o)).filter(Boolean);
    if (extra.includes(requested)) return requested;
    if (stripeMode() === "test" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requested)) return requested;
  }
  return app;
}

/** What /public/billing/status reports. Proves the mode without a key. */
export function billingStatus() {
  const mode = stripeMode();
  return {
    stripeConfigured: mode !== null,
    webhookConfigured: Boolean(stripeWebhookSecret()),
    livemode: mode === "live",
    mode,
    billingPaused: billingPaused(),
    consentRequired: consentRequired(),
    taxEnabled: taxEnabled(),
    returnUrlConfigured: appOrigin() !== null,
    apiVersion: STRIPE_API_VERSION,
  };
}
