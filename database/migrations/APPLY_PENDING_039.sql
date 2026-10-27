-- Paste into the Supabase SQL Editor. Same SQL as 039_billing_core.sql,
-- followed by checks that the catalog, tables and functions are in place.
-- Apply 038 first.

-- 039 — Billing core (Stripe billing, step 2).
--
-- The database is the source of truth for what is sold and what each account
-- has; Stripe is made to match it (catalog sync) and reports back through the
-- signed webhook. This migration adds:
--
--   catalog          subscription_plans gains Stripe product/price bookkeeping
--                    and a billable flag (Starter is free and never billed);
--                    billing_products holds the add-on and one-time prices
--                    (Disaster Recovery, Continuation Fee, White Glove).
--   customers        billing_customers: one Stripe customer per account per
--                    mode, so test and live ids never mix.
--   subscriptions    a mirror of every Stripe subscription (plan and DR
--                    add-on), plus comp_ rows for plans an admin gave free.
--   ledgers          stripe_events (webhook idempotency), billing_consents
--                    (auto-renewal consent), billing_refunds,
--                    billing_notifications (each billing email sent once),
--                    affiliate_commissions.
--   functions        provision_subscription / apply_user_entitlements: the
--                    one path that sets users.plan, plan_status and the DR
--                    add-on from the subscription rows.
--
-- Prices follow the owner's decisions in GO_LIVE_CHECKLIST.md: Starter is
-- free for 14 days, Legacy Vault annual is $1,247.90, overage is $0.40/GB.
--
-- Written only by the server (service role). Owners can read their own rows.
-- Every statement is idempotent, so this is safe to run more than once.

-- ── Catalog ─────────────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id           TEXT,
  ADD COLUMN IF NOT EXISTS billable                    BOOLEAN NOT NULL DEFAULT TRUE,
  -- The cents each stored Stripe price was created with. A plan whose price
  -- no longer matches is "unsynced": checkout refuses it until the catalog
  -- sync creates the new price (Stripe prices can't be edited).
  ADD COLUMN IF NOT EXISTS synced_price_monthly_cents  INTEGER,
  ADD COLUMN IF NOT EXISTS synced_price_annual_cents   INTEGER;

UPDATE public.subscription_plans
   SET price_monthly = 0, price_annual = 0, overage_rate = 0, billable = FALSE
 WHERE id = 'starter';
UPDATE public.subscription_plans SET price_annual = 1247.90 WHERE id = 'legacy_vault';

CREATE TABLE IF NOT EXISTS public.billing_products (
  slug                TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  kind                TEXT NOT NULL CHECK (kind IN ('one_time','recurring')),
  -- Products sold as alternatives (DR monthly / DR yearly) share a group.
  product_group       TEXT NOT NULL,
  interval            TEXT CHECK (interval IN ('month','year')),
  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency            TEXT NOT NULL DEFAULT 'usd' CHECK (currency = 'usd'),
  stripe_product_id   TEXT,
  stripe_price_id     TEXT,
  synced_amount_cents INTEGER,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((kind = 'recurring') = (interval IS NOT NULL))
);

INSERT INTO public.billing_products (slug, name, description, kind, product_group, interval, amount_cents, sort_order) VALUES
  ('dr_addon_month',   'Disaster Recovery Protection', 'Monthly add-on',                         'recurring', 'dr_addon',         'month',  499, 10),
  ('dr_addon_year',    'Disaster Recovery Protection', 'Yearly add-on',                          'recurring', 'dr_addon',         'year',  4788, 11),
  ('continuation_fee', 'Legacy Continuation Fee',      'One-time; legacy access after passing',  'one_time',  'continuation_fee', NULL,   19900, 20),
  ('wg_setup',         'White Glove Setup',            'One-time setup; saves the card on file', 'one_time',  'white_glove',      NULL,    9900, 30),
  ('wg_session_block', 'White Glove Session (30 min)', 'Charged per 30-minute block',            'one_time',  'white_glove',      NULL,    2500, 31)
ON CONFLICT (slug) DO NOTHING;

-- The fee the admin set on the "$199 Legacy Fee" page carries over.
UPDATE public.billing_products bp
   SET amount_cents = ROUND(s.value::numeric * 100)::int
  FROM public.admin_settings s
 WHERE bp.slug = 'continuation_fee' AND s.key = 'continuation_fee_amount'
   AND s.value ~ '^[0-9]+(\.[0-9]+)?$' AND bp.stripe_price_id IS NULL;

ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_products_public_read" ON public.billing_products;
CREATE POLICY "billing_products_public_read" ON public.billing_products FOR SELECT USING (active);

-- ── Customers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  livemode           BOOLEAN NOT NULL,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  -- Set when a test customer was created on a Stripe test clock (Phase B).
  test_clock_id      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, livemode)
);
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;

