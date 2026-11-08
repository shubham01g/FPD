-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_052.sql. Same SQL as
-- 053_partner_and_wl_checkout.sql, followed by a check.
-- THEN: Admin -> Subscription Config -> Stripe Billing -> Sync catalog (dry run, then apply)
-- so Stripe gets the $599 partner_setup price.

-- 053 — Partner and White Label setup fees are paid through Stripe.
--
-- Before: the Partner wizard took a card number in the page and then just
-- waited 1.5 s ("Your $599 setup fee has been processed"); White Label
-- onboarding recorded a sale with total_paid = the fee without charging.
-- Now both go through Stripe Checkout (routes/billing.ts one-time checkout,
-- products partner_setup and wl_setup) and the webhook creates the partner /
-- the White Label sale once Stripe confirms the payment.
--
--   billing_products 'partner_setup'   $599 one-time. Run Admin → Stripe
--                                      Billing → Sync catalog after this
--                                      migration so the Stripe price exists.
--   partners.stripe_checkout_session_id / wl_sales.stripe_checkout_session_id
--                                      make the webhook idempotent.
--   wl_sales.user_id                   the buyer's account.
--
-- Partner referral links: a signup carrying ?ref=<partner code> is now
-- recorded in partner_accounts (it only matched affiliate codes before, so
-- partners could never be credited). handle_new_user is otherwise identical
-- to 041. A referral problem never blocks a signup.
--
-- Idempotent.

INSERT INTO public.billing_products (slug, name, description, kind, product_group, interval, amount_cents, sort_order)
VALUES ('partner_setup', 'Partner Program Setup', 'One-time partner program setup fee', 'one_time', 'partner', NULL, 59900, 40)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_checkout ON public.partners(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE public.wl_sales
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wl_sales_checkout ON public.wl_sales(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

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
      ELSE
        SELECT * INTO v_partner FROM public.partners WHERE UPPER(partner_code) = v_code AND status = 'active';
        IF FOUND AND v_partner.user_id IS DISTINCT FROM NEW.id THEN
          INSERT INTO public.partner_accounts (partner_id, user_id, plan, commission)
          VALUES (v_partner.id, NEW.id, 'starter', 0)
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

-- ── Check: every row should say ok = true.
SELECT 'partner_setup product' AS check_name, EXISTS (SELECT 1 FROM public.billing_products WHERE slug = 'partner_setup' AND amount_cents = 59900) AS ok
UNION ALL SELECT 'partners checkout column', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partners' AND column_name = 'stripe_checkout_session_id')
UNION ALL SELECT 'wl_sales columns', (SELECT count(*) FROM information_schema.columns WHERE table_name = 'wl_sales' AND column_name IN ('stripe_checkout_session_id','user_id')) = 2
UNION ALL SELECT 'signup credits partner codes', (SELECT prosrc ILIKE '%partner_accounts%' FROM pg_proc WHERE proname = 'handle_new_user');
