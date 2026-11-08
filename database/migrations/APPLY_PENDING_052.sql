-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_051.sql. Same SQL as
-- 052_email_templates_live.sql, followed by a check.

-- 052 — Admin → Email Templates now changes the emails that are sent.
--
-- The editor edited email_templates, but the table was empty and nothing
-- read it: every email is built in code (supabase/functions/server/lib/
-- email.ts). Now sendEmail() looks up the active row whose trigger_event
-- is the email's category and applies it:
--   subject   replaces the subject; {{subject}} is the built-in subject,
--             {{app_name}} is "Final Pass Down"
--   html      wraps the body; {{content}} is the built-in body. A template
--             without {{content}} is ignored for the body (so a mistake
--             can't send an empty email), but its subject still applies.
-- Turning a row off (is_active = false) goes back to the built-in email.
--
-- One row per email the platform sends, all passthrough to start with, so
-- nothing changes until an admin edits one. Idempotent.

INSERT INTO public.email_templates (id, category, name, subject, trigger_event, variables, html, is_active) VALUES
  ('otp',                      'Security',  'Sign-in / verification code',        '{{subject}}', 'otp',                      ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('vault_reset',              'Security',  'Vault passphrase reset link',        '{{subject}}', 'vault_reset',              ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('admin_invite',             'Security',  'Admin portal invitation',            '{{subject}}', 'admin_invite',             ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('contact_invite',           'Contacts',  'Legacy / Guardian contact invite',   '{{subject}}', 'contact_invite',           ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('id_decision',              'Contacts',  'ID verification decision',           '{{subject}}', 'id_decision',              ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('legacy_claim',             'Legacy',    'Legacy claim link',                  '{{subject}}', 'legacy_claim',             ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('legacy_claim_alert',       'Legacy',    'Legacy claim alert (staff)',         '{{subject}}', 'legacy_claim_alert',       ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('claim_decision',           'Legacy',    'Legacy claim decision',              '{{subject}}', 'claim_decision',           ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('legacy_access_live',       'Legacy',    'Legacy access is live',              '{{subject}}', 'legacy_access_live',       ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('loved_one_message',        'Messages',  'Message to a loved one delivered',   '{{subject}}', 'loved_one_message',        ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('receipt_package',          'Messages',  'Receipts sent to an accountant',     '{{subject}}', 'receipt_package',          ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('concierge_session',        'Concierge', 'White Glove session booked/moved',   '{{subject}}', 'concierge_session',        ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('concierge_message',        'Concierge', 'Message from a specialist',          '{{subject}}', 'concierge_message',        ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('concierge_waiver',         'Concierge', 'Authorization waiver request',       '{{subject}}', 'concierge_waiver',         ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('billing_payment_failed',   'Billing',   'Renewal payment failed',             '{{subject}}', 'billing_payment_failed',   ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('billing_overage_declined', 'Billing',   'Storage overage payment declined',   '{{subject}}', 'billing_overage_declined', ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('billing_renewal_reminder', 'Billing',   'Annual renewal reminder',            '{{subject}}', 'billing_renewal_reminder', ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('billing_admin_alert',      'Billing',   'Billing alert (staff)',              '{{subject}}', 'billing_admin_alert',      ARRAY['subject','content','app_name'], '{{content}}', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Check: expect 18 or more active templates.
SELECT count(*) AS active_templates FROM public.email_templates WHERE is_active;
