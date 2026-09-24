-- Concierge staff move onto real Supabase Auth.
--
-- The portal's sign-in was never wired to this table: ConciergeLogin compared
-- a plaintext password against an in-memory array in services/conciergeStaff.ts
-- that was empty on every refresh. A second factor needs an auth.users identity
-- to hang off, so the login has to become real before 2FA there means anything.
--
-- Staff auth users are created with user_metadata.account_type = 'concierge',
-- which the trigger guard in 023 uses to keep them out of public.users — they
-- are not customers and must not show up in the admin Users list or the
-- analytics counts.

-- ── 1. Link the roster row to its auth identity ─────────────────────
ALTER TABLE public.concierge_employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_user ON public.concierge_employees(user_id)
  WHERE user_id IS NOT NULL;

-- Supabase Auth owns the credential now. The column stays for rows invited
-- before this migration; new invites leave it NULL.
ALTER TABLE public.concierge_employees ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN public.concierge_employees.password_hash IS
  'Legacy bcrypt hash from before auth.users linkage. Unused for rows with a user_id.';

-- ── 2. Close the table off ──────────────────────────────────────────
-- This table had no RLS at all, so with Supabase's default grants any signed-in
-- user could read the entire staff roster — including password_hash and the
-- invite_token that lets someone claim an account. Admin screens reach it
-- through the service-role client in routes/concierge.ts and are unaffected.
ALTER TABLE public.concierge_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concierge_read_self ON public.concierge_employees;
CREATE POLICY concierge_read_self ON public.concierge_employees
  FOR SELECT USING (user_id = auth.uid());

-- Signing in stamps last_login_at and promotes an accepted invite to active.
-- USING excludes suspended rows, so a suspended employee cannot touch their own
-- row at all; WITH CHECK pins the resulting status to 'active', so this can
-- never be used to un-suspend or self-promote. Role stays admin-only.
DROP POLICY IF EXISTS concierge_touch_self ON public.concierge_employees;
CREATE POLICY concierge_touch_self ON public.concierge_employees
  FOR UPDATE
  USING (user_id = auth.uid() AND status <> 'suspended')
  WITH CHECK (user_id = auth.uid() AND status = 'active');

REVOKE ALL ON public.concierge_employees FROM anon, authenticated;
GRANT SELECT (id, user_id, name, email, phone, role, status, last_login_at, invited_at)
  ON public.concierge_employees TO authenticated;
GRANT UPDATE (last_login_at, status) ON public.concierge_employees TO authenticated;
