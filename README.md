# Final Pass Down

### *"My Life · My Wishes · My Way"*

**finalpassdown.com** — The World's Most Complete Digital Legacy Platform

---

## What Is Final Pass Down?

Imagine everything you've spent a lifetime building — your home, your savings, your memories, your instructions for what happens next — scattered across filing cabinets, emails, apps, and your own memory. Now imagine the people you love trying to piece it all together after you're gone. That's the problem Final Pass Down was built to solve.

**Final Pass Down is a secure digital legacy platform** where you organize, protect, and deliver every important piece of your life to exactly the right people at exactly the right time.

It is not just a document storage app. It is a complete life organization system — one place where a person can store their will, record a video message for their grandchildren, document every financial account, write down what should happen to the family dog, and designate who gets access to what, and when. Then, when the time comes, that information flows to the right people in an organized, protected, and dignified way.

### The Problem It Solves

Every year, families lose thousands of dollars — sometimes everything — because they can't find a will, don't know what accounts exist, can't access a spouse's email, or discover that a life insurance policy existed but no one knew about it. Estates go through probate for years over simple documents that could have been stored and shared digitally. Children grieve twice — once for the person they lost, and again for the chaos left behind.

Final Pass Down eliminates that chaos.

### Who It's For

**Individuals** — Anyone who wants to protect their family from confusion, conflict, and financial loss. Whether you're 30 and just got married, 55 and thinking about retirement, or 80 and need hands-on help — FPD was designed for you.

**Families** — Spouses, adult children, and estate attorneys who need a centralized, organized source of truth for a loved one's estate.

**Professionals** — Estate attorneys, financial advisors, insurance agents, and funeral homes who want to offer their clients a world-class digital legacy tool as a value-added service and earn recurring income for doing so.

**Enterprises** — Banks, insurance carriers, senior care networks, and HR platforms who want to offer digital legacy planning under their own brand as a licensed white label service.

---

## Platform Architecture

Five completely separate portals, each with its own authentication, navigation, and data access:

| Portal | Who It's For | Access |
|---|---|---|
| **Landing Page** | Prospective users and partners | Public |
| **User Portal** | Account holders | Personal account only |
| **Admin Portal** | FPD administrators | Full platform control |
| **Partner Portal** | Referral partners and WL orgs | Partner dashboard only |
| **Concierge Portal** | White Glove staff employees | Assigned clients only |

---

## Table of Contents

