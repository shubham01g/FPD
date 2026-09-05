-- ============================================================
-- 010 — favorite_places.visit_frequency
--
-- The table has `visited BOOLEAN`, but the screen has never asked a yes/no
-- question. Its "Visited" field is free text describing how often you go —
-- "Almost daily", "Every summer", "Sunday mornings" — which a boolean cannot
-- hold. Wiring the UI to the boolean would have silently thrown that text away
-- on every save.
--
-- `visited` stays as it is (still a useful been-there flag, and something may
-- already read it); the frequency gets its own column.
-- ============================================================

ALTER TABLE public.favorite_places
  ADD COLUMN IF NOT EXISTS visit_frequency TEXT;
