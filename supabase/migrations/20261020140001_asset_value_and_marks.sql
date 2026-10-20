-- 034 — client "what's missing" list, Personal Assets quick wins.
--
--   * weapons.identifying_marks     — engravings, custom grips, scratches;
--                                     anything beyond the serial that tells
--                                     one firearm from another
--   * weapons_locker.current_value  — estimated value of a bladed item
--
-- Firearms estimated value uses weapons.current_value and collectibles
-- "Location of Item" uses collectibles.storage_location; both columns already
-- exist (migration 007), so they need nothing here. The *_own RLS policies
-- already cover every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.weapons
  ADD COLUMN IF NOT EXISTS identifying_marks TEXT;

ALTER TABLE public.weapons_locker
  ADD COLUMN IF NOT EXISTS current_value NUMERIC(14,2);
