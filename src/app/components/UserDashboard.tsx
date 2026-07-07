import React from "react";
import { Archive, Users, HardDrive, TrendingUp, Bell, AlertTriangle, FileText, Shield, ArrowRight } from "lucide-react";
import fpdLongLogo from "../../imports/FPD_long_logo_blue.png";

interface UserDashboardProps { onNavigate: (page: string) => void; }

/* Premium dark-blue palette — white-only fonts, matches Layout.tsx */
const TEXT   = "#FFFFFF";
const MUTED  = "rgba(255,255,255,0.65)";
const HILITE = "#A29BFE";
const ACCENT = "#6C5CE7";
const ACCENT2 = "#8B7CF6";

const CARD = { background: "#16161F", border: "1px solid rgba(108,92,231,0.2)", boxShadow: "0 4px 24px rgba(0,0,0,0.35)", borderRadius: 20 } as React.CSSProperties;

const storageHistory = [
  { month:"Jan",used:4.2 },{ month:"Feb",used:6.8 },{ month:"Mar",used:9.1 },
  { month:"Apr",used:11.5 },{ month:"May",used:14.3 },{ month:"Jun",used:16.9 },
];

const recentActivity = [
  { action:"Will & Testament uploaded", time:"2 hours ago", type:"upload" },
  { action:"Legacy Contact verified: Sarah Johnson", time:"1 day ago", type:"verify" },
  { action:"Storage warning: 80% used", time:"3 days ago", type:"warning" },
  { action:"Insurance Policy uploaded", time:"5 days ago", type:"upload" },
  { action:"Referral commission earned: $49.99", time:"1 week ago", type:"earn" },
];

const legacyDocs = [
  { name:"Last Will & Testament", updated:"Jun 8, 2026", size:"2.4 MB", status:"verified" },
  { name:"Life Insurance Policy", updated:"May 22, 2026", size:"1.1 MB", status:"verified" },
  { name:"Financial Account List", updated:"May 15, 2026", size:"0.4 MB", status:"pending" },
  { name:"Digital Asset Inventory", updated:"Apr 30, 2026", size:"0.8 MB", status:"verified" },
];

