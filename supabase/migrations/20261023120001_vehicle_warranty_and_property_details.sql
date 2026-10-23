-- 035 — client "what's missing" list, Phase 2: vehicles and real estate.
--
-- vehicles
--   * warranty_provider / warranty_start / warranty_end
--   * service_history  JSONB array of {date, details}, newest first: the
--                      repair and service log
--
-- real_estate
--   * account_number                         mortgage / property account #
--   * contact_name / _phone / _email         HOA, caretaker, agent
--   * renter_name / _phone / _email, monthly_rent,
--     lease_start / lease_end, security_deposit
--   * management_company / management_contact
--   * special_care_instructions
--
-- Purchase price/date and the mortgage lender reuse purchase_price,
-- purchase_date and mortgage_lender (migration 007), which nothing used
-- before. The lender name used to be sent to the numeric mortgage_balance,
-- which stored 0, so those homes need the lender re-entered once.
-- The *_own RLS policies already cover every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS warranty_provider TEXT,
  ADD COLUMN IF NOT EXISTS warranty_start    DATE,
  ADD COLUMN IF NOT EXISTS warranty_end      DATE,
  ADD COLUMN IF NOT EXISTS service_history   JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.real_estate
  ADD COLUMN IF NOT EXISTS account_number            TEXT,
  ADD COLUMN IF NOT EXISTS contact_name              TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone             TEXT,
  ADD COLUMN IF NOT EXISTS contact_email             TEXT,
  ADD COLUMN IF NOT EXISTS renter_name               TEXT,
  ADD COLUMN IF NOT EXISTS renter_phone              TEXT,
  ADD COLUMN IF NOT EXISTS renter_email              TEXT,
  ADD COLUMN IF NOT EXISTS monthly_rent              NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS lease_start               DATE,
  ADD COLUMN IF NOT EXISTS lease_end                 DATE,
  ADD COLUMN IF NOT EXISTS security_deposit          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS management_company        TEXT,
  ADD COLUMN IF NOT EXISTS management_contact        TEXT,
  ADD COLUMN IF NOT EXISTS special_care_instructions TEXT;
