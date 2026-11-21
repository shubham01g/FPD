-- Paste into Supabase SQL Editor. Applies migration 059 (remove the Starter plan) in one transaction, then checks it.
-- Apply this BEFORE deploying the server function and the frontend from this branch.
BEGIN;
-- 059 — Remove the Starter plan (2026-11-21).
--
-- Nothing is offered at $0. Foundation ($9.99/mo) is the entry plan, and an
-- account can't use its vault until it has bought a plan through Stripe (or
-- an admin has comped one).
--
-- Every account still needs a users.plan value, so an account that hasn't
-- bought anything sits on 'none': a hidden catalog row with 0 GB and no
-- contacts that is never shown or sold. The app shows "Choose your plan"
-- for it, and the database refuses its uploads even with storage
-- enforcement switched off. Buying a plan moves the account onto that plan
-- through apply_user_entitlements, as before.
--
-- Invited Legacy/Guardian contacts and Partner/White Label buyers also sit
-- on 'none'. That's fine: "Shared with me" (/access) and the partner pages
-- don't depend on the account's own plan.
--
-- Data changes (production, owner-approved 2026-11-21):
--   * the trial accounts on Starter move to 'none' (they see Choose your plan);
--   * accounts on a paid plan with no waiver and no live subscription (the
--     three "real customers" marked for the Reactivate wall in
--     GO_LIVE_CHECKLIST.md, Phase D step 9) become 'cancelled', so they see
--     Reactivate instead of using a plan nobody pays for.
--
-- The Starter catalog row is kept (inactive) because old usage periods and
-- referral rows point at it. users.starter_started_at is left in place as
-- history; nothing reads it any more.
--
-- Every statement is idempotent, so this is safe to run more than once.

-- ── Catalog ─────────────────────────────────────────────────────────────
INSERT INTO public.subscription_plans
  (id, name, price_monthly, price_annual, storage_gb, max_contacts, overage_rate, is_active, billable)
