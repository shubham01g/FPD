import React, { useState, useRef, useEffect } from "react";
import {
  Send, X, Minimize2, Maximize2, Sparkles, RefreshCw, Plus, Info, ArrowUpRight,
  Compass, Users, DollarSign, Shield, Layers, Star,
  BookOpen, LayoutGrid, Zap, Clock, List,
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_mark_square.png";
import heroQAPhoto from "../../imports/ai_hero_qa.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard & calendar) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const PURPLE  = "#7E6BD8";
const GREEN   = "#6FAE8B";

/* Icon-chip tone → colour, identical map to the Dashboard's Chip / Calendar's
   KPI_TONES, so the stat cards read as the same component family. */
const KPI_TONES: Record<string, { bg: string; fg: string }> = {
  sky:    { bg: "linear-gradient(150deg, rgba(91,167,214,0.34), rgba(91,167,214,0.08))",  fg: "#9FD3EE" },
  mint:   { bg: "linear-gradient(150deg, rgba(111,174,139,0.34), rgba(111,174,139,0.08))", fg: "#A9DABC" },
  good:   { bg: "linear-gradient(150deg, rgba(95,190,145,0.30), rgba(95,190,145,0.09))",   fg: "#A9E6C4" },
  violet: { bg: "linear-gradient(150deg, rgba(126,107,216,0.34), rgba(126,107,216,0.08))",  fg: "#C9BFF0" },
};

interface Message { id: string; role: "user"|"agent"; text: string; time: string; }

/* ═══════════════════════════════════════════════════════════════════
   COMPREHENSIVE FPD KNOWLEDGE BASE
   Covers every feature, section, and workflow on the platform
═══════════════════════════════════════════════════════════════════ */
const KB: Record<string, string> = {

  // ── Navigation & Getting Started ─────────────────────────────────
  "navigate": `Here's a map of every section in Final Pass Down:\n\n**Vault & Files**\n• **Legacy Vault** — your encrypted master vault\n• **File Cabinet** — 18+ categorized folders for all documents\n• **Folders & Reminders** — custom folders and calendar reminders\n\n**Wishes & Legal**\n• **Final Wishes** — bequests, burial preferences, estate instructions\n• **Wills and Living Trusts** — legal documents with attorney details\n\n**Life Records**\n• Medical Info · Financial Records · Assets & Property · Utilities\n• Memories & Media · Pet Records · Digital Diary · Job History\n• ID Keeper · Warranties · Travel Planner · Favorite Places\n\n**Family Life**\n• Daycare Information · Kids' Activities\n\n**People / Contacts**\n• Legacy Contacts · Guardian Contacts · Emergency Contacts\n\n**Security**\n• Password Manager · Auto Pay & Subs · Activate Legacy Access\n\n**Billing & Earn**\n• Account & Profile · Usage & Billing · Affiliate Program · White Glove Service\n\n**Assistant**\n• Ask Carlos (that's me!)\n\nJust click any section in the left sidebar to get started.`,

  // ── File Cabinet ─────────────────────────────────────────────────
  "file cabinet": `The **Digital File Cabinet** is your organized document library with 18+ folders:\n\n⚖️ Legal Documents · 💰 Financial Records · 🏥 Medical Records\n📋 Tax Records · 🏠 Property & Real Estate · 🚗 Vehicles\n⚡ Utilities & Services · 🛡️ Insurance Policies · 🐾 Pet Records\n💌 Personal Letters · 📷 Photo Albums · 🎥 Video Messages\n💻 Digital Assets · ₿ Crypto & NFTs · 🔒 Firearms Registry\n⚔️ Weapons Locker · 🛡️ Warranties · 🔐 Secret Vault\n\n**To upload:** Open any folder → click Upload Files or drag & drop.\n**To scan:** Click the Scan button — uses your device camera.\n**Syncing from sidebar sections:** Many sidebar pages (Financial Records, Warranties, etc.) have a "Sync to File Cabinet" button to push records directly into the correct folder.\n\nAll files are AES-256 encrypted client-side before leaving your device.`,

  // ── Legacy Vault ─────────────────────────────────────────────────
  "legacy vault": `The **Legacy Vault** is your encrypted master vault — the centerpiece of your account.\n\n**What it contains:** All uploaded documents across every life category.\n\n**Access is locked until TWO conditions are met:**\n1. The **Activate Legacy Access Fee** is paid\n2. **Confirmation of passing** is verified by FPD administrators\n\n**Accepted confirmation documents:** death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record.\n\n**Legacy Vault Export:** Once both conditions are met, legacy contacts can download EVERYTHING — all 18+ folder categories, final wishes, medical records, financial records, digital diary, password manager contents, and more.\n\nTo set this up: Go to **Security → Activate Legacy Access** in the sidebar.`,

  // ── Legacy Continuation Fee ───────────────────────────────────────
  "199": `The **Activate Legacy Access Fee** is a one-time payment that unlocks your legacy contacts' ability to access and download your vault.\n\n**Why it exists:** Without it, your vault goes into archive mode after your subscription expires.\n\n**Two conditions required to unlock downloads:**\n1. ✅ $199 fee paid (by you or a legacy contact)\n2. ✅ Confirmation of passing verified by FPD admin\n\n**Payment options:** Card (Stripe) or cryptocurrency (BTC, ETH, USDC, USDT, SOL, BNB, XRP, LTC)\n\n**Who can pay:** You can pay now (anytime, even years before passing), or your legacy contact can pay after your passing.\n\n**Demo flow:** Go to **Security → Activate Legacy Access** → pay via the form → click "Simulate Admin Verification" to see the full unlocked state.\n\nThe fee is non-refundable once processed. Vault stays active for 24 months from the verified date of passing (admin-configurable).`,

  // ── Legacy Contacts ───────────────────────────────────────────────
  "legacy contact": `**Legacy Contacts** are the people who receive access to your complete vault after your verified passing.\n\n**Chain of Authority:**\n• Legacy Contact #1 = PRIMARY — notified first, has full control\n• Legacy Contact #2 = CONTINGENT — activates only if #1 is unable/deceased\n• Legacy Contact #3+ = further backups in order\n\n**Verification required:** Each legacy contact must submit a government-issued photo ID (driver's license, passport, or state ID). FPD compliance reviews within 1–2 business days.\n\n**ID Verification workflow (right on the contact card):**\n1. Send Verification Invite → contact receives email\n2. Simulate ID Submission → status changes to "ID Submitted"\n3. Simulate Verify → compliance marks as Verified ✅\n\n**Custom verification requirements:** When adding a legacy contact, you can require additional verification beyond the death certificate: security word, Q&A, notarized affidavit, attorney certification, hospital record, or obituary.\n\nTo add: Go to **People → Legacy Contacts** in the sidebar.`,

  // ── Guardian Contacts ─────────────────────────────────────────────
  "guardian contact": `**Guardian Contacts** have VIEW-ONLY access to assigned folders RIGHT NOW — no death required.\n\n**Perfect for:**\n• A spouse who may need to act if you're incapacitated\n• A trusted attorney who needs to see legal docs now\n• An adult child you want to keep informed\n\n**Key rules:**\n• Cannot download files — view only, always\n• You assign which specific folders they can see\n• Access is live immediately after they're added and verified\n\nTo add: Go to **People → Guardian Contacts** → click "Add Guardian Contact" → assign specific folders using the folder picker.`,

  // ── Emergency Contacts ────────────────────────────────────────────
  "emergency contact": `**Emergency Contacts** are people notified by first responders in an emergency. They have NO vault access — purely informational.\n\nTo add: Go to **People → Emergency Contacts** in the sidebar.\n\nYou can store their name, phone, email, and relationship. This information appears on your profile for emergency services.`,

  // ── Final Wishes ──────────────────────────────────────────────────
  "final wishes": `The **Final Wishes** section has 2 tabs:\n\n1. **Family Wishes** — specific bequests (who gets what item/asset), written instructions to family\n2. **Funeral Planning** — service type, location, music, readings, flowers, special requests, obituary draft\n\nTo access: **Wishes & Trusts → Final Wishes** in the sidebar.`,

  // ── Wills and Living Trusts ───────────────────────────────────────
  "wills": `The **Wills and Living Trusts** section stores all your legal documents executed with an attorney:\n\n**Document types:** Last Will & Testament, Living Will / Advance Directive, Durable Power of Attorney, Healthcare Power of Attorney, Revocable Living Trust, Irrevocable Trust, and more.\n\n**Each record includes:** Attorney name, date executed, last reviewed date, document location, and status (Current/Outdated).\n\n**Actions:** View in Vault, Update Record, Scan & Upload a copy, Sync to File Cabinet → Legal Documents.\n\nTo access: **Wishes & Trusts → Wills and Living Trusts** in the sidebar.`,

  // ── Medical Info ──────────────────────────────────────────────────
  "medical": `The **Medical Info** section covers everything emergency responders and family need to know:\n\n**Emergency Tab:** Blood type, allergies (with severity), active conditions, DNR status, organ donor preference, advance directive status, primary physician, preferred hospital, insurance card (sync to File Cabinet).\n\n**Allergies Tab:** Add allergies with severity (Mild/Moderate/Severe/Anaphylactic), symptoms, and medication.\n\n**Medications Tab:** Current prescriptions with prescriber, dosage, refill info, and pharmacy.\n\nTo access: **Life Records → Medical Info** in the sidebar.`,

  // ── Financial Records ─────────────────────────────────────────────
  "financial": `The **Financial Records** section has 6 tabs:\n\n💼 **Insurance** — Life, homeowner's, auto, umbrella policies with carrier, policy #, coverage, beneficiary\n🏠 **Real Estate** — Properties with value, mortgage, title holder, deed info\n📈 **Investments** — Brokerage, Roth IRA, mutual funds with institution, holdings, beneficiary\n💰 **Retirement** — 401(k), IRA, pension, Social Security with balance and beneficiary\n📋 **Tax Records** — Annual filings with preparer, result, document location\n📊 **Business** — Business entities with EIN, bank, revenue, accountant\n\nAll records have a **Sync to File Cabinet** button to push documents to the appropriate folder.\n\nTo access: **Life Records → Financial Records** in the sidebar.`,

  // ── Personal Assets ───────────────────────────────────────────────
  "assets": `The **Personal Assets** section has 6 tabs:\n\n🚗 **Vehicles** — Make, model, VIN, title, insurance, registration, estimated value, photo\n🏠 **Real Estate** — Properties with photo, mortgage, deed, sq ft, bed/bath, lot size\n💻 **Digital Assets** — Crypto, social media, domains, online accounts with access method\n🔒 **Firearms** — Make, model, serial, DOJ registration, storage, transfer instructions, photo\n⚔️ **Weapons Locker** — Non-firearm bladed weapons (knives, swords, etc.) with photo\n💎 **Collectibles** — Sports cards, watches, art, jewelry with photo, condition, estimated value, intended recipient\n\nUtility accounts (electricity, water, internet, etc.) live in their own **Life Records → Utilities** section.\n\nTo access: **Life Records → Assets & Property** in the sidebar.`,

  // ── Utilities ─────────────────────────────────────────────────────
  "utilities": `The **Utilities** section tracks household service accounts:\n\n**Each account:** Service type (Electricity, Gas, Internet, Water/Sewer, Trash, HOA, etc.), provider, account number, phone, website, autopay status, and monthly average cost.\n\nTo access: **Life Records → Utilities** in the sidebar.`,

  // ── Warranties ────────────────────────────────────────────────────
  "warranties": `The **Warranties** section tracks product warranties so nothing expires unnoticed:\n\n**Status badges:** ACTIVE (green) · EXPIRING IN Xd (amber, < 90 days) · EXPIRED (red) · LIFETIME (green)\n\n**Each warranty includes:** Product photo, brand, model, serial #, purchase details, warranty type, provider contact, expiry date, what's covered, how to file a claim, notes, documents.\n\n**Sync to File Cabinet:** Pushes warranty records to the Warranties folder in the File Cabinet.\n\n**Add a warranty:** Click "Add Warranty" → fill in all details including an optional product photo → the card appears immediately.\n\nTo access: **Life Records → Warranties** in the sidebar.`,

  // ── ID Keeper ─────────────────────────────────────────────────────
  "id keeper": `The **ID Keeper** securely stores all identification documents:\n\n**Categories:** Government ID · Insurance · Professional · Military\n\n**Supports 18 ID types:** Driver's License, Passport, Social Security Card, Birth Certificate, Military ID, Medicare Card, Health/Dental/Vision Insurance Cards, Work ID, Student ID, Global Entry/TSA PreCheck, Green Card, Voter Registration, Professional License, and more.\n\n**Each ID card:** Shows masked ID number (eye icon to reveal), issue/expiry dates, issuing authority, expiry warning badges, and scan/upload button.\n\n**Add an ID:** Click "Add ID" → scan with camera or upload a photo → fill in details → appears immediately with masked number.\n\nTo access: **Life Records → ID Keeper** in the sidebar.`,

  // ── Job History ───────────────────────────────────────────────────
  "job": `The **Job History** section keeps a complete employment record:\n\n**Each job entry includes:** Employer, job title, employment type (Full-time/Part-time/Contract/Freelance/etc.), location, start/end dates, salary, supervisor name & phone, reason for leaving, key achievements, notes, and linked documents (W-2s, offer letters).\n\n**Adding a job:** Click "Add Position" → fill all fields → check "This is my current position" for active roles → record appears in the timeline.\n\nTo access: **Life Records → Job History** in the sidebar.`,

  // ── Travel Planner ────────────────────────────────────────────────
  "travel": `The **Travel Planner** logs every trip — past and future:\n\n**Each trip:** Cover photo, destination, country, trip type, dates, travel companions, accommodation with confirmation #, transportation details, budget vs actual cost, highlights & memories, notes, and attached documents (tickets, itinerary, passport copies).\n\n**Status:** Planned (blue) · Completed (green) · Cancelled (red)\n\n**Stats dashboard:** Total trips, completed, planned, countries visited.\n\nTo access: **Life Records → Travel Planner** in the sidebar.`,

  // ── Favorite Places ───────────────────────────────────────────────
  "favorite places": `The **Favorite Places** section is your personal location memory book:\n\n**Categories:** Restaurant, Coffee Shop, Park/Nature, Beach, Museum/Art, Entertainment, Shopping, Medical, Gym, Religious, Hotel/Resort, Vacation Spot, Family Home, and more.\n\n**Each place:** Category emoji, place name, address, phone, website, your favorite item there, WHY it's special (personal memory), visit frequency, tags, and a photo.\n\n**Star rating:** 1–5 stars set during creation.\n\nTo access: **Life Records → Favorite Places** in the sidebar.`,

  // ── Daycare ───────────────────────────────────────────────────────
  "daycare": `The **Daycare Information** section stores complete childcare records for each child:\n\n**Three sub-tabs per record:**\n• **Facility Info** — director, teacher, hours, tuition, autopay, emergency contact, address\n• **Authorized Pickups** — list of people allowed to pick up the child with ID status\n• **Documents** — enrollment agreement, immunization records, forms\n\n**Key fields:** Drop-off time, pickup time, days attended, allergies on file with EpiPen info, special notes.\n\nTo access: **Family Life → Daycare Information** in the sidebar.`,

  // ── Kids Activities ───────────────────────────────────────────────
  "kids": `The **Kids' Activities** section tracks every activity for every child:\n\n**Each activity:** Type (Soccer, Dance, Swimming, Piano, etc.), child's name, organization/team, coach/instructor with phone, schedule, season dates, cost, payment due date, uniform/equipment needed, **Transportation & Pickup Notes** (who drives, carpool), emergency contact, and documents.\n\n**Filter by child** using the buttons at the top.\n\nTo access: **Family Life → Kids' Activities** in the sidebar.`,

  // ── Memories ─────────────────────────────────────────────────────
  "memories": `The **Family & Memories** section has 6 tabs:\n\n📷 **Memories** — Photo and video memories with date, description, tags\n🎥 **Video Messages** — Private messages to specific recipients, delivered after passing\n❤️ **Kids & Family** — Children's info, school, activities, notes\n⭐ **Keepsakes** — Sentimental items with story, location, intended recipient\n🎯 **Goals** — Life goals with progress bars\n🏆 **Awards** — Achievements, military service, professional recognition\n\nPet records live in their own **Life Records → Pet Records** section — see "pet records" for details.\n\nTo access: **Life Records → Family & Memories** in the sidebar.`,

  // ── Pet Records ───────────────────────────────────────────────────
  "pet": `**Pet Records** is its own section under Life Records, with a form that matches the official app design exactly:\n\n**8 sections:**\n1. Upload Images/Videos (up to 10)\n2. Emergency Pet Caretaker (Name + Phone, add multiple)\n3. Long Term Pet Provider (Name + Phone, add multiple)\n4. Special Care Instruction (Name + Phone + Description, add multiple)\n5. About Your Beloved Pet (Name, Date of Birth, Gender, Breed, Colour, Upload Documents)\n6. Health Info (Medical History, Vaccination Type + Date pairs, add multiple)\n7. Vet Info (Name, Phone, Email)\n8. Feeding (Food Type, Time of Day, Quantity, Location of Food, add multiple)\n\nTo add a pet: **Life Records → Pet Records → Add Pet Record**`,

  // ── Digital Diary ─────────────────────────────────────────────────
  "diary": `The **Digital Diary** lets you record text, audio, and video journal entries:\n\n**Entry types:** Written · Audio Recording · Video Recording\n\n**Privacy levels:** Private (only you), Legacy Contacts Only, or visible to all contacts\n\n**Mood tags, dates, and search** are all supported.\n\n**Recording:** Click Open Camera/Microphone — browser asks for permission. Videos are encrypted.\n\nTo access: **Life Records → Digital Diary** in the sidebar.`,

  // ── Password Manager ──────────────────────────────────────────────
  "password": `The **Password Manager** stores all your account credentials securely:\n\n**Each entry:** Service name, username/email, password (masked with show/hide), URL, notes, strength indicator, copy-to-clipboard button.\n\n**Security:** All passwords encrypted with AES-256. Zero-knowledge — FPD cannot read them.\n\n**Add credentials:** Click "Add Password" → fill in details → appears immediately.\n\nTo access: **Security → Password Manager** in the sidebar.`,

  // ── White Glove ───────────────────────────────────────────────────
  "white glove": `The **White Glove Concierge Service** provides hands-on help from a dedicated specialist:\n\n**How it works:**\n1. You submit a request (name + phone)\n2. A specialist calls you within 1 business day\n3. They handle everything over the phone — uploading docs, setting up contacts, recording wishes\n\n**Pricing:**\n• $99 one-time setup fee\n• $25 per 30-minute session block (any time used = full block)\n\n**Typical total:** $199–$249\n\n**Document Exchange:** Your specialist sends a secure upload link → you photograph documents on your phone → specialist receives them instantly and saves to your vault.\n\n**Video or Phone Sessions:** When your session starts, choose between a live video call (see each other on camera) or a traditional phone call.\n\nTo request: **Concierge → White Glove Service** in the sidebar.`,

  // ── Affiliate Program ─────────────────────────────────────────────
  "affiliate": `The **Affiliate Program** lets you earn recurring commissions for referrals:\n\n| Tier | Referrals | Commission | Duration |\n|------|-----------|------------|----------|\n| Tier 1 | 5–24 | 20% | 12 months |\n| Tier 2 | 25–74 | 25% | 12 months |\n| Tier 3 | 75+ | 30% | 12 months |\n\n**Your referral link** is in your Affiliate dashboard. Share it — when someone signs up, you earn 20–30% of their monthly fee for 12 months.\n\nTo access: **Earn → Affiliate Program** in the sidebar.`,

  // ── Plans & Pricing ───────────────────────────────────────────────
  "plans": `**Final Pass Down Subscription Plans:**\n\n| Plan | Monthly | Storage | Contacts | Overage |\n|------|---------|---------|----------|---------|\n| Starter | $1.99 | 1 GB | 1 each | $0.50/GB |\n| Foundation | $9.99 | 50 GB | 3 each | $0.40/GB |\n| Legacy Archive | $24.99 | 250 GB | Unlimited | $0.40/GB |\n| Legacy Pro | $49.99 | 500 GB | Unlimited | $0.40/GB |\n| Legacy Vault | $129.99 | 1 TB | Unlimited | $0.40/GB |\n\n**All plans include:** Every platform feature. Storage meters monthly — unused storage doesn't carry forward.\n\n**To upgrade:** Go to **Storage & Billing → Usage & Billing** and choose a plan via card or crypto.\n\n**Crypto accepted:** BTC · ETH · USDC · USDT · SOL · BNB · XRP · LTC`,

  // ── 2FA & Security ────────────────────────────────────────────────
  "2fa": `**Two-Factor Authentication (2FA) options:**\n\n1. **SMS** — 6-digit code texted to your phone\n2. **Email OTP** — 6-digit code emailed to you (recommended)\n3. **Authenticator App** — Google Authenticator or Authy (most secure)\n\n**To enable:**\n1. Go to **Security → Account & Profile**\n2. Click the Security & 2FA tab\n3. Choose your preferred method\n4. Follow the setup steps\n5. Enter any 6-digit code in demo mode to confirm\n\n**Encryption:** All files use AES-256-GCM client-side encryption. Key derived with PBKDF2 (100,000 iterations). Zero-knowledge — FPD cannot read your files.`,

  // ── Storage ───────────────────────────────────────────────────────
  "storage": `**Storage & Billing:**\n\nYour storage allowance resets each billing cycle. Unused GB expire — they don't carry forward.\n\n**Alert emails sent at:** 80% · 90% · 95% · 100% (overage begins)\n\n**Overage rates:** Starter $0.50/GB · All other plans $0.40/GB\n\n**Upgrade options:** Card via Stripe or any of 8 cryptocurrencies\n\n**View your usage:** Go to **Storage & Billing → Usage & Billing** — shows breakdown by category (Legal, Financial, Media, etc.) and 6-month history chart.\n\n**Pro tip:** Delete old drafts and duplicate uploads to free space. Video messages use the most storage.`,

  // ── Document Scanner ──────────────────────────────────────────────
  "scan": `The **Document Scanner** is available at every upload point across the platform:\n\n**How to use:**\n1. Click any "Scan" button\n2. Your camera opens with a scan frame overlay\n3. Capture the document\n4. Choose scan mode: Color / Grayscale / B&W / Document\n5. Name the document and choose the folder\n6. Uploads encrypted automatically\n\n**Available in:** File Cabinet (every folder), Legacy Vault, Digital Diary, ID Keeper, Password Manager, Subscription Manager, Pet Records, Daycare, Kids' Activities, and more.\n\n**Camera denied?** A file picker opens automatically as a fallback.`,

  // ── Sync to File Cabinet ──────────────────────────────────────────
  "sync": `The **Sync to File Cabinet** feature lets you push documents from any sidebar section directly into the correct File Cabinet folder:\n\n**Where you'll find it:** On every record in Financial Records, Medical Info, Personal Assets, Wills and Living Trusts, Warranties, Weapons Locker, Collectibles, and more.\n\n**How it works:**\n1. Click "Sync to File Cabinet" on any record\n2. A dropdown shows the relevant folders for that section\n3. Pick the folder — the document appears immediately in the File Cabinet\n4. A blue "🔗 [Section Name]" badge shows where it came from\n\n**Pre-synced examples** are already in the File Cabinet so you can see how it looks.`,

  // ── Family & Friends ──────────────────────────────────────────────
  "family friends": `The **Family & Friends** section is your personal contact book:\n\n**Contact groups:** Create named groups (e.g. "Immediate Family", "Work Colleagues") with colors and descriptions.\n\n**Add All button:** Instantly selects every contact for a new group.\n\n**Email Blast (BCC):** Click "Blast Email" on any group → compose subject + message → all members with email are BCC'd. Each person sees only themselves.\n\n**Contacts:** Name, email, phone, relationship, birthday — you can add as many as you want.\n\nTo access: **People → Family & Friends** in the sidebar.`,

  // ── Account Settings ──────────────────────────────────────────────
  "account": `**Account Settings** has 4 tabs:\n\n👤 **Profile** — Upload profile photo, edit name, email, phone\n🔐 **Security & 2FA** — Enable SMS/Email OTP/Authenticator 2FA, change password\n🔒 **Encryption** — View AES-256 encryption status (always on, zero-knowledge)\n🔔 **Notifications** — Toggle Email, SMS, Push, Storage Alerts, Contact Updates, Marketing\n\nTo access: **Billing & Earn → Account & Profile** in the sidebar.`,

  // ── Confirmation of Passing ───────────────────────────────────────
  "confirmation of passing": `**Confirmation of Passing** — what FPD needs to activate legacy access:\n\nAccepted documents include:\n• Death certificates\n• Obituaries from recognized publications\n• Hospital or hospice records\n• Coroner reports\n• Funeral home letters\n• Probate filings\n• Any credible official record\n\n**Process:** Legacy contact submits documentation → FPD admin reviews → admin verifies → admin clicks "Activate" → vault opens for all verified legacy contacts.\n\n**Important:** Verification and admin approval are required, with a follow-up confirmation of death once received. The $199 fee must ALSO be paid — paying the fee alone does not unlock access.`,

  // ── Default / Help ────────────────────────────────────────────────
  "default": `I'm **Carlos** — fully trained on every feature of Final Pass Down.\n\nI can help you with:\n\n📁 **Navigating the platform** — where to find any section\n👥 **Contacts & permissions** — Legacy, Guardian, Emergency contacts\n💰 **The Activate Legacy Access Fee** — how it works, how to pay\n📋 **Documents & files** — uploading, organizing, syncing\n🛡️ **Security** — 2FA, encryption, password manager\n⭐ **White Glove Service** — hands-on concierge help\n📊 **Plans & storage** — pricing, overage, upgrades\n🎯 **Any specific feature** — just ask!\n\nType your question or tap a suggestion below.`,
};

/* ── Match query to knowledge base ─────────────────────────────── */
function getResponse(query: string): string {
  const q = query.toLowerCase();

  // Navigation
  if (q.match(/navigate|where is|where do i|how do i find|menu|sidebar|sections|overview|map/)) return KB["navigate"];

  // File Cabinet
  if (q.match(/file cabinet|cabinet|folder|folders|18 folder|document folder/)) return KB["file cabinet"];

  // Legacy Vault
  if (q.match(/legacy vault|vault\b|unlock vault|vault clone|download everything/)) return KB["legacy vault"];

  // $199 Fee
  if (q.match(/\$?199|continuation fee|fee|unlock download|locked vault|pay.*death|death.*pay/)) return KB["199"];

  // Legacy Contacts
  if (q.match(/legacy contact|primary contact|contingent|chain of authority|who gets vault|vault access/)) return KB["legacy contact"];

  // Guardian
  if (q.match(/guardian contact|guardian|view.?only|incapacitated|folder access/)) return KB["guardian contact"];

  // Emergency
  if (q.match(/emergency contact|first responder|emergency/)) return KB["emergency contact"];

  // Final Wishes / Funeral
  if (q.match(/final wish|funeral|burial|bequest|estate instruction|obituary/)) return KB["final wishes"];

  // Wills
  if (q.match(/will\b|wills|trust|living trust|power of attorney|advance directive/)) return KB["wills"];

  // Medical
  if (q.match(/medical|allergy|allergies|medication|blood type|dnr|organ donor|doctor|physician/)) return KB["medical"];

  // Financial
  if (q.match(/financial|insurance|real estate|investment|retirement|401k|ira|tax|business record/)) return KB["financial"];

  // Utilities
  if (q.match(/utilit|electric bill|gas bill|water bill|internet bill|hoa/)) return KB["utilities"];

  // Personal Assets
  if (q.match(/asset|vehicle|car|truck|suv|digital asset|firearm|gun|weapon|collectible|real estate|property/)) return KB["assets"];

  // Warranties
  if (q.match(/warrant|product.*cover|cover.*product|expir.*warrant|warrant.*expir/)) return KB["warranties"];

  // ID Keeper
  if (q.match(/id keeper|id card|identification|passport|driver.*licen|licens.*driver|social security|medicare|insurance card/)) return KB["id keeper"];

  // Job History
  if (q.match(/job|employment|career|employer|work history|salary|supervisor/)) return KB["job"];

  // Travel
  if (q.match(/travel|trip|vacation|destination|hotel|flight|passport.*travel/)) return KB["travel"];

  // Favorite Places
  if (q.match(/favorite place|restaurant|coffee|park|location|place i love/)) return KB["favorite places"];

  // Daycare
  if (q.match(/daycare|day care|childcare|child care|pickup|drop.?off|caretaker|provider/)) return KB["daycare"];

  // Kids Activities
  if (q.match(/kids? activit|children.*sport|sport.*children|soccer|dance|swim|piano|coach|activity/)) return KB["kids"];

  // Memories / Family Memories
  if (q.match(/memor|keepsake|video message|goal|award|achievement|bucket list/)) return KB["memories"];

  // Pet Records
  if (q.match(/pet|dog|cat|biscuit|animal|vet|vaccination|feeding|pet record|pet caretaker/)) return KB["pet"];

  // Digital Diary
  if (q.match(/diary|journal|audio|voice.*record|private.*entry|entry.*private/)) return KB["diary"];

  // Password Manager
  if (q.match(/password|credential|login.*store|store.*login|username/)) return KB["password"];

  // White Glove
  if (q.match(/white glove|concierge|specialist|helping me|not tech|someone.*help|help me.*upload/)) return KB["white glove"];

  // Affiliate
  if (q.match(/affiliat|earn|referral|commission|refer/)) return KB["affiliate"];

  // Plans & Pricing
  if (q.match(/plan|price|pricing|subscription|cost|starter|foundation|legacy archive|legacy pro|legacy vault plan|upgrade plan/)) return KB["plans"];

  // 2FA / Security / Encryption
  if (q.match(/2fa|two.?factor|authenticator|otp|sms.*code|encryption|aes|zero.?knowledge|security setting/)) return KB["2fa"];

  // Storage
  if (q.match(/storage|gb|overage|billing|metering|usage|allowance|space/)) return KB["storage"];

  // Scanner
  if (q.match(/scan|camera.*scan|scan.*camera|photograph.*doc|doc.*photograph/)) return KB["scan"];

  // Sync
  if (q.match(/sync|sync.*cabinet|cabinet.*sync|push.*file|file.*push/)) return KB["sync"];

  // Family & Friends
  if (q.match(/family.?friend|contact book|group.*email|email.*group|blast email|bcc/)) return KB["family friends"];

  // Account Settings
  if (q.match(/account setting|profile|notification|my account|edit.*name|change.*email/)) return KB["account"];

  // Confirmation of Passing
  if (q.match(/confirm.*pass|pass.*confirm|death cert|death certif|obituar|coroner|funeral home|probate/)) return KB["confirmation of passing"];

  // Greetings
  if (q.match(/^(hi|hello|hey|howdy|good morning|good afternoon|start|help me|help\b|what can you|what do you)/)) return KB["default"];

  // Fallback — still helpful
  return `I'm not sure I have a specific answer for "${query}", but I'm trained on every FPD feature.\n\nTry asking me about:\n• A specific section (e.g. "How does the File Cabinet work?")\n• A feature (e.g. "How do I set up White Glove?")\n• Contacts and permissions\n• Plans and storage\n• The Activate Legacy Access Fee\n\nOr contact support at **support@finalpassdown.com** for account-specific help.`;
}

/* ── Suggestion chips ───────────────────────────────────────────── */
const SUGGESTIONS = [
  "How do I navigate the platform?",
  "What is a Legacy Contact?",
  "How does the $199 fee work?",
  "What happens to my vault after I pass?",
  "How does White Glove work?",
  "What's the difference between plans?",
  "How do I set up 2FA?",
  "How does Sync to File Cabinet work?",
  "What is the Weapons Locker?",
  "How do Pet Records work?",
];

/* ── Page-mode side rail: popular questions (each fires the matcher) ─── */
type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
const POPULAR: { q: string; Icon: IconCmp; tone: string }[] = [
  { q: "How do I navigate the platform?",        Icon: Compass,    tone: "sky"    },
  { q: "What is a Legacy Contact?",              Icon: Users,      tone: "violet" },
  { q: "How does the $199 fee work?",            Icon: DollarSign, tone: "mint"   },
  { q: "How do I set up 2FA?",                   Icon: Shield,     tone: "good"   },
  { q: "What's the difference between plans?",   Icon: Layers,     tone: "sky"    },
  { q: "How does White Glove work?",             Icon: Star,       tone: "violet" },
];

/* ── Page-mode KPI band (mirrors the Dashboard / Calendar stat cards) ── */
const STATS: { label: string; value: string; sub: string; Icon: IconCmp; tone: string; dot: string }[] = [
  { label: "Topics Covered",    value: "35+",  sub: "Every feature & workflow", Icon: BookOpen,   tone: "violet", dot: PURPLE  },
  { label: "Platform Sections", value: "30+",  sub: "Fully mapped",             Icon: LayoutGrid, tone: "sky",    dot: ACCENT2 },
  { label: "Response Time",     value: "<1s",  sub: "Instant answers",          Icon: Zap,        tone: "mint",   dot: GREEN   },
  { label: "Availability",      value: "24/7", sub: "Always on",                Icon: Clock,      tone: "good",   dot: POS     },
];

/* ── Markdown renderer — styled through the scoped .fpd-ai classes ───
   The knowledge base is authored with decorative emoji + markdown. To keep the
   assistant reading as one professional product with the rest of the portal,
   the renderer (presentation only — KB text is never mutated) strips the
   emoji and re-expresses each line in the design system's vocabulary:
   mono section eyebrows, accent-marker feature rows, and clean body copy. */
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️]/gu;
const stripEmoji = (s: string) => s.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();

