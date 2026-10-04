/* Card checkout for the signed-in account — the browser half of
   supabase/functions/server/routes/billing.ts. Stripe hosts the card form, so
   every call here just returns a URL to send the browser to. Checkout is on
   only when Stripe is the connected, active processor under Developer →
   Payment Processors; `status()` is how screens find that out. */
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/account/billing` : null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE) throw new Error("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok || !isJson) {
    throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed with status ${res.status}`);
  }
  return body as T;
}

export interface BillingStatus { checkoutEnabled: boolean; testMode: boolean; }

export const billing = {
  /** Never throws: an unreachable backend just means "checkout is off". */
  async status(): Promise<BillingStatus> {
    try { return await request<BillingStatus>("/status"); }
    catch { return { checkoutEnabled: false, testMode: false }; }
  },
  planCheckout: (planId: string, interval: "month" | "year" = "month") =>
    request<{ url: string }>("/checkout/plan", { method: "POST", body: JSON.stringify({ planId, interval }) }),
  continuationFeeCheckout: () =>
    request<{ url: string }>("/checkout/continuation-fee", { method: "POST" }),
  portal: () => request<{ url: string }>("/portal", { method: "POST" }),
};
