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
