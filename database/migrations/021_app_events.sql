-- Backs the MasterAdmin Analytics tab's Feature Adoption Rate and Monthly
-- Engagement (DAU/MAU + session length) panels, which previously had no
-- session/event table anywhere to read from (see the header comment in
-- supabase/functions/server/routes/analytics.ts and the "NotCollected"
-- states it replaces in admin/MasterAdmin.tsx).
--
-- Client instrumentation lives in services/engagement.ts and fires from a
-- single choke point — App.tsx's UserRoute, where every portal screen
-- already funnels through one `userPage` state change — rather than being
-- wired into all ~30 individual screen components.
--
-- Known limitation: no retention/cleanup job exists yet, so this table
-- grows unbounded. Acceptable at current scale (~13 accounts); revisit
-- before this becomes a real production-volume dataset.

CREATE TABLE IF NOT EXISTS public.app_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL, -- client-generated, sessionStorage-scoped (one browser tab's visit)
  event_type  TEXT NOT NULL CHECK (event_type IN ('page_view','heartbeat')),
  path        TEXT, -- the PageId screen the event happened on
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_user_created ON public.app_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_session       ON public.app_events (session_id);
CREATE INDEX IF NOT EXISTS idx_app_events_path           ON public.app_events (path);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_events_insert_own ON public.app_events;
CREATE POLICY app_events_insert_own ON public.app_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Deliberately no SELECT policy for regular users — from the client's point
-- of view this table is write-only telemetry. Admin reads go through the
-- service-role client in the edge function, which bypasses RLS.
