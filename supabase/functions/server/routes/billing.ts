// Billing for the signed-in account (mounted at /account/billing, behind
// requireUser). Stripe hosts every card form: checkout routes return a URL to
// send the browser to, and the signed webhook (routes/stripeWebhook.ts) is the
// only place a purchase actually takes effect.
//
// Prices come from the synced catalog (lib/billing/catalog.ts), never from
// the request. BILLING_PAUSED stops new purchases and plan changes but not
// cancelling or the portal.
import { Hono } from "npm:hono";
import type { Context } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "../lib/stripe.ts";
import { billingPaused, consentRequired, returnOrigin, taxEnabled } from "../lib/billingConfig.ts";
import { CatalogError, planPrice, productPrice, type Interval } from "../lib/billing/catalog.ts";
import { findCustomer, getOrCreateCustomer } from "../lib/billing/customers.ts";
import { CONSENT_VERSION, consentText, type ConsentPurpose } from "../lib/billing/consent.ts";
import { portalConfigurationId } from "../lib/billing/setup.ts";
import { cancelPendingChange, changePlan, PlanChangeError, setCancelAtPeriodEnd } from "../lib/billing/planChange.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

type Env = { Variables: { user: AuthedUser } };
const billing = new Hono<Env>();

const ACCESS = ["active", "trialing", "past_due"];
const PAGE = /^[a-z][a-z-]{0,40}$/;

function interval(value: unknown): Interval {
  return value === "year" ? "year" : "month";
}

function errorResponse(c: Context, err: unknown) {
  if (err instanceof CatalogError) return c.json({ error: err.message }, err.status);
  console.error("billing:", err);
  return c.json({ error: err instanceof Error ? err.message : "Billing request failed" }, 502);
}

/** Shared refusals for anything that starts a new charge. */
function purchaseBlocked(c: Context): Response | null {
  if (!stripeMode()) return c.json({ error: "Card payments are being set up. Please try again shortly." }, 503);
  if (billingPaused()) return c.json({ error: "Billing is being updated. Please try again in a few minutes." }, 503);
  return null;
}

async function loadAccount(userId: string) {
  const { data } = await adminClient().from("users")
    .select("id, email, full_name, plan, plan_status, deceased_at, overage_blocked")
    .eq("id", userId).maybeSingle();
  return data;
}

