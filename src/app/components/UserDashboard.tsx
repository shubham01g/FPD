import React from "react";
import {
  Archive, Users, HardDrive, TrendingUp, AlertTriangle, AlertCircle, FileText,
  ArrowRight, Bell, Plus, ShieldCheck, Check
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { STORAGE_BREAKDOWN } from "../utils/storageBreakdown";
import heroFamilyPhoto from "../../imports/dashboard_hero_family.png";

interface UserDashboardProps { onNavigate: (page: string) => void; }

/* ── Royal Vault Blue palette (unchanged brand tokens) ── */
const TEXT     = "#EFF2F9";
const SOFT     = "#BCC5DA";
const FAINT    = "#929CBC";
const ACCENT   = "#5B6EE1";
const ACCENT2  = "#5BA7D6"; /* sky */
const ACCENT_D = "#7E6BD8"; /* accent-deep */
const MINT     = "#6FAE8B";
const POS      = "#5FBE91"; /* good */
const WARN     = "#D9A55E";
const NEG      = "#D06B6B"; /* critical */
const SURFACE2 = "#101728";
const LINE_SOFT   = "rgba(255,255,255,0.045)";
const LINE_SOFT_2 = "rgba(255,255,255,0.13)";

/* Calm, cool storage palette — applied dashboard-side only, so the shared
   STORAGE_BREAKDOWN (and the Usage & Billing page) keep their own category
   colours untouched. */
const STORAGE_RAMP = ["#5BA7D6", "#6F9E94", "#7E6BD8", "#5BA7D6", "#6FAE8B", "#97A2C6"];

const storageHistory = [
  { month: "Jan", used: 4.2 }, { month: "Feb", used: 6.8 }, { month: "Mar", used: 9.1 },
  { month: "Apr", used: 11.5 }, { month: "May", used: 14.3 }, { month: "Jun", used: 16.9 },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* Icon-chip tone → colour, used for the readiness ring and the at-a-glance stats. */
const TONES: Record<string, { bg: string; fg: string }> = {
  accent:   { bg: "linear-gradient(150deg, rgba(91,110,225,0.32), rgba(91,110,225,0.09))",  fg: "#AEB9F5" },
  sky:      { bg: "linear-gradient(150deg, rgba(91,167,214,0.32), rgba(91,167,214,0.09))",  fg: "#9FD3EE" },
  mint:     { bg: "linear-gradient(150deg, rgba(111,174,139,0.32), rgba(111,174,139,0.09))", fg: "#A9DABC" },
  good:     { bg: "linear-gradient(150deg, rgba(95,190,145,0.30), rgba(95,190,145,0.09))",   fg: "#A9E6C4" },
  warn:     { bg: "linear-gradient(150deg, rgba(217,165,94,0.30), rgba(217,165,94,0.09))",   fg: "#F0C088" },
  critical: { bg: "linear-gradient(150deg, rgba(208,107,107,0.30), rgba(208,107,107,0.09))", fg: "#F0A9A9" },
};
function Chip({ tone, size = 34, iconSize = 16, children }: { tone: string; size?: number; iconSize?: number; children: React.ReactNode }) {
  const t = TONES[tone] ?? TONES.accent;
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.36), flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: t.bg, color: t.fg, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {children}
    </div>
  );
}

/* Per-category / per-type hue — the same "one hue per kind of thing" language
   LifeCalendar uses for its event sources, applied here to document rows and
   notification rows (icon chip + tinted border + coloured meta text). */
const DOC_HUE: Record<string, string> = { legal: "#6E90C9", financial: "#6FAE8B", digital: "#97A2C6", medical: "#D99A6B", personal: "#A98CC7" };
const NOTIF_HUE: Record<string, string> = { info: ACCENT2, success: POS, warning: WARN, error: NEG };
const NOTIF_ICON: Record<string, React.ReactNode> = {
  info: <Bell size={15} />, success: <Check size={15} />, warning: <AlertTriangle size={15} />, error: <AlertCircle size={15} />,
};

