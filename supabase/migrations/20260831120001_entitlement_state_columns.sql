-- ============================================================
-- 008 — Columns needed to move entitlement + disaster-recovery
--       state out of localStorage and onto the server.
--
-- wl_entitlements and disaster_recovery_state were created in 007 as
-- "Phase 7 groundwork", but the frontend still read both from localStorage,
-- which meant any user could grant themselves a paid add-on from devtools.
-- Wiring the UI to these tables needs three fields the tables did not carry.
--
-- Both tables keep their 007 policy shape on purpose: owner SELECT only, and
-- no user INSERT/UPDATE policy at all. Writes go exclusively through the
-- service-role admin backend (supabase/functions/server/routes/entitlements.ts).
-- ============================================================

-- A WL entitlement is only valid against a confirmed payment. The context has
-- always refused to unlock without a payment reference; now that check can be
-- made against a value the client cannot author.
ALTER TABLE public.wl_entitlements
  ADD COLUMN IF NOT EXISTS payment_ref TEXT;

-- The bypass is a fixed-length emergency window, so expiry is authoritative
-- state rather than something the client derives from granted_at. Storing it
-- explicitly also lets an admin issue a shorter window than the 48h default.
ALTER TABLE public.disaster_recovery_state
  ADD COLUMN IF NOT EXISTS bypass_expires_at TIMESTAMPTZ;

-- Reason code shown in the audit trail and in the user-facing banner.
ALTER TABLE public.disaster_recovery_state
  ADD COLUMN IF NOT EXISTS bypass_reason TEXT;
