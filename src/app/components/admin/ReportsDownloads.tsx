import React, { useState } from "react";
import {
  Download, BarChart3, Users, DollarSign, HardDrive,
  TrendingUp, Star, Shield, AlertTriangle, Globe, Key, UserCheck, ChevronDown, X, Send, Ban
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAuth } from "../../context/AuthContext";

const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", borderRadius:10, padding:"8px 12px", fontSize:16, color:"#FFFFFF", outline:"none" };

type Row = Record<string, unknown>;
type Format = "CSV" | "JSON";
type Range = "last_7" | "last_30" | "last_90" | "ytd" | "all_time";

/* ── Data sources ────────────────────────────────────────────────────
   Every report either pulls real rows from an existing admin endpoint, or
   has `source: null` plus a reason saying what is missing. Nothing is
   estimated or simulated — row counts and file sizes are the real ones. */

async function fetchAllPages(path: string, key: string, pageSize: number): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 1; page <= 500; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await adminApi.get<Record<string, unknown>>(`${path}${sep}page=${page}&pageSize=${pageSize}`);
    const rows = (res[key] as Row[] | undefined) ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

const listOf = (path: string, key: string) => async () =>
  ((await adminApi.get<Record<string, unknown>>(path))[key] as Row[] | undefined) ?? [];

const users = async () => (await fetchAllPages("/users", "users", 100)).map((u): Row => ({
  ...u, used_gb: Math.round((Number(u.used_bytes ?? 0) / 1024 ** 3) * 100) / 100,
}));

/* ── Report catalog ──────────────────────────────────────────────── */
interface ReportDef {
  id: string;
  name: string;
  description: string;
  category: "financial" | "users" | "storage" | "operations" | "compliance" | "marketing";
  icon: React.ReactNode;
  color: string;
  source: (() => Promise<Row[]>) | null;
  /** Column used for the date-range filter; omit when rows carry no date. */
  dateField?: string;
  /** Why a report with no source can't be generated. */
  unavailable?: string;
}

