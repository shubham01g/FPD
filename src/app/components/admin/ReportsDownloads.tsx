import React, { useState } from "react";
import {
  Download, FileText, BarChart3, Users, DollarSign, HardDrive,
  TrendingUp, Star, Shield, Calendar, Filter, RefreshCw, CheckCircle,
  Clock, AlertTriangle, Globe, Key, UserCheck, ChevronDown, X, Send
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(32,64,192,0.12)", borderRadius:16, boxShadow:"0 2px 12px rgba(32,64,192,0.06)" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.15)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"#0D1428", outline:"none" };

/* ── Report catalog ──────────────────────────────────────────────── */
interface ReportDef {
  id: string;
  name: string;
  description: string;
  category: "financial" | "users" | "storage" | "operations" | "compliance" | "marketing";
  formats: ("CSV" | "PDF" | "XLSX" | "JSON")[];
  icon: React.ReactNode;
  color: string;
  fields: string[];
  estimatedRows?: string;
}

const REPORTS: ReportDef[] = [
  // Financial
  {
    id: "mrr_summary",
    name: "MRR Summary",
    description: "Monthly recurring revenue broken down by plan tier, new subscriptions, churned accounts, and net revenue change.",
    category: "financial",
    formats: ["CSV","PDF","XLSX"],
    icon: <DollarSign size={16}/>,
    color: "#48BB78",
    fields: ["Month","Plan","New Subscribers","Churned","MRR","Net Change","Overage Revenue"],
    estimatedRows: "~60 rows (5 plans × 12 months)",
  },
  {
    id: "payout_history",
    name: "Payout History",
    description: "All affiliate and partner commission payouts processed. Includes payment method, status, and transaction IDs.",
    category: "financial",
    formats: ["CSV","PDF","XLSX"],
    icon: <TrendingUp size={16}/>,
    color: "#48BB78",
    fields: ["Date","Affiliate/Partner","Amount","Method","Status","Transaction ID","Period"],
    estimatedRows: "~840 rows",
  },
  {
    id: "overage_billing",
    name: "Overage Billing Report",
    description: "All storage overage charges by user, plan, GB over limit, and amount charged.",
    category: "financial",
    formats: ["CSV","XLSX"],
    icon: <HardDrive size={16}/>,
    color: "#48BB78",
    fields: ["User ID","Name","Plan","Storage Used GB","Limit GB","Overage GB","Rate","Amount Charged","Billing Date"],
    estimatedRows: "~2,400 rows",
  },
  {
    id: "continuation_fees",
    name: "$199 Continuation Fee Log",
    description: "All Legacy Continuation Fee payments: paid by whom, payment method (card/crypto), activation status.",
    category: "financial",
    formats: ["CSV","PDF","XLSX"],
    icon: <Key size={16}/>,
    color: "#48BB78",
    fields: ["Account","Paid By","Amount","Method","Paid At","Death Cert Received","Activated At","Activated By"],
    estimatedRows: "~380 rows",
  },
  {
    id: "white_glove_billing",
    name: "White Glove Billing Report",
    description: "Setup fees, session blocks billed, and total charges per WG client. Includes specialist assignment.",
    category: "financial",
    formats: ["CSV","PDF","XLSX"],
    icon: <Star size={16}/>,
    color: "#48BB78",
    fields: ["Client","Specialist","Setup Fee","Sessions","Total Mins","Blocks Billed","Session Charges","Total Billed","Card Last 4"],
    estimatedRows: "~180 rows",
  },

  // Users
  {
    id: "user_roster",
    name: "Full User Roster",
    description: "Complete list of all platform accounts with plan, storage, contact counts, and account status.",
    category: "users",
    formats: ["CSV","XLSX","JSON"],
    icon: <Users size={16}/>,
    color: "#4A90D9",
    fields: ["User ID","Name","Email","Plan","Storage Used GB","Legacy Contacts","Guardian Contacts","Joined","Status","2FA Enabled"],
    estimatedRows: "~51,490 rows",
  },
  {
    id: "new_signups",
    name: "New Signup Report",
    description: "New account registrations by date range, including referral source and acquisition channel.",
    category: "users",
    formats: ["CSV","PDF","XLSX"],
    icon: <Users size={16}/>,
    color: "#4A90D9",
    fields: ["Date","User ID","Name","Email","Plan","Referral Source","Affiliate ID","Channel","WG Enrolled"],
    estimatedRows: "Varies by date range",
  },
  {
    id: "churn_report",
    name: "Churn & Cancellation Report",
    description: "Cancelled and suspended accounts with cancellation reason, plan at cancellation, and lifetime value.",
    category: "users",
    formats: ["CSV","PDF","XLSX"],
    icon: <Users size={16}/>,
    color: "#4A90D9",
    fields: ["User ID","Name","Plan","Joined","Cancelled","Days Active","LTV","Cancellation Reason","Reactivated"],
    estimatedRows: "~3,200 rows",
  },
  {
    id: "manually_onboarded",
    name: "Manually Onboarded Accounts",
    description: "All accounts onboarded by an admin, including subscription waiver reason and onboarding admin.",
    category: "users",
    formats: ["CSV","XLSX"],
    icon: <Users size={16}/>,
    color: "#4A90D9",
    fields: ["Account ID","Name","Email","Plan","Waiver Reason","White Glove","Onboarded By","Onboarded At","Notes"],
    estimatedRows: "~420 rows",
  },

  // Storage
  {
    id: "storage_usage",
    name: "Storage Usage by User",
    description: "Per-user storage breakdown by category (legal, financial, media, etc.) and total consumption.",
    category: "storage",
    formats: ["CSV","XLSX"],
    icon: <HardDrive size={16}/>,
    color: "#9F7AEA",
    fields: ["User ID","Name","Plan","Limit GB","Used GB","Pct Used","Legal Docs GB","Financial GB","Media GB","Other GB","Status"],
    estimatedRows: "~51,490 rows",
  },
  {
    id: "storage_alerts",
    name: "Storage Alert History",
    description: "All 80%, 90%, 95% storage alerts and overage notifications sent, with user response (upgraded / no action).",
    category: "storage",
    formats: ["CSV","PDF"],
    icon: <AlertTriangle size={16}/>,
    color: "#9F7AEA",
    fields: ["Date","User ID","Name","Alert Type","Storage Pct","Email Sent","Action Taken"],
    estimatedRows: "~18,000 rows",
  },

  // Operations
  {
    id: "wg_client_status",
    name: "White Glove Client Status",
    description: "All WG clients with specialist, onboarding completion %, session count, waiver status, and next session.",
    category: "operations",
    formats: ["CSV","PDF","XLSX"],
    icon: <Star size={16}/>,
    color: "#ED8936",
    fields: ["Client ID","Name","Specialist","Status","Completion %","Sessions","Waiver","Next Session","Plan","Waived"],
    estimatedRows: "~180 rows",
  },
  {
    id: "id_verification",
    name: "ID Verification Queue Report",
    description: "All government ID submissions with status (pending/verified/rejected), type, and review timeline.",
    category: "operations",
    formats: ["CSV","PDF"],
    icon: <UserCheck size={16}/>,
    color: "#ED8936",
    fields: ["Verification ID","Contact Name","For Account","ID Type","Submitted","Status","Reviewed By","Review Date","Notes"],
    estimatedRows: "~14,200 rows",
  },
  {
    id: "affiliate_performance",
    name: "Affiliate Performance Report",
    description: "Referral counts, conversion rates, earned commissions, and tier status per affiliate.",
    category: "operations",
    formats: ["CSV","PDF","XLSX"],
    icon: <TrendingUp size={16}/>,
    color: "#ED8936",
    fields: ["Affiliate ID","Name","Tier","Referrals","Conversions","Conv Rate","Earned","Paid","Unpaid","Joined"],
    estimatedRows: "~6,800 rows",
  },
  {
    id: "partner_activity",
    name: "Partner & White Label Activity",
    description: "All partner and WL accounts with plan, active users, MRR, setup fee paid, and payout history.",
    category: "operations",
    formats: ["CSV","PDF","XLSX"],
    icon: <Globe size={16}/>,
    color: "#ED8936",
    fields: ["Partner ID","Org Name","Package","Active Users","MRR","Setup Fee Paid","Total Paid","Last Payout","Status"],
    estimatedRows: "~420 rows",
  },

  // Compliance
  {
    id: "audit_log_export",
    name: "Audit Log Export",
    description: "Full admin action audit trail. All create, update, delete, and access events with actor, target, and timestamp.",
    category: "compliance",
    formats: ["CSV","JSON","PDF"],
    icon: <Shield size={16}/>,
    color: "#FC8181",
    fields: ["Log ID","Timestamp","Actor","Role","Action","Target","IP Address","Severity","Session ID"],
    estimatedRows: "~280,000 rows (use date filter)",
  },
  {
    id: "gdpr_export",
    name: "GDPR / Data Request Export",
    description: "Full data export for a specific user account for GDPR, CCPA, or legal data requests.",
    category: "compliance",
    formats: ["JSON","PDF"],
    icon: <Shield size={16}/>,
    color: "#FC8181",
    fields: ["Profile","Contacts","Documents (metadata)","Diary Entries","Payments","Login History","Preferences"],
    estimatedRows: "Single user — full record",
  },
  {
    id: "admin_access_log",
    name: "Admin Access & Permission Log",
    description: "All admin account logins, permission changes, and role updates. Useful for security audits.",
    category: "compliance",
    formats: ["CSV","PDF"],
    icon: <Shield size={16}/>,
    color: "#FC8181",
    fields: ["Date","Admin Name","Action","IP Address","Module","Old Value","New Value"],
    estimatedRows: "~8,400 rows",
  },

  // Marketing
  {
    id: "push_notification_stats",
    name: "Push Notification Performance",
    description: "Delivered, opened, and open rate per notification campaign. Segment breakdown by plan.",
    category: "marketing",
    formats: ["CSV","PDF","XLSX"],
    icon: <BarChart3 size={16}/>,
    color: "#2040C0",
    fields: ["Notification ID","Title","Type","Target Segment","Sent At","Delivered","Opened","Open Rate %","Scheduled"],
    estimatedRows: "~240 rows",
  },
  {
    id: "email_delivery",
    name: "Transactional Email Report",
    description: "Delivery, open, and bounce rates for all 16 transactional email templates.",
    category: "marketing",
    formats: ["CSV","PDF"],
    icon: <Send size={16}/>,
    color: "#2040C0",
    fields: ["Template","Sent","Delivered","Opens","Open Rate %","Bounces","Bounce Rate %","Unsubscribes"],
    estimatedRows: "~16 rows (one per template)",
  },
];

const CATEGORY_META: Record<ReportDef["category"], { label: string; color: string; icon: React.ReactNode }> = {
  financial:   { label:"Financial",   color:"#48BB78", icon:<DollarSign size={13}/> },
  users:       { label:"Users",       color:"#4A90D9", icon:<Users size={13}/> },
  storage:     { label:"Storage",     color:"#9F7AEA", icon:<HardDrive size={13}/> },
  operations:  { label:"Operations",  color:"#ED8936", icon:<Star size={13}/> },
  compliance:  { label:"Compliance",  color:"#FC8181", icon:<Shield size={13}/> },
  marketing:   { label:"Marketing",   color:"#2040C0", icon:<BarChart3 size={13}/> },
};

/* ── Recent downloads seed ───────────────────────────────────────── */
interface Download {
  id: string;
  reportName: string;
  format: string;
  generatedAt: string;
  generatedBy: string;
  size: string;
  status: "ready" | "generating" | "failed";
  rows: string;
}

const initDownloads: Download[] = [
  { id:"DL-006", reportName:"MRR Summary",             format:"PDF",  generatedAt:"Jun 28, 2026 · 9:14 AM", generatedBy:"Alex Johnson",  size:"1.2 MB",  status:"ready",      rows:"60" },
  { id:"DL-005", reportName:"Full User Roster",        format:"CSV",  generatedAt:"Jun 27, 2026 · 4:51 PM", generatedBy:"Alex Johnson",  size:"18.4 MB", status:"ready",      rows:"51,490" },
  { id:"DL-004", reportName:"Payout History",          format:"XLSX", generatedAt:"Jun 26, 2026 · 2:20 PM", generatedBy:"Derek Mills",   size:"3.1 MB",  status:"ready",      rows:"840" },
  { id:"DL-003", reportName:"Audit Log Export",        format:"CSV",  generatedAt:"Jun 25, 2026 · 11:08 AM",generatedBy:"Alex Johnson",  size:"42.7 MB", status:"ready",      rows:"280,000" },
  { id:"DL-002", reportName:"White Glove Billing",     format:"PDF",  generatedAt:"Jun 24, 2026 · 3:00 PM", generatedBy:"Simone Carter", size:"0.8 MB",  status:"ready",      rows:"180" },
  { id:"DL-001", reportName:"Storage Usage by User",   format:"XLSX", generatedAt:"Jun 22, 2026 · 10:31 AM",generatedBy:"Alex Johnson",  size:"9.2 MB",  status:"ready",      rows:"51,490" },
];

/* ── Report card ─────────────────────────────────────────────────── */
function ReportCard({ report, onGenerate }: { report: ReportDef; onGenerate: (r: ReportDef, fmt: string, range: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fmt, setFmt] = useState(report.formats[0]);
  const [range, setRange] = useState("last_30");
  const cat = CATEGORY_META[report.category];

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width:40, height:40, background:`${report.color}15`, color:report.color }}>
              {report.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#0D1428" }}>{report.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{ background:`${cat.color}12`, color:cat.color, ...MONO }}>
                  {cat.icon}{cat.label}
                </span>
              </div>
              <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.5 }}>{report.description}</div>
              {report.estimatedRows && (
                <div style={{ color:"#8A9AB8", fontSize:11, marginTop:4 }}>
                  <span style={MONO}>~{report.estimatedRows}</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{ color:"#8A9AB8", flexShrink:0 }}>
            {expanded ? <ChevronDown size={15} style={{ transform:"rotate(180deg)" }}/> : <ChevronDown size={15}/>}
          </button>
        </div>

        {/* Quick download bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {/* Format selector */}
          <div className="flex gap-1">
            {report.formats.map(f => (
              <button key={f} onClick={() => setFmt(f)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                style={{ background:fmt===f?`${report.color}18`:"rgba(32,64,192,0.04)", color:fmt===f?report.color:"#8A9AB8", border:`1px solid ${fmt===f?report.color+"30":"rgba(32,64,192,0.1)"}` }}>
                {f}
              </button>
            ))}
          </div>
          {/* Date range */}
          <select value={range} onChange={e => setRange(e.target.value)}
            style={{ ...INPUT, padding:"5px 10px", fontSize:11, width:"auto" }}>
            <option value="last_7">Last 7 days</option>
            <option value="last_30">Last 30 days</option>
            <option value="last_90">Last 90 days</option>
            <option value="ytd">Year to date</option>
            <option value="all_time">All time</option>
            <option value="custom">Custom range…</option>
          </select>
          <button onClick={() => onGenerate(report, fmt, range)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ml-auto"
            style={{ background:`linear-gradient(135deg,${report.color},${report.color}CC)`, color:"#fff", boxShadow:`0 2px 10px ${report.color}30` }}>
            <Download size={12}/> Generate & Download
          </button>
        </div>
      </div>

      {/* Expanded — field list */}
      {expanded && (
        <div className="px-5 pb-5 border-t pt-4 space-y-3" style={{ borderColor:"rgba(32,64,192,0.08)" }}>
          <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>INCLUDED FIELDS ({report.fields.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {report.fields.map(f => (
              <span key={f} className="px-2 py-1 rounded-lg text-xs"
                style={{ background:"rgba(32,64,192,0.04)", color:"#5A6A88", border:"1px solid rgba(32,64,192,0.08)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function ReportsDownloads() {
  const [downloads, setDownloads] = useState<Download[]>(initDownloads);
  const [activeCategory, setActiveCategory] = useState<ReportDef["category"] | "all">("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "history">("reports");

  const dateRangeLabel: Record<string, string> = {
    last_7:"last 7 days", last_30:"last 30 days", last_90:"last 90 days",
    ytd:"year to date", all_time:"all time", custom:"custom range",
  };

  function generateReport(report: ReportDef, fmt: string, range: string) {
    if (generating) return;
    setGenerating(report.id);
    toast.loading(`Generating ${report.name} (${fmt})…`, { id:"gen" });
    setTimeout(() => {
      const dl: Download = {
        id: `DL-${String(Date.now()).slice(-4)}`,
        reportName: report.name,
        format: fmt,
        generatedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        generatedBy: "Alex Johnson",
        size: `${(Math.random()*20+0.5).toFixed(1)} MB`,
        status: "ready",
        rows: report.estimatedRows ?? "—",
      };
      setDownloads(prev => [dl, ...prev]);
      setGenerating(null);
      toast.success(`${report.name}.${fmt.toLowerCase()} ready to download`, { id:"gen" });
      setActiveTab("history");
    }, 1800);
  }

  const filtered = REPORTS.filter(r =>
    (activeCategory === "all" || r.category === activeCategory) &&
    (search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label:"Available Reports", value:REPORTS.length,  color:"#2040C0" },
    { label:"Generated This Month", value:downloads.length, color:"#48BB78" },
    { label:"Categories",          value:6,              color:"#9F7AEA" },
    { label:"Export Formats",      value:4,              color:"#ED8936" },
  ];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Download size={15} color="#2040C0"/>
          <span style={{ color:"#2040C0", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>COMMAND CENTER · REPORTS & DOWNLOADS</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#0D1428" }}>Reports & Downloads</h1>
        <p style={{ color:"#5A6A88", fontSize:13, marginTop:4 }}>
          Generate and download platform data in CSV, PDF, XLSX, or JSON format. All exports are scoped to your admin permissions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-2xl text-center" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(32,64,192,0.05)", border:"1px solid rgba(32,64,192,0.1)" }}>
        {([["reports","📋 Report Catalog"],["history","📥 Download History"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background:activeTab===id?"#2040C0":"transparent", color:activeTab===id?"#fff":"#5A6A88" }}>
            {label}
          </button>
        ))}
      </div>

      {/* REPORT CATALOG */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…" style={{ ...INPUT, width:220, padding:"8px 12px" }}/>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setActiveCategory("all")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background:activeCategory==="all"?"#2040C0":"rgba(32,64,192,0.04)", color:activeCategory==="all"?"#fff":"#5A6A88", border:"1px solid rgba(32,64,192,0.1)" }}>
                All
              </button>
              {(Object.entries(CATEGORY_META) as [ReportDef["category"], typeof CATEGORY_META[ReportDef["category"]]][]).map(([key, meta]) => (
                <button key={key} onClick={() => setActiveCategory(key)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background:activeCategory===key?`${meta.color}18`:"rgba(32,64,192,0.04)", color:activeCategory===key?meta.color:"#5A6A88", border:`1px solid ${activeCategory===key?meta.color+"30":"rgba(32,64,192,0.1)"}` }}>
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Report cards */}
          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color:"#8A9AB8" }}>No reports match your search.</div>
          )}
          <div className="space-y-3">
            {filtered.map(r => (
              <ReportCard key={r.id} report={r} onGenerate={generateReport}/>
            ))}
          </div>
        </div>
      )}

      {/* DOWNLOAD HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div style={{ color:"#5A6A88", fontSize:13 }}>{downloads.length} exports generated</div>
            <button onClick={() => toast.success("Download history cleared")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
              style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
              <X size={11}/> Clear History
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden" style={CARD}>
            <table className="w-full text-sm" style={{ borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"rgba(32,64,192,0.04)", borderBottom:"1px solid rgba(32,64,192,0.08)" }}>
                  {["Report","Format","Generated","By","Size","Rows","Action"].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#8A9AB8", fontSize:10, ...MONO, fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {downloads.map((dl, i) => {
                  const fmtColor: Record<string, string> = { CSV:"#48BB78", PDF:"#FC8181", XLSX:"#4A90D9", JSON:"#F6AD55" };
                  const color = fmtColor[dl.format] ?? "#8A9AB8";
                  return (
                    <tr key={dl.id} style={{ borderBottom: i < downloads.length-1 ? "1px solid rgba(32,64,192,0.06)" : "none" }}>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ color:"#0D1428", fontWeight:500, fontSize:13 }}>{dl.reportName}</div>
                        <div style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>{dl.id}</div>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span className="px-2 py-0.5 rounded font-bold text-xs" style={{ background:`${color}15`, color, ...MONO }}>{dl.format}</span>
                      </td>
                      <td style={{ padding:"12px 16px", color:"#5A6A88", fontSize:12 }}>{dl.generatedAt}</td>
                      <td style={{ padding:"12px 16px", color:"#5A6A88", fontSize:12 }}>{dl.generatedBy}</td>
                      <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:12, ...MONO }}>{dl.size}</td>
                      <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:12, ...MONO }}>{dl.rows}</td>
                      <td style={{ padding:"12px 16px" }}>
                        {dl.status === "ready" ? (
                          <button onClick={() => toast.success(`Downloading ${dl.reportName}.${dl.format.toLowerCase()}…`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                            style={{ background:"rgba(32,64,192,0.06)", color:"#2040C0" }}>
                            <Download size={11}/> Download
                          </button>
                        ) : dl.status === "generating" ? (
                          <span className="flex items-center gap-1 text-xs" style={{ color:"#F6AD55" }}>
                            <RefreshCw size={11} className="animate-spin"/> Generating…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs" style={{ color:"#FC8181" }}>
                            <AlertTriangle size={11}/> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.1)" }}>
            <Shield size={14} color="#2040C0" style={{ marginTop:1, flexShrink:0 }}/>
            <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.6 }}>
              All reports are generated in real time from the live database. Files are retained for 30 days. Reports containing PII are access-logged per your admin audit policy. GDPR data requests are archived separately for 7 years per compliance requirements.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
