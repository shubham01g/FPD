-- ============================================================
-- Final Pass Down — Complete Database Schema
-- Supabase PostgreSQL Migration 001
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'foundation'
                  CHECK (plan IN ('starter','foundation','family_archive','legacy_pro','legacy_vault')),
  plan_status     TEXT NOT NULL DEFAULT 'active'
                  CHECK (plan_status IN ('active','paused','cancelled','past_due')),
  stripe_customer_id  TEXT UNIQUE,
  stripe_subscription_id TEXT,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  two_fa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer ON public.users(stripe_customer_id);

-- ============================================================
-- SUBSCRIPTION PLANS (admin-configurable)
-- ============================================================
CREATE TABLE public.subscription_plans (
  id              TEXT PRIMARY KEY,  -- 'starter','foundation','family_archive','legacy_pro','legacy_vault'
  name            TEXT NOT NULL,
  price_monthly   NUMERIC(10,2) NOT NULL,
  price_annual    NUMERIC(10,2) NOT NULL,
  storage_gb      INTEGER NOT NULL,
  max_contacts    INTEGER NOT NULL DEFAULT 3,
  overage_rate    NUMERIC(8,4) NOT NULL DEFAULT 0.10,  -- per GB
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans VALUES
  --  id               name             monthly  annual   storage_gb  max_contacts  overage  stripe_m  stripe_a  active  created     updated
  ('starter',         'Starter',         1.99,   24.00,    1,          1,           0.50,   NULL, NULL, TRUE, NOW(), NOW()),
  ('foundation',      'Foundation',      9.99,   95.90,   50,          3,           0.40,   NULL, NULL, TRUE, NOW(), NOW()),
  ('family_archive',  'Legacy Archive', 24.99,  239.90,  250,         -1,           0.40,   NULL, NULL, TRUE, NOW(), NOW()),
  ('legacy_pro',      'Legacy Pro',     49.99,  479.90,  500,         -1,           0.40,   NULL, NULL, TRUE, NOW(), NOW()),
  ('legacy_vault',    'Legacy Vault',  129.99, 1559.90, 1024,         -1,           0.40,   NULL, NULL, TRUE, NOW(), NOW());

-- ============================================================
-- LEGACY CONTINUATION FEE
-- ============================================================
CREATE TABLE public.legacy_continuation_fees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  paid_by_user_id   UUID REFERENCES public.users(id),  -- may be legacy contact
  paid_by_type      TEXT NOT NULL CHECK (paid_by_type IN ('account_owner','legacy_contact')),
  amount_usd        NUMERIC(10,2) NOT NULL DEFAULT 199.00,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id  TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','refunded')),
  activation_period_months INTEGER NOT NULL DEFAULT 24,  -- controlled by admin
  activated_at      TIMESTAMPTZ,  -- set when user passes (admin action)
  expires_at        TIMESTAMPTZ,  -- activated_at + activation_period_months
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lcf_user ON public.legacy_continuation_fees(user_id);

-- Admin setting for continuation period
CREATE TABLE public.admin_settings (
  key     TEXT PRIMARY KEY,
  value   TEXT NOT NULL,
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_settings VALUES
  ('continuation_fee_amount', '199.00', NULL, NOW()),
  ('continuation_fee_period_months', '24', NULL, NOW()),
  ('overage_rate_per_gb', '0.10', NULL, NOW()),
  ('storage_alert_80', '80', NULL, NOW()),
  ('storage_alert_90', '90', NULL, NOW()),
  ('storage_alert_95', '95', NULL, NOW());

-- ============================================================
-- VAULT DOCUMENTS
-- ============================================================
CREATE TABLE public.vault_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'legal',
  sub_category    TEXT,
  folder_id       UUID,  -- references vault_folders
  file_path       TEXT NOT NULL,  -- Supabase Storage path
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_type       TEXT NOT NULL,
  is_encrypted    BOOLEAN NOT NULL DEFAULT TRUE,
  encryption_key_hash TEXT,  -- zero-knowledge: encrypted on client
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected')),
  starred         BOOLEAN NOT NULL DEFAULT FALSE,
  locked          BOOLEAN NOT NULL DEFAULT FALSE,
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_user ON public.vault_documents(user_id);
CREATE INDEX idx_docs_category ON public.vault_documents(category);

-- ============================================================
-- VAULT FOLDERS
-- ============================================================
CREATE TABLE public.vault_folders (
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

-- ============================================================
-- LEGACY & GUARDIAN CONTACTS
-- ============================================================
CREATE TABLE public.contacts (
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
  -- Guardian folder permissions
  allowed_folder_ids  UUID[] DEFAULT '{}',
  -- ID verification
  id_document_url     TEXT,  -- Supabase Storage path
  id_type             TEXT,
  id_verified_at      TIMESTAMPTZ,
  id_verified_by      UUID REFERENCES public.users(id),  -- admin
  invite_sent_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_owner ON public.contacts(owner_user_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);

-- ============================================================
-- STORAGE USAGE METERING
-- ============================================================
CREATE TABLE public.storage_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_period  TEXT NOT NULL,  -- 'YYYY-MM'
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

CREATE INDEX idx_storage_user_period ON public.storage_usage(user_id, billing_period);

-- ============================================================
-- STRIPE PAYMENTS & INVOICES
-- ============================================================
CREATE TABLE public.payments (
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

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_stripe ON public.payments(stripe_payment_intent);

-- ============================================================
-- AFFILIATE PROGRAM
-- ============================================================
CREATE TABLE public.affiliates (
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

CREATE TABLE public.affiliate_referrals (
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

-- ============================================================
-- STRATEGIC PARTNERSHIPS
-- ============================================================
CREATE TABLE public.partners (
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

CREATE TABLE public.partner_accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  commission  NUMERIC(10,2) NOT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, user_id)
);

-- ============================================================
-- COMMISSION PAYOUTS
-- ============================================================
CREATE TABLE public.payouts (
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

-- ============================================================
-- DIGITAL DIARY
-- ============================================================
CREATE TABLE public.diary_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  entry_type  TEXT NOT NULL DEFAULT 'written'
              CHECK (entry_type IN ('written','audio','video','photo')),
  mood        TEXT CHECK (mood IN ('great','good','okay','sad','difficult')),
  tags        TEXT[] DEFAULT '{}',
  is_private  BOOLEAN NOT NULL DEFAULT FALSE,
  media_url   TEXT,  -- Supabase Storage
  duration_s  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diary_user ON public.diary_entries(user_id);

-- ============================================================
-- PASSWORD VAULT
-- ============================================================
CREATE TABLE public.password_vault (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  website_url       TEXT,
  username          TEXT,
  email             TEXT,
  encrypted_password TEXT NOT NULL,  -- AES-256 encrypted, zero-knowledge
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

CREATE INDEX idx_password_vault_user ON public.password_vault(user_id);

-- ============================================================
-- AUTO PAY & SUBSCRIPTIONS TRACKER
-- ============================================================
CREATE TABLE public.subscription_tracker (
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

CREATE INDEX idx_sub_tracker_user ON public.subscription_tracker(user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('info','warning','success','error')),
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON public.notifications(user_id, read);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
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

CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id);

-- ============================================================
-- ID VERIFICATION QUEUE
-- ============================================================
CREATE TABLE public.id_verifications (
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

CREATE INDEX idx_idv_status ON public.id_verifications(status);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE public.webhooks (
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

-- ============================================================
-- WHITE LABEL CONFIGURATIONS
-- ============================================================
CREATE TABLE public.white_label_configs (
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_continuation_fees ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "users_own_data" ON public.users FOR ALL USING (auth.uid() = id);
CREATE POLICY "docs_own" ON public.vault_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "folders_own" ON public.vault_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "contacts_own" ON public.contacts FOR ALL USING (auth.uid() = owner_user_id);
CREATE POLICY "storage_own" ON public.storage_usage FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "diary_own" ON public.diary_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "passwords_own" ON public.password_vault FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "subs_own" ON public.subscription_tracker FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notif_own" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "affiliates_own" ON public.affiliates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "lcf_own" ON public.legacy_continuation_fees FOR ALL USING (auth.uid() = user_id);

-- Admin bypass (service role has full access)
-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.vault_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-calculate affiliate tier based on active referral count
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

-- Auto-update storage usage on document insert/delete
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
  VALUES (COALESCE(NEW.user_id, OLD.user_id), period, 0, plan_gb)
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

CREATE TRIGGER trg_storage_update AFTER INSERT OR DELETE ON public.vault_documents
FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage();

COMMENT ON TABLE public.legacy_continuation_fees IS 'One-time $199 fee ensuring vault access for legacy contacts after user passes away';
COMMENT ON TABLE public.admin_settings IS 'Platform-wide admin-configurable settings including continuation fee amount and period';
COMMENT ON TABLE public.id_verifications IS 'Government ID document submissions for legacy contact verification';

-- ============================================================
-- LEGACY CONTINUATION FEE — DOWNLOAD GATE POLICIES
-- ============================================================

-- Function to check if a user has paid the Legacy Continuation Fee
CREATE OR REPLACE FUNCTION public.has_continuation_fee_paid(owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.legacy_continuation_fees
    WHERE user_id = owner_id AND status = 'paid'
  );
END; $$;

-- Function to check if legacy contact can access vault
-- (fee must be paid AND account must have been activated by admin after death)
CREATE OR REPLACE FUNCTION public.legacy_contact_can_access(contact_user_id UUID, vault_owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Contact must be a verified legacy contact of the vault owner
  -- AND the continuation fee must be paid
  -- AND the fee must have been activated (user has passed) by admin
  -- AND the expiry must not have passed
  RETURN EXISTS (
    SELECT 1 FROM public.contacts c
    JOIN public.legacy_continuation_fees lcf ON lcf.user_id = c.owner_user_id
    WHERE c.owner_user_id = vault_owner_id
      AND c.email = (SELECT email FROM public.users WHERE id = contact_user_id)
      AND c.verification_status = 'verified'
      AND c.contact_type = 'legacy'
      AND lcf.status = 'paid'
      AND lcf.activated_at IS NOT NULL          -- admin has activated (user has passed)
      AND (lcf.expires_at IS NULL OR lcf.expires_at > NOW())  -- still within window
  );
END; $$;

-- Policy: Vault documents are downloadable only if:
-- 1. The authenticated user is the owner, AND they have paid the continuation fee
-- 2. OR the authenticated user is a verified legacy contact AND the fee is paid + activated
DROP POLICY IF EXISTS "docs_own" ON public.vault_documents;

CREATE POLICY "docs_owner_download" ON public.vault_documents
FOR SELECT USING (
  -- Account owner can always VIEW their documents
  auth.uid() = user_id
);

CREATE POLICY "docs_download_gate" ON public.vault_documents
FOR ALL USING (
  -- For downloads specifically, fee must be paid (enforced at API/function level)
  -- This is a Postgres-level guard for direct DB access
  auth.uid() = user_id
  OR public.legacy_contact_can_access(auth.uid(), user_id)
);

-- Storage policy for file downloads (Supabase Storage)
-- This is applied in Supabase Dashboard → Storage → Policies
-- Policy name: "continuation_fee_gate"
-- Condition:
--   (auth.uid() = owner AND has_continuation_fee_paid(auth.uid()))
--   OR legacy_contact_can_access(auth.uid(), owner)

-- Admin override: Service role bypasses all RLS (used for admin activation)

-- Helper view for admin dashboard
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

COMMENT ON VIEW public.admin_continuation_fee_status IS
  'Admin view showing continuation fee payment status and vault access state for all users';


-- ============================================================
-- MIGRATION 002 — New Feature Tables (added June 2026)
-- Run after 001_initial_schema.sql
-- ============================================================

-- ── White Glove Concierge Employees ────────────────────────
CREATE TABLE public.concierge_employees (
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

CREATE INDEX idx_concierge_email ON public.concierge_employees(email);

-- ── White Glove Client Records ──────────────────────────────
CREATE TABLE public.wg_clients (
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

CREATE INDEX idx_wg_clients_user ON public.wg_clients(user_id);
CREATE INDEX idx_wg_clients_specialist ON public.wg_clients(specialist_id);

-- ── White Glove Sessions ────────────────────────────────────
CREATE TABLE public.wg_sessions (
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

CREATE INDEX idx_wg_sessions_client ON public.wg_sessions(client_id);

-- ── White Glove Authorization Waivers ──────────────────────
CREATE TABLE public.wg_waivers (
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
  signature_data    TEXT,  -- base64 drawn signature OR typed name
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_wg_waivers_client ON public.wg_waivers(client_user_id);
CREATE INDEX idx_wg_waivers_status ON public.wg_waivers(status);

-- RLS: Users can view their own waivers
ALTER TABLE public.wg_waivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_waiver" ON public.wg_waivers
  FOR SELECT USING (client_user_id = auth.uid());

-- ── Crypto Transactions ─────────────────────────────────────
CREATE TABLE public.crypto_transactions (
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

CREATE INDEX idx_crypto_txns_user ON public.crypto_transactions(user_id);
CREATE INDEX idx_crypto_txns_status ON public.crypto_transactions(status);
CREATE INDEX idx_crypto_txns_invoice ON public.crypto_transactions(invoice_id);

-- ── Push Notifications Log ──────────────────────────────────
CREATE TABLE public.push_notifications (
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

CREATE TABLE public.push_notification_receipts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id   UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  UNIQUE (notification_id, user_id)
);

-- ── Contact Groups (Family & Friends) ──────────────────────
CREATE TABLE public.contact_groups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  color             TEXT NOT NULL DEFAULT '#2040C0',
  member_contact_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_groups_user ON public.contact_groups(owner_user_id);

-- RLS
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_groups" ON public.contact_groups
  FOR ALL USING (owner_user_id = auth.uid());

-- ── User 2FA Settings ───────────────────────────────────────
CREATE TABLE public.account_2fa_settings (
  user_id           UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  method            TEXT CHECK (method IN ('sms','email_otp','authenticator')),
  totp_secret       TEXT,          -- encrypted; used for authenticator app
  phone_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  backup_codes      TEXT[],        -- hashed backup codes
  enabled_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.account_2fa_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_2fa" ON public.account_2fa_settings
  FOR ALL USING (user_id = auth.uid());

-- ── Crypto Merchant Processor Config ───────────────────────
CREATE TABLE public.crypto_processor_configs (
  id                TEXT PRIMARY KEY,  -- 'coinbase','bitpay','nowpay',etc
  name              TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  config_encrypted  TEXT,             -- AES-encrypted JSON of API keys
  updated_by        UUID REFERENCES public.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.crypto_processor_configs (id, name, enabled, is_default) VALUES
  ('stripe',   'Stripe',           TRUE,  TRUE),
  ('paypal',   'PayPal',           TRUE,  FALSE),
  ('coinbase', 'Coinbase Commerce',FALSE, FALSE),
  ('bitpay',   'BitPay',           FALSE, FALSE),
  ('nowpay',   'NOWPayments',      FALSE, FALSE),
  ('square',   'Square',           FALSE, FALSE),
  ('braintree','Braintree',        FALSE, FALSE),
  ('strike',   'Strike Lightning', FALSE, FALSE),
  ('custom',   'Custom Processor', FALSE, FALSE);

-- ── White Label Package Definitions (live-editable) ────────
CREATE TABLE public.wl_packages (
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

-- Seed the three WL packages
INSERT INTO public.wl_packages
  (id, name, tier, user_limit, user_limit_label, billing_type, flat_monthly, setup_fee, commission_pct, color, badge, features, onboarding_link) VALUES
  ('agency',       'Agency Partner',       'AGENCY',       500,  'Up to 500 users',    'flat_monthly', 2999,  2500, 0, '#2040C0', NULL,          ARRAY['Up to 500 user accounts','Full white label (your domain + branding)','Priority support (24h SLA)','Partner analytics dashboard','Custom email templates','Dedicated onboarding manager','API access','Marketing & sales materials'], 'finalpassdown.com/partner/onboard?tier=agency'),
  ('enterprise',   'Enterprise Partner',   'ENTERPRISE',   5000, '501 – 5,000 users',  'flat_monthly', 7499,  5000, 0, '#9F7AEA', 'Most Popular', ARRAY['501 – 5,000 user accounts','Fully custom branded platform','24/7 dedicated support line','Real-time white-label analytics','Custom feature development','99.9% SLA uptime guarantee','White-glove onboarding','Revenue sharing dashboard','Enterprise API + webhooks'], 'finalpassdown.com/partner/onboard?tier=enterprise'),
  ('institutional','Institutional Partner','INSTITUTIONAL', NULL, '5,000+ users',       'flat_monthly', 15000, 5000, 0, '#48BB78', 'Best Value',   ARRAY['5,000+ user accounts (unlimited)','Custom-built branded platform','Named account executive','Custom SLA & infrastructure','HIPAA / SOC 2 compliance package','On-site onboarding & training','Custom API rate limits','Quarterly business reviews','Co-marketing opportunities'], 'finalpassdown.com/partner/onboard?tier=institutional');

COMMENT ON TABLE public.wl_packages IS 'Live-editable WL package definitions — changes immediately reflect on landing page via API';

-- ── White Glove Client Document Submissions ─────────────────
-- Stores documents submitted by clients (or family) via the
-- secure upload link before the specialist uploads them to the vault.
CREATE TABLE public.wg_document_submissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id     UUID REFERENCES public.concierge_employees(id),
  submit_token      TEXT NOT NULL,              -- matches the secure link token
  file_name         TEXT NOT NULL,
  file_type         TEXT NOT NULL DEFAULT 'document',
  file_size_bytes   BIGINT NOT NULL DEFAULT 0,
  storage_path      TEXT,                       -- Supabase Storage path in wg-submissions bucket
  category          TEXT NOT NULL,             -- e.g. "Legal Documents", "Insurance Policy"
  client_notes      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','received','uploaded_to_vault','needs_resubmit')),
  vault_folder      TEXT,                       -- which folder it was uploaded to
  vault_document_id UUID REFERENCES public.vault_documents(id), -- link after upload
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at       TIMESTAMPTZ,
  uploaded_at       TIMESTAMPTZ
);

CREATE INDEX idx_wg_submissions_client ON public.wg_document_submissions(client_user_id);
CREATE INDEX idx_wg_submissions_token  ON public.wg_document_submissions(submit_token);
CREATE INDEX idx_wg_submissions_status ON public.wg_document_submissions(status);

-- RLS: Clients can see their own submissions; specialists see assigned clients' submissions
ALTER TABLE public.wg_document_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_own_submissions" ON public.wg_document_submissions
  FOR SELECT USING (client_user_id = auth.uid());

-- Admins and specialists access via service role in Edge Functions
COMMENT ON TABLE public.wg_document_submissions IS
  'Documents submitted by White Glove clients via their secure upload link, pending specialist review and vault upload';

-- ── White Glove Session Billing ─────────────────────────────────
CREATE TABLE public.wg_session_billing (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialist_id         UUID NOT NULL REFERENCES public.concierge_employees(id),
  session_type          TEXT NOT NULL CHECK (session_type IN ('phone','video')),
  started_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ NOT NULL,
  duration_minutes      INTEGER NOT NULL,
  blocks_charged        INTEGER NOT NULL,        -- ceil(duration / 30)
  amount_charged        NUMERIC(8,2) NOT NULL,   -- blocks × $25
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

CREATE INDEX idx_wg_billing_client    ON public.wg_session_billing(client_user_id);
CREATE INDEX idx_wg_billing_specialist ON public.wg_session_billing(specialist_id);
CREATE INDEX idx_wg_billing_status    ON public.wg_session_billing(status);

-- ── White Glove Client Payment Methods ──────────────────────────
-- Stores the Stripe customer ID and default payment method for each WG client
CREATE TABLE public.wg_payment_methods (
  user_id               UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT,
  stripe_payment_method TEXT,       -- Stripe PM ID for automatic charging
  card_brand            TEXT,
  card_last4            TEXT,
  card_expiry           TEXT,
  cardholder_name       TEXT,
  added_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.wg_session_billing IS
  'Per-session billing records for White Glove service: $99 setup + $25/30min blocks, charged automatically via Stripe';

COMMENT ON TABLE public.wg_payment_methods IS
  'Stripe payment methods on file for White Glove clients — charged automatically after each session';
