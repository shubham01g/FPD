-- 050 — Messages to Loved Ones are really delivered; notification
-- preferences are really saved.
--
-- 1. messages_to_loved_ones promised "Sent by email on the exact date you
--    choose" and "Released to the named recipient once your passing is
--    verified", but nothing ever sent anything and no recipient address was
--    stored. New columns:
--      recipient_email            where the message goes
--      delivery_token_hash        sha256 of the private link's token
--      delivery_token_expires_at  the link works for 30 days
--      delivery_error             last failure, shown to the owner
--    delivered_at already exists (for yearly messages: the last delivery).
--    The edge function's /internal/messages/deliver runs hourly at :17
--    (scheduled below) and sends what is due; /public/message/:token shows it.
--
-- 2. notification_preferences: the Account Settings toggles (email, SMS,
--    storage alerts, contact updates, marketing) were screen-only. One row
--    per user, owner-only RLS.
--
-- The cron job reuses the Vault secret 'billing_cron_secret' that the
-- billing-rollover job already uses (same CRON_SECRET), so nothing has to
-- be pasted.
--
-- Idempotent.

ALTER TABLE public.messages_to_loved_ones
  ADD COLUMN IF NOT EXISTS recipient_email           TEXT,
  ADD COLUMN IF NOT EXISTS delivery_token_hash       TEXT,
  ADD COLUMN IF NOT EXISTS delivery_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_error            TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_delivery_token
  ON public.messages_to_loved_ones(delivery_token_hash) WHERE delivery_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email           BOOLEAN NOT NULL DEFAULT TRUE,
  sms             BOOLEAN NOT NULL DEFAULT FALSE,
  storage_alerts  BOOLEAN NOT NULL DEFAULT TRUE,
  contact_updates BOOLEAN NOT NULL DEFAULT TRUE,
  marketing       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_preferences_own ON public.notification_preferences;
CREATE POLICY notification_preferences_own ON public.notification_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;

-- Hourly delivery job (needs pg_cron + pg_net, already used by billing).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'billing_cron_secret') THEN
    PERFORM cron.schedule(
      'messages-delivery',
      '17 * * * *',
      $job$
      SELECT net.http_post(
        url     := 'https://evedkmczpuficbzsvhts.supabase.co/functions/v1/server/make-server-b5ad85e0/internal/messages/deliver',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret')
        ),
        body    := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
      $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron or the billing_cron_secret Vault secret is missing: schedule messages-delivery by hand (see database/cron/billing_rollover.template.sql).';
  END IF;
END $$;
