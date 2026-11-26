-- 060 — Starter is sold again, as a paid plan (2026-11-26).
--
-- Owner's decision: Starter comes back at its original monthly price,
-- bought through Stripe like every other plan. Nothing is free: new signups
-- still start on 'none' and see "Choose your plan" (059 is unchanged).
--
--   Starter: $1.99/month or $19.10/year (20% off, like the other plans),
--            1 GB, 1 Legacy + 1 Guardian contact, $0.50/GB above 1 GB
--            (capped by default at the plan price, $1.99 a month).
--
-- 059 kept the Starter row (inactive, not billable) for old usage periods
-- and referrals; this turns it back on. Its Stripe price ids are left as
-- they are: the prices no longer match, so Admin → Billing → Sync catalog
-- creates new ones, and checkout refuses Starter until it has.
--
-- No accounts change. Every statement is idempotent.

UPDATE public.subscription_plans SET
  name          = 'Starter',
  price_monthly = 1.99,
  price_annual  = 19.10,
  storage_gb    = 1,
  max_contacts  = 1,
  overage_rate  = 0.50,
  is_active     = TRUE,
  billable      = TRUE,
  updated_at    = NOW()
WHERE id = 'starter';

-- A Starter purchase sets users.plan = 'starter' (apply_user_entitlements),
-- which 059's check no longer allowed.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('none', 'starter', 'foundation', 'family_archive', 'legacy_pro', 'legacy_vault'));
