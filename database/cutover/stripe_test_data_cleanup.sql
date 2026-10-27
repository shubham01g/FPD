-- Stripe cutover: clear test-mode billing data (GO_LIVE_CHECKLIST.md, Phase D
-- step 4; framework section 7).
--
-- At cutover every stored Stripe id is a TEST id. Left in place they would be
-- wrong or harmful in live mode: test subscriptions look like paid plans, test
-- usage would be billed to real cards, test commissions would reach payouts,
-- and test price ids would be sent to live checkout.
--
-- One transaction:
--   1. refuses to run if any LIVE billing data already exists;
--   2. copies every test record into the billing_test_archive schema;
--   3. deletes / resets the test records (comped plans and add-ons an admin
--      granted by hand are kept);
--   4. accounts whose plan came from a test subscription become 'cancelled'
--      (they see Reactivate and buy again with a real card);
--   5. reports what was archived and what is left.
--
-- DRY RUN: change the last line to ROLLBACK, run it, read the NOTICE counts.
-- REAL RUN: during the cutover window, with BILLING_PAUSED=true, last line
-- COMMIT. Run it in the Supabase SQL Editor.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.billing_customers WHERE livemode)
     OR EXISTS (SELECT 1 FROM public.subscriptions WHERE livemode IS TRUE)
     OR EXISTS (SELECT 1 FROM public.stripe_events WHERE livemode)
     OR EXISTS (SELECT 1 FROM public.payments WHERE livemode IS TRUE) THEN
    RAISE EXCEPTION 'Live billing data already exists. This script is only for the first switch from test to live. Nothing was changed.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'billing_test_archive') THEN
    RAISE EXCEPTION 'billing_test_archive already exists (a previous real run?). Inspect or rename it first. Nothing was changed.';
  END IF;
END $$;

CREATE SCHEMA billing_test_archive;
REVOKE ALL ON SCHEMA billing_test_archive FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON SCHEMA billing_test_archive FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Accounts whose plan came from a test subscription (no comp to fall back on).
CREATE TABLE billing_test_archive.affected_users AS
SELECT DISTINCT s.user_id, u.plan, u.plan_status
  FROM public.subscriptions s JOIN public.users u ON u.id = s.user_id
 WHERE s.id NOT LIKE 'comp\_%' AND s.product_line = 'plan'
   AND NOT EXISTS (SELECT 1 FROM public.subscriptions c
                    WHERE c.user_id = s.user_id AND c.id LIKE 'comp\_%' AND c.status = 'active');

-- ── Archive ─────────────────────────────────────────────────────────────
CREATE TABLE billing_test_archive.billing_customers     AS SELECT * FROM public.billing_customers WHERE NOT livemode;
CREATE TABLE billing_test_archive.subscriptions         AS SELECT * FROM public.subscriptions WHERE id NOT LIKE 'comp\_%';
CREATE TABLE billing_test_archive.billing_consents      AS SELECT * FROM public.billing_consents WHERE NOT livemode;
CREATE TABLE billing_test_archive.stripe_events         AS SELECT * FROM public.stripe_events WHERE NOT livemode;
CREATE TABLE billing_test_archive.billing_notifications AS SELECT * FROM public.billing_notifications;
CREATE TABLE billing_test_archive.billing_refunds       AS SELECT * FROM public.billing_refunds WHERE NOT livemode;
CREATE TABLE billing_test_archive.affiliate_commissions AS SELECT * FROM public.affiliate_commissions WHERE NOT livemode;
CREATE TABLE billing_test_archive.usage_periods         AS SELECT * FROM public.usage_periods;
CREATE TABLE billing_test_archive.usage_period_closures AS SELECT * FROM public.usage_period_closures;
CREATE TABLE billing_test_archive.payments              AS SELECT * FROM public.payments
  WHERE stripe_payment_intent IS NOT NULL OR stripe_invoice_id IS NOT NULL OR stripe_charge_id IS NOT NULL;
CREATE TABLE billing_test_archive.legacy_continuation_fees AS SELECT * FROM public.legacy_continuation_fees
  WHERE stripe_payment_intent_id IS NOT NULL OR stripe_checkout_session_id IS NOT NULL;
CREATE TABLE billing_test_archive.wg_payment_methods    AS SELECT * FROM public.wg_payment_methods WHERE stripe_payment_method IS NOT NULL;
CREATE TABLE billing_test_archive.wg_session_billing    AS SELECT * FROM public.wg_session_billing
  WHERE stripe_invoice_id IS NOT NULL OR stripe_payment_intent IS NOT NULL;
CREATE TABLE billing_test_archive.disaster_recovery_state AS SELECT * FROM public.disaster_recovery_state WHERE addon_source = 'stripe';
CREATE TABLE billing_test_archive.catalog_plans    AS SELECT id, stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual, synced_price_monthly_cents, synced_price_annual_cents FROM public.subscription_plans;
CREATE TABLE billing_test_archive.catalog_products AS SELECT slug, stripe_product_id, stripe_price_id, synced_amount_cents FROM public.billing_products;
CREATE TABLE billing_test_archive.users_billing    AS SELECT id, plan, plan_status, stripe_customer_id, stripe_subscription_id, overage_blocked FROM public.users
  WHERE stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR overage_blocked;
