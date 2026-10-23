-- 036 — client "what's missing" list, Phase 3: receipts tie into Taxes.
--
-- receipts
--   * tax_year        the return this receipt counts toward; defaults in the
--                     UI to the year of receipt_date, but can differ (a
--                     January receipt for last year's return)
--   * tax_deductible  marked by the owner; Financial Records > Taxes totals
--                     these per tax_year and links back to them
--
-- The Financial Records contact/address and accountant-phone fields need no
-- migration: each record's fields live in financial_records.details JSONB.
-- The receipts_own RLS policy already covers every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS tax_year       SMALLINT,
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS receipts_user_tax_year_idx
  ON public.receipts (user_id, tax_year) WHERE tax_deductible;
