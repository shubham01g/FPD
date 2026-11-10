-- 054 — Pre-production fixes from the 2026-11-10 re-audit.
--
-- 1. Contact verification can only be set by the server (S1).
--    contacts.verification_status / id_verified_at / id_verified_by were
--    writable by the owner's own browser, so an owner could mark a Guardian
--    "verified" and skip admin ID review (Guardian access opens on verified).
--    The 046 guard trigger now also pins these for any signed-in caller;
--    the edge function (service role, auth.uid() IS NULL) still sets them on
--    invite, ID approval/rejection and claim approval.
--
-- 2. Attachments that had nowhere to live:
--      memories.document_urls              award certificates
--      password_vault.document_urls        supporting documents
--      subscription_tracker.document_urls  bills / statements
--      digital_assets.document_urls        account statements
--    and password_vault.importance (normal | high | critical) — "High" was
--    lost because only the starred boolean existed.
--
-- 3. Backup-code guesses are limited (S4):
--      account_2fa_settings.backup_failed_attempts / backup_locked_until
--
-- 4. Admin invite tokens are stored as a SHA-256 hash only (S5):
--      admin_accounts.invite_token_hash; existing plaintext tokens are hashed
--      in place and cleared, so links already emailed keep working.
--
-- Idempotent.

-- 1 ── contact verification guard ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_contact_link_columns()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.contact_user_id := NULL; NEW.accepted_at := NULL;
      NEW.invite_token_hash := NULL; NEW.invite_token_expires_at := NULL;
      NEW.verification_status := 'not_sent';
      NEW.id_verified_at := NULL; NEW.id_verified_by := NULL;
    ELSE
      NEW.contact_user_id         := OLD.contact_user_id;
      NEW.accepted_at             := OLD.accepted_at;
      NEW.invite_token_hash       := OLD.invite_token_hash;
      NEW.invite_token_expires_at := OLD.invite_token_expires_at;
      NEW.verification_status     := OLD.verification_status;
      NEW.id_verified_at          := OLD.id_verified_at;
      NEW.id_verified_by          := OLD.id_verified_by;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
ALTER FUNCTION public.guard_contact_link_columns() SET search_path = public;

DROP TRIGGER IF EXISTS trg_contacts_link_guard ON public.contacts;
CREATE TRIGGER trg_contacts_link_guard
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contact_link_columns();

-- 2 ── attachment columns ───────────────────────────────────────────────────
ALTER TABLE public.memories             ADD COLUMN IF NOT EXISTS document_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.password_vault       ADD COLUMN IF NOT EXISTS document_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.subscription_tracker ADD COLUMN IF NOT EXISTS document_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.digital_assets       ADD COLUMN IF NOT EXISTS document_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.password_vault ADD COLUMN IF NOT EXISTS importance TEXT NOT NULL DEFAULT 'normal';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_vault_importance_check') THEN
    ALTER TABLE public.password_vault
      ADD CONSTRAINT password_vault_importance_check CHECK (importance IN ('normal', 'high', 'critical'));
  END IF;
END $$;
-- Starred entries were the "critical" ones.
UPDATE public.password_vault SET importance = 'critical' WHERE starred AND importance = 'normal';

-- 3 ── backup-code attempt limit ────────────────────────────────────────────
ALTER TABLE public.account_2fa_settings ADD COLUMN IF NOT EXISTS backup_failed_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.account_2fa_settings ADD COLUMN IF NOT EXISTS backup_locked_until TIMESTAMPTZ;

-- 4 ── hashed admin invite tokens ───────────────────────────────────────────
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS invite_token_hash TEXT;
UPDATE public.admin_accounts
   SET invite_token_hash = encode(extensions.digest(invite_token, 'sha256'), 'hex'),
       invite_token = NULL
 WHERE invite_token IS NOT NULL;
