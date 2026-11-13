import React, { useState, useRef, useEffect } from "react";
import { Send, X, Minimize2, Maximize2, RefreshCw, Crown, Bot } from "lucide-react";
import { money, usePlatform } from "../services/platform";

const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
interface Message { id:string; role:"user"|"agent"; text:string; time:string; }

/* ═══════════════════════════════════════════════════════════════════
   ADMIN COMMAND CENTER KNOWLEDGE BASE
   Covers every tab, feature, workflow, and policy in the admin portal
═══════════════════════════════════════════════════════════════════ */
const ADMIN_KB: Record<string, string> = {

  // ── Overview ─────────────────────────────────────────────────────
  "overview": `The **Command Center Overview** is the platform at a glance:\n\n**KPI cards:** Total Users · Monthly Recurring Revenue (MRR, paying Stripe subscriptions only) · Storage Used\n\n**Revenue chart:** 6 months of MRR and overage from succeeded payments.\n\n**Plan mix:** how many accounts are on each plan.\n\n**ID Verification Queue:** the latest submissions waiting for review.\n\nPanels your role can't read say so instead of showing empty numbers.\n\nTo access: Admin Portal → Command Center → **Overview** tab.`,

  // ── Analytics ────────────────────────────────────────────────────
  "analytics": `The **Analytics** tab shows who your members are and how they use the app — all from live data:\n\n**Demographics:** gender, age, country, device and how people heard about FPD — from the optional questions at signup. Each panel shows how many members answered.\n\n**Engagement (last 30 days):** daily and monthly active users, average session length, and which screens people use — from in-app activity events.\n\n**Plans:** total users and the plan mix.\n\n**Not available:** churn and retention cohorts (account status keeps no history) and NPS (no survey is sent).\n\nTo access: Command Center → **Analytics** tab.`,

  // ── Users ────────────────────────────────────────────────────────
  "users": `The **Users Tab** gives you full visibility and control over all accounts:\n\n**Search:** By name, email, or user ID.\n\n**User table columns:** User ID · Name · Email · Plan · Storage Used · Joined Date · Status · Contacts · Referrals\n\n**Actions per user:** View profile, suspend, upgrade/downgrade plan, view audit trail.\n\n**Manually Onboarded Accounts:** Appears as a highlighted section showing accounts created by admins (not self-signed-up). Includes waiver reason, White Glove flag, and who onboarded them.\n\n**Onboard User button (top right):** 3-step wizard:\n1. Contact info + White Glove toggle\n2. Pick plan + optional subscription waiver (8 reasons: White Glove, Charity, Press, Partner, Beta, Employee, Influencer, Other)\n3. Review & create\n\nTo access: Command Center → **Users** tab.`,

  // ── Revenue ──────────────────────────────────────────────────────
  "revenue": `The **Revenue Tab** shows MRR breakdown by plan tier:\n\n**Plan MRR cards:** Starter · Foundation · Legacy Archive · Legacy Pro · Legacy Vault — each showing subscriber count and total MRR.\n\n**Overage revenue:** Separate from subscription MRR — charged at each plan's overage rate (set in Subscription Config).\n\n**Affiliate commissions:** Tracked separately — reduces net revenue.\n\n**Export:** Download the Revenue Trend report as CSV or JSON from the Reports & Downloads tab.\n\nTo access: Command Center → **Revenue** tab.`,

  // ── Storage ──────────────────────────────────────────────────────
  "storage": `The **Storage Tab** shows platform-wide consumption:\n\n**Per-plan breakdown:** Storage used vs. allocated for each plan tier.\n\n**Top users by usage:** Sorted by GB consumed.\n\n**Alert status:** Shows how many users are at 80% / 90% / 95% / 100% thresholds.\n\n**Overage billing:** Automatic — billed at the end of each period at the plan's overage rate (Subscription Config). Starter has no overage.\n\n**Full storage reports** available in the Reports & Downloads tab (Storage Usage by User, Storage Alert History).\n\nTo access: Command Center → **Storage** tab.`,

  // ── ID Verification ──────────────────────────────────────────────
  "id verification": `The **ID Verification Queue** handles photo ID submissions from legacy contacts:\n\n**Each submission shows:** contact name · the account it belongs to · ID type · submitted date · the ID images.\n\n**Actions:** Approve or Reject (with a reason), and private review notes.\n\n**After a decision:** the contact's status changes in the owner's Legacy Contacts, and the contact is emailed the decision.\n\nID submissions only arrive while the **ID Verification** feature flag is on (System → Settings → Feature flags).\n\nTo access: Command Center → **ID Verification** tab.`,

  // ── Payouts ──────────────────────────────────────────────────────
  "payouts": `The **Payouts Tab** is the record of affiliate and partner commission payouts:\n\n**Generate payouts:** creates one pending payout per affiliate or partner with an unpaid balance, from the commission ledgers.\n\n**Mark paid:** send the money outside the app (bank transfer, PayPal, check), then mark the payout paid. The app does not move money itself.\n\n**Affiliate rates:** 20% (up to 24 active referrals) · 25% (25–74) · 30% (75+), for 12 months per referral. Tiers rise automatically.\n\n**Partner rates:** 20% (up to 50 accounts) · 25% (51–100) · 30% (101+), for the life of each account. Tiers rise automatically; an admin can also set them.\n\n**Export:** Export CSV on the Payouts tab, or Reports & Downloads.\n\nTo access: Command Center → **Payouts** tab.`,

  // ── $199 Fee Admin ───────────────────────────────────────────────
  "199 fee": `The **Activate Legacy Access Tab** is where admins activate vault access after a user passes:\n\n**Table shows:** Account name · Email · Plan · Paid By (owner or legacy contact) · Payment date · Amount · Status (Paid / Pending) · Activated (yes/no)\n\n**Activation workflow:**\n1. Legacy contact submits confirmation of passing (death cert, obituary, coroner report, hospital record, funeral home letter, probate filing, or any credible official record)\n2. Admin reviews the document\n3. Admin clicks **"Activate"** on the account row\n4. Vault opens for all verified legacy contacts for the configured continuation period (default 24 months)\n\n**IMPORTANT:** Verification and admin approval are required, with a follow-up confirmation of death once received. Stripe payment is non-refundable.\n\n**Configuration options:** Set the default continuation period (months) and alert threshold.\n\nTo access: Command Center → **Continuation Vault** tab.`,

  // ── Audit Log ────────────────────────────────────────────────────
  "audit log": `The **Audit Log** records every change an admin makes through the Command Center:\n\n**Each entry:** time · admin · the action (method and page) · the target it touched.\n\n**Per user:** a user's own Audit Log tab (open the user) lists the actions taken on that account.\n\n**Export:** Reports & Downloads → Audit Log, or Admin Settings → Data exports.\n\n**Clearing:** admins with Audit delete permission can clear the log, and that can't be undone, so export a copy first.\n\nTo access: Command Center → **Audit Log** tab.`,

  // ── Push Notifications ───────────────────────────────────────────
  "push notifications": `The **Push Notification Center** sends announcements to members:\n\n**Compose:** type (Marketing / Feature / Update / Alert / Reminder), audience (everyone, a plan, or White Glove clients), channel (in-app + device push, email, or both), title and message.\n\n**Send now or schedule:** a scheduled announcement goes out within the hour after the time you pick, and can be cancelled until then.\n\n**Delivery:** every recipient gets it in their Notifications tab; device push reaches people who turned it on; email skips anyone who opted out.\n\n**History:** each announcement with its status (scheduled / sent / cancelled / failed) and recipient count. Opens aren't tracked.\n\nTo access: Command Center → **Push Notifications** tab.`,

  // ── Admin Team ───────────────────────────────────────────────────
  "admin team": `The **Admin Team Tab** manages who has access to the Command Center:\n\n**6 Role Presets:**\n• 👑 **Super Admin** — unrestricted everything (cannot be limited)\n• 🟣 **Operations Manager** — view/edit users, WG, verification, notifications\n• 🟢 **Finance Manager** — revenue, payouts, $199 fee, crypto config\n• 🟠 **White Glove Manager** — WG clients, waivers, billing, staff only\n• 🔵 **Support Agent** — view/edit users and White Glove only\n• 🔴 **Content Admin** — email templates and push notifications only\n\n**Invite flow:**\n1. Enter name, email and role → the permission preview shows which modules are unlocked\n2. The invite is emailed with a one-time accept link (valid 72 hours). If the email can't be sent, the link is shown so you can copy and send it\n3. They choose a password on the accept page and can sign in\n\nOnly a super admin can invite admins, change roles or resend invites.\n\n**Per-module permissions:** View / Edit / Delete can be toggled individually for 16 modules after account creation.\n\n**Account actions:** Suspend (immediate), Reactivate, Resend Invite.\n\nTo access: Command Center → **Admin Team** tab.`,

  // ── Reports & Downloads ──────────────────────────────────────────
  "reports": `The **Reports & Downloads Tab** exports live data straight from the database:\n\n**Reports with live data:** Revenue Trend · Payout History · $199 Continuation Fee Log · Full User Roster · New Signups · Storage Usage by User · ID Verification · Affiliate Performance · Partner Activity · Audit Log Export\n\n**Reports without a data source** say so on their card instead of producing a file.\n\n**Formats:** CSV / JSON\n\n**Date ranges:** Last 7 / 30 / 90 days, Year to date, All time (on reports that have a date column)\n\n**This Session's Exports:** Files you generated since the page loaded, with their real size and row count. Nothing is stored on the server.\n\nTo access: Command Center → **Reports & Downloads** tab.`,

  // ── White Glove Admin ────────────────────────────────────────────
  "white glove admin": `The **White Glove Admin** section manages the concierge program:\n\n**3 tabs:**\n\n⭐ **Clients** — every WG client with status (Intake/Active/Completed/Paused), specialist, completion % and sessions. Enrol an existing account, assign a specialist, and optionally waive their plan (a comped plan; needs Subscription edit).\n\n📄 **Authorization Waivers** — the e-signature waivers clients sign before a specialist can work in their account: send, track status, and preview.\n\n💳 **Billing** — each client's card on file and their own session charges.\n\nSpecialists are managed in **Concierge Staff**: invite them, assign clients, reset passwords. Each specialist signs in to the Concierge Portal and sees only their assigned clients.\n\n**Pricing:** {WG_SETUP} setup fee + {WG_SESSION} per 30-min block (set in Subscription Config). Any time used = 1 full block. A single session can be at most 8 hours.\n\nTo access: Admin Portal → White Glove Concierge section.`,

  // ── White Label ──────────────────────────────────────────────────
  "white label": `The **White Label Onboarding Control** manages enterprise WL partners:\n\n**Packages:** names, user limits, monthly price and setup fee are all set in the **Packages** sub-tab and shown live on the landing page.\n\n**Paying the setup fee** (Stripe Checkout) unlocks White Label on the buyer's account automatically; **WL Sales → Unlocked** lets you activate or revoke it by hand.\n\n**Billing models:** Flat monthly · Per-user flat $ · % of revenue (configured per customer in backend)\n\n**Live sync:** Editing a package in admin instantly updates the public landing page (pub/sub).\n\n**4 sub-tabs:** Packages · WL Sales · Onboarding Links · Payment Processors\n\n**WL Sales table:** Org name, contact, package, active users, MRR, setup paid, status, last payout.\n\nTo access: Admin Portal → WL Onboarding Control.`,

  // ── Subscription Config ──────────────────────────────────────────
  "subscription config": `The **Subscription Configuration** panel lets you adjust plan pricing in real time:\n\n**Configurable per plan:** Monthly price · Annual discount % · Storage allowance (GB) · Overage rate ($/GB) · Max contacts\n\n**5 plans:** Starter · Foundation · Legacy Archive · Legacy Pro · Legacy Vault\n\n**Storage alert thresholds:** Warning (80%) · Recommended (90%) · Critical (95%) · Overage (100%)\n\n**Live propagation:** Changes update the public pricing page immediately — no deployment needed.\n\n**Important:** After changing prices, update Stripe product prices in the dashboard and update the subscription_plans database table with the new Stripe price IDs.\n\nTo access: Admin Portal → Subscription Config.`,

  // ── Email Templates ──────────────────────────────────────────────
  "email templates": `The **Email Templates** panel lets you change the wording of the emails the platform sends:\n\n**Categories:** Billing · Concierge · Contacts · Legacy · Messages · Security (the chips at the top list exactly what exists).\n\n**Each template:** subject line and HTML body. In the subject, {{subject}} stands for the standard subject; in the body, {{content}} stands for the standard message. Keep {{content}} or the standard body is used.\n\n**Turn a template off** to go back to the standard email.\n\nTo access: Admin Portal → Email Templates.`,

  // ── Crypto Merchant ──────────────────────────────────────────────
  "crypto": `The **Crypto Merchant Config** panel manages cryptocurrency payment processors:\n\n**Supported processors:** Coinbase Commerce · BitPay · NOWPayments · Stripe Crypto · Crypto.com Pay · Strike Lightning · Square · Braintree (disabled by default) · Custom Processor\n\n**Supported coins:** BTC · ETH · USDC · USDT · SOL · BNB · XRP · LTC\n\n**Where crypto is accepted:** {CONTINUATION_FEE} Legacy Continuation Fee · Plan upgrades · Partner {PARTNER_FEE} setup fee\n\n**Setting default:** Only one processor can be set as default. Others are available as alternatives.\n\n**All crypto settles to USD automatically** via the processor.\n\n**Webhook endpoints:** Each processor has its own webhook — register in the processor's dashboard pointing to /webhooks/[processor-name].\n\nTo access: Admin Portal → Crypto Merchant Config.`,

  // ── Continuation Fee Admin ───────────────────────────────────────
  "continuation fee": `This is the same as the **Activate Legacy Access Tab** — see "199 fee" topic.\n\nKey admin responsibilities:\n1. Monitor the fee payment table daily\n2. When a user passes: verify the submitted documentation\n3. Click "Activate" to open vault access for legacy contacts\n4. Documentation accepted: death certificates, obituaries, hospital/hospice records, coroner reports, funeral home letters, probate filings, or any credible official record\n5. Verification and admin approval required — with a follow-up confirmation of death once received`,

  // ── Onboarding New Hire ──────────────────────────────────────────
  "new hire": `**Welcome to the Final Pass Down Command Center!** Here's a quick-start guide by department:\n\n**📊 Operations Manager:**\nStart with the Overview tab → Analytics tab → Users tab. Your key responsibility is monitoring vault completion rates, ID verification queue, and White Glove client health.\n\n**💰 Finance Manager:**\nStart with Revenue tab → Payouts tab → Continuation Vault tab. Run the MRR Summary and Payout History reports from Reports & Downloads to understand our revenue structure.\n\n**⭐ White Glove Manager:**\nGo to the White Glove admin section → review all 4 sub-tabs (Clients, Waivers, Staff, Billing). Learn the {WG_SETUP} setup + {WG_SESSION}/30-min billing model. Each specialist sees only their assigned clients in the Concierge Portal.\n\n**🔔 Content Admin:**\nYour two areas: Push Notifications and Email Templates. Review the 16 existing email templates before making changes. Use the preview panel when composing push notifications.\n\n**🔐 Support Agent:**\nFocus on Users tab (search and assist users) and White Glove clients. You cannot access financial data — escalate revenue questions to the Finance Manager.\n\nAsk me about any specific tab or workflow!`,

  // ── Partner Program ──────────────────────────────────────────────
  "partner": `**Partner Program** admin management:\n\n**Partner vs. Affiliate:**\n• Affiliates: 20–30% for 12 months per referral (time-capped)\n• Partners: 20–30% lifetime — no time cap (for businesses, {PARTNER_FEE} one-time setup fee)\n\n**Partner rate:** set per partner (20% by default) in Partnership Admin. It is earned automatically on every paid plan invoice of each referred account, for the life of the account; refunds and disputes reverse it.\n\n**Admin view:** Partner performance table with active accounts, MRR, total paid, last payout date, and status.\n\n**Onboarding:** Partners complete a 4-step wizard with the {PARTNER_FEE} setup payment (card or crypto). Appears in the Partnership Admin tab.\n\n**Commission payouts:** Payouts → **Create partner payouts** turns unpaid balances into pending payouts; send the money outside FPD, then mark them paid.`,

  // ── ID Verification Process ──────────────────────────────────────
  "verify id": `**ID Verification Step-by-Step (Admin):**\n\n1. Check the **ID Verification** tab — badge shows pending count\n2. Click on a pending submission to review\n3. Examine the submitted ID photo for:\n   • Legibility (text must be readable)\n   • Match between name on ID and contact name in system\n   • ID expiry date (must be valid)\n   • Photo match (if available)\n4. If approved → click **Verify** → contact status changes to VERIFIED\n5. If rejected → click **Reject** → select reason → contact receives resubmit email\n6. SLA: Process within 1–2 business days\n7. Log your action — automatically recorded in Audit Log\n\n**Edge cases:**\n• Expired ID: Request renewal ID\n• Name mismatch: Request explanation or additional documentation\n• Photo unclear: Request resubmission with better lighting`,

  // ── Default ──────────────────────────────────────────────────────
  "default": `I'm **Josh**, the Command Center's built-in guide. I answer from a guide to every admin screen (I'm not a person and can't see live data).\n\nI can help you with:\n\n📊 **Analytics & Reporting** — interpreting dashboards, running reports\n👥 **User Management** — searching users, onboarding, suspensions\n💰 **Revenue & Payouts** — MRR, commissions, affiliate tiers\n⭐ **White Glove Program** — clients, sessions, billing, staff\n🔔 **Push Notifications** — composing, targeting, delivery channels\n🛡️ **ID Verification** — queue management, approval workflow\n🔐 **Vault Activation** — Legacy Continuation Fee, confirmation of passing, admin activation\n👑 **Admin Team** — roles, permissions, inviting new admins\n📋 **Reports** — live exports, formats, date ranges\n🆕 **New Hire Onboarding** — department-specific guidance\n\nJust ask — what do you need help with?`,
};

