/**
 * White Label Package API Service
 *
 * Packages (read + admin write) are backed by the wl_packages table via the
 * Supabase edge function backend — see supabase/functions/server/routes/public.ts
 * (GET, unauthenticated) and routes/whiteLabel.ts (POST/PATCH/DELETE, admin-only).
 *
 * Sales and payment processor config have no backing table yet (there's no
 * wl_sales table, and crypto_processor_configs isn't wired to an endpoint) —
 * those two stay on the in-memory demo store below until that's built.
 */
import { publicApi } from "./publicApi";
import { adminApi } from "./adminApi";

/* ── Types ─────────────────────────────────────────────────────────── */

export type BillingModel =
  | { type: "flat_monthly";       flatMonthly: number; setupFee: number }
  | { type: "per_user_flat";      perUserAmount: number; setupFee: number; minMonthly: number }
  | { type: "per_user_percentage"; percentOfRevenue: number; setupFee: number; minMonthly: number };

export interface WLPackage {
  id:          string;
  name:        string;          // "Agency Partner"
  tier:        string;          // "AGENCY"
  userLimit:   number | null;   // null = unlimited
  userLimitLabel: string;       // "Up to 500 users"
  billing:     BillingModel;
  commission:  number;          // lifetime recurring % on FPD subs
  color:       string;
  badge:       string | null;
  features:    string[];
  active:      boolean;
  stripeProductId:  string | null;
  stripePriceId:    string | null;
  onboardingLink:   string;
  processorOverride: string | null; // null = use platform default
}

export interface WLSale {
  id:         string;
  org:        string;
  contact:    string;
  email:      string;
  packageId:  string;
  status:     "active" | "pending" | "suspended" | "cancelled";
  users:      number;
  mrr:        number;
  totalPaid:  number;
  startDate:  string;
  subdomain:  string;
  processor:  string;
  lastPayout: string;
}

export interface PaymentProcessor {
  id:      string;
  name:    string;
  enabled: boolean;
  logo:    string;
  isDefault: boolean;
  config:  Record<string, string>;
}

/* ── DB row shape (wl_packages table) + mapping ──────────────────────── */

interface DBPackage {
  id: string; name: string; tier: string; user_limit: number | null; user_limit_label: string;
  billing_type: BillingModel["type"]; flat_monthly: number | null; per_user_amount: number | null;
  percent_of_revenue: number | null; min_monthly: number | null; setup_fee: number;
  commission_pct: number; color: string; badge: string | null; features: string[]; active: boolean;
  stripe_product_id: string | null; stripe_price_id: string | null;
  onboarding_link: string; processor_override: string | null;
}

function billingFromDB(row: DBPackage): BillingModel {
  const setupFee = Number(row.setup_fee);
  if (row.billing_type === "per_user_flat") {
    return { type: "per_user_flat", perUserAmount: Number(row.per_user_amount), setupFee, minMonthly: Number(row.min_monthly) };
  }
  if (row.billing_type === "per_user_percentage") {
    return { type: "per_user_percentage", percentOfRevenue: Number(row.percent_of_revenue), setupFee, minMonthly: Number(row.min_monthly) };
  }
  return { type: "flat_monthly", flatMonthly: Number(row.flat_monthly), setupFee };
}

function billingToDB(b: BillingModel): Record<string, unknown> {
  const base = { billing_type: b.type, setup_fee: b.setupFee, flat_monthly: null, per_user_amount: null, percent_of_revenue: null, min_monthly: null };
  if (b.type === "flat_monthly") return { ...base, flat_monthly: b.flatMonthly };
  if (b.type === "per_user_flat") return { ...base, per_user_amount: b.perUserAmount, min_monthly: b.minMonthly };
  return { ...base, percent_of_revenue: b.percentOfRevenue, min_monthly: b.minMonthly };
}

function packageFromDB(row: DBPackage): WLPackage {
  return {
    id: row.id, name: row.name, tier: row.tier, userLimit: row.user_limit, userLimitLabel: row.user_limit_label,
    billing: billingFromDB(row), commission: row.commission_pct, color: row.color, badge: row.badge,
    features: row.features ?? [], active: row.active,
    stripeProductId: row.stripe_product_id, stripePriceId: row.stripe_price_id,
    onboardingLink: row.onboarding_link, processorOverride: row.processor_override,
  };
}

