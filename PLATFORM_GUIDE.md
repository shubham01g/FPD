# Final Pass Down — Complete Feature Guide

> **"My Life · My Wishes · My Way"**  
> finalpassdown.com | Version 3.0 | June 2026

This document explains in complete detail how every single feature of the Final Pass Down platform works — the user experience, the admin workflow, the technical implementation, and why each piece exists.

---

## Table of Contents

1. [Platform Architecture & Portals](#1-platform-architecture--portals)
2. [User Portal — Every Feature Explained](#2-user-portal--every-feature-explained)
3. [Legacy Contacts & Guardian Permissions](#3-legacy-contacts--guardian-permissions)
4. [Legacy Vault & $199 Continuation Fee](#4-legacy-vault--199-continuation-fee)
5. [Document Scanner](#5-document-scanner)
6. [Digital Diary](#6-digital-diary)
7. [Password Manager](#7-password-manager)
8. [Auto Pay & Subscriptions Tracker](#8-auto-pay--subscriptions-tracker)
9. [Storage Metering & Billing](#9-storage-metering--billing)
10. [Affiliate Program](#10-affiliate-program)
11. [Admin Portal — Command Center](#11-admin-portal--command-center)
12. [Analytics Dashboard](#12-analytics-dashboard)
13. [Manual User Onboarding](#13-manual-user-onboarding)
14. [White Glove Concierge Service](#14-white-glove-concierge-service)
15. [Authorization Waiver System](#15-authorization-waiver-system)
16. [Concierge Staff Portal](#16-concierge-staff-portal)
17. [Partner Program](#17-partner-program)
18. [White Label Solutions](#18-white-label-solutions)
19. [WL Package API — Live Frontend Sync](#19-wl-package-api--live-frontend-sync)
20. [Crypto Payments](#20-crypto-payments)
21. [Payment Processing Architecture](#21-payment-processing-architecture)
22. [AI Assistant (FPD Agent)](#22-ai-assistant-fpd-agent)
23. [Email Templates System](#23-email-templates-system)
24. [Security Architecture](#24-security-architecture)
25. [Database Schema](#25-database-schema)
26. [Stripe Integration](#26-stripe-integration)
27. [Supabase Configuration](#27-supabase-configuration)
28. [PWA & Mobile Support](#28-pwa--mobile-support)

---

## 1. Platform Architecture & Portals

### The Five Portals

The platform is a single React application that routes into five completely separate experiences based on a `mode` state variable in `App.tsx`.

```
AppShell (App.tsx)
├── mode: "landing"            → LandingPage (public marketing site)
├── mode: "user"               → Layout + user portal pages (default)
├── mode: "admin-login"        → AdminLogin (admin authentication)
├── mode: "admin"              → AdminLayout + admin pages
├── mode: "partner-onboarding" → PartnerOnboarding (standalone partner portal)
├── mode: "concierge-login"    → ConciergeLogin (staff authentication)
└── mode: "concierge"          → ConciergePortal (restricted staff view)
```

Each portal has completely different navigation, styling, and data access. The Concierge Portal is the most restricted — a staff employee who logs in there can only see the specific clients their administrator assigned to them.

### Demo Mode Switcher

A floating pill button sits in the bottom-left corner of every view. Click it to expand a menu of all 7 modes. This lets developers and stakeholders preview every section instantly without navigating through login flows. In production, this button would be removed or hidden behind an environment variable.

### Context Providers

Three React Contexts wrap the entire application:

**DemoContext** — Holds all user-facing demo data: documents, contacts, final wishes, medical info, financial records, notifications, storage usage, and the `continuationFeePaid` boolean that gates vault downloads. All CRUD operations are fully wired with loading states and toast notifications.

**WhiteLabelContext** — Holds the brand configuration for white label deployments: company name, logo, primary color, accent color, custom domain, and feature flags.

**WLPackagesContext** — Subscribes to the WL Package API service via a pub/sub pattern. When an admin edits a package in the admin panel, this context receives the update and triggers a re-render on the landing page — no page reload needed.

---

## 2. User Portal — Every Feature Explained

### 2.1 Dashboard

The first screen after login. It serves as the command center for the user's entire legacy plan.

**What it shows:**
- **4 KPI cards**: total documents uploaded, active legacy contacts, storage used vs. plan limit (with color-coded urgency: blue → amber at 80% → red at 95%+), and affiliate earnings this month
- **Legacy completion checklist**: 5 items the user should complete — upload a will, add a legacy contact, record final wishes, enable 2FA, pay the continuation fee. Each item has a green checkmark when complete
- **Storage meter**: a full-width bar showing GB used with 80%/90%/95%/100% threshold markers
- **Recent activity feed**: last 10 actions on the account (document uploads, contact verifications, storage alerts, commission earnings)
- **Vault status badge**: green "VAULT ACTIVE" confirms the account is in good standing

**Why it exists:** Users need a single glance to know how complete their legacy plan is and what still needs their attention.

### 2.2 Digital File Cabinet

The most-used feature in the platform. A 18-folder encrypted document manager.

**The 18 folders:**
Legal Documents, Financial Records, Medical Records, Tax Records, Property & Real Estate, Vehicles, Utilities & Services, Insurance Policies, Pet Records, Personal Letters, Photo Albums, Videos & Recordings, Digital Assets, Business Records, Crypto & NFTs, Education & Awards, Military Records, Other Documents.

**How uploading works:**
1. User clicks a folder (e.g., Legal Documents)
2. The folder opens to show existing files with name, type, size, upload date, and status badge (Verified/Pending)
3. User clicks "Upload Files" or "Scan" (camera scanner) or drags files into the drop zone
4. Files are encrypted client-side with AES-256 before being sent to Supabase Storage
5. A progress indicator shows during upload
6. The new file appears immediately in the folder with a "Pending" status badge

**File actions:**
- **Preview**: opens PDF viewer or image lightbox inline (gated until $199 fee is paid)
- **Download**: saves the decrypted file (gated until $199 fee is paid)
- **Star**: marks important files for quick access
- **Delete**: permanently removes the file and its storage usage

**Sub-folders**: Users can create custom sub-folders inside any of the 18 default folders.

**Secret folders**: Folders can be marked "Secret" — they are hidden by default and require the master password to reveal.

**Search**: A search bar filters files across all 18 folders simultaneously by file name, category, or tag.

### 2.3 Final Wishes & Wills

Where users record specific instructions for what happens to their property, money, and life after they pass.

**Each wish record contains:**
- Category (Personal Property, Sentimental Items, Financial, Pets, Digital Assets, Real Estate, Other)
- Item description (e.g., "1967 Ford Mustang — Candy Apple Red")
- Recipient (e.g., "Michael Doe — Son")
- Notes (e.g., "Never sell it. Keep it in the family.")

**How it works:**
1. User clicks "Add Final Wish"
2. A modal collects the four fields
3. Wish is saved to `final_wishes` table via DemoContext
4. Wishes appear as a card list, sortable by category
5. Legacy contacts with appropriate permissions can view these after vault activation

**Why it matters:** These instructions supplement legal documents. A will handles legal property transfer, but Final Wishes captures the human story — sentimental items, specific wishes for pets, how the user wants to be remembered.

### 2.4 Medical Information

A complete health record stored securely and accessible in emergencies.

**Three sections:**

**Allergies:**
- Allergen name, severity (mild/moderate/severe), reaction description, type (food/medication/environmental), date diagnosed
- Color-coded by severity: green (mild), amber (moderate), red (severe)
- Example: "Penicillin — SEVERE — Anaphylaxis, requires EpiPen"

**Medications:**
- Drug name, dose, frequency, condition being treated, prescriber name, pharmacy name and phone, next refill date
- Example: "Metformin 1000mg — Twice daily — Type 2 Diabetes — Dr. Karen Fields — CVS #4821 — Refill Jul 1, 2026"

**Medical Contacts:**
- Primary physicians, specialists, and emergency medical contacts
- These link to the People section of the platform

**Healthcare Directives:** Stored as documents in the vault (DNR instructions, organ donation preference, advance directive). Not entered as text — uploaded as actual signed legal documents.

**Why it matters:** If a user is incapacitated, first responders and family members need instant access to allergies and medications. This information could be life-saving.

### 2.5 Financial Records

A six-tab financial picture of the estate.

**Tab 1 — Insurance:**
Policy type, carrier, policy number, coverage amount, monthly premium, beneficiary designation, agent contact. Add Policy button creates new entries.

**Tab 2 — Real Estate:**
Property address, estimated value, mortgage balance and lender, monthly payment, title holder, county deed information, notes. Add Property button.

**Tab 3 — Investments:**
Institution, account type (Brokerage, Roth IRA, etc.), account number (masked), portfolio value, holdings summary, beneficiary, contact info. Add Account button.

**Tab 4 — Retirement:**
401k, IRA, Social Security — balance, contribution rate, vesting status, beneficiary. Separate from investments because retirement accounts have different legal rules at death.

**Tab 5 — Tax Records:**
Year, filing date, software used, refund/owed amount, accountant contact, document link in vault. Add Tax Year button.

**Tab 6 — Business:**
Business name, structure (LLC, Corp, etc.), EIN, bank account, revenue estimate, accountant name. Add Business button.

**Why each tab exists:** Estate attorneys need all six categories to administer an estate. Having them organized and accessible saves thousands of dollars in professional time after a user passes.

### 2.6 Personal Assets

Tracks physical and digital assets that aren't covered by the financial records tabs.

**Tab 1 — Vehicles:**
Year, make, model, color, VIN, license plate, title holder, lien status (or "Owned free & clear"), insurance policy, registration expiry, estimated value, bequest instructions (e.g., "Do NOT sell — bequeathed to Michael Doe per will"). Both demo vehicles have special legacy notes.

**Tab 2 — Utilities & Services:**
Electricity, gas, internet, water/sewer, trash, HOA. For each: provider name, account number, phone, website, autopay status (shown as a green badge), average monthly cost, notes. Critical for the person managing the estate — they need to know what accounts to cancel or transfer.

**Tab 3 — Digital Assets:**
Cryptocurrency holdings (BTC, ETH), online accounts (Google, with inactive account manager note), domain names (GoDaddy), social media accounts (Instagram, with memorialization instructions). Each has: platform, asset name, holdings/value, access method, and notes. A red security warning at the top: "Seed phrases stored in Secret Vault — never share digitally."

**Tab 4 — Firearms:**
Type, make, model, caliber, serial number, state DOJ registration number, storage location, transfer instructions. This is legally sensitive — the estate must follow state firearm transfer laws.

### 2.7 Memories & Media

A digital memory collection — photos, videos, and written notes preserved for loved ones.

**Memory types:**
- **Photo**: title, date, description, tags, thumbnail image URL
- **Video**: title, date, description, tags, duration badge, play button overlay
- **Note**: title, date, description, tags (text only)

**Add memory modal:**
User enters title, date, type selector, description, and comma-separated tags. New memory appears at the top of the feed.

**Display:**
Memories render as a scrollable card feed, each showing the thumbnail (if photo/video), type badge, title, date, description, and tags. Video cards have a play button overlay. Clicking a video in demo mode shows a "Video playback started" toast.

**Why it matters:** Documents cover the legal and financial side. Memories capture the human side — the stories, the events, the things that matter most to the people being left behind.

### 2.8 Family & Friends

A personal contact book completely separate from the Legacy Contacts (those are for vault access). This is for keeping family and friends' information organized so the estate can notify and involve the right people.

**Two-panel layout:**
- Left: Scrollable contact list with search and group filter (Immediate Family, Extended Family, Friends, Other, Starred)
- Right: Detailed view of the selected contact

**Contact details:**
Name, relationship, group, phone, email, address, birthday, photo (uploadable), notes, starred toggle.

**Photo upload:** Click the avatar circle → file picker opens → photo updates immediately.

**Edit name:** Click "Edit Name" in the detail panel → browser prompt → name updates in real-time across both panels.

**Delete:** Click trash icon → contact removed immediately from the list.

**Star:** Starred contacts appear at the top of the list and in a "Starred" filter group.

### 2.9 Organize Hub (Folders & Reminders)

An organizational tool for managing custom folder structures and time-based reminders.

**Custom folders:**
- Create folders with any name, color, and emoji
- Nested sub-folders supported
- Folders can be linked to specific vault sections

**Reminders:**
- Title, due date, frequency (one-time, annual, quarterly, monthly), category (Legal, Financial, Legacy, Medical), notes
- Status labels: Upcoming (green), Due Soon (amber, within 30 days), Overdue (red), Completed (gray)
- Click "Complete" to mark done
- Common use cases: "Review and update will — Annual", "Update beneficiaries — Annual", "Review insurance coverage — Annual"

---

## 3. Legacy Contacts & Guardian Permissions

### The Four Contact Types

**Legacy Contact** — The person who receives vault access after the account holder passes away. This is the primary contact type. They must: (1) be designated by the user, (2) verify their government ID with FPD, (3) wait for admin activation after death verification. They cannot access anything until all three steps are complete.

**Guardian Contact** — A trusted person who can access assigned folders **right now**, while the user is alive. Designed for: a spouse who manages finances, a power of attorney attorney, an adult child helping an elderly parent. Guardian access is immediate — no death required.

**Emergency Contact** — Purely informational. This person's contact info is stored so first responders or family can call them in an emergency. They receive no vault access.

**Pet Emergency Contact** — The person who will care for the user's pets if the user cannot. Also informational only — no vault access.

### Adding a Legacy Contact — Step by Step

1. Navigate to People → Legacy Contacts → Add Contact
2. Select contact type (Legacy)
3. Enter: full legal name (as on government ID), email, phone, relationship, access level description, notes
4. Click "Send Verification Invite"
5. System records the contact with status "PENDING"
6. An email is sent to the contact with a link to the ID verification portal
7. Contact uploads a government-issued photo ID
8. FPD admin reviews the ID in the ID Verification admin panel
9. Admin approves or rejects
10. On approval: contact status changes to "VERIFIED"
11. Verified contacts are now eligible to receive vault access after death is confirmed

### Adding a Guardian Contact — Folder Permissions

When contact type is "Guardian", an additional section appears in the modal:

**Access Level selector:**
- **View Only** — Can open and read files but cannot download them
- **View & Download** — Full read + download access
- **Full Control** — View, download, add new files, and delete files

**Folder Assignment:**
A grid of all 18 vault folders appears. The admin checks which folders this guardian can access. For example: a spouse might get access to Legal Documents, Financial Records, and Insurance Policies but not Personal Letters (which might be private).

**What happens after save:**
- Guardian contact appears in the contact list with a green "ACTIVE ACCESS" badge
- Badge shows exactly which folders and at what permission level
- Guardian can immediately log in and see their permitted folders
- No death certificate or admin activation required

**Revoking guardian access:**
Admin edits the contact and unchecks folders, or removes the guardian contact entirely.

---

## 4. Legacy Vault & $199 Continuation Fee

### What the Vault Is

The Legacy Vault is the master container — a curated selection of the user's most important documents that are intended for their legacy contacts. While the File Cabinet is the day-to-day filing system (18 folders, all documents), the Vault is the "hand this to my family when I'm gone" version.

### Why Downloads Are Gated

The $199 Legacy Continuation Fee exists because:
1. After a user passes, their subscription stops. FPD needs a mechanism to keep the vault active.
2. The fee funds: cloud storage during the continuation period, staff time for death verification and ID review, legal overhead.
3. Without the fee, FPD cannot sustainably maintain vaults indefinitely for non-paying accounts.

**Without fee paid:**
- Red striped warning banner across the vault and file cabinet
- All "Download" and "Preview" buttons are disabled (grayed out)
- Hover tooltip: "Pay the $199 Legacy Continuation Fee to unlock downloads"
- File names and metadata are visible, but content is inaccessible

**With fee paid:**
- Warning banner disappears
- All download and preview buttons become active
- The user's `continuationFeePaid` state flips to `true` in both the frontend (DemoContext) and backend (Supabase RLS)

### Payment Options

**Card via Stripe:**
1. Click "Pay $199 with Card (Stripe)"
2. Stripe Payment Intent created server-side in the `stripe-payment-intent` Edge Function
3. Card details collected via Stripe Elements (PCI-DSS Level 1, FPD never sees card numbers)
4. On success, `payment_intent.succeeded` webhook fires
5. Supabase `legacy_continuation_fees` table updated: status → "paid", `paid_at` timestamp set
6. Frontend `continuationFeePaid` → true, vault unlocks immediately

**Cryptocurrency:**
1. Click "Pay $199 with Cryptocurrency"
2. Full crypto checkout modal opens (see Section 20)
3. User selects coin, gets wallet address + QR code
4. Payment confirmed → same database update as Stripe
5. Vault unlocks immediately

### Who Can Pay

Both the **account holder** and a **legacy contact** can pay the fee on behalf of the account holder. When a legacy contact pays, `paid_by_type` in the database is set to "legacy_contact" instead of "account_owner".

### Admin Activation — Separate from Payment

Paying the fee does NOT automatically grant legacy contacts access. Two things must happen:

1. **Fee paid** — tracked in `legacy_continuation_fees`
2. **Admin activates** — admin clicks "Activate" in the Continuation Fee Admin panel after receiving a death certificate

This two-step process prevents accidental or fraudulent access. Even if someone pays the fee prematurely, the vault does not open until an FPD administrator has verified the death.

### The Continuation Period

Default: 24 months after activation. Configurable per account by admin in the `admin_settings` table (`continuation_fee_period_months`). When the period expires, legacy contacts lose download access but can still view file names.

---

## 5. Document Scanner

### Why It Exists

Most users who need a legacy platform are older and may not have document scanning apps. They have physical papers — a will printed by an attorney, an insurance card, a property deed in a filing cabinet. The scanner lets them point their phone at a document and upload it directly without any additional apps.

### Technical Implementation

The scanner uses the browser's `getUserMedia()` API to access the device camera. The video stream renders in a `<video>` element. When the user presses the shutter, the current frame is drawn to a hidden `<canvas>` element using `ctx.drawImage(video, ...)`. The canvas is then converted to a JPEG blob via `canvas.toBlob()`.

**Four scan modes:**
Each mode applies a CSS `filter` to the canvas rendering:

| Mode | CSS Filter | Best for |
|---|---|---|
| Color | `none` | Photos, colorful documents |
| Grayscale | `grayscale(100%) contrast(1.1) brightness(1.05)` | Standard office documents |
| B&W | `grayscale(100%) contrast(1.8) brightness(1.1)` | High contrast text |
| Document | `grayscale(100%) contrast(1.4) brightness(1.15) saturate(0)` | Best overall for text documents |

After capture, the user can switch between modes — each re-processes the original image.

### The Scan Frame Overlay

The live camera view shows a scan frame (rectangle with corner marks) and an animated scan line that sweeps top-to-bottom on repeat. This is pure CSS animation — no JavaScript involved in the overlay. It gives users a clear target for their document.

### Folder Assignment

Before uploading, the user selects which of 8 folder categories the document belongs to (Legal, Financial, Medical, Tax, Property, Insurance, Personal, Other). This folder selection is passed to the parent component's `onUpload` handler, which routes the document to the correct folder.

### Fallback for Camera-Denied

If the user denies camera permission, or if the device doesn't have a camera, the scanner shows a helpful error message and a "Upload Photo Instead" button that opens a standard file picker. The user can photograph a document with their phone's default camera app and upload that image through the file picker.

### Where the Scanner Appears

The `ScanButton` component is a drop-in button that can be placed anywhere. It manages its own `open` state so it doesn't require parent state management. Current locations:
- **Digital File Cabinet** toolbar — "Scan" button next to "Upload Files" in every open folder
- **Legacy Vault** header — "Scan" button next to "Upload Document"
- **Digital Diary** — "Or Scan Document" link below the upload dropzone
- **Legacy Verification** — "Scan ID with Camera" button inside the ID upload dropzone
- **Password Manager** — "Scan" button next to the document attachment field
- **Subscription Manager** — "Scan" button next to the bill attachment field

---

## 6. Digital Diary

### What It Is

A private multimedia journal where users record messages, memories, and instructions for the people they leave behind. Unlike the File Cabinet (which stores documents), the Diary stores human expression — spoken words, video messages, written thoughts.

### The Three Entry Types

**Text entries:**
The user types a title and body text. The body supports multi-paragraph content. Text entries can be tagged with moods (Grateful, Reflective, Happy, Sad, Anxious, Peaceful) — each mood has a colored icon. Entries can be marked "Private" so only the user can see them (legacy contacts cannot access private entries even after vault activation).

**Audio entries:**
The user clicks "Open Microphone" → browser requests microphone permission → a recording interface appears with a timer and a stop button. The recording is captured as a WebM/OGG blob. On the diary card, audio entries show a progress bar and a play/pause button. In demo mode, clicking play shows a "▶ Playing audio" toast. Duration is shown as a badge (e.g., "3:42").

**Video entries:**
Same as audio but uses the camera instead of microphone. Video entries show a thumbnail (from the first frame) with a play button overlay. The user can record directly in the browser or upload an existing video file. In demo mode, clicking a video shows a "Video playback started" toast.

### Mood System

Eight moods available: Grateful 🙏, Reflective 💭, Happy 😊, Sad 😢, Anxious 😰, Peaceful 🌿, plus two more. Each has a unique color. Mood tags appear on the diary card and can be filtered. The mood system helps family members understand the emotional context of messages left behind.

### Privacy Controls

Each entry has a private toggle. Private entries are only visible to the account holder. Public entries are visible to verified legacy contacts after vault activation. A lock icon (🔒 Private) badge appears on private entry cards.

### Edit and Delete

**Edit:** Click the edit button → browser prompt asks for a new title → title updates in real-time. In production, a full edit modal would allow editing the body text too.

**Delete:** Click the trash icon → entry is immediately removed from the list.

---

## 7. Password Manager

### What It Stores

Not just website passwords — any account credential the estate will need to close, transfer, or access. Common use cases: banking portals, investment accounts, email accounts, social media (for memorialization), subscription services, government portals.

**Fields per entry:**
- Title (display name, e.g., "Wells Fargo Online Banking")
- Website URL
- Username
- Email address
- Password (stored encrypted, revealed only on demand)
- Account number (e.g., for bank accounts)
- Security question and answer (stored encrypted)
- Notes (e.g., "Call 1-800-xxx to close account")
- Category (Social Media, Banking, Email, Shopping, Work, Healthcare, Government, Entertainment, Other)
- Two-factor authentication flag
- Starred flag

### Password Strength Scoring

The strength is calculated in real-time as the user types:
- **Weak**: fewer than 6 characters
- **Fair**: 6–9 characters
- **Good**: 10–11 characters or missing one complexity category
- **Strong**: 12+ characters with uppercase + number + special character

A four-segment bar displays the score using color-coded segments (red → amber → green → blue).

### Copy to Clipboard

Each entry in the detail panel has copy buttons for: username, email address, and account number. These use the `copyToClipboard` utility which tries the modern Clipboard API first and falls back to `document.execCommand('copy')` — so it works even inside Figma's sandboxed preview iframe where the Clipboard API is blocked.

### Reveal Password

Passwords are always masked. Click the eye icon to reveal temporarily. This is per-entry — revealing one password doesn't reveal others.

### Document Attachment

Each password entry can have supporting documents attached (e.g., attach a screenshot of the account security settings, or a PDF of the account agreement). The "Scan" button is available here to scan physical documents (account statements, credit card agreements) and attach them.

---

## 8. Auto Pay & Subscriptions Tracker

### What It Is

This is NOT for FPD subscriptions — it's a tracker for all the user's recurring charges so the estate executor knows what accounts to cancel or transfer after the user passes.

**The problem it solves:** After someone dies, their family often discovers dozens of recurring charges they didn't know about — streaming services, gym memberships, software subscriptions, automatic insurance renewals. This feature documents them all in one place.

**Fields per subscription:**
- Service name (e.g., "Netflix")
- Category (Streaming, Software, Insurance, Utilities, Fitness, News, etc.)
- Amount and billing frequency (Monthly, Annual, Quarterly, Weekly)
- Payment type — now includes: Checking Account, Savings Account, American Express, Mastercard, Visa, Discover, PayPal, Apple Pay, Google Pay, **Bitcoin (BTC)**, **Ethereum (ETH)**, **USDC**, **Other Crypto**
- Last four digits of card/account number
- Website URL for managing/cancelling
- Phone number for cancellation (many require phone cancellation)
- Account email/username
- Auto-pay flag (AUTOPAY badge shown in green when enabled)
- Next billing date (highlighted when due within 7 days)
- Cancellation instructions (e.g., "Must cancel IN PERSON at the gym")
- Notes

### How Executors Use This

After the account holder's vault is activated, the executor can see this list and systematically cancel every recurring charge. Without this information, charges continue for months while the family discovers them one by one on bank statements.

---

## 9. Storage Metering & Billing

### How Metering Works

Every file uploaded is counted to the byte against the user's monthly allowance. At the end of each billing cycle, FPD resets the counter to zero — unused storage does NOT carry forward.

**Example:** User has Premium (25 GB/mo). In June they upload 16.9 GB. On July 1 (billing reset), their count resets to 0. The 8.1 GB of unused June storage is gone.

### Overage Billing

If a user uploads more than their plan limit in a billing cycle:
- Each GB over the limit is charged at the overage rate ($0.10/GB for Premium)
- Overage is added to the next Stripe invoice automatically as a metered billing item
- An alert email is sent at 80%, 90%, and 95% thresholds before overage begins

**Example:** User on Premium (25 GB) uploads 28 GB in a month.
- Overage: 28 - 25 = 3 GB
- Charge: 3 × $0.10 = **$0.30 added to next invoice**

### Storage Usage Page — What Each Section Shows

**Main stats row:**
- Storage Used (16.9 GB)
- Usage Percentage (67%)
- Projected End-of-Month (21.4 GB — estimated from upload velocity)
- Estimated Overage ($0.00 — calculated: MAX(0, projection - limit) × rate)

**Usage bar:** Full-width color-coded bar with markers at 80%, 90%, 95%, 100%. Color transitions from blue to amber to red as usage increases.

**6-month history chart:** Pure CSS flexbox bar chart. Each month's bar height is proportional to usage that month. The current month's bar is full opacity; past months are slightly faded.

**Category breakdown:** Each of the 18 folders has a percentage of total storage. Legal Docs 4.2 GB, Financial 4.7 GB, Videos 5.5 GB, etc. Shown as horizontal progress bars.

**Plan upgrade cards:** Three adjacent plans shown. Current plan highlighted with a blue border and "CURRENT PLAN" label. Other plans show:
- **Upgrade**: blue gradient button → Stripe checkout (card) OR orange crypto payment button
- **Downgrade**: gray button → confirmation dialog

### Alert History

A log of every storage notification email sent during this billing cycle:
- 80% threshold → "Usage warning sent"
- 90% threshold → "Upgrade recommended email"
- 95% threshold → "Critical alert email"
- Billing cycle reset → "Storage cleared to 0"

---

## 10. Affiliate Program

### How Referrals Are Tracked

Each user gets a unique referral code (e.g., `FPD-JD-2024-XKTZ`) and a referral link (`https://finalpassdown.com/r/FPD-JD-XKTZ`). When a new user signs up through this link, the referral is recorded in the `affiliate_referrals` table with:
- The referring user's ID
- The new user's ID
- The commission rate locked at referral time
- The `months_remaining` counter (starts at 12)
- The status (active/expired/cancelled)

### Commission Calculation

Each billing cycle, FPD calculates commissions for all active referrals:

```
commission_this_month = referred_user.monthly_price × commission_rate
```

Example: Amanda Chen subscribes to Premium ($24.99/mo). She signed up via your referral when you were at Tier 1 (20%):
- Monthly commission: $24.99 × 0.20 = **$4.99/mo**
- This continues for 12 months
- Total maximum: $4.99 × 12 = **$59.88 from this one referral**

### Tier Advancement

The commission rate increases as you accumulate more active referrals:
- 5–24 active accounts → 20%
- 25–74 active accounts → 25%
- 75+ active accounts → 30%

"Active" means the referred user is still a paying subscriber AND within their 12-month cap window. A referral that cancels or whose cap expires drops out of the active count.

**Important:** The commission rate is locked at the time of referral. If you were at Tier 1 when Amanda signed up, you earn 20% on her — even after you advance to Tier 2. New referrals made after your tier advancement earn the higher rate.

### Affiliate Dashboard

- **Current tier badge** — shows your current rate with a color-coded indicator
- **Tier progress bar** — how many more active accounts you need to reach the next tier
- **Referral link** — copy button + Share via Email (opens `mailto:`) + Share via SMS (opens `sms:`) + Download Marketing Materials
- **Monthly earnings chart** — 6-month CSS bar chart showing commission earned each month
- **Referral table** — every referred user: name, joined date, plan, monthly commission, months remaining, status

### Payouts

Processed on the 1st of each month. Minimum payout: $50. Payment via ACH or PayPal. Admin processes in the Payout Management panel.

---

## 11. Admin Portal — Command Center

> **Backend status (Milestone 3):** the tabs described below are the `MasterAdmin.tsx` Command Center — its Overview/Analytics/Revenue/Storage tabs are still demo data. The *separate* top-level admin screens (ID Verification, Affiliate Admin, Partnership Admin, Payouts, Email Templates, White Label, Subscription Config, $199 Fee, Enterprise API, Admin Team & Roles) are now backed by a real API — see the README's [§38 Admin Backend API](README.md#38-admin-backend-api-milestone-3) for routes, and its Developer Handoff Checklist for what's still outstanding (most notably: admin login is still fake, so none of this can be exercised against a live project yet).

### How to Access

Landing page footer → **MASTER ADMIN LOGIN** button (purple, bottom-right).

**Demo credentials:**
- Email: `admin@finalpassdown.com`
- Password: `Admin2026!`
- MFA: any 6-digit code (demo accepts all)

### Tab Structure

The Command Center has 9 tabs. Here's what each does in detail:

**Overview**
Platform-wide snapshot: 6 KPI metric cards (total users, MRR, overage revenue, affiliate payouts, avg storage, churn rate). Each card shows a delta badge (↑ green for growth, ↓ red for unfavorable). Pure CSS bar charts for revenue trends. Recent signup list and audit log preview.

**Analytics**
Full demographic intelligence (see Section 12).

**Users**
Complete user table with search. Columns: User ID, name, email, plan, storage used, contact count, join date, last active, status. Actions per user: view vault (admin override), suspend account, change plan, delete. Manually onboarded users shown in a separate highlighted section above the main table.

**Revenue**
MRR by plan tier (bar chart). Subscription counts per plan. Overage revenue by month. Affiliate commission payouts. Year-over-year comparison.

**Storage**
Platform-wide storage consumption. Per-plan averages. Users approaching their limit. Storage distribution by file category.

**ID Verification**
Queue of contacts awaiting government ID approval. Each row: contact name, their account holder's name, ID type, submission date, status. Admin clicks "Approve" (sets `id_verified_at`) or "Reject" (allows resubmission). Badge on nav item shows pending count. "3" badge shown in demo.

**Payouts**
All pending affiliate and partner commission payouts. Process individually or in batch. ACH deposit confirmation. Historical log with reference numbers.

**$199 Legacy Fee**
Every account's continuation fee status. Filters: Unpaid, Paid but not activated, Active, Expired. Per-account "Activate" button. When admin clicks Activate: `activated_at` timestamp set, `expires_at` calculated (activated_at + continuation_months), email sent to all verified legacy contacts.

**Audit Log**
Every admin action and system event: ID approvals, account suspensions, plan changes, payment events, storage alerts. Each entry: log ID, acting user, action description, target (user/object), timestamp, severity (info/warning/critical).

---

## 12. Analytics Dashboard

### Purpose

The Analytics tab in the Command Center gives FPD leadership a complete picture of who their users are, where they come from, how they use the platform, and how healthy the business is.

### Demographic Data

**Gender Distribution:**
Shown as horizontal bars + stacked color strip at the bottom.
- Female: 54.2% (27,894 accounts) — the majority, reflecting that women are statistically more likely to plan for end-of-life matters
- Male: 40.1% (20,647 accounts)
- Non-binary: 3.8% (1,957 accounts)
- Prefer not to say: 1.9% (992 accounts)

**Age Distribution:**
Vertical bar chart + detailed table showing user count, percentage, and most common plan per age group:
- 18–24: 5.5% (2,841 users) — Starter/Essential
- 25–34: 14.1% (7,284 users) — Premium
- 35–44: 22.3% (11,492 users) — Premium (largest single cohort)
- 45–54: 26.9% (13,840 users) — Legacy Pro (highest engagement)
- 55–64: 20.0% (10,284 users) — Legacy Pro
- 65–74: 9.4% (4,821 users) — Premium
- 75+: 1.8% (928 users) — Essential (often White Glove clients)

**Relationship Status:**
- Married/Partnered: 58.4% — highest because couples often plan together
- Single: 21.2%
- Divorced/Separated: 12.8%
- Widowed: 6.1% — often the most urgent need
- Prefer not to say: 1.5%

### Geographic Data

**Top 10 States:** California (18.0%), Texas (13.3%), Florida (10.7%), New York (9.4%), Georgia (6.4%), Illinois (5.7%), North Carolina (4.8%), Pennsylvania (4.4%), Ohio (3.8%), Arizona (3.3%). Each state shows user count + MRR contribution + horizontal bar.

**Country Distribution:** US 93.7% (48,241), Canada 2.5% (1,284), UK 1.6% (841), Australia 1.0% (492), Germany 0.5% (241), Other 0.7% (391). Shown with stacked color bar.

**Top 10 Cities:** Los Angeles, Houston, Atlanta, Chicago, New York, Dallas, Miami, Phoenix, Philadelphia, Sacramento.

### Technology Data

**Device & Platform:**
- Mobile iOS: 41.2%
- Mobile Android: 28.4%
- Desktop Mac: 18.1%
- Desktop Windows: 10.8%
- Tablet: 1.5%
Total mobile: 69.6% — confirming the need for mobile-first design and PWA support.
PWA installed rate: 34.2%

**Acquisition Sources:**
- Organic Search (Google): 38.4% — most important channel
- Affiliate Referral: 22.1% — validates the affiliate program
- Social Media: 14.8%
- Partner Referral: 12.4%
- Direct/Typed URL: 8.2%
- Paid Ads: 4.1%

### Behavioral Data

**Feature Adoption Rates** (% of users who have used each feature):
1. Digital File Cabinet: 87.4%
2. Legacy Contacts: 74.2%
3. Final Wishes: 62.8%
4. Medical Info: 58.1%
5. Financial Records: 52.4%
6. Digital Diary: 41.8%
7. Password Manager: 38.2%
8. Affiliate Program: 29.4%
9. $199 Continuation Fee: 18.7% — most important growth opportunity

**Vault Completion Score Distribution:**
- 0–20% (Just started): 16.0% — risk of churn, needs nudging
- 21–40% (In progress): 21.9%
- 41–60% (Halfway): 26.9%
- 61–80% (Nearly done): 24.3%
- 81–100% (Complete): 10.9% — target to grow this segment

**Monthly Engagement:**
- Average DAU: 9,284
- Average MAU: 51,490
- DAU/MAU ratio: 18.0% (industry average for life-planning apps is ~12%)
- Average session duration: 10.2 minutes

### Health Metrics

**Subscription Retention:**
- Month 1: 91.2%
- Month 2: 84.8%
- Month 3: 80.1%
- Month 6: 74.4%
- Month 12: 68.2% (industry benchmark: 58–65%)

**Net Promoter Score: 47** (Excellent — industry avg for financial apps: 32)
- Promoters (9–10): 62.4%
- Passives (7–8): 21.8%
- Detractors (0–6): 15.8%

**12 Platform Health KPIs:**
Monthly churn 2.3%, annual churn 15.8%, ARPU $27.40, customer LTV $1,942, $199 fee adoption 18.7%, support tickets 284/month, avg resolution 4.2 hours, White Glove clients 3, verified ID contacts 12,841, avg vault documents 11.4, storage overage rate 8.4%, 2FA enabled 44.1%.

---

## 13. Manual User Onboarding

### Why This Exists

Some users cannot or will not sign up through the website on their own. White Glove clients, charity accounts, press/media users, beta testers, internal employees, and partner-referred accounts may all need to be manually created by an administrator.

### How to Onboard a User

1. From the Command Center header, click the blue **"Onboard User"** button
2. A 3-step wizard opens as a modal

**Step 1 — Contact Information:**
- Full name (required)
- Email address (required)
- Phone number (optional)
- White Glove Service toggle — if enabled, marks this as a WG client and pre-selects subscription waiver
- Admin notes — internal notes visible only to admins (e.g., "82-year-old client. Daughter contacted us. Specialist: Marcus")

**Step 2 — Package & Billing:**
Five plan cards shown with storage and price. Click to select.

**Subscription Waiver toggle:** When enabled, the user's subscription becomes $0/mo. A waiver reason must be selected:
- White Glove Service client (most common for manual onboarding)
- Strategic partner / referral
- Nonprofit / charitable org
- Press / media / influencer
- Beta tester / early adopter
- Internal / employee account
- Financial hardship waiver
- Other

The waiver reason is logged in the audit trail for compliance.

**Send welcome email toggle:** Whether to send the standard welcome email to the user. Sometimes disabled for internal test accounts.

**Step 3 — Review:**
A table showing all entered information. The subscription amount shows "$0.00 (WAIVED)" in green if waived, with the waiver reason. A green info box explains that the waiver is logged in the audit trail. Click "Create Account" to finalize.

### After Creation

The manually onboarded user:
- Appears immediately in a highlighted "Manually Onboarded Accounts" section in the Users tab
- Is listed with their plan, monthly charge (or "WAIVED" badge), and waiver reason
- Is added to `_onboardedUsers` in-memory store (production: written to Supabase users table)
- Receives a welcome email (if toggle was on)
- Can log in immediately with the email and a system-generated temporary password

A blue info banner in the Command Center overview also shows recently onboarded users at a glance.

---

## 14. White Glove Concierge Service

### What It Is

A premium assisted onboarding service for users who are not comfortable with technology — typically elderly users or those dealing with a major life transition. A dedicated FPD specialist handles all the technical work on the client's behalf through a series of phone and video calls.

### User-Facing Intake (WhiteGloveService.tsx)

Available at: User Portal sidebar → Concierge → White Glove Service, or landing page → any CTA that routes to WG.

**The intake page contains:**

**Hero section:** Dark gradient with purple accents. Headline: "We Set Everything Up For You." Subtitle explains that users only need a phone — no computer, no apps.

**Four-step process cards:**
1. Intake Call — specialist calls personally, understands what's needed
2. Specialist Uploads — specialist uploads every document on the client's behalf
3. Contacts & Wishes — sets up legacy contacts and final wishes by phone
4. Review & Complete — walk-through call to confirm everything is correct

**Everything included checklist:**
- Dedicated specialist assigned
- Up to 4 one-on-one sessions
- Specialist uploads all documents
- Complete vault setup start to finish
- Legacy contact setup and ID verification guidance
- Final wishes recorded exactly as described
- Follow-up call 30 days after completion
- Priority email and phone support — always a real person

**FAQ accordion (6 questions):**
- Do I need a computer? (No)
- How long does it take? (2–3 sessions over 1–2 weeks)
- What documents do I need? (Specialist provides a simple checklist)
- Can a family member set it up? (Yes)
- Is my information private? (AES-256 encryption, specialist access ends after service)
- What if I need help after? (Priority support within 2 business hours)

**Intake request form:**
- Full name (required)
- Phone number (required)
- Email (optional)
- Best time to call: Morning (9am–12pm), Afternoon (12–5pm), Evening (5–7pm)
- Who is contacting: The account holder / A family member
- Additional notes
- Submit → success screen with a reference number. A real person calls within 1 business day.

**Three reassurance cards at the bottom:**
- Your Data Is Safe (AES-256, specialist access ends)
- Real People, Always (no bots)
- Your Pace, Always (never rushed)

### Admin-Side Management (WhiteGloveAdmin.tsx)

Three tabs inside Admin Portal → White Glove:

**Clients tab:**
Each client is a collapsible card showing: name, age, plan, subscription waiver status, specialist assigned, vault completion progress bar, next session date, intake reason.

Expanded view shows:
- Full intake reason text
- Session log (all past and upcoming sessions with type badge, date, time, duration, notes)
- Specialist notes field with "Add note" functionality
- Action buttons: Call Client, Start Video, Scan Document (uploads to client's vault), Send Check-in Email, Schedule Session, Mark Complete

**Authorization Waivers tab:**
See Section 15.

**Concierge Staff tab:**
See Section 16.

---

## 15. Authorization Waiver System

### Why a Waiver Is Needed

When a specialist uploads documents and configures an account on a client's behalf, they are acting as the client's authorized agent. This requires explicit legal consent. The waiver documents exactly what the specialist is authorized to do, protects FPD legally, and gives the client a clear record of what they agreed to.

### The Waiver Document

A 9-section legal agreement (in `WaiverForm.tsx`):

1. **Designated Specialist** — names the specific specialist assigned
2. **Purpose of Authorization** — explains this is for setup assistance only, not legal authority outside FPD
3. **Authorized Scope** — checkboxes for 8 permission types:
   - Upload and organize documents
   - Add and configure Legacy/Guardian Contacts
   - Record Final Wishes and estate instructions
   - Create folders and organize vault structure
   - Enter medical information and medication records
   - Enter financial account information and asset records
   - Create diary entries and video messages
   - Full access to all platform features
4. **Session Recording & Audit** — all specialist actions are logged
5. **Zero-Knowledge Encryption** — specialist cannot read encrypted file contents
6. **Voluntary Information Provision** — client confirms they have legal right to share all info
7. **Limitation of Liability** — FPD is not responsible for document accuracy
8. **Revocation** — can revoke at any time by calling/emailing support
9. **Acknowledgment** — confirms legal standing under E-SIGN Act

### Sending a Waiver (Admin Workflow)

1. Admin goes to White Glove → Authorization Waivers → Send Waiver
2. Modal asks for: client name, client email, assigned specialist, authorized scope (8 checkboxes)
3. Admin can add a personal note (e.g., "Hi Dorothy, this is the authorization form we discussed on our call")
4. Click "Send Waiver via Email" — client receives email with a link to sign
5. Waiver appears in the table as "PENDING"

### Signing a Waiver (Client Workflow)

Client clicks the link in their email, or navigates to: User Portal sidebar → Concierge → Sign Authorization (shown with "Action" badge).

**Step 1 — Read:**
Full 9-section document rendered in a scrollable box. A gentle nudge: "Please scroll to the bottom before continuing." Once scrolled past the bottom, a "Continue to Sign" button appears.

**Step 2 — Sign:**
Two signature modes:
- **Type Name**: User types their full legal name. Renders in italic serif font. Verification: must be at least 2 words.
- **Draw Signature**: A canvas pad where the user draws with mouse, finger, or stylus. Lines are 2.5px with round caps for a natural feel. A "Clear" button resets the canvas.

Three acknowledgment checkboxes (must all be checked):
1. I am the account holder or their legal representative
2. I have read and understand the full agreement
3. I understand the authorization is revocable and all actions are logged

A security notice: "Your signature is encrypted and time-stamped. IP address and device fingerprint recorded."

**Step 3 — Done:**
Success screen with: document ID, signed timestamp, signed name, specialist name. In production, the signed waiver PDF is generated and emailed to both the client and the specialist.

### Admin Waiver Tracking

The Waivers tab shows a table with all waivers:
- Document ID (WAV-001, etc.)
- Client name and email
- Specialist assigned
- Date sent
- Date signed (if applicable)
- Status: PENDING / SIGNED / DECLINED / EXPIRED

Per-row actions:
- **Preview** — opens the waiver signing page (admin can see what client sees)
- **Remind** — sends a reminder email to the client
- **Download** — downloads the signed waiver as a PDF (signed only)

**Sign rate metric:** Total Sent ÷ Signed, shown in the KPI cards at the top.

---

## 16. Concierge Staff Portal

### The Problem It Solves

FPD hires employees specifically for the White Glove service. These employees need access to:
- Their assigned clients' profiles
- Session scheduling tools
- Document scanner (to upload on behalf of clients)
- Waiver status

They do NOT need access to:
- Revenue data
- All user accounts
- Platform configuration
- Other employees' clients

### Staff Authentication (ConciergeLogin.tsx)

A completely separate login page from the master admin. Dark navy/purple theme with a star icon to distinguish it from the admin (which uses a crown icon).

**Left panel:** Explains that this portal is restricted to authorized staff, lists the four things staff can do, and emphasizes the isolation from master admin.

**Login form:** Email + password. After successful authentication, the `authenticateConcierge()` function in `conciergeStaff.ts` checks the employee record, updates their `lastLogin` timestamp, and returns the employee object.

**Access control:** If a staff member's status is "suspended", authentication returns `null` and they see "access suspended" error. If their credentials are wrong, same error.

### The Staff Data Store (conciergeStaff.ts)

An in-memory service with pub/sub architecture. In production, this becomes API calls to the backend. Functions:
- `authenticateConcierge(email, password)` — returns employee or null
- `inviteEmployee(data)` — creates a new employee record
- `updateEmployee(id, changes)` — updates employee fields
- `revokeEmployee(id)` — sets status to "suspended"
- `getEmployee(id)` — retrieves single employee

### The Concierge Portal Interface (ConciergePortal.tsx)

**Sidebar:**
- FPD logo with "CONCIERGE PORTAL" label
- Staff badge showing: avatar initials, name, role (color-coded by seniority)
- Three navigation items: My Clients, Schedule, Waivers
- Number badge on each nav item (client count, upcoming sessions, pending waivers)
- A red "RESTRICTED ACCESS" notice at the bottom showing how many clients are assigned
- Sign Out button

**My Clients tab:**
Shows ONLY the clients assigned to this employee. Each client is a collapsible card identical to what an admin sees in the White Glove admin, but only for their clients. Actions available: Call Client, Start Video, Scan Document (uploads to client vault), Send Check-in Email, Schedule Session, Mark Complete.

If a client has a pending authorization waiver, a red alert banner shows "Authorization waiver not yet signed → View →" which opens the waiver inline within the card.

If the waiver is signed, a green banner shows "Authorization waiver signed · Access granted."

**Schedule tab:**
Upcoming sessions across all assigned clients, sorted by date. Each session shows: client name, date and time, session type badge (phone/video/in-person), and Start/Reschedule buttons.

**Waivers tab:**
Authorization waiver status for each assigned client. Green "SIGNED ✓" or amber "AWAITING SIGNATURE". Actions: Send Reminder (for pending), Request Waiver (if none sent yet).

### How to Add a New Specialist

Admin Portal → White Glove ⭐ → 👥 Concierge Staff tab → **Invite Employee**

The modal collects:
- Full name (required)
- Work email at finalpassdown.com (required)
- Phone (optional)
- Role: Junior Concierge (blue), Senior Concierge (purple), Lead Concierge (orange)
- Assign specific clients (checkboxes for each WG client in the system)
- Temporary password (default: Concierge2026!, admin should change this per hire)

After inviting:
- Employee record created with status "invited"
- Their unique portal login link is generated: `finalpassdown.com/concierge?token={unique_token}`
- Admin can copy their full credentials (email + password + link) in one click
- Admin can resend the invite email if the employee hasn't logged in

### Access from Landing Page

A new **"CONCIERGE STAFF"** button in the landing page footer (orange color to distinguish from the green Partner Portal and purple Admin buttons). Takes staff directly to the Concierge Login page.

---

## 17. Partner Program

### The Difference from Affiliates

| Feature | Affiliate | Partner |
|---|---|---|
| Setup | Free, instant | $599 one-time fee |
| For | Any FPD user | Businesses/professionals |
| Commission | 12-month cap per referral | Lifetime, no cap |
| Dashboard | In user portal | Standalone Partner Portal |
| Support | Standard | Priority + account manager |

### The $599 Setup Fee

Covers: partner dashboard provisioning, custom referral link and tracking pixel, subdomain (`yourname.finalpassdown.com`), marketing kit, and an onboarding call.

**Payment options:** Card (Stripe) or Cryptocurrency (full crypto modal with 8 coins).

### Volume-Based Lifetime Tiers

| Tier | Accounts | Commission |
|---|---|---|
| Tier 1 | 1–50 | 20% recurring lifetime |
| Tier 2 | 51–100 | 25% recurring lifetime |
| Tier 3 | 101+ | 30% recurring lifetime |

Unlike affiliates, there is NO 12-month cap. As long as the referred account remains an active FPD subscriber, the partner earns a commission every month — forever. Tier advancement is automatic when account milestones are reached.

### Partner Onboarding Wizard (4 steps)

**Step 1 — Overview:**
Shows the $599 setup fee prominently with "No monthly fees. Ever." The three volume tiers are displayed as large percentage cards. An earnings estimator shows projected monthly income at 25, 75, and 150 accounts.

**Step 2 — Your Information:**
Organization type selector (8 types: Law Firm, Financial Advisor, Insurance Agency, Funeral Home, Medical/Healthcare, Senior Care, Bank/Credit Union, Other). Organization name, contact name, email, phone, website. "How will you refer clients?" optional text field.

**Step 3 — Setup Fee Payment:**
Summary card showing the selected plan details and feature list. Card payment form (Cardholder Name, Card Number, Expiry, CVC) with SSL/Stripe notice. AND a "Pay with Crypto" button for the $599 using the full crypto checkout modal.

**Step 4 — Complete:**
Success screen with a unique partner reference number. States they start at Tier 1 (20%) and explains automatic advancement. "Access Partner Dashboard →" button.

### Partner Dashboard (5 tabs)

**Overview:** KPI cards (active accounts, current tier, monthly earned, total earned). Tier progress bar showing accounts needed to unlock next tier. Monthly commission CSS bar chart (6 months). Next payout card. Quick actions: Copy Referral Link, Download Payout Report, Marketing Kit.

**Referrals:** Table of all referred accounts with plan, join date, commission per month at current rate, status. Copy referral link button at top.

**Payouts:** History table with reference numbers, dates, amounts, status (PAID/PENDING).

**Resources:** Marketing Kit, Commission Calculator, Client Onboarding Guide, Tier Advancement Guide. No API Documentation (removed per user request).

**Settings:** Org name, contact, email, phone, payout method (ACH), setup fee paid confirmation, current tier.

---

## 18. White Label Solutions

### What White Label Means

A white label deployment is a separately branded instance of the FPD platform. The WL partner's customers log in at a custom domain (e.g., `clients.greenfieldlaw.com` or `greenfield.finalpassdown.com`), see the partner's logo and colors, and have no idea they're using Final Pass Down.

From the customer's perspective, it's the partner's own product. From FPD's perspective, it's a revenue stream from partners who pay a monthly fee plus earn a commission on every account they bring in.

### The Three Packages

**Agency Partner ($2,999/mo + $2,500 setup):**
Up to 500 users. Best for law firms, financial advisory firms, insurance agencies. Includes full white label (custom domain + branding), 20% lifetime commission, priority support, partner analytics dashboard, custom email templates, dedicated onboarding manager, API access.

**Enterprise Partner ($7,499/mo + $5,000 setup):**
501–5,000 users. Best for insurance carriers, banks, HR platforms, large financial firms. All Agency features plus: 25% lifetime commission, 24/7 dedicated support line, real-time white-label analytics, custom feature development, 99.9% SLA, white-glove onboarding, revenue sharing dashboard, Enterprise API + webhooks.

**Institutional Partner ($15,000/mo + $5,000 setup):**
5,000+ users (unlimited). Best for senior care networks, hospital systems, government programs. All Enterprise features plus: 30% lifetime commission, named account executive, custom SLA & infrastructure, HIPAA/SOC 2 compliance package, on-site onboarding & training, custom API rate limits, quarterly business reviews, co-marketing.

### Three Billing Models

The admin can configure any WL package with one of three billing structures:

**Flat Monthly:**
```
Monthly charge = flatMonthly (e.g., $2,999)
```
Simple. Fixed regardless of user count. Best for Agency tier where user count is capped.

**Per User Flat ($):**
```
Monthly charge = MAX(minMonthly, activeUsers × perUserAmount)
```
Example: $2.99/user, min $7,499:
- 100 users → MAX($7,499, 100×$2.99=$299) = **$7,499** (minimum applies)
- 3,000 users → MAX($7,499, 3,000×$2.99=$8,970) = **$8,970** (per-user applies)

**% of Revenue:**
```
Monthly charge = MAX(minMonthly, activeUsers × avgUserMRR × pct/100)
```
Example: 15%, min $15,000, avg user MRR $24.99:
- 1,000 users → MAX($15,000, 1,000×$24.99×0.15=$3,749) = **$15,000** (minimum)
- 5,000 users → MAX($15,000, 5,000×$24.99×0.15=$18,743) = **$18,743** (percentage)

The admin package editor shows a live charge preview at 50, 200, and 1,000 users so you can see exactly what each partner would pay at different scales.

### Live Frontend Sync — How It Works

When an admin changes a package price, it now writes through to the real `wl_packages` table and is visible on the public site on the next load — see [§19](#19-wl-package-api--live-frontend-sync) for the exact request flow and file (`wlPackages.ts`). Short version: same-tab updates are instant via the existing pub/sub cache; a second visitor sees the change on their next page load/fetch, since there's no WebSocket push between separate browser sessions — updates aren't literally real-time across tabs/users, just always-current on fetch.

### WL Commission on FPD Subscriptions

WL partners earn a commission on every FPD subscription generated through their platform. This is separate from the monthly platform fee:

Example (Enterprise tier, 25% commission):
- 1,000 Premium subscribers × $24.99/mo × 25% = **$6,248/mo commission**
- This is paid monthly, forever, as long as those accounts remain active

---

## 19. WL Package API — Live Frontend Sync

> **Milestone 3 update:** packages now round-trip through the real `wl_packages` table, not just in-memory state. Sales and payment-processor config are the one part of this file still demo-only (see below) — no `wl_sales` table exists yet.

### Architecture

```
Admin edits package (PartnerOnboardingAdmin.tsx)
        ↓
wlPackages.ts: updatePackage(id, changes)
        ↓
PATCH /admin/white-label/packages/:id  (adminApi, admin-authenticated)
        ↓
wl_packages row updated in Postgres
        ↓
_packages[] cache updated + notify() broadcasts to listeners
        ↓
WLPackagesContext.tsx: setPackages(updated)
        ↓
useWLPackages() consumers re-render
        ↓
LandingPage WhiteLabel section (and WhiteLabelOnboarding.tsx) show the new price
```

Reads (`getPackages()`) go through `GET /public/wl-packages` — unauthenticated, since the landing page and the partner onboarding wizard both need it before anyone is logged in. Writes (`updatePackage`/`createPackage`/`deletePackage`) go through the admin-authenticated `/admin/white-label/packages` routes.

### The Service File (wlPackages.ts)

No more `DEMO_MODE` flag — packages always hit the real backend now (`src/app/services/publicApi.ts` for reads, `adminApi.ts` for writes). It keeps a small in-memory `_packages[]` cache purely so `subscribeToPackages()` can emit instantly on subscribe and again after every write, without every consumer re-fetching.

**Key functions:**
- `subscribeToPackages(fn)` — registers a listener, immediately emits the cached state, kicks off a fresh `getPackages()` fetch, returns an unsubscribe function
- `getPackages()` — `GET /public/wl-packages`, maps DB rows to `WLPackage` (see `packageFromDB`/`packageToDB` for the billing-model shape translation)
- `updatePackage(id, changes)` / `createPackage(pkg)` / `deletePackage(id)` — admin-only writes, each updates the local cache and calls `notify()` after the API call succeeds
- `getSales()` / `createSale()` / `getProcessors()` / `updateProcessor()` — **still the in-memory demo store.** `createSale()` is what `WhiteLabelOnboarding.tsx` calls when a prospective partner applies; until a `wl_sales` table + endpoint exist, those applications aren't actually persisted anywhere durable.
- `calcMonthlyCharge(billing, activeUsers, avgUserMrr)` — pure function for charge calculation, unchanged

### The Context (WLPackagesContext.tsx)

Unchanged — still subscribes on mount, unsubscribes on unmount:

```typescript
useEffect(() => {
  const unsub = subscribeToPackages(setPackages);
  return unsub; // cleanup on unmount
}, []);
```

The context itself didn't need to change; only what `subscribeToPackages` does underneath it did.

---

## 20. Crypto Payments

### Supported Coins

| Coin | Network | Confirmations | Symbol |
|---|---|---|---|
| Bitcoin | Bitcoin | 2 | ₿ |
| Ethereum | Ethereum (ERC-20) | 12 | Ξ |
| USD Coin | Ethereum (ERC-20) | 12 | $ |
| Tether | TRC-20 (Tron) | 20 | ₮ |
| Solana | Solana | 1 | ◎ |
| BNB | BNB Smart Chain | 15 | B |
| XRP | XRP Ledger | 4 | ✕ |
| Litecoin | Litecoin | 6 | Ł |

### The Payment Flow — Detailed

**Step 1 — Coin Selection:**
User sees a list of all 8 coins with their current rate and the exact amount due in that coin (calculated as `amountUSD / coin.demoRate`). Decimal precision varies by coin value (BTC shows 6 decimals, USDC shows 2). Clicking a coin moves to Step 2.

**Step 2 — Payment Address:**
- A CSS-generated QR code (deterministic pixel grid based on the wallet address string)
- The wallet address displayed in a monospace code element
- A copy button using the `copyToClipboard` utility (works in sandboxed iframes)
- A 30-minute countdown timer (color shifts: green → amber at 5min → red at 2min)
- The invoice reference number (e.g., FPD-2AB3K9X4C)
- Two warning banners: (1) send exact amount, (2) use correct network

**Step 3 — Payment Detected (auto-triggered after 8s in demo):**
A spinning circle animation. "Payment Detected" heading. Confirmation message. Transaction hash shown (truncated). "Waiting for N confirmations" message.

**Step 4 — Success:**
Green checkmark animation. Confirmation table (amount, USD value, network, processor, invoice ID, status). In the background, the payment handler is called and the relevant feature is unlocked.

### The QR Code

The QR code is generated entirely with CSS (no external library, no SVG gradients that would cause duplicate-ID issues in Figma). A deterministic algorithm converts the wallet address string into a 17×17 boolean grid. Corner squares (top-left, top-right, bottom-left) are always filled. Data cells use a hash of character codes to fill/empty cells. The result looks like a real QR code and is unique per address.

### Where Crypto Payment Appears

| Feature | Trigger | What unlocks |
|---|---|---|
| $199 Continuation Fee | "Pay with Cryptocurrency" button | Vault downloads and preview |
| Plan Upgrade | "Pay with Crypto" button per plan card | Higher storage tier |
| Partner Setup Fee | "Pay with Crypto" button in Step 3 | Partner account activation |

---

## 21. Payment Processing Architecture

### Stripe (Primary)

All standard subscription billing flows through Stripe. Three Edge Functions handle server-side operations:

**`stripe-checkout`** — Creates a Checkout Session for plan subscriptions. Returns a URL that redirects the user to Stripe's hosted checkout page. After payment: Stripe sends a webhook to `stripe-webhook`, which updates the user's plan in Supabase.

**`stripe-payment-intent`** — Creates a PaymentIntent for one-time charges (the $199 fee). Returns a `clientSecret` which is used with Stripe Elements in the browser to collect card details without FPD ever touching the card number.

**`stripe-webhook`** — Receives and validates Stripe events:
- `payment_intent.succeeded` → marks continuation fee as paid
- `customer.subscription.updated` → syncs plan changes
- `customer.subscription.deleted` → marks account as cancelled
- `invoice.payment_failed` → marks account as past_due
- `invoice.payment_succeeded` → resets to active

### Crypto Payment Processors

FPD has merchant accounts with multiple crypto processors. Each processor has its own webhook endpoint:

**Coinbase Commerce:** `POST /webhooks/coinbase` — Handles `charge:confirmed` events. Updates the same tables as Stripe webhooks.

**BitPay:** `POST /webhooks/bitpay` — Handles `invoice_paidInFull` events.

**NOWPayments:** `POST /webhooks/nowpay` — Handles `payment_status` events with status "finished".

All three ultimately write to the same `legacy_continuation_fees` table with `status = 'paid'` and `processor = 'coinbase'|'bitpay'|'nowpay'`.

### Clipboard Utility

All copy-to-clipboard operations use `src/app/utils/clipboard.ts` instead of the native `navigator.clipboard.writeText()`. This is because:
- The Figma preview environment blocks `navigator.clipboard` at the browser permissions policy level
- `try/catch` and `.catch()` don't prevent the error from firing (it's blocked before JS can intercept it)
- The fallback uses `document.execCommand('copy')` via a temporary `<textarea>` element, which works in all environments

The utility:
```typescript
export function copyToClipboard(text: string): void {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
    } else {
      execCommandCopy(text);
    }
  } catch {
    execCommandCopy(text);
  }
}
```

### WL Payment Processor Configuration

WL partners can use different processors than FPD's default:

1. **Shared processor:** FPD's Coinbase Commerce or BitPay account handles the WL partner's user payments. FPD receives the funds and pays the partner their commission minus the platform fee.

2. **Partner's own processor:** The partner already has a Stripe or PayPal merchant account. FPD routes the WL platform's billing through the partner's account. FPD invoices the partner separately for the monthly platform fee ($2,999/$7,499/$15,000).

3. **Custom deal:** FPD negotiates directly with the partner's payment processor of choice (common for institutional-level deals). Contact integrations@finalpassdown.com.

---

## 22. AI Assistant (FPD Agent)

### What It Is

A floating chatbot button in the user portal (bottom-right corner, labeled "Ask AI Assistant") that provides contextual help and answers questions about the platform.

### Demo Mode (Rule-Based)

In the current demo, responses are generated by a keyword-matching function — no external API calls. The `getResponse(query)` function analyzes the user's input and matches against 8 response categories:

| Keywords | Response covers |
|---|---|
| upload, document, file | Step-by-step upload instructions |
| legacy contact, contact, who can access | Contact types and access levels |
| 199, fee, continuation, download | Continuation fee explanation |
| pass, death, die, after i, happen | Post-death vault activation flow |
| video, message, record | Digital diary video recording |
| plan, price, subscription, cost | Pricing table comparison |
| 2fa, two factor, authentication, security | 2FA setup instructions |
| storage | Storage metering explanation |

If no keywords match, a default "I can help with..." response is shown.

### Response Formatting

Responses use a markdown-like format rendered in the chat bubble:
- `**bold text**` for emphasis
- Bullet point lists with `•`
- Table-like formatting for plan comparisons
- Code-style formatting for account names

A 500ms simulated "typing" delay shows a blinking animation before the response appears.

### Suggestion Chips

8 pre-written suggestion chips appear on first open:
- "How do I upload a document?"
- "What is a Legacy Contact?"
- "How does the $199 fee work?"
- "What happens to my vault after I pass?"
- "How do I add a video message?"
- "What's the difference between plans?"
- "How do I set up 2FA?"
- "How does storage metering work?"

### Production Implementation

Replace the rule-based `getResponse` with a Claude API call:
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: `You are the Final Pass Down AI assistant. You help users understand the platform, organize their legacy documents, and navigate their vault. Always be empathetic — users may be dealing with serious health situations or end-of-life planning. Keep responses concise and actionable.`,
  messages: [{ role: "user", content: query }],
});
```

---

## 23. Email Templates System

> **Milestone 3 update:** these 16 templates used to be hardcoded inside `EmailTemplates.tsx`. They now live in the `email_templates` table (seeded by `database/migrations/003_email_templates_seed.sql`) and are served via `GET/PUT /admin/email-templates` — see README [§38](README.md#38-admin-backend-api-milestone-3). The content below is still accurate; only where it's stored changed.

### How Templates Are Structured

Each of the 16 email templates has:
- **ID** — internal identifier (e.g., "welcome", "otp_verify")
- **Category** — Account, Storage, Contacts, Subscriptions, Affiliate, Partnership, Security, White Label
- **Name** — display name (e.g., "Welcome Email")
- **Subject** — editable email subject line
- **Trigger** — when it fires automatically (e.g., "On new account registration")
- **Variables** — list of `{{variable}}` placeholders (e.g., `{{user_name}}`, `{{plan_name}}`)
- **HTML body** — full HTML email template

### The 16 Templates in Detail

**1. Welcome Email** — Sent when a user creates a new account. Dark FPD-branded design, gets-started-in-3-steps content, login button.

**2. OTP Verification** — Sent for login or sensitive actions. Large 6-digit code displayed in monospace. Expires in `{{expires_in}}` minutes.

**3. Password Reset** — Sent when user clicks "forgot password". Reset link button, expires notice, security warning if not requested.

**4. Storage Warning 80%** — Amber-themed. Shows exact GB used/limit, upgrade link.

**5. Storage Warning 90%** — Orange-red theme. "Take action now" urgency.

**6. Storage Warning 95%** — Red theme. Critical alert, overage warning.

**7. Storage Overage** — Sent after billing cycle when overage is charged.

**8. Legacy Contact Invite** — Sent to the designated contact. Explains they've been designated, what that means, and links to verify their ID.

**9. Legacy Contact Verified** — Confirmation that their ID has been approved.

**10. Vault Access Activated** — Sent when admin activates the vault after death verification. Includes vault URL and expiry date.

**11. Continuation Fee Receipt** — Payment confirmation for the $199 fee.

**12. Affiliate Welcome** — Sent when user joins the affiliate program. Includes their referral link and code.

**13. Affiliate Commission** — Sent each time a referral commission is earned.

**14. Affiliate Payout** — Monthly payout confirmation with reference number.

**15. Partnership Welcome** — Sent when a partner organization is approved.

**16. WL Activated** — Sent when a white label deployment goes live.

### Variable Substitution

Variables use double-brace syntax: `{{variable_name}}`. In production, substitution happens server-side before sending:

```typescript
const html = template.html.replace(
  /\{\{(\w+)\}\}/g,
  (_, key) => data[key] ?? `{{${key}}}` // leaves unresolved vars visible
);
```

### Admin Editing

The Email Templates panel shows all 16 templates in a searchable, filterable list. Click a template to expand it. Click "Edit" to enter edit mode with a code editor for the HTML body. Subject line editable inline. "Copy HTML" copies the raw HTML for use in external ESPs (SendGrid, Postmark, etc.). "Reset to Default" restores the original FPD design.

---

## 24. Security Architecture

### Zero-Knowledge Encryption

FPD uses a zero-knowledge model for vault documents. This means:

1. User sets a master password (or it's derived from their account password)
2. A 256-bit encryption key is derived from this password using PBKDF2 (100,000 iterations, SHA-256)
3. The key never leaves the user's browser — it is never transmitted to FPD servers
4. Documents are encrypted in the browser before upload using AES-256-GCM
5. Only the encrypted ciphertext reaches Supabase Storage
6. Even if FPD's servers were breached, the ciphertext is useless without the user's master password
7. FPD staff (including White Glove specialists) cannot read encrypted file contents — they can only upload new files (which they encrypt before uploading)

### Row Level Security (Supabase)

Every table has RLS enabled. The key policies:

```sql
-- User can only access their own records
CREATE POLICY "user_own" ON public.vault_documents
  FOR ALL USING (user_id = auth.uid());

-- Legacy contacts can only access documents after:
-- (1) their ID is verified, (2) continuation fee is paid, (3) admin has activated
CREATE POLICY "legacy_access" ON public.vault_documents
  FOR SELECT USING (legacy_contact_can_access(user_id));

-- Admins bypass RLS via service_role key (Edge Functions only)
```

The RLS functions (`has_continuation_fee_paid`, `legacy_contact_can_access`) are defined as `SECURITY DEFINER` so they run with elevated privileges and can check across tables.

### Concierge Staff Isolation

Concierge staff authenticate through a completely separate service (`conciergeStaff.ts`) that has no connection to Supabase Auth. In production:
- Concierge staff have separate user records in a `concierge_employees` table
- Their JWT tokens have a custom claim: `role: 'concierge'`
- RLS policies check this role AND verify the concierge is assigned to the requested client
- If a concierge tries to access a client they're not assigned to, RLS blocks the query

### Admin Portal Security

- Admin login is completely separate from user login
- Admin accounts require TOTP-based 2FA (mandatory, no exceptions)
- Admin sessions expire after 8 hours of inactivity
- All admin actions are written to the audit log with: acting user, action, target, timestamp, IP address
- The admin service role key (used for RLS bypass) exists only in Edge Function environment variables — never in client-side code

### Payment Security

- Stripe: PCI-DSS Level 1. FPD never handles raw card numbers — Stripe Elements tokenizes them client-side.
- Crypto: Payments go to processor custodial wallets, not raw private keys. FPD accesses funds through the processor API.
- Webhook validation: All Stripe and crypto webhooks are validated using HMAC signatures. Invalid signatures are rejected immediately.

---

## 25. Database Schema

> This table is illustrative (projected row counts, some names differ slightly from the actual SQL). For the authoritative, current schema, read `database/migrations/*.sql` directly — `001_initial_schema.sql` is the base schema; `002`–`004` are Milestone 3 additions (admin backend tables, email template seed data, admin roles) not yet applied to any project. See README [§32](README.md#32-database-schema) and [§38](README.md#38-admin-backend-api-milestone-3) for what each migration adds and the API built on top of it.

### Complete Table List

| Table | Rows estimate | Key purpose |
|---|---|---|
| `users` | 51,490 | Account holders |
| `subscription_plans` | 5 | Admin-configurable plan definitions |
| `legacy_continuation_fees` | ~9,600 | $199 fee payments and activation |
| `admin_settings` | ~20 | Key-value platform configuration |
| `vault_documents` | ~586,000 | Encrypted document records |
| `vault_folders` | ~980,000 | User-created and default folders |
| `contacts` | ~154,000 | All four contact types |
| `id_verifications` | ~38,000 | Government ID review queue |
| `affiliates` | ~15,140 | Affiliate enrollments |
| `affiliate_referrals` | ~28,800 | Per-referral tracking |
| `affiliate_payouts` | ~180,000 | Monthly payout records |
| `partner_organizations` | ~223 | WL/strategic partner accounts |
| `partner_referrals` | ~12,000 | Partner-referred accounts |
| `storage_usage` | ~618,000 | Monthly metered usage |
| `storage_alerts` | ~154,000 | Alert email log |
| `storage_overage_billing` | ~4,300 | Overage charge records |
| `diary_entries` | ~206,000 | Text/audio/video diary |
| `final_wishes` | ~103,000 | Estate instructions |
| `password_vault` | ~309,000 | Encrypted credentials |
| `subscriptions_tracked` | ~309,000 | User-documented recurring charges |
| `notifications` | ~515,000 | In-app notification log |
| `concierge_employees` | ~4 | WG staff accounts |
| `wg_clients` | ~3 | White Glove client records |
| `wg_sessions` | ~6 | Session logs |
| `wg_waivers` | ~3 | Authorization waiver records |

### Key Custom Functions

```sql
-- Returns true if this user's vault is unlocked for downloads
CREATE FUNCTION has_continuation_fee_paid(target_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM legacy_continuation_fees
    WHERE user_id = target_user_id
    AND status = 'paid'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Returns true if the current user is a verified legacy contact
-- AND the fee is paid AND admin has activated the vault
CREATE FUNCTION legacy_contact_can_access(vault_owner_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM contacts c
    JOIN legacy_continuation_fees lcf ON lcf.user_id = vault_owner_id
    WHERE c.owner_user_id = vault_owner_id
    AND c.contact_type = 'legacy'
    AND c.related_user_id = auth.uid()
    AND c.verification_status = 'verified'
    AND lcf.status = 'paid'
    AND lcf.activated_at IS NOT NULL
    AND (lcf.expires_at IS NULL OR lcf.expires_at > NOW())
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## 26. Stripe Integration

### Edge Function Templates

All three Edge Functions are in `src/app/services/stripe.ts` under `EDGE_FUNCTION_TEMPLATES`. Deploy them to Supabase:

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-payment-intent
supabase functions deploy stripe-webhook
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Idempotency

All Stripe API calls use idempotency keys to prevent duplicate charges if the request is retried:

```typescript
stripe.checkout.sessions.create(params, {
  idempotencyKey: `checkout_${userId}_${planId}_${Date.now()}`
});
```

### Webhook Security

All incoming webhooks are validated with HMAC:
```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,       // raw request body (must not be parsed as JSON first)
  signature,     // Stripe-Signature header
  webhookSecret  // from environment secrets
);
// If signature is invalid, throws WebhookSignatureVerificationError
```

---

## 27. Supabase Configuration

### Storage Buckets

| Bucket | Public | Access policy |
|---|---|---|
| `vault-documents` | No | User owns their files via RLS |
| `id-documents` | No | Admin service role only |
| `diary-media` | No | User owns their files via RLS |
| `profile-photos` | Yes | Authenticated write, public read |

### Realtime Subscriptions

Used for live notifications:
```typescript
supabase.channel('user_notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe();
```

---

## 28. PWA & Mobile Support

### What Makes FPD a PWA

- `manifest.json` with app name, icons, theme color, display mode (standalone)
- Service worker caches static assets (JS, CSS, fonts, logo)
- "Add to Home Screen" prompt triggers after 3+ visits
- Offline fallback page for when network is unavailable

### Why Mobile-First Matters

69.6% of FPD users access the platform on mobile (iOS 41.2%, Android 28.4%). The sidebar collapses to icon-only at mobile widths. Multi-column grids drop to single column. Modals go full-screen. Tables become horizontally scrollable. The Document Scanner is specifically designed for phone use — the camera and scan frame work better on a phone than a webcam.

### App Distribution

White label partners can distribute their branded FPD instance as:
- A standalone PWA (Add to Home Screen)
- An iOS app via Capacitor wrapper (submitted to App Store under partner's account)
- An Android app via Capacitor wrapper (submitted to Play Store)

---

*© 2026 Final Pass Down Inc. All rights reserved.*  
*My Life · My Wishes · My Way.*  

*For setup instructions, see `SETUP_GUIDE.md`. For the README overview, see `README.md`.*
