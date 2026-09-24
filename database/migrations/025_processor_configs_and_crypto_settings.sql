-- 025 — Give the two remaining admin "settings" screens real storage.
--
-- Crypto Payments (CryptoMerchant.tsx) and WL Onboarding Control's Processors
-- tab (PartnerOnboardingAdmin.tsx) both edited processor credentials that were
-- never persisted — the first refused to save at all, the second kept them in a
-- module-level variable that died on refresh.
--
-- Both now write to the existing crypto_processor_configs table through
-- /admin/crypto. Two things were missing before they could share it:
--
--   1. The two screens disagreed on processor ids ('nowpay' vs 'nowpayments'),
--      and CryptoMerchant offered two processors that were never seeded.
--   2. The crypto payment preferences (settlement currency, payment window,
--      min/max amounts) had no home; they go in admin_settings alongside the
--      storage/continuation-fee keys the pricing screens already use.
--
-- Credentials themselves are stored AES-256-GCM encrypted in
-- config_encrypted by routes/cryptoConfig.ts — never in plaintext columns.

-- ── 1. One id per processor across both screens ───────────────────────
-- CryptoMerchant used 'nowpayments'; the seed used 'nowpay'. Collapse to the
-- longer, unambiguous one. No FK references this table, so a plain id update
-- is safe. Guarded in case both rows somehow exist.
DELETE FROM public.crypto_processor_configs
 WHERE id = 'nowpay'
   AND EXISTS (SELECT 1 FROM public.crypto_processor_configs WHERE id = 'nowpayments');

UPDATE public.crypto_processor_configs SET id = 'nowpayments' WHERE id = 'nowpay';

-- ── 2. Processors CryptoMerchant.tsx offers that were never seeded ────
INSERT INTO public.crypto_processor_configs (id, name, enabled, is_default) VALUES
  ('stripe_crypto', 'Stripe Crypto Payments', FALSE, FALSE),
  ('cryptodotcom',  'Crypto.com Pay',         FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── 3. At most one default processor ──────────────────────────────────
-- The route clears the old default before setting the new one, so this index
-- is never transiently violated; it exists to make the invariant real rather
-- than merely intended.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crypto_processor_single_default
  ON public.crypto_processor_configs ((is_default)) WHERE is_default;

-- ── 4. Crypto payment preferences (Settings tab) ──────────────────────
-- Same admin_settings table the storage thresholds and continuation fee use.
-- Values are TEXT there, so numbers and booleans are stored stringified.
INSERT INTO public.admin_settings (key, value, updated_by, updated_at) VALUES
  ('crypto_default_processor',      'coinbase', NULL, NOW()),
  ('crypto_settlement_currency',    'USD',      NULL, NOW()),
  ('crypto_settlement_frequency',   'Daily',    NULL, NOW()),
  ('crypto_payment_window_minutes', '30',       NULL, NOW()),
  ('crypto_min_payment_usd',        '4.99',     NULL, NOW()),
  ('crypto_max_payment_usd',        '9999.00',  NULL, NOW()),
  ('crypto_show_to_all_users',      'false',    NULL, NOW())
ON CONFLICT (key) DO NOTHING;

COMMENT ON COLUMN public.crypto_processor_configs.config_encrypted IS
  'AES-256-GCM encrypted JSON of processor API credentials. Written and read only by supabase/functions/server/routes/cryptoConfig.ts using ENTERPRISE_KEY_ENCRYPTION_SECRET; never returned to the browser unmasked except via POST /admin/crypto/processors/:id/reveal.';
