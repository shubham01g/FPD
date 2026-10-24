// Affiliate commissions from Stripe payments (GO_LIVE_CHECKLIST.md
// "Referral money"). A signed ledger in affiliate_commissions:
//
//   earned     on invoice.paid for a referred account's PLAN invoice, while
//              the referral is active and inside its window (12 months).
//              Base = amount paid minus tax minus overage lines.
//   reversal   a refund reverses the refunded fraction; a dispute reverses
//              everything not already reversed.
//   restore    a dispute closed as won puts its reversal back.
//
// source_key makes each effect happen once however often Stripe redelivers.
// affiliates.total_earned / pending_payout are recomputed from the ledger.
import { adminClient } from "../supabaseAdmin.ts";
import { isLivemode } from "../stripe.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

async function recalc(affiliateId: string) {
  const { error } = await adminClient().rpc("recalc_affiliate_totals", { p_affiliate: affiliateId });
  if (error) console.error("recalc_affiliate_totals failed:", error.message);
}

async function insert(row: Obj): Promise<boolean> {
  const { error } = await adminClient().from("affiliate_commissions").insert({ ...row, livemode: isLivemode() });
  if (error) {
    if (error.code === "23505") return false;
    throw new Error(`affiliate_commissions insert failed: ${error.message}`);
  }
  await recalc(row.affiliate_id);
  return true;
}

export async function recordCommission(invoice: Obj, userId: string): Promise<void> {
  const db = adminClient();
  const { data: referral } = await db.from("affiliate_referrals")
    .select("id, affiliate_id, commission_rate, status, expires_at, affiliates!inner(status)")
    .eq("referred_user_id", userId).eq("status", "active").maybeSingle();
  if (!referral) return;
  // deno-lint-ignore no-explicit-any
  if ((referral as any).affiliates?.status !== "active") return;
  const paidAt = (invoice.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000)) * 1000;
  if (new Date(referral.expires_at).getTime() < paidAt) return;

  const overage = (invoice.lines?.data ?? [])
    .filter((l: Obj) => l?.metadata?.purpose === "usage_overage")
    .reduce((s: number, l: Obj) => s + (l.amount ?? 0), 0);
  const base = (invoice.amount_paid ?? 0) - (invoice.tax ?? 0) - overage;
  if (base <= 0) return;
  const rate = Number(referral.commission_rate);

  await insert({
    affiliate_id: referral.affiliate_id, referral_id: referral.id, referred_user_id: userId, kind: "earned",
    stripe_invoice_id: invoice.id, source_key: `inv:${invoice.id}`,
    base_amount_cents: base, rate, amount_cents: Math.round(base * rate),
  });
}

/** What is still un-reversed for an invoice's commission. */
async function outstanding(invoiceId: string) {
  const { data } = await adminClient().from("affiliate_commissions").select("*").eq("stripe_invoice_id", invoiceId);
  const rows = data ?? [];
  const earned = rows.find((r) => r.kind === "earned");
  const net = rows.reduce((s, r) => s + r.amount_cents, 0);
  return { earned, net };
}

/** A refund of refundCents out of a chargeCents charge. */
export async function reverseForRefund(o: { invoiceId: string | null; chargeId: string; refundId: string; refundCents: number; chargeCents: number }) {
  if (!o.invoiceId || o.chargeCents <= 0) return;
  const { earned, net } = await outstanding(o.invoiceId);
  if (!earned || net <= 0) return;
  const amount = Math.min(net, Math.round(earned.amount_cents * (o.refundCents / o.chargeCents)));
  if (amount <= 0) return;
  await insert({
    affiliate_id: earned.affiliate_id, referral_id: earned.referral_id, referred_user_id: earned.referred_user_id, kind: "reversal",
    stripe_invoice_id: o.invoiceId, stripe_charge_id: o.chargeId, source_key: `refund:${o.refundId}`,
    base_amount_cents: earned.base_amount_cents, rate: earned.rate, amount_cents: -amount,
  });
}

export async function reverseForDispute(o: { invoiceId: string | null; chargeId: string; disputeId: string }) {
  if (!o.invoiceId) return;
  const { earned, net } = await outstanding(o.invoiceId);
  if (!earned || net <= 0) return;
  await insert({
    affiliate_id: earned.affiliate_id, referral_id: earned.referral_id, referred_user_id: earned.referred_user_id, kind: "reversal",
    stripe_invoice_id: o.invoiceId, stripe_charge_id: o.chargeId, source_key: `dispute:${o.disputeId}`,
    base_amount_cents: earned.base_amount_cents, rate: earned.rate, amount_cents: -net,
  });
}

export async function restoreForWonDispute(o: { invoiceId: string | null; disputeId: string }) {
  if (!o.invoiceId) return;
  const { data: reversal } = await adminClient().from("affiliate_commissions").select("*")
    .eq("source_key", `dispute:${o.disputeId}`).maybeSingle();
  if (!reversal) return;
  await insert({
    affiliate_id: reversal.affiliate_id, referral_id: reversal.referral_id, referred_user_id: reversal.referred_user_id, kind: "restore",
    stripe_invoice_id: o.invoiceId, stripe_charge_id: reversal.stripe_charge_id, source_key: `dispute_won:${o.disputeId}`,
    base_amount_cents: reversal.base_amount_cents, rate: reversal.rate, amount_cents: -reversal.amount_cents,
  });
}
