-- Paste into the Supabase SQL Editor. Same SQL as 041_affiliate_attribution.sql,
-- followed by a check. Safe to apply on its own (no dependency on 038-040).

-- 041 — Affiliate attribution at signup (Stripe billing, step 4).
--
-- An affiliate's link (/r/CODE or ?ref=CODE) is remembered by the browser and
-- sent with the signup as user metadata "referral_code". When it matches an
-- active affiliate (and isn't the affiliate's own account), the new account
-- is linked in affiliate_referrals. Commission is then earned on the
-- account's paid plan invoices for the referral's 12-month window
-- (lib/billing/commissions.ts, migration 039).
--
-- handle_new_user is otherwise identical to 026_starter_plan_14_days.sql's
-- version. A referral problem never blocks a signup.
--
-- Every statement is idempotent, so this is safe to run more than once.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')));
  v_aff  public.affiliates%ROWTYPE;
BEGIN
  -- Staff accounts (concierge, and anything else we add later) set
  -- account_type in user_metadata at creation time. They are not customers.
  IF NEW.raw_user_meta_data->>'account_type' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, full_name, plan, gender, birthdate, country, device_type, referral_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'starter',
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
        VALUES (v_aff.id, NEW.id, 'starter', v_aff.commission_rate, 0)
        ON CONFLICT (affiliate_id, referred_user_id) DO NOTHING;
        IF FOUND THEN
          UPDATE public.affiliates SET total_referrals = total_referrals + 1 WHERE id = v_aff.id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'referral % not recorded for %: %', v_code, NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END; $$;

-- Verification: the signup trigger now reads referral_code (1 row).
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user' AND prosrc LIKE '%referral_code%';
