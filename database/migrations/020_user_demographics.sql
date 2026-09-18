-- Backs the MasterAdmin Analytics tab's Gender/Age/Country/Device/Acquisition
-- panels, which previously had no column to read from anywhere (see the
-- "NotCollected" empty states in admin/MasterAdmin.tsx and the comment header
-- in supabase/functions/server/routes/analytics.ts). Adds the columns and
-- extends the signup trigger to persist them going forward.
--
-- Existing accounts have no history to backfill from — these columns start
-- NULL for the 13 users that predate this migration and fill in only as
-- people complete their profile in Account Settings.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender           TEXT,
  ADD COLUMN IF NOT EXISTS birthdate        DATE,
  ADD COLUMN IF NOT EXISTS country          TEXT,
  ADD COLUMN IF NOT EXISTS device_type      TEXT, -- 'mobile' | 'tablet' | 'desktop', detected client-side at signup
  ADD COLUMN IF NOT EXISTS referral_source  TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE public.users ADD CONSTRAINT users_gender_check
  CHECK (gender IS NULL OR gender IN ('female','male','nonbinary','prefer_not_to_say'));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_device_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_device_type_check
  CHECK (device_type IS NULL OR device_type IN ('mobile','tablet','desktop'));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_birthdate_check;
ALTER TABLE public.users ADD CONSTRAINT users_birthdate_check
  CHECK (birthdate IS NULL OR birthdate <= CURRENT_DATE);

-- Re-create the signup trigger function to also persist whatever demographic
-- fields the signup form collected (passed through Supabase Auth's
-- raw_user_meta_data, same mechanism full_name already uses). Any field the
-- signup form doesn't send stays NULL, same as a pre-existing account.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, plan, gender, birthdate, country, device_type, referral_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'foundation',
    NEW.raw_user_meta_data->>'gender',
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'device_type',
    NEW.raw_user_meta_data->>'referral_source'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
