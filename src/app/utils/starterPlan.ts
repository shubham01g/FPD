/* Starter is a 14-day introductory plan (migration 026). The clock runs from
   users.starter_started_at, which the database stamps and never resets. */
/* The default; the live length is set in Admin → Subscription Config and
   reaches the app as usePlatform().starterTrialDays. */
export const STARTER_PLAN_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left on Starter (0 once it has run out), or null when the
 *  account isn't on Starter or its clock hasn't been stamped yet. */
export function starterDaysLeft(plan: string, starterStartedAt: string | null, days: number = STARTER_PLAN_DAYS): number | null {
  if (plan !== "starter" || !starterStartedAt) return null;
  const endsAt = new Date(starterStartedAt).getTime() + days * DAY_MS;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / DAY_MS));
}
