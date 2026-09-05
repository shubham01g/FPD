-- ============================================================
-- 014 — per-user key material for the encrypted credential vault
--
-- password_vault.encrypted_password and subscription_tracker.encrypted_password
-- have always been named as though their contents were encrypted, and the
-- Password Manager screen shows an "AES-256 ENCRYPTED · ZERO-KNOWLEDGE"
-- banner. Nothing was encrypted: the screens never persisted at all, so the
-- claim was untested rather than false. Wiring them up made it a real
-- question, and this is the schema side of the answer.
--
-- Encryption happens in the browser (src/app/services/vaultCrypto.ts):
-- AES-GCM 256 with a key derived from a passphrase via PBKDF2-SHA256 at
-- 600,000 iterations. These two columns hold the only parts that are safe to
-- store server-side.
--
--   vault_salt      random 16 bytes, base64. Not a secret — a salt's job is
--                   to be unique per user so identical passphrases produce
--                   different keys and precomputed tables are useless.
--   vault_verifier  a known string encrypted with the derived key. Lets the
--                   app tell a correct passphrase from a wrong one without
--                   ever storing the passphrase or its hash.
--
-- Neither column can be used to recover the passphrase or decrypt anything.
-- That is the point, and it is also the trade-off: THERE IS NO PASSWORD
-- RESET. A forgotten passphrase means the encrypted fields are unrecoverable,
-- because any reset we could perform would be a backdoor we could be
-- compelled to use. The UI states this before setup.
--
-- Both are NULL until a user sets a passphrase, which is what the app uses to
-- tell "never set up" from "set up, currently locked".
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vault_salt TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vault_verifier TEXT;


-- ============================================================
-- VERIFY — expect 2 rows.
-- ============================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('vault_salt', 'vault_verifier')
ORDER BY column_name;
