// Referral commissions from Stripe payments (GO_LIVE_CHECKLIST.md
// "Referral money"). Two signed ledgers with the same rules:
//
//   affiliate_commissions (039)  an affiliate_referrals row, 12-month window.
//   partner_commissions   (056)  a partner_accounts row, for the life of the
//                                account, at the partner's commission_rate.
//
//   earned     on invoice.paid for a referred account's PLAN invoice.
//              Base = amount paid minus tax minus overage lines.
//   reversal   a refund reverses the refunded fraction; a dispute reverses
//              everything not already reversed.
//   restore    a dispute closed as won puts its reversal back.
//
// source_key makes each effect happen once however often Stripe redelivers.
// The owner's totals (affiliates.total_earned / pending_payout,
// partners.total_earned, partner_accounts.commission) are recomputed from the
// ledger by recalc_affiliate_totals / recalc_partner_totals.
import { adminClient } from "../supabaseAdmin.ts";
import { isLivemode } from "../stripe.ts";

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

interface Ledger {
  table: "affiliate_commissions" | "partner_commissions";
  owner: "affiliate_id" | "partner_id";
  /** Columns copied from the earned row onto its reversals. */
  link: string[];
  recalc: (ownerId: string) => Promise<void>;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const { error } = await adminClient().rpc(name, args);
  // Thrown so the webhook answers 500 and Stripe retries; the ledger insert
  // itself is idempotent, and a retry recalculates.
  if (error) throw new Error(`${name} failed: ${error.message}`);
}

const AFFILIATE: Ledger = {
  table: "affiliate_commissions", owner: "affiliate_id", link: ["referral_id"],
  recalc: (id) => rpc("recalc_affiliate_totals", { p_affiliate: id }),
};
const PARTNER: Ledger = {
  table: "partner_commissions", owner: "partner_id", link: ["partner_account_id"],
  recalc: (id) => rpc("recalc_partner_totals", { p_partner: id }),
};
const LEDGERS = [AFFILIATE, PARTNER];

async function insert(l: Ledger, row: Obj): Promise<boolean> {
  const { error } = await adminClient().from(l.table).insert({ ...row, livemode: isLivemode() });
  if (error && error.code !== "23505") throw new Error(`${l.table} insert failed: ${error.message}`);
  // Recalculated on a duplicate too: a retry after a failed recalc fixes it.
  await l.recalc(row[l.owner]);
  return !error;
}

/** The commissionable part of an invoice, in cents. */
function commissionBase(invoice: Obj): number {
  const overage = (invoice.lines?.data ?? [])
    .filter((l: Obj) => l?.metadata?.purpose === "usage_overage")
    .reduce((s: number, l: Obj) => s + (l.amount ?? 0), 0);
  return (invoice.amount_paid ?? 0) - (invoice.tax ?? 0) - overage;
}

/** invoice.paid on a plan invoice: credit the affiliate and/or the partner
 *  who referred this account. */
export async function recordCommission(invoice: Obj, userId: string): Promise<void> {
  const base = commissionBase(invoice);
  if (base <= 0) return;
  const db = adminClient();

  const { data: referral, error: refErr } = await db.from("affiliate_referrals")
    .select("id, affiliate_id, commission_rate, status, expires_at, affiliates!inner(status, commission_rate)")
    .eq("referred_user_id", userId).eq("status", "active").maybeSingle();
  if (refErr) throw new Error(`affiliate_referrals lookup failed: ${refErr.message}`);
  // deno-lint-ignore no-explicit-any
  if (referral && (referral as any).affiliates?.status === "active") {
    const paidAt = (invoice.status_transitions?.paid_at ?? Math.floor(Date.now() / 1000)) * 1000;
    if (new Date(referral.expires_at).getTime() >= paidAt) {
      // The affiliate's CURRENT rate, so a tier upgrade (migration 057) pays
      // out on every referral from then on. The rate stored on the referral
      // row is only what applied when they signed up.
      // deno-lint-ignore no-explicit-any
      const rate = Number((referral as any).affiliates?.commission_rate ?? referral.commission_rate);
      await insert(AFFILIATE, {
        affiliate_id: referral.affiliate_id, referral_id: referral.id, referred_user_id: userId, kind: "earned",
        stripe_invoice_id: invoice.id, source_key: `inv:${invoice.id}`,
        base_amount_cents: base, rate, amount_cents: Math.round(base * rate),
      });
    }
  }

  const { data: account, error: accErr } = await db.from("partner_accounts")
    .select("id, partner_id, partners!inner(status, commission_rate)")
    .eq("user_id", userId).order("referred_at", { ascending: true }).limit(1).maybeSingle();
  if (accErr) throw new Error(`partner_accounts lookup failed: ${accErr.message}`);
  // deno-lint-ignore no-explicit-any
  const partner = (account as any)?.partners as { status?: string; commission_rate?: number } | undefined;
  if (account && partner?.status === "active") {
    const rate = Number(partner.commission_rate ?? 0);
    if (rate > 0) {
      await insert(PARTNER, {
        partner_id: account.partner_id, partner_account_id: account.id, referred_user_id: userId, kind: "earned",
        stripe_invoice_id: invoice.id, source_key: `inv:${invoice.id}`,
        base_amount_cents: base, rate, amount_cents: Math.round(base * rate),
      });
    }
  }
}

