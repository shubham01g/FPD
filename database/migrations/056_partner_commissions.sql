-- 056: Partner earnings + commission payouts (pre-production audit #3, B8).
--
-- Partners were never paid anything: partners.total_earned and
-- partner_accounts.commission were only ever the seeded zeroes, because only
-- affiliates had a commission ledger (039). This adds the same signed ledger
-- for partners:
--
--   earned     on invoice.paid for a referred account's PLAN invoice
--              (partner_accounts.user_id), at the partner's commission_rate,
--              while the partner is active. No time window (partners earn for
--              the life of the account, unlike the 12-month affiliate window).
--   reversal   refund (refunded fraction) / dispute (everything outstanding).
--   restore    a dispute closed as won.
--
-- source_key makes each effect happen once however often Stripe redelivers.
--
-- It also closes the payout loop for BOTH programs. Nothing ever created a
-- payouts row, so affiliate balances could never be paid either:
--   create_commission_payouts(type, period) turns every unpaid balance into a
--   pending payout and stamps the ledger rows with its id (atomically);
--   release_payout(id) un-stamps them when a payout fails or is cancelled.
-- "Paid" in FPD is bookkeeping: the money itself is sent outside the app.

CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id         UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_account_id UUID REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  referred_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind               TEXT NOT NULL CHECK (kind IN ('earned','reversal','restore')),
  stripe_invoice_id  TEXT,
  stripe_charge_id   TEXT,
  source_key         TEXT NOT NULL UNIQUE,
  base_amount_cents  INTEGER NOT NULL,
  rate               NUMERIC(5,4) NOT NULL,
  amount_cents       INTEGER NOT NULL,
  livemode           BOOLEAN NOT NULL,
  payout_id          UUID REFERENCES public.payouts(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON public.partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_invoice ON public.partner_commissions(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_payout  ON public.partner_commissions(payout_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_payout ON public.affiliate_commissions(payout_id);

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_commissions_owner_read" ON public.partner_commissions;
CREATE POLICY "partner_commissions_owner_read" ON public.partner_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners p WHERE p.id = partner_id AND p.user_id = auth.uid())
);
-- Writes: service role only (the Stripe webhook).

-- Totals are sums of the ledger (current Stripe mode is not filtered here on
-- purpose: test-mode rows only exist while testing and are cleared with it).
CREATE OR REPLACE FUNCTION public.recalc_partner_totals(p_partner UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.partners p SET
    total_earned      = COALESCE((SELECT SUM(amount_cents) FROM public.partner_commissions WHERE partner_id = p.id), 0) / 100.0,
    -- What the partner earned over the last 30 days: the recurring run-rate.
    monthly_recurring = COALESCE((SELECT SUM(amount_cents) FROM public.partner_commissions
                                  WHERE partner_id = p.id AND created_at > NOW() - INTERVAL '30 days'), 0) / 100.0,
    total_accounts    = (SELECT COUNT(*) FROM public.partner_accounts WHERE partner_id = p.id)
  WHERE p.id = p_partner;

  UPDATE public.partner_accounts pa SET
    commission = COALESCE((SELECT SUM(amount_cents) FROM public.partner_commissions
                           WHERE partner_id = p_partner AND referred_user_id = pa.user_id), 0) / 100.0
  WHERE pa.partner_id = p_partner;
END; $$;

-- One pending payout per recipient with an unpaid positive balance.
-- p_type: 'affiliate' | 'partnership'. Returns how many payouts were made.
-- The rows are stamped and summed in one UPDATE ... RETURNING, so a
-- commission the webhook writes meanwhile is either in this payout (and in
-- its amount) or left for the next one, never stamped without being counted.
CREATE OR REPLACE FUNCTION public.create_commission_payouts(p_type TEXT, p_period TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  v_payout UUID;
  v_cents BIGINT;
  v_count INTEGER := 0;
BEGIN
  IF p_type NOT IN ('affiliate', 'partnership') THEN
    RAISE EXCEPTION 'unknown payout type %', p_type;
  END IF;
  -- One run at a time.
  PERFORM pg_advisory_xact_lock(hashtext('create_commission_payouts'));

  IF p_type = 'affiliate' THEN
    FOR r IN
      SELECT a.id AS owner_id, a.user_id
      FROM public.affiliate_commissions c JOIN public.affiliates a ON a.id = c.affiliate_id
      WHERE c.payout_id IS NULL AND a.user_id IS NOT NULL
      GROUP BY a.id, a.user_id HAVING SUM(c.amount_cents) > 0
    LOOP
      INSERT INTO public.payouts (recipient_user_id, payout_type, amount, billing_period, status)
      VALUES (r.user_id, 'affiliate', 0, p_period, 'pending') RETURNING id INTO v_payout;
      WITH stamped AS (
        UPDATE public.affiliate_commissions SET payout_id = v_payout
        WHERE affiliate_id = r.owner_id AND payout_id IS NULL RETURNING amount_cents
      ) SELECT COALESCE(SUM(amount_cents), 0) INTO v_cents FROM stamped;
      IF v_cents > 0 THEN
        UPDATE public.payouts SET amount = v_cents / 100.0 WHERE id = v_payout;
        v_count := v_count + 1;
      ELSE
        UPDATE public.affiliate_commissions SET payout_id = NULL WHERE payout_id = v_payout;
        DELETE FROM public.payouts WHERE id = v_payout;
      END IF;
      PERFORM public.recalc_affiliate_totals(r.owner_id);
    END LOOP;
  ELSE
    FOR r IN
      SELECT p.id AS owner_id, p.user_id
      FROM public.partner_commissions c JOIN public.partners p ON p.id = c.partner_id
      WHERE c.payout_id IS NULL AND p.user_id IS NOT NULL
      GROUP BY p.id, p.user_id HAVING SUM(c.amount_cents) > 0
    LOOP
      INSERT INTO public.payouts (recipient_user_id, payout_type, amount, billing_period, status)
      VALUES (r.user_id, 'partnership', 0, p_period, 'pending') RETURNING id INTO v_payout;
      WITH stamped AS (
        UPDATE public.partner_commissions SET payout_id = v_payout
        WHERE partner_id = r.owner_id AND payout_id IS NULL RETURNING amount_cents
      ) SELECT COALESCE(SUM(amount_cents), 0) INTO v_cents FROM stamped;
      IF v_cents > 0 THEN
        UPDATE public.payouts SET amount = v_cents / 100.0 WHERE id = v_payout;
        v_count := v_count + 1;
      ELSE
        UPDATE public.partner_commissions SET payout_id = NULL WHERE payout_id = v_payout;
        DELETE FROM public.payouts WHERE id = v_payout;
      END IF;
      PERFORM public.recalc_partner_totals(r.owner_id);
    END LOOP;
  END IF;
  RETURN v_count;
END; $$;

-- A failed or cancelled payout gives its ledger rows back to the balance.
CREATE OR REPLACE FUNCTION public.release_payout(p_payout UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT affiliate_id FROM public.affiliate_commissions WHERE payout_id = p_payout LOOP
    UPDATE public.affiliate_commissions SET payout_id = NULL WHERE payout_id = p_payout AND affiliate_id = r.affiliate_id;
    PERFORM public.recalc_affiliate_totals(r.affiliate_id);
  END LOOP;
  FOR r IN SELECT DISTINCT partner_id FROM public.partner_commissions WHERE payout_id = p_payout LOOP
    UPDATE public.partner_commissions SET payout_id = NULL WHERE payout_id = p_payout AND partner_id = r.partner_id;
    PERFORM public.recalc_partner_totals(r.partner_id);
  END LOOP;
END; $$;

REVOKE EXECUTE ON FUNCTION public.recalc_partner_totals(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_commission_payouts(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_payout(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_partner_totals(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_commission_payouts(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_payout(UUID) TO service_role;
