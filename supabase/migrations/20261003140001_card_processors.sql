-- 028 — The two card processors the Payment Processors screen offers that
-- were never seeded. Stripe, PayPal, Square and Braintree have been in
-- crypto_processor_configs since 001; Authorize.Net and Adyen complete the
-- catalog in admin/processorCatalog.ts. Both start disconnected.
--
-- Idempotent — safe to run more than once.

INSERT INTO public.crypto_processor_configs (id, name, enabled, is_default) VALUES
  ('authorize', 'Authorize.Net', FALSE, FALSE),
  ('adyen',     'Adyen',         FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;
