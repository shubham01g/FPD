// POST /public/stripe/webhook — the only place a card payment changes
// anything (framework §3.3).
//
//   1. The signature is verified on the RAW body with STRIPE_WEBHOOK_SECRET.
//   2. An event from the other mode (test vs live) is acknowledged and ignored.
//   3. Idempotency: the event id is recorded in stripe_events first; one
//      already processed answers 200 {duplicate:true}.
//   4. Every object is re-read through lib/stripe.ts with the pinned API
//      version — the payload's shape depends on the endpoint's version, which
//      is set in the dashboard (pitfall 4.4).
//   5. 200 for events we don't handle and for resource_missing; 500 for real
//      errors so Stripe retries. invoice.created always gets 200: an error
//      there holds the renewal invoice back for up to 72 hours.
//   6. Subscriptions without userId metadata (hand-made, e.g. enterprise
//      invoicing) are ignored.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode, isResourceMissing, stripe, stripeMode, stripeWebhookSecret, verifyStripeSignature } from "../lib/stripe.ts";
import { chargeInvoiceId, idOf, invoiceChargeId, invoiceLinePeriod, invoicePaymentIntentId, invoiceSubscriptionId, unixToIso } from "../lib/stripeShapes.ts";
import { DuplicateSubscriptionError, provisionSubscription, retrieveSubscription } from "../lib/billing/provision.ts";
import { recordPayment, type PaymentType } from "../lib/billing/ledger.ts";
import { alertAdmin, manageBillingUrl, notifyOnce } from "../lib/billing/notify.ts";
import { attachOverageToRenewal } from "../lib/billing/usage.ts";
import { recordCommission, restoreForWonDispute, reverseForDispute, reverseForRefund } from "../lib/billing/commissions.ts";
import { userForCustomer } from "../lib/billing/customers.ts";
import { usd } from "../lib/billing/consent.ts";
import { overageDeclinedEmail, paymentFailedEmail, renewalReminderEmail } from "../lib/email.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;
interface StripeEvent { id: string; type: string; livemode: boolean; api_version?: string; created?: number; data: { object: Obj } }

const webhook = new Hono();
const nowIso = () => new Date().toISOString();

webhook.post("/webhook", async (c) => {
  const secret = stripeWebhookSecret();
  if (!secret || !stripeMode()) return c.json({ error: "Stripe webhook is not configured" }, 503);

  const raw = await c.req.text();
  if (!(await verifyStripeSignature(raw, c.req.header("stripe-signature"), secret))) {
    return c.json({ error: "Invalid signature" }, 400);
  }
  const event = JSON.parse(raw) as StripeEvent;
  if (Boolean(event.livemode) !== isLivemode()) return c.json({ received: true, ignored: "mode" });

  const db = adminClient();
  const { error: insertErr } = await db.from("stripe_events").insert({
    id: event.id, type: event.type, livemode: Boolean(event.livemode), api_version: event.api_version ?? null,
    object_id: idOf(event.data?.object), stripe_created_at: unixToIso(event.created),
  });
  if (insertErr) {
    if (insertErr.code !== "23505") return c.json({ error: insertErr.message }, 500);
    const { data: seen } = await db.from("stripe_events").select("processed_at, attempts").eq("id", event.id).maybeSingle();
    if (seen?.processed_at) return c.json({ received: true, duplicate: true });
    await db.from("stripe_events").update({ attempts: (seen?.attempts ?? 1) + 1 }).eq("id", event.id);
  }

  try {
    await handle(event);
    await db.from("stripe_events").update({ processed_at: nowIso(), last_error: null }).eq("id", event.id);
    return c.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`stripe webhook ${event.type} ${event.id} failed:`, err);
    if (isResourceMissing(err) || event.type === "invoice.created") {
      await db.from("stripe_events").update({ processed_at: nowIso(), last_error: message }).eq("id", event.id);
      return c.json({ received: true, note: "not retried", error: message });
    }
    await db.from("stripe_events").update({ last_error: message }).eq("id", event.id);
    return c.json({ error: "Handler failed; Stripe will retry" }, 500);
  }
});

