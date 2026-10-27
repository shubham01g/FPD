-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_042.sql. Same SQL as
-- 043_vault_reset_links.sql, followed by a check.

-- 043 — client "what's missing" list, item 1a: reset a forgotten vault
-- passphrase through a link emailed to the account's registered address.
--
-- The vault is zero-knowledge (014): nobody can recover what a forgotten
-- passphrase protected. "Reset" therefore means: prove you own the account
-- (signed in AND holding the emailed link), then ERASE the encrypted fields
-- and let the owner create a new passphrase. Titles, websites, usernames,
-- amounts, dates and notes are kept.
--
-- vault_reset_tokens  one row per emailed link. Only a SHA-256 of the link's
--                     token is stored, so a database read can't produce a
--                     working link. Single use (used_at), 45-minute expiry
--                     (expires_at, set by the server). RLS on with no
--                     policies: only the edge function (service role) reads
--                     or writes it.
--
-- reset_vault_for(user)  the wipe itself, in one transaction. SECURITY
--                     DEFINER and executable by service_role ONLY — the edge
--                     function calls it after checking the link and the
--                     signed-in user match. Browsers cannot call it.
--
-- Needs 042 (the two_fa encrypted columns). Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.vault_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vault_reset_tokens_user_idx ON public.vault_reset_tokens (user_id, created_at DESC);

ALTER TABLE public.vault_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reset_vault_for(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed INTEGER := 0;
  n       INTEGER;
BEGIN
  -- password_vault.encrypted_password is NOT NULL, so it becomes ''.
  UPDATE public.password_vault
     SET encrypted_password            = '',
         encrypted_security_answer     = NULL,
         encrypted_backup_codes        = NULL,
         encrypted_two_fa_instructions = NULL
   WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; changed := changed + n;

  UPDATE public.subscription_tracker
     SET encrypted_password            = NULL,
         encrypted_backup_codes        = NULL,
         encrypted_two_fa_instructions = NULL
   WHERE user_id = p_user;
  GET DIAGNOSTICS n = ROW_COUNT; changed := changed + n;

  UPDATE public.users
     SET vault_salt = NULL, vault_verifier = NULL
   WHERE id = p_user;

  RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_vault_for(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_vault_for(UUID) TO service_role;

-- Verification: should return 2 rows — the table and the function.
SELECT 'table' AS kind, tablename AS name FROM pg_tables
 WHERE schemaname = 'public' AND tablename = 'vault_reset_tokens'
UNION ALL
SELECT 'function', proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'reset_vault_for';
