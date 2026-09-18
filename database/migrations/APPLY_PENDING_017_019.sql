-- ============================================================
-- Bundles migrations 017, 018, 019 — everything not yet applied to the
-- live DB as of 2026-09-17. Every statement is IF NOT EXISTS / IF EXISTS
-- guarded, so this is safe to run even if some of it already landed.
-- Paste this whole file into Supabase SQL Editor and run it once.
-- ============================================================

-- ── 017 — document attachments for allergies + medications ──
ALTER TABLE public.allergies
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';

-- ── 018 — admin onboarding fields (users + partners) ──
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_waived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS white_glove         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes         TEXT,
  ADD COLUMN IF NOT EXISTS waive_reason         TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_by        TEXT;

ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_status_check;
ALTER TABLE public.partners ADD CONSTRAINT partners_status_check
  CHECK (status IN ('active','inactive','suspended','invited'));

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS invite_note TEXT;

-- ── 019 — White Label sales (partner onboarding applications) ──
CREATE TABLE IF NOT EXISTS public.wl_sales (
  id              TEXT PRIMARY KEY,
  org             TEXT NOT NULL,
  contact         TEXT NOT NULL,
  email           TEXT NOT NULL,
  package_id      TEXT NOT NULL REFERENCES public.wl_packages(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('active','pending','suspended','cancelled')),
  users_count     INTEGER NOT NULL DEFAULT 0,
  mrr             NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid      NUMERIC(10,2) NOT NULL DEFAULT 0,
  subdomain       TEXT,
  processor       TEXT,
  last_payout_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wl_sales_status ON public.wl_sales(status);
ALTER TABLE public.wl_sales ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFY — expect: allergies/medications document_urls (2 rows),
-- users' 5 new columns (5 rows), partners.invite_note (1 row),
-- and wl_sales existing (1 row, 0 count until someone applies).
-- ============================================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name IN ('allergies','medications') AND column_name = 'document_urls')
    OR (table_name = 'users' AND column_name IN ('subscription_waived','white_glove','admin_notes','waive_reason','onboarded_by'))
    OR (table_name = 'partners' AND column_name = 'invite_note')
  )
ORDER BY table_name, column_name;

SELECT 'wl_sales' AS table_name, COUNT(*) AS row_count FROM public.wl_sales;