const REPORTS: ReportDef[] = [
  // Financial
  { id:"revenue_trend", name:"Revenue Trend (6 months)", category:"financial", icon:<DollarSign size={16}/>, color:"#D99A6B",
    description:"Monthly subscription revenue, overage revenue and affiliate payouts from succeeded payments and paid payouts.",
    source: listOf("/analytics/revenue-trend", "trend") },
  { id:"payout_history", name:"Payout History", category:"financial", icon:<TrendingUp size={16}/>, color:"#D99A6B",
    description:"All affiliate and partner commission payouts, with recipient, method, status and period.",
    source: listOf("/payouts", "payouts"), dateField:"created_at" },
  { id:"continuation_fees", name:"$199 Continuation Fee Log", category:"financial", icon:<Key size={16}/>, color:"#D99A6B",
    description:"Legacy Continuation Fee records: account, amount, status, activation and expiry.",
    source: listOf("/subscriptions", "fees"), dateField:"created_at" },
  { id:"overage_billing", name:"Overage Billing Report", category:"financial", icon:<HardDrive size={16}/>, color:"#D99A6B",
    description:"Storage overage charges by user.", source:null,
    unavailable:"Nothing writes rows to storage_usage yet, so there are no overage charges to report." },
  { id:"white_glove_billing", name:"White Glove Billing Report", category:"financial", icon:<Star size={16}/>, color:"#D99A6B",
    description:"Setup fees and session charges per White Glove client.", source:null,
    unavailable:"White Glove billing isn't stored in the database yet." },

  // Users
  { id:"user_roster", name:"Full User Roster", category:"users", icon:<Users size={16}/>, color:"#6FAE8B",
    description:"Every account with plan, plan status, contact count, storage used and join date.",
    source: users, dateField:"created_at" },
  { id:"new_signups", name:"New Signup Report", category:"users", icon:<Users size={16}/>, color:"#6FAE8B",
    description:"Accounts created within the selected date range.",
    source: async () => (await users()).map(({ id, email, full_name, plan, plan_status, created_at }) => ({ id, email, full_name, plan, plan_status, created_at })),
    dateField:"created_at" },
  { id:"churn_report", name:"Churn & Cancellation Report", category:"users", icon:<Users size={16}/>, color:"#6FAE8B",
    description:"Cancelled accounts with reason and lifetime value.", source:null,
    unavailable:"plan_status keeps no history and no cancellation reason is captured." },
  { id:"manually_onboarded", name:"Manually Onboarded Accounts", category:"users", icon:<Users size={16}/>, color:"#6FAE8B",
    description:"Accounts created by an admin.", source:null,
    unavailable:"The users table has no \"onboarded by admin\" flag to filter on." },

  // Storage
  { id:"storage_usage", name:"Storage Usage by User", category:"storage", icon:<HardDrive size={16}/>, color:"#6FAE8B",
    description:"Latest recorded storage use per account.",
    source: async () => (await users()).map(({ id, email, full_name, plan, used_gb }) => ({ id, email, full_name, plan, used_gb })) },
  { id:"storage_alerts", name:"Storage Alert History", category:"storage", icon:<AlertTriangle size={16}/>, color:"#6FAE8B",
    description:"80% / 90% / 95% storage alerts sent.", source:null,
    unavailable:"Sent alerts aren't recorded anywhere." },

  // Operations
  { id:"id_verification", name:"ID Verification Report", category:"operations", icon:<UserCheck size={16}/>, color:"#ED8936",
    description:"All ID submissions (pending, approved, rejected) with contact and account owner.",
    source: listOf("/verification?status=all", "verifications"), dateField:"submitted_at" },
  { id:"affiliate_performance", name:"Affiliate Performance Report", category:"operations", icon:<TrendingUp size={16}/>, color:"#ED8936",
    description:"Affiliates with tier, referral totals, earnings and status.",
    source: listOf("/affiliates", "affiliates"), dateField:"created_at" },
  { id:"partner_activity", name:"Partner Activity", category:"operations", icon:<Globe size={16}/>, color:"#ED8936",
    description:"Partners with organization, tier, accounts, monthly recurring and total earned.",
    source: listOf("/partnerships", "partners"), dateField:"joined_at" },
  { id:"wg_client_status", name:"White Glove Client Status", category:"operations", icon:<Star size={16}/>, color:"#ED8936",
    description:"White Glove clients with specialist and progress.", source:null,
    unavailable:"White Glove clients aren't stored in the database yet." },

  // Compliance
  { id:"audit_log_export", name:"Audit Log Export", category:"compliance", icon:<Shield size={16}/>, color:"#FC8181",
    description:"Admin action audit trail: actor, action, target, severity and timestamp.",
    source: () => fetchAllPages("/audit", "logs", 200), dateField:"created_at" },
  { id:"gdpr_export", name:"GDPR / Data Request Export", category:"compliance", icon:<Shield size={16}/>, color:"#FC8181",
    description:"Full data export for one user account.", source:null,
    unavailable:"Needs a per-user export endpoint that gathers every table — not built yet." },

  // Marketing
  { id:"push_notification_stats", name:"Push Notification Performance", category:"marketing", icon:<BarChart3 size={16}/>, color:"#6E90C9",
    description:"Delivered, opened and open rate per notification.", source:null,
    unavailable:"No push provider is integrated and sent notifications aren't recorded." },
  { id:"email_delivery", name:"Transactional Email Report", category:"marketing", icon:<Send size={16}/>, color:"#6E90C9",
    description:"Delivery, open and bounce rates per email template.", source:null,
    unavailable:"No email provider is integrated, so there are no delivery events." },
];

const CATEGORY_META: Record<ReportDef["category"], { label: string; color: string; icon: React.ReactNode }> = {
  financial:   { label:"Financial",   color:"#D99A6B", icon:<DollarSign size={13}/> },
  users:       { label:"Users",       color:"#6FAE8B", icon:<Users size={13}/> },
  storage:     { label:"Storage",     color:"#6FAE8B", icon:<HardDrive size={13}/> },
  operations:  { label:"Operations",  color:"#ED8936", icon:<Star size={13}/> },
  compliance:  { label:"Compliance",  color:"#FC8181", icon:<Shield size={13}/> },
  marketing:   { label:"Marketing",   color:"#6E90C9", icon:<BarChart3 size={13}/> },
};

/* ── File building ───────────────────────────────────────────────── */
function flatten(row: Row, prefix = "", out: Row = {}): Row {
  for (const [k, v] of Object.entries(row)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v as Row, key, out);
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

function toCSV(rows: Row[]): string {
  const flat = rows.map(r => flatten(r));
  const headers = [...new Set(flat.flatMap(r => Object.keys(r)))];
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...flat.map(r => headers.map(h => cell(r[h])).join(","))].join("\r\n");
}

function inRange(value: unknown, range: Range): boolean {
  if (range === "all_time") return true;
  const t = typeof value === "string" ? Date.parse(value) : NaN;
  if (Number.isNaN(t)) return false;
  const now = new Date();
  const start = range === "ytd"
    ? new Date(now.getFullYear(), 0, 1).getTime()
    : now.getTime() - { last_7:7, last_30:30, last_90:90 }[range] * 86_400_000;
  return t >= start;
}

function saveFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatBytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
}

/* ── Session export history ──────────────────────────────────────── */
interface GeneratedExport {
  id: string; reportName: string; format: Format; generatedAt: string;
  generatedBy: string; size: string; rows: number;
  fileName: string; content: string; mime: string;
}

