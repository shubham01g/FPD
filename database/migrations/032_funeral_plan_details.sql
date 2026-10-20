-- 032 — personal funeral-planning questions requested by the client.
--
-- Adds the Funeral Planning questions that had nowhere to live on
-- funeral_plans (migration 007): burial vs cremation, burial site, ashes,
-- attire, pallbearers, final words, gravestone, regrets, etc. "Preferred
-- service location" and "special requests" reuse the existing location /
-- special_requests columns. The funeral_plans_own RLS policy already covers
-- every column, so no policy change.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.funeral_plans
  ADD COLUMN IF NOT EXISTS disposition                 TEXT,
  ADD COLUMN IF NOT EXISTS religious_beliefs           TEXT,
  ADD COLUMN IF NOT EXISTS proposed_burial_site        TEXT,
  ADD COLUMN IF NOT EXISTS prearranged_burial_site     TEXT,
  ADD COLUMN IF NOT EXISTS ashes_wishes                TEXT,
  ADD COLUMN IF NOT EXISTS burial_covered_by_insurance BOOLEAN,  -- NULL = not answered
  ADD COLUMN IF NOT EXISTS attire_for_me               TEXT,
  ADD COLUMN IF NOT EXISTS items_to_take               TEXT,
  ADD COLUMN IF NOT EXISTS attire_for_attendees        TEXT,
  ADD COLUMN IF NOT EXISTS pallbearers                 TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS final_prayer_or_speech      TEXT,
  ADD COLUMN IF NOT EXISTS celebration_location        TEXT,
  ADD COLUMN IF NOT EXISTS final_words                 TEXT,
  ADD COLUMN IF NOT EXISTS gravestone_inscription      TEXT,
  ADD COLUMN IF NOT EXISTS life_regrets                TEXT;

ALTER TABLE public.funeral_plans DROP CONSTRAINT IF EXISTS funeral_plans_disposition_check;
ALTER TABLE public.funeral_plans
  ADD CONSTRAINT funeral_plans_disposition_check
  CHECK (disposition IS NULL OR disposition IN ('burial','cremation'));