/** Strip emoji, then render **bold** spans inside a line of copy. */
function renderInline(raw: string): React.ReactNode {
  const parts = stripEmoji(raw).split(/\*\*([^*]+)\*\*/g);
  return parts.map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p));
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    // Table rows
    if (line.startsWith("| ")) {
      if (line.includes("---")) return null;
      const cells = line.split("|").filter(c => c.trim());
      return (
        <div key={i} className="md-tr">
          {cells.map((cell,j) => (
            <span key={j} style={{ color: j===0 ? TEXT : MUTED, fontWeight: j===0 ? 600 : 400 }}>
              {stripEmoji(cell.trim().replace(/\*\*/g,""))}
            </span>
          ))}
        </div>
      );
    }

    // Feature rows:  <emoji> **Term** — description
    const feat = line.match(/^\s*[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️]+\s*\*\*(.+?)\*\*\s*[—–:-]?\s*(.*)$/u);
    if (feat) {
      const term = stripEmoji(feat[1]);
      const rest = stripEmoji(feat[2]);
      return (
        <div key={i} className="md-feat">
          <span className="fdot" />
          <span className="ftext">
            <span className="fterm">{term}</span>
            {rest ? <span className="fdesc"> — {rest}</span> : null}
          </span>
        </div>
      );
    }

    // Bullets
    if (line.startsWith("• ") || line.startsWith("* ")) {
      return <div key={i} className="md-li"><span className="b" />{<span>{renderInline(line.slice(2))}</span>}</div>;
    }

    // Section eyebrow:  a line that is only **Bold**
    const head = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (head) return <div key={i} className="md-eyebrow">{stripEmoji(head[1])}</div>;

    // Blank lines collapse into spacing handled by the flex gap
    if (line.trim() === "") return null;

    // Body copy
    return <p key={i} className="md-p">{renderInline(line)}</p>;
  }).filter(Boolean);
}

