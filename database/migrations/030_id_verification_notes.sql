-- 030 — internal admin notes on an ID verification.
--
-- Kept in their own table rather than as a column on id_verifications: the
-- account owner can read their contacts' id_verifications rows (migration 006),
-- and reviewer notes must not be visible to them. RLS is on with no policies,
-- so only the service-role admin backend (routes/verification.ts) can read or
-- write this table.
--
-- Idempotent — safe to run more than once.

CREATE TABLE IF NOT EXISTS public.id_verification_notes (
  verification_id UUID PRIMARY KEY REFERENCES public.id_verifications(id) ON DELETE CASCADE,
  notes           TEXT NOT NULL DEFAULT '',
  updated_by      UUID,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.id_verification_notes ENABLE ROW LEVEL SECURITY;