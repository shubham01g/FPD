-- 045 — client list item 13: changing the sign-in email from Account
-- Settings.
--
-- The profile screen asks Supabase Auth to change the address
-- (supabase.auth.updateUser({ email })). Auth emails a confirmation link and
-- only rewrites auth.users.email once that link is clicked. Nothing copied
-- the new address onto public.users, so the profile, admin screens and
-- every email this app sends would keep using the old one.
--
-- This trigger follows auth.users.email onto public.users.email after the
-- change is confirmed. SECURITY DEFINER because the auth service, not the
-- signed-in user, performs that update (same as handle_new_user in 005).
-- Email is not a column the guard trigger in 038 protects.
--
-- Idempotent — safe to re-run.

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_on_auth_user_email_changed ON auth.users;
CREATE TRIGGER trg_on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- One-off catch-up for any address already changed without the trigger.
UPDATE public.users u
   SET email = a.email
  FROM auth.users a
 WHERE a.id = u.id AND a.email IS NOT NULL AND a.email IS DISTINCT FROM u.email;