VALUES ('none', 'No plan', 0, 0, 0, 0, 0, FALSE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  name = 'No plan', price_monthly = 0, price_annual = 0, storage_gb = 0, max_contacts = 0,
  overage_rate = 0, is_active = FALSE, billable = FALSE, updated_at = NOW();

UPDATE public.subscription_plans SET is_active = FALSE, updated_at = NOW() WHERE id = 'starter';

DELETE FROM public.admin_settings WHERE key = 'starter_trial_days';

-- ── The 14-day Starter window (026) goes ────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_starter_window ON public.users;
DROP FUNCTION IF EXISTS public.enforce_starter_plan_window();

-- ── Accounts ────────────────────────────────────────────────────────────
-- The old check allows 'starter' but not 'none': drop it, move the
-- accounts, then add the new one.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_check;

UPDATE public.users SET plan = 'none' WHERE plan = 'starter';

UPDATE public.users u SET plan_status = 'cancelled'
 WHERE u.plan <> 'none'
   AND u.plan_status IN ('active', 'past_due')
   AND NOT COALESCE(u.subscription_waived, FALSE)
   AND NOT EXISTS (
     SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = u.id AND s.product_line = 'plan' AND s.status IN ('active', 'trialing', 'past_due'));

ALTER TABLE public.users ADD CONSTRAINT users_plan_check
  CHECK (plan IN ('none', 'foundation', 'family_archive', 'legacy_pro', 'legacy_vault'));
ALTER TABLE public.users ALTER COLUMN plan SET DEFAULT 'none';

-- ── users: protected columns (038), new accounts start on 'none' ────────
CREATE OR REPLACE FUNCTION public.guard_user_protected_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan                   := 'none';
    NEW.plan_status            := 'active';
    NEW.is_admin               := FALSE;
    NEW.stripe_customer_id     := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.subscription_waived    := FALSE;
    NEW.waive_reason           := NULL;
    NEW.white_glove            := FALSE;
    NEW.onboarded_by           := NULL;
    NEW.admin_notes            := NULL;
    NEW.deceased_at            := NULL;
    NEW.date_of_death          := NULL;
    NEW.email_verified         := FALSE;
    RETURN NEW;
  END IF;

  -- A plan or status change from the browser is a bypass attempt (or the
  -- old no-payment plan switch), so say so instead of silently ignoring it.
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.plan_status IS DISTINCT FROM OLD.plan_status
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Plan, plan status and admin access can only be changed through billing or by an admin'
      USING ERRCODE = '42501';
  END IF;

  -- The rest are kept as they were; a full-row profile save carries them
  -- through unchanged, so quietly restoring them breaks nothing.
  NEW.stripe_customer_id     := OLD.stripe_customer_id;
  NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  NEW.subscription_waived    := OLD.subscription_waived;
  NEW.waive_reason           := OLD.waive_reason;
  NEW.white_glove            := OLD.white_glove;
  NEW.onboarded_by           := OLD.onboarded_by;
  NEW.admin_notes            := OLD.admin_notes;
  NEW.deceased_at            := OLD.deceased_at;
  NEW.date_of_death          := OLD.date_of_death;
  NEW.email_verified         := OLD.email_verified;
  RETURN NEW;
END; $$;

-- ── Signup trigger (053's body, new accounts on 'none') ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code    TEXT := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  v_aff     public.affiliates%ROWTYPE;
  v_partner public.partners%ROWTYPE;
BEGIN
  IF NEW.raw_user_meta_data->>'account_type' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, full_name, plan, gender, birthdate, country, device_type, referral_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'none',
    NEW.raw_user_meta_data->>'gender',
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'device_type',
    NEW.raw_user_meta_data->>'referral_source'
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_code <> '' THEN
    BEGIN
      SELECT * INTO v_aff FROM public.affiliates WHERE referral_code = v_code AND status = 'active';
      IF FOUND AND v_aff.user_id <> NEW.id THEN
        INSERT INTO public.affiliate_referrals (affiliate_id, referred_user_id, plan, commission_rate, monthly_commission)
        VALUES (v_aff.id, NEW.id, 'none', v_aff.commission_rate, 0)
        ON CONFLICT (affiliate_id, referred_user_id) DO NOTHING;
        IF FOUND THEN
          UPDATE public.affiliates SET total_referrals = total_referrals + 1 WHERE id = v_aff.id;
        END IF;
      ELSE
        SELECT * INTO v_partner FROM public.partners WHERE UPPER(partner_code) = v_code AND status = 'active';
        IF FOUND AND v_partner.user_id IS DISTINCT FROM NEW.id THEN
          INSERT INTO public.partner_accounts (partner_id, user_id, plan, commission)
          VALUES (v_partner.id, NEW.id, 'none', 0)
          ON CONFLICT (partner_id, user_id) DO NOTHING;
          IF FOUND THEN
            UPDATE public.partners SET total_accounts = total_accounts + 1 WHERE id = v_partner.id;
          END IF;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'referral % not recorded for %: %', v_code, NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END; $$;

-- ── The upload check (040): no plan, no uploads ─────────────────────────
-- An account with no plan ('none') or whose plan ended ('cancelled') is
-- refused with reason 'no_plan', whether or not storage enforcement is on:
-- the app walls these accounts, and this keeps the API from being a way
-- around the wall.
CREATE OR REPLACE FUNCTION public.storage_check_for(p_user UUID, p_bytes BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pid     UUID := public.ensure_open_usage_period(p_user);
  p         public.usage_periods%ROWTYPE;
  v_bytes   BIGINT := public.storage_bytes_for(p_user);
  v_after   BIGINT := v_bytes + GREATEST(COALESCE(p_bytes, 0), 0);
  v_units   INTEGER;
  v_cost    INTEGER;
  v_cap     INTEGER;
  v_blocked BOOLEAN;
  v_plan    TEXT;
  v_status  TEXT;
  v_reason  TEXT := 'ok';
  v_enforce BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.usage_periods WHERE id = v_pid;
  SELECT COALESCE(overage_blocked, FALSE), plan, plan_status INTO v_blocked, v_plan, v_status FROM public.users WHERE id = p_user;
  v_cap   := public.overage_cap_cents(p_user, p.plan_id);
  v_units := CEIL(GREATEST(GREATEST(p.peak_bytes, v_after) - p.included_bytes, 0)::numeric / p.unit_bytes)::int;
  v_cost  := v_units * p.rate_cents;
  v_enforce := COALESCE((SELECT value = 'true' FROM public.admin_settings WHERE key = 'storage_enforcement_enabled'), FALSE);

  IF v_plan = 'none' OR v_status = 'cancelled' THEN
    v_reason := 'no_plan';
  ELSIF v_after > p.included_bytes THEN
    IF NOT p.overage_allowed THEN v_reason := 'limit_reached';
    ELSIF v_blocked THEN v_reason := 'overage_blocked';
    ELSIF v_cost > v_cap THEN v_reason := 'cap_reached';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_reason = 'ok' OR (NOT v_enforce AND v_reason <> 'no_plan'),
    'reason', v_reason,
    'enforced', v_enforce OR v_reason = 'no_plan',
    'currentBytes', v_bytes,
    'includedBytes', p.included_bytes,
    'unitBytes', p.unit_bytes,
    'rateCents', p.rate_cents,
    'capCents', v_cap,
    'overageAllowed', p.overage_allowed,
    'projectedOverageCents', CASE WHEN p.overage_allowed THEN LEAST(v_cost, v_cap) ELSE 0 END,
    'periodEnd', p.period_end);
END; $$;
REVOKE EXECUTE ON FUNCTION public.storage_check_for(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_check_for(UUID, BIGINT) TO service_role;

-- ── Entitlements (040's body): a paid plan nobody pays for is cancelled ──
-- Before, an account with no live plan subscription was marked 'cancelled'
-- only if it had ever had one. A paid plan held without any subscription
-- (the three accounts above, or one an admin suspends and then lifts) stayed
-- 'active' and so was free. Now any plan other than 'none' with no live
-- subscription (Stripe or comp) is 'cancelled' and sees Reactivate.
CREATE OR REPLACE FUNCTION public.apply_user_entitlements(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan  public.subscriptions%ROWTYPE;
  v_dr    public.subscriptions%ROWTYPE;
  v_user  public.users%ROWTYPE;
  v_ever  BOOLEAN;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v_plan FROM public.subscriptions
   WHERE user_id = p_user AND product_line = 'plan' AND status IN ('active','trialing','past_due')
   ORDER BY (id LIKE 'comp\_%') DESC, updated_at DESC
   LIMIT 1;

  IF FOUND THEN
    UPDATE public.users SET
      plan                   = v_plan.plan_id,
      plan_status            = CASE WHEN v_user.plan_status = 'paused' THEN 'paused'
                                    WHEN v_plan.status = 'past_due' THEN 'past_due'
                                    ELSE 'active' END,
      stripe_subscription_id = CASE WHEN v_plan.id LIKE 'comp\_%' THEN NULL ELSE v_plan.id END,
      subscription_waived    = (v_plan.id LIKE 'comp\_%'),
      waive_reason           = CASE WHEN v_plan.id LIKE 'comp\_%' THEN v_plan.comp_reason ELSE NULL END
    WHERE id = p_user;
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_user AND product_line = 'plan') INTO v_ever;
    IF v_ever OR v_user.plan <> 'none' THEN
      UPDATE public.users SET
        plan_status            = CASE WHEN v_user.plan_status = 'paused' THEN 'paused' ELSE 'cancelled' END,
        stripe_subscription_id = NULL,
        subscription_waived    = FALSE
      WHERE id = p_user;
    END IF;
  END IF;

  SELECT * INTO v_dr FROM public.subscriptions
   WHERE user_id = p_user AND product_line = 'dr_addon' AND status IN ('active','trialing','past_due')
   ORDER BY updated_at DESC LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.disaster_recovery_state (user_id, addon_active, addon_source, addon_subscription_id, addon_current_period_end, updated_at)
    VALUES (p_user, TRUE, 'stripe', v_dr.id, v_dr.current_period_end, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      addon_active = TRUE, addon_source = 'stripe', addon_subscription_id = v_dr.id,
      addon_current_period_end = v_dr.current_period_end, updated_at = NOW();
  ELSE
    UPDATE public.disaster_recovery_state
       SET addon_active = FALSE, addon_subscription_id = NULL, addon_current_period_end = NULL, updated_at = NOW()
     WHERE user_id = p_user AND addon_source = 'stripe';
  END IF;

  PERFORM public.ensure_open_usage_period(p_user);
END; $$;
REVOKE EXECUTE ON FUNCTION public.apply_user_entitlements(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_user_entitlements(UUID) TO service_role;
COMMIT;

-- ── Checks ──────────────────────────────────────────────────────────────
-- Expect: none (inactive, 0 GB) and starter (inactive); public list = the 4 paid plans.
SELECT id, name, is_active, billable, storage_gb FROM public.subscription_plans WHERE id IN ('none','starter') ORDER BY id;
SELECT string_agg(id, ', ' ORDER BY price_monthly) AS sold_plans FROM public.subscription_plans WHERE is_active;
-- Expect: no 'starter' row; the 8 trial accounts under none/active; the 3 unpaid accounts under foundation/cancelled.
SELECT plan, plan_status, subscription_waived, count(*) FROM public.users GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
-- Expect: 0 rows (the 14-day trigger is gone).
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_users_starter_window';
-- Expect: CHECK lists none, foundation, family_archive, legacy_pro, legacy_vault; default 'none'.
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'users_plan_check';
SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'plan';
