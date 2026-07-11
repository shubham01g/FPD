import React from "react";
import {
  Archive, Users, HardDrive, TrendingUp, AlertTriangle, FileText, Shield,
  ArrowRight, ArrowUpRight, CheckCircle2, Circle, Bell, Lock, Camera, Wallet, Heart, Film
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { STORAGE_BREAKDOWN } from "../utils/storageBreakdown";

interface UserDashboardProps { onNavigate: (page: string) => void; }

/* ── Royal Vault Blue palette ── */
const TEXT   = "#FFFFFF";
const SOFT   = "#B8C8E0";
const MUTED  = "#8A9AB8";
const FAINT  = "#5A6A88";
const HILITE = "#8AA0FF";
const ACCENT = "#3A5BD9";
const ACCENT2 = "#5B7BF5";
const SUCCESS = "#48BB78";
const WARN   = "#F6AD55";
const DANGER = "#E53E3E";

const CARD: React.CSSProperties = { background: "#101728", border: "1px solid rgba(58,91,217,0.2)", boxShadow: "0 4px 24px rgba(0,0,0,0.35)", borderRadius: 20 };

const storageHistory = [
  { month: "Jan", used: 4.2 }, { month: "Feb", used: 6.8 }, { month: "Mar", used: 9.1 },
  { month: "Apr", used: 11.5 }, { month: "May", used: 14.3 }, { month: "Jun", used: 16.9 },
];

/* Icon per shared storage-breakdown category key */
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  media:     <Film size={12}/>,
  financial: <Wallet size={12}/>,
  legal:     <FileText size={12}/>,
  photos:    <Camera size={12}/>,
  personal:  <Heart size={12}/>,
  digital:   <Lock size={12}/>,
};

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { user, docs, contacts, wishes, notifications } = useDemo();

  const firstName = user.name.split(" ")[0];
  const used = user.storageUsed, total = user.storageLimit;
  const pct = Math.min(100, Math.round((used / total) * 100));

  const docsTotal = docs.length;
  const docsPending = docs.filter(d => d.status === "pending").length;
  const docsVerified = docsTotal - docsPending;
  const verifiedPct = docsTotal ? Math.round((docsVerified / docsTotal) * 100) : 0;

  const legacyContacts = contacts.filter(c => c.type === "legacy");
  const guardianContacts = contacts.filter(c => c.type === "guardian");
  const legacyVerified = legacyContacts.filter(c => c.verificationStatus === "verified").length;

  /* ── Usage breakdown by category — shared with the Usage & Billing page ── */
  const breakdownTotalGb = STORAGE_BREAKDOWN.reduce((a, c) => a + c.gb, 0) || 1;
  const breakdown = STORAGE_BREAKDOWN
    .map(c => ({ ...c, pct: (c.gb / breakdownTotalGb) * 100, icon: CATEGORY_ICON[c.key] }))
    .sort((a, b) => b.gb - a.gb);

  /* ── Legacy completion checklist (drives the ring) ── */
  const checklist = [
    { label: "Will or trust uploaded", done: docs.some(d => d.category === "legal") },
    { label: "Legacy contact verified", done: legacyVerified > 0 },
    { label: "Financial records added", done: docs.some(d => d.category === "financial") },
    { label: "Final wishes recorded", done: wishes.length > 0 },
    { label: "Guardian contact assigned", done: guardianContacts.length > 0 },
    { label: "Digital assets documented", done: docs.some(d => d.category === "digital") },
  ];
  const completed = checklist.filter(c => c.done).length;
  const completionPct = Math.round((completed / checklist.length) * 100);

  const unread = notifications.filter(n => !n.read).length;

  const statCards = [
    { label: "Legacy Documents", value: String(docsTotal), sub: `${docsPending} pending review`, icon: <Archive size={16}/>, color: HILITE, page: "file-cabinet" },
    { label: "Legacy Contacts", value: String(legacyContacts.length), sub: `${legacyVerified} verified`, icon: <Users size={16}/>, color: SUCCESS, page: "contacts-legacy" },
    { label: "Storage Used", value: `${used} GB`, sub: `of ${total} GB · ${pct}%`, icon: <HardDrive size={16}/>, color: pct >= 80 ? WARN : HILITE, page: "storage-usage" },
    { label: "Referral Earnings", value: "$284.50", sub: "This month", icon: <TrendingUp size={16}/>, color: "#6E8BFF", filled: true, page: "affiliate" },
  ];

  // completion ring geometry
  const r = 42, circ = 2 * Math.PI * r;
  const ringOffset = circ * (1 - completionPct / 100);

  const notifDot: Record<string, string> = { info: HILITE, success: SUCCESS, warning: WARN, error: DANGER };

  return (
    <div className="p-6 space-y-5" style={{ maxWidth: 1240, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 fpd-fade-in-up">
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: FAINT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 27, color: TEXT, marginBottom: 4, letterSpacing: "-0.01em" }}>
            Welcome back, {firstName}
          </h1>
          <p style={{ color: MUTED, fontSize: 14 }}>Your legacy vault is active and protected — here's where things stand.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl flex-shrink-0" style={{ background: "rgba(72,187,120,0.1)", border: "1px solid rgba(72,187,120,0.25)" }}>
          <Shield size={13} color={SUCCESS}/>
          <span style={{ color: SUCCESS, fontSize: 12, fontWeight: 600 }}>Vault Active</span>
        </div>
      </div>

      {/* Storage threshold alert */}
      {pct >= 80 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl fpd-fade-in-up" style={{ background: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.3)", borderRadius: 18 }}>
          <AlertTriangle size={16} color={WARN}/>
          <div className="flex-1">
            <span style={{ color: WARN, fontWeight: 700, fontSize: 14 }}>Storage at {pct}% </span>
            <span style={{ color: SOFT, fontSize: 14 }}>— you're approaching your {total} GB limit. Upgrade to avoid overage charges.</span>
          </div>
          <button onClick={() => onNavigate("storage-usage")} className="flex items-center gap-1 px-3 py-1.5 rounded-xl fpd-btn-lift" style={{ background: "rgba(246,173,85,0.18)", color: WARN, fontSize: 13, fontWeight: 600 }}>
            Upgrade <ArrowRight size={12}/>
          </button>
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <button key={card.label} onClick={() => onNavigate(card.page)}
            className="p-5 relative overflow-hidden text-left fpd-hover-lift glow-surface fpd-fade-in-up" style={{
              ...CARD, animationDelay: `${i * 55}ms`,
              ...(card.filled ? { background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, border: "none", boxShadow: "0 8px 28px rgba(58,91,217,0.45)" } : {}),
            }}>
            {card.filled && (
              <svg width="150" height="70" viewBox="0 0 150 70" style={{ position: "absolute", right: -10, bottom: -6, opacity: 0.4 }}>
                <path d="M0,52 Q22,20 44,42 T88,28 T150,8" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
              </svg>
            )}
            <div className="flex items-center justify-between mb-4" style={{ position: "relative" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.filled ? "rgba(255,255,255,0.16)" : `${card.color}1E`, color: card.filled ? "#FFFFFF" : card.color }}>{card.icon}</div>
              <ArrowUpRight size={14} style={{ color: card.filled ? "rgba(255,255,255,0.7)" : FAINT }}/>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 25, color: "#FFFFFF", marginBottom: 4, position: "relative" }}>{card.value}</div>
            <div style={{ color: card.filled ? "rgba(255,255,255,0.78)" : MUTED, fontSize: 12, position: "relative" }}>{card.label}</div>
            <div style={{ color: card.filled ? "rgba(255,255,255,0.9)" : card.color, fontSize: 10, marginTop: 2, fontFamily: "var(--font-mono)", position: "relative" }}>{card.sub}</div>
          </button>
        ))}
      </div>

      {/* Storage (with usage breakdown) + Legacy completion */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Storage */}
        <div className="lg:col-span-2 p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT }}>Storage & Usage Breakdown</h3>
              <p style={{ color: MUTED, fontSize: 11.5, marginTop: 2 }}>What's filling your vault, by category</p>
            </div>
            <span className="px-2.5 py-1 rounded-full" style={{ background: pct >= 90 ? "rgba(229,62,62,0.16)" : pct >= 80 ? "rgba(246,173,85,0.16)" : "rgba(72,187,120,0.14)", color: pct >= 90 ? DANGER : pct >= 80 ? WARN : SUCCESS, fontSize: 10.5, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {pct >= 90 ? "CRITICAL" : pct >= 80 ? "NEAR LIMIT" : "ON TRACK"}
            </span>
          </div>

          {/* Big meter */}
          <div className="flex items-baseline gap-2 mb-2">
            <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: TEXT }}>{used} GB</span>
            <span style={{ color: MUTED, fontSize: 13 }}>used of {total} GB</span>
            <button onClick={() => onNavigate("storage-usage")} className="ml-auto" style={{ color: HILITE, fontSize: 12, fontWeight: 600 }}>Manage →</button>
          </div>

          {/* Segmented threshold meter (colored by category) */}
          <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,0.07)", marginBottom: 4 }}>
            {breakdown.map(seg => (
              <div key={seg.key} title={`${seg.label} · ${seg.pct.toFixed(0)}%`} style={{ width: `${(seg.pct / 100) * pct}%`, background: seg.color, transition: "width .4s" }}/>
            ))}
            <div style={{ flex: 1 }}/>
          </div>
          <div className="flex justify-between" style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: FAINT, marginBottom: 16 }}>
            <span>0</span><span style={{ color: pct >= 80 ? WARN : FAINT }}>{pct}% used</span><span>{total} GB</span>
          </div>

          {/* Category legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
            {breakdown.map(seg => (
              <div key={seg.key} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(58,91,217,0.12)" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${seg.color}22`, color: seg.color }}>{seg.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: SOFT, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.label}</div>
                  <div style={{ color: seg.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{seg.pct.toFixed(0)}%</div>
                </div>
              </div>
            ))}
          </div>

          {/* 6-month trend */}
          <div style={{ borderTop: "1px solid rgba(58,91,217,0.15)", paddingTop: 14 }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: MUTED, fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>6-MONTH TREND</span>
              <span style={{ color: HILITE, fontSize: 11 }}>+12.7 GB</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 72 }}>
              {storageHistory.map((d, i) => {
                const barH = Math.max(8, Math.round((d.used / total) * 64));
                const isLast = i === storageHistory.length - 1;
                return (
                  <div key={d.month} className="flex flex-col items-center gap-1.5 flex-1 group relative">
                    <div className="absolute -top-7 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none" style={{ background: "#050A16", color: "#fff", fontSize: 10.5, fontFamily: "var(--font-mono)", zIndex: 10 }}>{d.used} GB</div>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                      <div className="w-full rounded-t-md transition-all" style={{ height: barH, background: isLast ? `linear-gradient(180deg,${ACCENT2},${ACCENT})` : "linear-gradient(180deg,rgba(138,160,255,0.42),rgba(58,91,217,0.30))", boxShadow: isLast ? "0 0 12px rgba(58,91,217,0.4)" : "none" }}/>
                    </div>
                    <span style={{ color: FAINT, fontSize: 9.5, fontFamily: "var(--font-mono)" }}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legacy completion */}
        <div className="lg:col-span-1 p-6 flex flex-col fpd-hover-lift glow-surface" style={CARD}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT, marginBottom: 2 }}>Legacy Completion</h3>
          <p style={{ color: MUTED, fontSize: 11.5, marginBottom: 12 }}>{completed} of {checklist.length} essentials done</p>

          <div className="flex justify-center mb-3">
            <svg width="118" height="118" viewBox="0 0 118 118">
              <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9"/>
              <circle cx="59" cy="59" r={r} fill="none" stroke="url(#compGrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={ringOffset} transform="rotate(-90 59 59)" style={{ transition: "stroke-dashoffset .6s" }}/>
              <defs>
                <linearGradient id="compGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={ACCENT2}/><stop offset="100%" stopColor={HILITE}/>
                </linearGradient>
              </defs>
              <text x="59" y="64" textAnchor="middle" style={{ fontFamily: "var(--font-display)", fontSize: 22, fill: TEXT }}>{completionPct}%</text>
            </svg>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {checklist.map(item => (
              <div key={item.label} className="flex items-center gap-2.5">
                {item.done
                  ? <CheckCircle2 size={15} style={{ color: SUCCESS, flexShrink: 0 }}/>
                  : <Circle size={15} style={{ color: FAINT, flexShrink: 0 }}/>}
                <span style={{ fontSize: 12, color: item.done ? SOFT : MUTED, textDecoration: item.done ? "none" : "none" }}>{item.label}</span>
              </div>
            ))}
          </div>
          {completionPct < 100 && (
            <button onClick={() => onNavigate("file-cabinet")} className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl fpd-btn-lift" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontSize: 12.5, fontWeight: 650 }}>
              Complete your vault <ArrowRight size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Recent documents + Notifications */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT }}>Recent Documents</h3>
            <button onClick={() => onNavigate("file-cabinet")} style={{ color: HILITE, fontSize: 12, fontWeight: 600 }}>View all →</button>
          </div>
          <div className="space-y-2">
            {docs.slice(0, 5).map(doc => (
              <button key={doc.id} onClick={() => onNavigate("file-cabinet")} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors" style={{ background: "rgba(255,255,255,0.035)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(58,91,217,0.12)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.035)"}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(58,91,217,0.14)", color: HILITE }}><FileText size={14}/></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: TEXT, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                    <div style={{ color: MUTED, fontSize: 10, fontFamily: "var(--font-mono)" }}>{doc.size} {doc.sizeUnit} · {doc.uploaded}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded flex-shrink-0" style={{ background: doc.status === "verified" ? "rgba(72,187,120,0.14)" : "rgba(246,173,85,0.16)", color: doc.status === "verified" ? SUCCESS : WARN, fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700 }}>
                  {doc.status.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT }}>Notifications</h3>
            <span className="flex items-center gap-1.5" style={{ color: unread ? HILITE : MUTED, fontSize: 11, fontFamily: "var(--font-mono)" }}>
              <Bell size={12}/> {unread} new
            </span>
          </div>
          <div className="space-y-1">
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl" style={{ background: n.read ? "transparent" : "rgba(58,91,217,0.06)" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: notifDot[n.type] ?? HILITE, boxShadow: `0 0 6px ${notifDot[n.type] ?? HILITE}` }}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: TEXT, fontSize: 12.5, fontWeight: 550 }}>{n.title}</div>
                  <div style={{ color: MUTED, fontSize: 11, lineHeight: 1.45, marginTop: 1 }}>{n.message}</div>
                  <div style={{ color: FAINT, fontSize: 9.5, marginTop: 2, fontFamily: "var(--font-mono)" }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Add Document", icon: <FileText size={15}/>, page: "file-cabinet", color: HILITE },
          { label: "Add Contact", icon: <Users size={15}/>, page: "contacts-legacy", color: SUCCESS },
          { label: "Check Storage", icon: <HardDrive size={15}/>, page: "storage-usage", color: WARN },
          { label: "Refer & Earn", icon: <TrendingUp size={15}/>, page: "affiliate", color: "#6E8BFF" },
        ].map(action => (
          <button key={action.label} onClick={() => onNavigate(action.page)} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all text-left fpd-hover-lift glow-surface" style={CARD}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${action.color}1E`, color: action.color }}>{action.icon}</div>
            <span style={{ color: TEXT, fontSize: 12.5, fontWeight: 550 }}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