/** What is still un-reversed for an invoice's commission in one ledger. */
async function outstanding(l: Ledger, invoiceId: string) {
  const { data, error } = await adminClient().from(l.table).select("*").eq("stripe_invoice_id", invoiceId);
  if (error) throw new Error(`${l.table} lookup failed: ${error.message}`);
  const rows = data ?? [];
  const earned = rows.find((r) => r.kind === "earned");
  const net = rows.reduce((s, r) => s + r.amount_cents, 0);
  return { earned, net };
}

function carry(l: Ledger, from: Obj): Obj {
  const out: Obj = { [l.owner]: from[l.owner], referred_user_id: from.referred_user_id };
  for (const k of l.link) out[k] = from[k];
  return out;
}

/** A refund of refundCents out of a chargeCents charge. */
export async function reverseForRefund(o: { invoiceId: string | null; chargeId: string; refundId: string; refundCents: number; chargeCents: number }) {
  if (!o.invoiceId || o.chargeCents <= 0) return;
  for (const l of LEDGERS) {
    const { earned, net } = await outstanding(l, o.invoiceId);
    if (!earned || net <= 0) continue;
    const amount = Math.min(net, Math.round(earned.amount_cents * (o.refundCents / o.chargeCents)));
    if (amount <= 0) continue;
    await insert(l, {
      ...carry(l, earned), kind: "reversal",
      stripe_invoice_id: o.invoiceId, stripe_charge_id: o.chargeId, source_key: `refund:${o.refundId}`,
      base_amount_cents: earned.base_amount_cents, rate: earned.rate, amount_cents: -amount,
    });
  }
}

export async function reverseForDispute(o: { invoiceId: string | null; chargeId: string; disputeId: string }) {
  if (!o.invoiceId) return;
  for (const l of LEDGERS) {
    const { earned, net } = await outstanding(l, o.invoiceId);
    if (!earned || net <= 0) continue;
    await insert(l, {
      ...carry(l, earned), kind: "reversal",
      stripe_invoice_id: o.invoiceId, stripe_charge_id: o.chargeId, source_key: `dispute:${o.disputeId}`,
      base_amount_cents: earned.base_amount_cents, rate: earned.rate, amount_cents: -net,
    });
  }
}

export async function restoreForWonDispute(o: { invoiceId: string | null; disputeId: string }) {
  if (!o.invoiceId) return;
  for (const l of LEDGERS) {
    const { data: reversal, error } = await adminClient().from(l.table).select("*")
      .eq("source_key", `dispute:${o.disputeId}`).maybeSingle();
    if (error) throw new Error(`${l.table} lookup failed: ${error.message}`);
    if (!reversal) continue;
    await insert(l, {
      ...carry(l, reversal), kind: "restore",
      stripe_invoice_id: o.invoiceId, stripe_charge_id: reversal.stripe_charge_id, source_key: `dispute_won:${o.disputeId}`,
      base_amount_cents: reversal.base_amount_cents, rate: reversal.rate, amount_cents: -reversal.amount_cents,
    });
  }
}
