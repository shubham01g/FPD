// Charging a White Glove session to the client's saved card.
//
// Moved out of routes/whiteGlove.ts unchanged so the admin "charge session"
// button and the Concierge Portal's "complete session" share one
// implementation: $25 per started 30-minute block, an off-session Stripe
// invoice, idempotent on sessionKey (a retry or double click never charges
// twice). A decline is finished by the invoice.payment_failed webhook.
import { adminClient } from "./supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "./stripe.ts";
import { billingPaused } from "./billingConfig.ts";
import { CatalogError, productPrice } from "./billing/catalog.ts";
import { findCustomer } from "./billing/customers.ts";

export interface ChargeInput {
  wgClientId: string;
  sessionKey: string;
  startedAt: string;
  endedAt: string;
  sessionType?: string;
  notes?: string | null;
  chargedBy?: string | null;
}

export async function chargeWgSession(i: ChargeInput): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!stripeMode()) return { status: 503, body: { error: "Stripe is not configured" } };
  if (billingPaused()) return { status: 503, body: { error: "Billing is being updated. Please try again in a few minutes." } };
  const sessionKey = String(i.sessionKey ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionKey)) return { status: 400, body: { error: "sessionKey must be a UUID" } };
  const started = new Date(i.startedAt);
  const ended = new Date(i.endedAt);
  if (isNaN(started.getTime()) || isNaN(ended.getTime()) || ended <= started) return { status: 400, body: { error: "Enter a valid start and end time" } };
  // The client's saved card is charged for this span without them seeing it
  // first, so a typo (or worse) must not turn into a huge bill.
  if (ended.getTime() - started.getTime() > 8 * 3600_000) return { status: 400, body: { error: "A single session can be at most 8 hours" } };
  if (ended.getTime() > Date.now() + 5 * 60_000) return { status: 400, body: { error: "The session can't end in the future" } };
  const sessionType = ["phone", "video", "in_person"].includes(String(i.sessionType)) ? String(i.sessionType) : "video";

  const db = adminClient();
  const { data: existing } = await db.from("wg_session_billing").select("*").eq("session_key", sessionKey).maybeSingle();
  if (existing) return { status: 200, body: { session: existing, duplicate: true } };

  const { data: client } = await db.from("wg_clients").select("user_id, specialist_id").eq("id", i.wgClientId).maybeSingle();
  if (!client?.user_id) return { status: 404, body: { error: "Client not found" } };
  const { data: card } = await db.from("wg_payment_methods").select("*").eq("user_id", client.user_id).maybeSingle();
  if (!card?.stripe_payment_method || card.livemode !== isLivemode()) {
    return { status: 409, body: { error: "This client has no card on file. They need to complete White Glove setup first." } };
  }

  let block;
  try {
    block = await productPrice("wg_session_block");
  } catch (err) {
    return { status: err instanceof CatalogError ? err.status : 500, body: { error: err instanceof Error ? err.message : "Session price unavailable" } };
  }
  const minutes = Math.max(1, Math.ceil((ended.getTime() - started.getTime()) / 60000));
  const blocks = Math.max(1, Math.ceil(minutes / 30));

  const { data: row, error: insertErr } = await db.from("wg_session_billing").insert({
    session_key: sessionKey, client_user_id: client.user_id, specialist_id: client.specialist_id ?? null,
    session_type: sessionType, started_at: started.toISOString(), ended_at: ended.toISOString(),
    duration_minutes: minutes, blocks_charged: blocks, amount_charged: (blocks * block.amountCents) / 100,
    rate_per_block: block.amountCents / 100, card_last4: card.card_last4, card_brand: card.card_brand,
    status: "pending", specialist_notes: i.notes ?? null, livemode: isLivemode(), charged_by: i.chargedBy ?? null,
  }).select().single();
  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: again } = await db.from("wg_session_billing").select("*").eq("session_key", sessionKey).maybeSingle();
      return { status: 200, body: { session: again, duplicate: true } };
    }
    return { status: 500, body: { error: insertErr.message } };
  }

  try {
    const customer = card.stripe_customer_id ?? await findCustomer(client.user_id);
    const invoice = await stripe<Record<string, any>>("POST", "/invoices", {
      customer,
      collection_method: "charge_automatically",
      auto_advance: true,
      pending_invoice_items_behavior: "exclude",
      default_payment_method: card.stripe_payment_method,
      description: "White Glove session",
      metadata: { purpose: "wg_session", userId: client.user_id, sessionBillingId: row.id },
    }, { idempotencyKey: `wg-invoice:${sessionKey}` });
    await stripe("POST", "/invoiceitems", {
      customer, invoice: invoice.id, price: block.priceId, quantity: blocks,
      description: `White Glove ${sessionType.replace("_", " ")} session, ${minutes} min (${blocks} × 30 min)`,
      metadata: { purpose: "wg_session", sessionBillingId: row.id },
    }, { idempotencyKey: `wg-item:${sessionKey}` });
    await db.from("wg_session_billing").update({ stripe_invoice_id: invoice.id }).eq("id", row.id);
    await stripe("POST", `/invoices/${invoice.id}/finalize`, { auto_advance: true }, { idempotencyKey: `wg-finalize:${sessionKey}` });
    const paid = await stripe<Record<string, any>>("POST", `/invoices/${invoice.id}/pay`, { off_session: true },
      { idempotencyKey: `wg-pay:${sessionKey}` }).catch((err) => ({ status: "payment_failed", message: err instanceof Error ? err.message : String(err) }));
    const { data: fresh } = await db.from("wg_session_billing").select("*").eq("id", row.id).maybeSingle();
    return { status: 200, body: { session: fresh ?? row, invoiceStatus: paid.status, message: (paid as { message?: string }).message ?? null } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("wg_session_billing").update({ status: "failed", failure_message: message }).eq("id", row.id);
    return { status: 502, body: { error: message } };
  }
}
