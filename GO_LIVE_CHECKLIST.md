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

## Build reference

| Piece | Where |
|---|---|
| Migrations | `038_billing_security_lockdown`, `039_billing_core`, `040_storage_metering`, `041_affiliate_attribution` (both `database/migrations/` and `supabase/migrations/`; paste `APPLY_PENDING_03x.sql` in order) |
| Hourly job | `database/cron/billing_rollover.template.sql` |
| Cutover cleanup | `database/cutover/stripe_test_data_cleanup.sql` |
| Webhook | `POST …/functions/v1/<function>/make-server-b5ad85e0/public/stripe/webhook` |
| Status (no secrets) | `GET …/functions/v1/<function>/make-server-b5ad85e0/public/billing/status` |
| Stripe API version | `2024-06-20`, pinned in `lib/stripe.ts`; every object is re-read, so any webhook endpoint version works |
| Admin | Subscription Config → Stripe Billing panel (sync, portal, webhook check, health); Users → Billing tab |

`<function>` is `server-billing` in Phases A–B and `server` from Phase D on.

---

## Phase A: code reaches Supabase in test mode

Everything here touches the shared Supabase project, so each step waits for
the owner's go. Production `server` is not touched: the branch runs as
`server-billing`.

- [x] **Real-users check** (read-only, SQL Editor). Shows how many accounts
      are on a paid plan without paying; this decides grandfathering in Phase D.
      ```sql
      select plan, plan_status, subscription_waived, count(*) from public.users group by 1,2,3 order by 1;
      select enabled, is_default, config_encrypted is not null as has_keys from public.crypto_processor_configs where id = 'stripe';
      ```
- [x] Apply `APPLY_PENDING_038.sql` (security lockdown). Check its verification queries.
      _Note: from now on the browser can't change its own plan. Production's
      old front end falls back to "Card payments are being set up" for
      upgrades; that is intended._
