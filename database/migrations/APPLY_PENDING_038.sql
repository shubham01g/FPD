-- Paste into the Supabase SQL Editor. Same SQL as 038_billing_security_lockdown.sql,
-- followed by checks that the policies and triggers are in place.

-- 038 — Billing security lockdown (Stripe billing, step 1).
--
-- Before card payments can mean anything, an account must not be able to
-- grant itself what it would otherwise pay for. Several policies were written
-- FOR ALL, which lets the signed-in owner INSERT and UPDATE through the
-- public API, not only read:
--
--   users_own_data            plan, plan_status, is_admin, stripe_*, waivers
--   lcf_own                   a "paid" Legacy Continuation Fee row
--   payments_own              "succeeded" payment rows
--   affiliates_own            commission_rate, total_earned, pending_payout
--   storage_own               the storage meter
--   wg_payment_methods_own    the White Glove card on file
--   crypto_txns_own           crypto payment records
--   docs_download_gate        vault_documents.file_size_bytes (the meter input)
--
-- From here on those are written only by the server (service role, which
-- bypasses RLS and has auth.uid() = NULL) or by SECURITY DEFINER functions.
-- The owner keeps read access everywhere it had it.
--
-- Every statement is idempotent, so this is safe to run more than once.

-- ── users: protected columns ────────────────────────────────────────────
-- users_own_data stays FOR ALL because the profile screen saves name, phone,
-- demographics and the vault salt/verifier through it. The billing and admin
-- columns are guarded here instead. auth.uid() is NULL for the service role
-- and for the signup trigger, so admin edits and handle_new_user are
-- unaffected (same pattern as enforce_starter_plan_window in 026).
CREATE OR REPLACE FUNCTION public.guard_user_protected_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.plan                   := 'starter';
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

DROP TRIGGER IF EXISTS trg_users_guard_protected ON public.users;
CREATE TRIGGER trg_users_guard_protected
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_protected_columns();

-- ── FOR ALL → SELECT-only ───────────────────────────────────────────────
DROP POLICY IF EXISTS "lcf_own" ON public.legacy_continuation_fees;
DROP POLICY IF EXISTS "lcf_owner_read" ON public.legacy_continuation_fees;
CREATE POLICY "lcf_owner_read" ON public.legacy_continuation_fees
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_own" ON public.payments;
DROP POLICY IF EXISTS "payments_owner_read" ON public.payments;
CREATE POLICY "payments_owner_read" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "affiliates_own" ON public.affiliates;
DROP POLICY IF EXISTS "affiliates_owner_read" ON public.affiliates;
CREATE POLICY "affiliates_owner_read" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "storage_own" ON public.storage_usage;
DROP POLICY IF EXISTS "storage_owner_read" ON public.storage_usage;
CREATE POLICY "storage_owner_read" ON public.storage_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wg_payment_methods_own" ON public.wg_payment_methods;
DROP POLICY IF EXISTS "wg_payment_methods_owner_read" ON public.wg_payment_methods;
CREATE POLICY "wg_payment_methods_owner_read" ON public.wg_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "crypto_txns_own" ON public.crypto_transactions;
DROP POLICY IF EXISTS "crypto_txns_owner_read" ON public.crypto_transactions;
CREATE POLICY "crypto_txns_owner_read" ON public.crypto_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- The storage meter trigger ran as the uploading user and wrote
-- storage_usage through storage_own. With that policy now read-only it must
-- run as its owner, or every upload would fail.
ALTER FUNCTION public.update_storage_usage() SECURITY DEFINER SET search_path = public;

-- A spending cap is the owner's own limit, so it stays writable; it just
-- can't be negative.
ALTER TABLE public.storage_spend_caps DROP CONSTRAINT IF EXISTS storage_spend_caps_amount_check;
ALTER TABLE public.storage_spend_caps ADD CONSTRAINT storage_spend_caps_amount_check
  CHECK (cap_amount_usd IS NULL OR cap_amount_usd >= 0);

-- ── vault_documents: the meter's inputs ─────────────────────────────────
-- docs_download_gate (FOR ALL) is what lets the owner rename and move
-- documents, so it stays. The size, owner and storage path are not theirs to
-- edit after upload.
CREATE OR REPLACE FUNCTION public.guard_vault_document_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id         := OLD.user_id;
    NEW.file_path       := OLD.file_path;
    NEW.file_size_bytes := OLD.file_size_bytes;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_vault_documents_guard ON public.vault_documents;
CREATE TRIGGER trg_vault_documents_guard
  BEFORE UPDATE ON public.vault_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_vault_document_columns();

-- Verification 1: every policy below should show cmd = SELECT (6 rows).
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('lcf_owner_read','payments_owner_read','affiliates_owner_read',
                     'storage_owner_read','wg_payment_methods_owner_read','crypto_txns_owner_read')
ORDER BY tablename;

-- Verification 2: none of the old FOR ALL policies remain (0 rows).
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('lcf_own','payments_own','affiliates_own','storage_own','wg_payment_methods_own','crypto_txns_own');

-- Verification 3: both guard triggers exist (2 rows), and the meter runs as
-- its owner (prosecdef = true).
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgname IN ('trg_users_guard_protected','trg_vault_documents_guard');
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'update_storage_usage';
