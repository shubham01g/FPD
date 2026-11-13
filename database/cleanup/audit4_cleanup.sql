-- Audit #4 clean-up (2026-11-13). Review before running; nothing here is
-- applied automatically. Paste into the Supabase SQL Editor.

BEGIN;

-- 1. Leftover from the original Figma export: never used by any code, empty
--    (0 rows on 2026-11-13), and carries 28 duplicate indexes that the
--    Supabase advisor flags.
DROP TABLE IF EXISTS public.kv_store_b5ad85e0;

-- 2. OPTIONAL — WL-001 "Vital Clone", created 2026-10-03 by the old
--    simulated checkout (processor 'card', $25,000 "paid", no Stripe session,
--    no account). No money was ever taken. Since audit #4 the admin revenue
--    figures only count Stripe-paid sales, so it no longer inflates revenue.
--    Delete it only if it isn't a record you want to keep:
-- DELETE FROM public.wl_sales WHERE id = 'WL-001' AND processor = 'card' AND stripe_checkout_session_id IS NULL;

COMMIT;

-- Check: expect no kv_store table.
SELECT to_regclass('public.kv_store_b5ad85e0') AS kv_store_still_there;
SELECT id, org, processor, total_paid FROM public.wl_sales ORDER BY created_at;
