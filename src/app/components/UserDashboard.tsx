import React from "react";
import { Archive, Users, HardDrive, TrendingUp, Bell, CheckCircle, AlertTriangle, Clock, FileText, Shield, ArrowRight } from "lucide-react";
import fpdLongLogo from "../../imports/FPD_long_logo_blue.png";

interface UserDashboardProps { onNavigate: (page: string) => void; }

const GLASS = { background: "#FFFFFF", border: "1px solid rgba(32,64,192,0.1)", boxShadow: "0 2px 12px rgba(32,64,192,0.06)", borderRadius: 16 } as React.CSSProperties;
const GRID = { backgroundImage: "linear-gradient(rgba(32,64,192,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(32,64,192,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" } as React.CSSProperties;

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

const activityColor = { upload:"#2040C0", verify:"#48BB78", warning:"#F6AD55", earn:"#9F7AEA" } as Record<string,string>;

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const used = 16.9, total = 25, pct = Math.round((used/total)*100);

  const statCards = [
    { label:"Legacy Documents", value:"14", sub:"4 pending review", icon:<Archive size={16}/>, color:"#2040C0" },
    { label:"Legacy Contacts", value:"3", sub:"2 verified", icon:<Users size={16}/>, color:"#48BB78" },
    { label:"Storage Used", value:`${used} GB`, sub:`of ${total} GB (${pct}%)`, icon:<HardDrive size={16}/>, color: pct>=80?"#F6AD55":"#2040C0" },
    { label:"Referral Earnings", value:"$284.50", sub:"This month", icon:<TrendingUp size={16}/>, color:"#9F7AEA" },
  ];

  return (
    <div className="p-6 space-y-6 relative" style={{ maxWidth:1200, ...GRID }}>
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <img src={fpdLongLogo} alt="Final Pass Down" style={{ height:20, objectFit:"contain", filter:"brightness(0) saturate(100%) invert(28%) sepia(82%) saturate(600%) hue-rotate(218deg) brightness(90%)", marginBottom:10 }} />
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#0D1428", marginBottom:4 }}>Welcome back, James</h1>
          <p style={{ color:"#5A6A88", fontSize:14 }}>Your legacy vault is active and protected.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0" style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
          <Shield size={13} color="#48BB78" />
          <span style={{ color:"#48BB78", fontSize:12, fontWeight:500 }}>Vault Active</span>
        </div>
      </div>

      {/* storage warning */}
      {pct>=80 && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border" style={{ background:"rgba(246,173,85,0.06)", borderColor:"rgba(246,173,85,0.25)" }}>
          <AlertTriangle size={15} color="#F6AD55" />
          <div className="flex-1">
            <span style={{ color:"#F6AD55", fontWeight:600, fontSize:14 }}>Storage at {pct}% </span>
            <span style={{ color:"#5A6A88", fontSize:14 }}>— Consider upgrading to avoid overage charges.</span>
          </div>
          <button onClick={()=>onNavigate("storage-usage")} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm" style={{ background:"rgba(246,173,85,0.15)", color:"#F6AD55" }}>
            View <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="p-5 rounded-2xl" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:`${card.color}14`, color:card.color }}>{card.icon}</div>
              <div style={{ color:card.color, fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:"0.08em" }}>LIVE</div>
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#0D1428", marginBottom:4 }}>{card.value}</div>
            <div style={{ color:"#5A6A88", fontSize:12 }}>{card.label}</div>
            <div style={{ color:card.color, fontSize:10, marginTop:2, fontFamily:"var(--font-mono)" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* chart + activity */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 p-6 rounded-2xl" style={GLASS}>
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428" }}>Storage Usage — 6 Months</h3>
            <button onClick={()=>onNavigate("storage-usage")} style={{ color:"#2040C0", fontSize:12 }}>Details →</button>
          </div>
          {/* CSS-only bar chart — no SVG IDs, no recharts collision */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:180, padding:"8px 0" }}>
            {storageHistory.map((d, i) => {
              const barH = Math.round((d.used / total) * 140);
              const isLast = i === storageHistory.length - 1;
              return (
                <div key={d.month} className="flex flex-col items-center gap-1.5 flex-1 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                    style={{ background:"#0D1428", color:"#fff", fontSize:11, fontFamily:"var(--font-mono)", zIndex:10 }}>
                    {d.used} GB
                  </div>
                  <div style={{ flex:1, display:"flex", alignItems:"flex-end", width:"100%" }}>
                    <div className="w-full rounded-t-lg transition-all"
                      style={{ height: barH, background: isLast ? "linear-gradient(180deg,#2040C0,#3355E0)" : "rgba(32,64,192,0.2)", boxShadow: isLast ? "0 0 12px rgba(32,64,192,0.25)" : "none" }}/>
                  </div>
                  <span style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ color:"#5A6A88", fontSize:12 }}>{used} GB of {total} GB</span>
              <span style={{ color:pct>=80?"#F6AD55":"#2040C0", fontSize:11, fontFamily:"var(--font-mono)" }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background:"rgba(32,64,192,0.1)" }}>
              <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background:pct>=90?"#E53E3E":pct>=80?"#F6AD55":"linear-gradient(90deg,#2040C0,#3355E0)", boxShadow:`0 0 8px ${pct>=80?"#F6AD55":"#2040C0"}` }} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 p-6 rounded-2xl" style={GLASS}>
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428" }}>Activity Feed</h3>
            <Bell size={14} color="#5A6A88" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((a,i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background:activityColor[a.type], boxShadow:`0 0 6px ${activityColor[a.type]}` }} />
                <div>
                  <div style={{ color:"#374669", fontSize:12 }}>{a.action}</div>
                  <div style={{ color:"#8A9AB8", fontSize:10, marginTop:2, fontFamily:"var(--font-mono)" }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* documents */}
      <div className="p-6 rounded-2xl" style={GLASS}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428" }}>Recent Documents</h3>
          <button onClick={()=>onNavigate("legacy-vault")} style={{ color:"#2040C0", fontSize:12 }}>Open Vault →</button>
        </div>
        <div className="space-y-2">
          {legacyDocs.map((doc,i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.08)" }}>
              <div className="flex items-center gap-3">
                <FileText size={14} color="#2040C0" />
                <div>
                  <div style={{ color:"#0D1428", fontSize:13 }}>{doc.name}</div>
                  <div style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)" }}>{doc.size} · {doc.updated}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs" style={{ background:doc.status==="verified"?"rgba(72,187,120,0.1)":"rgba(246,173,85,0.1)", color:doc.status==="verified"?"#48BB78":"#F6AD55", fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700 }}>
                {doc.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Add Document", icon:<FileText size={15}/>, page:"legacy-vault", color:"#2040C0" },
          { label:"Add Contact", icon:<Users size={15}/>, page:"legacy-verification", color:"#48BB78" },
          { label:"Check Storage", icon:<HardDrive size={15}/>, page:"storage-usage", color:"#F6AD55" },
          { label:"Refer & Earn", icon:<TrendingUp size={15}/>, page:"affiliate", color:"#9F7AEA" },
        ].map(action => (
          <button key={action.label} onClick={()=>onNavigate(action.page)} className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left" style={{ ...GLASS }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:`${action.color}14`, color:action.color }}>{action.icon}</div>
            <span style={{ color:"#0D1428", fontSize:12, fontWeight:500 }}>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
