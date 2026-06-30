// ── Stripe Integration Service ──────────────────────────────
// Uses Stripe.js on the client and Stripe server SDK via Supabase Edge Functions
// Edge Functions handle all secret key operations server-side

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "";

// ── Types ───────────────────────────────────────────────────

export interface StripeCheckoutSession {
  id: string; url: string;
}

export interface StripePaymentIntent {
  id: string; client_secret: string; amount: number; status: string;
}

export interface StripePlan {
  planId: string;           // 'premium', 'legacy_pro', etc.
  priceId: string;          // Stripe Price ID
  interval: "month"|"year";
}

// ── Load Stripe.js ───────────────────────────────────────────

let stripePromise: Promise<unknown> | null = null;

export async function loadStripe() {
  if (!stripePromise) {
    const { loadStripe: _load } = await import("@stripe/stripe-js");
    stripePromise = _load(STRIPE_PK);
  }
  return stripePromise;
}

// ── Payment helpers (call Supabase Edge Functions) ──────────

const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : "";

async function callEdge(fn: string, body: unknown) {
  const token = (await import("./supabase")).supabase.auth.getSession()
    .then(r => r.data.session?.access_token ?? "");
  const res = await fetch(`${EDGE_BASE}/${fn}`, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${await token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const stripe = {
  // Create subscription checkout
  async createSubscriptionCheckout(planId: string, interval: "month"|"year"): Promise<StripeCheckoutSession> {
    return callEdge("stripe-checkout", { type:"subscription", planId, interval });
  },

  // One-time legacy continuation fee ($199)
  async createContinuationFeeIntent(paidByType: "account_owner"|"legacy_contact"): Promise<StripePaymentIntent> {
    return callEdge("stripe-payment-intent", {
      type: "continuation_fee",
      amount: 19900,  // $199.00 in cents
      metadata: { paid_by_type: paidByType, product: "legacy_continuation_fee" }
    });
  },

  // Confirm payment with card element
  async confirmPayment(clientSecret: string, paymentMethod: {
    card: { number: string; exp_month: number; exp_year: number; cvc: string; };
    billing_details: { name: string; };
  }) {
    const stripe = await loadStripe() as any;
    if (!stripe) throw new Error("Stripe not loaded");
    return stripe.confirmCardPayment(clientSecret, { payment_method: paymentMethod });
  },

  // Upgrade or downgrade plan
  async changePlan(newPlanId: string, interval: "month"|"year") {
    return callEdge("stripe-change-plan", { planId: newPlanId, interval });
  },

  // Cancel subscription
  async cancelSubscription() {
    return callEdge("stripe-cancel-subscription", {});
  },

  // Get customer portal URL
  async getPortalUrl(): Promise<{ url: string }> {
    return callEdge("stripe-customer-portal", {});
  },

  // Billing history
  async listInvoices() {
    return callEdge("stripe-list-invoices", {});
  },
};

// ── Supabase Edge Function Templates ────────────────────────
// Deploy these to: supabase/functions/stripe-*/index.ts

export const EDGE_FUNCTION_TEMPLATES = {
  "stripe-checkout": `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

serve(async (req) => {
  const { planId, interval } = await req.json();
  const user = await supabase.auth.getUser(req.headers.get("Authorization")!.replace("Bearer ",""));

  const { data: plan } = await supabase.from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_annual").eq("id", planId).single();

  const priceId = interval === "year" ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: \`\${Deno.env.get("APP_URL")}/dashboard?payment=success\`,
    cancel_url: \`\${Deno.env.get("APP_URL")}/storage-usage\`,
    customer_email: user.data.user?.email,
    metadata: { user_id: user.data.user!.id, plan_id: planId },
  });

  return new Response(JSON.stringify({ id: session.id, url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
});`,

  "stripe-payment-intent": `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

serve(async (req) => {
  const { amount, metadata } = await req.json();
  const intent = await stripe.paymentIntents.create({
    amount, currency: "usd", automatic_payment_methods: { enabled: true },
    metadata,
  });
  return new Response(JSON.stringify({ id: intent.id, client_secret: intent.client_secret, amount, status: intent.status }), {
    headers: { "Content-Type": "application/json" },
  });
});`,

  "stripe-webhook": `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET); }
  catch { return new Response("Invalid signature", { status: 400 }); }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata.product === "legacy_continuation_fee") {
        await supabase.from("legacy_continuation_fees").update({
          status: "paid", stripe_charge_id: pi.latest_charge as string, paid_at: new Date().toISOString()
        }).eq("stripe_payment_intent_id", pi.id);
        await supabase.from("notifications").insert({
          user_id: pi.metadata.user_id, title: "Legacy Continuation Fee Paid",
          message: "Your $199 Legacy Continuation Fee has been processed. Your vault will remain active for your legacy contacts.",
          type: "success"
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const planId = sub.metadata.plan_id;
      await supabase.from("users").update({
        plan: planId, stripe_subscription_id: sub.id,
        plan_status: sub.status === "active" ? "active" : sub.status
      }).eq("stripe_customer_id", sub.customer);
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      await supabase.from("users").update({ plan_status: "past_due" })
        .eq("stripe_customer_id", inv.customer);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});`,
};
