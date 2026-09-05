-- ============================================================
-- 012 — pet_records: three fields the screen collects but the table
--       had nowhere to put.
--
-- pet_records was created in 007 with single-value columns where the UI
-- collects lists. Wiring it as-is would have quietly dropped all three:
--
--   photos[]       the form takes several photos; photo_url holds one
--   instructions[] care instructions with a contact name and phone each;
--                  no column at all
--   feedings[]     food type, time of day, quantity and where the food is
--                  kept, per feeding; feeding_instructions is a single TEXT
--
-- The existing photo_url and feeding_instructions columns are left alone so
-- nothing that already reads them breaks.
-- ============================================================

-- Several photos per pet, not one.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';

-- [{ name, phone, description }] — who to call and what they do.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS instructions JSONB NOT NULL DEFAULT '[]';

-- [{ foodType, timeType, quantity, locationOfFood }] — a caregiver needs the
-- structure, not a paragraph, to actually feed the animal correctly.
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS feedings JSONB NOT NULL DEFAULT '[]';