async function handle(event: StripeEvent) {
  const obj = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": return await onCheckoutCompleted(obj.id);
    case "customer.subscription.updated":
    case "customer.subscription.deleted": return await onSubscriptionChanged(obj.id);
    case "invoice.created": return await onInvoiceCreated(obj.id);
    case "invoice.paid": return await onInvoicePaid(obj.id);
    case "invoice.payment_failed": return await onInvoicePaymentFailed(obj.id);
    case "invoice.upcoming": return await onInvoiceUpcoming(obj);
    case "charge.refunded": return await onChargeRefunded(obj.id);
    case "charge.dispute.created":
    case "charge.dispute.closed": return await onDispute(obj.id, event.type === "charge.dispute.closed");
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function subscriptionRow(subId: string | null) {
  if (!subId) return null;
  const { data } = await adminClient().from("subscriptions").select("*").eq("id", subId).maybeSingle();
  return data;
}

/** Provisions, and when the account already has that product line live,
 *  cancels and refunds the newcomer (two checkouts racing). */
async function provisionOrUndoDuplicate(sub: Obj, fromCheckout: boolean) {
  try {
    return await provisionSubscription(sub);
  } catch (err) {
    if (!(err instanceof DuplicateSubscriptionError)) throw err;
    if (!fromCheckout) {
      await alertAdmin(`dup-sub:${sub.id}`, "Two live subscriptions on one account", [
        `Account ${err.userId} has another live subscription on the same product line as ${sub.id}.`,
        "Nothing was changed automatically. Check the account in Admin → Users → Billing.",
      ]);
      return null;
    }
    await undoDuplicate(sub.id, err.userId);
    return null;
  }
}

async function undoDuplicate(subId: string, userId: string) {
  const sub = await stripe<Obj>("GET", `/subscriptions/${subId}`, {}, { expand: ["latest_invoice"] });
  if (sub.status !== "canceled") {
    await stripe("DELETE", `/subscriptions/${subId}`, { prorate: false, invoice_now: false });
  }
  const chargeId = sub.latest_invoice ? invoiceChargeId(sub.latest_invoice) : null;
  let refunded = 0;
  if (chargeId) {
    const refund = await stripe<Obj>("POST", "/refunds", {
      charge: chargeId, reason: "duplicate", metadata: { source: "duplicate", userId },
    }, { idempotencyKey: `duplicate-refund:${subId}` });
    refunded = refund.amount ?? 0;
    await adminClient().from("billing_refunds").upsert({
      user_id: userId, stripe_refund_id: refund.id, stripe_charge_id: chargeId, stripe_invoice_id: idOf(sub.latest_invoice),
      stripe_subscription_id: subId, amount_cents: refunded, reason: "Duplicate subscription", source: "duplicate", livemode: isLivemode(),
    }, { onConflict: "stripe_refund_id" });
  }
  await alertAdmin(`dup-undone:${subId}`, "Duplicate subscription cancelled and refunded", [
    `Account ${userId} bought a second subscription on a product line it already had.`,
    `${subId} was cancelled and ${usd(refunded)} refunded.`,
  ]);
}

/** Whose invoice is this? Its own metadata, its subscription, or its customer. */
async function invoiceUser(inv: Obj): Promise<string | null> {
  if (inv.metadata?.userId) return inv.metadata.userId;
  const sub = await subscriptionRow(invoiceSubscriptionId(inv));
  if (sub) return sub.user_id;
  return await userForCustomer(idOf(inv.customer));
}

// ── Checkout ────────────────────────────────────────────────────────────

async function onCheckoutCompleted(sessionId: string) {
  const db = adminClient();
  const session = await stripe<Obj>("GET", `/checkout/sessions/${sessionId}`, {}, { expand: ["payment_intent.payment_method"] });
  const userId = (session.metadata?.userId ?? session.client_reference_id) as string | undefined;
  if (!userId || session.status !== "complete" || session.payment_status === "unpaid") return;
  const purchase = session.metadata?.purchaseType as string | undefined;

  if ((purchase === "plan" || purchase === "dr_addon") && session.subscription) {
    const sub = await retrieveSubscription(idOf(session.subscription)!);
    await provisionOrUndoDuplicate(sub, true);
  }

  if (purchase === "continuation_fee") {
    const pi = idOf(session.payment_intent);
    const { data: existing } = await db.from("legacy_continuation_fees").select("id")
      .or(`stripe_checkout_session_id.eq.${session.id}${pi ? `,stripe_payment_intent_id.eq.${pi}` : ""}`).limit(1);
    if (!existing?.length) {
      const { data: months } = await db.from("admin_settings").select("value").eq("key", "continuation_fee_period_months").maybeSingle();
      const { error } = await db.from("legacy_continuation_fees").insert({
        user_id: userId, paid_by_user_id: userId, paid_by_type: "account_owner",
        amount_usd: (session.amount_total ?? 0) / 100, stripe_payment_intent_id: pi,
        stripe_charge_id: idOf(session.payment_intent?.latest_charge),
        stripe_checkout_session_id: session.id, status: "paid", paid_at: nowIso(),
        activation_period_months: parseInt(months?.value ?? "24", 10) || 24, livemode: isLivemode(),
      });
      if (error && error.code !== "23505") throw new Error(`continuation fee insert failed: ${error.message}`);
    }
  }

  if (purchase === "wg_setup") {
    const pm = session.payment_intent?.payment_method;
    if (!pm || typeof pm !== "object") throw new Error(`checkout ${session.id}: no saved card on the payment`);
    const { data: consent } = await db.from("billing_consents").select("id").eq("checkout_session_id", session.id).maybeSingle();
    const card = pm.card ?? {};
    const { error } = await db.from("wg_payment_methods").upsert({
      user_id: userId, stripe_customer_id: idOf(session.customer), stripe_payment_method: pm.id,
      card_brand: card.brand ?? null, card_last4: card.last4 ?? null,
      card_expiry: card.exp_month ? `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}` : null,
      cardholder_name: pm.billing_details?.name ?? null, livemode: isLivemode(), consent_id: consent?.id ?? null, updated_at: nowIso(),
    }, { onConflict: "user_id" });
    if (error) throw new Error(`wg_payment_methods upsert failed: ${error.message}`);
    await db.from("users").update({ white_glove: true }).eq("id", userId);
    const { data: client } = await db.from("wg_clients").select("id").eq("user_id", userId).limit(1);
    if (!client?.length) await db.from("wg_clients").insert({ user_id: userId, status: "intake", reason: "White Glove setup paid" });
  }

  await db.from("billing_consents").update({ completed_at: nowIso() }).eq("checkout_session_id", session.id).is("completed_at", null);
}

// ── Subscriptions ───────────────────────────────────────────────────────

async function onSubscriptionChanged(subId: string) {
  const sub = await retrieveSubscription(subId);
  const result = await provisionOrUndoDuplicate(sub, false);
  if (!result) return;

  // The plan ended: the Disaster Recovery add-on needs a plan, so it stops
  // renewing (it stays on until the end of what was paid for).
  if (result.productLine === "plan" && ["canceled", "incomplete_expired", "unpaid"].includes(sub.status)) {
    const { data: dr } = await adminClient().from("subscriptions").select("id, cancel_at_period_end")
      .eq("user_id", result.userId).eq("product_line", "dr_addon").in("status", ["active", "trialing", "past_due"]);
    for (const row of dr ?? []) {
      if (!row.cancel_at_period_end) {
        const updated = await stripe<Obj>("POST", `/subscriptions/${row.id}`, { cancel_at_period_end: true },
          { idempotencyKey: `dr-follows-plan:${row.id}:${sub.id}` });
        await provisionSubscription(await retrieveSubscription(updated.id));
      }
    }
  }
}

// ── Invoices ────────────────────────────────────────────────────────────

async function onInvoiceCreated(invoiceId: string) {
  const inv = await stripe<Obj>("GET", `/invoices/${invoiceId}`);
  if (inv.billing_reason !== "subscription_cycle" || inv.status !== "draft") return;
  const subId = invoiceSubscriptionId(inv);
  let row = await subscriptionRow(subId);
  if (!row && subId) {
    await provisionSubscription(await retrieveSubscription(subId));
    row = await subscriptionRow(subId);
  }
  if (!row || row.product_line !== "plan" || row.interval !== "month") return;
  // The renewal bills the period starting now; the one ending is closed at
  // that boundary and its overage goes on this invoice.
  const added = await attachOverageToRenewal(inv, row.user_id, invoiceLinePeriod(inv).start);
  if (added) console.log(`invoice ${inv.id}: added ${added} overage item(s)`);
}

function paymentType(inv: Obj, row: Obj | null): PaymentType {
  const purpose = inv.metadata?.purpose ?? inv.metadata?.purchaseType;
  if (purpose === "usage_overage") return "overage";
  if (purpose === "wg_session") return "wg_session";
  if (purpose === "continuation_fee") return "continuation_fee";
  if (purpose === "wg_setup") return "wg_setup";
  if (row?.product_line === "dr_addon") return "dr_addon";
  if (row?.product_line === "plan") return inv.billing_reason === "subscription_update" ? "upgrade" : "subscription";
  return "other";
}

async function onInvoicePaid(invoiceId: string) {
  const db = adminClient();
  const inv = await stripe<Obj>("GET", `/invoices/${invoiceId}`);
  const userId = await invoiceUser(inv);
  if (!userId) return;
  const subId = invoiceSubscriptionId(inv);
  if (subId) await provisionOrUndoDuplicate(await retrieveSubscription(subId), false); // past_due → active
  const row = await subscriptionRow(subId);
  const type = paymentType(inv, row);

  if ((inv.amount_paid ?? 0) > 0) {
    // Describe the payment by its largest charge: on a prorated plan change the
    // first line is the credit ("Unused time on …"), not what was bought.
    const line = ((inv.lines?.data ?? []) as Obj[]).reduce<Obj | undefined>((best, l) => (!best || (l.amount ?? 0) > (best.amount ?? 0) ? l : best), undefined);
    await recordPayment({
      userId, type, amountCents: inv.amount_paid,
      description: line?.description ?? inv.description ?? type,
      invoiceId: inv.id, paymentIntentId: invoicePaymentIntentId(inv), chargeId: invoiceChargeId(inv),
      subscriptionId: subId, paidAt: unixToIso(inv.status_transitions?.paid_at),
    });
  }

  // Overage on this invoice is paid; lift the overage block once nothing
  // declined is left.
  await db.from("usage_period_closures").update({ paid_at: nowIso(), payment_failed_at: null }).eq("stripe_invoice_id", inv.id);
  const { data: stillFailed } = await db.from("usage_period_closures").select("id")
    .eq("user_id", userId).not("payment_failed_at", "is", null).is("paid_at", null).limit(1);
  if (!stillFailed?.length) {
    await db.from("users").update({ overage_blocked: false, overage_blocked_at: null }).eq("id", userId).eq("overage_blocked", true);
  }

  if (type === "wg_session") {
    await db.from("wg_session_billing").update({
      status: "charged", charged_at: unixToIso(inv.status_transitions?.paid_at) ?? nowIso(),
      stripe_payment_intent: invoicePaymentIntentId(inv), failure_message: null,
    })
      .eq("stripe_invoice_id", inv.id);
  }
  if (type === "subscription" || type === "upgrade") await recordCommission(inv, userId);

  // Events can arrive out of order: if the charge was disputed before this
  // invoice.paid was handled, the dispute found no payment or commission to
  // mark. Catch up now (both steps are idempotent).
  const chargeId = invoiceChargeId(inv);
  if (chargeId && (inv.amount_paid ?? 0) > 0) {
    const charge = await stripe<Obj>("GET", `/charges/${chargeId}`);
    if (charge.disputed) {
      const disputes = await stripe<{ data: Obj[] }>("GET", "/disputes", { charge: chargeId, limit: 1 });
      const dispute = disputes.data[0];
      if (dispute && !["won", "warning_closed"].includes(dispute.status)) {
        await db.from("payments").update({ status: "disputed" }).eq("stripe_charge_id", chargeId).eq("status", "succeeded");
        await reverseForDispute({ invoiceId: inv.id, chargeId, disputeId: dispute.id });
      }
    }
  }
}

async function onInvoicePaymentFailed(invoiceId: string) {
  const db = adminClient();
  const inv = await stripe<Obj>("GET", `/invoices/${invoiceId}`);
  const userId = await invoiceUser(inv);
  if (!userId) return;
  const purpose = inv.metadata?.purpose;
  const subId = invoiceSubscriptionId(inv);

  if (subId) {
    // 3-D Secure at checkout fires a failure seconds before it succeeds;
    // Checkout shows its own errors (pitfall 4.2).
    if (inv.billing_reason === "subscription_create") return;
    // The last retry's failure can land after the subscription was deleted;
    // re-read so it can't revive a cancelled plan (pitfall 4.3).
    const sub = await retrieveSubscription(subId);
    if (sub.status === "canceled" || sub.status === "incomplete_expired") return;
    // A declined upgrade (pending_if_incomplete) leaves the current plan paid
    // and untouched; the app already told the customer on screen.
    if (inv.billing_reason === "subscription_update" && sub.pending_update) return;
    const result = await provisionOrUndoDuplicate(sub, false);
    if (result && (inv.attempt_count ?? 1) <= 1) {
      const { data: plan } = result.row.plan_id
        ? await db.from("subscription_plans").select("name").eq("id", result.row.plan_id).maybeSingle()
        : { data: null };
      const productName = result.productLine === "plan" ? `your ${plan?.name ?? "plan"} plan` : "Disaster Recovery Protection";
      await notifyOnce({
        userId, kind: "payment_failed", dedupeKey: `payment_failed:${inv.id}`,
        email: paymentFailedEmail({ productName, amount: usd(inv.amount_due ?? 0), manageUrl: manageBillingUrl() }),
        inApp: { title: "Payment failed", message: `We couldn't charge your card for ${productName}. Please update it.`, type: "error", actionUrl: "/dashboard?page=storage-usage" },
      });
    }
    return;
  }

  if (purpose === "usage_overage") {
    await db.from("usage_period_closures").update({ payment_failed_at: nowIso() }).eq("stripe_invoice_id", inv.id).is("paid_at", null);
    await db.from("users").update({ overage_blocked: true, overage_blocked_at: nowIso() }).eq("id", userId);
    await notifyOnce({
      userId, kind: "overage_declined", dedupeKey: `overage_declined:${inv.id}`,
      email: overageDeclinedEmail({ amount: usd(inv.amount_due ?? 0), manageUrl: manageBillingUrl() }),
      inApp: { title: "Storage overage payment failed", message: "Uploads are limited to your plan's storage until the overage invoice is paid.", type: "warning", actionUrl: "/dashboard?page=storage-usage" },
    });
    return;
  }

  if (purpose === "wg_session") {
    const pi = invoicePaymentIntentId(inv);
    const failure = pi ? (await stripe<Obj>("GET", `/payment_intents/${pi}`).catch(() => null))?.last_payment_error?.message : null;
    await db.from("wg_session_billing").update({ status: "failed", failure_message: failure ?? "Card declined" }).eq("stripe_invoice_id", inv.id);
    await alertAdmin(`wg_failed:${inv.id}`, "White Glove session charge failed", [
      `Account ${userId}: ${usd(inv.amount_due ?? 0)} for a White Glove session was declined.`,
      failure ? `Reason: ${failure}` : "Stripe will retry; the client can update the card in Manage billing.",
    ]);
  }
}

/** An annual plan (or yearly add-on) renews soon: remind the owner once. */
async function onInvoiceUpcoming(obj: Obj) {
  const subId = invoiceSubscriptionId(obj);
  if (!subId) return;
  const sub = await retrieveSubscription(subId);
  if (!sub.metadata?.userId || sub.cancel_at_period_end || !["active", "trialing"].includes(sub.status)) return;
  const result = await provisionSubscription(sub);
  if (!result || result.row.interval !== "year") return;
  const { data: plan } = result.row.plan_id
    ? await adminClient().from("subscription_plans").select("name").eq("id", result.row.plan_id).maybeSingle()
    : { data: null };
  const productName = result.productLine === "plan" ? `Your ${plan?.name ?? ""} plan`.replace("  ", " ") : "Disaster Recovery Protection";
  const renewsAt = result.row.current_period_end as string;
  const date = new Date(renewsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  await notifyOnce({
    userId: result.userId, kind: "renewal_reminder", dedupeKey: `renewal:${subId}:${renewsAt}`,
    email: renewalReminderEmail({ productName, amount: usd(obj.amount_due ?? 0), date, manageUrl: manageBillingUrl() }),
    inApp: { title: "Upcoming renewal", message: `${productName} renews on ${date} for ${usd(obj.amount_due ?? 0)}.`, type: "info", actionUrl: "/dashboard?page=storage-usage" },
  });
}

// ── Refunds and disputes ────────────────────────────────────────────────

async function onChargeRefunded(chargeId: string) {
  const db = adminClient();
  const charge = await stripe<Obj>("GET", `/charges/${chargeId}`, {}, { expand: ["refunds"] });
  const invoiceId = chargeInvoiceId(charge);
  const pi = idOf(charge.payment_intent);
  const fully = charge.refunded === true || charge.amount_refunded >= charge.amount;

  let { data: payment } = await db.from("payments").select("id, user_id").eq("stripe_charge_id", chargeId).maybeSingle();
  if (!payment && invoiceId) ({ data: payment } = await db.from("payments").select("id, user_id").eq("stripe_invoice_id", invoiceId).maybeSingle());
  if (!payment && pi) ({ data: payment } = await db.from("payments").select("id, user_id").eq("stripe_payment_intent", pi).maybeSingle());
  if (payment) {
    await db.from("payments").update({
      refunded_amount_usd: (charge.amount_refunded ?? 0) / 100, stripe_charge_id: chargeId,
      ...(fully ? { status: "refunded" } : {}),
    }).eq("id", payment.id);
  }
  const userId = payment?.user_id ?? await userForCustomer(idOf(charge.customer));

  for (const refund of charge.refunds?.data ?? []) {
    if (refund.status === "failed" || refund.status === "canceled") continue;
    // Admin refunds were recorded when made; anything else came from the dashboard.
    await db.from("billing_refunds").upsert({
      user_id: userId, stripe_refund_id: refund.id, stripe_charge_id: chargeId, stripe_invoice_id: invoiceId,
      amount_cents: refund.amount, reason: refund.reason ?? refund.metadata?.reason ?? null,
      source: refund.metadata?.source ?? "dashboard", livemode: isLivemode(),
    }, { onConflict: "stripe_refund_id", ignoreDuplicates: true });
    await reverseForRefund({ invoiceId, chargeId, refundId: refund.id, refundCents: refund.amount, chargeCents: charge.amount });
  }

  if (fully) {
    if (pi) await db.from("legacy_continuation_fees").update({ status: "refunded" }).eq("stripe_payment_intent_id", pi);
    if (invoiceId) await db.from("wg_session_billing").update({ status: "refunded" }).eq("stripe_invoice_id", invoiceId);
  }
}

async function onDispute(disputeId: string, closed: boolean) {
  const db = adminClient();
  const dispute = await stripe<Obj>("GET", `/disputes/${disputeId}`, {}, { expand: ["charge"] });
  const charge = dispute.charge as Obj;
  const chargeId = idOf(charge)!;
  const invoiceId = chargeInvoiceId(charge);
  const userId = await userForCustomer(idOf(charge.customer));

  if (!closed) {
    await db.from("payments").update({ status: "disputed", stripe_charge_id: chargeId })
      .or(`stripe_charge_id.eq.${chargeId}${invoiceId ? `,stripe_invoice_id.eq.${invoiceId}` : ""}`);
    await reverseForDispute({ invoiceId, chargeId, disputeId });
    await alertAdmin(`dispute:${disputeId}`, "A payment was disputed", [
      `${usd(dispute.amount ?? 0)} on charge ${chargeId} (account ${userId ?? "unknown"}).`,
      `Reason: ${dispute.reason ?? "not given"}. Respond in the Stripe dashboard before the evidence deadline.`,
    ]);
    return;
  }

  if (dispute.status === "won") {
    await db.from("payments").update({ status: "succeeded" }).eq("stripe_charge_id", chargeId).eq("status", "disputed");
    await restoreForWonDispute({ invoiceId, disputeId });
  }
  await alertAdmin(`dispute-closed:${disputeId}`, `Dispute closed: ${dispute.status}`, [
    `${usd(dispute.amount ?? 0)} on charge ${chargeId} (account ${userId ?? "unknown"}).`,
  ]);
}

export default webhook;
