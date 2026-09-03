-- ============================================================
-- FinalPassDown — migrations 010-013, ready to paste into the
-- Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- APPLY_PENDING.sql covers 008 and 009 only; this file continues
-- from there. Every statement is guarded with IF NOT EXISTS, so
-- running it twice is safe and running it after a partial apply
-- picks up only what is missing.
--
-- PREREQUISITE: migration 007 must already be applied — it is what
-- creates favorite_places, kids_activities, pet_records and
-- family_friends. If this script errors with "relation ... does not
-- exist", run 007_remaining_domains.sql first.
--
-- Verify BEFORE running (expect 0 rows) and AFTER (expect 6) with the
-- query at the bottom of this file.
-- ============================================================


-- ============================================================
-- 010 — favorite_places.visit_frequency
-- The table has `visited BOOLEAN`, but the screen's "Visited" field is free
-- text describing how often you go ("Almost daily", "Every summer"), which a
-- boolean cannot hold. `visited` stays; the frequency gets its own column.
-- ============================================================
ALTER TABLE public.favorite_places
  ADD COLUMN IF NOT EXISTS visit_frequency TEXT;


-- ============================================================
-- 011 — kids_activities.uniform_details
-- Same mismatch: `uniform_required BOOLEAN` keeps the yes and loses the
-- detail ("Team jersey #7, shin guards, cleats"), which is the only part a
-- caregiver needs. The flag stays; the description gets its own column.
-- ============================================================
ALTER TABLE public.kids_activities
  ADD COLUMN IF NOT EXISTS uniform_details TEXT;


-- ============================================================
-- 012 — pet_records: three fields the screen collects but the table
--       had nowhere to put. photo_url and feeding_instructions are
--       left alone so nothing already reading them breaks.
-- ============================================================
-- Several photos per pet, not one.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

-- [{ name, phone, description }] — who to call and what they do.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS instructions JSONB NOT NULL DEFAULT '[]';

-- [{ foodType, timeType, quantity, locationOfFood }] — a caregiver needs the
-- structure, not a paragraph, to feed the animal correctly.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS feedings JSONB NOT NULL DEFAULT '[]';


-- ============================================================
-- 013 — family_friends.group_category
-- The four fixed buckets (immediate/extended/friends/other) that drive the
-- sidebar and filter tabs. Distinct from `group_id`, which is a foreign key
-- to the user's own named contact_groups; a contact has both.
-- ============================================================
ALTER TABLE public.family_friends
  ADD COLUMN IF NOT EXISTS group_category TEXT NOT NULL DEFAULT 'other';


-- ============================================================
-- VERIFY — expect exactly 6 rows after this script runs.
-- ============================================================
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('favorite_places','visit_frequency'),
    ('kids_activities','uniform_details'),
    ('pet_records','photo_urls'),
    ('pet_records','instructions'),
    ('pet_records','feedings'),
    ('family_friends','group_category')
  )
ORDER BY table_name, column_name;
