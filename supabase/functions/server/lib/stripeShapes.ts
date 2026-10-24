// Tolerant field accessors for Stripe objects (framework pitfall 4.4).
//
// Objects are re-read with the pinned STRIPE_API_VERSION, so the classic field
// is normally the one present. Newer API versions moved a few of them —
// an invoice's subscription now sits under parent.subscription_details, a
// subscription's billing period moved onto its items, and an invoice's charge
// sits under its payments — so each accessor also reads the newer location.
// Nothing here calls Stripe.

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

/** The id of an expandable field, whether it came back as an id or an object. */
export function idOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && typeof (value as Obj).id === "string") return (value as Obj).id;
  return null;
}

export function unixToIso(seconds: unknown): string | null {
  return typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

export function invoiceSubscriptionId(invoice: Obj): string | null {
  return idOf(invoice.subscription)
    ?? idOf(invoice.parent?.subscription_details?.subscription)
    ?? idOf(invoice.subscription_details?.subscription)
    ?? null;
}

export function invoiceChargeId(invoice: Obj): string | null {
  if (idOf(invoice.charge)) return idOf(invoice.charge);
  for (const p of invoice.payments?.data ?? []) {
    const charge = idOf(p?.payment?.charge);
    if (charge) return charge;
  }
  return null;
}

export function invoicePaymentIntentId(invoice: Obj): string | null {
  if (idOf(invoice.payment_intent)) return idOf(invoice.payment_intent);
  for (const p of invoice.payments?.data ?? []) {
    const pi = idOf(p?.payment?.payment_intent);
    if (pi) return pi;
  }
  return null;
}

export function chargeInvoiceId(charge: Obj): string | null {
  return idOf(charge.invoice) ?? idOf(charge.payment_intent?.invoice) ?? null;
}

/** The subscription's current billing period as ISO strings. */
export function subscriptionPeriod(sub: Obj): { start: string | null; end: string | null } {
  const item = sub.items?.data?.[0] ?? {};
  return {
    start: unixToIso(sub.current_period_start ?? item.current_period_start),
    end: unixToIso(sub.current_period_end ?? item.current_period_end),
  };
}

export function subscriptionPrice(sub: Obj): { priceId: string | null; interval: "month" | "year" | null } {
  const price = sub.items?.data?.[0]?.price ?? null;
  const interval = price?.recurring?.interval;
  return { priceId: idOf(price), interval: interval === "month" || interval === "year" ? interval : null };
}

/** The invoice's billing period. Line periods are what a subscription invoice
 *  bills for; the invoice-level period_* is the previous one for renewals. */
export function invoiceLinePeriod(invoice: Obj): { start: string | null; end: string | null } {
  const line = invoice.lines?.data?.find((l: Obj) => l?.period) ?? null;
  return { start: unixToIso(line?.period?.start), end: unixToIso(line?.period?.end) };
}
