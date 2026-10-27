/* The plan list every screen shows, from subscription_plans (/public/plans).
   The fallback below only keeps the screens usable if that call fails — it is
   never used to charge anything (checkout prices come from the server). */
import { useEffect, useState } from "react";
import { publicApi } from "../services/publicApi";
import { supabase } from "../services/supabase";

export interface Plan {
  id: string; name: string; priceMonthly: number; priceAnnual: number;
  storageGb: number; maxContacts: number; overageRate: number; billable: boolean;
}

interface DBPlan {
  id: string; name: string; price_monthly: number | string; price_annual: number | string;
  storage_gb: number; max_contacts: number; overage_rate: number | string; billable?: boolean;
}

export const FALLBACK_PLANS: Plan[] = [
  { id: "starter",        name: "Starter",        priceMonthly: 0,      priceAnnual: 0,       storageGb: 1,    maxContacts: 1,  overageRate: 0,    billable: false },
  { id: "foundation",     name: "Foundation",     priceMonthly: 9.99,   priceAnnual: 95.90,   storageGb: 50,   maxContacts: 3,  overageRate: 0.40, billable: true },
  { id: "family_archive", name: "Legacy Archive", priceMonthly: 24.99,  priceAnnual: 239.90,  storageGb: 250,  maxContacts: -1, overageRate: 0.40, billable: true },
  { id: "legacy_pro",     name: "Legacy Pro",     priceMonthly: 49.99,  priceAnnual: 479.90,  storageGb: 500,  maxContacts: -1, overageRate: 0.40, billable: true },
  { id: "legacy_vault",   name: "Legacy Vault",   priceMonthly: 129.99, priceAnnual: 1247.90, storageGb: 1024, maxContacts: -1, overageRate: 0.40, billable: true },
];

export function toPlan(p: DBPlan): Plan {
  return {
    id: p.id, name: p.name, priceMonthly: Number(p.price_monthly), priceAnnual: Number(p.price_annual),
    storageGb: p.storage_gb, maxContacts: p.max_contacts, overageRate: Number(p.overage_rate),
    billable: p.billable ?? p.id !== "starter",
  };
}

let cache: Plan[] | null = null;
let inflight: Promise<Plan[]> | null = null;

export function loadPlans(): Promise<Plan[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= publicApi.get<{ plans: DBPlan[] }>("/plans")
    .then(r => (cache = r.plans?.length ? r.plans.map(toPlan) : FALLBACK_PLANS))
    .catch(() => FALLBACK_PLANS)
    .finally(() => { inflight = null; });
  return inflight;
}

export function usePlans(): Plan[] {
  const [plans, setPlans] = useState<Plan[]>(cache ?? FALLBACK_PLANS);
  useEffect(() => { let alive = true; void loadPlans().then(p => { if (alive) setPlans(p); }); return () => { alive = false; }; }, []);
  return plans;
}

export function formatStorage(gb: number): string {
  return gb >= 1024 ? `${+(gb / 1024).toFixed(1)} TB` : `${gb} GB`;
}

export function formatPrice(usd: number): string {
  return Number.isInteger(usd) ? `$${usd}` : `$${usd.toFixed(2)}`;
}

/** The annual price as a saving against twelve months. */
export function annualSavingPct(plan: Plan): number {
  const full = plan.priceMonthly * 12;
  return full > 0 ? Math.round((1 - plan.priceAnnual / full) * 100) : 0;
}

/* Add-on and one-time prices (billing_products; active rows are public). */
export interface Product { slug: string; name: string; kind: "one_time" | "recurring"; interval: "month" | "year" | null; amountCents: number; }

const FALLBACK_PRODUCTS: Product[] = [
  { slug: "dr_addon_month",   name: "Disaster Recovery Protection", kind: "recurring", interval: "month", amountCents: 499 },
  { slug: "dr_addon_year",    name: "Disaster Recovery Protection", kind: "recurring", interval: "year",  amountCents: 4788 },
  { slug: "continuation_fee", name: "Legacy Continuation Fee",      kind: "one_time",  interval: null,    amountCents: 19900 },
  { slug: "wg_setup",         name: "White Glove Setup",            kind: "one_time",  interval: null,    amountCents: 9900 },
  { slug: "wg_session_block", name: "White Glove Session (30 min)", kind: "one_time",  interval: null,    amountCents: 2500 },
];

export function useProducts(): Record<string, Product> {
  const [rows, setRows] = useState<Product[]>(FALLBACK_PRODUCTS);
  useEffect(() => {
    let alive = true;
    void supabase.from("billing_products").select("slug, name, kind, interval, amount_cents").then(({ data }) => {
      if (alive && data?.length) {
        setRows(data.map(r => ({ slug: r.slug, name: r.name, kind: r.kind, interval: r.interval, amountCents: r.amount_cents })));
      }
    });
    return () => { alive = false; };
  }, []);
  return Object.fromEntries(rows.map(r => [r.slug, r]));
}
