-- 058 — Audit #4, phase 3 (2026-11-13): reminder + storage alert emails,
-- and per-plan contact limits that are actually enforced.

-- 1. Per-plan Max Contacts (Admin → Subscription Config).
--    The limit is per kind, as the plan cards say ("1 each" on Starter,
--    "3 each" on Foundation): Legacy and Guardian contacts are counted
--    separately. Emergency / pet emergency contacts are not limited.
--    -1 = unlimited. Only NEW contacts are refused, so an account that is
--    over the limit after a downgrade keeps what it has (none are, today).
CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_max   INTEGER;
  v_plan  TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.contact_type NOT IN ('legacy', 'guardian') THEN RETURN NEW; END IF;
  SELECT u.plan, sp.max_contacts INTO v_plan, v_max
    FROM public.users u JOIN public.subscription_plans sp ON sp.id = u.plan
   WHERE u.id = NEW.owner_user_id;
  IF v_max IS NULL OR v_max < 0 THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.contacts
   WHERE owner_user_id = NEW.owner_user_id AND contact_type = NEW.contact_type;
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'plan_contact_limit: Your plan allows % % contact%. Upgrade your plan to add more.',
      v_max, NEW.contact_type, CASE WHEN v_max = 1 THEN '' ELSE 's' END
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS contacts_plan_limit ON public.contacts;
CREATE TRIGGER contacts_plan_limit
  BEFORE INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_limit();
REVOKE EXECUTE ON FUNCTION public.enforce_contact_limit() FROM PUBLIC, anon, authenticated;

-- 2. Which reminder / storage-alert emails have gone out, so each is sent
--    once (the job runs hourly). Service role only: no policies.
CREATE TABLE IF NOT EXISTS public.reminder_deliveries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source     TEXT NOT NULL,   -- reminder | occasion | warranty | id | subscription | storage_80 …
  source_id  TEXT NOT NULL,   -- the record id (the user id for storage alerts)
  due_on     DATE NOT NULL,   -- the occurrence (first of the month for storage alerts)
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_id, due_on)
);
CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_user ON public.reminder_deliveries(user_id);
ALTER TABLE public.reminder_deliveries ENABLE ROW LEVEL SECURITY;

-- 3. Storage used vs the plan allowance, per account, measured exactly as
--    billing measures it (storage_bytes_for, migration 040).
CREATE OR REPLACE FUNCTION public.storage_usage_snapshot()
RETURNS TABLE (user_id UUID, used_bytes BIGINT, limit_bytes BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, public.storage_bytes_for(u.id), sp.storage_gb::BIGINT * 1073741824
    FROM public.users u JOIN public.subscription_plans sp ON sp.id = u.plan
   WHERE u.deceased_at IS NULL AND sp.storage_gb > 0;
$$;
REVOKE EXECUTE ON FUNCTION public.storage_usage_snapshot() FROM PUBLIC, anon, authenticated;

-- 4. The two new emails, editable in Admin → Email Templates like the rest.
INSERT INTO public.email_templates (id, category, name, subject, trigger_event, variables, html, is_active) VALUES
  ('reminder_digest', 'Reminders', 'Reminders due (daily)',  '{{subject}}', 'reminder_digest', ARRAY['subject','content','app_name'], '{{content}}', TRUE),
  ('storage_alert',   'Reminders', 'Storage almost full',    '{{subject}}', 'storage_alert',   ARRAY['subject','content','app_name'], '{{content}}', TRUE)
ON CONFLICT (id) DO NOTHING;
