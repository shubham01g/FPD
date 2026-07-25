/**
 * White Label Package API Service
 *
 * In production this hits your backend REST API / Supabase edge function.
 * In demo mode it operates on the in-memory store so UI changes are instant.
 * Swap DEMO_MODE = false and set API_BASE to your real endpoint.
 */

const DEMO_MODE = true;
const API_BASE = "https://api.finalpassdown.com/v1/wl";

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

/* ── Demo seed data ─────────────────────────────────────────────────── */

let _packages: WLPackage[] = [
  {
    id: "agency",
    name: "Agency Partner",
    tier: "AGENCY",
    userLimit: 500,
    userLimitLabel: "Up to 500 users",
    billing: { type: "flat_monthly", flatMonthly: 2999, setupFee: 2500 },
    commission: 20,
    color: "#5B6EE1",
    badge: null,
    features: [
      "Up to 500 user accounts",
      "Full white label (your domain + branding)",
      "Priority support (24h SLA)",
      "Partner analytics dashboard",
      "Custom email templates",
      "Dedicated onboarding manager",
      "API access",
      "Marketing & sales materials",
    ],
    active: true,
    stripeProductId: "prod_agency_demo",
    stripePriceId: "price_agency_demo",
    onboardingLink: "finalpassdown.com/partner/onboard?tier=agency",
    processorOverride: null,
  },
  {
    id: "legacy_vault",
    name: "Enterprise Partner",
    tier: "ENTERPRISE",
    userLimit: 5000,
    userLimitLabel: "501 – 5,000 users",
    billing: { type: "per_user_flat", perUserAmount: 2.99, setupFee: 5000, minMonthly: 7499 },
    commission: 25,
    color: "#5BA7D6",
    badge: "Most Popular",
    features: [
      "501 – 5,000 user accounts",
      "Fully custom branded platform",
      "24/7 dedicated support line",
      "Real-time white-label analytics",
      "Custom feature development",
      "99.9% SLA uptime guarantee",
      "White-glove onboarding",
      "Revenue sharing dashboard",
      "Enterprise API + webhooks",
    ],
    active: true,
    stripeProductId: "prod_enterprise_demo",
    stripePriceId: "price_enterprise_demo",
    onboardingLink: "finalpassdown.com/partner/onboard?tier=enterprise",
    processorOverride: null,
  },
  {
    id: "institutional",
    name: "Institutional Partner",
    tier: "INSTITUTIONAL",
    userLimit: null,
    userLimitLabel: "5,000+ users",
    billing: { type: "per_user_percentage", percentOfRevenue: 15, setupFee: 5000, minMonthly: 15000 },
    commission: 30,
    color: "#48BB78",
    badge: "Best Value",
    features: [
      "5,000+ user accounts (unlimited)",
      "Custom-built branded platform",
      "Named account executive",
      "Custom SLA & infrastructure",
      "HIPAA / SOC 2 compliance package",
      "On-site onboarding & training",
      "Custom API rate limits",
      "Quarterly business reviews",
      "Co-marketing opportunities",
    ],
    active: true,
    stripeProductId: "prod_institutional_demo",
    stripePriceId: null,
    onboardingLink: "finalpassdown.com/partner/onboard?tier=institutional",
    processorOverride: null,
  },
];

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

/** Subscribe to real-time package updates */
export function subscribeToPackages(fn: Listener): () => void {
  _listeners.add(fn);
  fn([..._packages]); // emit current state immediately
  return () => _listeners.delete(fn);
}

export async function getPackages(): Promise<WLPackage[]> {
  if (!DEMO_MODE) {
    const res = await fetch(`${API_BASE}/packages`);
    return res.json();
  }
  return [..._packages];
}

export async function updatePackage(id: string, updates: Partial<WLPackage>): Promise<WLPackage> {
  if (!DEMO_MODE) {
    const res = await fetch(`${API_BASE}/packages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return res.json();
  }
  await new Promise(r => setTimeout(r, 400)); // simulate latency
  _packages = _packages.map(p => p.id === id ? { ...p, ...updates } : p);
  notify();
  return _packages.find(p => p.id === id)!;
}

export async function createPackage(pkg: Omit<WLPackage, "id">): Promise<WLPackage> {
  if (!DEMO_MODE) {
    const res = await fetch(`${API_BASE}/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pkg),
    });
    return res.json();
  }
  await new Promise(r => setTimeout(r, 500));
  const newPkg = { ...pkg, id: `pkg_${Date.now().toString(36)}` };
  _packages = [..._packages, newPkg];
  notify();
  return newPkg;
}

export async function deletePackage(id: string): Promise<void> {
  if (!DEMO_MODE) {
    await fetch(`${API_BASE}/packages/${id}`, { method: "DELETE" });
    return;
  }
  await new Promise(r => setTimeout(r, 300));
  _packages = _packages.filter(p => p.id !== id);
  notify();
}

export async function getSales(): Promise<WLSale[]> {
  return [..._sales];
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
