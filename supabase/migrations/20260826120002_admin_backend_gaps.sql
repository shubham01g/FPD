-- ============================================================
-- Final Pass Down — Admin Backend Gap Tables
-- Migration 002 (run after 001_initial_schema.sql)
--
-- Adds tables needed by the admin backend (Milestone 3, Phase 1)
-- that 001_initial_schema.sql did not cover:
--   - email_templates      (Email Templates admin screen)
--   - enterprise_api_keys  (Enterprise API section)
--   - enterprise_api_usage (per-key request log for rate-limit / usage display)
--
-- NOT YET APPLIED to any project — draft only until a Supabase
-- project is chosen and Phase 0 env vars are set.
-- ============================================================

-- ── Email Templates (admin-editable, sent by transactional email jobs) ──
CREATE TABLE public.email_templates (
  id            TEXT PRIMARY KEY,          -- slug, e.g. 'welcome'
  category      TEXT NOT NULL,             -- 'Account','Storage','Contacts','Subscriptions','Affiliate','Partnership','Security','White Label'
  name          TEXT NOT NULL,
  subject       TEXT NOT NULL,
  trigger_event TEXT NOT NULL,             -- human-readable, e.g. 'On new account registration'
  variables     TEXT[] NOT NULL DEFAULT '{}',
  html          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_email_templates_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Enterprise API Keys ──────────────────────────────────────
CREATE TABLE public.enterprise_api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  partner_id        UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  key_prefix        TEXT NOT NULL,           -- shown in UI, e.g. 'fpd_live_9k2x'
  key_hash          TEXT NOT NULL,           -- SHA-256 of the full secret; used to verify a presented key
  secret_encrypted  TEXT,                    -- AES-256-GCM(secret), lets an admin reveal the original key again later
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at      TIMESTAMPTZ,
  created_by        UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ,
  CHECK (owner_user_id IS NOT NULL OR partner_id IS NOT NULL)
);

CREATE INDEX idx_enterprise_keys_owner ON public.enterprise_api_keys(owner_user_id);
CREATE INDEX idx_enterprise_keys_partner ON public.enterprise_api_keys(partner_id);

-- ── Enterprise API Usage Log ─────────────────────────────────
CREATE TABLE public.enterprise_api_usage (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key_id    UUID NOT NULL REFERENCES public.enterprise_api_keys(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  method        TEXT NOT NULL,
  status_code   INTEGER NOT NULL,
  response_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enterprise_usage_key ON public.enterprise_api_usage(api_key_id, created_at DESC);

-- ── White Label Config — two fields the admin editor (WhiteLabelConfig.tsx)
-- needs that 001_initial_schema.sql didn't add a column for ──
ALTER TABLE public.white_label_configs ADD COLUMN logo_text TEXT;
ALTER TABLE public.white_label_configs ADD COLUMN footer_text TEXT;

COMMENT ON TABLE public.email_templates IS 'Admin-editable transactional email templates, keyed by slug';
COMMENT ON TABLE public.enterprise_api_keys IS 'API keys issued to enterprise/white-label partners for the Enterprise API section';
COMMENT ON TABLE public.enterprise_api_usage IS 'Per-request log for enterprise API keys — backs usage/rate-limit display in admin';

-- ── Default White Label config row ───────────────────────────
-- white_label_configs has no seed row in 001_initial_schema.sql, so the admin
-- editor (WhiteLabelConfig.tsx) would otherwise have nothing to load. Seeds
-- the same values that used to live in WhiteLabelContext.tsx's defaultConfig.
INSERT INTO public.white_label_configs
  (organization, company_name, tagline, primary_color, accent_color, logo_text, domain,
   support_email, sender_name, terms_url, privacy_url, features, plan_names, footer_text, is_active)
VALUES (
  'default',
  'Final Pass Down',
  'My Life · My Wishes · My Way',
  '#5B6EE1',
  '#5B6EE1',
  'FPD',
  'app.finalpassdown.com',
  'support@finalpassdown.com',
  'Final Pass Down',
  'https://finalpassdown.com/terms',
  'https://finalpassdown.com/privacy',
  '{"vault":true,"finalWishes":true,"medicalInfo":true,"financialRecords":true,"personalAssets":true,"familyMemories":true,"contacts":true,"affiliate":true,"partnership":true,"videoMessages":true,"secretVault":true}',
  '{"starter":"Starter","essential":"Essential","premium":"Premium","legacyPro":"Legacy Pro","enterprise":"Enterprise"}',
  '© 2026 Final Pass Down Inc. All rights reserved.',
  FALSE
);
