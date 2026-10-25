# Stripe Billing Framework: build in test mode, prove it, then go live

A reusable playbook for adding Stripe payments to a web app. It was extracted
from a real launch (Vital Clone, Oct 2026) and covers subscriptions (monthly
and annual), one-time purchases, usage-based overage, custom and enterprise
plans, refunds and the switch from test mode to live mode.

**For the AI agent reading this:** follow the phases in order. Phase 0 comes
before any code. The architecture in section 3 is the target, adapted to this
project's stack. Section 4 lists bugs we hit in production-like testing: design
around them from the start. Keep a `GO_LIVE_CHECKLIST.md` in the repo (section
6) and tick items only after seeing them work.

---

## 1. Non-negotiable rules

1. **Secrets never leave the secret store.** Stripe keys and webhook signing
   secrets go only into the server's secret manager (Supabase secrets, Vercel
   env, AWS Secrets Manager, etc.). The agent never asks for them in chat,
   never writes them to a file, and never commits them. The human pastes them
   into the dashboard when the agent says so.
2. **Test key only on the developer machine.** `.env.local` (gitignored) may
   hold `sk_test_…`. Any local helper script must refuse to run if the key
   doesn't start with `sk_test_`.
3. **Billing work lives on a feature branch.** Never merge to the production
   branch without the owner's explicit approval, because merging changes the
   live site.
4. **Test mode first, live mode only in a planned cutover window** (Phase D).
5. **Confirm before anything hard to undo or customer-facing:** production
   secrets, production DB migrations, deploys, merges, deleting data.
6. **Commit after each change** with a clear message, and verify the build and
   typecheck before committing.
7. **A status endpoint proves the mode without revealing keys.** The agent
   checks `livemode` through it, so it never needs to see a key.

---

## 2. Phase 0: discovery (answer these with the owner before writing code)

Write the answers at the top of `GO_LIVE_CHECKLIST.md` as "Decisions".

**What is sold**
- Each plan: name, monthly price, annual price, what it includes.
- One-time products (lifetime add-ons, setup fees, services).
- Recurring add-ons (e.g. $25/yr).
- Per-seat pricing?
- Custom or negotiated plans made by an admin for one customer?
- Enterprise or white-label deals billed by hand (Stripe Invoicing)?

**Usage and overage**
- Is anything metered (minutes, credits, storage, API calls)? What's the unit?
- Included allowance per plan, rate per extra unit, and a monthly overage cap
  (a sensible default is cap = plan price).
- What happens at the cap: pause the service, or keep going?
- Who can consume the owner's allowance (team members, guests, family)? Can
  they create overage, or only use included units?

**Money rules**
- Free trial? Activation or setup fee? Money-back guarantee? Refund policy?
- Currency: USD only is strongly recommended (see pitfall 4.1).
- Sales tax: Stripe Tax yes or no (an accountant decision).
- Upgrades: immediate with proration?
- Downgrades: at the end of the period?
- Monthly to annual: allowed, prorated?
- Failed payment: how long does access continue (past_due) before it ends?

**Legal and comms**
- Auto-renewal consent. California and other states require clear consent
  plus a renewal reminder for annual plans, so store a record of consent.
- Which emails go out (receipt, failed payment, renewal reminder), and who
  sends them, Stripe or the app? Is the app's email sending verified working?

**Admin needs**
- Change prices from the admin panel.
- Give a free ("comped") plan.
- Refund and end a subscription.
- Create custom plans.
- View billing per user.

**Referral money**
- Affiliates or partners earning commission? On which payments, for how
  long, and are they reversed on refund or dispute?

---

## 3. Architecture (the target design)

Shown with Postgres + serverless functions. Map it to the project's stack.

### 3.1 Catalog: the database is the source of truth
- A `plans` (or tiers) table holds: slug, name, price_monthly, price_annual,
  `stripe_price_id`, `stripe_price_id_annual`, allowance, overage rate,
  overage cap, active.
- A `one_time_products` table holds: slug, amount, `stripe_price_id`, active.
- A **catalog sync** function (admin-only, or internal with a cron secret)
  makes Stripe match the DB. It has two modes:
  - `{dryRun:true}` lists would_create and would_reprice;
  - a real run creates the prices and writes the ids back.
- Stripe prices can't be edited. A price change creates a **new** price,
  repoints the DB and archives the old price.
- Skip inactive or deactivated items in the sync.
- No price IDs are hard-coded anywhere. Live prices are created by the sync
  during cutover.