CREATE TABLE billing_test_archive.admin_settings   AS SELECT * FROM public.admin_settings WHERE key LIKE 'stripe\_portal\_config\_%';

-- ── Clear ───────────────────────────────────────────────────────────────
DELETE FROM public.affiliate_commissions WHERE NOT livemode;
DELETE FROM public.billing_refunds WHERE NOT livemode;
DELETE FROM public.billing_notifications;
DELETE FROM public.stripe_events WHERE NOT livemode;
DELETE FROM public.usage_period_closures;
DELETE FROM public.usage_periods;
DELETE FROM public.wg_session_billing WHERE stripe_invoice_id IS NOT NULL OR stripe_payment_intent IS NOT NULL;
DELETE FROM public.wg_payment_methods WHERE stripe_payment_method IS NOT NULL;
DELETE FROM public.billing_consents WHERE NOT livemode;
DELETE FROM public.payments WHERE stripe_payment_intent IS NOT NULL OR stripe_invoice_id IS NOT NULL OR stripe_charge_id IS NOT NULL;
DELETE FROM public.legacy_continuation_fees WHERE stripe_payment_intent_id IS NOT NULL OR stripe_checkout_session_id IS NOT NULL;
DELETE FROM public.subscriptions WHERE id NOT LIKE 'comp\_%';
DELETE FROM public.billing_customers WHERE NOT livemode;
DELETE FROM public.admin_settings WHERE key LIKE 'stripe\_portal\_config\_%';

-- ── Reset ───────────────────────────────────────────────────────────────
UPDATE public.disaster_recovery_state
   SET addon_active = FALSE, addon_subscription_id = NULL, addon_current_period_end = NULL, updated_at = NOW()
 WHERE addon_source = 'stripe';

UPDATE public.users
   SET stripe_customer_id = NULL, stripe_subscription_id = NULL, overage_blocked = FALSE, overage_blocked_at = NULL
 WHERE stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL OR overage_blocked;

-- A plan bought with a test card is not a live plan. (An admin suspension
-- stays as it is.)
UPDATE public.users u
   SET plan_status = 'cancelled'
  FROM billing_test_archive.affected_users a
 WHERE u.id = a.user_id AND u.plan_status <> 'paused';

UPDATE public.subscription_plans
   SET stripe_product_id = NULL, stripe_price_id_monthly = NULL, stripe_price_id_annual = NULL,
       synced_price_monthly_cents = NULL, synced_price_annual_cents = NULL;
UPDATE public.billing_products
   SET stripe_product_id = NULL, stripe_price_id = NULL, synced_amount_cents = NULL, updated_at = NOW();

SELECT public.recalc_affiliate_totals(id) FROM public.affiliates;

-- ── Report ──────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE 'ARCHIVED: customers=%, subscriptions=%, consents=%, events=%, refunds=%, commissions=%, usage_periods=%, closures=%, payments=%, continuation_fees=%, wg_cards=%, wg_sessions=%, dr_addons=%, accounts_set_cancelled=%',
    (SELECT count(*) FROM billing_test_archive.billing_customers),
    (SELECT count(*) FROM billing_test_archive.subscriptions),
    (SELECT count(*) FROM billing_test_archive.billing_consents),
    (SELECT count(*) FROM billing_test_archive.stripe_events),
    (SELECT count(*) FROM billing_test_archive.billing_refunds),
    (SELECT count(*) FROM billing_test_archive.affiliate_commissions),
    (SELECT count(*) FROM billing_test_archive.usage_periods),
    (SELECT count(*) FROM billing_test_archive.usage_period_closures),
    (SELECT count(*) FROM billing_test_archive.payments),
    (SELECT count(*) FROM billing_test_archive.legacy_continuation_fees),
    (SELECT count(*) FROM billing_test_archive.wg_payment_methods),
    (SELECT count(*) FROM billing_test_archive.wg_session_billing),
    (SELECT count(*) FROM billing_test_archive.disaster_recovery_state),
    (SELECT count(*) FROM billing_test_archive.affected_users);
  RAISE NOTICE 'LEFT (all should be 0): test_customers=%, sub_rows=%, plan_price_ids=%, product_price_ids=%, users_with_stripe_ids=%',
    (SELECT count(*) FROM public.billing_customers WHERE NOT livemode),
    (SELECT count(*) FROM public.subscriptions WHERE id NOT LIKE 'comp\_%'),
    (SELECT count(*) FROM public.subscription_plans WHERE stripe_price_id_monthly IS NOT NULL OR stripe_price_id_annual IS NOT NULL),
    (SELECT count(*) FROM public.billing_products WHERE stripe_price_id IS NOT NULL),
    (SELECT count(*) FROM public.users WHERE stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL);
  RAISE NOTICE 'KEPT: comped_plans=%, admin_dr_addons=%',
    (SELECT count(*) FROM public.subscriptions WHERE id LIKE 'comp\_%' AND status = 'active'),
    (SELECT count(*) FROM public.disaster_recovery_state WHERE addon_source = 'admin' AND addon_active);
END $$;

ROLLBACK;