- [x] Apply `APPLY_PENDING_039.sql`, then `APPLY_PENDING_040.sql`, then `APPLY_PENDING_041.sql`.
- [x] Owner sets the **test** secrets for the project (Supabase → Edge Functions → Secrets):
      `STRIPE_SECRET_KEY=sk_test_…` (from the Final Pass Down, LLC account's test mode),
      `APP_URL` (see pitfall 4.12), `CRON_SECRET` (long random),
      `RENEWAL_CONSENT_REQUIRED=false`, `BILLING_RETURN_ORIGINS=http://localhost:5173`.
      Secrets are project-wide, but production `server` runs main's code,
      which doesn't read them.
- [x] Deploy: `supabase functions deploy server-billing --project-ref evedkmczpuficbzsvhts`
      (show `git diff main -- supabase/functions` first).
- [x] `GET …/server-billing/…/public/billing/status` shows `stripeConfigured:true, livemode:false`.
- [x] Stripe (test mode) → Developers → Webhooks → add endpoint
      `…/functions/v1/server-billing/make-server-b5ad85e0/public/stripe/webhook` with the 10 events
      (listed in the admin panel). Owner pastes its signing secret as `STRIPE_WEBHOOK_SECRET`, then redeploy.
- [x] Local `.env.local`: `VITE_SERVER_FUNCTION=server-billing`; run the app on localhost.
- [x] Admin → Subscription Config → Stripe Billing: **Sync catalog (dry run)** shows
      13 to create (4 paid plans × monthly/yearly + 5 products), 0 errors; **Apply**.
- [x] **Set up customer portal**; **Check webhook** shows OK.
- [x] Run `database/cron/billing_rollover.template.sql` with `<FUNCTION>` = `server-billing`.
- [x] Stripe test dashboard: Settings → Payments → **Adaptive Pricing off**.

## Phase B: prove it in test mode

Cards: `4242 4242 4242 4242` succeeds · `4000 0025 0000 3155` needs 3-D Secure ·
`4000 0000 0000 0341` attaches then every charge fails · `4000 0000 0000 9995`
declined · `4000 0000 0000 0259` disputed. Use test clocks for renewals
(scratch helpers: `stripe.mjs clock:*`, then `/admin/billing/test/link-customer`).
Small-file overage: `/admin/billing/test/set-meter` (1 MB units, 5 MB included).

**Plans**
- [x] Starter: new signup is on free Starter; 1 GB hard block; wall after 14 days.
- [x] Foundation monthly: consent box required; `billing_consents` row has the session id; plan active.
- [x] Advance clock 1 month: renewal invoice correct; usage period rolled.
- [x] Legacy Vault yearly at $1,247.90; monthly usage slices; renewal reminder email ~30 days before renewal.
- [x] Upgrade Foundation → Legacy Pro: charged prorated now; usage closed at the old rate.
- [x] Downgrade Legacy Pro → Foundation: nothing charged; "pending" shown; applies at period end.
- [x] Monthly → yearly on the same plan (now); yearly → monthly (at period end).
- [x] Cancel at period end, then "Keep my plan"; cancel and let it end → Reactivate wall.
- [ ] Each plan bought once (monthly or yearly) so every price is exercised.

**Overage**
- [x] Monthly plan: overage line on the renewal invoice equals the closure.
- [x] Yearly plan: standalone overage invoice from the rollover; below $0.50 it waits.
- [x] Cap reached: upload refused with "Raise my limit"; raising it charges nothing extra.
- [x] Comped account over its allowance: uploads stop; closure `skipped_reason = comped`.
- [x] Deleting a file removes the stored object; the meter goes down (peak stays for the period).

**Failed payments**
- [x] Renewal with `…0341`: past_due banner, one email, retries, then deleted → Reactivate, and it **stays** ended (pitfall 4.3).
- [x] Declined standalone overage: uploads limited, one email; paying the invoice lifts it.
- [x] `…3155` at checkout: active, and **no** failure email (pitfall 4.2).

**Add-ons and one-time products**
- [x] Disaster Recovery monthly and yearly: active on both DR pages; cancel at period end; ends when the plan ends.
- [x] Legacy Continuation Fee $199: fee row paid; admin activation still works.
- [x] White Glove $99: card saved (brand/last4 in admin); a 45-minute session charged = 2 blocks = $50.
- [ ] White Glove session on a `…0341` saved card: row failed, admin emailed.

**Admin**
- [x] Price change (e.g. Foundation $10.99): dry run shows 1 reprice; apply; new checkout charges it; old price archived; existing subscriber unchanged.
- [x] Comp a plan, then end the comp → Reactivate.
- [x] Refund & end: refund issued, subscription cancelled now, refund row with admin email.
- [x] Refund a one-time charge from the Billing tab.

**Referrals and commissions**
- [x] Sign up through `/r/CODE`: `affiliate_referrals` row created.
- [x] Referred account pays: commission row; 50% dashboard refund reverses half; `…0259` dispute reverses the rest; won dispute restores it.

**Robustness**
- [x] Resend a webhook event from the dashboard: `{duplicate:true}`, one effect.
- [x] Hand-made subscription in the dashboard (no `userId`): 200, nothing changed.
- [x] `BILLING_PAUSED=true`: checkout and plan changes refused (503); cancel and the portal still work.
- [x] Cutover script with `ROLLBACK` on the test data: counts match expectations.

**Phase B run, Oct 25 2026** (sandbox "Final Pass Down, LLC sandbox"). Fixed while testing:
an upgrade billed overage twice (a seconds-long old-plan usage period, `planChange.ts`);
yearly → monthly was applied at once with a year's proration credit (now at period end,
server and `StorageUsage.tsx`); a declined upgrade sent a "payment failed" email although
the plan was untouched; plan-change payments were described by their credit line;
`wg_session_billing.charged_at` was never set; changing a price and back within 24 hours
pointed checkout at the archived original (Stripe idempotency replay, `catalog.ts`); a
dispute handled before its `invoice.paid` left the commission and payment unreversed (now
caught up in `onInvoicePaid`). Test clocks are driven server-side by
`/admin/billing/test/clock`, `/clock/advance`, `/set-card` and `/win-dispute` (test key only).

Sandbox settings to mirror in Phase C: Bank, Amazon Pay, Cash App Pay and Klarna are on in
the sandbox (hosted invoice page); the renewal reminder fired about 3 days ahead (set 30).

