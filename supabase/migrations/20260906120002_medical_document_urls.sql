-- ============================================================
-- 017 — DOCUMENT ATTACHMENTS FOR ALLERGIES AND MEDICATIONS
-- ============================================================
-- MedicalInfo has offered "Attach Document (allergy test, prescription)"
-- and "(prescription, pharmacy receipt)" since it was built, but neither
-- `allergies` nor `medications` had anywhere to record one — so the
-- handler could only ever toast and throw the file away.
--
-- Every other screen with an AttachDocumentField already has
-- document_urls (migration 007). These are the two tables that were
-- missed. TEXT[] matches kids_activities / job_history /
-- daycare_records; travel_trips uses JSONB, which is the outlier.
--
-- Values are Storage PATHS in the private vault-documents bucket, not
-- URLs — the same convention migration 016 established for photos.
-- ============================================================

ALTER TABLE public.allergies
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';


-- ============================================================
-- VERIFY — expect 2 rows.
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('allergies','medications')
  AND column_name = 'document_urls'
ORDER BY table_name;
