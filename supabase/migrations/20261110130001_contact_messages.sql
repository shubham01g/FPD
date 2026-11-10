-- 055 — Contact Us messages.
--
-- The public Contact Us form used to open the visitor's own mail app
-- (mailto:), so nothing was sent if they had none set up and nothing was
-- recorded. POST /public/contact (routes/public.ts) now emails the chosen
-- department through SendGrid — the sender's address is the reply-to — and
-- keeps a copy here. The edge function (service role) is the only reader and
-- writer; the rows also drive its per-email / per-IP rate limit.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  sent_to      TEXT NOT NULL,
  ip_address   TEXT,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_time ON public.contact_messages (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_ip_time    ON public.contact_messages (ip_address, created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge function) can read or write.
REVOKE ALL ON public.contact_messages FROM anon, authenticated;
