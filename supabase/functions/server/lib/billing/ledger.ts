// The payments table: one row per paid invoice (or payment intent), written
// from invoice.paid. Idempotent on the invoice id, so a redelivered event
// records nothing new. Revenue screens (analytics.ts) read it.
import { adminClient } from "../supabaseAdmin.ts";
import { isLivemode } from "../stripe.ts";

export type PaymentType =
  | "subscription" | "upgrade" | "overage" | "continuation_fee" | "dr_addon" | "wg_setup" | "wg_session" | "other";

export async function recordPayment(row: {
  userId: string;
  type: PaymentType;
  amountCents: number;
  description: string;
  invoiceId?: string | null;
  paymentIntentId?: string | null;
  chargeId?: string | null;
  subscriptionId?: string | null;
  billingPeriod?: string | null;
  paidAt?: string | null;
}): Promise<void> {
  const db = adminClient();
  const existing = row.invoiceId
    ? await db.from("payments").select("id").eq("stripe_invoice_id", row.invoiceId).limit(1)
    : row.paymentIntentId
    ? await db.from("payments").select("id").eq("stripe_payment_intent", row.paymentIntentId).limit(1)
    : { data: [] };
  if (existing.data?.length) return;

  const { error } = await db.from("payments").insert({
    user_id: row.userId,
    type: row.type,
    amount_usd: row.amountCents / 100,
    currency: "usd",
    status: "succeeded",
    description: row.description,
    stripe_invoice_id: row.invoiceId ?? null,
    stripe_payment_intent: row.paymentIntentId ?? null,
    stripe_charge_id: row.chargeId ?? null,
    stripe_subscription_id: row.subscriptionId ?? null,
    billing_period: row.billingPeriod ?? null,
    livemode: isLivemode(),
    paid_at: row.paidAt ?? new Date().toISOString(),
  });
  if (error && error.code !== "23505") throw new Error(`payments insert failed: ${error.message}`);
}
