-- Paste into the Supabase SQL Editor. Same SQL as 033_custom_vault_folders.sql,
-- followed by a check that the new columns and index exist.

-- 033 — user-created folders and sub-folders in the Digital File Cabinet.
--
-- The client asked whether users can make their own folder holding more than
-- one set of documents. vault_folders (initial schema) already had the shape
-- for it but nothing used it. This adds what the UI needs:
--   * description      — shown on the folder card
--   * parent_category  — a sub-folder under a built-in cabinet folder
--                        ("legal", "financial", ...), which has no row to
--                        point parent_id at
--   * updated_at       — renames
-- Documents are filed with vault_documents.category (built-in id, or 'custom'
-- with folder_id set) plus sub_category = the sub-folder's name. Both columns
-- already exist. The folders_own RLS policy already covers every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.vault_folders
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS parent_category TEXT,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Deleting a custom folder takes its sub-folders with it. (The app refuses
-- to delete a folder that still has documents filed in it.)
ALTER TABLE public.vault_folders DROP CONSTRAINT IF EXISTS vault_folders_parent_id_fkey;
ALTER TABLE public.vault_folders
  ADD CONSTRAINT vault_folders_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.vault_folders(id) ON DELETE CASCADE;

-- No two folders with the same name in the same place.
CREATE UNIQUE INDEX IF NOT EXISTS vault_folders_unique_name_per_parent
  ON public.vault_folders (user_id, COALESCE(parent_id::text, parent_category, ''), lower(name));

CREATE INDEX IF NOT EXISTS idx_vault_folders_user ON public.vault_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_folder ON public.vault_documents(folder_id);

DROP TRIGGER IF EXISTS trg_vault_folders_updated ON public.vault_folders;
CREATE TRIGGER trg_vault_folders_updated BEFORE UPDATE ON public.vault_folders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Verification: should return 3 rows.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vault_folders'
  AND column_name IN ('description','parent_category','updated_at')
ORDER BY column_name;

-- Verification: should return 1 row.
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'vault_folders_unique_name_per_parent';
