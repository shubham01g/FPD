-- ============================================================
-- Final Pass Down — Remaining Data Domains + RLS Hardening
-- Supabase PostgreSQL Migration 007
--
-- Part A hardens RLS on pre-existing tables that were missed by
-- migrations 001/002 (payments, payouts, partners, webhooks, the
-- White Glove tables, crypto tables, admin/staff tables, etc).
-- Parts B-E add tables for every remaining local/mock-only feature
-- area found in the Phase 3+ audit (see the plan doc). All
-- statements are additive/non-breaking against the current schema.
-- ============================================================

-- ============================================================
-- PART A — RLS HARDENING ON PRE-EXISTING TABLES
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_own" ON public.payments FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts_own" ON public.payouts FOR SELECT USING (auth.uid() = recipient_user_id);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_own" ON public.partners FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_accounts_own" ON public.partner_accounts FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_referrals_own" ON public.affiliate_referrals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_own" ON public.webhooks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.wg_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wg_clients_own" ON public.wg_clients FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.wg_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wg_sessions_own" ON public.wg_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wg_clients c WHERE c.id = client_id AND c.user_id = auth.uid())
);

CREATE POLICY "client_own_submissions_insert" ON public.wg_document_submissions FOR INSERT WITH CHECK (client_user_id = auth.uid());

ALTER TABLE public.wg_session_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wg_billing_own" ON public.wg_session_billing FOR SELECT USING (auth.uid() = client_user_id);

ALTER TABLE public.wg_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wg_payment_methods_own" ON public.wg_payment_methods FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crypto_txns_own" ON public.crypto_transactions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.push_notification_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_receipts_own" ON public.push_notification_receipts FOR ALL USING (auth.uid() = user_id);

-- Public read-only pricing tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans FOR SELECT USING (is_active = TRUE);

ALTER TABLE public.wl_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wl_packages_public_read" ON public.wl_packages FOR SELECT USING (active = TRUE);

-- Admin/staff-only tables: RLS enabled, no client-facing policies (service-role bypasses RLS)
ALTER TABLE public.concierge_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_processor_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART B — PHASE 3: fix gaps in "done" features
-- ============================================================

-- Broaden `memories` so FamilyMemories.tsx's 7 sub-tabs can reconnect
-- to the already-wired DemoContext.memories/addMemory instead of local mock state.
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_type_check
  CHECK (type IN ('photo','video','note','audio','message','keepsake','goal','award'));
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS achieved BOOLEAN;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS issuer TEXT;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS child_name TEXT;

