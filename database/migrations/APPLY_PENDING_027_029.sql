-- ============================================================
-- Migrations 027 + 028 + 029 — Legacy claims (Mark Deceased, claim
-- portal, review queue), the two remaining card processors, and the
-- database-level freeze of deceased accounts.
-- Every statement is idempotent, so this is safe to run more than once.
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- ============================================================

-- 027 — Legacy claims: mark an account deceased, the claim portal, the review queue.
--
-- Flow (matches the fpdv3 layout):
--   1. Admin marks an account holder deceased (Master Admin → Users) and picks
--      which legacy contacts get a claim link. One legacy_claims row per
--      contact, status 'link_sent', each with its own token.
--   2. The contact opens /legacy-claim/<token> — no login — confirms identity
--      and uploads documents. Status → 'pending_review'.
--   3. Admin reviews in Master Admin → Legacy Claims: approve, reject, or
--      request more documents ('awaiting_docs', portal re-opens).
--   4. An approved claim makes the account's paid $199 fee "ready to activate"
--      in the $199 Fee tab; activation itself is still the admin's click.
--
-- Everything here is reached through the service role only (admin routes and
-- the token-checked public routes), so RLS is on with no policies — the same
-- arrangement as the id-verifications bucket.
--
-- Every statement is idempotent, so this is safe to run more than once.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deceased_at   TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_death DATE;

CREATE TABLE IF NOT EXISTS public.legacy_claims (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_ref           TEXT NOT NULL UNIQUE,             -- CLM-2026-0044, shown to admins and claimants
  owner_user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id          UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  token               TEXT NOT NULL UNIQUE,             -- the secret in the emailed link
  token_expires_at    TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'link_sent'
                      CHECK (status IN ('link_sent','pending_review','awaiting_docs','approved','rejected')),
  date_of_death       DATE,
  -- Claimant. Seeded from the contact row, then confirmed/corrected in the portal.
  claimant_name         TEXT NOT NULL,
  claimant_email        TEXT NOT NULL,
  claimant_phone        TEXT,
  claimant_relationship TEXT,
  claimant_id_type      TEXT,
  claimant_id_last4     TEXT,                            -- last 4 digits only, as typed in the portal
  requested_access      TEXT NOT NULL DEFAULT 'Full Legacy Access',
  -- Claimant says the death certificate has not arrived yet.
  death_cert_override   BOOLEAN NOT NULL DEFAULT FALSE,
  link_message        TEXT,                              -- admin's note included with the link
  admin_notes         TEXT,
  rejection_reason    TEXT,
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_claims_owner  ON public.legacy_claims(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_claims_status ON public.legacy_claims(status);

CREATE TABLE IF NOT EXISTS public.legacy_claim_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id    UUID NOT NULL REFERENCES public.legacy_claims(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL
              CHECK (doc_type IN ('death_certificate','claimant_id','will','power_of_attorney','obituary','hospital_records','other')),
  file_path   TEXT NOT NULL,                             -- path in the legacy-claims bucket
  file_name   TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (claim_id, doc_type)                            -- a re-upload replaces the slot
);

-- The Timeline tab of the claim review window.
CREATE TABLE IF NOT EXISTS public.legacy_claim_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id   UUID NOT NULL REFERENCES public.legacy_claims(id) ON DELETE CASCADE,
  event      TEXT NOT NULL,
  actor      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('system','claimant','admin','warn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_claim_events_claim ON public.legacy_claim_events(claim_id, created_at);

ALTER TABLE public.legacy_claims          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_claim_events    ENABLE ROW LEVEL SECURITY;

-- Private bucket for the uploaded claim documents. No storage policies: only
-- the service role reads or writes it, and admins see files through
-- short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('legacy-claims', 'legacy-claims', FALSE)
ON CONFLICT (id) DO NOTHING;


-- 028 — The two card processors the Payment Processors screen offers that
-- were never seeded. Stripe, PayPal, Square and Braintree have been in
-- crypto_processor_configs since 001; Authorize.Net and Adyen complete the
-- catalog in admin/processorCatalog.ts. Both start disconnected.
--
-- Idempotent — safe to run more than once.

INSERT INTO public.crypto_processor_configs (id, name, enabled, is_default) VALUES
  ('authorize', 'Authorize.Net', FALSE, FALSE),
  ('adyen',     'Adyen',         FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;


-- 029 — A deceased account is frozen at the database, not just in the UI.
--
-- Mark Deceased (migration 027) stamps users.deceased_at. The portal then
-- shows a "frozen" notice instead of the app (App.tsx), but that alone would
-- leave the account's own session free to write through the API. These
-- RESTRICTIVE policies close that: once the signed-in account is marked
-- deceased it can no longer insert, update or delete its own rows.
--
-- Reads are left alone (the portal has to read the profile to know it is
-- frozen). Nothing changes for legacy contacts — the check is on the CALLER's
-- account, not the row owner's — or for admins, who use the service role.
-- Storage buckets are not covered here; the frozen portal offers no upload UI.
--
-- Idempotent — safe to run more than once.

CREATE OR REPLACE FUNCTION public.account_is_frozen()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND deceased_at IS NOT NULL);
$$;

-- Every RLS-enabled public table that holds per-account data (a user_id or
-- owner_user_id column), plus users itself.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name AND pc.relnamespace = 'public'::regnamespace
    WHERE c.table_schema = 'public'
      AND pc.relkind = 'r'
      AND pc.relrowsecurity
      AND (c.column_name IN ('user_id', 'owner_user_id') OR c.table_name = 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_insert ON public.%I', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_update ON public.%I', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_delete ON public.%I', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.account_is_frozen())', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.account_is_frozen())', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.account_is_frozen())', t.table_name);
  END LOOP;
END $$;