async function accessRow(userId: string, line: "plan" | "dr_addon") {
  const { data } = await adminClient().from("subscriptions").select("*")
    .eq("user_id", userId).eq("product_line", line).in("status", ACCESS)
    .order("updated_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

/** Checks the consent the browser sent against the current wording. */
function checkConsent(c: Context, sent: unknown, expected: string): Response | null {
  const body = (sent ?? {}) as { text?: string; version?: string };
  const agreed = body.text === expected && body.version === CONSENT_VERSION;
  if (!agreed && consentRequired()) {
    return c.json({ error: "Please read and tick the renewal terms to continue.", consentText: expected, consentVersion: CONSENT_VERSION }, 400);
  }
  return null;
}

async function recordConsent(c: Context, row: {
  userId: string; purpose: ConsentPurpose; planId?: string | null; productSlug?: string | null;
  interval?: Interval | null; amountCents: number; text: string; sessionId: string;
}) {
  const { error } = await adminClient().from("billing_consents").insert({
    user_id: row.userId, purpose: row.purpose, plan_id: row.planId ?? null, product_slug: row.productSlug ?? null,
    interval: row.interval ?? null, amount_cents: row.amountCents, consent_text: row.text, consent_version: CONSENT_VERSION,
    checkout_session_id: row.sessionId, livemode: isLivemode(),
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: c.req.header("user-agent")?.slice(0, 400) ?? null,
  });
  if (error) console.error("billing_consents insert failed:", error.message);
}

/** Checkout session fields every purchase shares. */
function sessionBase(origin: string, page: string, customer: string, userId: string) {
  const tax = taxEnabled();
  return {
    customer,
    client_reference_id: userId,
    // Charge in USD only: Adaptive Pricing would switch the currency and then
    // Stripe refuses every USD overage line on later invoices (pitfall 4.1).
    adaptive_pricing: { enabled: false },
    payment_method_types: ["card", "link"],
    allow_promotion_codes: false,
    success_url: `${origin}/dashboard?page=${page}&payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?page=${page}&payment=cancelled`,
    ...(tax ? { automatic_tax: { enabled: true }, customer_update: { address: "auto", name: "auto" }, billing_address_collection: "required" } : {}),
  };
}

// GET /account/billing/status — whether checkout can start right now.
billing.get("/status", (c) => {
  return c.json({ checkoutEnabled: Boolean(stripeMode()) && !billingPaused(), testMode: stripeMode() === "test" });
});

// GET /account/billing/consent-text?purpose=plan&planId=foundation&interval=year
//                                 ?purpose=dr_addon&interval=month
//                                 ?purpose=wg_card_on_file
billing.get("/consent-text", async (c) => {
  const purpose = c.req.query("purpose");
  const iv = interval(c.req.query("interval"));
  try {
    if (purpose === "plan") {
      const { plan, amountCents } = await planPrice(c.req.query("planId") ?? "", iv);
      return c.json({ text: consentText({ purpose, name: `the ${plan.name} plan`, amountCents, interval: iv }), version: CONSENT_VERSION, amountCents });
    }
    if (purpose === "dr_addon") {
      const { product, amountCents } = await productPrice(iv === "year" ? "dr_addon_year" : "dr_addon_month");
      return c.json({ text: consentText({ purpose, name: product.name, amountCents, interval: iv }), version: CONSENT_VERSION, amountCents });
    }
    if (purpose === "wg_card_on_file") {
      const [{ product, amountCents }, block] = await Promise.all([productPrice("wg_setup"), productPrice("wg_session_block")]);
      return c.json({ text: consentText({ purpose, name: product.name, amountCents, blockCents: block.amountCents }), version: CONSENT_VERSION, amountCents });
    }
    return c.json({ error: "Unknown purpose" }, 400);
  } catch (err) {
    return errorResponse(c, err);
  }
});

// GET /account/billing/summary — everything the Usage & Billing page shows.
billing.get("/summary", async (c) => {
  const user = c.get("user");
  const db = adminClient();
  const livemode = isLivemode();
  const [account, { data: subs }, { data: period }, { data: cap }, { data: card }, { data: fee }, { data: plans }] = await Promise.all([
    loadAccount(user.id),
    db.from("subscriptions").select("id, product_line, plan_id, product_slug, status, interval, current_period_end, cancel_at_period_end, cancel_at, pending_plan_id, pending_interval, pending_change_at, comp_reason")
      .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(20),
    db.from("usage_periods").select("period_start, period_end, included_bytes, unit_bytes, current_bytes, peak_bytes, billable_units, billable_cents, rate_cents, overage_allowed")
      .eq("user_id", user.id).eq("status", "open").maybeSingle(),
    db.from("storage_spend_caps").select("cap_amount_usd").eq("user_id", user.id).maybeSingle(),
    db.from("wg_payment_methods").select("card_brand, card_last4, livemode").eq("user_id", user.id).maybeSingle(),
    db.from("legacy_continuation_fees").select("id, paid_at, activated_at, expires_at").eq("user_id", user.id).eq("status", "paid").limit(1),
    db.from("subscription_plans").select("id, name, price_monthly, storage_gb, overage_rate"),
  ]);
  if (!account) return c.json({ error: "Account not found" }, 404);

  const plan = plans?.find((p) => p.id === account.plan);
  const live = (subs ?? []).filter((s) => ACCESS.includes(s.status));
  const capCents = cap?.cap_amount_usd != null ? Math.round(Number(cap.cap_amount_usd) * 100) : Math.round(Number(plan?.price_monthly ?? 0) * 100);

  return c.json({
    plan: account.plan,
    planName: plan?.name ?? account.plan,
    planStatus: account.plan_status,
    storageGb: plan?.storage_gb ?? null,
    overageRateCents: Math.round(Number(plan?.overage_rate ?? 0) * 100),
    planSubscription: live.find((s) => s.product_line === "plan") ?? null,
    drSubscription: live.find((s) => s.product_line === "dr_addon") ?? null,
    subscriptions: subs ?? [],
    usage: period ?? null,
    capCents,
    capIsDefault: cap?.cap_amount_usd == null,
    overageBlocked: account.overage_blocked,
    wgCard: card && card.livemode === livemode && card.card_last4 ? { brand: card.card_brand, last4: card.card_last4 } : null,
    continuationFee: fee?.[0] ?? null,
    hasCustomer: stripeMode() ? Boolean(await findCustomer(user.id)) : false,
    checkoutEnabled: Boolean(stripeMode()) && !billingPaused(),
    billingPaused: billingPaused(),
    consentRequired: consentRequired(),
    livemode,
  });
});

// POST /account/billing/checkout/plan { planId, interval, consent: { text, version }, page? }
billing.post("/checkout/plan", async (c) => {
  const blocked = purchaseBlocked(c);
  if (blocked) return blocked;
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const iv = interval(body.interval);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Billing return address is not configured (APP_URL)" }, 500);
  const page = PAGE.test(body.page ?? "") ? body.page : "storage-usage";

  const account = await loadAccount(user.id);
  if (!account) return c.json({ error: "Account not found" }, 404);
  if (account.deceased_at) return c.json({ error: "This account is frozen" }, 403);
  if (await accessRow(user.id, "plan")) {
    return c.json({ error: "You already have a plan. Change it from Usage & Billing instead." }, 409);
  }

  try {
    const { plan, priceId, amountCents } = await planPrice(String(body.planId ?? ""), iv);
    const text = consentText({ purpose: "plan", name: `the ${plan.name} plan`, amountCents, interval: iv });
    const consentProblem = checkConsent(c, body.consent, text);
    if (consentProblem) return consentProblem;

    const customer = await getOrCreateCustomer(user.id, account.email, account.full_name);
    const metadata = { userId: user.id, planId: plan.id, interval: iv, purchaseType: "plan" };
    const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      ...sessionBase(origin, page, customer, user.id),
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
    });
    await recordConsent(c, { userId: user.id, purpose: "plan", planId: plan.id, interval: iv, amountCents, text, sessionId: session.id });
    return c.json({ url: session.url });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// POST /account/billing/checkout/addon { product: "dr_addon", interval, consent, page? }
billing.post("/checkout/addon", async (c) => {
  const blocked = purchaseBlocked(c);
  if (blocked) return blocked;
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  if (body.product !== "dr_addon") return c.json({ error: "Unknown add-on" }, 400);
  const iv = interval(body.interval);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Billing return address is not configured (APP_URL)" }, 500);
  const page = PAGE.test(body.page ?? "") ? body.page : "disaster-recovery";

  const account = await loadAccount(user.id);
  if (!account) return c.json({ error: "Account not found" }, 404);
  if (account.deceased_at) return c.json({ error: "This account is frozen" }, 403);
  // A paid or comped plan (or one from before billing) — not Starter, not cancelled.
  if (account.plan === "starter" || account.plan_status === "cancelled") {
    return c.json({ error: "Disaster Recovery needs a paid plan. Choose a plan first." }, 409);
  }
  const { data: dr } = await adminClient().from("disaster_recovery_state").select("addon_active").eq("user_id", user.id).maybeSingle();
  if (dr?.addon_active || await accessRow(user.id, "dr_addon")) {
    return c.json({ error: "Disaster Recovery is already active on this account." }, 409);
  }

  try {
    const { product, priceId, amountCents } = await productPrice(iv === "year" ? "dr_addon_year" : "dr_addon_month");
    const text = consentText({ purpose: "dr_addon", name: product.name, amountCents, interval: iv });
    const consentProblem = checkConsent(c, body.consent, text);
    if (consentProblem) return consentProblem;

    const customer = await getOrCreateCustomer(user.id, account.email, account.full_name);
    const metadata = { userId: user.id, productSlug: product.slug, interval: iv, purchaseType: "dr_addon" };
    const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      ...sessionBase(origin, page, customer, user.id),
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
    });
    await recordConsent(c, { userId: user.id, purpose: "dr_addon", productSlug: product.slug, interval: iv, amountCents, text, sessionId: session.id });
    return c.json({ url: session.url });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// POST /account/billing/checkout/one-time { product: "continuation_fee" | "wg_setup", consent?, page? }
async function oneTimeCheckout(c: Context<Env>, product: string, body: Record<string, unknown>) {
  const blocked = purchaseBlocked(c);
  if (blocked) return blocked;
  const user = c.get("user");
  if (product !== "continuation_fee" && product !== "wg_setup") return c.json({ error: "Unknown product" }, 400);
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Billing return address is not configured (APP_URL)" }, 500);
  const fallbackPage = product === "continuation_fee" ? "legacy-continuation" : "white-glove";
  const page = PAGE.test(String(body.page ?? "")) ? String(body.page) : fallbackPage;

  const db = adminClient();
  const account = await loadAccount(user.id);
  if (!account) return c.json({ error: "Account not found" }, 404);
  if (account.deceased_at) return c.json({ error: "This account is frozen" }, 403);

  try {
    const { product: row, priceId, amountCents } = await productPrice(product);
    let consent: { text: string } | null = null;

    if (product === "continuation_fee") {
      const { data: paid } = await db.from("legacy_continuation_fees").select("id").eq("user_id", user.id).eq("status", "paid").limit(1);
      if (paid?.length) return c.json({ error: "The Legacy Continuation Fee is already paid for this account" }, 409);
    } else {
      const { data: card } = await db.from("wg_payment_methods").select("stripe_payment_method, livemode").eq("user_id", user.id).maybeSingle();
      if (card?.stripe_payment_method && card.livemode === isLivemode()) {
        return c.json({ error: "White Glove is already set up on this account." }, 409);
      }
      const block = await productPrice("wg_session_block");
      const text = consentText({ purpose: "wg_card_on_file", name: row.name, amountCents, blockCents: block.amountCents });
      const consentProblem = checkConsent(c, body.consent, text);
      if (consentProblem) return consentProblem;
      consent = { text };
    }

    const customer = await getOrCreateCustomer(user.id, account.email, account.full_name);
    const metadata = { userId: user.id, productSlug: row.slug, purchaseType: product };
    const session = await stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      ...sessionBase(origin, page, customer, user.id),
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata,
      payment_intent_data: {
        metadata,
        ...(product === "wg_setup" ? { setup_future_usage: "off_session" } : {}),
      },
      invoice_creation: { enabled: true, invoice_data: { metadata } },
    });
    if (consent) {
      await recordConsent(c, { userId: user.id, purpose: "wg_card_on_file", productSlug: row.slug, amountCents, text: consent.text, sessionId: session.id });
    }
    return c.json({ url: session.url });
  } catch (err) {
    return errorResponse(c, err);
  }
}

billing.post("/checkout/one-time", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return await oneTimeCheckout(c, String(body.product ?? ""), body);
});

// Kept for the Legacy Continuation Fee page built before the catalog.
billing.post("/checkout/continuation-fee", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return await oneTimeCheckout(c, "continuation_fee", body);
});