/* Prices in the answers come from the live catalog (/public/platform) so
   they always match what checkout charges. */
interface LivePrices { partnerFee: string; continuationFee: string; wgSetup: string; wgSession: string }

function getAdminResponse(query: string, prices: LivePrices): string {
  return answerFor(query)
    .split("{PARTNER_FEE}").join(prices.partnerFee)
    .split("{CONTINUATION_FEE}").join(prices.continuationFee)
    .split("{WG_SETUP}").join(prices.wgSetup)
    .split("{WG_SESSION}").join(prices.wgSession);
}

function answerFor(query: string): string {
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
  if (q.match(/partner.*program|partner.*tier|partner.*commission|setup fee/)) return ADMIN_KB["partner"];
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
      <p key={i} style={{ color:"#8A9AB8", fontSize:16, lineHeight:1.7, margin:"2px 0" }}>
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
  const platform = usePlatform();
  const livePrices: LivePrices = {
    partnerFee: platform.prices.partnerSetup != null ? money(platform.prices.partnerSetup) : "(price not set yet)",
    continuationFee: money(platform.continuationFee.amount),
    wgSetup: platform.prices.whiteGloveSetup != null ? money(platform.prices.whiteGloveSetup) : "(price not set yet)",
    wgSession: platform.prices.whiteGloveSession != null ? money(platform.prices.whiteGloveSession) : "(price not set yet)",
  };
  const [open, setOpen] = useState(inline);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id:"init", role:"agent",
    text: ADMIN_KB["default"],
    time: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
  }]);
  const [input, setInput] = useState("");
  const typing = false;   // answers are instant; kept for the indicator markup
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
    // Answers come from the built-in guide, so they're shown straight away.
    setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:"agent", text:getAdminResponse(text, livePrices), time }]);
  };

  const wrapStyle: React.CSSProperties = inline
    ? { display:"flex", flexDirection:"column", height:"calc(100vh - 120px)", borderRadius:22, overflow:"hidden", border:"1.5px solid rgba(91,167,214,0.35)", background:"#101728", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)" }
    : { position:"fixed", bottom:96, right:24, zIndex:50, display:"flex", flexDirection:"column", borderRadius:22, overflow:"hidden", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 20px 60px rgba(0,0,0,0.5)", width:"min(390px, calc(100vw - 48px))", maxHeight:"calc(100vh - 116px)", height:minimized?"auto":580, background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)" };

  if (!open && !inline) return (
    <button onClick={() => setOpen(true)} title="Ask Josh" aria-label="Ask Josh"
      className="flex items-center justify-center rounded-full shadow-2xl"
      style={{ position:"fixed", bottom:96, right:24, zIndex:50, width:58, height:58, background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", boxShadow:"0 8px 32px rgba(91,167,214,0.45)" }}>
      <Crown size={22}/>
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
            <div style={{ color:"#fff", fontSize:16, fontWeight:700 }}>Ask Josh</div>
            <div className="flex items-center gap-1">
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12.5, ...MONO }}>Command Center Expert</span>
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
                  {msg.role==="agent" ? <div className="space-y-1">{renderMarkdown(msg.text)}</div> : <p style={{ fontSize:16, lineHeight:1.5 }}>{msg.text}</p>}
                  <div style={{ fontSize:12.5, opacity:0.5, marginTop:4, textAlign:"right", ...MONO }}>{msg.time}</div>
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
              style={{ flex:1, border:"1px solid rgba(91,167,214,0.3)", borderRadius:12, padding:"8px 14px", fontSize:16, outline:"none", background:"#141B2E", color:"#FFFFFF" }}/>
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