function TypingIndicator() {
  return (
    <div className="typing">
      {[0,1,2].map(i => <span key={i} className="dot" style={{ animationDelay:`${i*0.18}s` }} />)}
    </div>
  );
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-ai so nothing else in the app is affected. */
const AI_CSS = `
.fpd-ai *{box-sizing:border-box;}
.fpd-ai.page{position:relative;min-height:100%;padding:22px;box-sizing:border-box;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-ai .grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}

/* launcher circle */
.fpd-ai-launch{position:fixed;bottom:96px;right:24px;z-index:50;display:inline-flex;align-items:center;justify-content:center;width:58px;height:58px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;cursor:pointer;box-shadow:0 14px 34px -12px rgba(91,110,225,0.8),inset 0 1px 0 rgba(255,255,255,0.08);transition:transform .18s,filter .18s;}
.fpd-ai-launch:hover{transform:translateY(-2px);filter:brightness(1.06);}

/* panel shell */
.fpd-ai .panel{position:relative;z-index:1;display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 24px 60px -24px rgba(0,0,0,0.85);}
.fpd-ai .panel.floating{position:fixed;bottom:96px;right:24px;z-index:50;width:400px;max-width:calc(100vw - 32px);max-height:calc(100vh - 116px);border-radius:16px;}
@media (max-width:430px){
  .fpd-ai .panel.floating{right:16px;left:16px;bottom:84px;width:auto;max-width:none;max-height:calc(100vh - 104px);}
  .fpd-ai-launch{right:16px;bottom:80px;width:50px;height:50px;}
}

/* header */
.fpd-ai .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;flex-shrink:0;background:linear-gradient(120deg,#111A2C 0%,#0B1220 60%,#0C1322 100%);border-bottom:1px solid rgba(91,110,225,0.16);}
.fpd-ai .hd-l{display:flex;align-items:center;gap:11px;min-width:0;}
.fpd-ai .hd-logo{width:34px;height:34px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.12);border:1px solid rgba(91,110,225,0.3);box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);}
.fpd-ai .hd-logo img{width:22px;height:22px;border-radius:5px;object-fit:contain;}
.fpd-ai .hd-eyebrow{font-size:11px;font-weight:600;color:${MUTED};}
.fpd-ai .hd-title{font-family:var(--font-display);font-size:17.5px;font-weight:600;color:${TEXT};letter-spacing:-0.01em;line-height:1.1;margin-top:2px;}
.fpd-ai .hd-status{display:flex;align-items:center;gap:6px;margin-top:4px;}
.fpd-ai .hd-status .d{width:6px;height:6px;border-radius:50%;background:${POS};box-shadow:0 0 8px ${POS};animation:fpd-ai-pulse 2.2s ease-in-out infinite;}
.fpd-ai .hd-status span{font-family:var(--font-mono);font-size:12px;color:${MUTED};letter-spacing:0.02em;}
.fpd-ai .hd-r{display:flex;align-items:center;gap:5px;flex-shrink:0;}
.fpd-ai .icon-btn{width:28px;height:28px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:${MUTED};cursor:pointer;transition:color .18s,border-color .18s,background .18s;}
.fpd-ai .icon-btn:hover{color:#FFFFFF;border-color:rgba(91,110,225,0.4);background:rgba(91,110,225,0.08);}

/* ── Page chrome (mirrors the Dashboard / Calendar layout) ── */
.fpd-ai .wrap{max-width:1320px;margin:0 auto;display:flex;flex-direction:column;gap:16px;position:relative;z-index:1;}
.fpd-ai .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;flex-shrink:0;}
.fpd-ai .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-ai .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-ai .pg-sub{color:${MUTED};font-size:16px;max-width:680px;line-height:1.6;}
.fpd-ai .head-r{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-ai .btn-new{display:inline-flex;align-items:center;gap:7px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s,transform .18s;}
.fpd-ai .btn-new:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-ai .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-ai .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-ai .hbanner:hover .art{transform:scale(1.08);}
.fpd-ai .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-ai .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-ai .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-ai .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-ai .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${GREEN});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-ai .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-ai .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-ai .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-ai .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-ai .hbanner .hbtn.primary{background:linear-gradient(180deg,${PURPLE},#5B6EE1);color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-ai .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-ai .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-ai .hbanner{min-height:auto;} .fpd-ai .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-ai .hbanner h1{font-size:29px;}}

/* page cards */
.fpd-ai .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-ai .card.pad{padding:20px;}
.fpd-ai .sec-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
.fpd-ai .sec-title{font-size:17.5px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-ai .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},#5B6EE1);}

/* KPI band — individual chip cards, same kpi-mini pattern as the Dashboard
   and Calendar (flat card, Chip-style icon, hover lift), replacing the old
   4-column bordered ledger so all three pages share one stat-card language. */
.fpd-ai .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;flex-shrink:0;}
.fpd-ai .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-ai .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-ai .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-ai .kpi-mini-txt{flex:1;min-width:0;}
.fpd-ai .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-ai .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-ai .kpi-mini-sub{font-size:14px;color:${SOFT};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-ai .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}

/* AI hero — the same themed-hero component as the Calendar's real cal-hero
   (gradient glow pair, grid overlay, watermark mark, eyebrow/heading/
   subtitle/action-pair, "next up"-style real-content row), carrying AI
   Assistant content instead of a calendar day. */

/* bento */
.fpd-ai .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:16px;align-items:start;}
.fpd-ai .col{display:flex;flex-direction:column;gap:16px;min-width:0;}

/* chat card (page mode) */
.fpd-ai .chatcard{display:flex;flex-direction:column;height:620px;overflow:hidden;}
.fpd-ai .chat-hd{display:flex;align-items:center;justify-content:space-between;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.fpd-ai .chat-status{display:flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:12.5px;color:${MUTED};}
.fpd-ai .chat-status .d{width:6px;height:6px;border-radius:50%;background:${POS};box-shadow:0 0 8px ${POS};animation:fpd-ai-pulse 2.2s ease-in-out infinite;}

/* topic rows — same Quick Actions pattern as the Dashboard: flat row, Chip
   icon, hover background + indent, instead of a bordered pill row. */
.fpd-ai .qrow{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:11px 9px;border-radius:14px;background:none;border:none;cursor:pointer;font-family:var(--font-body);color:inherit;transition:background .15s,padding-left .15s;}
.fpd-ai .qrow:hover{background:#101728;padding-left:11px;}
.fpd-ai .qrow .qico{width:32px;height:32px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);}
.fpd-ai .qrow .qtxt{flex:1;font-size:15.5px;color:${SOFT};font-weight:500;line-height:1.4;}
.fpd-ai .qrow .qarr{color:${FAINT};flex-shrink:0;transition:color .15s,transform .15s;}
.fpd-ai .qrow:hover .qarr{color:#6FAE8B;transform:translateX(2px);}

/* footnote */
.fpd-ai .foot{display:flex;align-items:flex-start;gap:12px;padding:15px 18px;border-radius:16px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.16);}
.fpd-ai .foot .ft{color:${MUTED};font-size:15px;line-height:1.7;}
.fpd-ai .foot .ft b{color:${SOFT};font-weight:600;}

/* message stream */
.fpd-ai .msgs{flex:1;min-height:0;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:14px;background:radial-gradient(900px 300px at 50% -60px,rgba(91,110,225,0.05),transparent 70%);}
.fpd-ai .row{display:flex;}
.fpd-ai .row.user{justify-content:flex-end;}
.fpd-ai .row.agent{justify-content:flex-start;}
.fpd-ai .bubble{max-width:88%;padding:11px 14px;border-radius:18px;}
.fpd-ai .bubble.agent{background:linear-gradient(180deg,#111A2C,#0C1322);border:1px solid rgba(255,255,255,0.08);border-top-left-radius:5px;box-shadow:0 6px 20px -12px rgba(0,0,0,0.7);}
.fpd-ai .bubble.agent > div{display:flex;flex-direction:column;gap:0;}
.fpd-ai .bubble.user{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);border-top-right-radius:5px;box-shadow:0 8px 20px -10px rgba(91,110,225,0.7);}
.fpd-ai .bubble.user p{color:#fff;font-size:16px;line-height:1.55;}
.fpd-ai .btime{font-family:var(--font-mono);font-size:11px;margin-top:6px;text-align:right;}
.fpd-ai .bubble.user .btime{color:rgba(255,255,255,0.75);}
.fpd-ai .bubble.agent .btime{color:${FAINT};}

/* markdown atoms */
.fpd-ai .md-p{color:${SOFT};font-size:16px;line-height:1.7;margin:2px 0;font-family:var(--font-body);}
.fpd-ai .md-p strong{color:${TEXT};font-weight:600;}
.fpd-ai .md-eyebrow{font-size:12px;font-weight:600;color:${MUTED};margin:15px 0 7px;}
.fpd-ai .md-eyebrow:first-child{margin-top:0;}
.fpd-ai .md-feat{display:flex;gap:10px;align-items:flex-start;margin:6px 0;font-family:var(--font-body);}
.fpd-ai .md-feat .fdot{width:6px;height:6px;border-radius:2px;margin-top:6px;flex-shrink:0;background:linear-gradient(180deg,${ACCENT2},#5B6EE1);}
.fpd-ai .md-feat .ftext{font-size:16px;line-height:1.6;}
.fpd-ai .md-feat .fterm{color:${TEXT};font-weight:600;}
.fpd-ai .md-feat .fdesc{color:${MUTED};}
.fpd-ai .md-li{display:flex;align-items:flex-start;gap:9px;font-size:16px;color:${SOFT};line-height:1.6;margin:2px 0;font-family:var(--font-body);}
.fpd-ai .md-li .b{width:5px;height:5px;border-radius:50%;margin-top:7px;flex-shrink:0;background:${ACCENT2};}
.fpd-ai .md-li strong{color:${TEXT};font-weight:600;}
.fpd-ai .md-tr{display:flex;gap:10px;flex-wrap:wrap;padding:2px 0;}
.fpd-ai .md-tr span{font-family:var(--font-mono);font-size:14px;min-width:64px;}

/* typing */
.fpd-ai .typing{display:inline-flex;gap:5px;align-items:center;padding:13px 16px;background:linear-gradient(180deg,#111A2C,#0C1322);border:1px solid rgba(255,255,255,0.08);border-radius:18px;border-top-left-radius:5px;width:fit-content;}
.fpd-ai .typing .dot{width:7px;height:7px;border-radius:50%;background:${ACCENT2};animation:fpd-ai-bounce 1.4s ease-in-out infinite;}
@keyframes fpd-ai-bounce{0%,60%,100%{opacity:.35;transform:translateY(0);}30%{opacity:1;transform:translateY(-3px);}}
@keyframes fpd-ai-pulse{0%,100%{opacity:1;}50%{opacity:.4;}}

/* suggestion rail */
.fpd-ai .sugg{display:flex;gap:8px;overflow-x:auto;padding:12px 16px;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.08);scrollbar-width:none;}
.fpd-ai .sugg::-webkit-scrollbar{display:none;}
.fpd-ai .sugg .flabel{font-family:var(--font-mono);font-size:11px;letter-spacing:0.14em;color:${FAINT};align-self:center;flex-shrink:0;text-transform:uppercase;}
.fpd-ai .chip{white-space:nowrap;flex-shrink:0;padding:7px 13px;border-radius:99px;font-size:15px;font-weight:600;font-family:var(--font-body);cursor:pointer;color:#6FAE8B;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);transition:background .16s,border-color .16s;}
.fpd-ai .chip:hover{background:rgba(91,110,225,0.18);border-color:rgba(91,110,225,0.45);}

/* input bar */
.fpd-ai .inbar{display:flex;gap:9px;padding:14px 16px;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#0C1322,#0A0F1A);}
.fpd-ai .inbar input{flex:1;background:#0F1624;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:10px 14px;font-size:16px;color:${TEXT};outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-ai .inbar input::placeholder{color:${FAINT};}
.fpd-ai .inbar input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-ai .send{width:40px;height:40px;flex-shrink:0;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;border:none;transition:filter .18s,transform .18s;}
.fpd-ai .send.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;cursor:pointer;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7);}
.fpd-ai .send.on:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-ai .send.off{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${FAINT};cursor:default;}

@media (max-width:1024px){
  .fpd-ai .bento{grid-template-columns:1fr;}
  .fpd-ai .chatcard{height:560px;}
  .fpd-ai .kpi-stack{grid-template-columns:1fr 1fr;}
}
@media (max-width:430px){
  .fpd-ai .kpi-stack{grid-template-columns:1fr;}
}
@media (prefers-reduced-motion:reduce){
  .fpd-ai .typing .dot,.fpd-ai .hd-status .d,.fpd-ai .chat-status .d,.fpd-ai-launch,.fpd-ai .send.on{animation:none!important;transition:none!important;}
  .fpd-ai .kpi-mini,.fpd-ai .qrow,.fpd-ai .hbtn{transition:none!important;}
}
`;

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
export function AIAgent({ pageMode = false }: { pageMode?: boolean }) {
  const [open, setOpen] = useState(pageMode);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id:"init", role:"agent",
    text: KB["default"],
    time: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  const reset = () => {
    setMessages([{ id:"init", role:"agent", text:KB["default"], time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) }]);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    setMessages(prev => [...prev, { id:Date.now().toString(), role:"user", text, time }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:"agent", text:getResponse(text), time }]);
    }, 700 + Math.random()*500);
  };

  /* ── Shared conversation pieces (used by both page and floating modes) ── */
  const messagesEl = (
    <div className="msgs">
      {messages.map(msg => (
        <div key={msg.id} className={`row ${msg.role}`}>
          <div className={`bubble ${msg.role}`}>
            {msg.role==="agent"
              ? <div>{renderMarkdown(msg.text)}</div>
              : <p>{msg.text}</p>}
            <div className="btime">{msg.time}</div>
          </div>
        </div>
      ))}
      {typing && <div className="row agent"><TypingIndicator/></div>}
      <div ref={endRef}/>
    </div>
  );

  const inputEl = (
    <div className="inbar">
      <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&send(input)}
        placeholder="Ask anything about Final Pass Down…"/>
      <button onClick={()=>send(input)} disabled={!input.trim()}
        className={`send ${input.trim() ? "on" : "off"}`}>
        <Send size={16}/>
      </button>
    </div>
  );

  /* ═══ Page mode — full estate-platform page, matched to Dashboard & Calendar ═══ */
  if (pageMode) {
    return (
      <div className="fpd-ai page">
        <style dangerouslySetInnerHTML={{ __html: AI_CSS }} />
        <div className="grain" />

        <div className="wrap">
          {/* Hero banner */}
          <div className="hbanner">
            <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(111,174,139,0.2)), url(${heroQAPhoto})` }} />
            <div className="scrim" />
            <div className="hcontent">
              <span className="heyebrow">Ask Anything, Anytime</span>
              <h1>Every question, <span className="accent">answered instantly.</span></h1>
              <p>Your always-on guide to Final Pass Down — ask about any section, fee, or feature and get a specific, instant answer.</p>
              <div className="hactions">
                <button className="hbtn primary" onClick={() => inputRef.current?.focus()}>
                  <Send size={15} /> Start a Conversation
                </button>
                <button className="hbtn ghost" onClick={() => popularRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}>
                  <List size={15} /> See Popular Questions
                </button>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="pg-head">
            <div style={{ minWidth:0 }}>
              <div className="eyebrow"><Sparkles size={12}/> Your Concierge · Trained on Every Feature</div>
              <h1 className="pg-h1">Ask Carlos</h1>
              <div className="pg-sub">
                Your always-on guide to Final Pass Down. Ask about any section, contact type, the Activate
                Legacy Access fee, security, plans, or how to get something done — answers are instant and
                specific to the platform.
              </div>
            </div>
            <div className="head-r">
              <button className="btn-new" onClick={reset}><Plus size={14}/> New conversation</button>
            </div>
          </div>

          {/* KPI band */}
          <div className="kpi-stack">
            {STATS.map(s => {
              const tone = KPI_TONES[s.tone] ?? KPI_TONES.sky;
              return (
                <div key={s.label} className="kpi-mini">
                  <span className="kpi-mini-ico" style={{ background: tone.bg, color: tone.fg }}><s.Icon size={18}/></span>
                  <div className="kpi-mini-txt">
                    <div className="kpi-mini-val">{s.value}</div>
                    <div className="kpi-mini-lbl">{s.label}</div>
                    <div className="kpi-mini-sub"><span className="dt" style={{ background: s.dot }}/>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bento — conversation + side rail */}
          <div className="bento">
            <div className="card chatcard">
              <div className="chat-hd">
                <h3 className="sec-title"><span className="tick"/>Conversation</h3>
                <div className="chat-status"><span className="d"/> Online</div>
              </div>
              {messagesEl}
              {inputEl}
            </div>

            <div className="col">
              <div className="card pad" ref={popularRef}>
                <div className="sec-head">
                  <h3 className="sec-title"><span className="tick"/>Popular Questions</h3>
                </div>
                {POPULAR.map(p => {
                  const tone = KPI_TONES[p.tone] ?? KPI_TONES.sky;
                  return (
                    <button key={p.q} className="qrow" onClick={() => send(p.q)}>
                      <span className="qico" style={{ background: tone.bg, color: tone.fg }}><p.Icon size={15}/></span>
                      <span className="qtxt">{p.q}</span>
                      <ArrowUpRight size={15} className="qarr"/>
                    </button>
                  );
                })}
              </div>

              <div className="foot">
                <Info size={16} color="#FFFFFF" style={{ flexShrink:0, marginTop:1 }}/>
                <div className="ft">
                  <b>This assistant knows the whole platform.</b> It only explains features and points you to the
                  right section — it never touches your data. For account-specific help, contact{" "}
                  <b>support@finalpassdown.com</b>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ Floating widget mode ═══ */
  if (!open) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AI_CSS }} />
      <button className="fpd-ai-launch" onClick={() => setOpen(true)} title="Ask Carlos" aria-label="Ask Carlos">
        <Sparkles size={22}/>
      </button>
    </>
  );

  return (
    <div className="fpd-ai">
      <style dangerouslySetInnerHTML={{ __html: AI_CSS }} />

      <div className="panel floating" style={minimized ? { height:"auto" } : undefined}>
        {/* Header */}
        <div className="hd">
          <div className="hd-l">
            <div className="hd-logo"><img src={fpdSquareLogo} alt="FPD"/></div>
            <div style={{ minWidth:0 }}>
              <div className="hd-eyebrow">Final Pass Down</div>
              <div className="hd-title">Carlos</div>
              <div className="hd-status">
                <span className="d"/>
                <span>Trained on every FPD feature</span>
              </div>
            </div>
          </div>
          <div className="hd-r">
            <button className="icon-btn" onClick={reset} title="Reset conversation"><RefreshCw size={13}/></button>
            <button className="icon-btn" onClick={() => setMinimized(m=>!m)} title={minimized ? "Expand" : "Minimize"}>{minimized ? <Maximize2 size={13}/> : <Minimize2 size={13}/>}</button>
            <button className="icon-btn" onClick={() => setOpen(false)} title="Close"><X size={14}/></button>
          </div>
        </div>

        {!minimized && (
          <>
            {messagesEl}
            <div className="sugg">
              <span className="flabel">Try</span>
              {SUGGESTIONS.map(s => (
                <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
            {inputEl}
          </>
        )}
      </div>
    </div>
  );
}