function planChangeError(c: Context, err: unknown) {
  if (err instanceof PlanChangeError) return c.json({ error: err.message }, err.status);
  return errorResponse(c, err);
}

// POST /account/billing/change-plan { planId, interval } — upgrades now
// (prorated), downgrades at the end of the period.
billing.post("/change-plan", async (c) => {
  const blocked = purchaseBlocked(c);
  if (blocked) return blocked;
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const account = await loadAccount(user.id);
  if (account?.deceased_at) return c.json({ error: "This account is frozen" }, 403);
  try {
    return c.json(await changePlan(user.id, String(body.planId ?? ""), interval(body.interval)));
  } catch (err) {
    return planChangeError(c, err);
  }
});

// POST /account/billing/change-plan/cancel-pending — keep the current plan.
billing.post("/change-plan/cancel-pending", async (c) => {
  if (!stripeMode()) return c.json({ error: "Card payments are being set up. Please try again shortly." }, 503);
  try {
    await cancelPendingChange(c.get("user").id);
    return c.json({ ok: true });
  } catch (err) {
    return planChangeError(c, err);
  }
});

// POST /account/billing/cancel { productLine: "plan" | "dr_addon" } — at the
// end of the period. Works while billing is paused.
// POST /account/billing/resume { productLine } — undoes it.
for (const [path, cancel] of [["/cancel", true], ["/resume", false]] as const) {
  billing.post(path, async (c) => {
    if (!stripeMode()) return c.json({ error: "Card payments are being set up. Please try again shortly." }, 503);
    const body = await c.req.json().catch(() => ({}));
    const line = body.productLine === "dr_addon" ? "dr_addon" : "plan";
    try {
      await setCancelAtPeriodEnd(c.get("user").id, line, cancel);
      return c.json({ ok: true });
    } catch (err) {
      return planChangeError(c, err);
    }
  });
}

