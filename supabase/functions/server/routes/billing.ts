// Card checkout for the signed-in account (mounted under /account, behind
// requireUser): plan upgrades and the $199 Legacy Continuation Fee, through
// Stripe Checkout. Stripe hosts the card form; the result comes back through
// the signed webhook in routes/public.ts, which is the only place a plan or
// fee is actually marked paid.
//
// Checkout is available only when Stripe is the connected, active processor
// under Developer → Payment Processors (lib/stripe.ts). No Stripe price IDs
// are needed: amounts are built from subscription_plans / admin_settings at
// the moment of checkout, so admin price changes apply immediately.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { loadStripeConfig, stripeRequest } from "../lib/stripe.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

const billing = new Hono();

/** Where Stripe sends the browser back to. Only the page's own origin is
 *  accepted, so a forged request can't turn checkout into an open redirect. */
function returnOrigin(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const origin = c.req.header("origin");
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : null;
}

// GET /account/billing/status — lets the app decide between real checkout
// and the no-payment plan switch it falls back to when Stripe isn't connected.
billing.get("/status", async (c) => {
  const config = await loadStripeConfig();
  return c.json({ checkoutEnabled: Boolean(config), testMode: config?.testMode ?? false });
});

// POST /account/billing/checkout/plan { planId, interval }
billing.post("/checkout/plan", async (c) => {
  const user = c.get("user") as AuthedUser;
  const { planId, interval } = await c.req.json().catch(() => ({}));
  const config = await loadStripeConfig();
  if (!config) return c.json({ error: "Card checkout is not connected yet" }, 503);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Missing request origin" }, 400);
  // Starter is the 14-day introductory plan — it is never bought.
  if (!planId || planId === "starter") return c.json({ error: "Choose a plan to upgrade to" }, 400);

  const db = adminClient();
  const [{ data: plan }, { data: account }] = await Promise.all([
    db.from("subscription_plans").select("id, name, price_monthly, price_annual, is_active").eq("id", planId).maybeSingle(),
    db.from("users").select("stripe_customer_id, deceased_at").eq("id", user.id).maybeSingle(),
  ]);
  if (!plan || !plan.is_active) return c.json({ error: "That plan is not available" }, 400);
  if (account?.deceased_at) return c.json({ error: "This account is frozen" }, 403);

  const yearly = interval === "year";
  const amount = Math.round(Number(yearly ? plan.price_annual : plan.price_monthly) * 100);
  const metadata = { user_id: user.id, plan_id: plan.id, kind: "plan" };

  try {
    const session = await stripeRequest<{ url: string }>(config.secretKey, "POST", "/checkout/sessions", {
      mode: "subscription",
      client_reference_id: user.id,
      ...(account?.stripe_customer_id ? { customer: account.stripe_customer_id } : { customer_email: user.email }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          recurring: { interval: yearly ? "year" : "month" },
          product_data: { name: `Final Pass Down — ${plan.name}` },
        },
      }],
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?page=storage-usage`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not start checkout" }, 502);
  }
});

// POST /account/billing/checkout/continuation-fee
// The account owner pays the one-time Legacy Continuation Fee.
billing.post("/checkout/continuation-fee", async (c) => {
  const user = c.get("user") as AuthedUser;
  const config = await loadStripeConfig();
  if (!config) return c.json({ error: "Card checkout is not connected yet" }, 503);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Missing request origin" }, 400);

  const db = adminClient();
  const [{ data: setting }, { data: paid }, { data: account }] = await Promise.all([
    db.from("admin_settings").select("value").eq("key", "continuation_fee_amount").maybeSingle(),
    db.from("legacy_continuation_fees").select("id").eq("user_id", user.id).eq("status", "paid").limit(1),
    db.from("users").select("stripe_customer_id").eq("id", user.id).maybeSingle(),
  ]);
  if (paid?.length) return c.json({ error: "The Legacy Continuation Fee is already paid for this account" }, 409);

  const amount = Math.round(Number(setting?.value ?? "199") * 100);
  const metadata = { user_id: user.id, kind: "continuation_fee" };

  try {
    const session = await stripeRequest<{ url: string }>(config.secretKey, "POST", "/checkout/sessions", {
      mode: "payment",
      client_reference_id: user.id,
      ...(account?.stripe_customer_id ? { customer: account.stripe_customer_id } : { customer_email: user.email }),
      line_items: [{
        quantity: 1,
        price_data: { currency: "usd", unit_amount: amount, product_data: { name: "Final Pass Down — Legacy Continuation Fee" } },
      }],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/dashboard?page=legacy-continuation&payment=success`,
      cancel_url: `${origin}/dashboard?page=legacy-continuation`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not start checkout" }, 502);
  }
});

// POST /account/billing/portal — Stripe's hosted page for cards, invoices and cancelling.
billing.post("/portal", async (c) => {
  const user = c.get("user") as AuthedUser;
  const config = await loadStripeConfig();
  if (!config) return c.json({ error: "Card checkout is not connected yet" }, 503);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Missing request origin" }, 400);

  const { data: account } = await adminClient().from("users").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!account?.stripe_customer_id) return c.json({ error: "No card payments on this account yet" }, 400);

  try {
    const session = await stripeRequest<{ url: string }>(config.secretKey, "POST", "/billing_portal/sessions", {
      customer: account.stripe_customer_id,
      return_url: `${origin}/dashboard?page=storage-usage`,
    });
    return c.json({ url: session.url });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not open the billing portal" }, 502);
  }
});

export default billing;
