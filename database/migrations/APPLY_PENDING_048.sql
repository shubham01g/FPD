-- Paste into the Supabase SQL Editor AFTER APPLY_PENDING_047.sql. Same SQL as
-- 048_security_hotfix.sql, followed by a check.

-- 048 — Security hotfix from the 2026-11-07 pre-production audit.
--
-- 1. admin_continuation_fee_status (migration 001) is a SECURITY DEFINER view
--    that anon and authenticated could SELECT. With nothing but the public
--    anon key, which ships in the website's JavaScript, anyone could read
--    every user's email, full name, plan and $199-fee status at
--    /rest/v1/admin_continuation_fee_status. Nothing in the app or the edge
--    function reads it. Access is revoked and the view now runs with the
--    caller's rights, so even a future grant would go through RLS.
--
-- 2. SECURITY DEFINER functions were callable over /rest/v1/rpc by anon
--    (Postgres grants EXECUTE to PUBLIC by default):
--    - Trigger functions: handle_new_user, sync_user_email,
--      update_storage_usage, enforce_storage_quota. Postgres only checks
--      EXECUTE when a trigger is created, not when it fires, so revoking it
--      changes nothing for the triggers themselves.
--    - Unused anywhere (no policy, function, client or server call):
--      has_continuation_fee_paid, legacy_contact_can_access,
--      session_passed_2fa. Both of the first two answered yes/no questions
--      about any user id.
--    - account_is_frozen is called by about 60 RLS policies for signed-in
--      users, so authenticated keeps EXECUTE and only anon loses it.
--    storage_upload_check, get_contact_verification and
--    set_contact_verification are called by the app and are left as they are.
--
-- 3. Eight functions had no fixed search_path (advisor
--    function_search_path_mutable). They are pinned to public.
--
-- Idempotent: safe to run twice.

-- 1 ─────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.admin_continuation_fee_status FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_continuation_fee_status TO service_role;
ALTER VIEW public.admin_continuation_fee_status SET (security_invoker = true);

-- 2 ─────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.handle_new_user()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_email()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_storage_usage()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_storage_quota() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_continuation_fee_paid(UUID)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.legacy_contact_can_access(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.session_passed_2fa()                  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.account_is_frozen() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.account_is_frozen() TO authenticated;

GRANT EXECUTE ON FUNCTION
  public.handle_new_user(), public.sync_user_email(), public.update_storage_usage(),
  public.enforce_storage_quota(), public.has_continuation_fee_paid(UUID),
  public.legacy_contact_can_access(UUID, UUID), public.session_passed_2fa(),
  public.account_is_frozen()
TO service_role;

-- 3 ─────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.handle_updated_at()                    SET search_path = public;
ALTER FUNCTION public.recalculate_affiliate_tier(UUID)       SET search_path = public;
ALTER FUNCTION public.has_continuation_fee_paid(UUID)        SET search_path = public;
ALTER FUNCTION public.legacy_contact_can_access(UUID, UUID)  SET search_path = public;
ALTER FUNCTION public.enforce_starter_plan_window()          SET search_path = public;
ALTER FUNCTION public.guard_user_protected_columns()         SET search_path = public;
ALTER FUNCTION public.guard_vault_document_columns()         SET search_path = public;
ALTER FUNCTION public.guard_contact_link_columns()           SET search_path = public;

-- ── Check: every row should say ok = true.
SELECT 'view hidden from anon' AS check_name,
       NOT has_table_privilege('anon', 'public.admin_continuation_fee_status', 'SELECT') AS ok
UNION ALL SELECT 'view hidden from authenticated',
       NOT has_table_privilege('authenticated', 'public.admin_continuation_fee_status', 'SELECT')
UNION ALL SELECT 'anon cannot run handle_new_user',
       NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
UNION ALL SELECT 'anon cannot run has_continuation_fee_paid',
       NOT has_function_privilege('anon', 'public.has_continuation_fee_paid(uuid)', 'EXECUTE')
UNION ALL SELECT 'anon cannot run account_is_frozen',
       NOT has_function_privilege('anon', 'public.account_is_frozen()', 'EXECUTE')
UNION ALL SELECT 'signed-in users still run account_is_frozen (RLS needs it)',
       has_function_privilege('authenticated', 'public.account_is_frozen()', 'EXECUTE')
UNION ALL SELECT 'signed-in users still run storage_upload_check',
       has_function_privilege('authenticated', 'public.storage_upload_check(bigint)', 'EXECUTE')
UNION ALL SELECT 'search_path pinned on handle_updated_at',
       (SELECT proconfig IS NOT NULL FROM pg_proc WHERE oid = 'public.handle_updated_at()'::regprocedure);