function packageToDB(p: Partial<WLPackage>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.tier !== undefined) out.tier = p.tier;
  if (p.userLimit !== undefined) out.user_limit = p.userLimit;
  if (p.userLimitLabel !== undefined) out.user_limit_label = p.userLimitLabel;
  if (p.billing !== undefined) Object.assign(out, billingToDB(p.billing));
  if (p.commission !== undefined) out.commission_pct = p.commission;
  if (p.color !== undefined) out.color = p.color;
  if (p.badge !== undefined) out.badge = p.badge;
  if (p.features !== undefined) out.features = p.features;
  if (p.active !== undefined) out.active = p.active;
  if (p.stripeProductId !== undefined) out.stripe_product_id = p.stripeProductId;
  if (p.stripePriceId !== undefined) out.stripe_price_id = p.stripePriceId;
  if (p.onboardingLink !== undefined) out.onboarding_link = p.onboardingLink;
  if (p.processorOverride !== undefined) out.processor_override = p.processorOverride;
  return out;
}

/* Local cache of the last-fetched packages, so subscribeToPackages() keeps its
 * existing "instant cross-component sync" behavior after a write. */
let _packages: WLPackage[] = [];

/* ── Demo seed data (sales + processors only — see file header) ──────── */

let _sales: WLSale[] = [
  { id:"WL-001", org:"Greenfield Law Offices",     contact:"Rebecca Hayes",  email:"r.hayes@greenfieldlaw.com",  packageId:"agency",       status:"active",    users:18,   mrr:2999,  totalPaid:12496,  startDate:"Jun 1, 2026",  subdomain:"greenfield.finalpassdown.com",  processor:"stripe", lastPayout:"Jun 1, 2026" },
  { id:"WL-002", org:"Summit Financial Group",      contact:"Marcus Torres",  email:"m.torres@summitfg.com",      packageId:"legacy_vault",   status:"pending",   users:0,    mrr:0,     totalPaid:5000,   startDate:"Jun 10, 2026", subdomain:"summit.finalpassdown.com",      processor:"stripe", lastPayout:"—" },
  { id:"WL-003", org:"Pacific Coast Senior Care",   contact:"Linda Kim",      email:"l.kim@pcsenior.com",         packageId:"institutional",status:"active",    users:2841, mrr:15000, totalPaid:185000, startDate:"Mar 15, 2026", subdomain:"pcsenior.finalpassdown.com",    processor:"stripe", lastPayout:"Jun 1, 2026" },
  { id:"WL-004", org:"Heritage Trust & Estate",     contact:"David Park",     email:"d.park@heritagetrust.com",   packageId:"agency",       status:"active",    users:142,  mrr:2999,  totalPaid:8497,   startDate:"Apr 2, 2026",  subdomain:"heritagetrust.finalpassdown.com",processor:"paypal", lastPayout:"Jun 1, 2026" },
  { id:"WL-005", org:"Bright Future Financial",     contact:"Amy Chen",       email:"a.chen@bff.com",             packageId:"legacy_vault",   status:"suspended", users:488,  mrr:0,     totalPaid:22493,  startDate:"Jan 10, 2026", subdomain:"bff.finalpassdown.com",         processor:"stripe", lastPayout:"May 1, 2026" },
];

let _processors: PaymentProcessor[] = [
  { id:"stripe",   name:"Stripe",              enabled:true,  logo:"💳", isDefault:true,  config:{ publishableKey:"pk_live_...", webhookSecret:"whsec_..." } },
  { id:"paypal",   name:"PayPal",              enabled:true,  logo:"🅿️", isDefault:false, config:{ clientId:"AV...", webhookId:"..." } },
  { id:"coinbase", name:"Coinbase Commerce",   enabled:true,  logo:"🔵", isDefault:false, config:{ apiKey:"", webhookSecret:"" } },
  { id:"bitpay",   name:"BitPay",             enabled:true,  logo:"🟢", isDefault:false, config:{ apiToken:"", merchantId:"" } },
  { id:"nowpay",   name:"NOWPayments",        enabled:false, logo:"🟡", isDefault:false, config:{ apiKey:"", ipnSecret:"" } },
  { id:"square",   name:"Square",             enabled:false, logo:"■",  isDefault:false, config:{ appId:"", accessToken:"" } },
  { id:"braintree",name:"Braintree",          enabled:false, logo:"🌿", isDefault:false, config:{ merchantId:"", publicKey:"", privateKey:"" } },
  { id:"strike",   name:"Strike (Lightning)", enabled:false, logo:"⚡", isDefault:false, config:{ apiKey:"", webhookUrl:"" } },
  { id:"custom",   name:"Custom Processor",   enabled:false, logo:"🔧", isDefault:false, config:{ apiEndpoint:"", apiKey:"", webhookUrl:"" } },
];

