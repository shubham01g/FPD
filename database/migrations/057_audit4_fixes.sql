-- 057 — Audit #4 fixes (2026-11-12)
--
-- 1. Volume tiers that actually advance.
--    recalculate_affiliate_tier() (001) was never called by anything, and
--    partners had no tier logic at all, while the landing page, the affiliate
--    dashboard and the partner page all promise automatic upgrades.
--    Rules (match what the screens show):
--      affiliates: active referrals  <25 → tier 1 (20%), 25–74 → 2 (25%), 75+ → 3 (30%)
--      partners:   referred accounts ≤50 → tier 1 (20%), 51–100 → 2 (25%), 101+ → 3 (30%)
--    UPGRADE-ONLY: volume can raise a tier, never lower it, so a tier or rate
--    an admin set by hand (PATCH /admin/affiliates|partnerships/:id) stands.
--    The affiliate commission is now paid at the affiliate's current rate
--    (server lib/billing/commissions.ts), so an upgrade reaches the money.

CREATE OR REPLACE FUNCTION public.apply_affiliate_volume_tier(p_affiliate UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_active INTEGER;
  v_tier   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active FROM public.affiliate_referrals
   WHERE affiliate_id = p_affiliate AND status = 'active';
  v_tier := CASE WHEN v_active >= 75 THEN 3 WHEN v_active >= 25 THEN 2 ELSE 1 END;

  UPDATE public.affiliates SET active_referrals = v_active WHERE id = p_affiliate;
  UPDATE public.affiliates
     SET tier = v_tier,
         commission_rate = GREATEST(commission_rate, CASE v_tier WHEN 3 THEN 0.30 WHEN 2 THEN 0.25 ELSE 0.20 END)
   WHERE id = p_affiliate AND tier < v_tier;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_partner_volume_tier(p_partner UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_accounts INTEGER;
  v_tier     INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_accounts FROM public.partner_accounts WHERE partner_id = p_partner;
  v_tier := CASE WHEN v_accounts > 100 THEN 3 WHEN v_accounts > 50 THEN 2 ELSE 1 END;

  UPDATE public.partners
     SET tier = v_tier,
         commission_rate = GREATEST(commission_rate, CASE v_tier WHEN 3 THEN 0.30 WHEN 2 THEN 0.25 ELSE 0.20 END)
   WHERE id = p_partner AND tier < v_tier;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_affiliate_referral_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.apply_affiliate_volume_tier(COALESCE(NEW.affiliate_id, OLD.affiliate_id));
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_partner_account_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.apply_partner_volume_tier(COALESCE(NEW.partner_id, OLD.partner_id));
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS affiliate_referral_tier ON public.affiliate_referrals;
CREATE TRIGGER affiliate_referral_tier
  AFTER INSERT OR DELETE OR UPDATE OF status ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.trg_affiliate_referral_tier();

DROP TRIGGER IF EXISTS partner_account_tier ON public.partner_accounts;
CREATE TRIGGER partner_account_tier
  AFTER INSERT OR DELETE ON public.partner_accounts
  FOR EACH ROW EXECUTE FUNCTION public.trg_partner_account_tier();

-- Internal only: nobody calls these over the API.
REVOKE EXECUTE ON FUNCTION public.apply_affiliate_volume_tier(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_partner_volume_tier(UUID)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_affiliate_referral_tier()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_partner_account_tier()        FROM PUBLIC, anon, authenticated;

-- Bring existing rows up to date once.
SELECT public.apply_affiliate_volume_tier(id) FROM public.affiliates;
SELECT public.apply_partner_volume_tier(id)   FROM public.partners;

-- 2. Application details that were typed and thrown away.
--    The White Label and Partner forms ask for business type, phone, website
--    and "why", but wl_sales had nowhere to keep the first three and neither
--    table kept the last. The webhook / public enquiry now store them.
ALTER TABLE public.wl_sales
  ADD COLUMN IF NOT EXISTS org_type          TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS website           TEXT,
  ADD COLUMN IF NOT EXISTS application_notes TEXT;
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS website           TEXT,
  ADD COLUMN IF NOT EXISTS application_notes TEXT;
