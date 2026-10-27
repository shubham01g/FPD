-- Paste into the Supabase SQL Editor. Same SQL as 042_two_factor_details.sql,
-- followed by a check that the new columns exist.

-- 042 — client "what's missing" list, item 1a (Phase 5a): the "extra code".
--
-- A legacy contact with the right password can still be stopped by the
-- account's own 2-step verification. Password Manager and Auto Pay entries
-- now record how that code arrives and how the contact can get it.
--
-- password_vault and subscription_tracker
--   * two_fa_method                  sms | email | authenticator | phone_call
--                                    | security_key | other; NULL = no extra code
--   * two_fa_destination             "phone ending 4421" — plain metadata
--   * encrypted_backup_codes         ciphertext from vaultCrypto, like the password
--   * encrypted_two_fa_instructions  ciphertext — tends to hold phone PINs and
--                                    where the phone is kept
--
-- password_vault.two_fa_enabled stays as the on/off flag the KPI tile counts.
-- The existing *_own RLS policies already cover every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.password_vault
  ADD COLUMN IF NOT EXISTS two_fa_method TEXT
    CHECK (two_fa_method IN ('sms','email','authenticator','phone_call','security_key','other')),
  ADD COLUMN IF NOT EXISTS two_fa_destination            TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_backup_codes        TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_two_fa_instructions TEXT;

ALTER TABLE public.subscription_tracker
  ADD COLUMN IF NOT EXISTS two_fa_method TEXT
    CHECK (two_fa_method IN ('sms','email','authenticator','phone_call','security_key','other')),
  ADD COLUMN IF NOT EXISTS two_fa_destination            TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_backup_codes        TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_two_fa_instructions TEXT;

-- Verification: should return 8 rows (4 columns x 2 tables).
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('password_vault','subscription_tracker')
  AND column_name IN ('two_fa_method','two_fa_destination','encrypted_backup_codes','encrypted_two_fa_instructions')
ORDER BY table_name, column_name;