### 3.2 Checkout
- Use **Stripe-hosted Checkout Sessions**. Card data never touches your
  servers, 3-D Secure, Apple Pay and Google Pay work with no domain setup, and
  receipts come from Stripe.
- Set `client_reference_id = userId` and metadata
  `{userId, planId, interval, purchaseType}` on the session **and** on
  `subscription_data.metadata`, so every later event can be tied to a user.
- Lock the currency: create prices in USD and pass
  `adaptive_pricing: {enabled: false}` (pitfall 4.1).
- Refuse checkout if the user already has an active plan on that product line
  (409), so nobody is billed twice.
- One Stripe customer per user **per mode**: a `billing_customers` table with
  (user_id, stripe_customer_id, livemode). Test and live ids never mix.

### 3.3 Webhook handler (one endpoint)
- Verify the signature on the **raw** body with the signing secret.
- **Idempotency:** insert `event.id` into `stripe_events` first. If it's
  already processed, answer 200 `{duplicate:true}`. Set `processed_at` at the
  end.
- **Re-read objects** through your own Stripe client with a **pinned API
  version** (`subscriptions.retrieve`, `invoices.retrieve`,
  `charges.retrieve`). The payload's shape depends on the endpoint's API
  version, which is set in the dashboard and may be newer than your code
  (pitfall 4.4).
- Answer 200 for event types you don't handle, and for `resource_missing`.
  Answer 500 for real errors so Stripe retries.
- **Never answer an error to `invoice.created`.** Stripe holds back finalizing
  the invoice for up to 72 hours while it waits.
- Ignore subscriptions without `userId` metadata. Those are hand-made ones,
  such as enterprise invoicing.

