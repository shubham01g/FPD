-- Backs two admin flows that previously faked success with a setTimeout and
-- never wrote a real row:
--   - "Manually Onboard User" (MasterAdmin.tsx) — admin creates a real account
--     on a user's behalf (phone signups, white-glove intake, etc).
--   - "Send Invite" (PartnershipAdmin.tsx) — admin adds a prospective referral
--     partner (law firm, financial advisor, ...) before they've accepted.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_waived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS white_glove         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes         TEXT,
  ADD COLUMN IF NOT EXISTS waive_reason         TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_by        TEXT; -- admin email; NULL = self-signup

ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_status_check;
ALTER TABLE public.partners ADD CONSTRAINT partners_status_check
  CHECK (status IN ('active','inactive','suspended','invited'));

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS invite_note TEXT; -- optional personal note from the inviting admin
