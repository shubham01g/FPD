# Stripe billing: go-live checklist

Billing is built on branch `feature/stripe-billing` and proven in Stripe **test
mode** before anything goes live. Tick a box only after seeing it work, and add
a short italic note of what was seen (amounts, ids, counts), plus any bug found
and the commit that fixed it.

---

## Decisions (agreed with the owner, Oct 2026)

**What is sold**

| Slug | What | Kind | Price | Notes |
|---|---|---|---|---|
| `starter` | Starter | not billed | free | First 14 days of a new account. No card, no Stripe customer. 1 GB, hard block, no overage. |
| `foundation` | Foundation | plan | $9.99 / mo · $95.90 / yr | 50 GB, 3 contacts |
| `family_archive` | Legacy Archive | plan | $24.99 / mo · $239.90 / yr | 250 GB, unlimited contacts |
| `legacy_pro` | Legacy Pro | plan | $49.99 / mo · $479.90 / yr | 500 GB, unlimited contacts |
| `legacy_vault` | Legacy Vault | plan | $129.99 / mo · $1,247.90 / yr | 1 TB, unlimited contacts. The annual price was $1,559.90; now 20% off like the others. |
| `dr_addon_month` / `dr_addon_year` | Disaster Recovery add-on | recurring | $4.99 / mo · $47.88 / yr | Needs a paid (or comped) plan. |
| `continuation_fee` | Legacy Continuation Fee | one-time | $199.00 | 24 months of legacy access after an admin activates it. Starter users can buy it. |
| `wg_setup` | White Glove setup | one-time | $99.00 | Saves the card for session billing. Starter users can buy it. |
| `wg_session_block` | White Glove session | charged after a session | $25.00 per 30-minute block | `ceil(minutes / 30)` blocks, charged to the saved card when an admin ends the session. |
| storage overage | Storage over the plan allowance | invoice items | $0.40 per GB | Per-plan `subscription_plans.overage_rate`. |

**Not in this build:** Partner $599 setup fee; White Label packages (invoiced
by hand through Stripe Invoicing, never "automatic"); crypto payments.

**Usage and overage**
- The meter is the total size of the account's files in the `vault-documents`
  bucket. Storage is a level, so overage is the **peak** whole GB above the
  allowance during a usage period, times the plan's rate.
- The default monthly cap is the plan's monthly price. The owner can raise it
  (Usage & Billing → "Raise my limit"); raising it never back-charges.
- At the cap, uploads pause. Starter and comped accounts can't create overage
  at all; they are blocked at the allowance.
- **Monthly plans:** overage rides on the renewal invoice (added on
  `invoice.created`).
- **Annual plans:** usage periods are monthly slices; the hourly rollover
  bills them as a standalone invoice (`metadata.purpose=usage_overage`).
  Totals under Stripe's $0.50 minimum wait for the next period.
- **Declined overage invoice:** `overage_blocked` (uploads only up to the
  allowance) and one email. Paying the invoice clears it.

**Money rules**
- USD only. `adaptive_pricing` disabled on every Checkout session **and**
  Adaptive Pricing off in the dashboard.
- Stripe Tax: off (`STRIPE_TAX_ENABLED` unset) until an accountant says yes.
- No free trial on paid plans, no setup fee, no money-back guarantee. Refunds
  are an admin action ("Refund & end", or a refund of a one-time charge).
- **Upgrades:** immediate, prorated. Usage is closed at the old rate first.
- **Downgrades:** at the end of the period (subscription schedule), shown as
  pending.
- **Monthly → annual:** immediate, credited. **Annual → monthly:** at the end
  of the period.
- **Failed payment:** `past_due` keeps access while Smart Retries run. When
  Stripe gives up, the subscription is deleted, `plan_status` becomes
  `cancelled` and the app shows a Reactivate screen. Data is kept.
- An admin suspension (`plan_status='paused'`) is never overwritten by billing.

**Legal and comms**
- Auto-renewal consent: a checkbox with the exact price, interval, "renews
  until you cancel" and how to cancel. The server stores a `billing_consents`
  row (text, price, interval, timestamp, Checkout session id).
  `RENEWAL_CONSENT_REQUIRED=false` until the front end that sends consent is
  live on production.
- Stripe sends receipts. The app sends through SendGrid, once each: failed
  renewal, declined overage, and the annual renewal reminder
  (`invoice.upcoming`).

**Admin**
- Edit prices in Subscription Config, then "Sync catalog" (dry run first).
  A price change creates a new Stripe price and archives the old one; current
  subscribers keep their price.
- Comp a plan (`comp_` subscription row, never invoiced).
- Refund & end a subscription; refund a one-time charge.
- See a user's billing (subscriptions, invoices, consents, usage, refunds,
  commissions).

**Referral money**
- A signup through `?ref=CODE` is linked to the affiliate.
- Commission is earned on paid **plan** invoices for 12 months, at the
  affiliate's rate, recorded once per invoice.
- A refund reverses the refunded fraction; a dispute reverses all of it; a won
  dispute restores it. Payouts stay manual.

**Secrets and flags** (Supabase Edge Function secrets, never in the repo or
the database; the owner pastes them)

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` until cutover, then `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | the signing secret of the endpoint for that mode |
| `APP_URL` | the domain that really serves the app (Stripe sends buyers back there) |
| `BILLING_RETURN_ORIGINS` | extra allowed return origins, comma-separated (previews, localhost) |
| `BILLING_PAUSED` | `true` only during cutover or rollback |
| `RENEWAL_CONSENT_REQUIRED` | `false` only until the consent front end is live |
| `STRIPE_TAX_ENABLED` | `true` only after Stripe Tax is set up |
| `CRON_SECRET` | protects `/internal/billing/rollover` |

**Environment:** until cutover the billing code runs as a second edge
function, `server-billing`, built from the same source. Production keeps
running `server` from `main`. Local dev points at it with
`VITE_SERVER_FUNCTION=server-billing` in `.env.local`.

---

## Phase A: code reaches Supabase in test mode
_Filled in as the build progresses._

## Phase B: prove it in test mode
_Filled in as the build progresses._

## Phase C: live Stripe dashboard (owner)
_Filled in as the build progresses._

## Phase D: cutover window
_Filled in as the build progresses._

## Phase E: first 30 days
_Filled in as the build progresses._
