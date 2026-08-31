-- ============================================================
-- FinalPassDown — pending schema, ready to paste into the
-- Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Combines migrations 008 and 009. Every statement is guarded
-- (IF NOT EXISTS / DROP ... IF EXISTS), so running it twice is safe.
-- ============================================================

-- ============================================================
-- 008 — Columns needed to move entitlement + disaster-recovery
--       state out of localStorage and onto the server.
--
-- wl_entitlements and disaster_recovery_state were created in 007 as
-- "Phase 7 groundwork", but the frontend still read both from localStorage,
-- which meant any user could grant themselves a paid add-on from devtools.
-- Wiring the UI to these tables needs three fields the tables did not carry.
--
-- Both tables keep their 007 policy shape on purpose: owner SELECT only, and
-- no user INSERT/UPDATE policy at all. Writes go exclusively through the
-- service-role admin backend (supabase/functions/server/routes/entitlements.ts).
-- ============================================================

-- A WL entitlement is only valid against a confirmed payment. The context has
-- always refused to unlock without a payment reference; now that check can be
-- made against a value the client cannot author.
ALTER TABLE public.wl_entitlements
  ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- The bypass is a fixed-length emergency window, so expiry is authoritative
-- state rather than something the client derives from granted_at. Storing it
-- explicitly also lets an admin issue a shorter window than the 48h default.
ALTER TABLE public.disaster_recovery_state
  ADD COLUMN IF NOT EXISTS bypass_expires_at TIMESTAMPTZ;

-- Reason code shown in the audit trail and in the user-facing banner.
ALTER TABLE public.disaster_recovery_state
  ADD COLUMN IF NOT EXISTS bypass_reason TEXT;

-- ============================================================
-- 009 — The two feature areas that had no table at all.
--
-- Everything else the app shows already has a home in the schema; these two
-- screens were the only ones whose data had nowhere to go:
--   * ReceiptsExpenses.tsx  — a personal/business receipt ledger
--   * FinancialRecords.tsx  — insurance, bank, investment, retirement, tax
--                             and business records across six tabs
--
-- Both follow the same owner-only pattern as every other user-data table.
-- ============================================================

-- ── Receipts ────────────────────────────────────────────────
-- The UI keeps a separate personal and business ledger and groups rows by
-- month, so `section` is a column rather than two tables. Amount is NUMERIC
-- (it is summed for monthly totals); the OCR fields carry the scanner's
-- confidence so a low-confidence row can still be flagged for review.
CREATE TABLE IF NOT EXISTS public.receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  section         TEXT NOT NULL DEFAULT 'personal' CHECK (section IN ('personal','business')),
  merchant        TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  receipt_date    DATE,
  category        TEXT,
  ocr_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ocr_confidence  INTEGER CHECK (ocr_confidence BETWEEN 0 AND 100),
  image_url       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Financial records ───────────────────────────────────────
-- One table across all six tabs. The tabs share most of their shape
-- (institution, masked account number, an amount, a beneficiary), and the
-- fields that differ — policy number, coverage, holdings, EIN, vesting — are
-- free text in the UI, so they live in `details` instead of forcing six
-- near-identical tables or a very wide sparse one.
CREATE TABLE IF NOT EXISTS public.financial_records (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  section                TEXT NOT NULL CHECK (section IN ('insurance','personal','portfolios','retirement','taxes','business')),
  title                  TEXT NOT NULL,
  institution            TEXT,
  account_type           TEXT,
  account_number_masked  TEXT,
  amount                 TEXT,
  beneficiary            TEXT,
  contact                TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',
  notes                  TEXT,
  details                JSONB NOT NULL DEFAULT '{}',
  document_urls          TEXT[] NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Column the Utilities screen needs ───────────────────────
-- utilities was created in 007 without anywhere to keep the bill/statement
-- the UI lets you attach to a provider.
ALTER TABLE public.utilities
  ADD COLUMN IF NOT EXISTS document_url TEXT;

-- ── RLS, indexes and updated_at triggers ────────────────────
-- Same uniform owner-only pattern used for the Phase 5 tables in 007.
-- Written idempotently so this file can be re-run safely.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['receipts','financial_records']
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%1$s_user ON public.%1$s(user_id)', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_own" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_own" ON public.%1$s FOR ALL USING (auth.uid() = user_id)', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END $$;
