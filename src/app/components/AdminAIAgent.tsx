import React, { useState, useRef, useEffect } from "react";
import { Send, X, Minimize2, Maximize2, RefreshCw, Crown, Bot } from "lucide-react";

const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
interface Message { id:string; role:"user"|"agent"; text:string; time:string; }

/* ═══════════════════════════════════════════════════════════════════
   ADMIN COMMAND CENTER KNOWLEDGE BASE
   Covers every tab, feature, workflow, and policy in the admin portal
═══════════════════════════════════════════════════════════════════ */
const ADMIN_KB: Record<string, string> = {

  // ── Overview ─────────────────────────────────────────────────────
  "overview": `The **Command Center Overview** is your real-time platform health dashboard:\n\n**KPI Cards (top row):**\n• Total Active Users · Monthly Recurring Revenue (MRR) · Storage Used · Avg Vault Completion\n\n**Revenue trend chart:** 6-month MRR by plan tier (Starter → Legacy Vault)\n\n**Top Affiliates & Recent Activity:** Live feed of admin actions, system events, and user activity.\n\n**Quick stats:** New signups today, support tickets open, overdue ID verifications, and continuation fees pending.\n\nTo access: Admin Portal → Command Center → **Overview** tab.`,

  // ── Analytics ────────────────────────────────────────────────────
  "analytics": `The **Analytics Dashboard** provides deep demographic and behavioral insights:\n\n**Demographics:**\n• Gender distribution (Female 54.2% / Male 40.1%)\n• Age cohorts (18–75+) with average plan per group\n• Relationship status breakdown\n\n**Geographic:**\n• Top 10 US states with MRR\n• Country distribution map\n• Top 10 cities\n\n**Technology:**\n• Device split (Mobile 69.6% total, Desktop, Tablet)\n• Acquisition source (Organic, Referral, Affiliate, Direct, Paid)\n\n**Behavior:**\n• Feature adoption rates (which features users actually use)\n• Vault completion scores\n• 6-month DAU chart + DAU/MAU ratio\n• Average session duration\n\n**Health Metrics:**\n• Retention by month (Month 1–12 cohort curves)\n• NPS score (currently 47 — Excellent)\n• 12 platform health KPIs\n\nTo access: Command Center → **Analytics** tab.`,

  // ── Users ────────────────────────────────────────────────────────
  "users": `The **Users Tab** gives you full visibility and control over all accounts:\n\n**Search:** By name, email, or user ID.\n\n**User table columns:** User ID · Name · Email · Plan · Storage Used · Joined Date · Status · Contacts · Referrals\n\n**Actions per user:** View profile, suspend, upgrade/downgrade plan, view audit trail.\n\n**Manually Onboarded Accounts:** Appears as a highlighted section showing accounts created by admins (not self-signed-up). Includes waiver reason, White Glove flag, and who onboarded them.\n\n**Onboard User button (top right):** 3-step wizard:\n1. Contact info + White Glove toggle\n2. Pick plan + optional subscription waiver (8 reasons: White Glove, Charity, Press, Partner, Beta, Employee, Influencer, Other)\n3. Review & create\n\nTo access: Command Center → **Users** tab.`,

  // ── Revenue ──────────────────────────────────────────────────────
  "revenue": `The **Revenue Tab** shows MRR breakdown by plan tier:\n\n**Plan MRR cards:** Starter · Foundation · Legacy Archive · Legacy Pro · Legacy Vault — each showing subscriber count and total MRR.\n\n**Overage revenue:** Separate from subscription MRR — charged at $0.50/GB (Starter) or $0.40/GB (all others).\n\n**Affiliate commissions:** Tracked separately — reduces net revenue.\n\n**Export:** Download revenue reports in CSV/XLSX/PDF from the Reports & Downloads tab.\n\nTo access: Command Center → **Revenue** tab.`,

  // ── Storage ──────────────────────────────────────────────────────
  "storage": `The **Storage Tab** shows platform-wide consumption:\n\n**Per-plan breakdown:** Storage used vs. allocated for each plan tier.\n\n**Top users by usage:** Sorted by GB consumed.\n\n**Alert status:** Shows how many users are at 80% / 90% / 95% / 100% thresholds.\n\n**Overage billing:** Automatic — triggers at month end. $0.50/GB for Starter, $0.40/GB all others.\n\n**Full storage reports** available in the Reports & Downloads tab (Storage Usage by User, Storage Alert History).\n\nTo access: Command Center → **Storage** tab.`,

  // ── ID Verification ──────────────────────────────────────────────
  "id verification": `The **ID Verification Queue** manages government ID submissions from legacy contacts:\n\n**Badge on tab:** Shows count of pending verifications (currently shows "3").\n\n**Each submission shows:** Verification ID · Contact name · For which account · ID type · Submitted date\n\n**Actions:** Verify (approve) · Reject · Request Resubmission\n\n**SLA:** Advertised to users as 1–2 business days. If queue grows, triage by date submitted.\n\n**What happens when verified:** The legacy contact's status changes to "Verified" in the user's Legacy Contacts section. They gain access when the vault is activated.\n\n**Rejected submissions:** Contact receives email asking to resubmit a clearer photo ID.\n\nTo access: Command Center → **ID Verification** tab.`,

  // ── Payouts ──────────────────────────────────────────────────────
  "payouts": `The **Payouts Tab** manages affiliate and partner commission disbursements:\n\n**Payout methods:** ACH bank transfer, PayPal, Check, Crypto\n\n**Payout schedule:** Configurable (weekly/monthly). Default: 15th of each month.\n\n**Affiliate commission rates:**\n• Tier 1 (5–24 referrals): 20% for 12 months per referral\n• Tier 2 (25–74): 25% for 12 months\n• Tier 3 (75+): 30% for 12 months\n\n**Partner commission rates:** 20–30% lifetime (no time cap)\n\n**Batch payouts:** Select multiple affiliates → Process Batch → all paid simultaneously.\n\n**Full payout history** available in Reports & Downloads → Payout History report.\n\nTo access: Command Center → **Payouts** tab.`,

  // ── $199 Fee Admin ───────────────────────────────────────────────
  "199 fee": `The **Activate Legacy Access Tab** is where admins activate vault access after a user passes:\n\n**Table shows:** Account name · Email · Plan · Paid By (owner or legacy contact) · Payment date · Amount · Status (Paid / Pending) · Activated (yes/no)\n\n**Activation workflow:**\n1. Legacy contact submits confirmation of passing (death cert, obituary, coroner report, hospital record, funeral home letter, probate filing, or any credible official record)\n2. Admin reviews the document\n3. Admin clicks **"Activate"** on the account row\n4. Vault opens for all verified legacy contacts for the configured continuation period (default 24 months)\n\n**IMPORTANT:** Verification and admin approval are required, with a follow-up confirmation of death once received. Stripe payment is non-refundable.\n\n**Configuration options:** Set the default continuation period (months) and alert threshold.\n\nTo access: Command Center → **$199 Fee** tab.`,

  // ── Audit Log ────────────────────────────────────────────────────
  "audit log": `The **Audit Log** records every admin action with full accountability:\n\n**Logged events:** User suspended, plan changed, ID verified/rejected, payout processed, vault activated, email template edited, push notification sent, admin account created, storage config changed, continuation fee activated, and more.\n\n**Each entry:** Log ID · Timestamp · Admin actor · Action taken · Target (user/account) · Severity (Info/Warning/Critical)\n\n**Severity levels:**\n• 🟦 Info — routine actions\n• 🟨 Warning — significant changes\n• 🔴 Critical — irreversible actions (deletion, vault activation)\n\n**Export:** Full audit log available in Reports & Downloads → Audit Log Export (280k+ rows — use date filter).\n\n**Compliance:** Required for SOC 2 and HIPAA. Retain for minimum 7 years.\n\nTo access: Command Center → **Audit Log** tab.`,

  // ── Push Notifications ───────────────────────────────────────────
  "push notifications": `The **Push Notification Center** lets you broadcast to users:\n\n**Compose fields:**\n• Notification Type: Marketing / Feature / Update / Alert / Reminder\n• Target Audience: All Users or filter by plan tier\n• Delivery Channel: 🔔 Push Only · ✉️ Email Only · 📡 Push & Email (both simultaneously)\n• Title (65 char limit)\n• Message body (240 char limit)\n• Schedule: Send now or pick a date/time\n\n**Live Preview:** Updates as you type — shows lock screen mockup + in-app banner.\n\n**Sent History:** Every notification with Delivered count, Opened count, and Open Rate %.\n\n**Best practices:**\n• Keep titles under 40 chars for full mobile display\n• Schedule marketing notifications for Tuesday–Thursday 10 AM–2 PM local time\n• Use "Push & Email" for critical alerts (fee reminders, expiring warranties)\n\nTo access: Command Center → **Push Notifications** tab.`,

  // ── Admin Team ───────────────────────────────────────────────────
  "admin team": `The **Admin Team Tab** manages who has access to the Command Center:\n\n**6 Role Presets:**\n• 👑 **Super Admin** — unrestricted everything (cannot be limited)\n• 🟣 **Operations Manager** — view/edit users, WG, verification, notifications\n• 🟢 **Finance Manager** — revenue, payouts, $199 fee, crypto config\n• 🟠 **White Glove Manager** — WG clients, waivers, billing, staff only\n• 🔵 **Support Agent** — view/edit users and White Glove only\n• 🔴 **Content Admin** — email templates and push notifications only\n\n**Invite flow (3 steps):**\n1. Enter name, email, choose role → live permission preview shows which modules are unlocked\n2. Sending animation — account created, permissions assigned, login token generated, email sent\n3. Success screen — full email preview, copy one-time login link, account summary\n\n**Per-module permissions:** View / Edit / Delete can be toggled individually for 16 modules after account creation.\n\n**Account actions:** Suspend (immediate), Reactivate, Resend Invite.\n\nTo access: Command Center → **Admin Team** tab.`,

  // ── Reports & Downloads ──────────────────────────────────────────
  "reports": `The **Reports & Downloads Tab** provides 20 built-in reports across 6 categories:\n\n**Financial (5 reports):**\n• MRR Summary · Payout History · Overage Billing · $199 Continuation Fee Log · White Glove Billing\n\n**Users (4 reports):**\n• Full User Roster · New Signup Report · Churn & Cancellation · Manually Onboarded Accounts\n\n**Storage (2):** Usage by User · Alert History\n\n**Operations (3):** WG Client Status · ID Verification Queue · Affiliate Performance\n\n**Compliance (3):** Full Audit Log · GDPR/CCPA Data Export · Admin Access Log\n\n**Marketing (2):** Push Notification Stats · Email Delivery Report\n\n**Formats:** CSV / PDF / XLSX / JSON\n\n**Date ranges:** Last 7 days / 30 days / 90 days / Year to date / All time / Custom\n\n**Download History tab:** Every generated export with file size, row count, and re-download button (retained 30 days).\n\nTo access: Command Center → **Reports & Downloads** tab.`,

  // ── White Glove Admin ────────────────────────────────────────────
  "white glove admin": `The **White Glove Admin** section manages the concierge program:\n\n**4 sub-tabs:**\n\n⭐ **Clients** — All WG clients with status (Intake/Active/Completed/Paused), specialist assignment, completion %, sessions, billing summary. Session timer + charge card built into each client card.\n\n📄 **Authorization Waivers** — Legal e-signature waivers per client. Send, track status (Pending/Signed/Declined/Expired), preview, remind, download PDF.\n\n👥 **Concierge Staff** — Hire/invite/assign specialists. 3 roles: Junior (blue), Senior (purple), Lead (orange). Each employee gets a unique login to the Concierge Portal restricted to their assigned clients.\n\n💳 **Billing** — Cards on file per client + full billing history (date, client, session type, duration, blocks, amount charged).\n\n**Pricing:** $99 setup fee + $25 per 30-min block. Any time used = 1 full block.\n\nTo access: Admin Portal → White Glove Concierge section.`,

  // ── White Label ──────────────────────────────────────────────────
  "white label": `The **White Label Onboarding Control** manages enterprise WL partners:\n\n**3 packages:**\n| Package | Users | Monthly | Setup |\n|---------|-------|---------|-------|\n| Agency Partner | Up to 500 | $2,999/mo | +$2,500 |\n| Enterprise Partner | 501–5,000 | $7,499/mo | +$5,000 |\n| Institutional Partner | 5,000+ | $15,000/mo | +$5,000 |\n\n**Billing models:** Flat monthly · Per-user flat $ · % of revenue (configured per customer in backend)\n\n**Live sync:** Editing a package in admin instantly updates the public landing page (pub/sub).\n\n**4 sub-tabs:** Packages · WL Sales · Onboarding Links · Payment Processors\n\n**WL Sales table:** Org name, contact, package, active users, MRR, setup paid, status, last payout.\n\nTo access: Admin Portal → WL Onboarding Control.`,

  // ── Subscription Config ──────────────────────────────────────────
  "subscription config": `The **Subscription Configuration** panel lets you adjust plan pricing in real time:\n\n**Configurable per plan:** Monthly price · Annual discount % · Storage allowance (GB) · Overage rate ($/GB) · Max contacts\n\n**5 plans:** Starter · Foundation · Legacy Archive · Legacy Pro · Legacy Vault\n\n**Storage alert thresholds:** Warning (80%) · Recommended (90%) · Critical (95%) · Overage (100%)\n\n**Live propagation:** Changes update the public pricing page immediately — no deployment needed.\n\n**Important:** After changing prices, update Stripe product prices in the dashboard and update the subscription_plans database table with the new Stripe price IDs.\n\nTo access: Admin Portal → Subscription Config.`,

  // ── Email Templates ──────────────────────────────────────────────
  "email templates": `The **Email Templates** panel manages all 16 transactional email templates:\n\n**Categories:**\n• Account: Welcome · OTP Verification · Password Reset\n• Storage: Warning 80% · Warning 90% · Warning 95% · Overage\n• Contacts: Legacy Contact Invite · Verified · Vault Access Activated\n• Payments: Continuation Fee Receipt\n• Affiliate: Welcome · Commission Earned · Payout Processed\n• Partnership: Partnership Welcome · WL Activated\n\n**Each template:** Editable subject line · {{variable}} placeholders · HTML body editor · Live preview · Copy HTML button · Reset to Default.\n\n**Common variables:** {{user_name}} · {{email}} · {{plan}} · {{amount}} · {{date}} · {{link}}\n\nTo access: Admin Portal → Email Templates.`,

  // ── Crypto Merchant ──────────────────────────────────────────────
  "crypto": `The **Crypto Merchant Config** panel manages cryptocurrency payment processors:\n\n**Supported processors:** Coinbase Commerce · BitPay · NOWPayments · Stripe Crypto · Crypto.com Pay · Strike Lightning · Square · Braintree (disabled by default) · Custom Processor\n\n**Supported coins:** BTC · ETH · USDC · USDT · SOL · BNB · XRP · LTC\n\n**Where crypto is accepted:** $199 Legacy Continuation Fee · Plan upgrades · Partner $599 setup fee\n\n**Setting default:** Only one processor can be set as default. Others are available as alternatives.\n\n**All crypto settles to USD automatically** via the processor.\n\n**Webhook endpoints:** Each processor has its own webhook — register in the processor's dashboard pointing to /webhooks/[processor-name].\n\nTo access: Admin Portal → Crypto Merchant Config.`,

  // ── Continuation Fee Admin ───────────────────────────────────────
  "continuation fee": `This is the same as the **Activate Legacy Access Tab** — see "199 fee" topic.\n\nKey admin responsibilities:\n1. Monitor the fee payment table daily\n2. When a user passes: verify the submitted documentation\n3. Click "Activate" to open vault access for legacy contacts\n4. Documentation accepted: death certificates, obituaries, hospital/hospice records, coroner reports, funeral home letters, probate filings, or any credible official record\n5. Verification and admin approval required — with a follow-up confirmation of death once received`,

  // ── Onboarding New Hire ──────────────────────────────────────────
  "new hire": `**Welcome to the Final Pass Down Command Center!** Here's a quick-start guide by department:\n\n**📊 Operations Manager:**\nStart with the Overview tab → Analytics tab → Users tab. Your key responsibility is monitoring vault completion rates, ID verification queue, and White Glove client health.\n\n**💰 Finance Manager:**\nStart with Revenue tab → Payouts tab → $199 Fee tab. Run the MRR Summary and Payout History reports from Reports & Downloads to understand our revenue structure.\n\n**⭐ White Glove Manager:**\nGo to the White Glove admin section → review all 4 sub-tabs (Clients, Waivers, Staff, Billing). Learn the $99 setup + $25/30-min billing model. Each specialist sees only their assigned clients in the Concierge Portal.\n\n**🔔 Content Admin:**\nYour two areas: Push Notifications and Email Templates. Review the 16 existing email templates before making changes. Use the preview panel when composing push notifications.\n\n**🔐 Support Agent:**\nFocus on Users tab (search and assist users) and White Glove clients. You cannot access financial data — escalate revenue questions to the Finance Manager.\n\nAsk me about any specific tab or workflow!`,

  // ── Partner Program ──────────────────────────────────────────────
  "partner": `**Partner Program** admin management:\n\n**Partner vs. Affiliate:**\n• Affiliates: 20–30% for 12 months per referral (time-capped)\n• Partners: 20–30% lifetime — no time cap (for businesses, $599 one-time setup fee)\n\n**Partner tiers:**\n• Tier 1 (1–50 accounts): 20% lifetime\n• Tier 2 (51–100): 25% lifetime\n• Tier 3 (101+): 30% lifetime\n\n**Admin view:** Partner performance table with active accounts, MRR, total paid, last payout date, and status.\n\n**Onboarding:** Partners complete a 4-step wizard with $599 payment (card or crypto). Appears in the Partnership Admin tab.\n\n**Commission payouts:** Processed through the Payouts tab with the same payout methods as affiliates.`,

  // ── ID Verification Process ──────────────────────────────────────
  "verify id": `**ID Verification Step-by-Step (Admin):**\n\n1. Check the **ID Verification** tab — badge shows pending count\n2. Click on a pending submission to review\n3. Examine the submitted ID photo for:\n   • Legibility (text must be readable)\n   • Match between name on ID and contact name in system\n   • ID expiry date (must be valid)\n   • Photo match (if available)\n4. If approved → click **Verify** → contact status changes to VERIFIED\n5. If rejected → click **Reject** → select reason → contact receives resubmit email\n6. SLA: Process within 1–2 business days\n7. Log your action — automatically recorded in Audit Log\n\n**Edge cases:**\n• Expired ID: Request renewal ID\n• Name mismatch: Request explanation or additional documentation\n• Photo unclear: Request resubmission with better lighting`,

  // ── Default ──────────────────────────────────────────────────────
  "default": `I'm the **FPD Admin AI Assistant** — trained on every feature of the Command Center.\n\nI can help you with:\n\n📊 **Analytics & Reporting** — interpreting dashboards, running reports\n👥 **User Management** — searching users, onboarding, suspensions\n💰 **Revenue & Payouts** — MRR, commissions, affiliate tiers\n⭐ **White Glove Program** — clients, sessions, billing, staff\n🔔 **Push Notifications** — composing, targeting, delivery channels\n🛡️ **ID Verification** — queue management, approval workflow\n🔐 **Vault Activation** — $199 fee, confirmation of passing, admin activation\n👑 **Admin Team** — roles, permissions, inviting new admins\n📋 **Reports** — all 20 reports, formats, date ranges\n🆕 **New Hire Onboarding** — department-specific guidance\n\nJust ask — what do you need help with?`,
};

function getAdminResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.match(/overview|dashboard|kpi|health|recent activity/)) return ADMIN_KB["overview"];
  if (q.match(/analytic|demographic|geographic|device|acquisition|retention|nps|dau|mau/)) return ADMIN_KB["analytics"];
  if (q.match(/user.*tab|manage user|search user|onboard user|manually onboard|suspend.*user|user list/)) return ADMIN_KB["users"];
  if (q.match(/revenue|mrr|monthly.*recurring|plan.*revenue|revenue.*plan/)) return ADMIN_KB["revenue"];
  if (q.match(/storage.*admin|platform.*storage|storage.*platform|storage.*tab|overage.*admin/)) return ADMIN_KB["storage"];
  if (q.match(/id.*verif|verif.*id|government.*id|id.*queue|pending.*verif|approve.*id|reject.*id/)) return ADMIN_KB["id verification"];
  if (q.match(/payout|commission.*pay|pay.*commission|disburse|affiliate.*pay|partner.*pay/)) return ADMIN_KB["payouts"];
  if (q.match(/\$?199|continuation.*fee|fee.*continuation|vault.*activ|activ.*vault|legacy fee/)) return ADMIN_KB["199 fee"];
  if (q.match(/audit|log|admin.*action|action.*admin|accountability|record.*action/)) return ADMIN_KB["audit log"];
  if (q.match(/push.*notif|notif.*push|send.*notif|notification.*center|broadcast/)) return ADMIN_KB["push notifications"];
  if (q.match(/admin.*team|invite.*admin|admin.*role|role.*admin|permission|who.*admin|new.*admin/)) return ADMIN_KB["admin team"];
  if (q.match(/report|download.*report|export.*report|report.*export|csv.*report/)) return ADMIN_KB["reports"];
  if (q.match(/white glove.*admin|wg.*admin|concierge.*admin|specialist.*manage|manage.*specialist|waiver/)) return ADMIN_KB["white glove admin"];
  if (q.match(/white label|wl.*package|package.*wl|agency partner|enterprise partner|institutional/)) return ADMIN_KB["white label"];
  if (q.match(/subscription.*config|plan.*price|price.*plan|storage.*config|config.*storage/)) return ADMIN_KB["subscription config"];
  if (q.match(/email.*template|template.*email|transactional.*email/)) return ADMIN_KB["email templates"];
  if (q.match(/crypto.*merchant|crypto.*config|bitcoin.*admin|coinbase|bitpay|nowpay|crypto.*processor/)) return ADMIN_KB["crypto"];
  if (q.match(/partner.*program|partner.*tier|partner.*commission|\$599/)) return ADMIN_KB["partner"];
  if (q.match(/verify.*step|how.*verify|approve.*id|id.*approve|id.*process|process.*id/)) return ADMIN_KB["verify id"];
  if (q.match(/new hire|onboard.*me|i.*new|getting start|where.*start|first day|just started|department/)) return ADMIN_KB["new hire"];
  if (q.match(/^(hi|hello|hey|help|what can|what do|start)/)) return ADMIN_KB["default"];

  return `I'm not sure about "${query}" specifically, but I'm trained on every Command Center feature.\n\nTry asking about:\n• A specific tab (e.g. "How does the ID Verification tab work?")\n• A workflow (e.g. "How do I activate a vault after someone passes?")\n• Your role (e.g. "I'm a new Finance Manager — where do I start?")\n• Reports (e.g. "How do I run a payout report?")\n\nOr escalate to a Super Admin for account-specific help.`;
}

