-- Real web-push (VAPID) subscriptions, one row per browser/device a user has
-- opted into device push on. Backs the "Push Notifications" toggle in
-- AccountSettings and the admin Push Notification Center's "Push" channel —
-- both previously had no delivery mechanism at all (in-app only; see
-- routes/notifications.ts's prior header comment).
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subs_own ON public.push_subscriptions;
CREATE POLICY push_subs_own ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin fan-out on send goes through the service-role client in the edge
-- function, which bypasses RLS — no separate admin policy needed.
