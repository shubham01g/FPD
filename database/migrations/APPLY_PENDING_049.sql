-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_048.sql. Same SQL as
-- 049_secret_vault_pin.sql, followed by a check.

-- 049 — A real PIN on the Secret Vault.
--
-- The Digital File Cabinet's "Secret Vault" folder said "PIN required", but
-- there was no PIN: it opened like any other folder. Now:
--
--   secret_vault_pins      one row per owner: bcrypt hash of a 4-8 digit PIN,
--                          failed-attempt counter and a lock-out time.
--   secret_vault_unlocks   which sign-in session (the JWT's session_id) has
--                          entered the PIN, and until when. Signing out or a
--                          new sign-in means entering the PIN again.
--
-- Both tables have RLS on and no policies: only the edge function (service
-- role, routes/secretVault.ts) touches them.
--
-- The PIN is enforced by the database, not just by the screen. Two
-- RESTRICTIVE policies stop a signed-in browser from reading or writing
-- Secret Vault rows and files directly:
--   - vault_documents rows with category = 'secret';
--   - vault-documents objects that such a row points at, or that sit under
--     "<uid>/secret/".
-- The edge function lists them, signs download links and takes uploads only
-- for a session that has passed the PIN. is_secret_vault_path() is
-- SECURITY DEFINER because the storage policy has to see rows that the
-- vault_documents policy hides.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.secret_vault_pins (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  pin_hash        TEXT NOT NULL,
  failed_attempts INT  NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.secret_vault_pins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.secret_vault_unlocks (
  session_id UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_secret_vault_unlocks_user ON public.secret_vault_unlocks(user_id);
ALTER TABLE public.secret_vault_unlocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.secret_vault_pins, public.secret_vault_unlocks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_secret_vault_path(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (storage.foldername(p_name))[2] = 'secret'
      OR EXISTS (SELECT 1 FROM public.vault_documents d
                  WHERE d.file_path = p_name AND d.category = 'secret');
$$;
REVOKE EXECUTE ON FUNCTION public.is_secret_vault_path(TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_secret_vault_path(TEXT) TO authenticated, service_role;

DROP POLICY IF EXISTS secret_vault_server_only ON public.vault_documents;
CREATE POLICY secret_vault_server_only ON public.vault_documents
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (category IS DISTINCT FROM 'secret')
  WITH CHECK (category IS DISTINCT FROM 'secret');

DROP POLICY IF EXISTS secret_vault_files_server_only ON storage.objects;
CREATE POLICY secret_vault_files_server_only ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'vault-documents' OR NOT public.is_secret_vault_path(name))
  WITH CHECK (bucket_id <> 'vault-documents' OR NOT public.is_secret_vault_path(name));

-- ── Check: every row should say ok = true.
SELECT 'pins table exists' AS check_name, to_regclass('public.secret_vault_pins') IS NOT NULL AS ok
UNION ALL SELECT 'unlocks table exists', to_regclass('public.secret_vault_unlocks') IS NOT NULL
UNION ALL SELECT 'browser cannot read pins', NOT has_table_privilege('authenticated', 'public.secret_vault_pins', 'SELECT')
UNION ALL SELECT 'secret rows hidden from browser (policy)',
       EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vault_documents' AND policyname = 'secret_vault_server_only' AND permissive = 'RESTRICTIVE')
UNION ALL SELECT 'secret files hidden from browser (policy)',
       EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'secret_vault_files_server_only' AND permissive = 'RESTRICTIVE');
