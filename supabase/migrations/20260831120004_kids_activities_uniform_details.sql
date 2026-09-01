-- ============================================================
-- 011 — kids_activities.uniform_details
--
-- Same shape of mismatch as 010's favorite_places.visit_frequency: the table
-- has `uniform_required BOOLEAN`, but the form field describes what the
-- uniform actually is — "Team jersey #7, shin guards, cleats (all provided by
-- league)". Saving that into a boolean would keep the yes and lose the detail,
-- which is the only part a caregiver actually needs.
--
-- `uniform_required` stays as the flag; the description gets its own column.
-- ============================================================

ALTER TABLE public.kids_activities
  ADD COLUMN IF NOT EXISTS uniform_details TEXT;
