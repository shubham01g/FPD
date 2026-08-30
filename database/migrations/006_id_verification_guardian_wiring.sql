-- ============================================================
-- Final Pass Down — ID Verification & Guardian Folder Wiring
-- Supabase PostgreSQL Migration 006
--
-- Connects the Legacy Contact ID-verification flow and Guardian
-- Contact folder assignment to real data instead of client-only
-- state:
--   - contacts.allowed_folder_ids was typed UUID[] but the app's
--     folders are string category ids ("legal", "financial", ...)
--     — retype it to TEXT[] so it can actually hold what the UI stores.
--   - public.id_verifications had no RLS at all. It now allows an
--     account owner to submit and view verifications for their own
--     contacts, but never to approve/reject — only the admin service
--     role (which bypasses RLS) can flip status, so the user-facing
--     app can no longer self-approve a legacy contact.
--   - a private storage bucket for the scanned ID documents backing
--     those id_verifications rows.
--
-- Depends on 001_initial_schema.sql (public.contacts, public.id_verifications).
-- ============================================================

-- ============================================================
-- GUARDIAN FOLDER IDS: UUID[] -> TEXT[]
-- ============================================================
ALTER TABLE public.contacts
  ALTER COLUMN allowed_folder_ids TYPE TEXT[] USING allowed_folder_ids::text[];

-- ============================================================
-- ID VERIFICATIONS: ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;

-- Account owners can see the verification submissions for their own contacts.
CREATE POLICY "id_verifications_owner_select" ON public.id_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = id_verifications.contact_id AND c.owner_user_id = auth.uid()
    )
  );

-- Account owners can submit a new verification for their own contact, but
-- only ever as "pending" — approving/rejecting is admin-only (service role,
-- which bypasses RLS entirely) via supabase/functions/server/routes/verification.ts.
CREATE POLICY "id_verifications_owner_insert" ON public.id_verifications
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.id = id_verifications.contact_id AND c.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: ID VERIFICATION DOCUMENTS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verifications', 'id-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- Objects are stored at "{owner_user_id}/{contact_id}/{filename}" — the
-- owner can upload and view their own contacts' documents; admin review
-- happens via the service-role client, which bypasses storage RLS too.
CREATE POLICY "id_verifications_owner_rw"
  ON storage.objects FOR ALL
  USING (bucket_id = 'id-verifications' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'id-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);
