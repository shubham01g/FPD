import React from "react";
import {
  Archive, Users, HardDrive, TrendingUp, AlertTriangle, FileText,
  ArrowRight, Bell, Plus, ShieldCheck, Check
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { STORAGE_BREAKDOWN } from "../utils/storageBreakdown";

interface UserDashboardProps { onNavigate: (page: string) => void; }

/* ── Royal Vault Blue palette (refined estate treatment) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/* Calm, cool storage palette — applied dashboard-side only, so the shared
   STORAGE_BREAKDOWN (and the Usage & Billing page) keep their own category
   colours untouched. Toned to match the Calendar: every slice stays light
   enough to read on the dark surface and distinct enough to tell apart,
   without any slice shouting against the theme. */
const STORAGE_RAMP = ["#5BA7D6", "#5A8078", "#7E6BD8", "#5BA7D6", "#6FAE8B", "#97A2C6"];
/* Remaining / free space — a quiet slate so "what's left" reads at a glance. */
const FREE = "#6B7690";

const storageHistory = [
  { month: "Jan", used: 4.2 }, { month: "Feb", used: 6.8 }, { month: "Mar", used: 9.1 },
  { month: "Apr", used: 11.5 }, { month: "May", used: 14.3 }, { month: "Jun", used: 16.9 },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All redesign styling is scoped under .fpd-dash so nothing else in the app is
   affected. Interactive states (hover, highlight underline) live here as real CSS. */
const DASH_CSS = `
.fpd-dash{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-dash *{box-sizing:border-box;}
.fpd-dash-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-dash .wrap{max-width:1320px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-dash .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-dash .card.pad{padding:22px;}
.fpd-dash .sec-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.fpd-dash .sec-title{font-size:13px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;}
.fpd-dash .sec-title .tick{width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}
.fpd-dash .sec-link{color:${MUTED};font-size:11.5px;font-weight:500;display:inline-flex;align-items:center;gap:4px;transition:color .18s;background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .sec-link:hover{color:${ACCENT2};}
.fpd-dash .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};}

/* header */
.fpd-dash .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-dash .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-dash .pg-sub{color:${MUTED};font-size:13px;}
.fpd-dash .head-r{display:flex;align-items:center;gap:14px;}
.fpd-dash .head-meta{text-align:right;line-height:1.35;}
.fpd-dash .head-meta .a{font-family:var(--font-mono);font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:${FAINT};}
.fpd-dash .head-meta .b{font-size:12px;color:${SOFT};font-family:var(--font-mono);}
.fpd-dash .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}

/* storage alert */
.fpd-dash .salert{display:flex;align-items:center;gap:12px;padding:13px 18px;border-radius:12px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.24);}
.fpd-dash .salert .msg{flex:1;font-size:13px;}
.fpd-dash .salert button{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:8px;background:rgba(217,165,94,0.16);color:${WARN};font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}

/* readiness band */
.fpd-dash .ready{display:grid;grid-template-columns:auto auto 1fr;align-items:center;gap:26px;padding:22px 26px;background:linear-gradient(120deg,#111A2C 0%,#0B1220 60%,#0C1322 100%);border-color:rgba(91,110,225,0.16);}
.fpd-dash .ring-wrap{position:relative;width:96px;height:96px;flex-shrink:0;}
.fpd-dash .ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.fpd-dash .ring-em{width:30px;height:30px;border-radius:9px;background:rgba(91,110,225,0.12);border:1px solid rgba(91,110,225,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:5px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);color:${ACCENT2};}
.fpd-dash .ring-center b{font-family:var(--font-display);font-size:14px;font-weight:600;color:${TEXT};line-height:1;}
.fpd-dash .ready-mid{min-width:200px;border-right:1px solid rgba(255,255,255,0.22);padding-right:26px;}
.fpd-dash .ready-st{display:inline-flex;align-items:center;gap:7px;margin-bottom:9px;}
.fpd-dash .ready-st .d{width:6px;height:6px;border-radius:50%;}
.fpd-dash .ready-st span{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.15em;}
.fpd-dash .ready-mid h2{font-size:19px;font-weight:600;color:${TEXT};margin-bottom:6px;letter-spacing:-0.01em;font-family:var(--font-display);}
.fpd-dash .ready-mid p{color:${MUTED};font-size:12.5px;max-width:240px;}
.fpd-dash .finish{display:inline-flex;align-items:center;gap:7px;margin-top:14px;padding:9px 15px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-dash .finish:hover{filter:brightness(1.08);}
.fpd-dash .ess-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 18px;}
.fpd-dash .ess{display:flex;align-items:center;gap:10px;white-space:nowrap;padding:7px 11px;border-radius:9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.22);cursor:pointer;text-align:left;width:100%;transition:border-color .18s,background .18s;font-family:var(--font-body);}
.fpd-dash .ess:hover{border-color:rgba(91,110,225,0.3);background:rgba(91,110,225,0.06);}
.fpd-dash .ess .ck{width:17px;height:17px;border-radius:6px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-dash .ess .ck.done{background:rgba(95,190,145,0.15);border:1px solid rgba(95,190,145,0.32);color:${POS};}
.fpd-dash .ess .ck.todo{background:transparent;border:1px solid ${FAINT};}
.fpd-dash .ess .lbl{font-size:12px;color:${SOFT};}
@media (max-width:1240px){.fpd-dash .ready{grid-template-columns:auto 1fr;}.fpd-dash .ready-mid{border-right:none;padding-right:0;}.fpd-dash .ess-grid{grid-column:1 / -1;}}

/* KPI ledger */
.fpd-dash .kstrip{display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;}
.fpd-dash .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;transition:background .18s;text-align:left;overflow:hidden;background:none;cursor:pointer;font-family:var(--font-body);}
.fpd-dash .kcell:first-child{border-left:none;}
.fpd-dash .kcell:hover{background:rgba(255,255,255,0.02);}
.fpd-dash .kcell::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;background:linear-gradient(90deg,${ACCENT},transparent);transform:scaleX(0);transform-origin:left;transition:transform .18s;}
.fpd-dash .kcell:hover::after{transform:scaleX(1);}
.fpd-dash .kcell.hl{background:linear-gradient(180deg,rgba(91,110,225,0.15),rgba(91,110,225,0.04));}
.fpd-dash .kcell.hl:hover{background:linear-gradient(180deg,rgba(91,110,225,0.19),rgba(91,110,225,0.06));}
.fpd-dash .kcell.hl::after{transform:scaleX(1);background:linear-gradient(90deg,${ACCENT2},${ACCENT});}
.fpd-dash .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-dash .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-dash .kcell.hl .klbl{color:${ACCENT2};}
.fpd-dash .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-dash .kcell.hl .kico{background:rgba(91,110,225,0.12);border-color:rgba(91,110,225,0.36);color:${ACCENT2};}
.fpd-dash .kcell .kval{font-family:var(--font-display);font-size:27px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-dash .kcell.hl .kval{color:${ACCENT2};}
.fpd-dash .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-dash .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-dash .kstrip{grid-template-columns:1fr 1fr;}.fpd-dash .kcell:nth-child(3){border-left:none;}.fpd-dash .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* bento */
.fpd-dash .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:18px;align-items:stretch;}
.fpd-dash .col{display:flex;flex-direction:column;gap:18px;min-width:0;}
@media (max-width:1080px){.fpd-dash .bento{grid-template-columns:1fr;}}

/* storage */
.fpd-dash .stor-fig{display:flex;align-items:baseline;gap:9px;margin-bottom:16px;}
.fpd-dash .stor-fig .big{font-family:var(--font-display);font-size:28px;font-weight:600;color:${TEXT};letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-dash .stor-fig .of{color:${MUTED};font-size:13px;}
.fpd-dash .stor-fig .free{margin-left:auto;font-family:var(--font-mono);font-size:11px;color:${SOFT};padding:4px 10px;border-radius:7px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-dash .meter{display:flex;height:9px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,0.05);margin-bottom:12px;gap:1.5px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-dash .meter i{display:block;height:100%;}
/* used / free split — the quick "how much is left" read */
.fpd-dash .uf{display:flex;gap:20px;margin-bottom:20px;}
.fpd-dash .uf-i{display:flex;align-items:center;gap:7px;font-size:12px;color:${SOFT};}
.fpd-dash .uf-i b{font-family:var(--font-mono);color:${TEXT};font-weight:600;font-variant-numeric:tabular-nums;margin-left:1px;}
.fpd-dash .uf-i i{font-family:var(--font-mono);font-style:normal;color:${MUTED};font-size:11px;}
.fpd-dash .uf-d{width:9px;height:9px;border-radius:3px;flex-shrink:0;}
.fpd-dash .uf-d.used{background:${ACCENT2};}
.fpd-dash .uf-d.free{background:transparent;border:1.5px solid ${FREE};}
.fpd-dash .leg{width:100%;border-collapse:collapse;}
.fpd-dash .leg td{padding:8.5px 0;border-top:1px solid rgba(255,255,255,0.22);font-size:12.5px;}
.fpd-dash .leg tr:first-child td{border-top:none;}
.fpd-dash .leg .sw{width:22px;}
.fpd-dash .leg .sw span{display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:middle;}
.fpd-dash .leg .nm{color:${SOFT};}
.fpd-dash .leg .gb{text-align:right;color:${TEXT};font-family:var(--font-mono);font-size:12px;width:72px;font-variant-numeric:tabular-nums;}
.fpd-dash .leg .pc{text-align:right;color:${MUTED};font-family:var(--font-mono);font-size:11px;width:58px;font-variant-numeric:tabular-nums;}
.fpd-dash .trend{margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-dash .trend-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-dash .trend-head .t{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-dash .trend-head .v{font-family:var(--font-mono);font-size:11px;color:${POS};}
.fpd-dash .months{display:flex;justify-content:space-between;margin-top:8px;}
.fpd-dash .months span{font-family:var(--font-mono);font-size:9.5px;color:${FAINT};}

/* documents table */
.fpd-dash .tbl{width:100%;border-collapse:collapse;}
.fpd-dash .tbl thead th{text-align:left;font-family:var(--font-mono);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:${FAINT};font-weight:600;padding:0 0 12px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-dash .tbl thead th.r{text-align:right;}
.fpd-dash .tbl tbody td{padding:12px 0;border-top:1px solid rgba(255,255,255,0.22);vertical-align:middle;}
.fpd-dash .tbl tbody tr:first-child td{border-top:none;}
.fpd-dash .doc-c{display:flex;align-items:center;gap:12px;min-width:0;}
.fpd-dash .doc-ico{width:31px;height:31px;border-radius:8px;flex-shrink:0;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${MUTED};display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);}
.fpd-dash .doc-nm{color:${TEXT};font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fpd-dash .td-sz,.fpd-dash .td-dt{color:${MUTED};font-family:var(--font-mono);font-size:11.5px;text-align:right;font-variant-numeric:tabular-nums;}
.fpd-dash .td-st{text-align:right;}
.fpd-dash .st-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.04em;}
.fpd-dash .st-badge .dt{width:5px;height:5px;border-radius:50%;}
.fpd-dash .drow{cursor:pointer;transition:background .18s;}
.fpd-dash .drow:hover td{background:rgba(255,255,255,0.018);}

/* notifications */
.fpd-dash .ncard{display:flex;flex-direction:column;flex:1;}
.fpd-dash .ncard .notif-list{flex:1;display:flex;flex-direction:column;justify-content:space-between;}
.fpd-dash .notif{display:flex;gap:12px;padding:13px 0;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-dash .notif:first-of-type{border-top:none;padding-top:2px;}
.fpd-dash .notif .d{width:6px;height:6px;border-radius:50%;margin-top:6px;flex-shrink:0;}
.fpd-dash .notif .nt{font-size:12.5px;font-weight:600;color:${TEXT};}
.fpd-dash .notif.read .nt{color:${SOFT};font-weight:500;}
.fpd-dash .notif .nm{color:${MUTED};font-size:11.5px;line-height:1.5;margin-top:2px;}
.fpd-dash .notif .ntime{color:${FAINT};font-size:9.5px;margin-top:4px;font-family:var(--font-mono);letter-spacing:0.03em;}

/* quick actions */
.fpd-dash .qa{display:flex;flex-direction:column;}
.fpd-dash .qa-btn{display:flex;align-items:center;gap:13px;padding:13px 4px;border-top:1px solid rgba(255,255,255,0.22);text-align:left;transition:padding-left .18s;background:none;border-left:none;border-right:none;border-bottom:none;cursor:pointer;font-family:var(--font-body);width:100%;}
.fpd-dash .qa-btn:first-child{border-top:none;padding-top:4px;}
.fpd-dash .qa-btn:hover{padding-left:8px;}
.fpd-dash .qa-ico{width:33px;height:33px;border-radius:9px;flex-shrink:0;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${SOFT};display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035);transition:border-color .18s,color .18s;}
.fpd-dash .qa-btn:hover .qa-ico{border-color:rgba(91,110,225,0.4);color:${ACCENT2};}
.fpd-dash .qa-btn .qt{flex:1;}
.fpd-dash .qa-btn .qt b{display:block;font-size:12.5px;font-weight:600;color:${TEXT};}
.fpd-dash .qa-btn .qt i{display:block;font-style:normal;font-size:11px;color:${MUTED};margin-top:1px;}
.fpd-dash .qa-btn .qarrow{color:${FAINT};transition:color .18s,transform .18s;display:flex;}
.fpd-dash .qa-btn:hover .qarrow{color:${ACCENT2};transform:translateX(2px);}
`;

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user, docs, contacts, wishes, notifications } = useDemo();

  const firstName = user.name.split(" ")[0];
  const used = user.storageUsed, total = user.storageLimit;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const freeGb = Math.max(0, total - used);

  const docsTotal = docs.length;
  const docsPending = docs.filter(d => d.status === "pending").length;

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
  const notifDot: Record<string, string> = { info: ACCENT2, success: POS, warning: WARN, error: NEG };

  const statCards = [
    { label: "Legacy Documents", value: String(docsTotal), sub: `${docsPending} pending review`, icon: <Archive size={13} />, page: "file-cabinet", dot: WARN, hl: false },
    { label: "Legacy Contacts", value: String(legacyContacts.length), sub: `${legacyVerified} verified`, icon: <Users size={13} />, page: "contacts-legacy", dot: POS, hl: false },
    { label: "Storage Used", value: `${used} GB`, sub: `${pct}% of ${total} GB`, icon: <HardDrive size={13} />, page: "storage-usage", dot: ACCENT2, hl: false },
    { label: "Referral Earnings", value: "$284.50", sub: "This month", icon: <TrendingUp size={13} />, page: "affiliate", dot: POS, hl: true },
  ];

  const quickActions = [
    { icon: <Plus size={15} />, label: "Add document", sub: "Upload to your vault", page: "file-cabinet" },
    { icon: <Users size={15} />, label: "Add contact", sub: "Assign legacy access", page: "contacts-legacy" },
    { icon: <HardDrive size={15} />, label: "Check storage", sub: "Review usage & billing", page: "storage-usage" },
    { icon: <TrendingUp size={15} />, label: "Refer & earn", sub: "Share your link", page: "affiliate" },
  ];

  /* ── Readiness ring geometry ── */
  const RING = 96, RC = RING / 2, RR = 43, RST = 5;
  const RCIRC = 2 * Math.PI * RR;
  const ROFF = RCIRC * (1 - readyPct / 100);

  /* ── 6-month trend area chart ── */
  const vals = storageHistory.map(d => d.used);
  const CW = 300, CH = 92, cpt = 8, cpb = 8, innerH = CH - cpt - cpb;
  const maxV = Math.max(18, Math.ceil(Math.max(...vals) / 6) * 6);
  const cx = (i: number) => (i / (vals.length - 1)) * CW;
  const cy = (v: number) => cpt + (1 - v / maxV) * innerH;
  let linePath = "";
  vals.forEach((v, i) => { linePath += `${i ? "L" : "M"} ${cx(i).toFixed(1)} ${cy(v).toFixed(1)} `; });
  const areaPath = `M ${cx(0).toFixed(1)} ${CH - cpb} ${linePath}L ${CW} ${CH - cpb} Z`;
  const gridYs = [maxV / 3, (2 * maxV) / 3, maxV].map(g => cy(g));
  const trendDelta = (vals[vals.length - 1] - vals[0]).toFixed(1);

  const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  return (
    <div className="fpd-dash">
      <style dangerouslySetInnerHTML={{ __html: DASH_CSS }} />
      <div className="fpd-dash-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div>
            <div className="eyebrow">{todayLong}</div>
            <h1 className="pg-h1">Welcome back, {firstName}</h1>
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
              <Plus size={14} /> Add to vault
            </button>
          </div>
        </div>

        {/* ── Storage threshold alert (only near the limit) ── */}
        {pct >= 80 && (
          <div className="salert">
            <AlertTriangle size={15} color={WARN} />
            <div className="msg">
              <span style={{ color: WARN, fontWeight: 700 }}>Storage at {pct}% </span>
              <span style={{ color: SOFT }}>— approaching your {total} GB limit.</span>
            </div>
            <button onClick={() => onNavigate("storage-usage")}>Upgrade <ArrowRight size={12} /></button>
          </div>
        )}

        {/* ── Readiness band ── */}
        <div className="card ready glow-surface">
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
              <span className="ring-em"><ShieldCheck size={16} /></span>
              <b>{readyPct}%</b>
            </div>
          </div>

          <div className="ready-mid">
            <div className="ready-st">
              <span className="d" style={{ background: sealed ? POS : WARN, boxShadow: `0 0 8px ${sealed ? "rgba(95,190,145,0.7)" : "rgba(217,165,94,0.7)"}` }} />
              <span style={{ color: sealed ? POS : WARN }}>{sealed ? "SECURED & SEALED" : "SEALING IN PROGRESS"}</span>
            </div>
            <h2>{sealed ? "Vault fully prepared" : `Vault ${readyPct}% prepared`}</h2>
            <p>
              {sealed
                ? <>All {essentials.length} estate essentials complete, encrypted &amp; sealed for those you love.</>
                : <>{doneCount} of {essentials.length} essentials in place.{nextUp ? <> Next up — {nextUp.label.toLowerCase()}.</> : null}</>}
            </p>
            {!sealed && nextUp && (
              <button className="finish" onClick={() => onNavigate(nextUp.page)}>
                Finish your vault <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="ess-grid">
            {essentials.map(e => (
              <button key={e.label} className="ess" onClick={() => onNavigate(e.page)}>
                <span className={`ck ${e.done ? "done" : "todo"}`}>
                  {e.done && <Check size={10} strokeWidth={3} />}
                </span>
                <span className="lbl">{e.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {statCards.map(card => (
            <button key={card.label} className={`kcell ${card.hl ? "hl" : ""}`} onClick={() => onNavigate(card.page)}>
              <div className="khead">
                <span className="klbl">{card.label}</span>
                <span className="kico">{card.icon}</span>
              </div>
              <div className="kval">{card.value}</div>
              <div className="ksub"><span className="dt" style={{ background: card.dot }} />{card.sub}</div>
            </button>
          ))}
        </div>

        {/* ── Bento: storage + documents (left) · notifications + quick actions (right) ── */}
        <div className="bento">
          {/* LEFT */}
          <div className="col">
            {/* Storage & Usage */}
            <div className="card pad glow-surface">
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
                <i title={`Free · ${freeGb.toFixed(1)} GB`} style={{ flex: 1, background: "rgba(107,118,144,0.22)" }} />
              </div>
              <div className="uf">
                <div className="uf-i"><span className="uf-d used" />Used <b>{used} GB</b><i>{pct}%</i></div>
                <div className="uf-i"><span className="uf-d free" />Free <b>{freeGb.toFixed(1)} GB</b><i>{Math.max(0, 100 - pct)}%</i></div>
              </div>
              <table className="leg">
                <tbody>
                  {breakdown.map(seg => (
                    <tr key={seg.key}>
                      <td className="sw"><span style={{ background: seg.color }} /></td>
                      <td className="nm">{seg.label}</td>
                      <td className="gb">{seg.gb.toFixed(1)} GB</td>
                      <td className="pc">{((seg.gb / used) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="trend">
                <div className="trend-head">
                  <span className="t">Usage · last 6 months</span>
                  <span className="v">+{trendDelta} GB</span>
                </div>
                <svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" style={{ width: "100%", height: 104, display: "block" }}>
                  <defs>
                    <linearGradient id="fpdArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(91,110,225,0.30)" />
                      <stop offset="100%" stopColor="rgba(91,110,225,0)" />
                    </linearGradient>
                  </defs>
                  {gridYs.map((y, i) => (
                    <line key={i} x1="0" y1={y.toFixed(1)} x2={CW} y2={y.toFixed(1)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={areaPath} fill="url(#fpdArea)" />
                  <path d={linePath.trim()} fill="none" stroke="#5BA7D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <circle cx={cx(vals.length - 1).toFixed(1)} cy={cy(vals[vals.length - 1]).toFixed(1)} r="3.4" fill="#0A0F1A" stroke={ACCENT2} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="months">
                  {storageHistory.map(d => <span key={d.month}>{d.month}</span>)}
                </div>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="card pad glow-surface">
              <div className="sec-head">
                <h3 className="sec-title"><span className="tick" />Recent Documents</h3>
                <button className="sec-link" onClick={() => onNavigate("file-cabinet")}>View all <ArrowRight size={12} /></button>
              </div>
              <table className="tbl">
                <thead>
                  <tr><th>Document</th><th className="r">Size</th><th className="r">Uploaded</th><th className="r">Status</th></tr>
                </thead>
                <tbody>
                  {docs.slice(0, 5).map(doc => {
                    const ok = doc.status === "verified";
                    const col = ok ? POS : WARN;
                    return (
                      <tr key={doc.id} className="drow" onClick={() => onNavigate("file-cabinet")}>
                        <td>
                          <div className="doc-c">
                            <div className="doc-ico"><FileText size={14} /></div>
                            <span className="doc-nm">{doc.name}</span>
                          </div>
                        </td>
                        <td className="td-sz">{doc.size} {doc.sizeUnit}</td>
                        <td className="td-dt">{doc.uploaded}</td>
                        <td className="td-st">
                          <span className="st-badge" style={{ color: col }}>
                            <span className="dt" style={{ background: col }} />
                            {ok ? "Verified" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col">
            {/* Notifications */}
            <div className="card pad ncard glow-surface">
              <div className="sec-head">
                <h3 className="sec-title"><span className="tick" />Notifications</h3>
                <span className="sec-link" style={{ cursor: "default", color: unread ? ACCENT2 : MUTED }}>
                  <Bell size={12} /> {unread} new
                </span>
              </div>
              <div className="notif-list">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`notif ${n.read ? "read" : ""}`}>
                    <div className="d" style={{ background: n.read ? FAINT : (notifDot[n.type] ?? ACCENT2) }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="nt">{n.title}</div>
                      <div className="nm">{n.message}</div>
                      <div className="ntime">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card pad glow-surface">
              <div className="sec-head">
                <h3 className="sec-title"><span className="tick" />Quick Actions</h3>
              </div>
              <div className="qa">
                {quickActions.map(a => (
                  <button key={a.label} className="qa-btn" onClick={() => onNavigate(a.page)}>
                    <span className="qa-ico">{a.icon}</span>
                    <span className="qt"><b>{a.label}</b><i>{a.sub}</i></span>
                    <span className="qarrow"><ArrowRight size={14} /></span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
