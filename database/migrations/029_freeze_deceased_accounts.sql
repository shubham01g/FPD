-- 029 — A deceased account is frozen at the database, not just in the UI.
--
-- Mark Deceased (migration 027) stamps users.deceased_at. The portal then
-- shows a "frozen" notice instead of the app (App.tsx), but that alone would
-- leave the account's own session free to write through the API. These
-- RESTRICTIVE policies close that: once the signed-in account is marked
-- deceased it can no longer insert, update or delete its own rows.
--
-- Reads are left alone (the portal has to read the profile to know it is
-- frozen). Nothing changes for legacy contacts — the check is on the CALLER's
-- account, not the row owner's — or for admins, who use the service role.
-- Storage buckets are not covered here; the frozen portal offers no upload UI.
--
-- Idempotent — safe to run more than once.

CREATE OR REPLACE FUNCTION public.account_is_frozen()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND deceased_at IS NOT NULL);
$$;

-- Every RLS-enabled public table that holds per-account data (a user_id or
-- owner_user_id column), plus users itself.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN pg_class pc ON pc.relname = c.table_name AND pc.relnamespace = 'public'::regnamespace
    WHERE c.table_schema = 'public'
      AND pc.relkind = 'r'
      AND pc.relrowsecurity
      AND (c.column_name IN ('user_id', 'owner_user_id') OR c.table_name = 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_insert ON public.%I', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_update ON public.%I', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS frozen_no_delete ON public.%I', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.account_is_frozen())', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.account_is_frozen())', t.table_name);
    EXECUTE format('CREATE POLICY frozen_no_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.account_is_frozen())', t.table_name);
  END LOOP;
END $$;