-- ── Subscriptions ───────────────────────────────────────────────────────
-- id is Stripe's sub_… for paid subscriptions, or comp_<uuid> for a plan an
-- admin gave free (no Stripe object, never invoiced).
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     TEXT PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_line           TEXT NOT NULL CHECK (product_line IN ('plan','dr_addon')),
  plan_id                TEXT REFERENCES public.subscription_plans(id),
  product_slug           TEXT REFERENCES public.billing_products(slug),
  -- Stripe's subscription status, or 'active' / 'canceled' for comp rows.
  status                 TEXT NOT NULL,
  livemode               BOOLEAN,
  stripe_customer_id     TEXT,
  stripe_price_id        TEXT,
  interval               TEXT CHECK (interval IN ('month','year')),
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_at              TIMESTAMPTZ,
  canceled_at            TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  -- A downgrade (or annual → monthly) waiting for the end of the period.
  pending_plan_id        TEXT REFERENCES public.subscription_plans(id),
  pending_interval       TEXT CHECK (pending_interval IN ('month','year')),
  pending_change_at      TIMESTAMPTZ,
  stripe_schedule_id     TEXT,
  default_payment_method TEXT,
  comp_reason            TEXT,
  comp_granted_by        TEXT,
  metadata               JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((product_line = 'plan') = (plan_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
-- The database's last line against billing someone twice: one subscription
-- with access per product line per account.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_one_live_per_line
  ON public.subscriptions(user_id, product_line)
  WHERE status IN ('active','trialing','past_due');

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_owner_read" ON public.subscriptions;
CREATE POLICY "subscriptions_owner_read" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Accounts an admin already gave a free plan keep it, as comp rows.
INSERT INTO public.subscriptions (id, user_id, product_line, plan_id, status, comp_reason, comp_granted_by)
SELECT 'comp_' || u.id, u.id, 'plan', u.plan, 'active', COALESCE(u.waive_reason, 'Waived before Stripe billing'), u.onboarded_by
  FROM public.users u
 WHERE u.subscription_waived AND u.plan <> 'starter'
ON CONFLICT (id) DO NOTHING;

-- ── Webhook events (idempotency) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id                TEXT PRIMARY KEY,           -- evt_…
  type              TEXT NOT NULL,
  livemode          BOOLEAN NOT NULL,
  api_version       TEXT,
  object_id         TEXT,
  stripe_created_at TIMESTAMPTZ,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at      TIMESTAMPTZ,
  attempts          INTEGER NOT NULL DEFAULT 1,
  last_error        TEXT
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed ON public.stripe_events(received_at) WHERE processed_at IS NULL;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- ── Auto-renewal consent ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_consents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose             TEXT NOT NULL CHECK (purpose IN ('plan','dr_addon','wg_card_on_file')),
  plan_id             TEXT REFERENCES public.subscription_plans(id),
  product_slug        TEXT REFERENCES public.billing_products(slug),
  interval            TEXT CHECK (interval IN ('month','year')),
  amount_cents        INTEGER NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'usd',
  consent_text        TEXT NOT NULL,             -- the exact words shown
  consent_version     TEXT NOT NULL,
  checkout_session_id TEXT UNIQUE,
  livemode            BOOLEAN NOT NULL,
  ip                  TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ                -- the checkout was paid
);
CREATE INDEX IF NOT EXISTS idx_billing_consents_user ON public.billing_consents(user_id);
ALTER TABLE public.billing_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_consents_owner_read" ON public.billing_consents;
CREATE POLICY "billing_consents_owner_read" ON public.billing_consents FOR SELECT USING (auth.uid() = user_id);

-- ── Refunds ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_refunds (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  stripe_refund_id       TEXT UNIQUE,
  stripe_charge_id       TEXT,
  stripe_invoice_id      TEXT,
  stripe_subscription_id TEXT,
  amount_cents           INTEGER NOT NULL,
  reason                 TEXT,
  source                 TEXT NOT NULL CHECK (source IN ('admin_refund_and_end','admin_refund','dashboard','duplicate')),
  initiated_by           TEXT,
  livemode               BOOLEAN NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_refunds_user ON public.billing_refunds(user_id);
ALTER TABLE public.billing_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_refunds_owner_read" ON public.billing_refunds;
CREATE POLICY "billing_refunds_owner_read" ON public.billing_refunds FOR SELECT USING (auth.uid() = user_id);

-- ── Billing emails, each sent once ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  sent_at    TIMESTAMPTZ,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- ── Affiliate commissions ───────────────────────────────────────────────
-- A signed ledger: 'earned' rows are positive, 'reversal' rows negative,
-- 'restore' rows positive again. source_key makes every effect happen once
-- (inv:in_…, refund:re_…, dispute:du_…, dispute_won:du_…).
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id      UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id       UUID REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  referred_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('earned','reversal','restore')),
  stripe_invoice_id TEXT,
  stripe_charge_id  TEXT,
  source_key        TEXT NOT NULL UNIQUE,
  base_amount_cents INTEGER NOT NULL,
  rate              NUMERIC(5,4) NOT NULL,
  amount_cents      INTEGER NOT NULL,
  livemode          BOOLEAN NOT NULL,
  payout_id         UUID REFERENCES public.payouts(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_invoice ON public.affiliate_commissions(stripe_invoice_id);
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_commissions_owner_read" ON public.affiliate_commissions;
CREATE POLICY "affiliate_commissions_owner_read" ON public.affiliate_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
);

-- total_earned / pending_payout become sums of the ledger.
CREATE OR REPLACE FUNCTION public.recalc_affiliate_totals(p_affiliate UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.affiliates a SET
    total_earned   = COALESCE((SELECT SUM(amount_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id), 0) / 100.0,
    pending_payout = COALESCE((SELECT SUM(amount_cents) FROM public.affiliate_commissions WHERE affiliate_id = a.id AND payout_id IS NULL), 0) / 100.0
  WHERE a.id = p_affiliate;
END; $$;

-- ── Columns on existing tables ──────────────────────────────────────────
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription','overage','continuation_fee','upgrade','other','dr_addon','wg_setup','wg_session'));
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_amount_usd    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS livemode               BOOLEAN,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge ON public.payments(stripe_charge_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS overage_blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS overage_blocked_at TIMESTAMPTZ;

ALTER TABLE public.disaster_recovery_state
  ADD COLUMN IF NOT EXISTS addon_source             TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS addon_subscription_id    TEXT,
  ADD COLUMN IF NOT EXISTS addon_current_period_end TIMESTAMPTZ;
ALTER TABLE public.disaster_recovery_state DROP CONSTRAINT IF EXISTS disaster_recovery_state_addon_source_check;
ALTER TABLE public.disaster_recovery_state ADD CONSTRAINT disaster_recovery_state_addon_source_check
  CHECK (addon_source IN ('stripe','admin'));

ALTER TABLE public.wg_payment_methods
  ADD COLUMN IF NOT EXISTS livemode   BOOLEAN,
  ADD COLUMN IF NOT EXISTS consent_id UUID REFERENCES public.billing_consents(id);

-- Sessions are charged by an admin from the White Glove screen, which may not
-- know the specialist's employee row; the card comes from the Stripe record.
ALTER TABLE public.wg_session_billing ALTER COLUMN specialist_id DROP NOT NULL;
ALTER TABLE public.wg_session_billing ALTER COLUMN card_last4 DROP NOT NULL;
ALTER TABLE public.wg_session_billing ALTER COLUMN card_brand DROP NOT NULL;
ALTER TABLE public.wg_session_billing DROP CONSTRAINT IF EXISTS wg_session_billing_session_type_check;
ALTER TABLE public.wg_session_billing ADD CONSTRAINT wg_session_billing_session_type_check
  CHECK (session_type IN ('phone','video','in_person'));
ALTER TABLE public.wg_session_billing
  ADD COLUMN IF NOT EXISTS session_key       UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS livemode          BOOLEAN,
  ADD COLUMN IF NOT EXISTS failure_message   TEXT,
  ADD COLUMN IF NOT EXISTS charged_by        TEXT;

ALTER TABLE public.legacy_continuation_fees
  ADD COLUMN IF NOT EXISTS livemode                   BOOLEAN,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT UNIQUE;

-- ── Settings and copy ───────────────────────────────────────────────────
UPDATE public.admin_settings SET value = '0.40', updated_at = NOW()
 WHERE key = 'overage_rate_per_gb' AND value = '0.10';

UPDATE public.email_templates
   SET html = replace(replace(html, '$0.10 per GB', '{{overage_rate}} per GB'), '$0.10 / GB', '{{overage_rate}} / GB'),
       variables = CASE WHEN '{{overage_rate}}' = ANY(variables) THEN variables ELSE variables || '{{overage_rate}}'::text END,
       updated_at = NOW()
 WHERE id IN ('storage_80','storage_90','storage_95','storage_overage')
   AND (html LIKE '%$0.10 per GB%' OR html LIKE '%$0.10 / GB%');

-- ── Entitlements: the one place plan / status / DR are derived ──────────
-- Access means status active, trialing or past_due (Smart Retries still
-- running). Called by provision_subscription and by every admin action.
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

  -- A comp row wins over a paid one; otherwise the newest paid row with access.
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
    -- An account that has had a billed or comped plan and lost it is
    -- cancelled (the app shows Reactivate). One that never had one — Starter,
    -- or a plan from before billing — is left as it is.
    SELECT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = p_user AND product_line = 'plan') INTO v_ever;
    IF v_ever THEN
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
    -- An add-on an admin granted by hand stays on.
    UPDATE public.disaster_recovery_state
       SET addon_active = FALSE, addon_subscription_id = NULL, addon_current_period_end = NULL, updated_at = NOW()
     WHERE user_id = p_user AND addon_source = 'stripe';
  END IF;
END; $$;

-- Upserts one subscription row (from a re-read Stripe subscription, or a comp
-- grant) and re-derives the account's entitlements. Raises unique_violation
-- (23505) when the account already has another subscription with access on
-- the same product line; the webhook cancels and refunds that duplicate.
CREATE OR REPLACE FUNCTION public.provision_subscription(p JSONB)
RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.subscriptions%ROWTYPE;
BEGIN
  r := jsonb_populate_record(NULL::public.subscriptions, p);
  IF r.id IS NULL OR r.user_id IS NULL OR r.product_line IS NULL OR r.status IS NULL THEN
    RAISE EXCEPTION 'provision_subscription needs id, user_id, product_line and status';
  END IF;

  INSERT INTO public.subscriptions AS s (
    id, user_id, product_line, plan_id, product_slug, status, livemode, stripe_customer_id, stripe_price_id,
    interval, current_period_start, current_period_end, cancel_at_period_end, cancel_at, canceled_at, ended_at,
    pending_plan_id, pending_interval, pending_change_at, stripe_schedule_id, default_payment_method,
    comp_reason, comp_granted_by, metadata)
  VALUES (
    r.id, r.user_id, r.product_line, r.plan_id, r.product_slug, r.status, r.livemode, r.stripe_customer_id, r.stripe_price_id,
    r.interval, r.current_period_start, r.current_period_end, COALESCE(r.cancel_at_period_end, FALSE), r.cancel_at, r.canceled_at, r.ended_at,
    r.pending_plan_id, r.pending_interval, r.pending_change_at, r.stripe_schedule_id, r.default_payment_method,
    r.comp_reason, r.comp_granted_by, COALESCE(r.metadata, '{}'::jsonb))
  ON CONFLICT (id) DO UPDATE SET
    product_line = EXCLUDED.product_line, plan_id = EXCLUDED.plan_id, product_slug = EXCLUDED.product_slug,
    status = EXCLUDED.status, livemode = EXCLUDED.livemode, stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_price_id = EXCLUDED.stripe_price_id, interval = EXCLUDED.interval,
    current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end, cancel_at = EXCLUDED.cancel_at,
    canceled_at = EXCLUDED.canceled_at, ended_at = EXCLUDED.ended_at,
    pending_plan_id = EXCLUDED.pending_plan_id, pending_interval = EXCLUDED.pending_interval,
    pending_change_at = EXCLUDED.pending_change_at, stripe_schedule_id = EXCLUDED.stripe_schedule_id,
    default_payment_method = EXCLUDED.default_payment_method,
    comp_reason = COALESCE(EXCLUDED.comp_reason, s.comp_reason),
    comp_granted_by = COALESCE(EXCLUDED.comp_granted_by, s.comp_granted_by),
    metadata = s.metadata || EXCLUDED.metadata
  RETURNING * INTO r;

  PERFORM public.apply_user_entitlements(r.user_id);
  RETURN r;
END; $$;

-- Service role only.
REVOKE EXECUTE ON FUNCTION public.apply_user_entitlements(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.provision_subscription(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_affiliate_totals(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_user_entitlements(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_subscription(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalc_affiliate_totals(UUID) TO service_role;

-- Verification 1: Starter is free and unbilled, Legacy Vault annual is 1247.90.
SELECT id, price_monthly, price_annual, overage_rate, billable FROM public.subscription_plans ORDER BY price_monthly;

-- Verification 2: five billing products (DR monthly/yearly, continuation fee,
-- White Glove setup and session block).
SELECT slug, kind, interval, amount_cents FROM public.billing_products ORDER BY sort_order;

-- Verification 3: the new tables exist (7 rows).
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN
  ('billing_customers','subscriptions','stripe_events','billing_consents','billing_refunds','billing_notifications','affiliate_commissions')
ORDER BY table_name;

-- Verification 4: comp rows for accounts that already had a waived plan.
SELECT count(*) AS comp_rows, (SELECT count(*) FROM public.users WHERE subscription_waived AND plan <> 'starter') AS waived_users
FROM public.subscriptions WHERE id LIKE 'comp\_%';
