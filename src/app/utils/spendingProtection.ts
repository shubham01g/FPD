/**
 * Spending protection — the monthly overage cap that pauses uploads instead
 * of billing past it. Shared by Usage & Billing (which shows the meter) and
 * the File Cabinet (which enforces it before every upload), so the two can't
 * disagree about whether the cap has been hit.
 *
 * The cap itself is the user's own setting in storage_spend_caps; a null cap
 * means protection is switched off and uploads are never blocked.
 */

export const DEFAULT_SPENDING_CAP = 25; // $ per billing month, until the user sets their own

/* Overage $/GB by plan — the same figures as subscription_plans. Used when
   the live plan list hasn't loaded (or the caller doesn't fetch it). */
export const PLAN_OVERAGE_RATE: Record<string, number> = {
  starter: 0.50, foundation: 0.40, family_archive: 0.40, legacy_pro: 0.40, legacy_vault: 0.40,
};

export interface UploadCheck {
  allowed: boolean;
  overageGB: number;
  overageCost: number;
  remainingBudget: number;
  capHit: boolean;
}

export function checkUploadAllowed(
  usedGB: number,
  limitGB: number,
  overageRate: number,
  capUsd: number | null
): UploadCheck {
  const overageGB = Math.max(0, usedGB - limitGB);
  const overageCost = parseFloat((overageGB * overageRate).toFixed(2));
  if (capUsd === null) {
    return { allowed: true, overageGB, overageCost, remainingBudget: Infinity, capHit: false };
  }
  const remainingBudget = parseFloat(Math.max(0, capUsd - overageCost).toFixed(2));
  // A $0 cap means "never bill overage": it only bites once the plan limit is passed.
  const capHit = overageGB > 0 && overageCost >= capUsd;
  return { allowed: !capHit, overageGB, overageCost, remainingBudget, capHit };
}
