-- ============================================================
-- 016 — RECORD PHOTOS STORAGE BUCKET
-- ============================================================
-- Until now every photo picked in the app (PhotoPicker, and the pet
-- record uploader) was kept only as a `blob:` object URL and written
-- into columns like favorite_places.photo_url. Those URLs are scoped to
-- the browsing context that created them, so the moment the tab was
-- refreshed the row pointed at nothing and the card rendered blank.
--
-- This bucket is the missing destination. It is PRIVATE — unlike the
-- pre-existing `profile-photos` bucket, which is world-readable to
-- anyone who learns an object URL. The photos going in here are of
-- people's homes, vehicles, pets, IDs and travel, which is exactly the
-- material this product promises to keep sealed, so reads go through
-- short-lived signed URLs instead (see services/supabase.ts).
--
-- Objects are stored at "{user_id}/{uuid}.webp" — the policy scopes
-- every operation to the first path segment matching the caller's uid,
-- the same shape already used by vault-documents and id-verifications.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('record-photos', 'record-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "record_photos_owner_rw" ON storage.objects;
CREATE POLICY "record_photos_owner_rw"
  ON storage.objects FOR ALL
  USING      (bucket_id = 'record-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'record-photos' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- CONTACTS PHOTO COLUMN
-- ============================================================
-- ContactsHub has offered a "Contact Photo" picker since it was built,
-- but `contacts` never had anywhere to put it — the value was carried in
-- React state and silently dropped on insert. Every other screen with a
-- photo picker already has photo_url (migration 007); this is the one
-- table that was missed.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS photo_url TEXT;   -- Storage path in record-photos


-- ============================================================
-- VERIFY — expect 1 bucket row (public = false), 1 policy row, 1 column.
-- ============================================================
SELECT id, name, public FROM storage.buckets WHERE id = 'record-photos';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname = 'record_photos_owner_rw';

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'photo_url';
