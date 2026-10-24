// One-time Stripe account setup that the admin screen runs per mode: the
// customer portal configuration, and a check that the webhook endpoint is
// subscribed to every event the handler needs.
import { adminClient } from "../supabaseAdmin.ts";
import { stripe, stripeListAll, stripeMode } from "../stripe.ts";
import { appOrigin } from "../billingConfig.ts";

/** Every event routes/stripeWebhook.ts handles (framework §3.3). */
export const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.created",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.upcoming",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
] as const;

const portalKey = () => `stripe_portal_config_${stripeMode()}`;

export async function portalConfigurationId(): Promise<string | null> {
  const { data } = await adminClient().from("admin_settings").select("value").eq("key", portalKey()).maybeSingle();
  return data?.value || null;
}

/**
 * Creates (or updates) the portal configuration: card update, invoice
 * history, billing details and cancel-at-period-end. Plan switching is OFF —
 * plan changes go through the app, which prorates upgrades and schedules
 * downgrades (framework §3.5).
 */
export async function setupPortal(): Promise<{ id: string; created: boolean }> {
  const origin = appOrigin();
  const params = {
    business_profile: { headline: "Final Pass Down: manage your billing" },
    default_return_url: origin ? `${origin}/dashboard?page=storage-usage` : undefined,
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "phone"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "missing_features", "switched_service", "unused", "other"],
        },
      },
      subscription_update: { enabled: false },
    },
  };

  const existing = await portalConfigurationId();
  if (existing) {
    try {
      const updated = await stripe<{ id: string }>("POST", `/billing_portal/configurations/${existing}`, params);
      return { id: updated.id, created: false };
    } catch {
      // From the other mode or deleted: create a fresh one below.
    }
  }
  const created = await stripe<{ id: string }>("POST", "/billing_portal/configurations", params);
  await adminClient().from("admin_settings").upsert({ key: portalKey(), value: created.id, updated_at: new Date().toISOString() });
  return { id: created.id, created: true };
}

export interface WebhookCheck {
  endpoints: { id: string; url: string; status: string; apiVersion: string | null; missingEvents: string[]; pointsHere: boolean }[];
  ok: boolean;
  message: string;
}

/** Lists the account's webhook endpoints and what each is missing. */
export async function checkWebhook(functionName: string): Promise<WebhookCheck> {
  // deno-lint-ignore no-explicit-any
  const endpoints = await stripeListAll<Record<string, any>>("/webhook_endpoints");
  const rows = endpoints.map((e) => {
    const events: string[] = e.enabled_events ?? [];
    const missing = events.includes("*") ? [] : WEBHOOK_EVENTS.filter((ev) => !events.includes(ev));
    return {
      id: e.id as string,
      url: e.url as string,
      status: e.status as string,
      apiVersion: (e.api_version as string | null) ?? null,
      missingEvents: missing,
      pointsHere: typeof e.url === "string" && e.url.includes(`/functions/v1/${functionName}/`) && e.url.endsWith("/public/stripe/webhook"),
    };
  });
  const here = rows.filter((r) => r.pointsHere && r.status === "enabled");
  const ok = here.length > 0 && here.some((r) => r.missingEvents.length === 0);
  const message = here.length === 0
    ? `No enabled endpoint points at the ${functionName} function's /public/stripe/webhook`
    : ok ? "Webhook endpoint is subscribed to every event the app handles"
    : `Endpoint is missing: ${here[0].missingEvents.join(", ")}`;
  return { endpoints: rows, ok, message };
}