Events to subscribe:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.upcoming` (annual renewal reminder)
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

### 3.4 Subscription state
- A `subscriptions` table mirrors Stripe: user_id, plan_slug, status,
  stripe_subscription_id, price_id, interval, current_period_start/end,
  cancel_at, pending_plan_slug, pending_change_at.
- Access = status in (`active`, `trialing`, `past_due`).
- A single DB function (e.g. `provision_subscription`) sets the plan, the
  allowance and the period. Every path calls it: checkout, plan change and
  renewal.
- Comped plans are rows with a `comp_` id and no Stripe object. They're never
  invoiced and are skipped by overage billing.

### 3.5 Plan changes go through the app, not the portal
- `/change-plan` endpoint:
  - **upgrade:** immediate, prorated;
  - **downgrade:** a subscription schedule at the end of the period, shown as
    "pending";
  - **monthly to annual:** immediate, credited.
- Before an upgrade, close the current usage period at the **old** rate.
- The customer portal is only for card update, invoice history, billing
  details and cancel at period end. Turn plan switching **off** there.

### 3.6 Usage and overage (if metered)
- **The DB is the meter.** A `usage_tracking` row per user, track and period.
- An atomic `record_usage` function adds units. It clamps to the allowance
  for guests, to the cap for owners, and when overage is blocked. It returns
  `{allowed, resting/paused}`.
- At period end, write a **closure** row (`usage_period_closures`): the units
  over the allowance × the old rate, plus `billed_at`, `skipped_reason`
  (comped, zero) and `payment_failed_at`.
- **Monthly plans:** on `invoice.created` with
  `billing_reason=subscription_cycle` (a draft about 1 hour before it's
  charged), add the closure as an **invoice item on that draft**, so overage
  rides on the renewal invoice.
- **Annual plans, and anything missed:** an **hourly rollover job** (cron
  calling an endpoint with a secret) closes ended periods and bills unbilled
  closures older than 1 hour as a standalone invoice with
  `metadata.purpose=usage_overage`.
- **Overage cap:** the default equals the plan price. At the cap, pause and
  show "Raise my limit". Raising it never back-charges the clamped tail.
- **Declined overage invoice:** set `overage_blocked=true` (included units
  still work) and send one email. `invoice.paid` clears it.
- Stripe's minimum charge is $0.50. Smaller invoices go to the customer's
  balance and are collected with their next invoice. Know this, or batch.
- Make idempotency keys deterministic, e.g. use `sub.ended_at`, not `now()`,
  so a redelivered event finds the same closure.

### 3.7 Safety switches
- **`BILLING_PAUSED=true`** env flag: checkout, one-time checkout and
  change-plan answer 503 "Billing is being updated". Cancel, the portal and
  webhooks keep working. It's used during cutover and rollback.
- **`/status` endpoint** (public, no secrets): returns `stripeConfigured`,
  `webhookConfigured`, `livemode` (key doesn't contain `_test_`),
  `billingPaused` and `taxEnabled`.
- **`STRIPE_TAX_ENABLED`:** only `true` after Stripe Tax is set up.

### 3.8 Auto-renewal consent
- A checkbox before checkout with exact wording: price, interval, renews
  until cancelled, how to cancel. The button stays disabled until it's ticked.
- The server refuses checkout without consent and stores a
  `billing_consents` row with the user, the exact text, the price, the
  interval, a timestamp and the Checkout session id.
- A `RENEWAL_CONSENT_REQUIRED` flag lets the backend ship before the front
  end. Keep it off until the front end that sends consent is live, then turn
  it on.

### 3.9 Refunds, disputes and commissions
- Admin **"Refund & end":**
  - refund the latest charge;
  - cancel the subscription now;
  - write a `billing_refunds` row (reason, ids, amount);
  - reverse any commission.
- Commission is recorded on `invoice.paid`, idempotent on invoice id.
- On `charge.refunded`, reverse the refunded share: a partial refund reverses
  that fraction.
- On `charge.dispute.created`, reverse all of it. On
  `charge.dispute.closed` and won, restore it.

### 3.10 Failed payments and notifications
- On `invoice.payment_failed` for a renewal, set `past_due` and email **once**
  (`attempt_count <= 1`). Smart Retries do the rest.
- When retries run out, `customer.subscription.deleted` ends access.
- See pitfalls 4.2 and 4.3 for two traps in this handler.

### 3.11 Enterprise and white label
- Billed by hand through Stripe Invoicing. Create the products and prices in
  the live dashboard by hand.
- Admin gets a button that opens `dashboard.stripe.com/invoices/create`.
- Don't claim "invoiced automatically" anywhere in the UI until it really is.

---

## 4. Pitfalls we hit, and how to avoid them

1. **Adaptive Pricing switches currency.** Checkout charged an Indian customer
   in INR, then Stripe refused every USD overage invoice item, so overage was
   never billed. Fix: `adaptive_pricing:{enabled:false}` on sessions **and**
   Settings → Payments → Adaptive Pricing **off** in the dashboard. The hosted
   invoice page still offered INR until the dashboard setting was off.
2. **A false "payment failed" during 3-D Secure checkout.** The first
   invoice's pre-authentication fires `invoice.payment_failed` seconds before
   it succeeds. Fix: ignore it when `billing_reason === "subscription_create"`.
   Checkout shows its own errors.
3. **A cancelled plan revived by the last retry.** The final
   `invoice.payment_failed` arrived about 0.1–0.4 s **after**
   `customer.subscription.deleted` and set the plan back to past_due, so
   access never ended. Fix: re-read the subscription; if it's `canceled` or
   `incomplete_expired`, do nothing.
4. **The webhook API version can't be chosen freely.** The dashboard only
   offers the account's version or newer. Newer versions moved fields (an
   invoice no longer has `subscription`; a subscription's
   `current_period_*` moved to items). Fix: pin the SDK's `apiVersion` and
   re-read every object (3.3). Then any endpoint version works.
5. **Test clocks move only Stripe's time.** The DB's `now()` stays real.
   When testing renewals and overage, shift the DB usage periods by hand to
   match. Keep usage periods in real time, or period-closing logic skips them.
6. **Stripe Sandboxes are separate accounts.** The sandbox's verification and
   payout status says nothing about the live account. Check live in the
   dashboard.
7. **The live secret key may be shown only once.** Save it in a password
   manager straight away. Webhook signing secrets can be revealed again.
8. **Renewals that need 3-D Secure:** unless you handle
   `invoice.payment_action_required`, set Billing → "Manage payments that
   require 3-D Secure" to send Stripe's hosted confirmation link.
9. **Backend-before-frontend flags.** A server rule like required consent
   breaks the old front end. Gate it with a flag and switch it on at merge.
10. **Catalog sync must skip deactivated plans,** or it creates live prices
    for test or retired plans.
11. **Email must work before launch.** If signup confirmation or billing
    emails are broken, nobody can sign up or hear about failed payments. Test
    real delivery.
12. **The production domain:** confirm which domain actually serves the app
    before setting `APP_URL`, which is where Stripe sends buyers back.

---

## 5. Test kit (test mode)

**Cards**

| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3-D Secure |
| `4000 0000 0000 0341` | Attaches fine, then every charge fails (renewal failures) |
| `4000 0000 0000 9995` | Declined at checkout (insufficient funds) |
| `4000 0000 0000 0259` | Payment succeeds, then is disputed |

**Test clocks:** create the customer on a test clock, subscribe, then advance
the clock by a month or a year to trigger renewals, retries and
cancellations.

**Fixtures:** test users with `+tag` emails (owner, guest, comped) and their
passwords in `.env.local` as `TEST_*`. Run separate local dev servers on
different ports, one per logged-in user, because each origin keeps its own
session.

**Agent helpers** (scratch scripts, never committed):
- a Stripe API helper that refuses non-test keys;
- a "billing state" script that prints a user's subs, usage, closures,
  invoices and notifications;
- a "rollover" script that runs the hourly job like cron does.

---

## 6. `GO_LIVE_CHECKLIST.md` (create this in the repo and keep it updated)

Structure it as the phases below. For each box, add a short italic note of
what was seen (amounts, ids, counts) and any bug found and its fix commit.

### Phase A: code reaches the shared environment in test mode
- [ ] DB migrations applied (owner approves each production migration).
- [ ] Functions deployed from the branch. Before each deploy, check what the
      branch ships for that function.
- [ ] Flags set: `RENEWAL_CONSENT_REQUIRED=false` until merge,
      `BILLING_PAUSED` unset.
- [ ] Catalog sync run in test mode, so test prices exist.

### Phase B: prove it in test mode (adapt the list to the plans)

**Plans**
- [ ] Monthly subscribe: the consent box is required, and a consent row
      exists with the session id.
- [ ] Monthly renewal (advance the clock): the invoice is correct and the
      allowance resets.
- [ ] Annual subscribe and renewal; the allowance resets monthly if designed
      that way.
- [ ] Upgrade: prorated now, overage closed at the old rate.
- [ ] Scheduled downgrade: nothing charged today; the new plan starts at
      period end.
- [ ] Monthly to annual on the same plan.

**Overage**
- [ ] Monthly: overage appears as a line on the renewal invoice and equals
      the closure.
- [ ] Annual: a standalone overage invoice from rollover.
- [ ] Cap reached: service pauses with "Raise my limit".
- [ ] Raise the cap: no retroactive charge.
- [ ] Guests or team members use included units only, and overage stays 0.

**Failed payments**
- [ ] Renewal with `…0341`: past_due, one email, retries, then deleted ends
      access and **stays** ended (pitfall 4.3).
- [ ] Declined standalone overage invoice: blocked, one email; pay it and the
      block clears.
- [ ] 3-D Secure card at checkout: active, and **no** failure email
      (pitfall 4.2).

**One-time products and custom plans**
- [ ] Each one-time product: purchase recorded, and the feature unlocked.
- [ ] Recurring add-on renews after a clock advance.
- [ ] Admin custom plan: offered, paid, active.
- [ ] Admin price change: the new price is charged and the old one archived.

**Refunds and disputes**
- [ ] Admin Refund & end: refund, cancel, refund row, commission reversed.
- [ ] Dashboard partial refund: proportional reversal.
- [ ] Dispute card: commission reversed.

**Robustness**
- [ ] Resend a webhook event: exactly one effect.
- [ ] A comped user over the allowance: closure skipped as `comped`, never
      invoiced.
- [ ] A hand-made subscription with no `userId`: answered 200, nothing
      changed.
- [ ] `BILLING_PAUSED=true`: checkout and plan change refused; cancel and the
      portal still work.
- [ ] Cutover script dry run (with ROLLBACK): the counts match expectations.

### Phase C: live Stripe dashboard (the owner or client does this)
1. Business verification complete, a payout bank account added (check
   Settings → Payouts from an Administrator login), statement descriptor,
   branding, customer receipt emails on.
2. Payment methods: cards, Apple Pay, Google Pay, Link.
3. Stripe Tax: registrations, if wanted.
4. Billing → Subscriptions and emails:
   - Smart Retries;
   - failed-payment emails;
   - a 3-D Secure hosted link;
   - upcoming renewal events 30 days ahead;
   - card auto-update.
5. Radar default rules.
6. **Adaptive Pricing off.**
7. Webhook destination: our URL, the 10 events, default API version (fine
   because of 3.3). Save the signing secret in a password manager.
8. Live secret key: save it in a password manager. **Don't** put it anywhere
   yet.
9. Hand-billed products (enterprise or white label) created by hand.
10. Save the **test** webhook secret too, for rollback.

### Phase D: cutover window (about 1 hour, explicit go from the owner)
1. `BILLING_PAUSED=true`. Check that `/status` shows `billingPaused:true` and
   that checkout answers 503.
2. Merge the feature branch to production and wait until the **production**
   deploy of that commit succeeds.
3. Turn on the consent requirement (remove `RENEWAL_CONSENT_REQUIRED=false`).
4. Run the **test-data cleanup script** for real (section 7). Verify the
   counts.
5. The owner pastes `sk_live_…` and the live `whsec_…` into the secret store
   in the dashboard, then says "done". Check that `/status` shows
   `livemode:true`.
6. Catalog sync: a dry run (expect N would_create, 0 errors), then the real
   run. Then setup: webhook events check and portal configuration.
7. Remove `BILLING_PAUSED`. Check that `/status` shows `billingPaused:false`.
8. **Real-card smoke test:** buy the cheapest plan with a real card, then
   check the plan is active, the `stripe_events` row, the consent row, the
   live customer row and the receipt email. Then Refund & end, and check the
   refund was processed.
9. Watch webhook deliveries (0 failures) and function logs.

**Rollback:**
1. `BILLING_PAUSED=true`.
2. Put the test key and test webhook secret back.
3. Customers are stored per mode, so no live data is touched. Live
   subscriptions keep billing in Stripe, and their events retry for up to
   3 days.

### Phase E: first 30 days
- Daily:
  - webhook failures;
  - unbilled closures older than 2 hours;
  - closures with `payment_failed_at`;
  - dispute rate (keep it under 0.75%).
- Around day 30, before the first overage renewals finalize (a draft sits for
  about 1 hour), compare the invoices with the closures by hand.
- Before the first commission payout: Stripe Connect on, and a dry run of the
  payout job.

---

## 7. Test-data cleanup script (the cutover SQL pattern)

At cutover every stored Stripe id is a **test** id, meaningless to the live
account and sometimes harmful:
- test subscriptions look like active plans;
- test usage would be billed to real cards;
- test commissions would reach payouts;
- test price ids would go to live checkout.

One transaction:
1. `CREATE SCHEMA billing_test_archive` (revoke public access).
2. Copy, then clear or delete:
   - test `billing_customers`;
   - subscriptions with real Stripe ids (keep `comp_` rows);
   - one-time purchases and the feature flags they set (but keep anything an
     admin waived);
   - test commissions;
   - unbilled usage closures;
   - all stored price ids (plans, products, custom plans).
3. `RAISE NOTICE` the counts of what was archived and what's left.
4. Final line `COMMIT`. For the dry run, change it to `ROLLBACK` and read the
   counts.

Afterwards, verify by querying the archive tables and checking that 0 test
customers, 0 `sub_` rows and 0 price ids are left.

---

## 8. Secrets and flags reference

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` until cutover, then `sk_live_…` (pasted by the owner) |
| `STRIPE_WEBHOOK_SECRET` | the signing secret of the endpoint for that mode |
| `APP_URL` | the domain that actually serves the app (Stripe redirects there) |
| `BILLING_PAUSED` | `true` only during cutover or rollback |
| `RENEWAL_CONSENT_REQUIRED` | `false` only until the consent front end is live |
| `STRIPE_TAX_ENABLED` | `true` only after Stripe Tax is set up |
| cron secret | protects the hourly rollover endpoint and internal catalog sync |

---

## 9. How the agent should work through this

1. **Explore the codebase:** stack, auth, DB, existing payment code, deploy
   setup, git rules. Report back what exists.
2. **Run Phase 0** with the owner. Write the Decisions and the catalog table
   (every product, price and interval) into `GO_LIVE_CHECKLIST.md`.
3. **Propose a plan** mapped onto this architecture (tables, functions,
   endpoints, UI screens) and get approval.
4. **Build in small commits** on a feature branch, in test mode.
5. **Run Phase B** with test clocks and test cards. When a bug is found, fix
   it, re-test it, and note it with the fix commit.
6. **Report honestly:** list what's proven, what isn't, and what's blocking.
   Never say "working perfectly" without evidence.
7. **Phase C** goes to the owner. **Phase D** happens only on their explicit
   go, step by step, and the owner pastes the live keys.
