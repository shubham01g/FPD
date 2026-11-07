-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_045.sql. Same SQL as
-- 046_contact_access.sql, followed by a check.

-- 046 — Legacy and Guardian Contacts can actually open what they were given.
--
-- Until now a contact had no sign-in and nothing linked a contact row to a
-- person: the claim flow ended at "approved + fee activated" and no screen
-- ever showed the contact anything. This adds the link.
--
-- contacts.contact_user_id   the Final Pass Down login of the person named.
--                            Set by the server when they accept the emailed
--                            invite (/contact-accept/:token) while signed in.
-- contacts.accepted_at       when that happened.
-- contacts.invite_token_hash SHA-256 of the token in the newest invite or
--                            "access is live" email. Only the hash is stored,
--                            so a database read can't produce a working link.
--                            Each new email replaces it (older links die).
-- contacts.invite_token_expires_at
--
-- What a contact may see is decided by the edge function (routes/
-- contactAccess.ts) on every request, with the service role:
--   guardian  verified, and only the folders in allowed_folder_ids
--   legacy    an approved claim + an activated, unexpired continuation fee
-- So no new RLS is added, and the one old contact path in RLS is removed:
-- docs_download_gate matched contacts by email and, being FOR ALL, would have
-- let a legacy contact rename or delete the owner's documents. It stays as
-- the owner's own read/write policy (038 relies on it for rename/move).
--
-- Idempotent — safe to re-run.

ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS contact_user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS accepted_at             TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS invite_token_hash       TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_contact_user ON public.contacts(contact_user_id) WHERE contact_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_invite_token ON public.contacts(invite_token_hash) WHERE invite_token_hash IS NOT NULL;

-- The owner edits contact rows directly (RLS contacts_own), but the link and
-- the token are only the server's to write — same guard style as 038.
CREATE OR REPLACE FUNCTION public.guard_contact_link_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.contact_user_id := NULL; NEW.accepted_at := NULL;
      NEW.invite_token_hash := NULL; NEW.invite_token_expires_at := NULL;
    ELSE
      NEW.contact_user_id         := OLD.contact_user_id;
      NEW.accepted_at             := OLD.accepted_at;
      NEW.invite_token_hash       := OLD.invite_token_hash;
      NEW.invite_token_expires_at := OLD.invite_token_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_contacts_link_guard ON public.contacts;
CREATE TRIGGER trg_contacts_link_guard
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contact_link_columns();

DROP POLICY IF EXISTS "docs_download_gate" ON public.vault_documents;
CREATE POLICY "docs_download_gate" ON public.vault_documents
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Check: expect 4 columns, the guard trigger, and docs_download_gate
--    without legacy_contact_can_access in its expression.
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'contacts'
   AND column_name IN ('contact_user_id','accepted_at','invite_token_hash','invite_token_expires_at')
 ORDER BY column_name;
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_contacts_link_guard';
SELECT policyname, cmd, qual FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'vault_documents' AND policyname = 'docs_download_gate';
