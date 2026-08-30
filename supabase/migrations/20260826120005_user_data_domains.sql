-- ============================================================
-- Final Pass Down — User Data Domains
-- Supabase PostgreSQL Migration 005
--
-- Adds the tables backing DemoContext's remaining data domains
-- (final wishes, allergies, medications, reminders, memories,
-- occasions), a trigger that creates a public.users row on real
-- Supabase Auth signup, and the storage buckets/policies needed
-- for the Digital File Cabinet to store real files.
--
-- Depends on 001_initial_schema.sql (public.users, public.handle_updated_at()).
-- ============================================================

-- ============================================================
-- AUTO-CREATE public.users ON SIGNUP
-- ============================================================
-- RLS across the schema keys off auth.uid() = public.users.id, so a
-- real Supabase Auth signup must produce a matching public.users row
-- with the same id. Without this trigger every table's RLS policy
-- would silently reject the new user's own data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'foundation'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FINAL WISHES
-- ============================================================
CREATE TABLE public.final_wishes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  item        TEXT NOT NULL,
  recipient   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_final_wishes_user ON public.final_wishes(user_id);
ALTER TABLE public.final_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "final_wishes_own" ON public.final_wishes FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_final_wishes_updated BEFORE UPDATE ON public.final_wishes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ALLERGIES
-- ============================================================
CREATE TABLE public.allergies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('severe','moderate','mild')),
  reaction    TEXT,
  type        TEXT,
  diagnosed   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_allergies_user ON public.allergies(user_id);
ALTER TABLE public.allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergies_own" ON public.allergies FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_allergies_updated BEFORE UPDATE ON public.allergies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- MEDICATIONS
-- ============================================================
CREATE TABLE public.medications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dose        TEXT,
  frequency   TEXT,
  condition   TEXT,
  prescriber  TEXT,
  pharmacy    TEXT,
  refill_date TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medications_user ON public.medications(user_id);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medications_own" ON public.medications FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_medications_updated BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE public.reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_date    TEXT,
  frequency   TEXT,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due_soon','overdue','completed')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reminders_user ON public.reminders(user_id);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_own" ON public.reminders FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- MEMORIES (Family Memories — distinct from diary_entries)
-- ============================================================
CREATE TABLE public.memories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  memory_date TEXT,
  type        TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('photo','video','note')),
  description TEXT,
  tags        TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_memories_user ON public.memories(user_id);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memories_own" ON public.memories FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_memories_updated BEFORE UPDATE ON public.memories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- OCCASIONS
-- ============================================================
CREATE TABLE public.occasions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  occasion_date TEXT,
  type        TEXT NOT NULL CHECK (type IN ('birthday','anniversary','holiday')),
  recipient   TEXT,
  notes       TEXT,
  recurring   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_occasions_user ON public.occasions(user_id);
ALTER TABLE public.occasions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occasions_own" ON public.occasions FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_occasions_updated BEFORE UPDATE ON public.occasions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('vault-documents', 'vault-documents', false),
  ('profile-photos',  'profile-photos',  true)
ON CONFLICT (id) DO NOTHING;

-- Objects are stored at "{user_id}/{filename}" — the policies below
-- scope access to the first path segment matching the caller's uid.
CREATE POLICY "vault_documents_owner_rw"
  ON storage.objects FOR ALL
  USING (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_owner_write"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_owner_update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_owner_delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
