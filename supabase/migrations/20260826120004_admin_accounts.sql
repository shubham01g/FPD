-- ============================================================
-- Final Pass Down — Admin Team & Roles (Milestone 3, Phase 5)
-- Migration 004 (run after 001–003)
--
-- Backs AdminRoles.tsx. Role *presets* (Super Admin, Operations Manager,
-- etc.) and the 16-module permission matrix stay defined in the frontend
-- (src/app/components/admin/AdminRoles.tsx) — they're fixed platform
-- tiers, not something admins create/delete. What this table adds is the
-- actual roster: who has which role, their resolved per-module
-- view/edit/delete permissions, and invite/suspension state.
--
-- NOT YET APPLIED to any project — draft only.
-- ============================================================

CREATE TABLE public.admin_accounts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.users(id),   -- linked once they accept the invite and sign in
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  role              TEXT NOT NULL DEFAULT 'support_agent',
  status            TEXT NOT NULL DEFAULT 'invited'
                    CHECK (status IN ('active','invited','suspended')),
  permissions       JSONB NOT NULL DEFAULT '[]',  -- resolved [{module,label,canView,canEdit,canDelete}, ...]
  invited_by        UUID REFERENCES public.users(id),
  invite_token      TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  notes             TEXT,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_accounts_email ON public.admin_accounts(email);
CREATE INDEX idx_admin_accounts_user ON public.admin_accounts(user_id);
CREATE INDEX idx_admin_accounts_status ON public.admin_accounts(status);

CREATE TRIGGER trg_admin_accounts_updated
  BEFORE UPDATE ON public.admin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.admin_accounts IS
  'Admin team roster with per-module permissions — backs AdminRoles.tsx and is checked server-side by every /admin/* route (see supabase/functions/server/middleware/modulePermission.ts). A users.is_admin=true account with no row here still gets full legacy access for backward compatibility until it is formally added here.';
