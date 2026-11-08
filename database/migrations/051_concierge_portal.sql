-- 051 — The Concierge Portal runs on real data.
--
-- The portal's sign-in was real, but everything after it lived in browser
-- memory (clients, sessions, waivers, scheduling links, document inbox) and
-- its emails, calendar invites and calls were timers. The edge function's
-- new /concierge routes (routes/conciergePortal.ts) now read and write:
--   wg_clients, wg_sessions        assigned clients and their sessions
--   wg_waivers                     authorization waivers, signed by the
--                                  client through an emailed link
--   vault_documents                documents a specialist uploads to a
--                                  client's vault (only after the waiver)
--
-- New columns:
--   wg_sessions.meeting_url           the Zoom/Meet/phone link for the session
--   wg_waivers.token_hash             sha256 of the emailed signing link token
--   wg_waivers.token_expires_at       the link works for 14 days
--
-- Staff never touch these tables from the browser; RLS stays as it is and
-- the edge function (service role) checks that the client is assigned to
-- the signed-in specialist.
--
-- Idempotent.

ALTER TABLE public.wg_sessions ADD COLUMN IF NOT EXISTS meeting_url TEXT;

ALTER TABLE public.wg_waivers
  ADD COLUMN IF NOT EXISTS token_hash       TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wg_waivers_token ON public.wg_waivers(token_hash) WHERE token_hash IS NOT NULL;
