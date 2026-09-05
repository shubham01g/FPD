-- ============================================================
-- 013 — family_friends.group_category
--
-- The screen sorts every contact into one of four fixed buckets —
-- immediate / extended / friends / other — which drives the sidebar and the
-- filter tabs. The table has `group_id`, but that is a foreign key to
-- contact_groups (the user's own named groups like "Estate Team"), not the
-- fixed category. They are two different things and a contact has both.
--
-- Custom group membership deliberately gets NO column here: contact_groups
-- already owns it via member_contact_ids, so storing it on both sides would
-- be two places to disagree.
-- ============================================================

ALTER TABLE public.family_friends
  ADD COLUMN IF NOT EXISTS group_category TEXT NOT NULL DEFAULT 'other';
