-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_043.sql. Same SQL as
-- 044_client_items_9_14.sql, followed by a check.

-- 044 — client list items 9, 10, 11 and 14.
--
-- 9   Keepsakes move into Collectibles. The Keepsakes tab in Family &
--     Memories is gone; every old memories row with type 'keepsake' is
--     copied into collectibles under the 'Keepsake / Heirloom' category.
--     source_memory_id records where each copy came from, so re-running
--     never copies a row twice. The original memories rows are LEFT IN PLACE
--     (no screen shows them any more) so the move can be undone.
--       title -> item_name, tags[1] -> storage_location ('—' = blank),
--       recipient -> intended_for, media_url -> photo_url,
--       first number in tags[2] -> current_value; when tags[2] was more than
--       a plain amount (e.g. 'Sentimental'), it is kept in notes.
-- 10  Goals: goal_status (soon / in_progress / achieved), est. start date,
--     projected completion date, steps [{text, done}]. The picture uses the
--     existing media_url. achieved stays and mirrors goal_status.
-- 11  Pet records: favorite toy, bedding, treats, travel instructions and a
--     medications list [{name, dose, frequency, notes}].
-- 14  Medical info: do you drink, do you smoke, alternative parts
--     (implants, prosthetics, transplants).
--
-- Idempotent — safe to re-run.

-- ── 10. Goals ────────────────────────────────────────────────────────
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS goal_status TEXT
    CHECK (goal_status IN ('soon','in_progress','achieved')),
  ADD COLUMN IF NOT EXISTS start_date  DATE,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS steps       JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.memories
   SET goal_status = CASE WHEN achieved THEN 'achieved' ELSE 'in_progress' END
 WHERE type = 'goal' AND goal_status IS NULL;

-- ── 11. Pet records ──────────────────────────────────────────────────
ALTER TABLE public.pet_records
  ADD COLUMN IF NOT EXISTS favorite_toy        TEXT,
  ADD COLUMN IF NOT EXISTS bedding             TEXT,
  ADD COLUMN IF NOT EXISTS treats              TEXT,
  ADD COLUMN IF NOT EXISTS travel_instructions TEXT,
  ADD COLUMN IF NOT EXISTS medications         JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ── 14. Medical info ─────────────────────────────────────────────────
ALTER TABLE public.medical_emergency_info
  ADD COLUMN IF NOT EXISTS alcohol_use          TEXT,
  ADD COLUMN IF NOT EXISTS tobacco_use          TEXT,
  ADD COLUMN IF NOT EXISTS implants_prosthetics TEXT;

-- ── 9. Keepsakes -> Collectibles ─────────────────────────────────────
ALTER TABLE public.collectibles
  ADD COLUMN IF NOT EXISTS source_memory_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS collectibles_source_memory_id_key
  ON public.collectibles (source_memory_id) WHERE source_memory_id IS NOT NULL;

INSERT INTO public.collectibles
  (user_id, item_name, category, storage_location, intended_for, photo_url,
   current_value, notes, source_memory_id, created_at)
SELECT m.user_id,
       m.title,
       'Keepsake / Heirloom',
       NULLIF(NULLIF(btrim(m.tags[1]), '—'), ''),
       NULLIF(btrim(m.recipient), ''),
       NULLIF(m.media_url, ''),
       -- only a plausible amount is cast, so one odd value can't fail the copy
       CASE WHEN v.amt ~ '^[0-9]{1,10}(\.[0-9]+)?$' THEN round(v.amt::NUMERIC, 2) END,
       NULLIF(concat_ws(E'\n\n',
         NULLIF(btrim(m.description), ''),
         CASE WHEN btrim(coalesce(m.tags[2], '')) !~ '^~?\$?\s*[0-9][0-9,]*(\.[0-9]+)?$'
                   AND btrim(coalesce(m.tags[2], '')) <> ''
              THEN 'Value noted: ' || btrim(m.tags[2]) END
       ), ''),
       m.id,
       m.created_at
  FROM public.memories m
  CROSS JOIN LATERAL (
    SELECT replace(substring(m.tags[2] FROM '([0-9][0-9,]*(\.[0-9]+)?)'), ',', '') AS amt
  ) v
 WHERE m.type = 'keepsake'
   AND NOT EXISTS (SELECT 1 FROM public.collectibles c WHERE c.source_memory_id = m.id);

-- Verification: should return 4 rows, each with the column count shown.
SELECT table_name, count(*) AS new_columns
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (table_name, column_name) IN (
     ('memories','goal_status'), ('memories','start_date'), ('memories','target_date'), ('memories','steps'),
     ('pet_records','favorite_toy'), ('pet_records','bedding'), ('pet_records','treats'),
     ('pet_records','travel_instructions'), ('pet_records','medications'),
     ('medical_emergency_info','alcohol_use'), ('medical_emergency_info','tobacco_use'),
     ('medical_emergency_info','implants_prosthetics'),
     ('collectibles','source_memory_id'))
 GROUP BY table_name ORDER BY table_name;
-- expected: collectibles 1 · medical_emergency_info 3 · memories 4 · pet_records 5

-- Keepsakes copied: the two numbers must match.
SELECT (SELECT count(*) FROM public.memories WHERE type = 'keepsake')            AS old_keepsakes,
       (SELECT count(*) FROM public.collectibles WHERE source_memory_id IS NOT NULL) AS copied_to_collectibles;