const DASH_CSS = `
.fpd-dash{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-dash *{box-sizing:border-box;}
.fpd-dash-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.02;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-dash .wrap{max-width:1340px;margin:0 auto;padding:30px 34px 30px;display:flex;flex-direction:column;gap:24px;position:relative;z-index:1;}

.fpd-dash .card{background:${SURFACE2};border:1px solid ${LINE_SOFT};border-radius:22px;}
.fpd-dash .card.pad{padding:30px;}
.fpd-dash .sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;gap:12px;}
.fpd-dash .sec-title{font-size:18px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);}
.fpd-dash .sec-title .tick{width:4px;height:16px;border-radius:3px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-dash .sec-link{color:${SOFT};font-size:14px;font-weight:500;display:inline-flex;align-items:center;gap:5px;transition:color .15s,background .15s;background:none;border:none;cursor:pointer;font-family:var(--font-body);padding:5px 10px;margin:-5px -10px;border-radius:99px;}
.fpd-dash .sec-link:hover{color:${MINT};background:rgba(111,174,139,0.1);}

/* hero banner — full-bleed photo, tinted toward the brand palette via
   background-blend-mode rather than a flat color overlay, so it still reads
   as a photo. Hover zooms the art layer only; text stays put. */
.fpd-dash .hbanner{position:relative;overflow:hidden;border-radius:24px;min-height:320px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid ${LINE_SOFT};isolation:isolate;flex-shrink:0;}
.fpd-dash .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center 35%;background-blend-mode:color;}
.fpd-dash .hbanner:hover .art{transform:scale(1.08);}
.fpd-dash .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 30%,rgba(7,10,18,0.55) 58%,rgba(7,10,18,0.15) 100%);pointer-events:none;}
.fpd-dash .hbanner .hcontent{position:relative;z-index:2;padding:40px 42px;display:flex;flex-direction:column;justify-content:center;max-width:540px;}
.fpd-dash .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 14px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:18px;font-family:var(--font-mono);}
.fpd-dash .hbanner h1{font-family:var(--font-display);font-size:42.5px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;margin:0 0 14px;color:${TEXT};}
.fpd-dash .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-dash .hbanner p{color:${SOFT};font-size:16px;line-height:1.65;max-width:420px;margin:0 0 26px;}
.fpd-dash .hbanner .hactions{display:flex;gap:12px;flex-wrap:wrap;}
.fpd-dash .hbanner .hbtn{display:inline-flex;align-items:center;gap:9px;padding:12px 20px;border-radius:99px;font-size:14.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-dash .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-dash .hbanner .hbtn.primary{background:linear-gradient(180deg,${ACCENT_D},${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-dash .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-dash .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-dash .hbanner{min-height:auto;} .fpd-dash .hbanner .hcontent{padding:28px 24px;max-width:none;} .fpd-dash .hbanner h1{font-size:31.5px;}}

/* header */
.fpd-dash .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-dash .pg-h1{font-size:34.5px;color:${TEXT};font-weight:600;margin:7px 0;letter-spacing:-0.01em;font-family:var(--font-display);}
.fpd-dash .pg-h1 .accent-name{color:${ACCENT2};}
.fpd-dash .pg-sub{color:${SOFT};font-size:16px;line-height:1.5;}
.fpd-dash .head-r{display:flex;align-items:center;gap:16px;}
.fpd-dash .head-meta{text-align:right;line-height:1.35;}
.fpd-dash .head-meta .a{font-size:12px;color:${FAINT};}
.fpd-dash .head-meta .b{font-size:14px;color:${SOFT};}
.fpd-dash .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:99px;background:linear-gradient(180deg,${ACCENT_D},${ACCENT});color:#fff;font-size:14.5px;font-weight:600;box-shadow:0 14px 30px -12px rgba(91,110,225,0.85),inset 0 1px 0 rgba(255,255,255,0.18);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* storage alert */
.fpd-dash .salert{display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:16px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.24);}
.fpd-dash .salert .msg{flex:1;font-size:15px;}
.fpd-dash .salert button{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:99px;background:rgba(217,165,94,0.16);color:${WARN};font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}

/* ── Row 1 — vault readiness card, full width ── */
.fpd-dash .ready{display:flex;align-items:center;gap:36px;padding:32px 36px;background:linear-gradient(120deg,#111A2C 0%,#0B1220 60%,#0C1322 100%);border-color:rgba(91,110,225,0.18);}
@media (max-width:720px){.fpd-dash .ready{flex-direction:column;align-items:flex-start;gap:22px;}}
.fpd-dash .ring-col{display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0;}
.fpd-dash .ring-wrap{position:relative;width:132px;height:132px;flex-shrink:0;}
.fpd-dash .ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.fpd-dash .ring-em{margin-bottom:6px;}
.fpd-dash .ring-center b{font-family:var(--font-display);font-size:23.5px;font-weight:600;color:${TEXT};line-height:1;}
.fpd-dash .ring-tag{font-size:13px;font-weight:600;}
.fpd-dash .ready-info{flex:1;min-width:0;}
.fpd-dash .ready-info h2{font-size:27px;font-weight:600;color:${TEXT};margin-bottom:8px;letter-spacing:-0.01em;font-family:var(--font-display);}
.fpd-dash .ready-info p{color:${SOFT};font-size:15.5px;line-height:1.6;max-width:560px;margin-bottom:16px;}
.fpd-dash .finish{display:inline-flex;align-items:center;gap:7px;margin-bottom:18px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,${ACCENT_D},${ACCENT});color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-dash .finish:hover{filter:brightness(1.08);}
.fpd-dash .ess-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 14px;}
@media (max-width:900px){.fpd-dash .ess-list{grid-template-columns:1fr 1fr;}}
@media (max-width:640px){.fpd-dash .ess-list{width:100%;grid-template-columns:1fr;}}
.fpd-dash .ess{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid ${LINE_SOFT};cursor:pointer;text-align:left;width:100%;transition:border-color .15s,background .15s,transform .15s;font-family:var(--font-body);}
.fpd-dash .ess:hover{border-color:rgba(91,110,225,0.4);background:rgba(91,110,225,0.06);transform:translateY(-1px);}
.fpd-dash .ess .lbl{font-size:14.5px;color:${SOFT};}

/* ── Row 2 — bare 2x2 kpi grid (no card, no highlight) + Quick Actions card ── */
.fpd-dash .row2{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:stretch;}
@media (max-width:820px){.fpd-dash .row2{grid-template-columns:1fr;}}
.fpd-dash .kpi-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:14px;}
.fpd-dash .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid ${LINE_SOFT};transition:background .15s,border-color .15s,transform .15s;text-align:left;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .kpi-mini:hover{background:${SURFACE2};border-color:${LINE_SOFT_2};transform:translateY(-1px);}
.fpd-dash .kpi-mini-txt{flex:1;min-width:0;}
.fpd-dash .kpi-mini-val{font-family:var(--font-display);font-size:23.5px;font-weight:600;color:${TEXT};line-height:1.15;font-variant-numeric:tabular-nums;}
.fpd-dash .kpi-mini-lbl{font-size:12.5px;color:${FAINT};margin-top:4px;}
.fpd-dash .kpi-mini-sub{font-size:12.5px;color:${SOFT};margin-top:4px;display:flex;align-items:center;gap:5px;}
.fpd-dash .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.fpd-dash .qa-card{display:flex;flex-direction:column;}
.fpd-dash .qa-grid{display:flex;flex-direction:column;gap:9px;flex:1;justify-content:space-between;}
.fpd-dash .qa-btn{display:flex;align-items:center;gap:12px;padding:12px 13px;border-radius:15px;text-align:left;border:1px solid;cursor:pointer;background:none;font-family:var(--font-body);transition:transform .15s;}
.fpd-dash .qa-btn:hover{transform:translateY(-1px);}
.fpd-dash .qa-ico{width:32px;height:32px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-dash .qa-txt{flex:1;min-width:0;}
.fpd-dash .qa-txt b{display:block;font-size:14.5px;font-weight:600;color:${TEXT};}
.fpd-dash .qa-txt i{display:block;font-style:normal;font-size:12.5px;color:${FAINT};margin-top:2px;}

/* ── Row 3 — storage & usage (with trend graph) ── */
.fpd-dash .stor-fig{display:flex;align-items:baseline;gap:10px;margin-bottom:18px;flex-wrap:wrap;}
.fpd-dash .stor-fig .big{font-family:var(--font-display);font-size:31.5px;font-weight:600;color:${TEXT};letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-dash .stor-fig .of{color:${FAINT};font-size:15px;}
.fpd-dash .stor-fig .free{margin-left:auto;font-size:13px;color:${SOFT};padding:5px 11px;border-radius:99px;background:${SURFACE2};border:1px solid ${LINE_SOFT};}
.fpd-dash .meter{display:flex;height:11px;border-radius:99px;overflow:hidden;background:${SURFACE2};margin-bottom:14px;gap:2px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.4);}
.fpd-dash .meter i{display:block;height:100%;}
.fpd-dash .uf{display:flex;gap:22px;margin-bottom:20px;flex-wrap:wrap;}
.fpd-dash .uf-i{display:flex;align-items:center;gap:7px;font-size:13.5px;color:${SOFT};}
.fpd-dash .uf-i b{font-family:var(--font-body);color:${TEXT};font-weight:600;margin-left:1px;font-variant-numeric:tabular-nums;}
.fpd-dash .uf-d{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.fpd-dash .uf-d.used{background:${ACCENT2};}
.fpd-dash .uf-d.free{background:transparent;border:1.5px solid ${FAINT};}
.fpd-dash .leg{width:100%;}
.fpd-dash .leg-row{display:flex;align-items:center;gap:11px;padding:10px 6px;border-top:1px solid ${LINE_SOFT};font-size:14px;border-radius:9px;transition:background .15s;}
.fpd-dash .leg-row:first-child{border-top:none;}
.fpd-dash .leg-row .sw{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.fpd-dash .leg-row .nm{color:${SOFT};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fpd-dash .leg-row .gb{color:${TEXT};font-variant-numeric:tabular-nums;}
.fpd-dash .leg-row .pc{color:${FAINT};width:48px;text-align:right;font-variant-numeric:tabular-nums;}
.fpd-dash .trend{margin-top:18px;padding-top:18px;border-top:1px solid ${LINE_SOFT};}
.fpd-dash .trend-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.fpd-dash .trend-head .t{font-size:12.5px;color:${FAINT};font-weight:600;}
.fpd-dash .trend-head .v{font-size:12.5px;color:${MINT};font-weight:600;}
.fpd-dash .months{display:flex;justify-content:space-between;margin-top:8px;}
.fpd-dash .months span{font-size:11px;color:${FAINT};}

/* ── Row 4 — recent documents + notifications (shared evrow pattern, same
   colour-coded-card language LifeCalendar uses for its event rows) ── */
.fpd-dash .row4{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start;}
@media (max-width:980px){.fpd-dash .row4{grid-template-columns:1fr;}}
.fpd-dash .evlist{display:flex;flex-direction:column;gap:11px;}
.fpd-dash .evrow{display:flex;align-items:center;gap:14px;padding:15px 17px;border-radius:16px;background:rgba(255,255,255,0.024);border:1px solid;transition:opacity .15s;width:100%;text-align:left;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .evrow.read{opacity:0.6;cursor:default;}
.fpd-dash .evico{width:42px;height:42px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-dash .evbody{flex:1;min-width:0;}
.fpd-dash .evtop{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.fpd-dash .evt{font-size:15px;font-weight:600;color:${TEXT};}
.fpd-dash .evmeta{font-size:13px;margin-top:4px;font-weight:600;}
.fpd-dash .evdet{color:${FAINT};font-size:13px;line-height:1.5;margin-top:3px;}
.fpd-dash .evstatus{font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px;flex-shrink:0;white-space:nowrap;}
.fpd-dash .grid-legend{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-top:16px;padding-top:16px;border-top:1px solid ${LINE_SOFT};}
.fpd-dash .legend-item{display:flex;align-items:center;gap:7px;font-size:13px;color:${SOFT};font-weight:500;}
.fpd-dash .legend-item .dt{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.fpd-dash .legend-note{font-size:12.5px;color:${FAINT};margin-left:auto;}
`;

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user, docs, contacts, wishes, notifications } = useDemo();

  const firstName = user.name.split(" ")[0];
  const used = user.storageUsed, total = user.storageLimit;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const freeGb = Math.max(0, total - used);

  const docsTotal = docs.length;
  const docsPending = docs.filter(d => d.status === "pending").length;
  const docCategories = Array.from(new Set(docs.map(d => d.category)));

  const legacyContacts = contacts.filter(c => c.type === "legacy");
  const guardianContacts = contacts.filter(c => c.type === "guardian");
  const legacyVerified = legacyContacts.filter(c => c.verificationStatus === "verified").length;

  /* ── Usage breakdown, re-coloured with the monochrome ramp for the dashboard ── */
  const breakdownTotalGb = STORAGE_BREAKDOWN.reduce((a, c) => a + c.gb, 0) || 1;
  const breakdown = STORAGE_BREAKDOWN
    .map(c => ({ ...c, pct: (c.gb / breakdownTotalGb) * 100 }))
    .sort((a, b) => b.gb - a.gb)
    .map((c, i) => ({ ...c, color: STORAGE_RAMP[i] ?? c.color }));

  /* ── The six essentials that drive the readiness ring ── */
  const essentials = [
    { label: "Will or trust", done: docs.some(d => d.category === "legal"), page: "wills-trusts" },
    { label: "Legacy contact", done: legacyVerified > 0, page: "contacts-legacy" },
    { label: "Financial records", done: docs.some(d => d.category === "financial"), page: "financial-records" },
    { label: "Final wishes", done: wishes.length > 0, page: "final-wishes" },
    { label: "Guardian assigned", done: guardianContacts.length > 0, page: "contacts-legacy" },
    { label: "Digital assets", done: docs.some(d => d.category === "digital"), page: "password-manager" },
  ];
  const doneCount = essentials.filter(e => e.done).length;
  const readyPct = Math.round((doneCount / essentials.length) * 100);
  const sealed = doneCount === essentials.length;
  const nextUp = essentials.find(e => !e.done);

  const unread = notifications.filter(n => !n.read).length;

  const statCards = [
    { label: "Legacy Documents", value: String(docsTotal), sub: `${docsPending} pending review`, icon: <Archive size={16} />, page: "file-cabinet", tone: "warn", dot: WARN },
    { label: "Legacy Contacts", value: String(legacyContacts.length), sub: `${legacyVerified} verified`, icon: <Users size={16} />, page: "contacts-legacy", tone: "good", dot: POS },
    { label: "Storage Used", value: `${used} GB`, sub: `${pct}% of ${total} GB`, icon: <HardDrive size={16} />, page: "storage-usage", tone: "sky", dot: ACCENT2 },
    { label: "Referral Earnings", value: "$284.50", sub: "This month", icon: <TrendingUp size={16} />, page: "affiliate", tone: "accent", dot: ACCENT },
  ];

  const quickActions = [
    { icon: <Plus size={16} />, label: "Add document", sub: "Upload to your vault", page: "file-cabinet", hue: ACCENT },
    { icon: <Users size={16} />, label: "Add contact", sub: "Assign legacy access", page: "contacts-legacy", hue: POS },
    { icon: <HardDrive size={16} />, label: "Check storage", sub: "Review usage & billing", page: "storage-usage", hue: ACCENT2 },
    { icon: <TrendingUp size={16} />, label: "Refer & earn", sub: "Share your link", page: "affiliate", hue: MINT },
  ];

  /* ── Readiness ring geometry ── */
  const RING = 132, RC = RING / 2, RR = 57, RST = 7;
  const RCIRC = 2 * Math.PI * RR;
  const ROFF = RCIRC * (1 - readyPct / 100);

  /* ── 6-month trend area chart ── */
  const vals = storageHistory.map(d => d.used);
  const CW = 300, CH = 88, cpt = 8, cpb = 8, innerH = CH - cpt - cpb;
  const maxV = Math.max(18, Math.ceil(Math.max(...vals) / 6) * 6);
  const cx = (i: number) => (i / (vals.length - 1)) * CW;
  const cy = (v: number) => cpt + (1 - v / maxV) * innerH;
  let linePath = "";
  vals.forEach((v, i) => { linePath += `${i ? "L" : "M"} ${cx(i).toFixed(1)} ${cy(v).toFixed(1)} `; });
  const areaPath = `M ${cx(0).toFixed(1)} ${CH - cpb} ${linePath}L ${CW} ${CH - cpb} Z`;
  const gridYs = [0.33, 0.67, 1].map(f => cpt + (1 - f) * innerH);
  const trendDelta = (vals[vals.length - 1] - vals[0]).toFixed(1);
  const lastX = cx(vals.length - 1), lastY = cy(vals[vals.length - 1]);

  const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="fpd-dash">
      <style dangerouslySetInnerHTML={{ __html: DASH_CSS }} />
      <div className="fpd-dash-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.42), rgba(91,167,214,0.22)), url(${heroFamilyPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">My Life · My Wishes · My Way</span>
            <h1>My Life. My Wishes.<br /><span className="accent">My Way.</span></h1>
            <p>Store your documents, record your wishes, and make sure everything you love is passed on exactly as you intend — sealed and encrypted end-to-end.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => onNavigate("file-cabinet")}>
                <Plus size={15} /> Add to Vault
              </button>
              <button className="hbtn ghost" onClick={() => onNavigate(sealed ? "storage-usage" : (nextUp?.page ?? "file-cabinet"))}>
                <ArrowRight size={15} /> {sealed ? "View Your Vault" : "Finish Your Vault"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div>
            <div className="eyebrow" style={{ fontSize: 13.5, color: FAINT, marginBottom: 6 }}>{todayLong}</div>
            <h1 className="pg-h1">Welcome back, <span className="accent-name">{firstName}</span></h1>
            <div className="pg-sub">
              {sealed
                ? "Your legacy is fully prepared, sealed, and encrypted end-to-end."
                : `You're ${readyPct}% of the way to a fully prepared vault.`}
            </div>
          </div>
          <div className="head-r">
            <div className="head-meta">
              <div className="a">Last backup</div>
              <div className="b">2 hours ago</div>
            </div>
            <button className="btn-primary" onClick={() => onNavigate("file-cabinet")}>
              <Plus size={15} /> Add to vault
            </button>
          </div>
        </div>

        {/* ── Storage threshold alert (only near the limit) ── */}
        {pct >= 80 && (
          <div className="salert">
            <AlertTriangle size={16} color={WARN} />
            <div className="msg">
              <span style={{ color: WARN, fontWeight: 700 }}>Storage at {pct}% </span>
              <span style={{ color: SOFT }}>— approaching your {total} GB limit.</span>
            </div>
            <button onClick={() => onNavigate("storage-usage")}>Upgrade <ArrowRight size={12} /></button>
          </div>
        )}

        {/* ── Row 1 — vault readiness, full width ── */}
        <div className="card ready">
          <div className="ring-col">
            <div className="ring-wrap">
              <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
                <defs>
                  <linearGradient id="fpdRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={ACCENT2} />
                    <stop offset="100%" stopColor={ACCENT} />
                  </linearGradient>
                </defs>
                <circle cx={RC} cy={RC} r={RR} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={RST} />
                <circle
                  cx={RC} cy={RC} r={RR} fill="none" stroke="url(#fpdRing)" strokeWidth={RST}
                  strokeLinecap="round" strokeDasharray={RCIRC} strokeDashoffset={ROFF}
                  transform={`rotate(-90 ${RC} ${RC})`}
                  style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
                />
              </svg>
              <div className="ring-center">
                <span className="ring-em"><Chip tone="good" size={36} iconSize={19}><ShieldCheck size={19} /></Chip></span>
                <b>{readyPct}%</b>
              </div>
            </div>
            <span className="ring-tag" style={{ color: sealed ? MINT : WARN }}>{sealed ? "Sealed" : "In progress"}</span>
          </div>

          <div className="ready-info">
            <h2>{sealed ? "Vault fully prepared" : `Vault ${readyPct}% prepared`}</h2>
            <p>
              {sealed
                ? <>All {essentials.length} estate essentials are complete, encrypted &amp; sealed for those you love.</>
                : <>{doneCount} of {essentials.length} essentials in place.{nextUp ? <> Next up — {nextUp.label.toLowerCase()}.</> : null}</>}
            </p>
            {!sealed && nextUp && (
              <button className="finish" onClick={() => onNavigate(nextUp.page)}>
                Finish your vault <ArrowRight size={13} />
              </button>
            )}
            <div className="ess-list">
              {essentials.map(e => (
                <button key={e.label} className="ess" onClick={() => onNavigate(e.page)}>
                  <Chip tone={e.done ? "good" : "accent"} size={18} iconSize={10}>
                    {e.done && <Check size={10} strokeWidth={3} />}
                  </Chip>
                  <span className="lbl">{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2 — bare 2x2 kpi grid (two upper, two lower) + Quick Actions ── */}
        <div className="row2">
          <div className="kpi-grid">
            {statCards.map(card => (
              <button key={card.label} className="kpi-mini" onClick={() => onNavigate(card.page)}>
                <Chip tone={card.tone} size={36} iconSize={16}>{card.icon}</Chip>
                <div className="kpi-mini-txt">
                  <div className="kpi-mini-val">{card.value}</div>
                  <div className="kpi-mini-lbl">{card.label}</div>
                  <div className="kpi-mini-sub"><span className="dt" style={{ background: card.dot }} />{card.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="card pad qa-card">
            <div className="sec-head">
              <h3 className="sec-title"><span className="tick" />Quick Actions</h3>
            </div>
            <div className="qa-grid">
              {quickActions.map(a => (
                <button
                  key={a.label} className="qa-btn"
                  style={{ borderColor: `${a.hue}44`, background: `${a.hue}14` }}
                  onClick={() => onNavigate(a.page)}
                >
                  <span className="qa-ico" style={{ background: `${a.hue}1C`, color: a.hue }}>{a.icon}</span>
                  <span className="qa-txt"><b>{a.label}</b><i>{a.sub}</i></span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3 — Storage & Usage (with trend graph) ── */}
        <div className="card pad">
            <div className="sec-head">
              <h3 className="sec-title"><span className="tick" />Storage &amp; Usage</h3>
              <button className="sec-link" onClick={() => onNavigate("storage-usage")}>Manage <ArrowRight size={12} /></button>
            </div>
            <div className="stor-fig">
              <span className="big">{used} GB</span>
              <span className="of">of {total} GB</span>
              <span className="free">{freeGb.toFixed(1)} GB free</span>
            </div>
            <div className="meter">
              {breakdown.map(seg => (
                <i key={seg.key} title={`${seg.label} · ${seg.pct.toFixed(0)}%`} style={{ width: `${(seg.gb / total) * 100}%`, background: seg.color }} />
              ))}
              <i title={`Free · ${freeGb.toFixed(1)} GB`} style={{ flex: 1, background: "rgba(146,156,188,0.22)" }} />
            </div>
            <div className="uf">
              <div className="uf-i"><span className="uf-d used" />Used <b>{used} GB</b></div>
              <div className="uf-i"><span className="uf-d free" />Free <b>{freeGb.toFixed(1)} GB</b></div>
            </div>
            <div className="leg">
              {breakdown.map(seg => (
                <div key={seg.key} className="leg-row">
                  <span className="sw" style={{ background: seg.color }} />
                  <span className="nm">{seg.label}</span>
                  <span className="gb">{seg.gb.toFixed(1)} GB</span>
                  <span className="pc">{((seg.gb / used) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="trend">
              <div className="trend-head">
                <span className="t">Usage · last 6 months</span>
                <span className="v">+{trendDelta} GB</span>
              </div>
              <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{ width: "100%", height: 96, display: "block" }}>
                <defs>
                  <linearGradient id="fpdArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(91,110,225,0.32)" />
                    <stop offset="100%" stopColor="rgba(91,110,225,0)" />
                  </linearGradient>
                </defs>
                {gridYs.map((y, i) => (
                  <line key={i} x1="0" y1={y.toFixed(1)} x2={CW} y2={y.toFixed(1)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
                <path d={areaPath} fill="url(#fpdArea)" />
                <path d={linePath.trim()} fill="none" stroke={ACCENT2} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="7" fill="rgba(91,110,225,0.25)" />
                <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3.6" fill={ACCENT2} />
              </svg>
              <div className="months">
                {storageHistory.map(d => <span key={d.month}>{d.month}</span>)}
              </div>
            </div>
          </div>

        {/* ── Row 4 — Recent Documents + Notifications ── */}
        <div className="row4">
          <div className="card pad">
            <div className="sec-head">
              <h3 className="sec-title"><span className="tick" />Recent Documents</h3>
              <button className="sec-link" onClick={() => onNavigate("file-cabinet")}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="evlist">
              {docs.slice(0, 5).map(doc => {
                const ok = doc.status === "verified";
                const hue = DOC_HUE[doc.category] ?? FAINT;
                return (
                  <button key={doc.id} className="evrow" style={{ borderColor: `${hue}26` }} onClick={() => onNavigate("file-cabinet")}>
                    <span className="evico" style={{ background: `${hue}1C`, color: hue }}><FileText size={16} /></span>
                    <div className="evbody">
                      <div className="evtop"><span className="evt">{doc.name}</span></div>
                      <div className="evmeta" style={{ color: hue }}>
                        {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)} · {doc.size} {doc.sizeUnit} · {doc.uploaded}
                      </div>
                    </div>
                    <span className="evstatus" style={{ background: ok ? "rgba(95,190,145,0.15)" : "rgba(217,165,94,0.15)", color: ok ? POS : WARN }}>
                      {ok ? "Verified" : "Pending"}
                    </span>
                  </button>
                );
              })}
            </div>
            {docCategories.length > 0 && (
              <div className="grid-legend">
                {docCategories.map(cat => (
                  <span key={cat} className="legend-item">
                    <span className="dt" style={{ background: DOC_HUE[cat] ?? FAINT }} />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
                <span className="legend-note">{docsTotal} documents total, {Math.min(5, docsTotal)} shown</span>
              </div>
            )}
          </div>

          <div className="card pad">
            <div className="sec-head">
              <h3 className="sec-title"><span className="tick" />Notifications</h3>
              <span className="sec-link" style={{ cursor: "default", color: unread ? MINT : SOFT }}>
                <Bell size={12} /> {unread} new
              </span>
            </div>
            <div className="evlist">
              {notifications.slice(0, 5).map(n => {
                const hue = NOTIF_HUE[n.type] ?? ACCENT2;
                return (
                  <div key={n.id} className={`evrow ${n.read ? "read" : ""}`} style={{ borderColor: `${hue}26` }}>
                    <span className="evico" style={{ background: `${hue}1C`, color: hue }}>{NOTIF_ICON[n.type] ?? <Bell size={15} />}</span>
                    <div className="evbody">
                      <div className="evtop"><span className="evt">{n.title}</span></div>
                      <div className="evmeta" style={{ color: hue }}>{n.time}</div>
                      <div className="evdet">{n.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}