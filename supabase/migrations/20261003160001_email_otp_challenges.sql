-- 026 — Email OTP codes move from Twilio Verify to SendGrid.
--
-- Under 023 the email_otp factor was sent and checked by Twilio Verify's email
-- channel, so Twilio held the codes. The edge function now generates the code
-- itself and sends it through SendGrid (lib/emailOtp.ts), so the challenge has
-- to live somewhere server-side. That is this table.
--
-- Only sha256(user_id:code) is stored — never the code — and each row is
-- single-use, expires after 10 minutes and is burned after 5 wrong guesses.
-- Service-role only: RLS on, no policies, all grants revoked. The browser
-- cannot see whether a challenge exists, let alone its hash.
--
-- Idempotent; safe to run more than once.

CREATE TABLE IF NOT EXISTS public.email_otp_challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- auth.users, not public.users: concierge staff (024) have no customer row.
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  attempts    INT  NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves both "latest open challenge for this user" and the per-user send
-- rate limit (count of rows created in the last 15 minutes).
CREATE INDEX IF NOT EXISTS idx_email_otp_user_created
  ON public.email_otp_challenges (user_id, created_at DESC);

ALTER TABLE public.email_otp_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_otp_challenges FROM anon, authenticated;

COMMENT ON TABLE public.email_otp_challenges IS
  'Hashed email OTP codes sent via SendGrid. Written only by lib/emailOtp.ts.';
