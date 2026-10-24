-- Hourly billing rollover (GO_LIVE_CHECKLIST.md, Phase A and Phase D).
--
-- Closes ended storage usage periods and bills overage that monthly renewals
-- don't carry, by calling the edge function's /internal/billing/rollover
-- every hour at :07. Run it in the Supabase SQL Editor by hand; it is a
-- template, not a migration, because it holds a secret and names the
-- function to call.
--
-- Before running:
--   1. Set CRON_SECRET as an Edge Function secret (a long random string).
--   2. Replace <PASTE CRON_SECRET> below with the same value. It goes into
--      Supabase Vault, not into this file — don't save the file with it.
--   3. Replace <FUNCTION> with server-billing while testing (Phase A/B), and
--      run it again with server at cutover (Phase D).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store (or replace) the secret in Vault.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'billing_cron_secret') THEN
    PERFORM vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'billing_cron_secret'), '<PASTE CRON_SECRET>');
  ELSE
    PERFORM vault.create_secret('<PASTE CRON_SECRET>', 'billing_cron_secret');
  END IF;
END $$;

-- (Re)schedule the job. cron.schedule replaces a job with the same name.
SELECT cron.schedule(
  'billing-rollover',
  '7 * * * *',
  $job$
  SELECT net.http_post(
    url     := 'https://evedkmczpuficbzsvhts.supabase.co/functions/v1/<FUNCTION>/make-server-b5ad85e0/internal/billing/rollover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'billing_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);

-- Check: the job exists, and (after an hour) its last runs and responses.
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'billing-rollover';
-- SELECT status, return_message, start_time FROM cron.job_run_details
--  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'billing-rollover') ORDER BY start_time DESC LIMIT 5;
-- SELECT status_code, content::text, created FROM net._http_response ORDER BY created DESC LIMIT 5;
