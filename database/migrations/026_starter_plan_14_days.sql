-- 026 — Starter is a 14-day introductory plan.
--
-- Every new signup now starts on the $1.99 Starter plan. The account may stay
-- on it for 14 days; after that the app shows only an upgrade screen until a
-- bigger plan is chosen (StarterUpgradeWall.tsx). Existing accounts keep the
-- plan they already have.
--
-- The clock is users.starter_started_at: stamped the first time an account is
-- on Starter and never reset, so leaving and coming back does not buy another
-- 14 days. The 14 itself lives in the app (utils/starterPlan.ts).
--
-- Every statement is idempotent, so this is safe to run more than once.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS starter_started_at TIMESTAMPTZ;

-- Accounts already on Starter get a full 14 days from the day this is applied
-- rather than being walled retroactively.
UPDATE public.users SET starter_started_at = NOW()
WHERE plan = 'starter' AND starter_started_at IS NULL;

-- users_own_data lets an account update its own row, so the rules have to
-- hold here rather than in the client. auth.uid() is NULL for the service
-- role, which leaves admin edits (PATCH /admin/users/:id) unrestricted.
CREATE OR REPLACE FUNCTION public.enforce_starter_plan_window()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL THEN
    -- The clock is not the account's to move.
    NEW.starter_started_at := OLD.starter_started_at;
    -- Starter is where an account begins, not somewhere it can return to.
    IF NEW.plan = 'starter' AND OLD.plan <> 'starter' THEN
      RAISE EXCEPTION 'The Starter plan is only available for the first 14 days of a new account';
    END IF;
  END IF;

  IF NEW.plan = 'starter' AND NEW.starter_started_at IS NULL THEN
    NEW.starter_started_at := NOW();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_users_starter_window ON public.users;
CREATE TRIGGER trg_users_starter_window
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_starter_plan_window();

-- New signups start on Starter. Body is otherwise identical to
-- 023_two_factor_auth.sql's version.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Staff accounts (concierge, and anything else we add later) set
  -- account_type in user_metadata at creation time. They are not customers.
  IF NEW.raw_user_meta_data->>'account_type' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, full_name, plan, gender, birthdate, country, device_type, referral_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'starter',
    NEW.raw_user_meta_data->>'gender',
    NULLIF(NEW.raw_user_meta_data->>'birthdate', '')::date,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'device_type',
    NEW.raw_user_meta_data->>'referral_source'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
