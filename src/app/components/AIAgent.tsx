import React, { useState, useRef, useEffect } from "react";
import { Send, X, Minimize2, Maximize2, Sparkles, RefreshCw } from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface Message { id: string; role: "user"|"agent"; text: string; time: string; }

/* ═══════════════════════════════════════════════════════════════════
   COMPREHENSIVE FPD KNOWLEDGE BASE
   Covers every feature, section, and workflow on the platform
═══════════════════════════════════════════════════════════════════ */
const KB: Record<string, string> = {

  // ── Navigation & Getting Started ─────────────────────────────────
  "navigate": `Here's a map of every section in Final Pass Down:\n\n**Vault & Files**\n• **Legacy Vault** — your encrypted master vault\n• **File Cabinet** — 18+ categorized folders for all documents\n• **Folders & Reminders** — custom folders and calendar reminders\n\n**Wishes & Legal**\n• **Final Wishes** — bequests, burial preferences, estate instructions\n• **Wills and Living Trusts** — legal documents with attorney details\n\n**Life Records**\n• Medical Info · Financial Records · Assets & Property\n• Memories & Media · Digital Diary · Job History\n• ID Keeper · Warranties · Travel Planner · Favorite Places\n\n**Family Life**\n• Daycare Information · Kids' Activities\n\n**People / Contacts**\n• Legacy Contacts · Guardian Contacts · Emergency Contacts\n\n**Security**\n• Account & Profile · Password Manager · Auto Pay & Subs\n• Activate Legacy Access\n\n**Earn & Concierge**\n• Affiliate Program · White Glove Service\n\n**AI**\n• Ask FPD AI Assistant (that's me!)\n\nJust click any section in the left sidebar to get started.`,

  // ── File Cabinet ─────────────────────────────────────────────────
  "file cabinet": `The **Digital File Cabinet** is your organized document library with 18+ folders:\n\n⚖️ Legal Documents · 💰 Financial Records · 🏥 Medical Records\n📋 Tax Records · 🏠 Property & Real Estate · 🚗 Vehicles\n⚡ Utilities & Services · 🛡️ Insurance Policies · 🐾 Pet Records\n💌 Personal Letters · 📷 Photo Albums · 🎥 Video Messages\n💻 Digital Assets · ₿ Crypto & NFTs · 🔒 Firearms Registry\n⚔️ Weapons Locker · 🛡️ Warranties · 🔐 Secret Vault\n\n**To upload:** Open any folder → click Upload Files or drag & drop.\n**To scan:** Click the Scan button — uses your device camera.\n**Syncing from sidebar sections:** Many sidebar pages (Financial Records, Warranties, etc.) have a "Sync to File Cabinet" button to push records directly into the correct folder.\n\nAll files are AES-256 encrypted client-side before leaving your device.`,

  // ── Legacy Vault ─────────────────────────────────────────────────
  "legacy vault": `The **Legacy Vault** is your encrypted master vault — the centerpiece of your account.\n\n**What it contains:** All uploaded documents across every life category.\n\n**Access is locked until TWO conditions are met:**\n1. The **Activate Legacy Access Fee** is paid\n2. **Confirmation of passing** is verified by FPD administrators\n\n**Accepted confirmation documents:** death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record.\n\n**Legacy Vault Clone:** Once both conditions are met, legacy contacts can download EVERYTHING — all 18+ folder categories, final wishes, medical records, financial records, digital diary, password manager contents, and more.\n\nTo set this up: Go to **Security → Activate Legacy Access** in the sidebar.`,

  // ── Legacy Continuation Fee ───────────────────────────────────────
  "199": `The **Activate Legacy Access Fee** is a one-time payment that unlocks your legacy contacts' ability to access and download your vault.\n\n**Why it exists:** Without it, your vault goes into archive mode after your subscription expires.\n\n**Two conditions required to unlock downloads:**\n1. ✅ $199 fee paid (by you or a legacy contact)\n2. ✅ Confirmation of passing verified by FPD admin\n\n**Payment options:** Card (Stripe) or cryptocurrency (BTC, ETH, USDC, USDT, SOL, BNB, XRP, LTC)\n\n**Who can pay:** You can pay now (anytime, even years before passing), or your legacy contact can pay after your passing.\n\n**Demo flow:** Go to **Security → Activate Legacy Access** → pay via the form → click "Simulate Admin Verification" to see the full unlocked state.\n\nThe fee is non-refundable once processed. Vault stays active for 24 months from the verified date of passing (admin-configurable).`,

  // ── Legacy Contacts ───────────────────────────────────────────────
  "legacy contact": `**Legacy Contacts** are the people who receive access to your complete vault after your verified passing.\n\n**Chain of Authority:**\n• Legacy Contact #1 = PRIMARY — notified first, has full control\n• Legacy Contact #2 = CONTINGENT — activates only if #1 is unable/deceased\n• Legacy Contact #3+ = further backups in order\n\n**Verification required:** Each legacy contact must submit a government-issued photo ID (driver's license, passport, or state ID). FPD compliance reviews within 1–2 business days.\n\n**ID Verification workflow (right on the contact card):**\n1. Send Verification Invite → contact receives email\n2. Simulate ID Submission → status changes to "ID Submitted"\n3. Simulate Verify → compliance marks as Verified ✅\n\n**Custom verification requirements:** When adding a legacy contact, you can require additional verification beyond the death certificate: security word, Q&A, notarized affidavit, attorney certification, hospital record, or obituary.\n\nTo add: Go to **People → Legacy Contacts** in the sidebar.`,

  // ── Guardian Contacts ─────────────────────────────────────────────
  "guardian contact": `**Guardian Contacts** have VIEW-ONLY access to assigned folders RIGHT NOW — no death required.\n\n**Perfect for:**\n• A spouse who may need to act if you're incapacitated\n• A trusted attorney who needs to see legal docs now\n• An adult child you want to keep informed\n\n**Key rules:**\n• Cannot download files — view only, always\n• You assign which specific folders they can see\n• Access is live immediately after they're added and verified\n\nTo add: Go to **People → Guardian Contacts** → click "Add Guardian Contact" → assign specific folders using the folder picker.`,

  // ── Emergency Contacts ────────────────────────────────────────────
  "emergency contact": `**Emergency Contacts** are people notified by first responders in an emergency. They have NO vault access — purely informational.\n\nTo add: Go to **People → Emergency Contacts** in the sidebar.\n\nYou can store their name, phone, email, and relationship. This information appears on your profile for emergency services.`,

  // ── Final Wishes ──────────────────────────────────────────────────
  "final wishes": `The **Final Wishes** section has 3 tabs:\n\n1. **Family Wishes** — specific bequests (who gets what item/asset), written instructions to family\n2. **Funeral Planning** — service type, location, music, readings, flowers, special requests, obituary draft\n3. **Questionnaire** — 30+ life questions covering values, beliefs, medical wishes, messages to loved ones\n\nTo access: **Wishes & Trusts → Final Wishes** in the sidebar.`,

  // ── Wills and Living Trusts ───────────────────────────────────────
  "wills": `The **Wills and Living Trusts** section stores all your legal documents executed with an attorney:\n\n**Document types:** Last Will & Testament, Living Will / Advance Directive, Durable Power of Attorney, Healthcare Power of Attorney, Revocable Living Trust, Irrevocable Trust, and more.\n\n**Each record includes:** Attorney name, date executed, last reviewed date, document location, and status (Current/Outdated).\n\n**Actions:** View in Vault, Update Record, Scan & Upload a copy, Sync to File Cabinet → Legal Documents.\n\nTo access: **Wishes & Trusts → Wills and Living Trusts** in the sidebar.`,

  // ── Medical Info ──────────────────────────────────────────────────
  "medical": `The **Medical Info** section covers everything emergency responders and family need to know:\n\n**Emergency Tab:** Blood type, allergies (with severity), active conditions, DNR status, organ donor preference, advance directive status, primary physician, preferred hospital, insurance card (sync to File Cabinet).\n\n**Allergies Tab:** Add allergies with severity (Mild/Moderate/Severe/Anaphylactic), symptoms, and medication.\n\n**Medications Tab:** Current prescriptions with prescriber, dosage, refill info, and pharmacy.\n\nTo access: **Life Records → Medical Info** in the sidebar.`,

  // ── Financial Records ─────────────────────────────────────────────
  "financial": `The **Financial Records** section has 6 tabs:\n\n💼 **Insurance** — Life, homeowner's, auto, umbrella policies with carrier, policy #, coverage, beneficiary\n🏠 **Real Estate** — Properties with value, mortgage, title holder, deed info\n📈 **Investments** — Brokerage, Roth IRA, mutual funds with institution, holdings, beneficiary\n💰 **Retirement** — 401(k), IRA, pension, Social Security with balance and beneficiary\n📋 **Tax Records** — Annual filings with preparer, result, document location\n📊 **Business** — Business entities with EIN, bank, revenue, accountant\n\nAll records have a **Sync to File Cabinet** button to push documents to the appropriate folder.\n\nTo access: **Life Records → Financial Records** in the sidebar.`,

  // ── Personal Assets ───────────────────────────────────────────────
  "assets": `The **Personal Assets** section has 7 tabs:\n\n🚗 **Vehicles** — Make, model, VIN, title, insurance, registration, estimated value, photo\n🏠 **Real Estate** — Properties with photo, mortgage, deed, sq ft, bed/bath, lot size\n⚡ **Utilities** — Service accounts with account #, autopay status, monthly average\n💻 **Digital Assets** — Crypto, social media, domains, online accounts with access method\n🔒 **Firearms** — Make, model, serial, DOJ registration, storage, transfer instructions, photo\n⚔️ **Weapons Locker** — Non-firearm bladed weapons (knives, swords, etc.) with photo\n💎 **Collectibles** — Sports cards, watches, art, jewelry with photo, condition, estimated value, intended recipient\n\nTo access: **Life Records → Assets & Property** in the sidebar.`,

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
  "memories": `The **Memories & Media** section has 7 tabs:\n\n📷 **Memories** — Photo and video memories with date, description, tags\n🎥 **Video Messages** — Private messages to specific recipients, delivered after passing\n❤️ **Kids & Family** — Children's info, school, activities, notes\n⭐ **Keepsakes** — Sentimental items with story, location, intended recipient\n🎯 **Goals** — Life goals with progress bars\n🏆 **Awards** — Achievements, military service, professional recognition\n🐾 **Pets** — Full pet records (see "pet records" for details)\n\nTo access: **Life Records → Memories & Media** in the sidebar.`,

  // ── Pet Records ───────────────────────────────────────────────────
  "pet": `The **Pet Records** form matches the official app design exactly:\n\n**8 sections:**\n1. Upload Images/Videos (up to 10)\n2. Emergency Pet Caretaker (Name + Phone, add multiple)\n3. Long Term Pet Provider (Name + Phone, add multiple)\n4. Special Care Instruction (Name + Phone + Description, add multiple)\n5. About Your Beloved Pet (Name, Date of Birth, Gender, Breed, Colour, Upload Documents)\n6. Health Info (Medical History, Vaccination Type + Date pairs, add multiple)\n7. Vet Info (Name, Phone, Email)\n8. Feeding (Food Type, Time of Day, Quantity, Location of Food, add multiple)\n\nTo add a pet: **Memories & Media → Pets tab → Add Pet Record**`,

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
  "account": `**Account Settings** has 4 tabs:\n\n👤 **Profile** — Upload profile photo, edit name, email, phone\n🔐 **Security & 2FA** — Enable SMS/Email OTP/Authenticator 2FA, change password\n🔒 **Encryption** — View AES-256 encryption status (always on, zero-knowledge)\n🔔 **Notifications** — Toggle Email, SMS, Push, Storage Alerts, Contact Updates, Marketing\n\nTo access: **Security → Account & Profile** in the sidebar.`,

  // ── Confirmation of Passing ───────────────────────────────────────
  "confirmation of passing": `**Confirmation of Passing** — what FPD needs to activate legacy access:\n\nAccepted documents include:\n• Death certificates\n• Obituaries from recognized publications\n• Hospital or hospice records\n• Coroner reports\n• Funeral home letters\n• Probate filings\n• Any credible official record\n\n**Process:** Legacy contact submits documentation → FPD admin reviews → admin verifies → admin clicks "Activate" → vault opens for all verified legacy contacts.\n\n**Important:** Verification and admin approval are required, with a follow-up confirmation of death once received. The $199 fee must ALSO be paid — paying the fee alone does not unlock access.`,

  // ── Default / Help ────────────────────────────────────────────────
  "default": `I'm your **FPD AI Assistant** — fully trained on every feature of Final Pass Down.\n\nI can help you with:\n\n📁 **Navigating the platform** — where to find any section\n👥 **Contacts & permissions** — Legacy, Guardian, Emergency contacts\n💰 **The Activate Legacy Access Fee** — how it works, how to pay\n📋 **Documents & files** — uploading, organizing, syncing\n🛡️ **Security** — 2FA, encryption, password manager\n⭐ **White Glove Service** — hands-on concierge help\n📊 **Plans & storage** — pricing, overage, upgrades\n🎯 **Any specific feature** — just ask!\n\nType your question or tap a suggestion below.`,
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
  if (q.match(/final wish|funeral|burial|bequest|estate instruction|obituary|questionnaire/)) return KB["final wishes"];

  // Wills
  if (q.match(/will\b|wills|trust|living trust|power of attorney|advance directive/)) return KB["wills"];

  // Medical
  if (q.match(/medical|allergy|allergies|medication|blood type|dnr|organ donor|doctor|physician/)) return KB["medical"];

  // Financial
  if (q.match(/financial|insurance|real estate|investment|retirement|401k|ira|tax|business record/)) return KB["financial"];

  // Personal Assets
  if (q.match(/asset|vehicle|car|truck|suv|utility|digital asset|firearm|gun|weapon|collectible|real estate|property/)) return KB["assets"];

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

/* ── Markdown renderer ──────────────────────────────────────────── */
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("| ")) {
      const cells = line.split("|").filter(c => c.trim());
      if (line.includes("---")) return null;
      return (
        <div key={i} className="flex gap-2 text-xs py-0.5 flex-wrap">
          {cells.map((cell,j) => <span key={j} style={{ color:j===0?"#FFFFFF":"rgba(255,255,255,0.7)", minWidth:70, fontWeight:j===0?600:400 }}>{cell.trim().replace(/\*\*/g,"")}</span>)}
        </div>
      );
    }
    if (line.startsWith("• ") || line.startsWith("* ")) {
      const content = line.slice(2).replace(/\*\*([^*]+)\*\*/g,"$1");
      return <div key={i} className="flex items-start gap-2 text-sm" style={{ color:"rgba(255,255,255,0.8)" }}><span style={{ color:"#3A5BD9", flexShrink:0 }}>•</span><span>{content}</span></div>;
    }
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return (
      <p key={i} style={{ color:"rgba(255,255,255,0.8)", fontSize:13, lineHeight:1.7, margin:"2px 0" }}>
        {parts.map((p,j) => j%2===1 ? <strong key={j} style={{ color:"#FFFFFF" }}>{p}</strong> : p)}
      </p>
    );
  }).filter(Boolean);
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#3A5BD9", animation:`pulse 1.4s ease-in-out ${i*0.2}s infinite`, opacity:0.6 }}/>
      ))}
    </div>
  );
}

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

  if (!open && !pageMode) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl transition-all hover:scale-105"
      style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 8px 32px rgba(58,91,217,0.45)" }}>
      <Sparkles size={16}/> FPD Assistant
    </button>
  );

  const wrapStyle: React.CSSProperties = pageMode
    ? { display:"flex", flexDirection:"column", height:"calc(100vh - 48px)", maxWidth:800, margin:"24px auto", borderRadius:20, overflow:"hidden", border:"1px solid rgba(58,91,217,0.15)", boxShadow:"0 8px 32px rgba(58,91,217,0.12)", background:"#101728" }
    : { position:"fixed", bottom:96, right:24, zIndex:50, display:"flex", flexDirection:"column", borderRadius:16, overflow:"hidden", boxShadow:"0 20px 60px rgba(58,91,217,0.25)", width:400, height:minimized?"auto":600, background:"#101728", border:"1px solid rgba(58,91,217,0.15)" };

  return (
    <div style={wrapStyle}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)" }}>
        <div className="flex items-center gap-2.5">
          <img src={fpdSquareLogo} alt="FPD" style={{ width:28, height:28, borderRadius:6, objectFit:"cover" }}/>
          <div>
            <div style={{ color:"#fff", fontSize:13, fontWeight:700 }}>FPD AI Assistant</div>
            <div className="flex items-center gap-1">
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO }}>Trained on all FPD features</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} title="Reset" style={{ color:"rgba(255,255,255,0.6)", padding:4 }}><RefreshCw size={13}/></button>
          {!pageMode && <button onClick={() => setMinimized(m=>!m)} style={{ color:"rgba(255,255,255,0.6)", padding:4 }}>{minimized ? <Maximize2 size={13}/> : <Minimize2 size={13}/>}</button>}
          {!pageMode && <button onClick={() => setOpen(false)} style={{ color:"rgba(255,255,255,0.6)", padding:4 }}><X size={14}/></button>}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background:"#0F1A33" }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                <div style={{ maxWidth:"88%", background:msg.role==="user"?"linear-gradient(135deg,#3A5BD9,#5B7BF5)":"#101728", color:msg.role==="user"?"#fff":undefined, borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", boxShadow:msg.role==="agent"?"0 2px 8px rgba(58,91,217,0.08)":undefined, border:msg.role==="agent"?"1px solid rgba(58,91,217,0.1)":undefined }}>
                  {msg.role==="agent" ? <div className="space-y-1">{renderMarkdown(msg.text)}</div> : <p style={{ fontSize:13, lineHeight:1.5 }}>{msg.text}</p>}
                  <div style={{ fontSize:10, opacity:0.5, marginTop:4, textAlign:"right", ...MONO }}>{msg.time}</div>
                </div>
              </div>
            ))}
            {typing && <div style={{ background:"#101728", borderRadius:16, border:"1px solid rgba(58,91,217,0.1)", width:"fit-content" }}><TypingIndicator/></div>}
            <div ref={endRef}/>
          </div>

          {/* Suggestions */}
          <div className="px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ borderTop:"1px solid rgba(58,91,217,0.08)" }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={{ background:"rgba(58,91,217,0.07)", color:"#3A5BD9", border:"1px solid rgba(58,91,217,0.15)" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderTop:"1px solid rgba(58,91,217,0.08)", background:"#101728" }}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send(input)}
              placeholder="Ask anything about Final Pass Down…"
              style={{ flex:1, border:"1px solid rgba(58,91,217,0.2)", borderRadius:12, padding:"8px 14px", fontSize:13, outline:"none", background:"rgba(58,91,217,0.03)" }}/>
            <button onClick={()=>send(input)} disabled={!input.trim()}
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width:38, height:38, background:input.trim()?"linear-gradient(135deg,#3A5BD9,#5B7BF5)":"rgba(58,91,217,0.1)", color:input.trim()?"#fff":"rgba(255,255,255,0.65)" }}>
              <Send size={16}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
