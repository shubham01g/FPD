-- ============================================================
-- 015 — columns the Personal Assets tabs actually collect
--
-- Migration 007 created vehicles, real_estate, digital_assets, weapons,
-- weapons_locker and collectibles as "Phase 5 groundwork", before the six
-- Personal Assets tabs were read closely. Wiring them up exposed fields the
-- UI has always asked for that had nowhere to go.
--
-- Every statement is guarded, so running this twice is safe.
-- ============================================================


-- ── Vehicles ────────────────────────────────────────────────
-- The form asks who holds the title, which is a different person from the
-- lienholder often enough to be worth its own column.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS title_holder TEXT;


-- ── Real estate ─────────────────────────────────────────────
-- The form is address-first and never asks for a property "name", so the
-- NOT NULL on property_name would reject every row the UI can produce.
ALTER TABLE public.real_estate
  ALTER COLUMN property_name DROP NOT NULL;

ALTER TABLE public.real_estate
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS mortgage_payment NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS title_holder TEXT,
  ADD COLUMN IF NOT EXISTS year_built TEXT,
  ADD COLUMN IF NOT EXISTS sqft TEXT,
  ADD COLUMN IF NOT EXISTS bed_bath TEXT,
  ADD COLUMN IF NOT EXISTS lot_size TEXT;


-- ── Digital assets ──────────────────────────────────────────
-- "Holdings" is the quantity held (e.g. "0.5 BTC"), which is not the same
-- thing as account_identifier and was being lost.
ALTER TABLE public.digital_assets
  ADD COLUMN IF NOT EXISTS holdings TEXT;


-- ── Weapons ─────────────────────────────────────────────────
-- Who the item passes to. The estate context is the whole point of the tab.
ALTER TABLE public.weapons
  ADD COLUMN IF NOT EXISTS transfer_to TEXT;


-- ── Weapons locker ──────────────────────────────────────────
-- This table was designed for a physical locker (locker_name, location,
-- access_code_hint, key_holder_contact) but the tab it backs is an inventory
-- of BLADED WEAPONS — knives, a katana, a tomahawk — each with a blade and
-- handle description. The original columns are left in place and stay
-- nullable; these are the ones the screen actually fills in.
ALTER TABLE public.weapons_locker
  ALTER COLUMN locker_name DROP NOT NULL;

ALTER TABLE public.weapons_locker
  ADD COLUMN IF NOT EXISTS item_type TEXT,
  ADD COLUMN IF NOT EXISTS make TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS blade TEXT,
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS transfer_to TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';


-- ── Collectibles ────────────────────────────────────────────
ALTER TABLE public.collectibles
  ADD COLUMN IF NOT EXISTS intended_for TEXT,
  ADD COLUMN IF NOT EXISTS serial_number TEXT;


-- ============================================================
-- VERIFY — expect 20 rows (1 vehicles + 7 real_estate + 1 digital_assets
--                        + 1 weapons + 8 weapons_locker + 2 collectibles).
-- ============================================================
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'vehicles'        AND column_name = 'title_holder') OR
    (table_name = 'real_estate'     AND column_name IN ('city','mortgage_payment','title_holder','year_built','sqft','bed_bath','lot_size')) OR
    (table_name = 'digital_assets'  AND column_name = 'holdings') OR
    (table_name = 'weapons'         AND column_name = 'transfer_to') OR
    (table_name = 'weapons_locker'  AND column_name IN ('item_type','make','model','blade','handle','transfer_to','photo_url','document_urls')) OR
    (table_name = 'collectibles'    AND column_name IN ('intended_for','serial_number'))
  )
ORDER BY table_name, column_name;