/* ── Listeners (publish-subscribe for cross-component sync) ────────── */
type Listener = (packages: WLPackage[]) => void;
const _listeners: Set<Listener> = new Set();

function notify() {
  _listeners.forEach(fn => fn([..._packages]));
}

/* ── API methods ────────────────────────────────────────────────────── */

/** Subscribe to package updates — fetches once on subscribe, then re-emits after every write below. */
export function subscribeToPackages(fn: Listener): () => void {
  _listeners.add(fn);
  fn([..._packages]); // emit whatever's cached immediately, then refresh
  getPackages().then(notify).catch(() => {});
  return () => _listeners.delete(fn);
}

export async function getPackages(): Promise<WLPackage[]> {
  const res = await publicApi.get<{ packages: DBPackage[] }>("/wl-packages");
  _packages = res.packages.map(packageFromDB);
  return [..._packages];
}

export async function updatePackage(id: string, updates: Partial<WLPackage>): Promise<WLPackage> {
  const res = await adminApi.patch<{ package: DBPackage }>(`/white-label/packages/${id}`, packageToDB(updates));
  const updated = packageFromDB(res.package);
  _packages = _packages.map(p => p.id === id ? updated : p);
  notify();
  return updated;
}

export async function createPackage(pkg: Omit<WLPackage, "id"> & { id?: string }): Promise<WLPackage> {
  const id = pkg.id ?? `pkg_${Date.now().toString(36)}`;
  const res = await adminApi.post<{ package: DBPackage }>("/white-label/packages", { id, ...packageToDB(pkg) });
  const created = packageFromDB(res.package);
  _packages = [..._packages, created];
  notify();
  return created;
}

export async function deletePackage(id: string): Promise<void> {
  await adminApi.del(`/white-label/packages/${id}`);
  _packages = _packages.filter(p => p.id !== id);
  notify();
}

export async function getSales(): Promise<WLSale[]> {
  return [..._sales];
}

/** Records a new WL application submitted through the public onboarding wizard. Starts "pending" until an admin provisions the instance. */
export async function createSale(input: {
  org: string; contact: string; email: string; packageId: string; subdomain: string; processor: string;
}): Promise<WLSale> {
  const pkg = _packages.find(p => p.id === input.packageId);
  const setupFee = pkg?.billing.setupFee ?? 0;
  // No wl_sales table exists yet — this stays in-memory only (see file header).
  await new Promise(r => setTimeout(r, 400));
  const sale: WLSale = {
    id: `WL-${(_sales.length + 1).toString().padStart(3, "0")}`,
    org: input.org,
    contact: input.contact,
    email: input.email,
    packageId: input.packageId,
    status: "pending",
    users: 0,
    mrr: 0,
    totalPaid: setupFee,
    startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    subdomain: input.subdomain,
    processor: input.processor,
    lastPayout: "—",
  };
  _sales = [..._sales, sale];
  return sale;
}

export async function getProcessors(): Promise<PaymentProcessor[]> {
  return [..._processors];
}

export async function updateProcessor(id: string, updates: Partial<PaymentProcessor>): Promise<void> {
  _processors = _processors.map(p => p.id === id ? { ...p, ...updates } : p);
  if (updates.isDefault) {
    _processors = _processors.map(p => p.id !== id ? { ...p, isDefault: false } : p);
  }
}

/** Calculate monthly charge for a WL account given billing model + active users */
export function calcMonthlyCharge(billing: BillingModel, activeUsers: number, avgUserMrr = 24.99): number {
  switch (billing.type) {
    case "flat_monthly":
      return billing.flatMonthly;
    case "per_user_flat":
      return Math.max(billing.minMonthly, activeUsers * billing.perUserAmount);
    case "per_user_percentage":
      return Math.max(billing.minMonthly, activeUsers * avgUserMrr * billing.percentOfRevenue / 100);
  }
}
