# Final Pass Down — Complete Production Setup Guide

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com → New Project
2. Name it `final-pass-down-prod`
3. Choose a strong database password (save it securely)
4. Select closest region (e.g. US East)
5. Copy your:
   - **Project URL**: `https://xxxx.supabase.co`
   - **Anon/Public Key**: starts with `eyJ...`
   - **Service Role Key**: starts with `eyJ...` *(server-side only — never expose in frontend)*

---

## Step 2: Run the Database Migration

In your Supabase SQL Editor, paste and run the full contents of:

```
database/migrations/001_initial_schema.sql
```

This creates all 30+ tables including:
- Users, plans, contacts, vault documents and folders
- Legacy continuation fees with RLS enforcement
- Affiliates, partners, payouts
- White Glove clients, sessions, waivers, concierge employees
- Crypto transactions, push notifications
- Contact groups, 2FA settings
- White label package definitions
- Audit logs, webhooks, notifications

---

## Step 3: Create Stripe Account

1. Go to https://stripe.com → Create account
2. In Developer mode, copy:
   - **Publishable Key**: `pk_live_...` (safe for frontend)
   - **Secret Key**: `sk_live_...` (server-side only)
3. Create Products & Prices for each plan in the Stripe Dashboard
4. Update the `subscription_plans` table with the Stripe price IDs (see Step 9)

---

## Step 4: Set Environment Variables

Create `.env` in the project root:

```env
# ── Supabase ──────────────────────────────────────
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key

# ── Stripe (publishable only — safe for frontend) ─
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# ── App URL ───────────────────────────────────────
VITE_APP_URL=https://finalpassdown.com

# ── Crypto Processors (public keys only) ──────────
# Coinbase Commerce — get from commerce.coinbase.com
VITE_COINBASE_COMMERCE_KEY=your-coinbase-api-key

# NOWPayments — get from nowpayments.io
VITE_NOWPAYMENTS_API_KEY=your-nowpayments-key
```

**Server-side secrets** — set via `supabase secrets set`, never in `.env`:

```bash
# Supabase admin access (for Edge Functions)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Crypto processors
supabase secrets set COINBASE_COMMERCE_API_KEY=...
supabase secrets set COINBASE_WEBHOOK_SECRET=...
supabase secrets set BITPAY_API_TOKEN=...
supabase secrets set BITPAY_WEBHOOK_ID=...
supabase secrets set NOWPAYMENTS_API_KEY=...
supabase secrets set NOWPAYMENTS_IPN_SECRET=...

# App
supabase secrets set APP_URL=https://finalpassdown.com
```

---

## Step 5: Install Dependencies

```bash
pnpm install
pnpm add @supabase/supabase-js @stripe/stripe-js
```

---

## Step 6: Deploy Edge Functions

All webhook handler templates are in `/src/app/services/stripe.ts` under `EDGE_FUNCTION_TEMPLATES`.

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref xxxx

# Create function directories
mkdir -p supabase/functions/stripe-checkout
mkdir -p supabase/functions/stripe-payment-intent
mkdir -p supabase/functions/stripe-webhook
mkdir -p supabase/functions/crypto-webhook-coinbase
mkdir -p supabase/functions/crypto-webhook-bitpay
mkdir -p supabase/functions/crypto-webhook-nowpay

# Deploy all functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy crypto-webhook-coinbase
supabase functions deploy crypto-webhook-bitpay
supabase functions deploy crypto-webhook-nowpay

# Set all secrets (see Step 4 above)
```

---

## Step 7: Configure Stripe Webhooks

In **Stripe Dashboard → Developers → Webhooks**:

- Endpoint: `https://xxxx.supabase.co/functions/v1/stripe-webhook`
- Events:
  - `payment_intent.succeeded` → marks $199 continuation fee as paid
  - `payment_intent.payment_failed` → records failed payment attempt
  - `customer.subscription.created` → activates user plan
  - `customer.subscription.updated` → syncs plan changes
  - `customer.subscription.deleted` → marks account cancelled
  - `invoice.payment_succeeded` → resets plan to active
  - `invoice.payment_failed` → marks plan as past_due

---

## Step 8: Configure Crypto Payment Processors

### Coinbase Commerce
1. Create account at commerce.coinbase.com
2. Settings → API Keys → Create API Key
3. Webhooks → Add endpoint: `https://xxxx.supabase.co/functions/v1/crypto-webhook-coinbase`
4. Set `COINBASE_COMMERCE_API_KEY` and `COINBASE_WEBHOOK_SECRET` via `supabase secrets set`

### BitPay
1. Create account at bitpay.com
2. Payment Tools → Manage API Tokens → Create Token (Merchant role)
3. Set webhook URL: `https://xxxx.supabase.co/functions/v1/crypto-webhook-bitpay`
4. Set `BITPAY_API_TOKEN` and `BITPAY_WEBHOOK_ID` via `supabase secrets set`

### NOWPayments
1. Create account at nowpayments.io
2. Store Settings → API Key → Generate
3. IPN Callbacks → URL: `https://xxxx.supabase.co/functions/v1/crypto-webhook-nowpay`
4. Set `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` via `supabase secrets set`

---

## Step 9: Update Stripe Price IDs

After creating products in Stripe Dashboard:

