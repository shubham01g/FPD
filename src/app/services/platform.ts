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
}

export interface PlatformState {
  maintenance: boolean;
  maintenanceMsg: string;
  flags: PlatformFlags;
  /** How long an account may stay on Starter (Admin → Subscription Config). */
  starterTrialDays: number;
  /** False until the first response lands. */
  ready: boolean;
}

/* Everything on: an unreachable backend must never hide features or lock
   the app into maintenance. */
const DEFAULT_FLAGS: PlatformFlags = {
  publicSignup: true, aiAssistant: true, whiteGloveConcierge: true, affiliateProgram: true,
  partnerPortal: true, cryptoPayments: true, receiptOCR: true, disasterProtection: true,
};

/* Which portal pages each flag switches off. */
const FLAG_PAGES: Partial<Record<keyof PlatformFlags, string[]>> = {
  aiAssistant: ["fpd-ai"],
  whiteGloveConcierge: ["white-glove", "waiver-sign"],
  affiliateProgram: ["affiliate"],
  receiptOCR: ["receipts-expenses"],
  disasterProtection: ["disaster-recovery"],
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
    () => publicApi.get<{ maintenance: boolean; maintenanceMsg: string; flags: Partial<PlatformFlags>; starterTrialDays?: number }>("/platform"),
    [],
  );
  return {
    maintenance: data?.maintenance ?? false,
    maintenanceMsg: data?.maintenanceMsg ?? "",
    flags: { ...DEFAULT_FLAGS, ...(data?.flags ?? {}) },
    starterTrialDays: data?.starterTrialDays && data.starterTrialDays > 0 ? data.starterTrialDays : STARTER_PLAN_DAYS,
    ready: !loading,
  };
}
