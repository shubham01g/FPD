-- ============================================================================
-- Final Pass Down — COMPLETE DATABASE SETUP (consolidated migrations 001–007)
--
-- Safe to run on an EMPTY database or on a PARTIALLY migrated one.
-- Every statement is idempotent: it creates what is missing and skips what
-- already exists. Running it twice changes nothing the second time.
--
-- Paste this whole file into the Supabase SQL Editor and press Run once.
--
-- NOT included: 003_email_templates_seed.sql (16 rows of email copy for the
-- admin Email Templates screen). Purely optional content — run that file
-- separately if you want those templates pre-filled.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — EXTENSIONS + SHARED TRIGGER FUNCTION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


-- ============================================================================
-- SECTION 1 — CORE TABLES (migration 001)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'foundation'
                  CHECK (plan IN ('starter','foundation','family_archive','legacy_pro','legacy_vault')),
  plan_status     TEXT NOT NULL DEFAULT 'active'
                  CHECK (plan_status IN ('active','paused','cancelled','past_due')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL,
  price_annual    NUMERIC(10,2) NOT NULL,
  storage_gb      INTEGER NOT NULL,
  max_contacts    INTEGER NOT NULL DEFAULT 3,
  overage_rate    NUMERIC(8,4) NOT NULL DEFAULT 0.10,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans
  (id, name, price_monthly, price_annual, storage_gb, max_contacts, overage_rate,
   stripe_price_id_monthly, stripe_price_id_annual, is_active, created_at, updated_at)
VALUES
  ('starter',        'Starter',         1.99,   24.00,    1,  1, 0.50, NULL, NULL, TRUE, NOW(), NOW()),
  ('foundation',     'Foundation',      9.99,   95.90,   50,  3, 0.40, NULL, NULL, TRUE, NOW(), NOW()),
  ('family_archive', 'Legacy Archive', 24.99,  239.90,  250, -1, 0.40, NULL, NULL, TRUE, NOW(), NOW()),
  ('legacy_pro',     'Legacy Pro',     49.99,  479.90,  500, -1, 0.40, NULL, NULL, TRUE, NOW(), NOW()),
  ('legacy_vault',   'Legacy Vault',  129.99, 1559.90, 1024, -1, 0.40, NULL, NULL, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.legacy_continuation_fees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paid_by_user_id   UUID REFERENCES public.users(id),
  paid_by_type      TEXT NOT NULL CHECK (paid_by_type IN ('account_owner','legacy_contact')),
  amount_usd        NUMERIC(10,2) NOT NULL DEFAULT 199.00,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','refunded')),
  activation_period_months INTEGER NOT NULL DEFAULT 24,
  activated_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lcf_user ON public.legacy_continuation_fees(user_id);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_settings (key, value, updated_by, updated_at) VALUES
  ('continuation_fee_amount',        '199.00', NULL, NOW()),
  ('continuation_fee_period_months', '24',     NULL, NOW()),
  ('overage_rate_per_gb',            '0.10',   NULL, NOW()),
  ('storage_alert_80',               '80',     NULL, NOW()),
  ('storage_alert_90',               '90',     NULL, NOW()),
  ('storage_alert_95',               '95',     NULL, NOW())
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.vault_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'legal',
  sub_category    TEXT,
  folder_id       UUID,
  file_path       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_type       TEXT NOT NULL,
  is_encrypted    BOOLEAN NOT NULL DEFAULT TRUE,
  encryption_key_hash TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected')),
  starred         BOOLEAN NOT NULL DEFAULT FALSE,
  locked          BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_docs_user ON public.vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_category ON public.vault_documents(category);

CREATE TABLE IF NOT EXISTS public.vault_folders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES public.vault_folders(id),
  color       TEXT DEFAULT '#2040C0',
  icon        TEXT,
  locked      BOOLEAN NOT NULL DEFAULT FALSE,
  is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- allowed_folder_ids is TEXT[] (migration 006 retyped it from UUID[] — the app
-- stores string category ids like 'legal'/'financial', not UUIDs).
CREATE TABLE IF NOT EXISTS public.contacts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  relationship        TEXT NOT NULL,
  contact_type        TEXT NOT NULL
                      CHECK (contact_type IN ('legacy','guardian','emergency','pet_emergency')),
  verification_status TEXT NOT NULL DEFAULT 'not_sent'
                      CHECK (verification_status IN ('not_sent','pending','verified','rejected')),
  access_level        TEXT,
  access_trigger      TEXT,
  notes               TEXT,
  allowed_folder_ids  TEXT[] DEFAULT '{}',
  id_document_url     TEXT,
  id_type             TEXT,
  id_verified_at      TIMESTAMPTZ,
  id_verified_by      UUID REFERENCES public.users(id),
  invite_sent_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.contacts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);

-- If contacts already existed with the old UUID[] type, convert it now.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts'
      AND column_name = 'allowed_folder_ids' AND udt_name = '_uuid'
  ) THEN
    ALTER TABLE public.contacts
      ALTER COLUMN allowed_folder_ids TYPE TEXT[] USING allowed_folder_ids::text[];
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.storage_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_period  TEXT NOT NULL,
  used_bytes      BIGINT NOT NULL DEFAULT 0,
  plan_limit_gb   INTEGER NOT NULL,
  overage_bytes   BIGINT NOT NULL DEFAULT 0,
  overage_charged NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  alert_80_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  alert_90_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  alert_95_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  alert_100_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  reset_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, billing_period)
);
CREATE INDEX IF NOT EXISTS idx_storage_user_period ON public.storage_usage(user_id, billing_period);

CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT UNIQUE,
  stripe_invoice_id     TEXT,
  stripe_charge_id      TEXT,
  type                  TEXT NOT NULL
                        CHECK (type IN ('subscription','overage','continuation_fee','upgrade','other')),
  amount_usd            NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'usd',
  status                TEXT NOT NULL
                        CHECK (status IN ('pending','succeeded','failed','refunded','disputed')),
  description           TEXT,
  billing_period        TEXT,
  metadata              JSONB DEFAULT '{}',
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON public.payments(stripe_payment_intent);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code   TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
  referral_url    TEXT,
  tier            INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 3),
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  active_referrals INTEGER NOT NULL DEFAULT 0,
  total_earned    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pending_payout  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','suspended','inactive')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id    UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  monthly_commission NUMERIC(10,2) NOT NULL,
  months_remaining INTEGER NOT NULL DEFAULT 12,
  cap_months      INTEGER NOT NULL DEFAULT 12,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','cancelled')),
  referred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
  UNIQUE(affiliate_id, referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.partners (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES public.users(id),
  organization_name   TEXT NOT NULL,
  organization_type   TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,
  partner_code        TEXT NOT NULL UNIQUE,
  tier                INTEGER NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 3),
  commission_rate     NUMERIC(5,4) NOT NULL DEFAULT 0.20,
  total_accounts      INTEGER NOT NULL DEFAULT 0,
  monthly_recurring   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_earned        NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','suspended')),
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  commission  NUMERIC(10,2) NOT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.payouts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES public.users(id),
  payout_type       TEXT NOT NULL CHECK (payout_type IN ('affiliate','partnership')),
  amount            NUMERIC(12,2) NOT NULL,
  billing_period    TEXT NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'ach',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  stripe_payout_id  TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.diary_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  entry_type  TEXT NOT NULL DEFAULT 'written'
              CHECK (entry_type IN ('written','audio','video','photo')),
  mood        TEXT CHECK (mood IN ('great','good','okay','sad','difficult')),
  tags        TEXT[] DEFAULT '{}',
  is_private  BOOLEAN NOT NULL DEFAULT FALSE,
  media_url   TEXT,
  duration_s  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_diary_user ON public.diary_entries(user_id);

CREATE TABLE IF NOT EXISTS public.password_vault (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  website_url       TEXT,
  username          TEXT,
  email             TEXT,
  encrypted_password TEXT NOT NULL,
  account_number    TEXT,
  security_question TEXT,
  encrypted_security_answer TEXT,
  notes             TEXT,
  category          TEXT NOT NULL DEFAULT 'Other',
  two_fa_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  starred           BOOLEAN NOT NULL DEFAULT FALSE,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_vault_user ON public.password_vault(user_id);

CREATE TABLE IF NOT EXISTS public.subscription_tracker (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  amount_usd            NUMERIC(10,2) NOT NULL,
  billing_frequency     TEXT NOT NULL
                        CHECK (billing_frequency IN ('Weekly','Biweekly','Monthly','Quarterly','Yearly')),
  category              TEXT NOT NULL DEFAULT 'Other',
  phone                 TEXT,
  website_url           TEXT,
  username              TEXT,
  encrypted_password    TEXT,
  billing_account_number TEXT,
  payment_type          TEXT NOT NULL DEFAULT 'Visa',
  last_four_digits      TEXT,
  next_billing_date     DATE,
  cancel_instructions   TEXT,
  auto_pay              BOOLEAN NOT NULL DEFAULT TRUE,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','cancelled')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_tracker_user ON public.subscription_tracker(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('info','warning','success','error')),
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notifications(user_id, read);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES public.users(id),
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  severity    TEXT NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info','warning','critical')),
  metadata    JSONB DEFAULT '{}',
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);

CREATE TABLE IF NOT EXISTS public.id_verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id      UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  document_url    TEXT NOT NULL,
  document_back_url TEXT,
  id_type         TEXT NOT NULL,
  id_number_masked TEXT,
  date_of_birth   DATE,
  expiry_date     DATE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_idv_status ON public.id_verifications(status);

CREATE TABLE IF NOT EXISTS public.webhooks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  events      TEXT[] NOT NULL DEFAULT '{}',
  secret      TEXT NOT NULL DEFAULT ENCODE(GEN_RANDOM_BYTES(32), 'hex'),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_fired_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.white_label_configs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization    TEXT NOT NULL,
  partner_id      UUID REFERENCES public.partners(id),
  company_name    TEXT NOT NULL,
  tagline         TEXT,
  primary_color   TEXT NOT NULL DEFAULT '#2040C0',
  accent_color    TEXT NOT NULL DEFAULT '#3355E0',
  logo_url        TEXT,
  domain          TEXT,
  support_email   TEXT,
  sender_name     TEXT,
  terms_url       TEXT,
  privacy_url     TEXT,
  features        JSONB NOT NULL DEFAULT '{}',
  plan_names      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 2 — WHITE GLOVE / CRYPTO / MISC TABLES (migration 002, part 1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.concierge_employees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  phone             TEXT,
  role              TEXT NOT NULL DEFAULT 'junior_concierge'
                    CHECK (role IN ('junior_concierge','senior_concierge','lead_concierge')),
  status            TEXT NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('active','invited','suspended')),
  invite_token      TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  password_hash     TEXT NOT NULL,
  last_login_at     TIMESTAMPTZ,
  invited_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by        UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_concierge_email ON public.concierge_employees(email);

CREATE TABLE IF NOT EXISTS public.wg_clients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id     UUID REFERENCES public.concierge_employees(id),
  status            TEXT NOT NULL DEFAULT 'intake'
                    CHECK (status IN ('intake','active','completed','paused')),
  reason            TEXT,
  notes             TEXT,
  completion_pct    INTEGER NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  intake_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  next_session_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wg_clients_user ON public.wg_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_wg_clients_specialist ON public.wg_clients(specialist_id);

CREATE TABLE IF NOT EXISTS public.wg_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID NOT NULL REFERENCES public.wg_clients(id) ON DELETE CASCADE,
  specialist_id     UUID NOT NULL REFERENCES public.concierge_employees(id),
  session_type      TEXT NOT NULL CHECK (session_type IN ('phone','video','in_person')),
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wg_sessions_client ON public.wg_sessions(client_id);

CREATE TABLE IF NOT EXISTS public.wg_waivers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id     UUID REFERENCES public.concierge_employees(id),
  specialist_name   TEXT NOT NULL,
  authorized_scope  TEXT[] NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','signed','declined','expired')),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by           UUID REFERENCES public.users(id),
  signed_at         TIMESTAMPTZ,
  signed_name       TEXT,
  signer_ip         TEXT,
  signature_data    TEXT,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX IF NOT EXISTS idx_wg_waivers_client ON public.wg_waivers(client_user_id);
CREATE INDEX IF NOT EXISTS idx_wg_waivers_status ON public.wg_waivers(status);

CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES public.users(id),
  transaction_type    TEXT NOT NULL
                      CHECK (transaction_type IN ('continuation_fee','subscription','partner_setup','plan_upgrade')),
  coin                TEXT NOT NULL,
  coin_amount         NUMERIC(20,8) NOT NULL,
  usd_amount          NUMERIC(10,2) NOT NULL,
  wallet_address      TEXT NOT NULL,
  tx_hash             TEXT,
  processor           TEXT NOT NULL DEFAULT 'coinbase',
  processor_invoice_id TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','confirming','confirmed','failed','expired')),
  confirmations       INTEGER NOT NULL DEFAULT 0,
  required_confirmations INTEGER NOT NULL DEFAULT 2,
  invoice_id          TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);
CREATE INDEX IF NOT EXISTS idx_crypto_txns_user ON public.crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_txns_status ON public.crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_txns_invoice ON public.crypto_transactions(invoice_id);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  notification_type TEXT NOT NULL
                    CHECK (notification_type IN ('marketing','feature','update','alert','reminder')),
  target_segment    TEXT NOT NULL DEFAULT 'all',
  sent_by           UUID REFERENCES public.users(id),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for     TIMESTAMPTZ,
  delivered_count   INTEGER NOT NULL DEFAULT 0,
  opened_count      INTEGER NOT NULL DEFAULT 0,
  is_scheduled      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.push_notification_receipts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id   UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  UNIQUE (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.contact_groups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  color             TEXT NOT NULL DEFAULT '#2040C0',
  member_contact_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user ON public.contact_groups(owner_user_id);

CREATE TABLE IF NOT EXISTS public.account_2fa_settings (
  user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  method            TEXT CHECK (method IN ('sms','email_otp','authenticator')),
  totp_secret       TEXT,
  phone_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  backup_codes      TEXT[],
  enabled_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crypto_processor_configs (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  config_encrypted  TEXT,
  updated_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.crypto_processor_configs (id, name, enabled, is_default) VALUES
  ('stripe',   'Stripe',            TRUE,  TRUE),
  ('paypal',   'PayPal',            TRUE,  FALSE),
  ('coinbase', 'Coinbase Commerce', FALSE, FALSE),
  ('bitpay',   'BitPay',            FALSE, FALSE),
  ('nowpay',   'NOWPayments',       FALSE, FALSE),
  ('square',   'Square',            FALSE, FALSE),
  ('braintree','Braintree',         FALSE, FALSE),
  ('strike',   'Strike Lightning',  FALSE, FALSE),
  ('custom',   'Custom Processor',  FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wl_packages (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  tier              TEXT NOT NULL,
  user_limit        INTEGER,
  user_limit_label  TEXT NOT NULL,
  billing_type      TEXT NOT NULL CHECK (billing_type IN ('flat_monthly','per_user_flat','per_user_percentage')),
  flat_monthly      NUMERIC(10,2),
  per_user_amount   NUMERIC(8,4),
  percent_of_revenue NUMERIC(5,2),
  min_monthly       NUMERIC(10,2),
  setup_fee         NUMERIC(10,2) NOT NULL,
  commission_pct    INTEGER NOT NULL DEFAULT 0,
  color             TEXT NOT NULL DEFAULT '#2040C0',
  badge             TEXT,
  features          TEXT[] NOT NULL DEFAULT '{}',
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_product_id TEXT,
  stripe_price_id   TEXT,
  onboarding_link   TEXT NOT NULL,
  processor_override TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.wl_packages
  (id, name, tier, user_limit, user_limit_label, billing_type, flat_monthly, setup_fee, commission_pct, color, badge, features, onboarding_link) VALUES
  ('agency','Agency Partner','AGENCY',500,'Up to 500 users','flat_monthly',2999,2500,0,'#2040C0',NULL,
   ARRAY['Up to 500 user accounts','Full white label (your domain + branding)','Priority support (24h SLA)','Partner analytics dashboard','Custom email templates','Dedicated onboarding manager','API access','Marketing & sales materials'],
   'finalpassdown.com/partner/onboard?tier=agency'),
  ('enterprise','Enterprise Partner','ENTERPRISE',5000,'501 – 5,000 users','flat_monthly',7499,5000,0,'#9F7AEA','Most Popular',
   ARRAY['501 – 5,000 user accounts','Fully custom branded platform','24/7 dedicated support line','Real-time white-label analytics','Custom feature development','99.9% SLA uptime guarantee','White-glove onboarding','Revenue sharing dashboard','Enterprise API + webhooks'],
   'finalpassdown.com/partner/onboard?tier=enterprise'),
  ('institutional','Institutional Partner','INSTITUTIONAL',NULL,'5,000+ users','flat_monthly',15000,5000,0,'#48BB78','Best Value',
   ARRAY['5,000+ user accounts (unlimited)','Custom-built branded platform','Named account executive','Custom SLA & infrastructure','HIPAA / SOC 2 compliance package','On-site onboarding & training','Custom API rate limits','Quarterly business reviews','Co-marketing opportunities'],
   'finalpassdown.com/partner/onboard?tier=institutional')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wg_document_submissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id     UUID REFERENCES public.concierge_employees(id),
  submit_token      TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_type         TEXT NOT NULL DEFAULT 'document',
  file_size_bytes   BIGINT NOT NULL DEFAULT 0,
  storage_path      TEXT,
  category          TEXT NOT NULL,
  client_notes      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','received','uploaded_to_vault','needs_resubmit')),
  vault_folder      TEXT,
  vault_document_id UUID REFERENCES public.vault_documents(id),
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at       TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_wg_submissions_client ON public.wg_document_submissions(client_user_id);
CREATE INDEX IF NOT EXISTS idx_wg_submissions_token  ON public.wg_document_submissions(submit_token);
CREATE INDEX IF NOT EXISTS idx_wg_submissions_status ON public.wg_document_submissions(status);

CREATE TABLE IF NOT EXISTS public.wg_session_billing (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id         UUID NOT NULL REFERENCES public.concierge_employees(id),
  session_type          TEXT NOT NULL CHECK (session_type IN ('phone','video')),
  started_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ NOT NULL,
  duration_minutes      INTEGER NOT NULL,
  blocks_charged        INTEGER NOT NULL,
  amount_charged        NUMERIC(8,2) NOT NULL,
  rate_per_block        NUMERIC(8,2) NOT NULL DEFAULT 25.00,
  stripe_payment_intent TEXT,
  card_last4            TEXT NOT NULL,
  card_brand            TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','charged','failed','refunded')),
  specialist_notes      TEXT,
  charged_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wg_billing_client     ON public.wg_session_billing(client_user_id);
CREATE INDEX IF NOT EXISTS idx_wg_billing_specialist ON public.wg_session_billing(specialist_id);
CREATE INDEX IF NOT EXISTS idx_wg_billing_status     ON public.wg_session_billing(status);

CREATE TABLE IF NOT EXISTS public.wg_payment_methods (
  user_id               UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT,
  stripe_payment_method TEXT,
  card_brand            TEXT,
  card_last4            TEXT,
  card_expiry           TEXT,
  cardholder_name       TEXT,
  added_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 3 — ADMIN BACKEND TABLES (migrations 002 part 2, 004)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,
  name          TEXT NOT NULL,
  subject       TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  variables     TEXT[] NOT NULL DEFAULT '{}',
  html          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enterprise_api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id        UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  key_prefix        TEXT NOT NULL,
  key_hash          TEXT NOT NULL,
  secret_encrypted  TEXT,
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at      TIMESTAMPTZ,
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ,
  CHECK (owner_user_id IS NOT NULL OR partner_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_enterprise_keys_owner   ON public.enterprise_api_keys(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_keys_partner ON public.enterprise_api_keys(partner_id);

CREATE TABLE IF NOT EXISTS public.enterprise_api_usage (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id    UUID NOT NULL REFERENCES public.enterprise_api_keys(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  method        TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  response_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_key ON public.enterprise_api_usage(api_key_id, created_at DESC);

ALTER TABLE public.white_label_configs ADD COLUMN IF NOT EXISTS logo_text   TEXT;
ALTER TABLE public.white_label_configs ADD COLUMN IF NOT EXISTS footer_text TEXT;

INSERT INTO public.white_label_configs
  (organization, company_name, tagline, primary_color, accent_color, logo_text, domain,
   support_email, sender_name, terms_url, privacy_url, features, plan_names, footer_text, is_active)
SELECT
  'default', 'Final Pass Down', 'My Life · My Wishes · My Way', '#5B6EE1', '#5B6EE1', 'FPD',
  'app.finalpassdown.com', 'support@finalpassdown.com', 'Final Pass Down',
  'https://finalpassdown.com/terms', 'https://finalpassdown.com/privacy',
  '{"vault":true,"finalWishes":true,"medicalInfo":true,"financialRecords":true,"personalAssets":true,"familyMemories":true,"contacts":true,"affiliate":true,"partnership":true,"videoMessages":true,"secretVault":true}',
  '{"starter":"Starter","essential":"Essential","premium":"Premium","legacyPro":"Legacy Pro","enterprise":"Enterprise"}',
  '© 2026 Final Pass Down Inc. All rights reserved.', FALSE
WHERE NOT EXISTS (SELECT 1 FROM public.white_label_configs WHERE organization = 'default');

CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.users(id),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  role              TEXT NOT NULL DEFAULT 'support_agent',
  status            TEXT NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('active','invited','suspended')),
  permissions       JSONB NOT NULL DEFAULT '[]',
  invited_by        UUID REFERENCES public.users(id),
  invite_token      TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  notes             TEXT,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_email  ON public.admin_accounts(email);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_user   ON public.admin_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_status ON public.admin_accounts(status);


-- ============================================================================
-- SECTION 4 — USER DATA DOMAINS (migration 005)
-- Note: `memories` is created here already broadened per migration 007.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.final_wishes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  item        TEXT NOT NULL,
  recipient   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_final_wishes_user ON public.final_wishes(user_id);

CREATE TABLE IF NOT EXISTS public.allergies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  allergen    TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('severe','moderate','mild')),
  reaction    TEXT,
  type        TEXT,
  diagnosed   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_allergies_user ON public.allergies(user_id);

CREATE TABLE IF NOT EXISTS public.medications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dose        TEXT,
  frequency   TEXT,
  condition   TEXT,
  prescriber  TEXT,
  pharmacy    TEXT,
  refill_date TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications(user_id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_date    TEXT,
  frequency   TEXT,
  category    TEXT,
  status      TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due_soon','overdue','completed')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id);

CREATE TABLE IF NOT EXISTS public.memories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  memory_date TEXT,
  type        TEXT NOT NULL DEFAULT 'note',
  description TEXT,
  tags        TEXT[] DEFAULT '{}',
  recipient   TEXT,
  media_url   TEXT,
  achieved    BOOLEAN,
  issuer      TEXT,
  child_name  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories(user_id);

-- Columns + widened type CHECK for memories (safe whether the table is new or pre-existing)
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS recipient  TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS media_url  TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS achieved   BOOLEAN;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS issuer     TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS child_name TEXT;
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE public.memories ADD  CONSTRAINT memories_type_check
  CHECK (type IN ('photo','video','note','audio','message','keepsake','goal','award'));

CREATE TABLE IF NOT EXISTS public.occasions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  occasion_date TEXT,
  type          TEXT NOT NULL CHECK (type IN ('birthday','anniversary','holiday')),
  recipient     TEXT,
  notes         TEXT,
  recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_occasions_user ON public.occasions(user_id);


-- ============================================================================
-- SECTION 5 — PHASE 3 TABLES (migration 007 part B)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.funeral_plans (
  user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  service_type      TEXT,
  location          TEXT,
  preferred_date    TEXT,
  budget            NUMERIC(12,2),
  prearranged       BOOLEAN NOT NULL DEFAULT FALSE,
  music             TEXT[] DEFAULT '{}',
  readings          TEXT[] DEFAULT '{}',
  flowers           TEXT,
  reception         TEXT,
  obituary_draft    TEXT,
  special_requests  TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medical_emergency_info (
  user_id                   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  blood_type                TEXT,
  height                    TEXT,
  weight                    TEXT,
  primary_language          TEXT,
  code_status               TEXT,
  dnr                       BOOLEAN NOT NULL DEFAULT FALSE,
  organ_donor               BOOLEAN NOT NULL DEFAULT FALSE,
  advance_directive         BOOLEAN NOT NULL DEFAULT FALSE,
  conditions                TEXT[] DEFAULT '{}',
  primary_doctor_name       TEXT,
  primary_doctor_specialty  TEXT,
  primary_doctor_phone      TEXT,
  primary_doctor_address    TEXT,
  hospital_name             TEXT,
  hospital_phone            TEXT,
  pharmacy_name             TEXT,
  pharmacy_phone            TEXT,
  insurance_carrier         TEXT,
  insurance_policy_number   TEXT,
  insurance_group_number    TEXT,
  insurance_member_id       TEXT,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 6 — FAMILY & FRIENDS DIRECTORY (migration 007 part C)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.family_friends (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  relationship  TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  birthday      TEXT,
  group_id      UUID REFERENCES public.contact_groups(id) ON DELETE SET NULL,
  starred       BOOLEAN NOT NULL DEFAULT FALSE,
  notes         TEXT,
  photo_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_friends_owner ON public.family_friends(owner_user_id);


-- ============================================================================
-- SECTION 7 — LIFE & HOME RECORDS (migration 007 part D)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pet_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, species TEXT, breed TEXT, color TEXT, gender TEXT, date_of_birth TEXT,
  microchip_number TEXT,
  vet_name TEXT, vet_phone TEXT, vet_email TEXT,
  medical_history TEXT, vaccinations JSONB DEFAULT '[]', feeding_instructions TEXT,
  caretakers JSONB DEFAULT '[]', providers JSONB DEFAULT '[]',
  photo_url TEXT, document_urls TEXT[] DEFAULT '{}', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL, brand TEXT, model TEXT, serial_number TEXT, category TEXT,
  purchase_date TEXT, purchased_from TEXT, price NUMERIC(10,2),
  warranty_type TEXT, provider TEXT, provider_phone TEXT, provider_website TEXT,
  expiry_date TEXT, coverage_details TEXT, claim_instructions TEXT, notes TEXT,
  photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.id_keeper_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL, id_number_masked TEXT, holder_name TEXT,
  issued_by TEXT, issue_date TEXT, expiry_date TEXT, notes TEXT, document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employer TEXT NOT NULL, title TEXT, employment_type TEXT, location TEXT,
  start_date TEXT, end_date TEXT, is_current BOOLEAN NOT NULL DEFAULT FALSE,
  salary TEXT, supervisor_name TEXT, supervisor_phone TEXT, reason_left TEXT,
  achievements TEXT, notes TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.travel_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL, country TEXT, trip_type TEXT,
  start_date TEXT, end_date TEXT, companions TEXT,
  accommodation TEXT, accommodation_phone TEXT, confirmation_number TEXT,
  transportation TEXT, budget NUMERIC(10,2), actual_cost NUMERIC(10,2),
  highlights TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','booked','completed','cancelled')),
  photo_url TEXT, document_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daycare_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  facility_name TEXT NOT NULL, child_name TEXT, address TEXT, phone TEXT, email TEXT, website TEXT,
  director_name TEXT, teacher_name TEXT, teacher_phone TEXT,
  dropoff_time TEXT, pickup_time TEXT, days TEXT[] DEFAULT '{}',
  tuition NUMERIC(10,2), tuition_due TEXT, payment_method TEXT,
  allergies_on_file TEXT, medications_on_file TEXT,
  emergency_contact TEXT, emergency_phone TEXT,
  enroll_date TEXT, status TEXT NOT NULL DEFAULT 'active',
  authorized_pickups JSONB DEFAULT '[]',
  document_urls TEXT[] DEFAULT '{}', notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kids_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL, activity_type TEXT, organization_name TEXT, team_or_group TEXT,
  location TEXT, location_phone TEXT, coach_name TEXT, coach_phone TEXT,
  schedule TEXT, season_dates TEXT, monthly_cost NUMERIC(10,2), payment_due TEXT,
  uniform_required BOOLEAN NOT NULL DEFAULT FALSE, transportation_notes TEXT,
  emergency_contact TEXT, emergency_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active', notes TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.utilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, provider TEXT, account_number TEXT, phone TEXT, website TEXT,
  autopay BOOLEAN NOT NULL DEFAULT FALSE, monthly_avg NUMERIC(10,2), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wills_trusts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, attorney_name TEXT, date_executed TEXT, last_reviewed TEXT,
  status TEXT NOT NULL DEFAULT 'active', location TEXT, notes TEXT, document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorite_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT, address TEXT, phone TEXT, website TEXT,
  favorite_item TEXT, why_special TEXT, rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  visited BOOLEAN NOT NULL DEFAULT TRUE, tags TEXT[] DEFAULT '{}', photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages_to_loved_ones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, recipient_name TEXT, relationship TEXT,
  medium TEXT NOT NULL DEFAULT 'letter' CHECK (medium IN ('letter','voice','video')),
  trigger_type TEXT NOT NULL DEFAULT 'on_passing' CHECK (trigger_type IN ('on_passing','on_date','birthday','anniversary')),
  trigger_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sealed','delivered')),
  body TEXT, media_url TEXT, duration_s INTEGER,
  sealed_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  make TEXT, model TEXT, year TEXT, vin TEXT, license_plate TEXT, color TEXT,
  purchase_date TEXT, purchase_price NUMERIC(12,2), current_value NUMERIC(12,2),
  loan_lender TEXT, loan_balance NUMERIC(12,2),
  insurance_provider TEXT, insurance_policy_number TEXT, registration_expiry TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL, address TEXT, property_type TEXT,
  purchase_date TEXT, purchase_price NUMERIC(14,2), current_value NUMERIC(14,2),
  mortgage_lender TEXT, mortgage_balance NUMERIC(14,2), deed_location TEXT,
  insurance_provider TEXT, insurance_policy_number TEXT, property_tax_annual NUMERIC(12,2),
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.digital_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL, asset_type TEXT, platform TEXT, account_identifier TEXT,
  estimated_value NUMERIC(14,2), access_instructions TEXT, beneficiary TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weapons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weapon_type TEXT NOT NULL, make TEXT, model TEXT, caliber TEXT, serial_number TEXT,
  purchase_date TEXT, purchase_price NUMERIC(10,2), current_value NUMERIC(10,2),
  storage_location TEXT, permit_number TEXT, permit_expiry TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.weapons_locker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locker_name TEXT NOT NULL, location TEXT, access_code_hint TEXT,
  contents TEXT, key_holder_contact TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collectibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL, category TEXT, acquired_date TEXT, acquired_from TEXT,
  purchase_price NUMERIC(12,2), current_value NUMERIC(12,2), appraisal_date TEXT,
  condition TEXT, storage_location TEXT, provenance TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 8 — ENTITLEMENT / SECURITY-FLAG TABLES (migration 007 part E)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wl_entitlements (
  user_id      UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  entitled     BOOLEAN NOT NULL DEFAULT FALSE,
  package_id   TEXT REFERENCES public.wl_packages(id),
  granted_at   TIMESTAMPTZ,
  granted_by   UUID REFERENCES public.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disaster_recovery_state (
  user_id            UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  addon_active       BOOLEAN NOT NULL DEFAULT FALSE,
  bypass_granted     BOOLEAN NOT NULL DEFAULT FALSE,
  bypass_granted_at  TIMESTAMPTZ,
  bypass_granted_by  UUID REFERENCES public.users(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.storage_spend_caps (
  user_id        UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  cap_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  cap_amount_usd NUMERIC(10,2),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 9 — FUNCTIONS, TRIGGERS, VIEW
-- ============================================================================

-- Auto-create a public.users row when someone signs up through Supabase Auth.
-- Without this, every RLS policy (which keys off auth.uid() = users.id) would
-- reject the new account's own data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'foundation'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.recalculate_affiliate_tier(affiliate_uuid UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  active_count INTEGER;
  new_rate NUMERIC;
  new_tier INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.affiliate_referrals
  WHERE affiliate_id = affiliate_uuid AND status = 'active';

  IF active_count >= 75 THEN new_tier := 3; new_rate := 0.30;
  ELSIF active_count >= 25 THEN new_tier := 2; new_rate := 0.25;
  ELSE new_tier := 1; new_rate := 0.20; END IF;

  UPDATE public.affiliates SET tier = new_tier, commission_rate = new_rate,
    active_referrals = active_count WHERE id = affiliate_uuid;
END; $$;

CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  plan_gb INTEGER;
BEGIN
  SELECT sp.storage_gb INTO plan_gb FROM public.users u
    JOIN public.subscription_plans sp ON u.plan = sp.id
  WHERE u.id = COALESCE(NEW.user_id, OLD.user_id);

  INSERT INTO public.storage_usage (user_id, billing_period, used_bytes, plan_limit_gb)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), period, 0, COALESCE(plan_gb, 0))
  ON CONFLICT (user_id, billing_period) DO NOTHING;

  IF TG_OP = 'INSERT' THEN
    UPDATE public.storage_usage SET used_bytes = used_bytes + NEW.file_size_bytes
    WHERE user_id = NEW.user_id AND billing_period = period;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.storage_usage SET used_bytes = GREATEST(0, used_bytes - OLD.file_size_bytes)
    WHERE user_id = OLD.user_id AND billing_period = period;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.has_continuation_fee_paid(owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.legacy_continuation_fees
    WHERE user_id = owner_id AND status = 'paid'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.legacy_contact_can_access(contact_user_id UUID, vault_owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.contacts c
    JOIN public.legacy_continuation_fees lcf ON lcf.user_id = c.owner_user_id
    WHERE c.owner_user_id = vault_owner_id
      AND c.email = (SELECT email FROM public.users WHERE id = contact_user_id)
      AND c.verification_status = 'verified'
      AND c.contact_type = 'legacy'
      AND lcf.status = 'paid'
      AND lcf.activated_at IS NOT NULL
      AND (lcf.expires_at IS NULL OR lcf.expires_at > NOW())
  );
END; $$;

CREATE OR REPLACE VIEW public.admin_continuation_fee_status AS
SELECT
  u.id AS user_id, u.email, u.full_name, u.plan,
  lcf.id AS fee_id, lcf.status, lcf.amount_usd,
  lcf.paid_by_type, lcf.paid_at,
  lcf.activation_period_months,
  lcf.activated_at, lcf.expires_at,
  CASE
    WHEN lcf.id IS NULL THEN 'not_paid'
    WHEN lcf.status = 'paid' AND lcf.activated_at IS NULL THEN 'paid_not_activated'
    WHEN lcf.status = 'paid' AND lcf.activated_at IS NOT NULL AND (lcf.expires_at IS NULL OR lcf.expires_at > NOW()) THEN 'active'
    WHEN lcf.expires_at < NOW() THEN 'expired'
    ELSE lcf.status
  END AS vault_access_status
FROM public.users u
LEFT JOIN public.legacy_continuation_fees lcf ON lcf.user_id = u.id AND lcf.status = 'paid';

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','vault_documents','contacts','final_wishes','allergies','medications',
    'reminders','memories','occasions','funeral_plans','medical_emergency_info',
    'family_friends','email_templates','admin_accounts',
    'pet_records','warranties','id_keeper_records','job_history','travel_trips',
    'daycare_records','kids_activities','utilities','wills_trusts','favorite_places',
    'messages_to_loved_ones','vehicles','real_estate','digital_assets','weapons',
    'weapons_locker','collectibles'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_storage_update ON public.vault_documents;
CREATE TRIGGER trg_storage_update AFTER INSERT OR DELETE ON public.vault_documents
FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage();


-- ============================================================================
-- SECTION 10 — ROW LEVEL SECURITY
--
-- Every table gets RLS enabled. Tables with an owner column get an owner-only
-- policy. Public pricing tables get read-only access. Admin/staff tables get
-- RLS with NO policy, which denies all client access — the admin backend
-- reaches them with the service-role key, which bypasses RLS entirely.
-- ============================================================================

-- Older migrations named some policies differently. Drop those legacy names so
-- a table doesn't end up with two policies expressing the same rule.
DROP POLICY IF EXISTS "folders_own"     ON public.vault_folders;
DROP POLICY IF EXISTS "storage_own"     ON public.storage_usage;
DROP POLICY IF EXISTS "diary_own"       ON public.diary_entries;
DROP POLICY IF EXISTS "passwords_own"   ON public.password_vault;
DROP POLICY IF EXISTS "subs_own"        ON public.subscription_tracker;
DROP POLICY IF EXISTS "notif_own"       ON public.notifications;
DROP POLICY IF EXISTS "lcf_own"         ON public.legacy_continuation_fees;
DROP POLICY IF EXISTS "user_own_2fa"    ON public.account_2fa_settings;
DROP POLICY IF EXISTS "user_own_groups" ON public.contact_groups;

-- ── Owner-scoped: user_id ──────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vault_folders','storage_usage','diary_entries','password_vault',
    'subscription_tracker','notifications','affiliates','legacy_continuation_fees',
    'final_wishes','allergies','medications','reminders','memories','occasions',
    'payments','webhooks','crypto_transactions','push_notification_receipts',
    'account_2fa_settings','wg_payment_methods',
    'funeral_plans','medical_emergency_info','storage_spend_caps',
    'pet_records','warranties','id_keeper_records','job_history','travel_trips',
    'daycare_records','kids_activities','utilities','wills_trusts','favorite_places',
    'messages_to_loved_ones','vehicles','real_estate','digital_assets','weapons',
    'weapons_locker','collectibles'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_own" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_own" ON public.%1$s FOR ALL USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- ── Owner-scoped: owner_user_id ────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['contacts','contact_groups','family_friends']
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_own" ON public.%1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_own" ON public.%1$s FOR ALL USING (auth.uid() = owner_user_id)', t);
  END LOOP;
END $$;

-- ── users: own row only ────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_data" ON public.users;
CREATE POLICY "users_own_data" ON public.users FOR ALL USING (auth.uid() = id);

-- ── vault_documents: owner views; legacy contact reads once fee is active ──
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "docs_own" ON public.vault_documents;
DROP POLICY IF EXISTS "docs_owner_download" ON public.vault_documents;
DROP POLICY IF EXISTS "docs_download_gate" ON public.vault_documents;
CREATE POLICY "docs_owner_download" ON public.vault_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "docs_download_gate" ON public.vault_documents
  FOR ALL USING (
    auth.uid() = user_id
    OR public.legacy_contact_can_access(auth.uid(), user_id)
  );

-- ── Read-only for the owning user ──────────────────────────────────────
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payouts_own" ON public.payouts;
CREATE POLICY "payouts_own" ON public.payouts FOR SELECT USING (auth.uid() = recipient_user_id);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_own" ON public.partners;
CREATE POLICY "partners_own" ON public.partners FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_accounts_own" ON public.partner_accounts;
CREATE POLICY "partner_accounts_own" ON public.partner_accounts FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliate_referrals_own" ON public.affiliate_referrals;
CREATE POLICY "affiliate_referrals_own" ON public.affiliate_referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
);

ALTER TABLE public.wg_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wg_clients_own" ON public.wg_clients;
CREATE POLICY "wg_clients_own" ON public.wg_clients FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.wg_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wg_sessions_own" ON public.wg_sessions;
CREATE POLICY "wg_sessions_own" ON public.wg_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wg_clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);

ALTER TABLE public.wg_waivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_waiver" ON public.wg_waivers;
CREATE POLICY "user_own_waiver" ON public.wg_waivers FOR SELECT USING (client_user_id = auth.uid());

ALTER TABLE public.wg_session_billing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wg_billing_own" ON public.wg_session_billing;
CREATE POLICY "wg_billing_own" ON public.wg_session_billing FOR SELECT USING (auth.uid() = client_user_id);

ALTER TABLE public.wg_document_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_own_submissions" ON public.wg_document_submissions;
DROP POLICY IF EXISTS "client_own_submissions_insert" ON public.wg_document_submissions;
CREATE POLICY "client_own_submissions" ON public.wg_document_submissions
  FOR SELECT USING (client_user_id = auth.uid());
CREATE POLICY "client_own_submissions_insert" ON public.wg_document_submissions
  FOR INSERT WITH CHECK (client_user_id = auth.uid());

-- Entitlement flags: readable by the user, writable only by the service role.
ALTER TABLE public.wl_entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wl_entitlements_owner_read" ON public.wl_entitlements;
CREATE POLICY "wl_entitlements_owner_read" ON public.wl_entitlements FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.disaster_recovery_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr_state_owner_read" ON public.disaster_recovery_state;
CREATE POLICY "dr_state_owner_read" ON public.disaster_recovery_state FOR SELECT USING (auth.uid() = user_id);

-- ── ID verifications: owner may submit as 'pending' and read; only the
--    service role (admin) can approve or reject. ─────────────────────────
ALTER TABLE public.id_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "id_verifications_owner_select" ON public.id_verifications;
DROP POLICY IF EXISTS "id_verifications_owner_insert" ON public.id_verifications;
CREATE POLICY "id_verifications_owner_select" ON public.id_verifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contacts c
            WHERE c.id = id_verifications.contact_id AND c.owner_user_id = auth.uid())
  );
CREATE POLICY "id_verifications_owner_insert" ON public.id_verifications
  FOR INSERT WITH CHECK (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.contacts c
                WHERE c.id = id_verifications.contact_id AND c.owner_user_id = auth.uid())
  );

-- ── Public read-only pricing tables ────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_plans_public_read" ON public.subscription_plans;
CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.wl_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wl_packages_public_read" ON public.wl_packages;
CREATE POLICY "wl_packages_public_read" ON public.wl_packages FOR SELECT USING (active = TRUE);

-- ── Admin/staff-only: RLS on, no policies = no client access at all ────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'concierge_employees','admin_accounts','admin_settings','audit_logs',
    'email_templates','enterprise_api_keys','enterprise_api_usage',
    'crypto_processor_configs','push_notifications','white_label_configs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 11 — STORAGE BUCKETS + POLICIES
-- Objects live at "{user_id}/..." so the first path segment is the owner.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('vault-documents',  'vault-documents',  false),
  ('profile-photos',   'profile-photos',   true),
  ('id-verifications', 'id-verifications', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vault_documents_owner_rw"    ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_owner_write"  ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "profile_photos_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "id_verifications_owner_rw"   ON storage.objects;

CREATE POLICY "vault_documents_owner_rw" ON storage.objects FOR ALL
  USING      (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'vault-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "profile_photos_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "profile_photos_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "id_verifications_owner_rw" ON storage.objects FOR ALL
  USING      (bucket_id = 'id-verifications' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'id-verifications' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================================
-- DONE. Verify with:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' ORDER BY table_name;
-- You should see 69 tables.
-- ============================================================================