```sql
-- Update each plan with its Stripe price IDs
UPDATE public.subscription_plans SET
  stripe_price_id_monthly = 'price_xxx',
  stripe_price_id_annual  = 'price_yyy'
WHERE id = 'starter';

UPDATE public.subscription_plans SET
  stripe_price_id_monthly = 'price_xxx',
  stripe_price_id_annual  = 'price_yyy'
WHERE id = 'foundation';

-- Repeat for: family_archive, legacy_pro, legacy_vault
```

---

## Step 10: Configure Supabase Auth

In **Supabase Dashboard → Authentication → Settings**:

- **Email provider**: enabled
- **Site URL**: `https://finalpassdown.com`
- **Redirect URLs**: `https://finalpassdown.com/dashboard`
- **SMS provider**: Configure Twilio or similar for SMS 2FA (see Settings → Auth → Phone)
- **Email templates**: Use the templates from the Admin Portal → Email Templates panel

---

## Step 11: Create Storage Buckets

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('vault-documents', 'vault-documents', false),
  ('id-documents',    'id-documents',    false),
  ('diary-media',     'diary-media',     false),
  ('profile-photos',  'profile-photos',  true);
```

Set bucket policies:
- `vault-documents` — users own their files via RLS
- `id-documents` — service role only (admin Edge Functions)
- `diary-media` — users own their files via RLS
- `profile-photos` — public read, authenticated write

---

## Step 12: SMS Provider for 2FA (Optional but Recommended)

Users can choose SMS 2FA in Account Settings. To enable:

1. In Supabase Dashboard → Authentication → Phone
2. Connect a provider: **Twilio** (recommended), Vonage, or MessageBird
3. Enter Account SID, Auth Token, and From number
4. Test with a real phone number

---

## Step 13: PWA Configuration

The platform is a Progressive Web App. For full PWA support:

1. Create `public/manifest.json` with app name, icons, theme color
2. Register a service worker for offline caching
3. Add meta tags in `index.html` for iOS/Android "Add to Home Screen"

---

## Step 14: WL Package API — Switch to Production

In `src/app/services/wlPackages.ts`, change:

```typescript
const DEMO_MODE = true;   // ← change to false
const API_BASE = "https://api.finalpassdown.com/v1/wl";  // ← your real API URL
```

The WL packages are now stored in the `public.wl_packages` database table. Your backend API should read from and write to that table. The frontend will automatically sync via `WLPackagesContext`.

---

## Complete Service Architecture

| Service | Purpose | Auth Required |
|---|---|---|
| **Supabase Auth** | User login, session, MFA (TOTP/SMS/Email OTP) | — |
| **Supabase Database** | All vault data, contacts, payments, settings | RLS |
| **Supabase Storage** | AES-256 encrypted files | Private bucket policies |
| **Supabase Realtime** | Live notifications, storage alerts | JWT |
| **Stripe Checkout** | Subscription sign-ups and upgrades | pk_live key |
| **Stripe Payment Intents** | $199 Legacy Continuation Fee | sk_live (Edge Function) |
| **Stripe Billing Portal** | Self-service subscription management | sk_live (Edge Function) |
| **Stripe Webhooks** | Sync payment status to DB | whsec |
| **Coinbase Commerce** | Crypto checkout (BTC/ETH/SOL/etc) | API key |
| **BitPay** | Crypto checkout alternative | API token |
| **NOWPayments** | 300+ crypto options | API key |
| **Twilio (optional)** | SMS 2FA, SMS notifications | Account SID |
| **Edge Function: stripe-checkout** | Creates Stripe Checkout Session | sk_live |
| **Edge Function: stripe-payment-intent** | Creates $199 PaymentIntent | sk_live |
| **Edge Function: stripe-webhook** | Handles Stripe events → DB updates | whsec |
| **Edge Function: crypto-webhook-** | Handles crypto confirmations → DB updates | Processor secrets |

---

## Plan IDs Reference

| Display Name | Database ID | Monthly | Storage | Overage |
|---|---|---|---|---|
| Starter | `starter` | $1.99 | 1 GB | $0.50/GB |
| Foundation | `foundation` | $9.99 | 50 GB | $0.40/GB |
| Legacy Archive | `family_archive` | $24.99 | 250 GB | $0.40/GB |
| Legacy Pro | `legacy_pro` | $49.99 | 500 GB | $0.40/GB |
| Legacy Vault | `legacy_vault` | $129.99 | 1 TB | $0.40/GB |

---

## Developer Handoff Checklist

Before going live, verify each item:

- [ ] All 30+ database tables created and RLS enabled
- [ ] Stripe products created for all 5 plans (monthly + annual prices)
- [ ] Stripe webhook endpoint configured and tested
- [ ] Coinbase Commerce merchant account verified
- [ ] BitPay merchant account verified
- [ ] All `supabase secrets set` commands run for every key
- [ ] `.env` file populated with all `VITE_` variables
- [ ] Storage buckets created with correct public/private settings
- [ ] Supabase Auth configured with correct redirect URLs
- [ ] SMS provider connected for 2FA (Twilio recommended)
- [ ] `DEMO_MODE = false` set in `wlPackages.ts`
- [ ] Edge Functions deployed and tested
- [ ] `subscription_plans` table updated with real Stripe price IDs
- [ ] `wl_packages` table seeded (done via migration)
- [ ] `crypto_processor_configs` table seeded (done via migration)
- [ ] PWA manifest and service worker registered
- [ ] All three crypto webhook endpoints registered with respective processors
- [ ] Admin login tested (admin account seeded in `users` table with `is_admin = true`)
- [ ] Test end-to-end: sign up → upload doc → add legacy contact → pay $199 fee → verify death cert → Legacy Vault Clone download