const ADMIN_SUGGESTIONS = [
  "How do I activate a vault after passing?",
  "I'm a new hire — where do I start?",
  "How does ID verification work?",
  "How do I invite a new admin?",
  "How does White Glove billing work?",
  "What reports can I run?",
  "How do push notifications work?",
  "How are affiliate commissions calculated?",
];

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("| ")) {
      const cells = line.split("|").filter(c => c.trim());
      if (line.includes("---")) return null;
      return (
        <div key={i} className="flex gap-2 text-xs py-0.5 flex-wrap">
          {cells.map((cell,j) => <span key={j} style={{ color:j===0?"#E8EDF5":"#8A9AB8", minWidth:70, fontWeight:j===0?600:400 }}>{cell.trim().replace(/\*\*/g,"")}</span>)}
        </div>
      );
    }
    if (line.startsWith("• ") || line.startsWith("* ")) {
      const content = line.slice(2).replace(/\*\*([^*]+)\*\*/g,"$1");
      return <div key={i} className="flex items-start gap-2 text-sm" style={{ color:"#8A9AB8" }}><span style={{ color:"#6E90C9", flexShrink:0 }}>•</span><span>{content}</span></div>;
    }
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return (
      <p key={i} style={{ color:"#8A9AB8", fontSize:14.5, lineHeight:1.7, margin:"2px 0" }}>
        {parts.map((p,j) => j%2===1 ? <strong key={j} style={{ color:"#E8EDF5" }}>{p}</strong> : p)}
      </p>
    );
  }).filter(Boolean);
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#5BA7D6", animation:`pulse 1.4s ease-in-out ${i*0.2}s infinite`, opacity:0.6 }}/>
      ))}
    </div>
  );
}

