-- Two-step verification: SMS, Email OTP and Google Authenticator.
--
-- account_2fa_settings already existed (001_initial_schema.sql) but nothing in
-- the app ever read or wrote it — AccountSettings' 2FA tab was entirely mock
-- state. This migration makes the table safe to rely on, adds the server-side
-- record that backs the email-OTP login gate, and stops concierge auth users
-- (024) from leaking into the customer list.
--
-- Factor ownership after this migration:
--   authenticator -> Supabase native TOTP factor  (auth.mfa_factors, real AAL2)
--   sms           -> Supabase native phone factor (auth.mfa_factors, real AAL2)
--   email_otp     -> Twilio Verify email channel via the edge function
-- account_2fa_settings is the mirror the admin portal reads; auth.mfa_factors
-- is the source of truth for the two native methods.

-- ── 1. account_2fa_settings: close the write hole ───────────────────
-- The original policy was FOR ALL USING (user_id = auth.uid()). An attacker
-- holding a stolen password has a valid AAL1 session *before* the second
-- factor is challenged, so that policy let them UPDATE the row to
-- enabled = false via PostgREST and walk straight past 2FA.
--
-- Reads stay self-service; every write now goes through routes/twoFactor.ts,
-- which only writes after Twilio or Supabase has actually approved a code.
DROP POLICY IF EXISTS "user_own_2fa" ON public.account_2fa_settings;
DROP POLICY IF EXISTS user_read_own_2fa ON public.account_2fa_settings;
CREATE POLICY user_read_own_2fa ON public.account_2fa_settings
  FOR SELECT USING (user_id = auth.uid());

-- The E.164 number the phone factor is bound to. Deliberately NOT users.phone:
-- that one is a freely editable profile field, and editing a profile should
-- never silently move where someone's login codes are delivered.
ALTER TABLE public.account_2fa_settings ADD COLUMN IF NOT EXISTS phone TEXT;

-- Re-point the key at auth.users. Two-step verification belongs to a sign-in
-- identity, not to a customer record: concierge staff (024) are real auth users
-- with no public.users row on purpose, and under the original key they could
-- never have enrolled at all. public.users.id is already the auth.users id, so
-- every existing row satisfies the new constraint unchanged.
ALTER TABLE public.account_2fa_settings
  DROP CONSTRAINT IF EXISTS account_2fa_settings_user_id_fkey;
ALTER TABLE public.account_2fa_settings
  ADD CONSTRAINT account_2fa_settings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Column-level grants so totp_secret and backup_codes are unreadable from the
-- browser even by the row's owner. RLS cannot scope columns, only rows.
-- NOTE: this makes `select *` fail for authenticated callers — the frontend
-- must name columns explicitly (services/twoFactor.ts does).
REVOKE ALL ON public.account_2fa_settings FROM anon, authenticated;
GRANT SELECT (user_id, enabled, method, phone, phone_verified, email_verified, enabled_at, updated_at)
  ON public.account_2fa_settings TO authenticated;

-- ── 2. two_factor_sessions ──────────────────────────────────────────
-- Supabase Auth only supports 'totp' and 'phone' factor types, so an email-OTP
-- user necessarily holds a valid AAL1 session while their code is being
-- checked — there is no AAL2 to reach. This table is the server-side record
-- that a specific session cleared the email-OTP gate, keyed by the session_id
-- claim that Supabase puts in every JWT.
--
-- Service-role only: RLS is on with no policy for authenticated, so the edge
-- function is the only thing that can read or write it.
CREATE TABLE IF NOT EXISTS public.two_factor_sessions (
  session_id  UUID PRIMARY KEY,
  -- auth.users, not public.users: staff sign-ins (024) have no customer row.
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_2fa_sessions_user ON public.two_factor_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_expiry ON public.two_factor_sessions (expires_at);

ALTER TABLE public.two_factor_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.two_factor_sessions FROM anon, authenticated;

COMMENT ON TABLE public.two_factor_sessions IS
  'Sessions that cleared the email-OTP login gate. Written only by routes/twoFactor.ts.';

-- Helper so the email-OTP gate can later be enforced in RLS on the data tables
-- themselves rather than only in the client. Nothing calls it yet — it exists
-- so that promotion is a policy change, not another migration.
--   e.g. CREATE POLICY docs_own ON public.vault_documents
--          FOR ALL USING (auth.uid() = user_id AND public.session_passed_2fa());
CREATE OR REPLACE FUNCTION public.session_passed_2fa()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
  SELECT CASE
    -- No 2FA configured, or a native factor already took the session to aal2.
    WHEN COALESCE(auth.jwt()->>'aal', 'aal1') = 'aal2' THEN TRUE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.account_2fa_settings s
      WHERE s.user_id = auth.uid() AND s.enabled
    ) THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.two_factor_sessions t
      WHERE t.session_id = (auth.jwt()->>'session_id')::uuid
        AND t.expires_at > now()
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.session_passed_2fa() TO authenticated;

-- ── 3. Keep non-customer auth users out of public.users ─────────────
-- 024 turns concierge staff into real auth.users rows so they can hold a
-- native MFA factor. Without this guard the signup trigger would mint a
-- public.users row for each one, inflating the admin Users list, the customer
-- count and every analytics tile that counts rows in that table.
--
-- Body is otherwise identical to 020_user_demographics.sql's version.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Staff accounts (concierge, and anything else we add later) set
  -- account_type in user_metadata at creation time. They are not customers.
  IF NEW.raw_user_meta_data->>'account_type' IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