All Phase B items are done (the dashboard resend answered `duplicate`; the hand-made
subscription changed nothing). `APP_URL` is confirmed as `https://finalpassdown.com`.
Affiliate enrolment was missing (nothing created an `affiliates` row): members now join on
the Affiliate Program page (`/account/affiliate/join`, starts `inactive` = PENDING, admin
alerted) and an admin approves with the tick in Affiliate Admin.
Gaps left: `affiliates.active_referrals` stays 0 after a referral pays (needs a migration;
the member page counts correctly); an admin portal whose login expired shows "Missing
Authorization bearer token" instead of returning to sign-in.
Display leftovers: a canceled subscription's row in the admin Billing tab still says
"renews"; the user modal's Overview card shows monthly price and "Next billing: Not
tracked" for yearly plans; the Master Admin MRR card counts `users.plan` (unpaid Foundation
accounts, yearly at the monthly price).

## Phase C: live Stripe dashboard (owner, Final Pass Down, LLC account)

1. Business verification complete; payout bank account added (Settings → Payouts); statement descriptor; branding; customer receipt emails on.
2. Payment methods: cards, Apple Pay, Google Pay, Link.
3. Stripe Tax registrations, only if the accountant says so.
4. Billing → Subscriptions and emails: Smart Retries; failed-payment emails; 3-D Secure hosted confirmation link; upcoming renewal events 30 days ahead; card auto-update.
5. Radar default rules.
6. **Adaptive Pricing off.**
7. Webhook endpoint `…/functions/v1/server/make-server-b5ad85e0/public/stripe/webhook`, the 10 events, default API version. Save the signing secret in a password manager.
8. Live secret key: save it in a password manager (it may be shown only once). **Don't** put it anywhere yet.
9. Keep the **test** key and test webhook secret too, for rollback.
10. White Label / enterprise products are invoiced by hand (Stripe Invoicing).

## Phase D: cutover window (about 1 hour, owner's explicit go)

1. Set `BILLING_PAUSED=true`. `/public/billing/status` shows `billingPaused:true`.
2. Merge `feature/stripe-billing` to `main`; deploy `server` from main; wait for the Vercel production deploy of that commit.
3. Remove `RENEWAL_CONSENT_REQUIRED` (consent becomes required).
4. Run `database/cutover/stripe_test_data_cleanup.sql` with `ROLLBACK`, read the counts, then with `COMMIT`.
5. Owner pastes `sk_live_…` and the live `whsec_…`; `/public/billing/status` shows `livemode:true`.
6. Admin → Sync catalog: dry run (expect 13 to create, 0 errors), apply; set up the portal; check the webhook.
7. Re-run the cron template with `<FUNCTION>` = `server`.
8. Set `admin_settings.storage_enforcement_enabled = 'true'` (uploads start being refused at the limits).
9. Grandfathering (owner's decision, Oct 25): comp team and test accounts (Users → Billing → Comp a plan, Foundation); real customers see Reactivate.
   - Comp, team: `demo@`, `jc@`, `josh@finalpassdown.com`, `thecavittgroup@gmail.com`, `manishagunjal184@gmail.com`.
   - Comp, test: `claude-smoketest-17544@example.com`, `proxy-check-25893@example.com`, `cewohan662@neowd.com`, `fikij69990@dd2car.com`, `jenid99465@bitproy.com`, `kekobol340@airychen.com`, `shubham@gmail.com` (paused).
   - Owner to confirm: `agmw.ambassador@gmail.com`, `jeraldcavitt@gmail.com`, `mary@bam.eco`, `ruchabagul12@gmail.com`.
10. Remove `BILLING_PAUSED`; status shows `billingPaused:false`.
11. **Real-card smoke test:** buy Foundation monthly with a real card; check plan active, `stripe_events`, consent row, live customer row, receipt email; then Refund & end and check the refund.
12. Delete the `server-billing` function and the `VITE_SERVER_FUNCTION` setting.
13. Watch webhook deliveries (0 failures) and function logs.

**Rollback:** `BILLING_PAUSED=true`; put the test key and test webhook secret back. Customers are stored per mode, so live data is untouched; live subscriptions keep billing in Stripe and their events retry for up to 3 days.

## Phase E: first 30 days

- Daily (Admin → Stripe Billing → Billing health): webhook failures; overage unbilled after 2 hours; declined overage; dispute rate under 0.75%.
- Around day 30, before the first overage renewals finalize, compare renewal invoices with the closures by hand.
- Before the first affiliate payout: set up Stripe Connect (or pay by hand) and check `affiliate_commissions` against `affiliates.pending_payout`.
