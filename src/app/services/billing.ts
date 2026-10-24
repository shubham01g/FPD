/* Billing for the signed-in account — the browser half of
   supabase/functions/server/routes/billing.ts. Stripe hosts every card form,
   so checkout calls return a URL to send the browser to; nothing here marks
   anything paid (the signed webhook does). Prices always come from the
   server's catalog, never from this file. */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

const BASE = SERVER_BASE ? `${SERVER_BASE}/account/billing` : null;

export class BillingError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new BillingError(0, "No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok || !isJson) {
    throw new BillingError(res.status, body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed with status ${res.status}`);
  }
  return body as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export type Interval = "month" | "year";
export type ProductLine = "plan" | "dr_addon";
export type ConsentPurpose = "plan" | "dr_addon" | "wg_card_on_file";

export interface BillingStatus { checkoutEnabled: boolean; testMode: boolean; }
export interface Consent { text: string; version: string; amountCents: number; }

export interface SubscriptionRow {
  id: string; product_line: ProductLine; plan_id: string | null; product_slug: string | null; status: string;
  interval: Interval | null; current_period_end: string | null; cancel_at_period_end: boolean; cancel_at: string | null;
  pending_plan_id: string | null; pending_interval: Interval | null; pending_change_at: string | null; comp_reason: string | null;
}

export interface UsagePeriod {
  period_start: string; period_end: string; included_bytes: number; unit_bytes: number; current_bytes: number;
  peak_bytes: number; billable_units: number; billable_cents: number; rate_cents: number; overage_allowed: boolean;
}

export interface BillingSummary {
  plan: string; planName: string; planStatus: "active" | "paused" | "cancelled" | "past_due";
  storageGb: number | null; overageRateCents: number;
  planSubscription: SubscriptionRow | null; drSubscription: SubscriptionRow | null; subscriptions: SubscriptionRow[];
  usage: UsagePeriod | null; capCents: number; capIsDefault: boolean; overageBlocked: boolean;
  wgCard: { brand: string; last4: string } | null;
  continuationFee: { id: string; paid_at: string | null; activated_at: string | null; expires_at: string | null } | null;
  hasCustomer: boolean; checkoutEnabled: boolean; billingPaused: boolean; consentRequired: boolean; livemode: boolean;
}

export interface PlanChangeResult { applied: "now" | "period_end" | "pending_payment"; effectiveAt: string | null; planId: string; interval: Interval; }

const consentBody = (c: Consent | null) => (c ? { text: c.text, version: c.version } : undefined);

export const billing = {
  /** Never throws: an unreachable backend just means "checkout is off". */
  async status(): Promise<BillingStatus> {
    try { return await request<BillingStatus>("/status"); }
    catch { return { checkoutEnabled: false, testMode: false }; }
  },
  summary: () => request<BillingSummary>("/summary"),
  consentText: (purpose: ConsentPurpose, o: { planId?: string; interval?: Interval } = {}) => {
    const q = new URLSearchParams({ purpose, ...(o.planId ? { planId: o.planId } : {}), ...(o.interval ? { interval: o.interval } : {}) });
    return request<Consent>(`/consent-text?${q}`);
  },
  checkoutPlan: (planId: string, interval: Interval, consent: Consent | null, page?: string) =>
    post<{ url: string }>("/checkout/plan", { planId, interval, consent: consentBody(consent), page }),
  checkoutAddon: (interval: Interval, consent: Consent | null, page?: string) =>
    post<{ url: string }>("/checkout/addon", { product: "dr_addon", interval, consent: consentBody(consent), page }),
  checkoutOneTime: (product: "continuation_fee" | "wg_setup", consent: Consent | null, page?: string) =>
    post<{ url: string }>("/checkout/one-time", { product, consent: consentBody(consent), page }),
  continuationFeeCheckout: () => post<{ url: string }>("/checkout/one-time", { product: "continuation_fee" }),
  changePlan: (planId: string, interval: Interval) => post<PlanChangeResult>("/change-plan", { planId, interval }),
  cancelPendingChange: () => post<{ ok: true }>("/change-plan/cancel-pending"),
  cancel: (productLine: ProductLine) => post<{ ok: true }>("/cancel", { productLine }),
  resume: (productLine: ProductLine) => post<{ ok: true }>("/resume", { productLine }),
  portal: () => post<{ url: string }>("/portal"),
  setOverageCap: (capUsd: number | null) =>
    request<{ ok: true }>("/overage-cap", { method: "PUT", body: JSON.stringify({ capUsd }) }),
};

/* Screens showing billing state listen for this, and anything that changes
   it (a purchase returning, a cancel) fires it. */
export const BILLING_CHANGED = "fpd:billing-changed";
export function notifyBillingChanged() {
  window.dispatchEvent(new Event(BILLING_CHANGED));
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
