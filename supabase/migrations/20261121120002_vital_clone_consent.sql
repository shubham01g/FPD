-- Vital Clone clickwrap (2026-11-21).
--
-- Before Final Pass Down shares a member's name and email with Vital Clone (a
-- separate company, reached through FPD's Vital Clone partner link), the
-- member accepts a clickwrap. Each acceptance is kept here with the exact
-- wording shown, so a later edit can't change what someone appears to have
-- agreed to. A new wording has a new version, and the member is asked again.
--
-- Written only by the server (routes/vitalCloneHandoff.ts, service role).
-- Members may read their own rows. Re-runnable.
-- Rollback: DROP TABLE public.vital_clone_consents;

CREATE TABLE IF NOT EXISTS public.vital_clone_consents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  agreement_text  TEXT NOT NULL,
  accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      TEXT,
  user_agent      TEXT,
  UNIQUE (user_id, version)
);

ALTER TABLE public.vital_clone_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vital_clone_consents_own_read ON public.vital_clone_consents;
CREATE POLICY vital_clone_consents_own_read ON public.vital_clone_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.vital_clone_consents FROM anon, authenticated;