export function AdminAIAgent({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(inline);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id:"init", role:"agent",
    text: ADMIN_KB["default"],
    time: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, typing]);

  const reset = () => {
    setMessages([{ id:"init", role:"agent", text:ADMIN_KB["default"], time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) }]);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const time = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
    setMessages(prev => [...prev, { id:Date.now().toString(), role:"user", text, time }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:"agent", text:getAdminResponse(text), time }]);
    }, 700 + Math.random()*400);
  };

  const wrapStyle: React.CSSProperties = inline
    ? { display:"flex", flexDirection:"column", height:"calc(100vh - 120px)", borderRadius:22, overflow:"hidden", border:"1.5px solid rgba(91,167,214,0.35)", background:"#101728", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)" }
    : { position:"fixed", bottom:24, left:24, zIndex:50, display:"flex", flexDirection:"column", borderRadius:22, overflow:"hidden", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 20px 60px rgba(0,0,0,0.5)", width:390, height:minimized?"auto":580, background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)" };

  if (!open && !inline) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-24 left-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-2xl"
      style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", boxShadow:"0 8px 32px rgba(91,167,214,0.45)" }}>
      <Crown size={16}/> Admin Assistant
    </button>
  );

  return (
    <div style={wrapStyle}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background:"linear-gradient(135deg,#5BA7D6,#5B6EE1)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center rounded-2xl" style={{ width:32, height:32, background:"rgba(255,255,255,0.15)" }}>
            <Crown size={18} color="#fff"/>
          </div>
          <div>
            <div style={{ color:"#fff", fontSize:14.5, fontWeight:700 }}>Admin AI Assistant</div>
            <div className="flex items-center gap-1">
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO }}>Command Center Expert</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} title="Reset" style={{ color:"rgba(255,255,255,0.6)", padding:4 }}><RefreshCw size={13}/></button>
          {!inline && <button onClick={()=>setMinimized(m=>!m)} style={{ color:"rgba(255,255,255,0.6)", padding:4 }}>{minimized?<Maximize2 size={13}/>:<Minimize2 size={13}/>}</button>}
          {!inline && <button onClick={()=>setOpen(false)} style={{ color:"rgba(255,255,255,0.6)", padding:4 }}><X size={14}/></button>}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background:"#070A12" }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                <div style={{ maxWidth:"88%", background:msg.role==="user"?"linear-gradient(135deg,#5BA7D6,#5B6EE1)":"#141B2E", color:msg.role==="user"?"#fff":undefined, borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", padding:"10px 14px", boxShadow:msg.role==="agent"?"0 2px 8px rgba(0,0,0,0.3)":undefined, border:msg.role==="agent"?"1px solid rgba(91,167,214,0.25)":undefined }}>
                  {msg.role==="agent" ? <div className="space-y-1">{renderMarkdown(msg.text)}</div> : <p style={{ fontSize:14.5, lineHeight:1.5 }}>{msg.text}</p>}
                  <div style={{ fontSize:11, opacity:0.5, marginTop:4, textAlign:"right", ...MONO }}>{msg.time}</div>
                </div>
              </div>
            ))}
            {typing && <div style={{ background:"#141B2E", borderRadius:22, border:"1px solid rgba(91,167,214,0.25)", width:"fit-content" }}><TypingIndicator/></div>}
            <div ref={endRef}/>
          </div>

          {/* Suggestions */}
          <div className="px-3 py-2 flex gap-2 overflow-x-auto flex-shrink-0" style={{ borderTop:"1px solid rgba(91,167,214,0.1)" }}>
            {ADMIN_SUGGESTIONS.map(s => (
              <button key={s} onClick={()=>send(s)}
                className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B", border:"1px solid rgba(91,167,214,0.2)" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 p-3 flex-shrink-0" style={{ borderTop:"1px solid rgba(91,167,214,0.2)", background:"#0A0F1A" }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send(input)}
              placeholder="Ask anything about the Command Center…"
              style={{ flex:1, border:"1px solid rgba(91,167,214,0.3)", borderRadius:12, padding:"8px 14px", fontSize:14.5, outline:"none", background:"#141B2E", color:"#FFFFFF" }}/>
            <button onClick={()=>send(input)} disabled={!input.trim()}
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width:38, height:38, background:input.trim()?"linear-gradient(135deg,#5BA7D6,#5B6EE1)":"rgba(91,167,214,0.15)", color:input.trim()?"#fff":"#D68FA8" }}>
              <Send size={16}/>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
