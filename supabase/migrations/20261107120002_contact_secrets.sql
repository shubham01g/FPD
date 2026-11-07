-- 047 — The Preset Security Word and Security Question actually work.
--
-- Until now the Add Contact form collected a secret word and a security
-- question/answer for Legacy and Guardian Contacts, then dropped them: nothing
-- stored them and the claim portal never asked for them.
--
-- contact_secrets   one row per contact that has a verification setup.
--   methods         what the owner ticked ('death_cert','security_word',
--                   'security_qa','govt_id', ...). death_cert is always there.
--   word_hash       bcrypt of the secret word, exactly as typed.
--   question        the security question, in plain text (the claimant has
--                   to be shown it).
--   answer_hash     bcrypt of the answer, lower-cased and trimmed, so
--                   "Elm Street" and "elm street " both count.
-- Only hashes are stored: nobody, including Final Pass Down, can read a word
-- back. A forgotten word can only be replaced by the owner.
--
-- RLS is on with no policies, so the table can't be read from the browser at
-- all. The owner goes through two SECURITY DEFINER functions that check
-- ownership and never return a hash; the claim portal check runs on the
-- server with the service role.
--
-- legacy_claims gains the claim-time result:
--   secret_attempts     wrong answers so far
--   secret_verified_at  when the claimant passed
--   secret_locked_at    set on the 5th wrong answer; the portal then refuses
--                       until an admin issues a new link (routes/legacy.ts).
--
-- Every statement is idempotent, so this is safe to run more than once.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.contact_secrets (
  contact_id  UUID PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  methods     TEXT[] NOT NULL DEFAULT ARRAY['death_cert'],
  word_hash   TEXT,
  question    TEXT,
  answer_hash TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.contact_secrets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.legacy_claims ADD COLUMN IF NOT EXISTS secret_attempts    INT NOT NULL DEFAULT 0;
ALTER TABLE public.legacy_claims ADD COLUMN IF NOT EXISTS secret_verified_at TIMESTAMPTZ;
ALTER TABLE public.legacy_claims ADD COLUMN IF NOT EXISTS secret_locked_at   TIMESTAMPTZ;

-- What the Edit Contact window shows. Never returns a hash.
CREATE OR REPLACE FUNCTION public.get_contact_verification(p_contact_id UUID)
RETURNS TABLE (methods TEXT[], question TEXT, has_word BOOLEAN, has_answer BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = p_contact_id AND c.owner_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.methods, s.question, s.word_hash IS NOT NULL, s.answer_hash IS NOT NULL
      FROM public.contact_secrets s WHERE s.contact_id = p_contact_id;
END; $$;

-- Saves the owner's choices. An empty p_word / p_answer keeps the one already
-- stored, so editing other fields doesn't make the owner retype the word.
-- Unticking a method clears what belonged to it.
CREATE OR REPLACE FUNCTION public.set_contact_verification(
  p_contact_id UUID, p_methods TEXT[], p_word TEXT, p_question TEXT, p_answer TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v_old      public.contact_secrets;
  v_methods  TEXT[] := ARRAY(SELECT DISTINCT unnest(array_append(COALESCE(p_methods, '{}'), 'death_cert')));
  v_word     TEXT;
  v_question TEXT;
  v_answer   TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = p_contact_id AND c.owner_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Contact not found' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_old FROM public.contact_secrets WHERE contact_id = p_contact_id;

  IF 'security_word' = ANY(v_methods) THEN
    v_word := CASE WHEN COALESCE(p_word, '') <> '' THEN crypt(p_word, gen_salt('bf')) ELSE v_old.word_hash END;
    IF v_word IS NULL THEN RAISE EXCEPTION 'Enter a secret word' USING ERRCODE = '22023'; END IF;
  END IF;

  IF 'security_qa' = ANY(v_methods) THEN
    v_question := NULLIF(btrim(COALESCE(p_question, '')), '');
    v_answer := CASE WHEN btrim(COALESCE(p_answer, '')) <> ''
                     THEN crypt(lower(btrim(p_answer)), gen_salt('bf')) ELSE v_old.answer_hash END;
    IF v_question IS NULL OR v_answer IS NULL THEN
      RAISE EXCEPTION 'Enter a security question and its answer' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.contact_secrets (contact_id, methods, word_hash, question, answer_hash, updated_at)
  VALUES (p_contact_id, v_methods, v_word, v_question, v_answer, NOW())
  ON CONFLICT (contact_id) DO UPDATE
    SET methods = EXCLUDED.methods, word_hash = EXCLUDED.word_hash, question = EXCLUDED.question,
        answer_hash = EXCLUDED.answer_hash, updated_at = NOW();
END; $$;

-- The claim portal's check (server only). Counts the attempt and locks on the
-- 5th wrong one in the same statement, so parallel guesses can't slip past.
CREATE OR REPLACE FUNCTION public.check_claim_secret(p_claim_id UUID, p_word TEXT, p_answer TEXT)
RETURNS TABLE (ok BOOLEAN, attempts INT, locked BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v_claim public.legacy_claims;
  v_s     public.contact_secrets;
  v_ok    BOOLEAN := TRUE;
BEGIN
  SELECT * INTO v_claim FROM public.legacy_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found'; END IF;
  IF v_claim.secret_locked_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_claim.secret_attempts, TRUE; RETURN;
  END IF;
  IF v_claim.secret_verified_at IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_claim.secret_attempts, FALSE; RETURN;
  END IF;

  SELECT * INTO v_s FROM public.contact_secrets WHERE contact_id = v_claim.contact_id;
  IF v_s.word_hash IS NOT NULL AND 'security_word' = ANY(v_s.methods) THEN
    v_ok := v_ok AND COALESCE(p_word, '') <> '' AND crypt(p_word, v_s.word_hash) = v_s.word_hash;
  END IF;
  IF v_s.answer_hash IS NOT NULL AND 'security_qa' = ANY(v_s.methods) THEN
    v_ok := v_ok AND btrim(COALESCE(p_answer, '')) <> ''
                 AND crypt(lower(btrim(p_answer)), v_s.answer_hash) = v_s.answer_hash;
  END IF;

  IF v_ok THEN
    UPDATE public.legacy_claims SET secret_verified_at = NOW() WHERE id = p_claim_id;
    RETURN QUERY SELECT TRUE, v_claim.secret_attempts, FALSE;
  ELSE
    UPDATE public.legacy_claims
       SET secret_attempts  = secret_attempts + 1,
           secret_locked_at = CASE WHEN secret_attempts + 1 >= 5 THEN NOW() END
     WHERE id = p_claim_id;
    RETURN QUERY SELECT FALSE, v_claim.secret_attempts + 1, v_claim.secret_attempts + 1 >= 5;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.get_contact_verification(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_contact_verification(UUID, TEXT[], TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_claim_secret(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_contact_verification(UUID, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_claim_secret(UUID, TEXT, TEXT) TO service_role;
