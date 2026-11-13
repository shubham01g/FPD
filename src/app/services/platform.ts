/* What System → Settings controls for the customer-facing app: maintenance
   mode and the feature flags. Read from the public /platform endpoint so it
   works before sign-in (the signup page needs it too). */
import { publicApi } from "./publicApi";
import { useAdminFetch } from "../hooks/useAdminFetch";
import { STARTER_PLAN_DAYS } from "../utils/starterPlan";

export interface PlatformFlags {
  publicSignup: boolean;
  aiAssistant: boolean;
  whiteGloveConcierge: boolean;
  affiliateProgram: boolean;
  partnerPortal: boolean;
  cryptoPayments: boolean;
  receiptOCR: boolean;
  disasterProtection: boolean;
  /** Contacts can submit a photo ID for review (ContactsHub). */
  idVerification: boolean;
  /** The Vital Clone launcher page and its one-click sign-in. */
  vitalClone: boolean;
}

export interface PlatformPrices {
  whiteGloveSetup: number | null; whiteGloveSession: number | null;
  partnerSetup: number | null; drMonthly: number | null; drYearly: number | null;
}
const NO_PRICES: PlatformPrices = { whiteGloveSetup: null, whiteGloveSession: null, partnerSetup: null, drMonthly: null, drYearly: null };

/** "$99" / "$4.99", or "—" while a price isn't known. */
export function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export interface PlatformState {
  maintenance: boolean;
  maintenanceMsg: string;
  flags: PlatformFlags;
  /** How long an account may stay on Starter (Admin → Subscription Config). */
  starterTrialDays: number;
  /** The Legacy Continuation Fee as set on the admin "$199 Legacy Fee" page. */
  continuationFee: { amount: number; months: number };
  /** Add-on prices from the billing catalog (USD); null = not set. */
  prices: PlatformPrices;
  /** Support contact from System → Settings → General ("" when unset). */
  support: { email: string; phone: string };
  /** False until the first response lands. */
  ready: boolean;
}

/* Everything on: an unreachable backend must never hide features or lock
   the app into maintenance. */
const DEFAULT_FLAGS: PlatformFlags = {
  publicSignup: true, aiAssistant: true, whiteGloveConcierge: true, affiliateProgram: true,
  partnerPortal: true, cryptoPayments: true, receiptOCR: true, disasterProtection: true, idVerification: true,
  vitalClone: true,
};

/* Which portal pages each flag switches off. */
const FLAG_PAGES: Partial<Record<keyof PlatformFlags, string[]>> = {
  aiAssistant: ["fpd-ai"],
  whiteGloveConcierge: ["white-glove"],
  affiliateProgram: ["affiliate"],
  // receiptOCR switches off only the automatic reading of scans
  // (ReceiptsExpenses), not the whole Receipts page.
  disasterProtection: ["disaster-recovery"],
  vitalClone: ["vital-clone"],
};

export function hiddenPages(flags: PlatformFlags): Set<string> {
  const hidden = new Set<string>();
  (Object.keys(FLAG_PAGES) as (keyof PlatformFlags)[]).forEach(flag => {
    if (!flags[flag]) FLAG_PAGES[flag]!.forEach(page => hidden.add(page));
  });
  return hidden;
}

export function usePlatform(): PlatformState {
  const { data, loading } = useAdminFetch(
    () => publicApi.get<{ maintenance: boolean; maintenanceMsg: string; flags: Partial<PlatformFlags>; starterTrialDays?: number; continuationFee?: { amount: number; months: number }; prices?: Partial<PlatformPrices>; support?: { email: string; phone: string } }>("/platform"),
    [],
  );
  return {
    maintenance: data?.maintenance ?? false,
    maintenanceMsg: data?.maintenanceMsg ?? "",
    flags: { ...DEFAULT_FLAGS, ...(data?.flags ?? {}) },
    starterTrialDays: data?.starterTrialDays && data.starterTrialDays > 0 ? data.starterTrialDays : STARTER_PLAN_DAYS,
    continuationFee: data?.continuationFee && data.continuationFee.amount > 0 ? data.continuationFee : { amount: 199, months: 24 },
    prices: { ...NO_PRICES, ...(data?.prices ?? {}) },
    support: { email: data?.support?.email ?? "", phone: data?.support?.phone ?? "" },
    ready: !loading,
  };
}