/* ── Report card ─────────────────────────────────────────────────── */
function ReportCard({ report, busy, onGenerate }: {
  report: ReportDef; busy: boolean; onGenerate: (r: ReportDef, fmt: Format, range: Range) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fmt, setFmt] = useState<Format>("CSV");
  const [range, setRange] = useState<Range>("all_time");
  const cat = CATEGORY_META[report.category];
  const available = report.source !== null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ ...CARD, opacity: available ? 1 : 0.75 }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width:40, height:40, background:`${report.color}15`, color:report.color }}>
              {report.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>{report.name}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                  style={{ background:`${cat.color}12`, color:cat.color, ...MONO }}>
                  {cat.icon}{cat.label}
                </span>
                {!available && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{ background:"rgba(138,154,184,0.12)", color:"#8A9AB8", ...MONO }}>
                    <Ban size={11}/> NO DATA SOURCE
                  </span>
                )}
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.5 }}>{report.description}</div>
              {!available && (
                <div style={{ color:"#F6AD55", fontSize:14, marginTop:4 }}>{report.unavailable}</div>
              )}
            </div>
          </div>
          {available && (
            <button onClick={() => setExpanded(!expanded)} style={{ color:"#8A9AB8", flexShrink:0 }}>
              <ChevronDown size={15} style={{ transform: expanded ? "rotate(180deg)" : undefined }}/>
            </button>
          )}
        </div>

        {available && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className="flex gap-1">
              {(["CSV","JSON"] as const).map(f => (
                <button key={f} onClick={() => setFmt(f)}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all"
                  style={{ background:fmt===f?`${report.color}18`:"rgba(91,110,225,0.04)", color:fmt===f?report.color:"#8A9AB8", border:`1px solid ${fmt===f?report.color+"30":"rgba(91,110,225,0.1)"}` }}>
                  {f}
                </button>
              ))}
            </div>
            {report.dateField && (
              <select value={range} onChange={e => setRange(e.target.value as Range)}
                style={{ ...INPUT, padding:"5px 10px", fontSize:14, width:"auto" }}>
                <option value="last_7">Last 7 days</option>
                <option value="last_30">Last 30 days</option>
                <option value="last_90">Last 90 days</option>
                <option value="ytd">Year to date</option>
                <option value="all_time">All time</option>
              </select>
            )}
            <button onClick={() => onGenerate(report, fmt, report.dateField ? range : "all_time")} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold ml-auto"
              style={{ background:`linear-gradient(135deg,${report.color},${report.color}CC)`, color:"#fff", boxShadow:`0 2px 10px ${report.color}30`, opacity: busy ? 0.6 : 1 }}>
              <Download size={12}/> {busy ? "Generating…" : "Generate & Download"}
            </button>
          </div>
        )}
      </div>

      {expanded && available && (
        <div className="px-5 pb-5 border-t pt-4" style={{ borderColor:"rgba(91,110,225,0.08)", color:"#8A9AB8", fontSize:14 }}>
          Columns are exactly what the database returns for this report{report.dateField ? `, filtered on ${report.dateField}` : ""}. Nested fields are flattened (for example <span style={MONO}>users.email</span>).
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function ReportsDownloads() {
  const { authUser } = useAuth();
  const [exports, setExports] = useState<GeneratedExport[]>([]);
  const [activeCategory, setActiveCategory] = useState<ReportDef["category"] | "all">("all");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "history">("reports");

  async function generateReport(report: ReportDef, fmt: Format, range: Range) {
    if (generating || !report.source) return;
    setGenerating(report.id);
    toast.loading(`Generating ${report.name}…`, { id:"gen" });
    try {
      const all = await report.source();
      const rows = report.dateField ? all.filter(r => inRange(r[report.dateField!], range)) : all;
      const content = fmt === "CSV" ? toCSV(rows) : JSON.stringify(rows, null, 2);
      const mime = fmt === "CSV" ? "text/csv;charset=utf-8" : "application/json";
      const stamp = new Date().toISOString().slice(0, 10);
      const fileName = `${report.id}_${stamp}.${fmt.toLowerCase()}`;
      saveFile(fileName, content, mime);

      const now = new Date();
      setExports(prev => [{
        id: `${report.id}-${now.getTime()}`,
        reportName: report.name, format: fmt,
        generatedAt: `${now.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · ${now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}`,
        generatedBy: authUser?.email ?? "—",
        size: formatBytes(new Blob([content]).size),
        rows: rows.length, fileName, content, mime,
      }, ...prev]);
      toast.success(rows.length === 0 ? `${report.name}: no matching rows — downloaded an empty file` : `${fileName} downloaded (${rows.length} rows)`, { id:"gen" });
    } catch (err) {
      toast.error(`Couldn't generate ${report.name}: ${err instanceof Error ? err.message : "request failed"}`, { id:"gen" });
    } finally {
      setGenerating(null);
    }
  }

  const filtered = REPORTS.filter(r =>
    (activeCategory === "all" || r.category === activeCategory) &&
    (search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label:"Reports With Live Data", value:REPORTS.filter(r => r.source).length, color:"#6E90C9" },
    { label:"No Data Source Yet",     value:REPORTS.filter(r => !r.source).length, color:"#8A9AB8" },
    { label:"Exported This Session",  value:exports.length, color:"#D99A6B" },
    { label:"Export Formats",         value:2, color:"#ED8936" },
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Download size={15} color="#FFFFFF"/>
          <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>COMMAND CENTER · REPORTS & DOWNLOADS</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Reports & Downloads</h1>
        <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
          Export live platform data as CSV or JSON. Every file is built from the database at the moment you click.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-2xl text-center" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:35.5, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.1)" }}>
        {([["reports","📋 Report Catalog"],["history","📥 This Session's Exports"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background:activeTab===id?"#5B6EE1":"transparent", color:activeTab===id?"#fff":"#8A9AB8" }}>
            {label}
          </button>
        ))}
      </div>

      {/* REPORT CATALOG */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          <div className="flex gap-3 flex-wrap items-center">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…" style={{ ...INPUT, width:220, maxWidth:"100%", padding:"8px 12px" }}/>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setActiveCategory("all")}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background:activeCategory==="all"?"#5B6EE1":"rgba(91,110,225,0.04)", color:activeCategory==="all"?"#fff":"#8A9AB8", border:"1px solid rgba(91,110,225,0.1)" }}>
                All
              </button>
              {(Object.entries(CATEGORY_META) as [ReportDef["category"], typeof CATEGORY_META[ReportDef["category"]]][]).map(([key, meta]) => (
                <button key={key} onClick={() => setActiveCategory(key)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:activeCategory===key?`${meta.color}18`:"rgba(91,110,225,0.04)", color:activeCategory===key?meta.color:"#8A9AB8", border:`1px solid ${activeCategory===key?meta.color+"30":"rgba(91,110,225,0.1)"}` }}>
                  {meta.icon} {meta.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color:"#8A9AB8" }}>No reports match your search.</div>
          )}
          <div className="space-y-3">
            {filtered.map(r => (
              <ReportCard key={r.id} report={r} busy={generating === r.id} onGenerate={generateReport}/>
            ))}
          </div>
        </div>
      )}

      {/* EXPORT HISTORY (this session only) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div style={{ color:"#8A9AB8", fontSize:16 }}>{exports.length} export{exports.length === 1 ? "" : "s"} this session</div>
            {exports.length > 0 && (
              <button onClick={() => setExports([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs"
                style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
                <X size={11}/> Clear
              </button>
            )}
          </div>

          {exports.length === 0 ? (
            <div className="p-8 rounded-2xl text-center" style={{ ...CARD, color:"#8A9AB8", fontSize:15 }}>
              No exports yet. Generate a report from the catalog and it will be listed here.
            </div>
          ) : (
            <div className="rounded-2xl overflow-x-auto" style={CARD}>
              <table className="w-full text-sm" style={{ borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"rgba(91,110,225,0.04)", borderBottom:"1px solid rgba(91,110,225,0.08)" }}>
                    {["Report","Format","Generated","By","Size","Rows","Action"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#8A9AB8", fontSize:12.5, ...MONO, fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exports.map((dl, i) => {
                    const color = dl.format === "CSV" ? "#48BB78" : "#F6AD55";
                    return (
                      <tr key={dl.id} style={{ borderBottom: i < exports.length-1 ? "1px solid rgba(91,110,225,0.06)" : "none" }}>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ color:"#E8EDF5", fontWeight:500, fontSize:16 }}>{dl.reportName}</div>
                          <div style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>{dl.fileName}</div>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span className="px-2 py-0.5 rounded font-bold text-xs" style={{ background:`${color}15`, color, ...MONO }}>{dl.format}</span>
                        </td>
                        <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:15 }}>{dl.generatedAt}</td>
                        <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:15 }}>{dl.generatedBy}</td>
                        <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:15, ...MONO }}>{dl.size}</td>
                        <td style={{ padding:"12px 16px", color:"#8A9AB8", fontSize:15, ...MONO }}>{dl.rows.toLocaleString()}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <button onClick={() => saveFile(dl.fileName, dl.content, dl.mime)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
                            style={{ background:"rgba(91,110,225,0.06)", color:"#6E90C9" }}>
                            <Download size={11}/> Download again
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
            <Shield size={14} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
            <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>
              Exports are built in your browser from live data and are not stored on the server. This list is cleared when you refresh the page.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
