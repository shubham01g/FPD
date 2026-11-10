/* The plan list the admin screens show (onboarding, user list, user detail,
   analytics), taken from the live catalog (subscription_plans via
   utils/planCatalog) so it always matches what checkout charges. Only the
   colours are local. */
import { cachedPlans, formatStorage, usePlans, type Plan } from "../../utils/planCatalog";

export interface AdminPlan {
  id: string; name: string;
  /** Monthly price, USD. */
  price: number;
  /** Yearly price, USD. */
  priceAnnual: number;
  storageGb: number;
  /** "50 GB" / "1 TB". */
  storage: string;
  color: string;
}

const PLAN_COLOR: Record<string, string> = {
  starter: "#5A6A88", foundation: "#6E90C9", family_archive: "#5B6EE1", legacy_pro: "#7E6BD8", legacy_vault: "#6FAE8B",
};
const OTHER_COLOR = "#8A9AB8";

export function toAdminPlan(p: Plan): AdminPlan {
  return {
    id: p.id, name: p.name, price: p.priceMonthly, priceAnnual: p.priceAnnual,
    storageGb: p.storageGb, storage: formatStorage(p.storageGb), color: PLAN_COLOR[p.id] ?? OTHER_COLOR,
  };
}

export function useAdminPlans(): AdminPlan[] {
  return usePlans().map(toAdminPlan);
}

/** The catalog as last loaded, for code outside a component. */
export function adminPlansNow(): AdminPlan[] {
  return cachedPlans().map(toAdminPlan);
}

/** The plan with this id, or a neutral placeholder for an id the catalog
 *  doesn't list (a retired plan), so a screen never shows another plan's price. */
export function findAdminPlan(plans: AdminPlan[], id: string, label?: string): AdminPlan {
  return plans.find(p => p.id === id)
    ?? { id, name: label || id, price: 0, priceAnnual: 0, storageGb: 0, storage: "—", color: OTHER_COLOR };
}