1. [Tech Stack & Project Structure](#1-tech-stack--project-structure)
2. [Getting Started](#2-getting-started)
3. [Environment Variables](#3-environment-variables)
4. [Demo Mode Switcher](#4-demo-mode-switcher)
5. [Subscription Plans & Pricing](#5-subscription-plans--pricing)
6. [Plan Feature Comparison](#6-plan-feature-comparison)
7. [User Portal Features](#7-user-portal-features)
8. [Account Settings — Profile, 2FA & Encryption](#8-account-settings--profile-2fa--encryption)
9. [Legacy Contacts & Guardian Permissions](#9-legacy-contacts--guardian-permissions)
10. [Legacy Continuation System](#10-legacy-continuation-system)
11. [Encryption — How Every File Is Protected](#11-encryption--how-every-file-is-protected)
12. [Document Scanner](#12-document-scanner)
13. [Family & Friends — Groups & Email Blast](#13-family--friends--groups--email-blast)
14. [White Glove Concierge Service](#14-white-glove-concierge-service)
15. [White Glove Pricing Model](#15-white-glove-pricing-model)
16. [White Glove Document Exchange System](#16-white-glove-document-exchange-system)
17. [White Glove Session Timer & Billing](#17-white-glove-session-timer--billing)
18. [Authorization Waiver System](#18-authorization-waiver-system)
19. [Concierge Staff Portal](#19-concierge-staff-portal)
20. [Admin Command Center](#20-admin-command-center)
21. [Analytics Dashboard](#21-analytics-dashboard)
22. [Manual User Onboarding](#22-manual-user-onboarding)
23. [Push Notification Center](#23-push-notification-center)
24. [Admin Team & Role Management](#24-admin-team--role-management)
25. [Reports & Downloads](#25-reports--downloads)
26. [Affiliate Program](#26-affiliate-program)
27. [Partner Program](#27-partner-program)
28. [White Label Solutions](#28-white-label-solutions)
29. [Crypto Payments](#29-crypto-payments)
30. [Email Templates](#30-email-templates)
31. [Security Architecture](#31-security-architecture)
32. [Database Schema](#32-database-schema)
33. [Stripe Integration](#33-stripe-integration)
34. [Supabase Setup](#34-supabase-setup)
35. [New Features (Latest Sessions)](#35-new-features-latest-sessions)
36. [Final Feature Updates](#36-final-feature-updates)
37. [Developer Handoff Checklist](#37-developer-handoff-checklist)

---

## 1. Tech Stack & Project Structure

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v4 + inline styles |
| State | React Context — DemoContext, WhiteLabelContext, WLPackagesContext |
| Database | Supabase PostgreSQL with Row Level Security |
| Auth | Supabase Auth + TOTP / SMS / Email OTP 2FA |
| Storage | Supabase Storage — AES-256 encrypted private buckets |
| Payments | Stripe + Coinbase Commerce + BitPay + NOWPayments |
| Edge Functions | Supabase Edge Functions (Deno) |
| Fonts | Cinzel (display), DM Sans (body), JetBrains Mono (mono) |

```
src/app/
├── components/
│   ├── AccountSettings.tsx          # Profile, 2FA, encryption, notifications
│   ├── LandingPage.tsx              # Marketing website (full imagery)
│   ├── Layout.tsx                   # User portal sidebar + shell
│   ├── UserDashboard.tsx            # Home dashboard + checklist
│   ├── LegacyVault.tsx              # Encrypted vault (fee-gated)
│   ├── DigitalFileCabinet.tsx       # 18-folder document cabinet
│   ├── FinalWishes.tsx              # Wills, bequests, estate instructions
│   ├── MedicalInfo.tsx              # Allergies, medications, directives
│   ├── FinancialRecords.tsx         # Insurance, real estate, investments
│   ├── PersonalAssets.tsx           # Vehicles, utilities, digital assets
│   ├── FamilyMemories.tsx           # Photos, videos, written memories
│   ├── FamilyFriends.tsx            # Contact book + groups + email blast
│   ├── ContactsHub.tsx              # Legacy & guardian contacts
│   ├── LegacyVerification.tsx       # ID verification tracking
│   ├── DigitalDiary.tsx             # Text, audio, video diary
│   ├── PasswordManager.tsx          # Encrypted credentials
│   ├── SubscriptionManager.tsx      # Auto-pay & subscriptions tracker
│   ├── StorageUsage.tsx             # Storage metering + billing
│   ├── OrganizeHub.tsx              # Custom folders + reminders
│   ├── AffiliateProgram.tsx         # Referral dashboard
│   ├── LegacyContinuationFee.tsx    # $199 fee + card/crypto payment
│   ├── VaultClone.tsx               # Complete account download
│   ├── DocumentScanner.tsx          # Camera-based document scanner
│   ├── CryptoPayment.tsx            # Crypto checkout modal (8 coins)
│   ├── WhiteGloveService.tsx        # User-facing WG intake + pricing
│   ├── WGClientSubmit.tsx           # Client doc upload page (token-based)
│   ├── WGDocumentInbox.tsx          # Specialist inbox — synced live
│   ├── WGSessionTimer.tsx           # Live timer + auto-billing per session
│   ├── WGCardOnFile.tsx             # Card collection for WG clients
│   ├── WaiverForm.tsx               # Authorization waiver + e-signature
│   ├── ConciergeLogin.tsx           # Staff-only login page
│   ├── ConciergePortal.tsx          # Restricted staff dashboard (4 tabs)
│   ├── PartnerOnboarding.tsx        # Partner portal + dashboard
│   ├── AIAgent.tsx                  # FPD AI chatbot
│   └── admin/
│       ├── MasterAdmin.tsx          # Command center (10 tabs + analytics)
│       ├── WhiteGloveAdmin.tsx      # WG clients, staff, waivers, billing
│       ├── ConciergeStaffAdmin.tsx  # Hire/assign/revoke concierge employees
│       ├── PartnerOnboardingAdmin.tsx # WL Onboarding Control
│       ├── CryptoMerchant.tsx       # Crypto processor configuration
│       ├── AffiliateAdmin.tsx       # Affiliate management
│       ├── PartnershipAdmin.tsx     # Partnership management
│       ├── IDVerification.tsx       # Government ID review queue
│       ├── PayoutManagement.tsx     # Commission payout processing
│       ├── SubscriptionConfig.tsx   # Plan pricing configuration
│       ├── ContinuationFeeAdmin.tsx # $199 fee management + activation
│       └── EmailTemplates.tsx       # 16 email template editor
├── context/
│   ├── DemoContext.tsx              # Global user demo state
│   ├── WhiteLabelContext.tsx        # WL brand configuration
│   └── WLPackagesContext.tsx        # Live WL package sync (pub/sub)
├── services/
│   ├── supabase.ts                  # Typed database service
│   ├── stripe.ts                   # Stripe service + Edge Function templates
│   ├── wlPackages.ts               # WL package API + live sync
│   └── conciergeStaff.ts           # Concierge employee auth + CRUD
└── utils/
    └── clipboard.ts                 # Cross-environment clipboard utility
```

---

## 2. Getting Started

```bash
pnpm install
pnpm dev
```

---

## 3. Environment Variables

Create `.env` in the project root:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Stripe (publishable key — frontend safe)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App URL
VITE_APP_URL=https://finalpassdown.com

# Crypto processors (public keys only)
VITE_COINBASE_COMMERCE_KEY=your-coinbase-api-key
```

**Server-side secrets** (set via `supabase secrets set` — never in `.env`):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase secrets set COINBASE_COMMERCE_API_KEY=...
supabase secrets set COINBASE_WEBHOOK_SECRET=...
supabase secrets set BITPAY_API_TOKEN=...
supabase secrets set NOWPAYMENTS_API_KEY=...
supabase secrets set NOWPAYMENTS_IPN_SECRET=...
supabase secrets set APP_URL=https://finalpassdown.com
```

---

## 4. Demo Mode Switcher

A floating pill button (bottom-right corner) switches between all 8 modes instantly:

| Mode | Description |
|---|---|
| 🏠 Landing | Public marketing website with full imagery |
| 👤 User Portal | Account holder dashboard — opens by default |
| 🔐 Admin Login | Master admin authentication |
| 👑 Admin Portal | Full admin command center |
| 🤝 Partner Portal | Partner onboarding + dashboard |
| ⭐ Concierge Login | Staff-only login |
| ⭐ Concierge Portal | Restricted staff dashboard |
| 📤 Client Doc Submit | White Glove client upload page — pick client to simulate |

**Demo credentials:**

| Portal | Email | Password |
|---|---|---|
| Admin | admin@finalpassdown.com | Admin2026! (MFA: any 6 digits) |
| Concierge — Marcus | marcus.williams@finalpassdown.com | Concierge2026! |
| Concierge — Patricia | patricia.chen@finalpassdown.com | Concierge2026! |
| Concierge — James | james.rivera@finalpassdown.com | Concierge2026! |

---

## 5. Subscription Plans & Pricing

| Plan | Monthly | Annual | Storage | Legacy + Guardian Contacts | Overage |
|---|---|---|---|---|---|
| **Starter** | $1.99 | $24.00/yr | 1 GB | 1 each | $0.50/GB |
| **Foundation** | $9.99 | $95.90/yr | 50 GB | 3 each | $0.40/GB |
| **Legacy Archive** | $24.99 | $239.90/yr | 250 GB | Unlimited | $0.40/GB |
| **Legacy Pro** | $49.99 | $479.90/yr | 500 GB | Unlimited | $0.40/GB |
| **Legacy Vault** | $129.99 | $1,559.90/yr | 1 TB | Unlimited | $0.40/GB |

All plans include every core platform feature. Storage meters per billing cycle and does not carry forward. Overage billed automatically at the plan's per-GB rate. All plans can be upgraded via card (Stripe) or cryptocurrency.

---

## 6. Plan Feature Comparison

| Feature | Starter | Foundation | Legacy Archive | Legacy Pro | Legacy Vault |
|---|:---:|:---:|:---:|:---:|:---:|
| Legacy Storage | 1 GB | 50 GB | 250 GB | 500 GB | 1 TB |
| Legacy Contacts | 1 | 3 | Unlimited | Unlimited | Unlimited |
| Guardian Contacts | 1 | 3 | Unlimited | Unlimited | Unlimited |
| Document Vault | ✓ | ✓ | ✓ | ✓ | ✓ |
| Encrypted Documents | ✓ | ✓ | ✓ | ✓ | ✓ |
| Media Uploads | ✓ | ✓ | ✓ | ✓ | ✓ |
| Photos and Videos | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legacy Messaging | ✓ | ✓ | ✓ | ✓ | ✓ |
| Text, Video & Voice Messages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Calendar Reminders | ✓ | ✓ | ✓ | ✓ | ✓ |
| Access Control | ✓ | ✓ | ✓ | ✓ | ✓ |
| Advanced Security | ✓ | ✓ | ✓ | ✓ | ✓ |
| Email Support | ✓ | ✓ | ✓ | ✓ | ✓ |
| Priority Support | — | — | ✓ | ✓ | ✓ |
| Email and Chat Support | — | — | ✓ | ✓ | ✓ |
| Overage Rate | $0.50/GB | $0.40/GB | $0.40/GB | $0.40/GB | $0.40/GB |

---

## 7. User Portal Features

**Dashboard** — KPI cards, legacy completion checklist, storage meter, recent activity feed, vault status badge.

**Digital File Cabinet** — 18 encrypted folders covering every life document category. Drag-and-drop upload, in-browser preview, starred files, locked folders, Secret Vault. Camera scanner in every folder toolbar.

**Final Wishes & Wills** — Records specific bequests, funeral preferences, and estate instructions.

**Medical Information** — Allergies (severity-coded red/amber/green), medications with prescriber and refill info, healthcare directives.

**Financial Records** — 6 tabs: Insurance policies, Real estate, Investments, Retirement, Tax records, Business entities.

**Personal Assets** — 4 tabs: Vehicles (VIN, title, bequest instructions), Utilities (autopay status, account numbers), Digital assets (crypto, domains, social media), Firearms (serial, state registration, transfer plan).

**Family & Memories** — 8 tabs: Memories (photo/video cards), Video Messages, **Audio Messages** (live recorder — Record/Pause/Stop + playback before saving), Kids & Family, Keepsakes, Goals, Awards & Achievements, Pets.

**Family & Friends** — Personal contact book with groups and email blast. Guardian contacts get immediate view-only folder access. See Section 13.

**Legacy Contacts** — Designate Legacy (post-death vault access), Guardian (immediate view-only), Emergency, and Pet Emergency contacts.

**Digital Diary** — Text, audio, and video journal entries with mood tags, privacy toggle, and scan button.

**Password Manager** — Encrypted credentials with strength scoring, copy buttons, and document scan attachment.

**Auto Pay & Subscriptions** — Documents all recurring charges. Payment types include Bitcoin, Ethereum, USDC, Other Crypto.

**Legacy Vault ("Your Legacy Package")** — Read-only consolidated preview of everything stored across the platform — exactly what legacy contacts receive. No uploading here; use the sidebar sections to add content. Downloads locked until both conditions are met. See Section 10 for the two-condition gate details.

**Activate Legacy Access** — The payment page for the $199 one-time fee. Action-oriented name replacing the old "$199 Legacy Continuation" label. This is where users pay (card or crypto), choose who's paying (owner or legacy contact), simulate admin verification in demo mode, and view the transaction receipt. See Section 10.

**Storage & Billing** — Metered usage, 6-month history chart, plan upgrade (card + crypto). Upgrade panel shows all 5 plans with per-plan overage rate displayed per card.

**Affiliate Program** — Referral link, tier progress, monthly earnings chart.

**White Glove Service** — Concierge intake page. See Section 14.

**Account & Profile** — Profile photo, 2FA, encryption details, notification preferences. See Section 8.

---

## 8. Account Settings — Profile, 2FA & Encryption

Accessible via sidebar → Security → **Account & Profile**, or the ⚙️ gear icon next to the username.

**Profile tab:** Upload profile photo, edit name, email, and phone. Saves via `updateUser()`.

**Security & 2FA tab:** Three 2FA methods — SMS text message, Email OTP (recommended), or Authenticator App (most secure). Enabling any method opens an OTP verification modal (demo: any 6 digits). Change password with strength bar.

**Encryption tab:** Explains AES-256-GCM client-side encryption at every stage — upload, storage, download. Confirms zero-knowledge architecture (key never leaves device). Shows live ENCRYPTED badge on all vault files. Encryption cannot be disabled.

**Notifications tab:** Toggle Email, SMS, Push, Storage Alerts, Contact Updates, and Marketing notifications.

---

## 9. Legacy Contacts & Guardian Permissions

**Legacy Contact** — Receives complete account download after death is verified and $199 fee is paid. Must verify government-issued ID before access is granted.

**Guardian Contact** — Gets view-only access to assigned folders right now, while the user is alive. **Cannot download files — view only, always.** Admin assigns specific folders (from 18 available) when creating the contact.

**Emergency Contact** — Informational only. No vault access.

**Pet Emergency Contact** — Informational only. No vault access.

| Type | Access | Downloads |
|---|---|---|
| Legacy Contact | Full vault after death verified + fee paid | Yes — after both conditions met |
| Guardian Contact | View-only assigned folders (while alive) | Never — view only |
| Emergency Contact | Informational only | No |
| Pet Emergency Contact | Informational only | No |

---

## 10. Legacy Continuation System

### Pricing
- **$199 one-time fee** — paid by account owner at any time, or by a legacy contact after the passing.

### Two Conditions Required — Both Must Be Met

Downloads are locked until:
1. **$199 Legacy Continuation Fee is paid** (by owner or legacy contact)
2. **Death certificate submitted and verified by FPD administrator**

Paying the fee alone does not unlock downloads. Both conditions must be satisfied simultaneously.

### What Gets Downloaded — Legacy Vault Clone

When both conditions are met, legacy contacts click **LEGACY VAULT CLONE** and receive a complete encrypted package of everything in the account: all 18 folder categories, final wishes, medical records, financial records, personal assets, memories, digital diary entries, password manager contents, contacts, pet records, and Secret Vault items (opt-in).

### Payment Options
- Card via Stripe (PCI-DSS Level 1)
- Any of 8 cryptocurrencies: BTC, ETH, USDC, USDT, SOL, BNB, XRP, LTC

---

## 11. Encryption — How Every File Is Protected

Every file uploaded to FPD is encrypted with **AES-256-GCM** before it leaves the user's device. Every file downloaded is decrypted only on the user's device.

**Upload:** File encrypted client-side → only ciphertext transmitted to servers.

**Storage:** Supabase Storage stores only ciphertext. FPD cannot read file contents.

**Download:** Ciphertext sent to device → decrypted locally using user's key.

**Zero-Knowledge:** Encryption key derived from master password using PBKDF2 (100,000 iterations). Key never transmitted. FPD mathematically cannot read your files.

Encryption is always on. It cannot be disabled.

---

## 12. Document Scanner

Built-in camera scanner available at every upload point across the platform.

**How to use:** Click any Scan button → live camera with scan frame overlay → capture → choose scan mode (Color / Grayscale / B&W / Document) → name the document → choose folder → upload encrypted.

**Available at:** Digital File Cabinet (every folder), Legacy Vault, Digital Diary, Legacy Verification (ID upload), Password Manager, Subscription Manager.

Camera fallback: if permission is denied, a file picker opens automatically.

---

## 13. Family & Friends — Groups & Email Blast

Create named contact groups and send blast emails to all members at once.

**Creating a group:** Click "Groups & Email Blast" → "New Group" → name, color, description → select members → click **"+ Add All"** to select everyone instantly → Save.

**Sending a blast email:** Click "Blast Email" on any group → compose subject and message → all members with email are BCC'd (each person sees only themselves) → opens default email client with recipients pre-filled.

---

## 14. White Glove Concierge Service

Premium hands-on onboarding for users who are not comfortable with technology. A dedicated specialist calls the client personally and handles all technical work — uploading documents, setting up contacts, recording final wishes — entirely over the phone.

**User intake page** (sidebar → Concierge → White Glove Service): Hero explaining the service, pricing cards ($99 setup + $25/30 min), 4-step process cards, included features list, FAQ accordion, request form (name + phone only). Specialist calls within 1 business day.

**Landing page:** White Glove section with pricing, steps, and specialist photo. "White Glove" link in the nav header scrolls to the section.

The Sign Authorization waiver appears only for clients enrolled in White Glove by an administrator — not shown to regular users browsing the service page.

---

## 15. White Glove Pricing Model

| Charge | Amount | When |
|---|---|---|
| Setup Fee | **$99 one-time** | When client enrolls — assigns specialist and creates account |
| Session Rate | **$25 per 30 minutes** | After each call — any time used, even 1 minute, bills as a full 30-min block |

**Billing rules:**
- 1–30 min = 1 block = $25
- 31–60 min = 2 blocks = $50
- 61–90 min = 3 blocks = $75
- Billed automatically to card on file after each session

**Typical total:** $199–$249 ($99 setup + 2–3 hours of sessions)

---

## 16. White Glove Document Exchange System

The complete pipeline for how physical documents move from a client's hands into their Final Pass Down account — managed entirely over the phone and a simple web link.

### Step 1 — Specialist Sends a Secure Upload Link

In Concierge Portal → Document Inbox tab → "Send Link to [Client Name]". Modal lets specialist send via Email, SMS, or copy. Link format: `finalpassdown.com/wg-submit?token=TOKEN_XXXXX`. No login required.

### Step 2 — Client Submits Documents From Phone

Client taps the link → sees a large-button, phone-friendly page. Three steps:
1. **Photograph or upload** the document (camera scanner or file picker)
2. **Choose document type** from 24 categories with emojis (Will ⚖️, Insurance 🛡️, Medical 🏥, Photo 📷, Pet Record 🐾, Profile Photo 🤳, etc.)
3. **Add an optional note** — e.g., "This is from 2019"

The **Status tab** shows every submission with live badges: 🟡 Waiting · 🔵 Received · ✅ Saved · 🔴 Please Resubmit.

### Step 3 — Specialist Saves to Any Account Section

In Concierge Portal → Document Inbox → each submission shows client name, document type, thumbnail, notes, and status. Specialist clicks **"Save to Account"** → picks any of 10 platform destinations with sub-sections:

- 📁 Digital File Cabinet (any of 18 folders)
- 🏥 Medical Information (allergy, medication, test result, insurance card, directive)
- 💰 Financial Records (insurance, real estate, investment, retirement, tax, business)
- 🚗 Personal Assets (vehicle title, utility, digital asset, firearm)
- 📷 Memories & Media (family photo, video memory, written memory)
- 📖 Digital Diary (photo, audio, video entry)
- ❤️ Final Wishes & Wills (will, trust, advance directive)
- 🪪 Contact ID Verification (driver's license, passport, state ID)
- 🤳 Profile Photo (set as account picture)
- 🐾 Pet Records (vet record, vaccination, pet photo)

System auto-suggests the correct destination based on what the client labeled the document.

### Live Sync — Both Portals Update in Real Time

The submission store uses pub/sub. When a client submits a document, the specialist's Document Inbox re-renders immediately without refresh. When the specialist marks a document saved or requests resubmission, the client's status tab updates in real time.

**To test the live sync:**
1. Demo Switcher → 📤 Client Doc Submit
2. Select Dorothy Henderson (Marcus Williams' client)
3. Submit a document
4. Demo Switcher → ⭐ Concierge Portal → log in as Marcus
5. Open Document Inbox — document appears instantly ✅

---

## 17. White Glove Session Timer & Billing

### Credit Card on File

Before a session can start, the client must have a payment method on file. Admin adds the card in **Admin → White Glove → 💳 Billing**. The card is also manageable from inside each expanded client card.

If no card is on file, the timer shows a red warning and the Start Session button is disabled.

### Session Timer (Concierge Portal → My Clients → Expanded Card)

**Idle:** Shows card status, choose phone or video, Start Session button.

**Running:** Large clock showing elapsed time. Live billing meter with block indicators. Progress bar to next 30-min block. Orange reminder: "Any time used counts as a full 30-min block." Pause and End Session buttons.

**End session:** Confirmation modal showing duration, blocks, card info, session notes field, and "Charge $XX to Card" button.

**Done:** Green success showing amount charged, duration, and blocks used.

### Admin Billing View (Admin → White Glove → 💳 Billing)

- Cards on file for all clients with add/update/remove
- Complete billing history table across all clients: date, client, session type, duration, blocks, amount charged

### Database

`wg_session_billing` — per-session records with duration, blocks billed, Stripe payment intent, card info.
`wg_payment_methods` — Stripe customer ID and default PM per client for automatic charging.

---

## 18. Authorization Waiver System

Before a White Glove specialist can act on a client's behalf, the client must sign a legal authorization waiver.

**Sending:** Admin → White Glove → Authorization Waivers → Send Waiver. Select specialist, choose 8 permission types, optional personal note.

**Signing:** Client receives email link. Two signature modes: typed name (italic serif font) or drawn signature (canvas pad). Three acknowledgment checkboxes. IP address and timestamp logged. Legally binding under E-SIGN Act.

**Admin tracking:** Table shows all waivers by status (Pending / Signed / Declined / Expired). Preview, Send Reminder, and Download PDF actions per waiver.

---

## 19. Concierge Staff Portal

Completely separate portal for White Glove employees. Staff see only their assigned clients. Zero access to master admin.

### Adding an Employee

**Admin → White Glove → 👥 Concierge Staff → Invite Employee**

Enter: name, work email, phone, role (Junior / Senior / Lead Concierge), assign specific clients, set temporary password. Employee receives a unique login link to the Concierge Portal.

### Staff Roles

| Role | Color | Purpose |
|---|---|---|
| Junior Concierge | Blue | New hires, simple cases |
| Senior Concierge | Purple | Complex multi-session clients |
| Lead Concierge | Orange | Team lead, quality review |

### Four Portal Tabs

**My Clients** — Assigned client cards with progress bars, session timer & billing, session logs, notes, waiver status, action buttons.

**Document Inbox** — All documents submitted by assigned clients via the secure upload link. Review, save to any account section, or request resubmission. Live-synced with client's status page.

**Schedule** — Upcoming sessions with Start Call/Video and Reschedule buttons.

**Waivers** — Authorization waiver status per client. Send reminders or request new waivers.

### Access

Landing page footer → **CONCIERGE STAFF** (orange button) or Demo Switcher → ⭐ Concierge Login.

---

## 20. Admin Command Center

**Access:** Landing page footer → MASTER ADMIN LOGIN
**Demo:** admin@finalpassdown.com / Admin2026! (MFA: any 6 digits)

### 13 Tabs

| Tab | Purpose |
|---|---|
| Overview | Platform KPIs, charts, recent activity |
| Analytics | Full demographic and behavioral dashboard |
| Users | All accounts + manually onboarded users |
| Revenue | MRR by plan tier |
| Storage | Platform consumption |
| ID Verification | Government ID review queue |
| Payouts | Commission payout management |
| $199 Legacy Fee | Fee status + vault activation per account |
| Audit Log | Every admin action with timestamp |
| Push Notifications | Compose and send — Push Only / Email Only / Push & Email |
| Admin Team | Create administrator accounts with role-based permissions |
| Reports & Downloads | Generate and download 20 platform reports in CSV/PDF/XLSX/JSON |
| Admin AI Assistant | Purple-themed AI trained on all Command Center features and workflows |

**Onboard User button** — 3-step wizard to manually create any account with plan selection and optional subscription waiver (White Glove, Charity, Press, Partner, etc.).

---

## 21. Analytics Dashboard

Admin → Command Center → Analytics tab.

**Demographics:** Gender (Female 54.2%, Male 40.1%), age cohorts 18–75+ with avg plan per group, relationship status.

**Geographic:** Top 10 US states with MRR, country distribution, top 10 cities.

**Technology:** Device split (Mobile 69.6% total), acquisition sources.

**Behavior:** Feature adoption rates, vault completion scores, 6-month DAU chart, DAU/MAU ratio, avg session duration.

**Health:** Retention by month, NPS 47 (Excellent), 12 platform health KPIs.

---

## 22. Manual User Onboarding

**Onboard User** button in Command Center header opens a 3-step wizard.

Step 1 — Contact info + White Glove toggle.
Step 2 — Pick plan + optional subscription waiver (8 waiver reasons: White Glove Client, Charity/Non-Profit, Press/Media, Partner Organization, Beta Tester, Employee, Influencer, Other).
Step 3 — Review and create.

Manually created accounts appear in a highlighted section in the Users tab.

---

## 23. Push Notification Center

Admin → Command Center → Push Notifications tab.

**Compose:** Choose type (Marketing / Feature / Update / Alert / Reminder), target audience (All Users or by plan tier), title (65 chars), message (240 chars), optional schedule.

**Live preview panel:** Shows lock screen mockup + in-app preview — updates as you type.

**Sent History:** Every notification with Delivered count, Opened count, and Open Rate.

---

## 24. Admin Team & Role Management

Admin → Command Center → **Admin Team** tab.

Create administrator accounts for your internal team and control precisely what each person can access, modify, and delete across every platform module.

### Invite Flow — Full 3-Step Demo

Click **Invite Admin** in the top-right of the Admin Team page. A modal walks through the entire invite lifecycle:

**Step 1 — Fill Details**
- Enter full name and work email
- Choose a role preset (6 available — see below)
- Live **Access Preview** instantly shows which modules are unlocked (green) and locked (grey) for the selected role
- Add optional internal notes (e.g. "reports to Simone, handles WG billing")

**Step 2 — Sending**
- Animated progress screen shows all 4 backend steps in real time: creating account record → assigning role permissions → generating one-time login token → sending invite email

**Step 3 — Invite Sent**
- Full **email preview** rendered exactly as the recipient will see it (From, Subject, greeting, CTA button, expiry notice)
- **Copy login link** button — copies the one-time secure URL to clipboard with confirmation flash
- Account summary card: Account ID, Role, Status, Link Expiry (72 hours)
- **Invite Another Admin** resets the form; **Done** closes the modal
- New account appears at the top of the Admin Team list with an **INVITED** badge immediately

### 6 Built-in Role Presets

| Role | Color | What They Can Access |
|---|---|---|
| **Super Admin** | Blue | Everything — unrestricted. Cannot be limited or suspended. |
| **Operations Manager** | Purple | Full view + edit: users, WG, verification, notifications, audit log |
| **Finance Manager** | Green | Full access: revenue, payouts, $199 fee, crypto, subscription config |
| **White Glove Manager** | Orange | Full WG (clients, waivers, billing, staff). View-only users + audit |
| **Support Agent** | Blue | View/edit users and White Glove only. No financial data or config |
| **Content Admin** | Red | Email templates and push notifications only |
| **Custom** | Grey | Every module toggled individually |

### Per-Module Permission Matrix (16 modules)

Each admin has a **View / Edit / Delete** toggle per module. Click any admin card → expand → **Edit Permissions** → toggle → **Save**. Changes apply on next login.

Modules: Dashboard Overview · Analytics · Users & Accounts · Revenue & MRR · Storage Management · ID Verification · Payouts & Commissions · $199 Legacy Fee · Audit Log · Push Notifications · White Glove Concierge · Subscription Config · White Label Packages · Partner Program · Email Templates · Crypto Merchant Config

### Account Actions

- **Suspend** — immediately revokes portal access, account preserved for audit trail
- **Reactivate** — restores access without resending invite
- **Resend Invite** — available while status is Invited
- Super Admin cannot be suspended or restricted

**File:** `src/app/components/admin/AdminRoles.tsx`

---

## 25. Reports & Downloads

Admin → Command Center → **Reports & Downloads** tab.

Generate and download platform data across 6 categories, 20 built-in reports, in CSV, PDF, XLSX, or JSON format. Every report includes a date range selector (Last 7 days / 30 days / 90 days / Year to date / All time / Custom range).

### Report Categories & Reports

**Financial (5)**
| Report | Formats | Key Fields |
|---|---|---|
| MRR Summary | CSV, PDF, XLSX | Month, Plan, New Subs, Churned, MRR, Net Change, Overage Revenue |
| Payout History | CSV, PDF, XLSX | Date, Affiliate/Partner, Amount, Method, Status, Transaction ID |
| Overage Billing | CSV, XLSX | User, Plan, GB Used, Limit, Overage GB, Rate, Amount Charged |
| $199 Continuation Fee Log | CSV, PDF, XLSX | Account, Paid By, Method, Death Cert, Activated At |
| White Glove Billing | CSV, PDF, XLSX | Client, Specialist, Setup Fee, Sessions, Blocks Billed, Total |

**Users (4)**
| Report | Formats |
|---|---|
| Full User Roster (~51,490 rows) | CSV, XLSX, JSON |
| New Signup Report | CSV, PDF, XLSX — includes referral source and acquisition channel |
| Churn & Cancellation | CSV, PDF, XLSX — includes LTV and cancellation reason |
| Manually Onboarded Accounts | CSV, XLSX — waiver reason and onboarding admin |

**Storage (2)** — Per-user usage broken down by category; storage alert history with user responses.

**Operations (3)** — White Glove client status with completion %; ID verification queue; affiliate performance by tier.

**Compliance (3)** — Full audit log export (280k+ rows, use date filter); GDPR/CCPA single-user data export; admin access and permission change log.

**Marketing (2)** — Push notification open rates per campaign; transactional email delivery and bounce rates per template.

### How It Works

1. Click any report card → choose format (CSV / PDF / XLSX / JSON) and date range → **Generate & Download**
2. Progress shows in the **Download History** tab automatically
3. Re-download any file within 30 days
4. Each report card shows an expandable **Included Fields** list

### Download History Tab

Every generated export logged with: report name, format badge, generated timestamp, admin name, file size, row count, and a Download button. Clear History to remove old entries.

**File:** `src/app/components/admin/ReportsDownloads.tsx`

---

## 26. Affiliate Program

| Tier | Active Referrals | Rate | Duration |
|---|---|---|---|
| 1 | 5–24 | 20% | 12 months per referral |
| 2 | 25–74 | 25% | 12 months per referral |
| 3 | 75+ | 30% | 12 months per referral |

12-month cap per referred user. Affiliates earn on every billing cycle of the referred user for 12 months. See Section 27 for the Partner Program which earns lifetime commissions.

---

## 27. Partner Program

For businesses referring clients. Earns **lifetime recurring commissions** — no time cap, no monthly fee.

**Setup fee:** $599 one-time (card or crypto).

| Tier | Accounts | Commission |
|---|---|---|
| 1 | 1–50 | 20% lifetime |
| 2 | 51–100 | 25% lifetime |
| 3 | 101+ | 30% lifetime |

**Partner Portal** (landing page footer → PARTNER PORTAL): 4-step onboarding wizard ($599 via card or crypto) + 5-tab dashboard (Overview with tier progress bar, Referrals, Payouts, Resources, Settings).

---

## 28. White Label Solutions

| Package | Users | Monthly | Setup |
|---|---|---|---|
| Agency Partner | Up to 500 | $2,999/mo | + $2,500 |
| Enterprise Partner | 501–5,000 | $7,499/mo | + $5,000 |
| Institutional Partner | 5,000+ | $15,000/mo | + $5,000 |

Billing models (flat monthly, per-user flat $, % of revenue) are configured per customer in the admin backend. The public landing page shows only the monthly fee and setup fee.

**Live frontend sync:** Admin edits a package → landing page updates instantly via pub/sub (WLPackagesContext → wlPackages.ts service → React re-render).

**WL Onboarding Control** (Admin → Developer): 4 tabs — Packages, WL Sales, Onboarding Links, Payment Processors.

---

## 29. Crypto Payments

**Supported coins:** BTC · ETH · USDC · USDT · SOL · BNB · XRP · LTC

**Where crypto appears:**
- $199 Legacy Continuation Fee
- Plan upgrades (Storage page)
- Partner Program $599 setup fee
- White Glove session billing (via payment processor)

**Checkout flow:** Select coin → QR code + wallet address → 30-min countdown → confirmation. Demo simulates after 8 seconds.

**Crypto Merchant Admin** (Admin → Developer → ₿): Configure Coinbase Commerce, BitPay, NOWPayments, Stripe Crypto, Crypto.com Pay, Strike Lightning. All settle to USD automatically.

---

## 30. Email Templates

16 customizable HTML templates in Admin → Developer → Email Templates.

| Category | Templates |
|---|---|
| Account | Welcome, OTP Verification, Password Reset |
| Storage | Warning 80%, Warning 90%, Warning 95%, Overage |
| Contacts | Legacy Contact Invite, Verified, Vault Access Activated |
| Payments | Continuation Fee Receipt |
| Affiliate | Welcome, Commission Earned, Payout Processed |
| Partnership | Partnership Welcome, WL Activated |

Each template has an editable subject, `{{variable}}` placeholders, HTML body, live preview, Copy HTML, and Reset to Default.

---

## 31. Security Architecture

| Layer | Implementation |
|---|---|
| File encryption | AES-256-GCM, client-side, always on, cannot be disabled |
| Key derivation | PBKDF2 (100,000 iterations, SHA-256) — key never transmitted |
| Architecture | Zero-knowledge — FPD cannot read your files |
| Database | Supabase RLS on every table |
| Vault downloads | `has_continuation_fee_paid()` + admin `activated_at` required |
| Legacy contact access | `legacy_contact_can_access()` — verified ID + paid fee + admin activation |
| User 2FA | SMS, Email OTP, or Authenticator App (user's choice) |
| Admin auth | Separate auth from user portal. TOTP 2FA mandatory |
| Admin roles | Per-module View/Edit/Delete enforced at UI layer; production enforces at API layer |
| Concierge isolation | Staff scoped to assigned clients via shared wgClientStore pub/sub |
| WG client store | `src/app/services/wgClientStore.ts` — shared pub/sub; admin adds flow to concierge in real time |
| WG document sync | Pub/sub store — client submit and specialist inbox update in real time |
| Clipboard | `execCommand` fallback — works in all iframe and sandboxed environments |
| Payments | Stripe PCI-DSS Level 1. Crypto via processor custodial wallets |
| Webhooks | HMAC signature validation on all Stripe and crypto events |

---

## 32. Database Schema

31+ tables. Key tables:

| Table | Purpose |
|---|---|
| `users` | Account holders — plan: starter / foundation / family_archive / legacy_pro / legacy_vault |
| `subscription_plans` | Admin-configurable plan definitions with storage, overage rate, contact limits |
| `legacy_continuation_fees` | $199 fee + death cert verification + activation timestamps |
| `vault_documents` | Encrypted document records — all encrypted: true |
| `contacts` | All 4 types — guardian: view_only, no downloads ever |
| `admin_accounts` | Internal admin team with role, permissions JSON, invite token, status |
| `concierge_employees` | WG staff accounts (separate from Supabase Auth) |
| `wg_clients` | White Glove client records — shared store between admin + concierge portal |
| `wg_sessions` | Session logs per client |
| `wg_waivers` | Authorization waivers with e-signature data |
| `wg_document_submissions` | Client-submitted docs — full lifecycle from upload to account |
| `wg_session_billing` | Per-session billing: duration, blocks, Stripe charge |
| `wg_payment_methods` | Stripe PM on file per WG client for auto-charging |
| `crypto_transactions` | All crypto payment records |
| `push_notifications` | Admin notification log with delivery tracking |
| `contact_groups` | Family & Friends groups with member lists |
| `account_2fa_settings` | Per-user 2FA method and secrets |
| `wl_packages` | Live-editable WL package definitions |
| `report_exports` | Download history: admin, report type, format, file size, timestamp |

**Plan seed data (from `001_initial_schema.sql`):**

| Database ID | Name | Monthly | Storage | Max Contacts | Overage |
|---|---|---|---|---|---|
| `starter` | Starter | $1.99 | 1 GB | 1 | $0.50/GB |
| `foundation` | Foundation | $9.99 | 50 GB | 3 | $0.40/GB |
| `family_archive` | Legacy Archive | $24.99 | 250 GB | Unlimited | $0.40/GB |
| `legacy_pro` | Legacy Pro | $49.99 | 500 GB | Unlimited | $0.40/GB |
| `legacy_vault` | Legacy Vault | $129.99 | 1 TB | Unlimited | $0.40/GB |

**Key RLS functions:**
- `has_continuation_fee_paid(user_id)` — gates all vault downloads
- `legacy_contact_can_access(vault_owner_id)` — requires verified ID + paid fee + admin activation

---

## 33. Stripe Integration

Three Edge Functions handle all server-side Stripe operations:

**`stripe-checkout`** — Creates Checkout Session for subscription sign-ups.

**`stripe-payment-intent`** — Creates $199 PaymentIntent for continuation fee.

**`stripe-webhook`** — Handles: `payment_intent.succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.

Crypto processors each have their own webhook endpoint: `/webhooks/coinbase`, `/webhooks/bitpay`, `/webhooks/nowpay`.

---

## 34. Supabase Setup

```bash
supabase link --project-ref YOUR_REF
supabase db push
supabase functions deploy stripe-checkout
supabase functions deploy stripe-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy crypto-webhook-coinbase
supabase functions deploy crypto-webhook-bitpay
supabase functions deploy crypto-webhook-nowpay
```

**Storage buckets required:**

| Bucket | Access | Purpose |
|---|---|---|
| `vault-documents` | Private | All encrypted user documents |
| `id-documents` | Admin only | Government ID uploads |
| `diary-media` | Private | Audio and video diary entries |
| `profile-photos` | Public read | User profile pictures |
| `wg-submissions` | Private | White Glove client document submissions |

Full setup walkthrough: `SETUP_GUIDE.md`

---

## 35. New Features (Latest Sessions)

### Pet Records — Rebuilt to Match App Design

The Pets tab inside Family & Memories now uses the full Upload Pet Records form matching the app design exactly:

**Sections (in order):**
1. **Upload Images or Videos** — up to 10 photos/videos with live preview grid
2. **Emergency Pet Caretaker** — Name + Phone, + Caretaker button to add multiple
3. **Long Term Pet Provider** — Name + Phone, + Provider button
4. **Special Care Instruction** — Name + Phone + Description textarea, + Instruction button
5. **About Your Beloved Pet** — Name, Date of Birth, Gender (dropdown), Breed, Colour, Upload Documents (PDF)
6. **Health Info** — Medical History / Back Story textarea, Vaccination Type + Vaccination Date pairs, + Vaccination button
7. **Vet Info** — Name, Phone, Email Address
8. **Feeding** — Food Type, Select Time Type (Morning/Afternoon/Evening/Night/As Needed), Quantity, Location of Food, + Food button
9. **Upload** button saves the full record

### Personal Assets — New Tabs

**Weapons Locker** (⚔️ tab) — Separate from Firearms. For knives, swords, katanas, hunting knives, daggers, machetes, tactical axes, antique blades, bayonets, etc. Each record has: photo (from Add modal), type dropdown, make, model, blade/edge description, handle/grip, storage location, transfer instructions, notes. Sync to File Cabinet.

**Collectibles** (💎 tab) — Sports cards, coins, stamps, art, jewelry, watches, luxury handbags, instruments, wine/whiskey, rare books, toys, and more. Each record has: photo (from Add modal), 16 category options, item name, condition, estimated value, purchased from, purchase date, serial/cert #, intended for (sell/donate/give), notes. Sync to File Cabinet + Attach Document.

### FPD AI Assistant — Fully Retrained on All Features

The user-facing **Ask FPD AI Assistant** (sidebar → AI Assistant) has been completely rebuilt with a comprehensive knowledge base covering every feature on the platform:

**Topics covered (40+):**
- Navigation & platform map (every sidebar section)
- Digital File Cabinet (18+ folders, upload, sync, scanner)
- Legacy Vault (how it works, two-condition lock, Legacy Vault Clone)
- $199 Legacy Continuation Fee (how to pay, what it unlocks, demo simulation)
- Legacy Contacts (chain of authority, verification workflow, custom requirements)
- Guardian Contacts (view-only access, folder assignment)
- Emergency Contacts, Final Wishes, Wills and Living Trusts
- Medical Info, Financial Records, Personal Assets (all tabs)
- Warranties, ID Keeper, Job History, Travel Planner, Favorite Places
- Daycare Information, Kids' Activities, Pet Records (full form walkthrough)
- Memories & Media (all 7 tabs), Digital Diary, Password Manager
- White Glove Service (pricing, document exchange, video vs phone sessions)
- Affiliate Program, Plans & Pricing, 2FA & Security, Storage metering
- Document Scanner, Sync to File Cabinet, Family & Friends groups
- Confirmation of Passing (accepted documents, admin process)

**10 suggestion chips** cover the most common questions. Smart keyword matching handles natural language queries. Fallback always provides helpful next steps.

**File:** `src/app/components/AIAgent.tsx`

---

### Admin AI Assistant — New Command Center Expert

A new **Admin AI Assistant** is available in the Command Center (Admin Portal → **Admin AI Assistant** tab — 13th tab). Built specifically for administrators, senior executives, and new hires.

**Command Center topics covered (18 modules):**
- Overview dashboard (KPIs, health metrics)
- Analytics (demographics, geographic, technology, behavior, health)
- User management (search, onboard, suspend, manually onboard)
- Revenue & MRR breakdown
- Storage monitoring & overage
- ID Verification queue (step-by-step approval workflow)
- Payouts & commission tiers
- $199 Legacy Fee activation (admin workflow, accepted documents)
- Audit Log (events logged, severity levels, compliance)
- Push Notification Center (compose, target, delivery channels)
- Admin Team & Roles (6 presets, 16-module permissions, invite flow)
- Reports & Downloads (all 20 reports, formats, date ranges)
- White Glove Admin (clients, waivers, staff, billing)
- White Label packages
- Subscription Config
- Email Templates (all 16)
- Crypto Merchant Config
- Partner Program admin
- **New Hire Onboarding guide** — department-specific getting-started instructions for Operations Manager, Finance Manager, White Glove Manager, Content Admin, and Support Agent

**Design:** Purple gradient theme to visually distinguish from the user-facing blue assistant. 8 suggestion chips for the most common admin questions.

**File:** `src/app/components/AdminAIAgent.tsx`

---

### ID Keeper — Photo Upload in Add Modal

The Add ID modal now includes a combined scan + upload block at the top:
- **📷 Scan with Camera** via device camera
- **Upload a photo of the ID** via PhotoPicker with live preview

### Warranties — New Sidebar Section

Located in Life Records → Warranties. Full warranty tracking with:
- **5 pre-loaded warranties** (LG TV, Carrier HVAC, Samsung Fridge, Toyota Camry, American Home Shield)
- **Product photo** (PhotoPicker in Add modal — shows as card banner)
- Status badges: ACTIVE / EXPIRING IN Xd (< 90 days) / EXPIRED / LIFETIME
- Per-warranty: brand, model, serial, purchase details, coverage details, how-to-claim instructions, notes, document scan
- **Sync to File Cabinet → Warranties folder**
- **Call Support** button per warranty
- Category filter across 12 categories

### Digital File Cabinet — Warranties Folder Added

New **Warranties** folder (🛡️) pre-loaded with 5 warranty documents. Syncs receive documents from the Warranties sidebar section automatically.

### Weapons Locker — File Cabinet Folder + Sync

A dedicated **⚔️ Weapons Locker** folder was added to the Digital File Cabinet (between Firearms Registry and Warranties). Pre-loaded with 3 demo documents. The Weapons Locker tab in Personal Assets now syncs directly to this folder — clicking "Sync to File Cabinet" from any weapons locker record offers the Weapons Locker folder as the first and default destination.

### Pet Emergency Contacts — Removed from Sidebar

Pet Emergency Contacts has been removed from the sidebar. Pet emergency contact information is now managed inside the full **Pet Records** form (under Family & Memories → Pets) in the "Emergency Pet Caretaker" and "Long Term Pet Provider" sections, which is the correct home for that data.

### Sync to File Cabinet — Removed (Replaced by Auto-Sync)

The manual "Sync to File Cabinet" button has been removed from all record cards. It has been replaced by **automatic syncing** that happens when you attach a document in the Add modal.

**How it works now:**
- When you create any record (insurance policy, vehicle, medication, job entry, etc.) and attach a document, that document is **automatically synced to the correct File Cabinet folder** in the background — no button click needed
- The `AttachDocumentField` component calls `syncDocToFileCabinet()` automatically, routing the document to the most relevant folder for that section

**Sections with automatic File Cabinet sync on attach:**
- Financial Records (Insurance, Real Estate, Investments, Retirement, Taxes, Business) → respective folders
- Medical Info (Allergies, Medications) → Medical Records folder
- Personal Assets (Vehicles, Real Estate, Firearms, Weapons Locker, Collectibles) → respective folders
- Job History → Personal Letters folder
- Daycare Information → Personal Letters folder
- Kids' Activities → Personal Letters folder
- Travel Planner → Personal Letters folder

**File Cabinet** — The `docSyncStore` pub/sub still powers the File Cabinet's synced document display, now populated automatically rather than manually.

---

### Document Attach — Consistent Across All Add Modals

Every Add modal throughout the platform now has an **"Attach Document"** field at the bottom with Upload + Scan options. When a document is attached, it auto-syncs to the File Cabinet. Sections covered:

| Section | Add Modal | Document Hint |
|---|---|---|
| Financial Records — Insurance | ✅ | Policy PDF, declaration page |
| Financial Records — Real Estate | ✅ | Deed, mortgage statement |
| Financial Records — Investments | ✅ | Account statement |
| Financial Records — Retirement | ✅ | Account statement |
| Financial Records — Taxes | ✅ | Tax return PDF |
| Financial Records — Business | ✅ | Business records |
| Personal Assets — Vehicles | ✅ | Title, registration, insurance |
| Personal Assets — Real Estate | ✅ | Deed, mortgage, title |
| Personal Assets — Firearms | ✅ | DOJ registration, purchase receipt |
| Personal Assets — Weapons Locker | ✅ | Appraisal, provenance |
| Personal Assets — Collectibles | ✅ | Appraisal, certificate of authenticity |
| Medical Info — Allergies | ✅ | Allergy test results |
| Medical Info — Medications | ✅ | Prescription |
| Job History | ✅ | Offer letter, W-2, contract |
| Daycare Information | ✅ | Enrollment agreement, immunization records |
| Kids' Activities | ✅ | Registration form, waiver |
| Travel Planner | ✅ | Itinerary, tickets, travel insurance |
| Password Manager | ✅ (pre-existing) | Account paperwork |
| Subscription Manager | ✅ (pre-existing) | Bill, statement, agreement |
| ID Keeper | ✅ (pre-existing) | Scan of the ID |
| Warranties | ✅ (pre-existing) | Warranty card, receipt |
| Wills and Living Trusts | ✅ (pre-existing) | Executed document copy |

**File:** `src/app/components/AttachDocumentField.tsx`

---

### Legacy Vault → Rebranded as "Your Legacy Package"

**The upload functionality has been completely removed from Legacy Vault.** It is no longer an upload destination — it is now a read-only consolidated preview of everything stored across the entire platform.

**Why:** Users already have the File Cabinet, Financial Records, Medical Info, Wills and Living Trusts, ID Keeper, Warranties, and every other section to upload documents in the right context. Having a separate upload point in Legacy Vault created duplicate files with no clear source of truth.

**What the page now shows:**

1. **Two-condition gate** — visual checklist: $199 fee paid (green/amber) + Confirmation of Passing verified (green/amber). "Pay $199" button links directly to the payment section.

2. **What Your Legacy Contacts Receive** — 13 section cards covering every part of the platform included in the download:
   - Digital File Cabinet (18+ folders)
   - Final Wishes & Legacy Planning
   - Wills and Living Trusts
   - Medical Records
   - Financial Records (6 categories)
   - Personal Assets (7 categories: Vehicles, Real Estate, Utilities, Digital Assets, Firearms, Weapons Locker, Collectibles)
   - Memories & Media (7 tabs)
   - Digital Diary
   - Password Manager
   - Contacts & Instructions
   - ID Keeper
   - Warranties
   - Pet Records
   
   Each card shows item count, description, and locked/unlocked Eye + Download icons. Collapsed to 6 by default, expands to all 13.

3. **Legacy Vault Clone CTA** — locked (grey) until both conditions are met, turns green and active when unlocked. Clicking opens the existing full VaultClone download flow.

4. **Tip** — redirects users to the sidebar sections to add/update information.

**File:** `src/app/components/LegacyVault.tsx`

---

### Contact Verification — Merged into Legacy Contacts

The separate **Contact Verification** sidebar button has been removed. Identity verification is now built directly into each **Legacy Contact** card.

**Inline verification workflow on every legacy contact card:**

| Status | Appears As | Action Available |
|---|---|---|
| NOT SENT | Grey badge | "Send Verification Invite" button |
| INVITE SENT | Amber badge | "Simulate ID Submission" + "Resend Invite" + "Scan ID" |
| ID SUBMITTED | Blue badge | "Simulate Verify ✓" — runs 1.8s animation then marks verified |
| VERIFIED | Green badge | "Vault access activates upon verified passing ✓" |

Each legacy contact now shows both their estate authority position (PRIMARY / CONTINGENT #2 / etc.) and their ID verification status in the same card — no switching pages.

**File:** `src/app/components/ContactsHub.tsx`

---

### Summary of All Platform Changes (Full Session)

| Change | Details |
|---|---|
| **Legacy Archive** | Renamed from Family Archive everywhere |
| **Activate Legacy Access** | Sidebar renamed from "$199 Legacy Continuation" — action-oriented, price-agnostic label |
| **Legacy Vault** | Rebranded as "Your Legacy Package" — read-only, no uploads |
| **Contact Verification** | Merged into Legacy Contacts — sidebar button removed |
| **Pet Emergency Contacts** | Removed from sidebar — lives inside Pet Records form |
| **Contact Hub** | Removed — replaced by 4 individual contact type pages |
| **Final Wishes** | Renamed from Family Wishes in sidebar |
| **Wills and Living Trusts** | Separated from Final Wishes as its own sidebar section |
| **Personal Assets** | Added Real Estate tab, Weapons Locker tab (⚔️), Collectibles tab (💎) |
| **Photo in Add modals** | Vehicles, Real Estate, Firearms, Collectibles, Weapons Locker, Warranties, Favorite Places, Travel |
| **Pet Records** | Rebuilt to match app screenshots — 8 sections with full form fields |
| **ID Keeper** | Photo/scan upload added to Add modal |
| **Warranties** | New sidebar section + Warranties folder in File Cabinet + photo in Add modal |
| **Weapons Locker** | New File Cabinet folder (⚔️) + syncs from Personal Assets |
| **Sync to File Cabinet** | Fixed dropdown clipping + fixed mismatched folder IDs |
| **FPD AI Assistant** | Fully retrained on all 40+ platform features with smart matching |
| **Admin AI Assistant** | New purple-themed tab in Command Center — trained on all 13 admin tabs |
| **Verification forms** | Legacy Contacts now include custom verification requirements (security word, Q&A, notarized affidavit, etc.) |
| **Legacy Contact hierarchy** | Chain of authority system — PRIMARY + CONTINGENT badges + legal warning |
| **Confirmation of Passing** | Updated everywhere — accepts 7 document types, not just death certificate |
| **Push Notifications** | Added Push Only / Email Only / Push & Email delivery channel selector |
| **Reports & Downloads** | 20 built-in reports across 6 categories |
| **Admin Team** | Full role management with 3-step invite demo |
| **WG Video/Phone sessions** | Specialists choose video call or phone call per session |
| **Missed call scheduling** | "No Answer" button → email with scheduling link → client picks time → auto-updates specialist calendar |
| **Shared WG client store** | Admin adding a WG client appears in specialist's portal in real time |
| **Job History** | New sidebar section — full employment timeline |
| **Daycare Information** | New sidebar section — facility info, authorized pickups, documents |
| **Kids' Activities** | New sidebar section — schedule, coach, transport notes |
| **Travel Planner** | New sidebar section — trip history with photos, documents |
| **Favorite Places** | New sidebar section — categorized with photos, tags, ratings |

---

## 36. Final Feature Updates

### Sidebar — "Memories & Media" renamed to "Family & Memories"

The sidebar label for `family-memories` page has been updated from **Memories & Media** → **Family & Memories** throughout the platform including the sidebar nav, all references in the README, and the FPD AI Assistant knowledge base.

---

### Audio Messages — New Tab in Family & Memories (Fully Functional)

A new **Audio Messages** tab (🎙️) has been added to Family & Memories, sitting between Video Messages and Kids & Family. Unlike demo-only features, this is a **fully working audio recorder** using the browser's native `MediaRecorder` API.

**Recording workflow:**

1. **Idle** — Large microphone icon with a purple **Record** button. Pressing it requests microphone permission from the browser.

2. **Recording** — Live timer counting up (MM:SS format), animated pulsing waveform bars, red **● REC** badge. Two controls:
   - **Pause** — suspends the recording and stops the timer (shows ⏸ PAUSED)
   - **Stop & Save** — stops the microphone, processes the audio, moves to review

3. **Review** — After stopping:
   - Green "Recording complete — X:XX" confirmation
   - **Native audio `<audio>` player** — listen back before committing
   - **Title** (required), **Recipient**, and **Description** fields
   - **Save Audio Message** — saves with actual duration, appears in the list immediately
   - **Discard** — throws away the recording and resets to idle

4. **Saved Messages** — Each saved message shows:
   - Purple `Volume2` icon
   - Title, recipient, description
   - Duration + recording date
   - **▶ Play** button + **SECURED** badge

**Technical implementation:**
- Uses `navigator.mediaDevices.getUserMedia({ audio: true })` for microphone access
- `MediaRecorder` API captures audio chunks
- `Blob` assembled on stop → `URL.createObjectURL()` for playback
- Graceful error handling if microphone access is denied
- Blob URLs revoked on save or discard to prevent memory leaks
- 4 pre-loaded demo recordings showing the format

**File:** `src/app/components/FamilyMemories.tsx`

---

## 37. Developer Handoff Checklist

Before going live, verify every item:

- [ ] All 31+ database tables created via `001_initial_schema.sql`
- [ ] Stripe products created for all 5 plans (monthly + annual prices)
- [ ] Stripe webhook endpoint registered and tested
- [ ] Coinbase Commerce merchant account verified
- [ ] BitPay merchant account verified
- [ ] All `supabase secrets set` commands run for every secret
- [ ] `.env` file populated with all `VITE_` variables
- [ ] All 5 storage buckets created with correct public/private settings
- [ ] Supabase Auth configured with correct Site URL and redirect URLs
- [ ] SMS provider connected for 2FA (Twilio recommended)
- [ ] `DEMO_MODE = false` set in `wlPackages.ts`
- [ ] `conciergeStaff.ts` in-memory store replaced with real Supabase queries
- [ ] All `setTimeout` demo simulations replaced with real API calls
- [ ] Edge Functions deployed and tested
- [ ] `subscription_plans` table updated with real Stripe price IDs
- [ ] `wl_packages` table seeded (done via migration)
- [ ] `crypto_processor_configs` table seeded (done via migration)
- [ ] PWA manifest and service worker registered
- [ ] All three crypto webhook endpoints registered with respective processors
- [ ] Admin account seeded in `users` table with `is_admin = true`
- [ ] WG session billing connected to real Stripe automatic charges
- [ ] WG document submission storage wired to `wg-submissions` Supabase bucket
- [ ] Test end-to-end: sign up → upload doc → add legacy contact → pay $199 (card) → pay $199 (crypto) → verify death cert → Legacy Vault Clone download
- [ ] Test White Glove flow: enroll client → send upload link → client submits → specialist receives in inbox → saves to account → session timer charges card
- [ ] Verify Guardian contacts cannot download files in any scenario
- [ ] Verify Starter plan limits: 1 GB storage, 1 legacy contact, 1 guardian contact
- [ ] Admin Team: replace `_admins` in-memory store with real Supabase `admin_accounts` table queries
- [ ] Admin invite: replace demo `setTimeout` with real Supabase Auth admin invite + email send via Edge Function
- [ ] Admin permissions: enforce View/Edit/Delete rules at API layer (not just UI) using RLS and middleware
- [ ] Reports: replace demo `setTimeout` generation with real Supabase `COPY` or Edge Function CSV/XLSX export
- [ ] Reports: wire Download History to `report_exports` table in database
- [ ] WG client store (`wgClientStore.ts`): replace in-memory store with real Supabase queries — admin add → DB → concierge portal live via Supabase Realtime subscription
- [ ] Test Admin invite flow end-to-end: invite → email received → link clicked → password set → portal login → correct modules visible per role
- [ ] Test Reports: generate each of the 6 categories, verify CSV row counts and column headers match schema

---

## Contact & Support

| Purpose | Contact |
|---|---|
| General support | support@finalpassdown.com |
| White Glove service | whiteglove@finalpassdown.com |
| Partner program | partners@finalpassdown.com |
| White label & enterprise | enterprise@finalpassdown.com |
| Crypto & payment integrations | integrations@finalpassdown.com |
| Platform | finalpassdown.com |
| Partner portal | finalpassdown.com/partner |
| Concierge staff | finalpassdown.com/concierge |

---

*© 2026 Final Pass Down Inc. All rights reserved.*

*Final Pass Down is built on the belief that every person deserves to have their life organized, their wishes respected, and their family protected — regardless of their technical ability, age, or circumstance.*

*My Life. My Wishes. My Way.*
