-- Paste into the Supabase SQL Editor. Same SQL as 040_storage_metering.sql,
-- followed by checks. Apply 038 and 039 first. If 039 is ever re-run, run
-- this again afterwards (it extends 039's apply_user_entitlements).

-- 040 — Storage metering for overage billing (Stripe billing, step 3).
--
-- Storage is a level, not something used up, so overage is measured as the
-- PEAK amount stored above the plan's allowance during a usage period:
--
--   units          = ceil((peak bytes − allowance) / 1 GB)
--   billable cents = units × the plan's overage rate, never more than the cap
--
-- The cap defaults to the plan's monthly price; the owner can raise it
-- (storage_spend_caps.cap_amount_usd). An upload that would pass the cap is
-- refused ("Raise my limit"), so raising the cap never back-charges anything.
-- Starter and comped plans can't create overage at all: they are blocked at
-- the allowance.
--
-- The meter is the sum of vault_documents.file_size_bytes. The size is taken
-- from the stored object itself when the row is inserted (not from the
-- browser), and 038 stops it being edited afterwards.
--
-- Usage periods follow the plan subscription: its billing period on a monthly
-- plan, monthly slices of the year on an annual plan, and the calendar month
-- otherwise. A closed period leaves a closure row: the amount to bill, or why
-- nothing is billed (skipped_reason). The server bills closures — on the
-- renewal invoice for monthly plans, as a standalone invoice from the hourly
-- rollover for annual plans and anything missed.
--
-- Enforcement (refusing uploads) is off until cutover:
-- admin_settings.storage_enforcement_enabled = 'false'. Metering runs now.
--
-- Every statement is idempotent, so this is safe to run more than once.

INSERT INTO public.admin_settings (key, value) VALUES ('storage_enforcement_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.usage_periods (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id      TEXT,                      -- NULL for Starter / no plan
  plan_id              TEXT NOT NULL REFERENCES public.subscription_plans(id),
  period_start         TIMESTAMPTZ NOT NULL,
  period_end           TIMESTAMPTZ NOT NULL,
  unit_bytes           BIGINT NOT NULL DEFAULT 1073741824,  -- 1 GB
  included_bytes       BIGINT NOT NULL,
  rate_cents           INTEGER NOT NULL DEFAULT 0,          -- per unit
  overage_allowed      BOOLEAN NOT NULL DEFAULT FALSE,
  current_bytes        BIGINT NOT NULL DEFAULT 0,
  peak_bytes           BIGINT NOT NULL DEFAULT 0,
  billable_units       INTEGER NOT NULL DEFAULT 0,
  billable_cents       INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  livemode             BOOLEAN,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at            TIMESTAMPTZ,
  UNIQUE (user_id, period_start),
  CHECK (period_end > period_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_periods_one_open ON public.usage_periods(user_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_usage_periods_open_end ON public.usage_periods(period_end) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.usage_period_closures (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usage_period_id        UUID NOT NULL UNIQUE REFERENCES public.usage_periods(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id        TEXT,
  plan_id                TEXT NOT NULL,
  period_start           TIMESTAMPTZ NOT NULL,
  period_end             TIMESTAMPTZ NOT NULL,
  overage_units          INTEGER NOT NULL,
  rate_cents             INTEGER NOT NULL,
  amount_cents           INTEGER NOT NULL,
  -- Why nothing is billed: comped plan, no overage on this plan, nothing over.
  skipped_reason         TEXT CHECK (skipped_reason IN ('comped','no_overage_plan','zero')),
  claimed_at             TIMESTAMPTZ,               -- a biller is working on it
  stripe_invoice_item_id TEXT,
  stripe_invoice_id      TEXT,
  billed_via             TEXT CHECK (billed_via IN ('renewal_invoice','standalone')),
  billed_at              TIMESTAMPTZ,
  paid_at                TIMESTAMPTZ,
  payment_failed_at      TIMESTAMPTZ,
  livemode               BOOLEAN,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_closures_unbilled ON public.usage_period_closures(user_id)
  WHERE billed_at IS NULL AND skipped_reason IS NULL;
CREATE INDEX IF NOT EXISTS idx_closures_invoice ON public.usage_period_closures(stripe_invoice_id);

ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_period_closures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_periods_owner_read" ON public.usage_periods;
CREATE POLICY "usage_periods_owner_read" ON public.usage_periods FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "usage_closures_owner_read" ON public.usage_period_closures;
CREATE POLICY "usage_closures_owner_read" ON public.usage_period_closures FOR SELECT USING (auth.uid() = user_id);

-- ── Helpers ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.storage_bytes_for(p_user UUID)
RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(file_size_bytes), 0)::bigint FROM public.vault_documents WHERE user_id = p_user;
$$;

-- The monthly overage cap in cents: the owner's own limit if set, otherwise
-- the plan's monthly price.
CREATE OR REPLACE FUNCTION public.overage_cap_cents(p_user UUID, p_plan TEXT)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT ROUND(c.cap_amount_usd * 100)::int FROM public.storage_spend_caps c
      WHERE c.user_id = p_user AND c.cap_amount_usd IS NOT NULL),
    (SELECT ROUND(sp.price_monthly * 100)::int FROM public.subscription_plans sp WHERE sp.id = p_plan),
    0);
$$;

-- Closes one period: records what it owes (or why nothing) and marks it
-- closed. Returns the closure id. Safe to call twice.
CREATE OR REPLACE FUNCTION public.close_usage_period(p_period UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.usage_periods%ROWTYPE;
  v_reason TEXT;
  v_id UUID;
BEGIN
  SELECT * INTO p FROM public.usage_periods WHERE id = p_period FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_reason := CASE
    WHEN p.subscription_id LIKE 'comp\_%' THEN 'comped'
    WHEN NOT p.overage_allowed THEN 'no_overage_plan'
    WHEN p.billable_cents <= 0 THEN 'zero'
    ELSE NULL END;

  INSERT INTO public.usage_period_closures (usage_period_id, user_id, subscription_id, plan_id, period_start, period_end,
    overage_units, rate_cents, amount_cents, skipped_reason, livemode)
  VALUES (p.id, p.user_id, p.subscription_id, p.plan_id, p.period_start, p.period_end,
    p.billable_units, p.rate_cents, CASE WHEN v_reason IS NULL THEN p.billable_cents ELSE 0 END, v_reason, p.livemode)
  ON CONFLICT (usage_period_id) DO NOTHING;

  UPDATE public.usage_periods SET status = 'closed', closed_at = COALESCE(closed_at, NOW()) WHERE id = p.id;
  SELECT id INTO v_id FROM public.usage_period_closures WHERE usage_period_id = p.id;
  RETURN v_id;
END; $$;

-- Makes sure the account has an open period that matches its plan right now,
-- closing the previous one if it ended or the plan changed (an upgrade closes
-- usage at the old rate). Returns the open period's id.
CREATE OR REPLACE FUNCTION public.ensure_open_usage_period(p_user UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now      TIMESTAMPTZ := NOW();
  v_user     public.users%ROWTYPE;
  v_sub      public.subscriptions%ROWTYPE;
  v_plan     public.subscription_plans%ROWTYPE;
  v_open     public.usage_periods%ROWTYPE;
  v_has_sub  BOOLEAN;
  v_start    TIMESTAMPTZ;
  v_end      TIMESTAMPTZ;
  v_last_end TIMESTAMPTZ;
  v_months   INTEGER;
  v_allowed  BOOLEAN;
  v_bytes    BIGINT;
  v_id       UUID;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_sub FROM public.subscriptions
   WHERE user_id = p_user AND product_line = 'plan' AND status IN ('active','trialing','past_due')
   ORDER BY (id LIKE 'comp\_%') DESC, updated_at DESC LIMIT 1;
  v_has_sub := FOUND;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = COALESCE(CASE WHEN v_has_sub THEN v_sub.plan_id END, v_user.plan);

  -- Period boundaries.
  IF v_has_sub AND v_sub.id NOT LIKE 'comp\_%'
     AND v_sub.current_period_start IS NOT NULL AND v_sub.current_period_end IS NOT NULL
     AND v_sub.current_period_start <= v_now AND v_now < v_sub.current_period_end THEN
    IF v_sub.interval = 'year' THEN
      v_months := (EXTRACT(YEAR FROM age(v_now, v_sub.current_period_start)) * 12
                 + EXTRACT(MONTH FROM age(v_now, v_sub.current_period_start)))::int;
      v_start := v_sub.current_period_start + make_interval(months => v_months);
      v_end   := LEAST(v_sub.current_period_start + make_interval(months => v_months + 1), v_sub.current_period_end);
    ELSE
      v_start := v_sub.current_period_start;
      v_end   := v_sub.current_period_end;
    END IF;
  ELSE
    -- Starter, comped, no plan — or a subscription period this database's
    -- clock doesn't fall inside (a delayed webhook, or a Stripe test clock).
    v_start := date_trunc('month', v_now);
    v_end   := v_start + INTERVAL '1 month';
  END IF;

  v_allowed := v_has_sub AND v_sub.id NOT LIKE 'comp\_%' AND COALESCE(v_plan.billable, FALSE) AND COALESCE(v_plan.overage_rate, 0) > 0;

  SELECT * INTO v_open FROM public.usage_periods WHERE user_id = p_user AND status = 'open' FOR UPDATE;
  IF FOUND THEN
    IF v_now < v_open.period_end
       AND v_open.plan_id = v_plan.id
       AND v_open.subscription_id IS NOT DISTINCT FROM (CASE WHEN v_has_sub THEN v_sub.id END)
       AND v_open.overage_allowed = v_allowed THEN
      RETURN v_open.id;
    END IF;
    -- Ended, or the plan changed: close it where it stands.
    IF v_now < v_open.period_end THEN
      UPDATE public.usage_periods SET period_end = GREATEST(v_now, period_start + INTERVAL '1 second') WHERE id = v_open.id;
    END IF;
    PERFORM public.close_usage_period(v_open.id);
  END IF;

  -- Never overlap a period already closed.
  SELECT MAX(period_end) INTO v_last_end FROM public.usage_periods WHERE user_id = p_user;
  v_start := GREATEST(v_start, COALESCE(v_last_end, v_start));
  IF v_start >= v_end THEN
    v_end := v_start + INTERVAL '1 month';
  END IF;

  v_bytes := public.storage_bytes_for(p_user);
  INSERT INTO public.usage_periods (user_id, subscription_id, plan_id, period_start, period_end, included_bytes,
    rate_cents, overage_allowed, current_bytes, peak_bytes, livemode)
  VALUES (p_user, CASE WHEN v_has_sub THEN v_sub.id END, v_plan.id, v_start, v_end,
    v_plan.storage_gb::bigint * 1073741824, ROUND(COALESCE(v_plan.overage_rate, 0) * 100)::int, v_allowed,
    v_bytes, v_bytes, CASE WHEN v_has_sub THEN v_sub.livemode END)
  RETURNING id INTO v_id;

  PERFORM public.refresh_storage_usage(p_user);
  RETURN v_id;
END; $$;

-- Re-reads the meter into the open period: current and peak bytes, and the
-- billable amount (clamped to the cap, and never lowered within a period).
-- Also keeps the older per-month storage_usage row the dashboard reads.
CREATE OR REPLACE FUNCTION public.refresh_storage_usage(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p        public.usage_periods%ROWTYPE;
  v_bytes  BIGINT := public.storage_bytes_for(p_user);
  v_peak   BIGINT;
  v_units  INTEGER;
  v_cents  INTEGER;
BEGIN
  SELECT * INTO p FROM public.usage_periods WHERE user_id = p_user AND status = 'open' FOR UPDATE;
  IF FOUND THEN
    v_peak  := GREATEST(p.peak_bytes, v_bytes);
    v_units := CEIL(GREATEST(v_peak - p.included_bytes, 0)::numeric / p.unit_bytes)::int;
    v_cents := CASE WHEN p.overage_allowed
                    THEN LEAST(v_units * p.rate_cents, public.overage_cap_cents(p_user, p.plan_id))
                    ELSE 0 END;
    UPDATE public.usage_periods SET
      current_bytes  = v_bytes,
      peak_bytes     = v_peak,
      billable_units = GREATEST(billable_units, CASE WHEN p.overage_allowed THEN v_units ELSE 0 END),
      billable_cents = GREATEST(billable_cents, v_cents)
    WHERE id = p.id;
  END IF;

  INSERT INTO public.storage_usage (user_id, billing_period, used_bytes, plan_limit_gb, overage_bytes)
  SELECT p_user, TO_CHAR(NOW(), 'YYYY-MM'), v_bytes, sp.storage_gb,
         GREATEST(v_bytes - sp.storage_gb::bigint * 1073741824, 0)
    FROM public.users u JOIN public.subscription_plans sp ON sp.id = u.plan
   WHERE u.id = p_user
  ON CONFLICT (user_id, billing_period) DO UPDATE SET
    used_bytes = EXCLUDED.used_bytes, plan_limit_gb = EXCLUDED.plan_limit_gb, overage_bytes = EXCLUDED.overage_bytes;
END; $$;

-- Closes the open period at p_boundary (a renewal: the old period's end; an
-- upgrade: now) and opens the next. Returns the closures it created.
CREATE OR REPLACE FUNCTION public.roll_usage_period(p_user UUID, p_boundary TIMESTAMPTZ)
RETURNS SETOF UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.usage_periods%ROWTYPE;
  v_closure UUID;
BEGIN
  PERFORM public.refresh_storage_usage(p_user);
  FOR p IN SELECT * FROM public.usage_periods
            WHERE user_id = p_user AND status = 'open' AND period_start < p_boundary FOR UPDATE LOOP
    IF p_boundary < p.period_end THEN
      UPDATE public.usage_periods SET period_end = p_boundary WHERE id = p.id;
    END IF;
    v_closure := public.close_usage_period(p.id);
    IF v_closure IS NOT NULL THEN RETURN NEXT v_closure; END IF;
  END LOOP;
  PERFORM public.ensure_open_usage_period(p_user);
END; $$;

-- The hourly rollover's first step: close every open period whose end has
-- passed and open the next one (so an account over its allowance keeps being
-- metered even when it uploads nothing). Returns the number closed.
CREATE OR REPLACE FUNCTION public.close_ended_usage_periods()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT user_id FROM public.usage_periods WHERE status = 'open' AND period_end <= NOW() LOOP
    PERFORM public.ensure_open_usage_period(r.user_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- ── The upload check ────────────────────────────────────────────────────
-- Would storing p_bytes more be allowed? Used by the browser before an upload
-- (storage_upload_check) and by the insert trigger below.
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
  v_reason  TEXT := 'ok';
  v_enforce BOOLEAN;
BEGIN
  SELECT * INTO p FROM public.usage_periods WHERE id = v_pid;
  SELECT COALESCE(overage_blocked, FALSE) INTO v_blocked FROM public.users WHERE id = p_user;
  v_cap   := public.overage_cap_cents(p_user, p.plan_id);
  v_units := CEIL(GREATEST(GREATEST(p.peak_bytes, v_after) - p.included_bytes, 0)::numeric / p.unit_bytes)::int;
  v_cost  := v_units * p.rate_cents;
  v_enforce := COALESCE((SELECT value = 'true' FROM public.admin_settings WHERE key = 'storage_enforcement_enabled'), FALSE);

  IF v_after > p.included_bytes THEN
    IF NOT p.overage_allowed THEN v_reason := 'limit_reached';
    ELSIF v_blocked THEN v_reason := 'overage_blocked';
    ELSIF v_cost > v_cap THEN v_reason := 'cap_reached';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_reason = 'ok' OR NOT v_enforce,
    'reason', v_reason,
    'enforced', v_enforce,
    'currentBytes', v_bytes,
    'includedBytes', p.included_bytes,
    'unitBytes', p.unit_bytes,
    'rateCents', p.rate_cents,
    'capCents', v_cap,
    'overageAllowed', p.overage_allowed,
    'projectedOverageCents', CASE WHEN p.overage_allowed THEN LEAST(v_cost, v_cap) ELSE 0 END,
    'periodEnd', p.period_end);
END; $$;

CREATE OR REPLACE FUNCTION public.storage_upload_check(p_bytes BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  RETURN public.storage_check_for(auth.uid(), p_bytes);
END; $$;

-- ── Triggers on vault_documents ─────────────────────────────────────────
-- Before insert from the browser: take the size from the stored object (when
-- there is one) and, once enforcement is on, refuse an upload that the plan
-- doesn't allow. The error text starts with STORAGE_QUOTA: so the app can
-- show the right screen.
CREATE OR REPLACE FUNCTION public.enforce_storage_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_size  BIGINT;
  v_check JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT (o.metadata->>'size')::bigint INTO v_size
    FROM storage.objects o
   WHERE o.bucket_id = 'vault-documents' AND o.name = NEW.file_path;
  IF v_size IS NOT NULL THEN NEW.file_size_bytes := v_size; END IF;

  v_check := public.storage_check_for(NEW.user_id, NEW.file_size_bytes);
  IF NOT (v_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'STORAGE_QUOTA:%', v_check->>'reason' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vault_documents_quota ON public.vault_documents;
CREATE TRIGGER trg_vault_documents_quota
  BEFORE INSERT ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_storage_quota();

-- After insert/delete: re-read the meter. Replaces the old trigger body, which
-- added and subtracted per calendar month and so restarted at 0 every month.
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ensure_open_usage_period(COALESCE(NEW.user_id, OLD.user_id));
  PERFORM public.refresh_storage_usage(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

-- ── Entitlements now keep the meter in step ─────────────────────────────
-- Same as 039, plus: a plan change rolls the usage period, so an upgrade
-- closes usage at the old rate before the new allowance applies.
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
    UPDATE public.disaster_recovery_state
       SET addon_active = FALSE, addon_subscription_id = NULL, addon_current_period_end = NULL, updated_at = NOW()
     WHERE user_id = p_user AND addon_source = 'stripe';
  END IF;

  PERFORM public.ensure_open_usage_period(p_user);
END; $$;

-- Only the upload check is callable from the browser; the rest run as the
-- service role or inside the triggers above.
REVOKE EXECUTE ON FUNCTION public.storage_bytes_for(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.overage_cap_cents(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_usage_period(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_open_usage_period(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_storage_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.roll_usage_period(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_ended_usage_periods() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.storage_check_for(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_user_entitlements(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.storage_upload_check(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_upload_check(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_bytes_for(UUID), public.overage_cap_cents(UUID, TEXT),
  public.close_usage_period(UUID), public.ensure_open_usage_period(UUID), public.refresh_storage_usage(UUID),
  public.roll_usage_period(UUID, TIMESTAMPTZ), public.close_ended_usage_periods(), public.storage_check_for(UUID, BIGINT),
  public.apply_user_entitlements(UUID)
  TO service_role;

-- Verification 1: enforcement is still off (refusing uploads starts at cutover).
SELECT key, value FROM public.admin_settings WHERE key = 'storage_enforcement_enabled';

-- Verification 2: the quota trigger and the rewritten meter trigger exist (2 rows).
SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_vault_documents_quota','trg_storage_update');

-- Verification 3: the upload check is callable by signed-in users and nothing
-- else is (has_function_privilege for the authenticated role).
SELECT p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS browser_can_call
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN
  ('storage_upload_check','storage_check_for','ensure_open_usage_period','refresh_storage_usage','roll_usage_period','close_ended_usage_periods','provision_subscription')
ORDER BY 1;
