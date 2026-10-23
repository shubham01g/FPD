-- 037 — client "what's missing" list, Phase 4: Auto Pay "bill due on day X".
--
-- subscription_tracker
--   * due_day   the day of the month a Monthly / Quarterly / Yearly bill is
--               due (1-31). next_billing_date alone can't carry it: a bill
--               due on the 31st lands on Nov 30, and stepping on from Nov 30
--               would lose the 31st for good.
--   * notes     the "Additional notes" box on the Auto Pay form, which had
--               no column and was silently dropped on save.
--
-- next_billing_date stays the cycle anchor (always a real yyyy-mm-dd now;
-- it used to be a free-text box written into this DATE column). Weekly and
-- Biweekly cycles take their weekday from it.
-- The subs_own RLS policy already covers every column.
--
-- Idempotent — safe to run more than once.

ALTER TABLE public.subscription_tracker
  ADD COLUMN IF NOT EXISTS due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS notes   TEXT;

UPDATE public.subscription_tracker
   SET due_day = EXTRACT(DAY FROM next_billing_date)::smallint
 WHERE due_day IS NULL AND next_billing_date IS NOT NULL;