const activityColor = { upload:HILITE, verify:"#48BB78", warning:"#F6AD55", earn:"#9F7AEA" } as Record<string,string>;

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const used = 16.9, total = 25, pct = Math.round((used/total)*100);
  const docsTotal = 14, docsPending = 4, docsVerified = docsTotal - docsPending;
  const verifiedPct = Math.round((docsVerified/docsTotal)*100);
  const contactsTotal = 3;

  const statCards = [
    { label:"Legacy Documents", value:String(docsTotal), sub:`${docsPending} pending review`, icon:<Archive size={16}/>, color:HILITE },
    { label:"Legacy Contacts", value:String(contactsTotal), sub:"2 verified", icon:<Users size={16}/>, color:"#48BB78" },
    { label:"Storage Used", value:`${used} GB`, sub:`of ${total} GB (${pct}%)`, icon:<HardDrive size={16}/>, color: pct>=80?"#F6AD55":HILITE },
    { label:"Referral Earnings", value:"$284.50", sub:"This month", icon:<TrendingUp size={16}/>, color:"#9F7AEA", filled:true },
  ];

  // Circular gauge geometry for document verification
  const r = 44, c = 2*Math.PI*r;
  const gaugeOffset = c * (1 - verifiedPct/100);

  return (
    <div className="p-6 space-y-5" style={{ maxWidth:1200 }}>
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <img src={fpdLongLogo} alt="Final Pass Down" style={{ height:20, objectFit:"contain", filter:"brightness(0) invert(1)", marginBottom:10, opacity:0.9 }} />
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:TEXT, marginBottom:4 }}>Welcome back, James</h1>
          <p style={{ color:MUTED, fontSize:14 }}>Your legacy vault is active and protected.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl flex-shrink-0" style={{ background:"rgba(72,187,120,0.1)", border:"1px solid rgba(72,187,120,0.25)" }}>
          <Shield size={13} color="#48BB78" />
          <span style={{ color:"#48BB78", fontSize:12, fontWeight:600 }}>Vault Active</span>
        </div>
      </div>

      {/* storage warning */}
      {pct>=80 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ ...CARD, background:"rgba(246,173,85,0.08)", border:"1px solid rgba(246,173,85,0.3)" }}>
          <AlertTriangle size={15} color="#F6AD55" />
          <div className="flex-1">
            <span style={{ color:"#F6AD55", fontWeight:700, fontSize:14 }}>Storage at {pct}% </span>
            <span style={{ color:MUTED, fontSize:14 }}>— Consider upgrading to avoid overage charges.</span>
          </div>
          <button onClick={()=>onNavigate("storage-usage")} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm" style={{ background:"rgba(246,173,85,0.18)", color:"#F6AD55" }}>
            View <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={card.label} className="p-5 relative overflow-hidden fpd-hover-lift glow-surface fpd-fade-in-up" style={{
            ...CARD, borderRadius:20, animationDelay:`${i*60}ms`,
            ...(card.filled ? { background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`, border:"none", boxShadow:"0 8px 28px rgba(108,92,231,0.45)" } : {}),
          }}>
            {card.filled && (
              <svg width="140" height="70" viewBox="0 0 140 70" style={{ position:"absolute", right:-10, bottom:-6, opacity:0.4 }}>
                <path d="M0,50 Q20,20 40,42 T80,30 T140,10" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
              </svg>
            )}
            <div className="flex items-center justify-between mb-4" style={{ position:"relative" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.filled ? "rgba(255,255,255,0.16)" : `${card.color}1E`, color: card.filled ? "#FFFFFF" : card.color }}>{card.icon}</div>
              <div style={{ color: card.filled ? "rgba(255,255,255,0.85)" : card.color, fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:"0.08em" }}>LIVE</div>
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:24, color: "#FFFFFF", marginBottom:4, position:"relative" }}>{card.value}</div>
            <div style={{ color: card.filled ? "rgba(255,255,255,0.75)" : MUTED, fontSize:12, position:"relative" }}>{card.label}</div>
            <div style={{ color: card.filled ? "rgba(255,255,255,0.85)" : card.color, fontSize:10, marginTop:2, fontFamily:"var(--font-mono)", position:"relative" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* storage chart + document verification gauge + profile */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-1">
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>Storage Usage — 6 Months</h3>
            <span className="px-2.5 py-1 rounded-full" style={{ background: pct>=80?"rgba(246,173,85,0.16)":"rgba(72,187,120,0.14)", color: pct>=80?"#F6AD55":"#48BB78", fontSize:10.5, fontWeight:700 }}>
              {pct>=80 ? "Near Limit" : "On Track"}
            </span>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <div>
              <div style={{ color:MUTED, fontSize:11 }}>Used</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:TEXT }}>{used} GB</div>
            </div>
            <div style={{ width:1, height:28, background:"rgba(108,92,231,0.2)" }} />
            <div>
              <div style={{ color:MUTED, fontSize:11 }}>Available</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:TEXT }}>{(total-used).toFixed(1)} GB</div>
            </div>
            <button onClick={()=>onNavigate("storage-usage")} className="ml-auto" style={{ color:HILITE, fontSize:12 }}>Details →</button>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:150, padding:"8px 0" }}>
            {storageHistory.map((d, i) => {
              const barH = Math.round((d.used / total) * 120);
              const isLast = i === storageHistory.length - 1;
              return (
                <div key={d.month} className="flex flex-col items-center gap-1.5 flex-1 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                    style={{ background:"#050A16", color:"#fff", fontSize:11, fontFamily:"var(--font-mono)", zIndex:10 }}>
                    {d.used} GB
                  </div>
                  <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                    <div className="w-full rounded-t-lg transition-all"
                      style={{ height: barH, background: isLast ? `linear-gradient(180deg,${ACCENT},${ACCENT2})` : "rgba(162,155,254,0.18)", boxShadow: isLast ? "0 0 12px rgba(108,92,231,0.4)" : "none" }}/>
                  </div>
                  <span style={{ color:MUTED, fontSize:10, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
              <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background:pct>=90?"#E53E3E":pct>=80?"#F6AD55":`linear-gradient(90deg,${ACCENT},${ACCENT2})` }} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 p-5 flex flex-col items-center text-center fpd-hover-lift glow-surface" style={CARD}>
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:13, color:TEXT, alignSelf:"flex-start", marginBottom:2 }}>Document Verification</h3>
          <p style={{ color:MUTED, fontSize:10.5, alignSelf:"flex-start", marginBottom:10 }}>{docsVerified} of {docsTotal} verified</p>
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="55" cy="55" r={r} fill="none" stroke={HILITE} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={gaugeOffset} transform="rotate(-90 55 55)" />
            <text x="55" y="60" textAnchor="middle" style={{ fontFamily:"var(--font-display)", fontSize:20, fill:TEXT }}>{verifiedPct}%</text>
          </svg>
          <p style={{ color:MUTED, fontSize:10.5, marginTop:8 }}>{docsPending} awaiting review</p>
        </div>

        <div className="lg:col-span-1 p-5 flex flex-col items-center text-center fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-center rounded-full mb-3" style={{ width:56, height:56, background:"rgba(108,92,231,0.25)", color:HILITE, fontFamily:"var(--font-display)", fontSize:18 }}>J</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:TEXT }}>James</div>
          <div style={{ color:MUTED, fontSize:10.5, marginBottom:14 }}>Legacy Vault Member</div>
          <div className="flex items-center justify-between w-full" style={{ borderTop:"1px solid rgba(108,92,231,0.2)", paddingTop:12 }}>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>{docsTotal}</div>
              <div style={{ color:MUTED, fontSize:9.5 }}>Documents</div>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>{contactsTotal}</div>
              <div style={{ color:MUTED, fontSize:9.5 }}>Contacts</div>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>{verifiedPct}%</div>
              <div style={{ color:MUTED, fontSize:9.5 }}>Verified</div>
            </div>
          </div>
        </div>
      </div>

      {/* documents + activity */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>Recent Documents</h3>
            <button onClick={()=>onNavigate("legacy-vault")} style={{ color:HILITE, fontSize:12 }}>Open Vault →</button>
          </div>
          <div className="space-y-2">
            {legacyDocs.map((doc,i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background:"rgba(255,255,255,0.035)" }}>
                <div className="flex items-center gap-3">
                  <FileText size={14} color={HILITE} />
                  <div>
                    <div style={{ color:TEXT, fontSize:13 }}>{doc.name}</div>
                    <div style={{ color:MUTED, fontSize:10, fontFamily:"var(--font-mono)" }}>{doc.size} · {doc.updated}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background:doc.status==="verified"?"rgba(72,187,120,0.14)":"rgba(246,173,85,0.16)", color:doc.status==="verified"?"#48BB78":"#F6AD55", fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700 }}>
                  {doc.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 fpd-hover-lift glow-surface" style={CARD}>
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:TEXT }}>Activity Feed</h3>
            <Bell size={14} color={MUTED} />
          </div>
          <div className="space-y-4">
            {recentActivity.map((a,i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background:activityColor[a.type], boxShadow:`0 0 6px ${activityColor[a.type]}` }} />
                <div>
                  <div style={{ color:TEXT, fontSize:12 }}>{a.action}</div>
                  <div style={{ color:MUTED, fontSize:10, marginTop:2, fontFamily:"var(--font-mono)" }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Add Document", icon:<FileText size={15}/>, page:"legacy-vault", color:HILITE },
          { label:"Add Contact", icon:<Users size={15}/>, page:"legacy-verification", color:"#48BB78" },
          { label:"Check Storage", icon:<HardDrive size={15}/>, page:"storage-usage", color:"#F6AD55" },
          { label:"Refer & Earn", icon:<TrendingUp size={15}/>, page:"affiliate", color:"#9F7AEA" },
        ].map(action => (
          <button key={action.label} onClick={()=>onNavigate(action.page)} className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left fpd-hover-lift glow-surface" style={CARD}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${action.color}1E`, color:action.color }}>{action.icon}</div>
            <span style={{ color:TEXT, fontSize:12, fontWeight:500 }}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