-- Funeral Planning tab + obituary (pairs with the already-wired final_wishes table)
CREATE TABLE public.funeral_plans (
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
ALTER TABLE public.funeral_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funeral_plans_own" ON public.funeral_plans FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_funeral_plans_updated BEFORE UPDATE ON public.funeral_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Medical "Emergency Info" tab (MedicalInfo.tsx) — one row per user
CREATE TABLE public.medical_emergency_info (
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
ALTER TABLE public.medical_emergency_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_emergency_info_own" ON public.medical_emergency_info FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_medical_emergency_updated BEFORE UPDATE ON public.medical_emergency_info FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- PART C — PHASE 4: reconnect + Family & Friends directory
-- ============================================================

CREATE TABLE public.family_friends (
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
CREATE INDEX idx_family_friends_owner ON public.family_friends(owner_user_id);
ALTER TABLE public.family_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_friends_own" ON public.family_friends FOR ALL USING (auth.uid() = owner_user_id);
CREATE TRIGGER trg_family_friends_updated BEFORE UPDATE ON public.family_friends FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- (password_vault, subscription_tracker, diary_entries already exist + already have RLS — Phase 4 is pure frontend wiring, no SQL needed for those three.)

-- ============================================================
-- PART D — PHASE 5: new Life & Home Records tables
-- ============================================================

CREATE TABLE public.pet_records (
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

CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL, brand TEXT, model TEXT, serial_number TEXT, category TEXT,
  purchase_date TEXT, purchased_from TEXT, price NUMERIC(10,2),
  warranty_type TEXT, provider TEXT, provider_phone TEXT, provider_website TEXT,
  expiry_date TEXT, coverage_details TEXT, claim_instructions TEXT, notes TEXT,
  photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.id_keeper_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL, id_number_masked TEXT, holder_name TEXT,
  issued_by TEXT, issue_date TEXT, expiry_date TEXT, notes TEXT, document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.job_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employer TEXT NOT NULL, title TEXT, employment_type TEXT, location TEXT,
  start_date TEXT, end_date TEXT, is_current BOOLEAN NOT NULL DEFAULT FALSE,
  salary TEXT, supervisor_name TEXT, supervisor_phone TEXT, reason_left TEXT,
  achievements TEXT, notes TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.travel_trips (
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

CREATE TABLE public.daycare_records (
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

CREATE TABLE public.kids_activities (
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

CREATE TABLE public.utilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, provider TEXT, account_number TEXT, phone TEXT, website TEXT,
  autopay BOOLEAN NOT NULL DEFAULT FALSE, monthly_avg NUMERIC(10,2), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.wills_trusts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, attorney_name TEXT, date_executed TEXT, last_reviewed TEXT,
  status TEXT NOT NULL DEFAULT 'active', location TEXT, notes TEXT, document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.favorite_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT, address TEXT, phone TEXT, website TEXT,
  favorite_item TEXT, why_special TEXT, rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  visited BOOLEAN NOT NULL DEFAULT TRUE, tags TEXT[] DEFAULT '{}', photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages_to_loved_ones (
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

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  make TEXT, model TEXT, year TEXT, vin TEXT, license_plate TEXT, color TEXT,
  purchase_date TEXT, purchase_price NUMERIC(12,2), current_value NUMERIC(12,2),
  loan_lender TEXT, loan_balance NUMERIC(12,2),
  insurance_provider TEXT, insurance_policy_number TEXT, registration_expiry TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.real_estate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL, address TEXT, property_type TEXT,
  purchase_date TEXT, purchase_price NUMERIC(14,2), current_value NUMERIC(14,2),
  mortgage_lender TEXT, mortgage_balance NUMERIC(14,2), deed_location TEXT,
  insurance_provider TEXT, insurance_policy_number TEXT, property_tax_annual NUMERIC(12,2),
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL, asset_type TEXT, platform TEXT, account_identifier TEXT,
  estimated_value NUMERIC(14,2), access_instructions TEXT, beneficiary TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.weapons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weapon_type TEXT NOT NULL, make TEXT, model TEXT, caliber TEXT, serial_number TEXT,
  purchase_date TEXT, purchase_price NUMERIC(10,2), current_value NUMERIC(10,2),
  storage_location TEXT, permit_number TEXT, permit_expiry TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.weapons_locker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  locker_name TEXT NOT NULL, location TEXT, access_code_hint TEXT,
  contents TEXT, key_holder_contact TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.collectibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL, category TEXT, acquired_date TEXT, acquired_from TEXT,
  purchase_price NUMERIC(12,2), current_value NUMERIC(12,2), appraisal_date TEXT,
  condition TEXT, storage_location TEXT, provenance TEXT,
  notes TEXT, photo_url TEXT, document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS + updated_at triggers for all Phase 5 tables (uniform owner-only pattern)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pet_records','warranties','id_keeper_records','job_history','travel_trips',
    'daycare_records','kids_activities','utilities','wills_trusts','favorite_places',
    'messages_to_loved_ones','vehicles','real_estate','digital_assets','weapons',
    'weapons_locker','collectibles'
  ]
  LOOP
    EXECUTE format('CREATE INDEX idx_%1$s_user ON public.%1$s(user_id)', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%1$s_own" ON public.%1$s FOR ALL USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t);
  END LOOP;
END $$;

-- ============================================================
-- PART E — PHASE 7 groundwork: move client-editable security
-- flags server-side (storage only; enforcement is separate follow-up work)
-- ============================================================

CREATE TABLE public.wl_entitlements (
  user_id      UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  entitled     BOOLEAN NOT NULL DEFAULT FALSE,
  package_id   TEXT REFERENCES public.wl_packages(id),
  granted_at   TIMESTAMPTZ,
  granted_by   UUID REFERENCES public.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.wl_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wl_entitlements_owner_read" ON public.wl_entitlements FOR SELECT USING (auth.uid() = user_id);
-- No INSERT/UPDATE policy for regular users on purpose — only granted via service role (admin action / purchase flow).

CREATE TABLE public.disaster_recovery_state (
  user_id            UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  addon_active       BOOLEAN NOT NULL DEFAULT FALSE,
  bypass_granted     BOOLEAN NOT NULL DEFAULT FALSE,
  bypass_granted_at  TIMESTAMPTZ,
  bypass_granted_by  UUID REFERENCES public.users(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.disaster_recovery_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_state_owner_read" ON public.disaster_recovery_state FOR SELECT USING (auth.uid() = user_id);
-- Same pattern: writes only via service role (admin grant / add-on purchase flow).

CREATE TABLE public.storage_spend_caps (
  user_id        UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  cap_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  cap_amount_usd NUMERIC(10,2),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.storage_spend_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_spend_caps_own" ON public.storage_spend_caps FOR ALL USING (auth.uid() = user_id);
-- This one IS user-editable (self-imposed spend limit, not a paywall gate), so FOR ALL is correct here.