// PUT /account/billing/overage-cap { capUsd } — the owner's monthly overage
// limit. null goes back to the default (the plan's monthly price). Raising
// it never charges anything already refused.
billing.put("/overage-cap", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const db = adminClient();
  if (body.capUsd === null) {
    await db.from("storage_spend_caps").delete().eq("user_id", user.id);
  } else {
    const cap = Number(body.capUsd);
    if (!Number.isFinite(cap) || cap < 0 || cap > 10000) return c.json({ error: "Enter a limit between $0 and $10,000" }, 400);
    const { error } = await db.from("storage_spend_caps").upsert({
      user_id: user.id, cap_enabled: true, cap_amount_usd: Math.round(cap * 100) / 100, updated_at: new Date().toISOString(),
    });
    if (error) return c.json({ error: error.message }, 500);
  }
  await db.rpc("refresh_storage_usage", { p_user: user.id });
  return c.json({ ok: true });
});

// POST /account/billing/portal — Stripe's page for cards, invoices, billing
// details and cancelling at period end (plan switching is off there).
billing.post("/portal", async (c) => {
  if (!stripeMode()) return c.json({ error: "Card payments are being set up. Please try again shortly." }, 503);
  const user = c.get("user");
  const origin = returnOrigin(c);
  if (!origin) return c.json({ error: "Billing return address is not configured (APP_URL)" }, 500);
  const customer = await findCustomer(user.id);
  if (!customer) return c.json({ error: "No card payments on this account yet" }, 400);
  try {
    const configuration = await portalConfigurationId();
    const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
      customer,
      return_url: `${origin}/dashboard?page=storage-usage`,
      ...(configuration ? { configuration } : {}),
    });
    return c.json({ url: session.url });
  } catch (err) {
    return errorResponse(c, err);
  }
});

export default billing;
