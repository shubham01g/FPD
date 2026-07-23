import React, { useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, CheckCircle, XCircle, Clock, Server,
  Database, Shield, Globe, HardDrive, Mail, CreditCard, Zap,
  Bell, BellOff, Plus, X, Send, Wrench, Eye, RefreshCw,
  ChevronDown, ChevronUp, Wifi, Lock, Radio, BarChart3,
  TrendingUp, TrendingDown, Users, Cpu, ToggleLeft, ToggleRight,
  AlertCircle, Info
} from "lucide-react";
import { toast } from "sonner";

/* ── Design tokens ─────────────────────────────────────────────── */
const T = {
  bg:       "#F0F4FA",
  card:     "#FFFFFF",
  card2:    "#F8FAFF",
  card3:    "#EAF0FC",
  primary:  "#3A5BD9",
  primBg:   "rgba(58,91,217,0.08)",
  primBd:   "rgba(58,91,217,0.2)",
  text:     "#0D1428",
  sub:      "#5A6A88",
  muted:    "#8A9AB8",
  border:   "rgba(58,91,217,0.1)",
  green:    "#48BB78",
  greenBg:  "rgba(72,187,120,0.1)",
  greenBd:  "rgba(72,187,120,0.3)",
  red:      "#FC8181",
  redBg:    "rgba(252,129,129,0.1)",
  redBd:    "rgba(252,129,129,0.25)",
  amber:    "#F6AD55",
  amberBg:  "rgba(246,173,85,0.1)",
  amberBd:  "rgba(246,173,85,0.3)",
  purple:   "#6E8BFF",
  purpleBg: "rgba(110,139,255,0.1)",
};
const MONO:    React.CSSProperties = { fontFamily:"var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily:"var(--font-display)" };
const CARD:    React.CSSProperties = {
  background: T.card, border:`1px solid ${T.border}`,
  boxShadow:"0 2px 12px rgba(58,91,217,0.06)", borderRadius:16, padding:22,
};
const INPUT:   React.CSSProperties = {
  background:"rgba(58,91,217,0.04)", border:`1px solid rgba(58,91,217,0.18)`,
  color:T.text, outline:"none", borderRadius:10, padding:"9px 13px", width:"100%", fontSize:13,
};

/* ── Types ─────────────────────────────────────────────────────── */
type SvcStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  id: string; name: string; icon: React.ReactNode; category: string;
  status: SvcStatus; uptime: number; latencyMs: number; latencyTrend: number[];
  description: string;
}

type IncidentSeverity = "critical" | "major" | "minor" | "info";
type IncidentStatus   = "investigating" | "identified" | "monitoring" | "resolved";

interface Incident {
  id: string; title: string; severity: IncidentSeverity; status: IncidentStatus;
  affectedServices: string[]; description: string; updates: IncidentUpdate[];
  createdAt: string; resolvedAt?: string; reportedBy: string;
}

interface IncidentUpdate {
  time: string; message: string; status: IncidentStatus; author: string;
}

interface AlertRecipient {
  id: string; name: string; email: string; role: string;
  notifyOn: ("critical" | "major" | "minor")[]; active: boolean;
}

interface MaintenanceTeamMember {
  id: string; name: string; email: string; specialty: string; phone: string; available: boolean;
}

type HealthTab = "status" | "incidents" | "performance" | "api_monitor" | "api" | "maintenance" | "alerts";

/* ── API Monitor types ──────────────────────────────────────────── */
type CheckStatus = "up" | "slow" | "degraded" | "down" | "checking";

interface CheckResult {
  ts: string;          // "12:34:05"
  latencyMs: number;
  httpStatus: number;
  status: CheckStatus;
}

interface MonitoredEndpoint {
  id: string;
  method: string;
  path: string;
  baseUrl: string;
  description: string;
  thresholdWarnMs: number;  // warn when latency > this
  thresholdDownMs: number;  // treat as down if latency > this
  checkIntervalSec: number;
  enabled: boolean;
  status: CheckStatus;
  latencyMs: number;
  httpStatus: number;
  lastChecked: string;
  uptime24h: number;        // percentage
  consecutiveFails: number;
  history: CheckResult[];   // last 20 checks
}

/* ── Seed Data ──────────────────────────────────────────────────── */
const INITIAL_SERVICES: Service[] = [
  { id:"api_core",    name:"Core API",          icon:<Server size={16}/>,    category:"API",         status:"operational", uptime:99.97, latencyMs:84,  latencyTrend:[80,82,78,85,84,83,84],   description:"Primary REST API — all user and vault operations" },
  { id:"api_auth",    name:"Authentication",     icon:<Lock size={16}/>,      category:"API",         status:"operational", uptime:99.99, latencyMs:48,  latencyTrend:[44,47,45,49,48,50,48],   description:"JWT/session auth, OAuth2 provider, 2FA validation" },
  { id:"db_primary",  name:"Primary Database",   icon:<Database size={16}/>,  category:"Database",    status:"operational", uptime:99.95, latencyMs:12,  latencyTrend:[11,12,13,11,12,14,12],   description:"PostgreSQL primary — user data, vaults, plans" },
  { id:"db_replica",  name:"DB Read Replica",    icon:<Database size={16}/>,  category:"Database",    status:"operational", uptime:99.91, latencyMs:18,  latencyTrend:[17,18,19,18,17,18,18],   description:"Read replica for analytics and reporting queries" },
  { id:"storage",     name:"File Storage",       icon:<HardDrive size={16}/>, category:"Storage",     status:"operational", uptime:99.88, latencyMs:145, latencyTrend:[140,148,145,142,145,150,145], description:"S3-compatible object storage for vault documents/media" },
  { id:"cdn",         name:"CDN",                icon:<Globe size={16}/>,     category:"Network",     status:"operational", uptime:99.99, latencyMs:22,  latencyTrend:[20,21,22,23,22,21,22],   description:"Cloudflare CDN — static assets, media delivery" },
  { id:"email",       name:"Email Service",      icon:<Mail size={16}/>,      category:"Messaging",   status:"degraded",    uptime:98.41, latencyMs:320, latencyTrend:[180,200,250,310,320,315,320], description:"Transactional email (welcome, alerts, digest)" },
  { id:"stripe",      name:"Stripe Payments",    icon:<CreditCard size={16}/>,category:"Payments",    status:"operational", uptime:99.99, latencyMs:210, latencyTrend:[200,205,210,208,210,212,210], description:"Stripe billing, webhook processing, payout routing" },
  { id:"push_notif",  name:"Push Notifications", icon:<Radio size={16}/>,     category:"Messaging",   status:"operational", uptime:99.82, latencyMs:65,  latencyTrend:[60,62,65,64,63,65,65],   description:"FCM/APNs push delivery for mobile and web" },
  { id:"search",      name:"Search Index",       icon:<Zap size={16}/>,       category:"Services",    status:"operational", uptime:99.70, latencyMs:38,  latencyTrend:[35,37,38,36,38,40,38],   description:"Elasticsearch — vault document and contact search" },
  { id:"scheduler",   name:"Job Scheduler",      icon:<Clock size={16}/>,     category:"Services",    status:"operational", uptime:99.60, latencyMs:5,   latencyTrend:[4,5,5,6,5,4,5],         description:"Cron jobs: billing cycles, storage alerts, digests" },
  { id:"ai_service",  name:"AI / Claude API",    icon:<Cpu size={16}/>,       category:"AI",          status:"operational", uptime:99.80, latencyMs:1840,latencyTrend:[1700,1800,1840,1820,1840,1850,1840], description:"Admin AI assistant — Claude Sonnet 4.6 integration" },
];

const INITIAL_INCIDENTS: Incident[] = [
  {
    id:"INC-0024", title:"Email delivery latency — transactional emails delayed 3–8 min",
    severity:"major", status:"monitoring",
    affectedServices:["email"],
    description:"Our email service provider (Postmark) is reporting elevated processing times affecting transactional emails including account welcome emails and password resets. Users are receiving emails but with a delay of 3–8 minutes. Stripe receipts unaffected (separate provider).",
    reportedBy:"System Monitor", createdAt:"Jul 21, 2026 · 11:42 AM",
    updates:[
      { time:"11:42 AM", message:"Alert triggered — email delivery latency exceeded 5-minute SLA threshold.", status:"investigating", author:"System Monitor" },
      { time:"12:05 PM", message:"Confirmed Postmark status page shows elevated processing. Escalated to Postmark support.", status:"identified", author:"admin@finalpassdown.com" },
      { time:"12:31 PM", message:"Postmark reports root cause identified — database migration on their end. Fix ETA: 30 min.", status:"monitoring", author:"admin@finalpassdown.com" },
    ],
  },
  {
    id:"INC-0023", title:"Storage upload timeouts for files > 100MB",
    severity:"minor", status:"resolved",
    affectedServices:["storage"],
    description:"Upload timeout for files exceeding 100MB was incorrectly set to 30s. Affected approximately 84 users who received error messages on large video uploads. Files were not lost; re-upload succeeded.",
    reportedBy:"Sarah Chen (USR-8812)", createdAt:"Jul 19, 2026 · 4:12 PM",
    resolvedAt:"Jul 19, 2026 · 6:48 PM",
    updates:[
      { time:"4:12 PM",  message:"User report received — large file upload timing out.", status:"investigating", author:"admin@finalpassdown.com" },
      { time:"4:55 PM",  message:"Identified: upload timeout set to 30s. Correct value is 300s.", status:"identified", author:"admin@finalpassdown.com" },
      { time:"6:48 PM",  message:"Config updated and deployed. Upload timeouts resolved. Users notified by email.", status:"resolved", author:"admin@finalpassdown.com" },
    ],
  },
  {
    id:"INC-0022", title:"Stripe webhook processing delay — 18-minute window",
    severity:"critical", status:"resolved",
    affectedServices:["stripe","api_core"],
    description:"Stripe webhook events (subscription renewals, payment failures) were delayed by ~18 minutes due to a misconfigured queue depth limit. No payments were lost; all events processed after the delay.",
    reportedBy:"System Monitor", createdAt:"Jul 15, 2026 · 2:02 AM",
    resolvedAt:"Jul 15, 2026 · 2:20 AM",
    updates:[
      { time:"2:02 AM", message:"Webhook queue depth alarm triggered — processing falling behind.", status:"investigating", author:"System Monitor" },
      { time:"2:08 AM", message:"Root cause: queue worker count insufficient during billing cycle peak.", status:"identified", author:"admin@finalpassdown.com" },
      { time:"2:20 AM", message:"Worker count scaled up. Queue drained. All events processed. No billing impact.", status:"resolved", author:"admin@finalpassdown.com" },
    ],
  },
];

const MAINTENANCE_TEAM: MaintenanceTeamMember[] = [
  { id:"MT-001", name:"Alex Rivera",    email:"a.rivera@finalpassdown.com",  specialty:"Backend / Database",    phone:"(404) 555-0182", available:true },
  { id:"MT-002", name:"Jordan Lee",     email:"j.lee@finalpassdown.com",     specialty:"DevOps / Infrastructure",phone:"(212) 555-0294", available:true },
  { id:"MT-003", name:"Priya Sharma",   email:"p.sharma@finalpassdown.com",  specialty:"API / Integrations",    phone:"(310) 555-0841", available:false },
  { id:"MT-004", name:"Marcus Cole",    email:"m.cole@finalpassdown.com",    specialty:"Frontend / CDN",        phone:"(312) 555-0192", available:true },
  { id:"MT-005", name:"Danielle Park",  email:"d.park@finalpassdown.com",    specialty:"Security / Auth",       phone:"(512) 555-0028", available:true },
];

const INITIAL_ALERT_RECIPIENTS: AlertRecipient[] = [
  { id:"ALR-001", name:"Admin",          email:"admin@finalpassdown.com",    role:"Master Admin",       notifyOn:["critical","major","minor"], active:true },
  { id:"ALR-002", name:"Alex Rivera",    email:"a.rivera@finalpassdown.com", role:"Backend Engineer",   notifyOn:["critical","major"],         active:true },
  { id:"ALR-003", name:"Jordan Lee",     email:"j.lee@finalpassdown.com",    role:"DevOps",             notifyOn:["critical","major"],         active:true },
  { id:"ALR-004", name:"Danielle Park",  email:"d.park@finalpassdown.com",   role:"Security",           notifyOn:["critical"],                 active:true },
];


/* ── API Monitor seed ───────────────────────────────────────────── */
function makeHistory(base: number, httpCode: number, statusFn: (ms:number)=>CheckStatus): CheckResult[] {
  return Array.from({ length:20 }, (_, i) => {
    const jitter = base + Math.round((Math.random()-0.5)*base*0.25);
    return {
      ts: `12:${String(Math.max(0,(20-i)*3)).padStart(2,"0")}`,
      latencyMs: jitter, httpStatus: httpCode, status: statusFn(jitter),
    };
  }).reverse();
}

const INITIAL_MONITORED: MonitoredEndpoint[] = [
  {
    id:"ep_users_list",    method:"GET",    path:"/api/v1/users",
    baseUrl:"https://api.finalpassdown.com", description:"List all users — paginated",
    thresholdWarnMs:200, thresholdDownMs:1000, checkIntervalSec:30, enabled:true,
    status:"up", latencyMs:84, httpStatus:200, lastChecked:"Just now", uptime24h:99.97,
    consecutiveFails:0,
    history: makeHistory(84, 200, ms => ms > 1000 ? "down" : ms > 200 ? "slow" : "up"),
  },
  {
    id:"ep_auth",          method:"POST",   path:"/api/v1/users/auth",
    baseUrl:"https://api.finalpassdown.com", description:"Login / JWT token generation",
    thresholdWarnMs:150, thresholdDownMs:800, checkIntervalSec:30, enabled:true,
    status:"up", latencyMs:48, httpStatus:200, lastChecked:"Just now", uptime24h:99.99,
    consecutiveFails:0,
    history: makeHistory(48, 200, ms => ms > 800 ? "down" : ms > 150 ? "slow" : "up"),
  },
  {
    id:"ep_vault_docs",    method:"GET",    path:"/api/v1/vault/:id/documents",
    baseUrl:"https://api.finalpassdown.com", description:"Fetch vault document list",
    thresholdWarnMs:300, thresholdDownMs:2000, checkIntervalSec:60, enabled:true,
    status:"up", latencyMs:112, httpStatus:200, lastChecked:"Just now", uptime24h:99.88,
    consecutiveFails:0,
    history: makeHistory(112, 200, ms => ms > 2000 ? "down" : ms > 300 ? "slow" : "up"),
  },
  {
    id:"ep_vault_upload",  method:"POST",   path:"/api/v1/vault/:id/upload",
    baseUrl:"https://api.finalpassdown.com", description:"Upload file to vault storage",
    thresholdWarnMs:500, thresholdDownMs:5000, checkIntervalSec:60, enabled:true,
    status:"slow", latencyMs:2840, httpStatus:200, lastChecked:"Just now", uptime24h:97.41,
    consecutiveFails:0,
    history: makeHistory(2840, 200, ms => ms > 5000 ? "down" : ms > 500 ? "slow" : "up"),
  },
  {
    id:"ep_billing",       method:"POST",   path:"/api/v1/billing/webhook",
    baseUrl:"https://api.finalpassdown.com", description:"Stripe webhook receiver",
    thresholdWarnMs:400, thresholdDownMs:2000, checkIntervalSec:30, enabled:true,
    status:"up", latencyMs:210, httpStatus:200, lastChecked:"Just now", uptime24h:99.99,
    consecutiveFails:0,
    history: makeHistory(210, 200, ms => ms > 2000 ? "down" : ms > 400 ? "slow" : "up"),
  },
  {
    id:"ep_plans",         method:"GET",    path:"/api/v1/plans",
    baseUrl:"https://api.finalpassdown.com", description:"Return all subscription plan configs",
    thresholdWarnMs:100, thresholdDownMs:500, checkIntervalSec:120, enabled:true,
    status:"up", latencyMs:24, httpStatus:200, lastChecked:"Just now", uptime24h:100,
    consecutiveFails:0,
    history: makeHistory(24, 200, ms => ms > 500 ? "down" : ms > 100 ? "slow" : "up"),
  },
  {
    id:"ep_contacts",      method:"GET",    path:"/api/v1/contacts/:id",
    baseUrl:"https://api.finalpassdown.com", description:"Fetch a single legacy contact record",
    thresholdWarnMs:200, thresholdDownMs:1000, checkIntervalSec:60, enabled:true,
    status:"up", latencyMs:68, httpStatus:200, lastChecked:"Just now", uptime24h:99.82,
    consecutiveFails:0,
    history: makeHistory(68, 200, ms => ms > 1000 ? "down" : ms > 200 ? "slow" : "up"),
  },
  {
    id:"ep_push",          method:"POST",   path:"/api/v1/notifications/send",
    baseUrl:"https://api.finalpassdown.com", description:"Send push notification to users",
    thresholdWarnMs:200, thresholdDownMs:1000, checkIntervalSec:60, enabled:true,
    status:"up", latencyMs:65, httpStatus:200, lastChecked:"Just now", uptime24h:99.70,
    consecutiveFails:0,
    history: makeHistory(65, 200, ms => ms > 1000 ? "down" : ms > 200 ? "slow" : "up"),
  },
  {
    id:"ep_email_send",    method:"POST",   path:"/api/v1/email/send",
    baseUrl:"https://api.finalpassdown.com", description:"Transactional email dispatch (Postmark)",
    thresholdWarnMs:300, thresholdDownMs:2000, checkIntervalSec:30, enabled:true,
    status:"degraded", latencyMs:320, httpStatus:200, lastChecked:"Just now", uptime24h:98.41,
    consecutiveFails:4,
    history: makeHistory(320, 200, ms => ms > 2000 ? "down" : ms > 300 ? "degraded" : "up"),
  },
  {
    id:"ep_search",        method:"GET",    path:"/api/v1/search",
    baseUrl:"https://api.finalpassdown.com", description:"Full-text vault document search",
    thresholdWarnMs:150, thresholdDownMs:800, checkIntervalSec:60, enabled:true,
    status:"up", latencyMs:38, httpStatus:200, lastChecked:"Just now", uptime24h:99.60,
    consecutiveFails:0,
    history: makeHistory(38, 200, ms => ms > 800 ? "down" : ms > 150 ? "slow" : "up"),
  },
  {
    id:"ep_health",        method:"GET",    path:"/api/v1/health",
    baseUrl:"https://api.finalpassdown.com", description:"System health check — liveness probe",
    thresholdWarnMs:50, thresholdDownMs:200, checkIntervalSec:15, enabled:true,
    status:"up", latencyMs:8, httpStatus:200, lastChecked:"Just now", uptime24h:100,
    consecutiveFails:0,
    history: makeHistory(8, 200, ms => ms > 200 ? "down" : ms > 50 ? "slow" : "up"),
  },
  {
    id:"ep_delete_user",   method:"DELETE", path:"/api/v1/users/:id",
    baseUrl:"https://api.finalpassdown.com", description:"Permanently delete user account",
    thresholdWarnMs:400, thresholdDownMs:2000, checkIntervalSec:120, enabled:true,
    status:"up", latencyMs:95, httpStatus:200, lastChecked:"Just now", uptime24h:99.90,
    consecutiveFails:0,
    history: makeHistory(95, 200, ms => ms > 2000 ? "down" : ms > 400 ? "slow" : "up"),
  },
];

const PERF_HISTORY = [
  { t:"11:00", p50:68,  p95:140, p99:280, errRate:0.04, rps:842 },
  { t:"11:10", p50:72,  p95:148, p99:310, errRate:0.05, rps:891 },
  { t:"11:20", p50:79,  p95:162, p99:341, errRate:0.06, rps:924 },
  { t:"11:30", p50:84,  p95:171, p99:362, errRate:0.08, rps:978 },
  { t:"11:40", p50:91,  p95:185, p99:394, errRate:0.12, rps:1022 },
  { t:"11:50", p50:88,  p95:178, p99:380, errRate:0.09, rps:1004 },
  { t:"12:00", p50:85,  p95:174, p99:371, errRate:0.07, rps:1018 },
  { t:"NOW",   p50:84,  p95:172, p99:368, errRate:0.07, rps:1024 },
];

/* ── Color helpers ──────────────────────────────────────────────── */
function svcColor(s: SvcStatus) {
  return { operational:T.green, degraded:T.amber, outage:T.red, maintenance:T.purple }[s];
}
function svcBg(s: SvcStatus) {
  return { operational:T.greenBg, degraded:T.amberBg, outage:T.redBg, maintenance:T.purpleBg }[s];
}
function svcBd(s: SvcStatus) {
  return { operational:T.greenBd, degraded:T.amberBd, outage:T.redBd, maintenance:"rgba(110,139,255,0.3)" }[s];
}
function incColor(s: IncidentSeverity) {
  return { critical:T.red, major:T.amber, minor:"#4A90D9", info:T.muted }[s];
}
function incBg(s: IncidentSeverity) {
  return { critical:T.redBg, major:T.amberBg, minor:"rgba(74,144,217,0.1)", info:"rgba(90,106,136,0.08)" }[s];
}
function stColor(s: IncidentStatus) {
  return { investigating:T.red, identified:T.amber, monitoring:"#4A90D9", resolved:T.green }[s];
}
/* ── Mini sparkline ─────────────────────────────────────────────── */
function Sparkline({ data, color, width=80, height=28 }: { data:number[]; color:string; width?:number; height?:number }) {
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Mini bar chart ─────────────────────────────────────────────── */
function MiniBar({ values, colors, height=48 }: { values:number[]; colors:string[]; height?:number }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {values.map((v,i) => (
        <div key={i} style={{ flex:1, height:`${(v/max)*100}%`, background:colors[i % colors.length],
          borderRadius:"3px 3px 0 0", opacity:i===values.length-1?1:0.6 }}/>
      ))}
    </div>
  );
}

/* ── Section label ──────────────────────────────────────────────── */
function SLabel({ children }: { children:React.ReactNode }) {
  return (
    <div style={{ color:T.muted, fontSize:10, ...MONO, letterSpacing:"0.1em",
      textTransform:"uppercase" as const, marginBottom:12 }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function SystemHealth() {
  const [activeTab, setActiveTab] = useState<HealthTab>("status");
  const [services, setServices]   = useState<Service[]>(INITIAL_SERVICES);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [recipients, setRecipients] = useState<AlertRecipient[]>(INITIAL_ALERT_RECIPIENTS);
  const [expandedInc, setExpandedInc] = useState<string | null>("INC-0024");
  const [tick, setTick] = useState(0);

  /* Simulate live metric jitter */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  /* Simulated live latency values */
  const liveLatency = (base: number) => base + Math.round((Math.random() - 0.5) * 8);

  const operationalCount = services.filter(s => s.status === "operational").length;
  const degradedCount    = services.filter(s => s.status === "degraded").length;
  const outageCount      = services.filter(s => s.status === "outage").length;
  const openIncidents    = incidents.filter(i => i.status !== "resolved");

  const TABS: { id:HealthTab; label:string; badge?:string }[] = [
    { id:"status",      label:"Infrastructure Status", badge: degradedCount+outageCount > 0 ? String(degradedCount+outageCount) : undefined },
    { id:"incidents",   label:"Incidents",              badge: openIncidents.length > 0 ? String(openIncidents.length) : undefined },
    { id:"performance", label:"Performance" },
    { id:"api_monitor", label:"API Monitor",            badge:"LIVE" },
    { id:"maintenance", label:"Maintenance Team" },
    { id:"alerts",      label:"Alert Recipients" },
  ];

  /* ── Overall status banner ────────────────────────────────────── */
  const overallOk = degradedCount === 0 && outageCount === 0;
  const bannerColor  = outageCount > 0 ? T.red : degradedCount > 0 ? T.amber : T.green;
  const bannerBg     = outageCount > 0 ? T.redBg : degradedCount > 0 ? T.amberBg : T.greenBg;
  const bannerBd     = outageCount > 0 ? T.redBd : degradedCount > 0 ? T.amberBd : T.greenBd;
  const bannerText   = outageCount > 0
    ? `${outageCount} service${outageCount>1?"s":""} experiencing outage`
    : degradedCount > 0
      ? `${degradedCount} service${degradedCount>1?"s":""} degraded — investigating`
      : `All ${operationalCount} services operational`;

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity size={15} color={T.primary}/>
          <span style={{ color:T.primary, fontSize:11, ...MONO, letterSpacing:"0.12em" }}>COMMAND CENTER · SYSTEM HEALTH</span>
        </div>
        <h2 style={{ ...DISPLAY, fontSize:22, color:T.text }}>System Health & Infrastructure</h2>
        <p style={{ color:T.sub, fontSize:13, marginTop:4 }}>
          Real-time service status, performance metrics, incident tracking, and maintenance coordination.
        </p>
      </div>

      {/* ── Overall status banner ───────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
        style={{ background:bannerBg, border:`1.5px solid ${bannerBd}` }}>
        <div className="flex items-center gap-3">
          <div style={{ width:10, height:10, borderRadius:"50%", background:bannerColor,
            boxShadow:`0 0 10px ${bannerColor}`, animation: overallOk ? "none" : "pulse 1.5s infinite" }}/>
          <span style={{ color:bannerColor, fontSize:14, fontWeight:700 }}>{bannerText}</span>
          {!overallOk && <span style={{ color:T.sub, fontSize:12 }}>· Jul 21, 2026 · 12:31 PM</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div style={{ width:8, height:8, borderRadius:"50%", background:T.green }}/>
            <span style={{ color:T.sub, fontSize:12 }}>{operationalCount} operational</span>
          </div>
          {degradedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.amber }}/>
              <span style={{ color:T.amber, fontSize:12, fontWeight:600 }}>{degradedCount} degraded</span>
            </div>
          )}
          {outageCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div style={{ width:8, height:8, borderRadius:"50%", background:T.red }}/>
              <span style={{ color:T.red, fontSize:12, fontWeight:600 }}>{outageCount} outage</span>
            </div>
          )}
          <button onClick={() => toast.success("Status refreshed")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background:T.primBg, color:T.primary, border:`1px solid ${T.primBd}` }}>
            <RefreshCw size={11}/> Refresh
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl" style={{ background:"rgba(255,255,255,0.95)", border:T.border, width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background:activeTab===t.id?"#3A5BD9":"transparent",
              color:activeTab===t.id?"#fff":T.sub, fontWeight:activeTab===t.id?700:400 }}>
            {t.label}
            {t.badge && (
              <span className="px-1.5 rounded-full text-xs font-bold"
                style={{ background:activeTab===t.id?"rgba(255,255,255,0.25)":"rgba(252,129,129,0.15)",
                  color:activeTab===t.id?"#fff":T.red, fontSize:9 }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          TAB: INFRASTRUCTURE STATUS
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "status" && (
        <div className="space-y-5">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label:"System Uptime",     value:"99.89%", sub:"30-day rolling avg",    color:T.green },
              { label:"Active Services",   value:`${operationalCount}/${services.length}`, sub:"All regions",   color:T.primary },
              { label:"Avg API Latency",   value:"84 ms",  sub:"p50 · last 60 min",     color:T.primary },
              { label:"Open Incidents",    value:openIncidents.length, sub:openIncidents.length>0?"Requires attention":"No active incidents", color:openIncidents.length>0?T.red:T.green },
            ].map(s => (
              <div key={s.label} style={CARD}>
                <div style={{ ...DISPLAY, fontSize:28, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ color:T.text, fontSize:13, fontWeight:500, marginTop:6 }}>{s.label}</div>
                <div style={{ color:T.muted, fontSize:11, marginTop:3 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Services grid by category */}
          {["API","Database","Storage","Network","Messaging","Payments","Services","AI"].map(cat => {
            const catSvcs = services.filter(s => s.category === cat);
            if (!catSvcs.length) return null;
            return (
              <div key={cat} style={CARD}>
                <SLabel>{cat} Services</SLabel>
                <div className="grid gap-3" style={{ gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))" }}>
                  {catSvcs.map(svc => {
                    const live = liveLatency(svc.latencyMs);
                    const sc = svcColor(svc.status);
                    return (
                      <div key={svc.id} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                        style={{ background:svcBg(svc.status), border:`1px solid ${svcBd(svc.status)}` }}>
                        {/* Icon */}
                        <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                          style={{ width:36, height:36, background:`${sc}18`, color:sc }}>
                          {svc.icon}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span style={{ color:T.text, fontSize:13, fontWeight:600 }}>{svc.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                              style={{ background:`${sc}18`, color:sc, fontSize:8, ...MONO }}>
                              {svc.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ color:T.sub, fontSize:11 }}>{svc.description}</div>
                          <div className="flex items-center gap-4 mt-1">
                            <span style={{ color:T.muted, fontSize:10, ...MONO }}>{svc.uptime}% uptime</span>
                            <span style={{ color:live > svc.latencyMs*1.2 ? T.amber : sc, fontSize:10, ...MONO }}>
                              {live} ms
                            </span>
                          </div>
                        </div>
                        {/* Sparkline */}
                        <div style={{ flexShrink:0 }}>
                          <Sparkline data={[...svc.latencyTrend, live]} color={sc} width={60} height={24}/>
                        </div>
                        {/* Status dot */}
                        <div style={{ width:8, height:8, borderRadius:"50%", background:sc,
                          boxShadow:`0 0 6px ${sc}`, flexShrink:0 }}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Admin action: manually trigger alert */}
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{ background:T.primBg, border:`1px solid ${T.primBd}` }}>
            <div>
              <div style={{ color:T.text, fontSize:14, fontWeight:600 }}>Mark Service as Under Maintenance</div>
              <div style={{ color:T.sub, fontSize:12, marginTop:2 }}>Temporarily set any service to "maintenance" mode and alert recipients</div>
            </div>
            <button onClick={() => {
              setServices(prev => prev.map(s => s.id === "email" ? { ...s, status:"maintenance" } : s));
              toast.success("Email service set to maintenance mode · Alert recipients notified");
            }} className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff",
                boxShadow:"0 4px 14px rgba(58,91,217,0.3)" }}>
              <Wrench size={13} style={{ display:"inline", marginRight:6 }}/>
              Set Maintenance Mode
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: INCIDENTS
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "incidents" && (
        <IncidentsPanel
          incidents={incidents}
          setIncidents={setIncidents}
          services={services}
          expandedInc={expandedInc}
          setExpandedInc={setExpandedInc}
          recipients={recipients}
        />
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: PERFORMANCE
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "performance" && (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label:"p50 Latency",   value:"84 ms",    color:T.green },
              { label:"p95 Latency",   value:"172 ms",   color:T.primary },
              { label:"p99 Latency",   value:"368 ms",   color:T.amber },
              { label:"Error Rate",    value:"0.07%",    color:T.green },
              { label:"Req / Second",  value:"1,024",    color:T.primary },
            ].map(s => (
              <div key={s.label} style={CARD}>
                <div style={{ ...DISPLAY, fontSize:26, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ color:T.sub, fontSize:12, marginTop:6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Latency chart */}
          <div style={CARD}>
            <div className="flex items-center justify-between mb-5">
              <SLabel>API Response Time — Last 80 Minutes</SLabel>
              <div className="flex items-center gap-4">
                {[{ color:T.primary, label:"p50" }, { color:T.amber, label:"p95" }, { color:T.red, label:"p99" }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div style={{ width:8, height:3, background:l.color, borderRadius:2 }}/>
                    <span style={{ color:T.sub, fontSize:11 }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height:160, position:"relative" }}>
              {/* Y axis labels */}
              {[400, 300, 200, 100, 0].map(v => (
                <div key={v} style={{ position:"absolute", left:0, top:`${((400-v)/400)*100}%`,
                  color:T.muted, fontSize:9, ...MONO, transform:"translateY(-50%)" }}>
                  {v}ms
                </div>
              ))}
              <div style={{ marginLeft:32, height:"100%", position:"relative" }}>
                {/* Grid lines */}
                {[0.25,0.5,0.75].map(frac => (
                  <div key={frac} style={{ position:"absolute", top:`${frac*100}%`, left:0, right:0,
                    borderTop:`1px dashed ${T.border}` }}/>
                ))}
                {/* Bars */}
                <div className="flex items-end gap-1" style={{ height:"100%" }}>
                  {PERF_HISTORY.map((d, i) => (
                    <div key={d.t} className="flex-1 flex flex-col items-center gap-0.5">
                      <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end",
                        height:140, gap:1 }}>
                        <div style={{ width:"100%", height:`${(d.p99/400)*140}px`, background:T.red, borderRadius:"3px 3px 0 0", opacity:0.3 }}/>
                        <div style={{ position:"relative", width:"100%", marginTop:-((d.p99/400)*140), height:`${(d.p95/400)*140}px`,
                          background:T.amber, opacity:0.5 }}/>
                        <div style={{ position:"relative", width:"100%", marginTop:-((d.p95/400)*140), height:`${(d.p50/400)*140}px`,
                          background:T.primary, opacity:0.85, borderRadius:"3px 3px 0 0" }}/>
                      </div>
                      <span style={{ color:T.muted, fontSize:8, ...MONO }}>{d.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Error rate + RPS side by side */}
          <div className="grid grid-cols-2 gap-5">
            <div style={CARD}>
              <SLabel>Error Rate (%) — Last 80 Min</SLabel>
              <div className="flex items-end gap-1.5 mt-2" style={{ height:80 }}>
                {PERF_HISTORY.map((d,i) => {
                  const h = Math.max((d.errRate/0.2)*80, 2);
                  const color = d.errRate > 0.1 ? T.red : d.errRate > 0.05 ? T.amber : T.green;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div style={{ width:"100%", height:80, display:"flex", alignItems:"flex-end" }}>
                        <div style={{ width:"100%", height:h, background:color, borderRadius:"3px 3px 0 0",
                          opacity:i===PERF_HISTORY.length-1?1:0.7 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span style={{ color:T.sub, fontSize:11 }}>Current</span>
                <span style={{ color:T.green, fontSize:14, fontWeight:700, ...MONO }}>0.07%</span>
              </div>
            </div>
            <div style={CARD}>
              <SLabel>Requests / Second — Last 80 Min</SLabel>
              <div className="flex items-end gap-1.5 mt-2" style={{ height:80 }}>
                {PERF_HISTORY.map((d,i) => {
                  const maxRps = Math.max(...PERF_HISTORY.map(x=>x.rps));
                  const h = (d.rps/maxRps)*80;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div style={{ width:"100%", height:80, display:"flex", alignItems:"flex-end" }}>
                        <div style={{ width:"100%", height:h, background:T.primary, borderRadius:"3px 3px 0 0",
                          opacity:i===PERF_HISTORY.length-1?1:0.6 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span style={{ color:T.sub, fontSize:11 }}>Current</span>
                <span style={{ color:T.primary, fontSize:14, fontWeight:700, ...MONO }}>1,024 rps</span>
              </div>
            </div>
          </div>

          {/* Uptime history */}
          <div style={CARD}>
            <SLabel>90-Day Uptime History — Per Service</SLabel>
            <div className="space-y-3">
              {services.slice(0, 8).map(svc => (
                <div key={svc.id} className="flex items-center gap-4">
                  <div style={{ color:T.sub, fontSize:12, width:160, flexShrink:0 }}>{svc.name}</div>
                  {/* Uptime blocks — 90 day simulation */}
                  <div className="flex gap-0.5 flex-1">
                    {Array.from({ length:90 }, (_, i) => {
                      const rand = Math.random();
                      const ok = rand > (svc.status === "degraded" ? 0.03 : 0.01);
                      return <div key={i} style={{ flex:1, height:16, borderRadius:2,
                        background: ok ? T.green : rand > 0.005 ? T.amber : T.red, opacity:ok?0.7:1 }}/>;
                    })}
                  </div>
                  <span style={{ color:svcColor(svc.status), fontSize:11, fontWeight:700, ...MONO, width:52, textAlign:"right" }}>
                    {svc.uptime}%
                  </span>
                </div>
              ))}
              <div style={{ color:T.muted, fontSize:11, marginTop:4 }}>
                <span style={{ background:T.greenBg, color:T.green, padding:"1px 6px", borderRadius:4, marginRight:8, fontSize:9 }}>■ Operational</span>
                <span style={{ background:T.amberBg, color:T.amber, padding:"1px 6px", borderRadius:4, marginRight:8, fontSize:9 }}>■ Degraded</span>
                <span style={{ background:T.redBg,   color:T.red,   padding:"1px 6px", borderRadius:4, fontSize:9 }}>■ Outage</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: API MONITOR
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "api_monitor" && <ApiMonitorPanel/>}

      {/* ════════════════════════════════════════════════════════════
          TAB: MAINTENANCE TEAM
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "maintenance" && (
        <MaintenancePanel services={services} incidents={incidents}/>
      )}

      {/* ════════════════════════════════════════════════════════════
          TAB: ALERT RECIPIENTS
          ════════════════════════════════════════════════════════════ */}
      {activeTab === "alerts" && (
        <AlertRecipientsPanel recipients={recipients} setRecipients={setRecipients}/>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   INCIDENTS PANEL
   ═══════════════════════════════════════════════════════════════════ */
function IncidentsPanel({
  incidents, setIncidents, services, expandedInc, setExpandedInc, recipients
}: {
  incidents: Incident[]; setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>;
  services: Service[]; expandedInc: string | null; setExpandedInc: (id: string | null) => void;
  recipients: AlertRecipient[];
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title:"", severity:"major" as IncidentSeverity, affectedServices:[] as string[], description:"",
  });
  const [updateText, setUpdateText] = useState<Record<string, string>>({});

  const open = incidents.filter(i => i.status !== "resolved");
  const resolved = incidents.filter(i => i.status === "resolved");

  function createIncident() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    const inc: Incident = {
      id: `INC-${String(Date.now()).slice(-4)}`,
      title: form.title, severity: form.severity,
      affectedServices: form.affectedServices,
      description: form.description,
      status: "investigating",
      reportedBy: "admin@finalpassdown.com",
      createdAt: new Date().toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric" }) +
        " · " + new Date().toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }),
      updates: [{ time:new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        message:"Incident created and team notified.", status:"investigating", author:"admin@finalpassdown.com" }],
    };
    setIncidents(prev => [inc, ...prev]);
    setCreating(false);
    setForm({ title:"", severity:"major", affectedServices:[], description:"" });
    setExpandedInc(inc.id);
    const notifyCount = recipients.filter(r => r.active && r.notifyOn.includes(form.severity)).length;
    toast.success(`🚨 Incident created — ${notifyCount} recipient${notifyCount!==1?"s":""} notified by email`);
  }

  function addUpdate(incId: string, newStatus: IncidentStatus) {
    const msg = updateText[incId];
    if (!msg?.trim()) { toast.error("Update message required"); return; }
    setIncidents(prev => prev.map(inc => {
      if (inc.id !== incId) return inc;
      const update: IncidentUpdate = {
        time: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        message: msg, status: newStatus, author:"admin@finalpassdown.com",
      };
      return { ...inc, status: newStatus,
        resolvedAt: newStatus === "resolved"
          ? new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})
          : inc.resolvedAt,
        updates: [...inc.updates, update],
      };
    }));
    setUpdateText(prev => ({ ...prev, [incId]:"" }));
    toast.success(`Incident updated → ${newStatus}`);
  }

  const UPDATE_STATUSES: { id:IncidentStatus; label:string }[] = [
    { id:"investigating", label:"Investigating" },
    { id:"identified",    label:"Identified" },
    { id:"monitoring",    label:"Monitoring" },
    { id:"resolved",      label:"Resolved ✓" },
  ];

  return (
    <div className="space-y-5">
      {/* Header + create btn */}
      <div className="flex items-center justify-between">
        <div>
          <div style={{ color:T.text, fontSize:16, fontWeight:700, ...DISPLAY }}>Incident Management</div>
          <div style={{ color:T.sub, fontSize:13, marginTop:2 }}>
            {open.length} open · {resolved.length} resolved
          </div>
        </div>
        <button onClick={() => setCreating(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: creating ? T.redBg : "linear-gradient(135deg,#3A5BD9,#5B7BF5)",
            color: creating ? T.red : "#fff",
            border: creating ? `1px solid ${T.redBd}` : "none",
            boxShadow: creating ? "none" : "0 4px 14px rgba(58,91,217,0.35)" }}>
          {creating ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Report Incident</>}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={CARD}>
          <SLabel>New Incident Report</SLabel>
          <div className="space-y-4">
            <div>
              <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>INCIDENT TITLE *</label>
              <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                placeholder="e.g. Database query latency spike — p99 > 2s" style={INPUT}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Severity */}
              <div>
                <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:8 }}>SEVERITY</label>
                <div className="flex gap-2">
                  {(["critical","major","minor","info"] as IncidentSeverity[]).map(s => (
                    <button key={s} onClick={() => setForm(p=>({...p,severity:s}))}
                      className="flex-1 py-2 rounded-xl text-xs font-bold capitalize"
                      style={{ background:form.severity===s?`${incColor(s)}18`:"rgba(58,91,217,0.04)",
                        border:`1px solid ${form.severity===s?incColor(s):T.border}`,
                        color:form.severity===s?incColor(s):T.muted }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Affected services */}
              <div>
                <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:8 }}>AFFECTED SERVICES</label>
                <div className="flex flex-wrap gap-1.5">
                  {services.slice(0,8).map(s => (
                    <button key={s.id} onClick={() => setForm(p=>({
                      ...p, affectedServices: p.affectedServices.includes(s.id)
                        ? p.affectedServices.filter(x=>x!==s.id)
                        : [...p.affectedServices, s.id]
                    }))}
                      className="px-2 py-1 rounded-lg text-xs"
                      style={{ background:form.affectedServices.includes(s.id)?T.primBg:"rgba(58,91,217,0.04)",
                        border:`1px solid ${form.affectedServices.includes(s.id)?T.primary:T.border}`,
                        color:form.affectedServices.includes(s.id)?T.primary:T.muted }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>DESCRIPTION *</label>
              <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                rows={3} placeholder="Describe the impact, what services are affected, and what users are experiencing…"
                className="w-full resize-none" style={INPUT}/>
            </div>
            <button onClick={createIncident}
              className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff",
                boxShadow:"0 4px 14px rgba(58,91,217,0.35)" }}>
              Create Incident & Notify Recipients
            </button>
          </div>
        </div>
      )}

      {/* Open incidents */}
      {open.length > 0 && (
        <div>
          <div style={{ color:T.red, fontSize:11, fontWeight:700, ...MONO, marginBottom:10 }}>
            ● ACTIVE INCIDENTS ({open.length})
          </div>
          <div className="space-y-3">
            {open.map(inc => (
              <IncidentCard key={inc.id} inc={inc} services={services}
                expanded={expandedInc === inc.id}
                onToggle={() => setExpandedInc(expandedInc===inc.id?null:inc.id)}
                updateText={updateText[inc.id]??""} onUpdateText={v => setUpdateText(p=>({...p,[inc.id]:v}))}
                onAddUpdate={addUpdate} updateStatuses={UPDATE_STATUSES}/>
            ))}
          </div>
        </div>
      )}

      {/* Resolved incidents */}
      {resolved.length > 0 && (
        <div>
          <div style={{ color:T.green, fontSize:11, fontWeight:700, ...MONO, marginBottom:10, marginTop:16 }}>
            ✓ RESOLVED INCIDENTS ({resolved.length})
          </div>
          <div className="space-y-3">
            {resolved.map(inc => (
              <IncidentCard key={inc.id} inc={inc} services={services}
                expanded={expandedInc === inc.id}
                onToggle={() => setExpandedInc(expandedInc===inc.id?null:inc.id)}
                updateText={updateText[inc.id]??""} onUpdateText={v => setUpdateText(p=>({...p,[inc.id]:v}))}
                onAddUpdate={addUpdate} updateStatuses={UPDATE_STATUSES}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IncidentCard({ inc, services, expanded, onToggle, updateText, onUpdateText, onAddUpdate, updateStatuses }: {
  inc: Incident; services: Service[]; expanded: boolean; onToggle: () => void;
  updateText: string; onUpdateText: (v:string)=>void;
  onAddUpdate: (id:string, status:IncidentStatus)=>void;
  updateStatuses: { id:IncidentStatus; label:string }[];
}) {
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(inc.status);
  const sc = incColor(inc.severity);
  const resolved = inc.status === "resolved";

  return (
    <div style={{ background:T.card, border:`1px solid ${resolved ? T.greenBd : sc+"40"}`,
      boxShadow:`0 2px 12px ${sc}10`, borderRadius:16, overflow:"hidden" }}>
      {/* Header row */}
      <div className="flex items-start gap-4 px-5 py-4 cursor-pointer" onClick={onToggle}>
        {/* Severity dot */}
        <div style={{ width:10, height:10, borderRadius:"50%", background:sc, flexShrink:0,
          boxShadow:`0 0 8px ${sc}`, marginTop:6 }}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span style={{ ...DISPLAY, fontSize:15, color:T.text }}>{inc.title}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background:incBg(inc.severity), color:sc, ...MONO, fontSize:9 }}>
              {inc.severity.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background:`${stColor(inc.status)}15`, color:stColor(inc.status), ...MONO, fontSize:9 }}>
              {inc.status.toUpperCase()}
            </span>
          </div>
          <div style={{ color:T.sub, fontSize:12 }}>
            {inc.id} · {inc.createdAt}
            {inc.resolvedAt && <span style={{ color:T.green }}> → Resolved {inc.resolvedAt}</span>}
          </div>
          {/* Affected services chips */}
          {inc.affectedServices.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {inc.affectedServices.map(sid => {
                const svc = services.find(s => s.id === sid);
                return svc ? (
                  <span key={sid} className="px-2 py-0.5 rounded text-xs"
                    style={{ background:T.card3, color:T.sub, border:`1px solid ${T.border}`, ...MONO, fontSize:9 }}>
                    {svc.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div style={{ color:T.muted, flexShrink:0 }}>
          {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:T.border }}>
          {/* Description */}
          <div className="pt-4">
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:6 }}>DESCRIPTION</div>
            <p style={{ color:T.sub, fontSize:13, lineHeight:1.7 }}>{inc.description}</p>
          </div>

          {/* Timeline */}
          <div>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:10 }}>INCIDENT TIMELINE</div>
            <div className="space-y-3">
              {inc.updates.map((u, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center" style={{ flexShrink:0 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:stColor(u.status), marginTop:4 }}/>
                    {i < inc.updates.length-1 && <div style={{ width:1, flex:1, background:T.border, marginTop:4 }}/>}
                  </div>
                  <div className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color:T.muted, fontSize:11, ...MONO }}>{u.time}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{ background:`${stColor(u.status)}15`, color:stColor(u.status), fontSize:9, ...MONO }}>
                        {u.status}
                      </span>
                      <span style={{ color:T.muted, fontSize:11 }}>· {u.author}</span>
                    </div>
                    <p style={{ color:T.text, fontSize:13 }}>{u.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add update */}
          {!resolved && (
            <div className="pt-2 border-t" style={{ borderColor:T.border }}>
              <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:8 }}>POST UPDATE</div>
              <textarea value={updateText} onChange={e => onUpdateText(e.target.value)} rows={2}
                placeholder="Describe what's been found, what actions were taken, or current status…"
                className="w-full resize-none mb-3" style={INPUT}/>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ color:T.muted, fontSize:11 }}>Update status to:</span>
                {updateStatuses.filter(s => s.id !== "investigating").map(s => (
                  <button key={s.id} onClick={() => setSelectedStatus(s.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background:selectedStatus===s.id?`${stColor(s.id)}18`:"rgba(58,91,217,0.04)",
                      border:`1px solid ${selectedStatus===s.id?stColor(s.id):T.border}`,
                      color:selectedStatus===s.id?stColor(s.id):T.muted }}>
                    {s.label}
                  </button>
                ))}
                <button onClick={() => onAddUpdate(inc.id, selectedStatus)}
                  className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff" }}>
                  <Send size={11}/> Post Update
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAINTENANCE PANEL
   ═══════════════════════════════════════════════════════════════════ */
function MaintenancePanel({ services, incidents }: { services:Service[]; incidents:Incident[] }) {
  const [team] = useState<MaintenanceTeamMember[]>(MAINTENANCE_TEAM);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(["MT-001","MT-002"]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [affectedSvcs, setAffectedSvcs] = useState<string[]>([]);
  const [severity, setSeverity] = useState<IncidentSeverity>("major");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const activeIncident = incidents.find(i => i.status !== "resolved");

  /* Pre-fill from active incident */
  function prefill() {
    if (!activeIncident) return;
    setSubject(`[INCIDENT ${activeIncident.id}] ${activeIncident.title}`);
    setBody(`Hello Team,\n\nWe are currently investigating the following incident:\n\n${activeIncident.title}\n\n${activeIncident.description}\n\nAffected services: ${activeIncident.affectedServices.map(s => services.find(x=>x.id===s)?.name ?? s).join(", ")}\n\nPlease review and respond to the latest update in the incident log. Your immediate attention is needed.\n\nThank you,\nFinal Pass Down Admin`);
    setAffectedSvcs(activeIncident.affectedServices);
    setSeverity(activeIncident.severity);
    setSelectedMembers(team.filter(m=>m.available).map(m=>m.id));
  }

  function sendEmail() {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and message are required"); return; }
    if (!selectedMembers.length)         { toast.error("Select at least one team member"); return; }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      const names = team.filter(m=>selectedMembers.includes(m.id)).map(m=>m.name.split(" ")[0]).join(", ");
      toast.success(`📧 Email sent to: ${names}`);
      setTimeout(() => setSent(false), 4000);
    }, 1200);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">

        {/* Team roster */}
        <div style={CARD}>
          <SLabel>Maintenance Team Roster</SLabel>
          <div className="space-y-3">
            {team.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                onClick={() => setSelectedMembers(prev =>
                  prev.includes(m.id) ? prev.filter(x=>x!==m.id) : [...prev,m.id])}
                style={{ background:selectedMembers.includes(m.id)?T.primBg:T.card3,
                  border:`1.5px solid ${selectedMembers.includes(m.id)?T.primary:T.border}` }}>
                {/* Avatar */}
                <div className="flex items-center justify-center rounded-xl flex-shrink-0 font-bold text-sm"
                  style={{ width:38, height:38, background:`linear-gradient(135deg,#3A5BD9,#5B7BF5)`, color:"#fff" }}>
                  {m.name.split(" ").map(n=>n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span style={{ color:T.text, fontSize:13, fontWeight:600 }}>{m.name}</span>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:m.available?T.green:T.muted,
                      flexShrink:0 }}/>
                  </div>
                  <div style={{ color:T.sub, fontSize:11 }}>{m.specialty}</div>
                  <div style={{ color:T.muted, fontSize:10, ...MONO }}>{m.email}</div>
                </div>
                <div>
                  {selectedMembers.includes(m.id)
                    ? <CheckCircle size={16} color={T.primary}/>
                    : <div style={{ width:16, height:16, borderRadius:"50%", border:`1.5px solid ${T.border}` }}/>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ color:T.muted, fontSize:11, marginTop:8 }}>
            {selectedMembers.length} of {team.length} selected · click to toggle
          </div>
        </div>

        {/* Email composer */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <SLabel>Compose Maintenance Email</SLabel>
            {activeIncident && (
              <button onClick={prefill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background:T.amberBg, color:T.amber, border:`1px solid ${T.amberBd}` }}>
                <AlertCircle size={10}/> Pre-fill from Active Incident
              </button>
            )}
          </div>

          {/* Affected services chips */}
          <div style={{ marginBottom:14 }}>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:8 }}>AFFECTED SERVICES</div>
            <div className="flex flex-wrap gap-1.5">
              {services.slice(0,10).map(s => (
                <button key={s.id} onClick={() => setAffectedSvcs(prev =>
                  prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])}
                  className="px-2 py-1 rounded-lg text-xs transition-all"
                  style={{ background:affectedSvcs.includes(s.id)?T.redBg:T.card3,
                    border:`1px solid ${affectedSvcs.includes(s.id)?T.redBd:T.border}`,
                    color:affectedSvcs.includes(s.id)?T.red:T.muted }}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div style={{ marginBottom:14 }}>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:8 }}>SEVERITY</div>
            <div className="flex gap-2">
              {(["critical","major","minor","info"] as IncidentSeverity[]).map(s => (
                <button key={s} onClick={() => setSeverity(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold capitalize"
                  style={{ background:severity===s?`${incColor(s)}18`:"rgba(58,91,217,0.04)",
                    border:`1px solid ${severity===s?incColor(s):T.border}`,
                    color:severity===s?incColor(s):T.muted }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom:12 }}>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:5 }}>SUBJECT *</div>
            <input value={subject} onChange={e=>setSubject(e.target.value)}
              placeholder="[INCIDENT] Brief description of the issue" style={INPUT}/>
          </div>

          {/* Body */}
          <div style={{ marginBottom:16 }}>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:5 }}>MESSAGE *</div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={7}
              placeholder="Describe the issue, affected services, current status, and what the maintenance team needs to do…"
              className="w-full resize-none" style={INPUT}/>
          </div>

          {/* Preview of recipients */}
          {selectedMembers.length > 0 && (
            <div className="px-4 py-3 rounded-xl mb-4"
              style={{ background:T.primBg, border:`1px solid ${T.primBd}` }}>
              <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:6 }}>SENDING TO</div>
              <div className="flex flex-wrap gap-2">
                {team.filter(m=>selectedMembers.includes(m.id)).map(m => (
                  <span key={m.id} className="px-2 py-0.5 rounded text-xs"
                    style={{ background:"rgba(58,91,217,0.1)", color:T.primary }}>
                    {m.name} &lt;{m.email}&gt;
                  </span>
                ))}
              </div>
              {affectedSvcs.length > 0 && (
                <div style={{ color:T.sub, fontSize:11, marginTop:8 }}>
                  Affected: {affectedSvcs.map(id=>services.find(s=>s.id===id)?.name).filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          )}

          <button onClick={sendEmail} disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
            style={{ background:sent?"rgba(72,187,120,0.15)":"linear-gradient(135deg,#3A5BD9,#5B7BF5)",
              color:sent?T.green:"#fff",
              border:sent?`1px solid ${T.greenBd}`:"none",
              boxShadow:sent?"none":"0 4px 16px rgba(58,91,217,0.35)", opacity:sending?0.7:1 }}>
            {sent
              ? <><CheckCircle size={14}/> Email Sent Successfully</>
              : sending
                ? "Sending…"
                : <><Send size={14}/> Send to {selectedMembers.length} Team Member{selectedMembers.length!==1?"s":""}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ALERT RECIPIENTS PANEL
   ═══════════════════════════════════════════════════════════════════ */
function AlertRecipientsPanel({
  recipients, setRecipients
}: { recipients:AlertRecipient[]; setRecipients:React.Dispatch<React.SetStateAction<AlertRecipient[]>> }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"",
    notifyOn:["critical","major"] as ("critical"|"major"|"minor")[] });

  function addRecipient() {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email required"); return; }
    const r: AlertRecipient = {
      id: `ALR-${String(Date.now()).slice(-3)}`,
      name:form.name, email:form.email, role:form.role,
      notifyOn:form.notifyOn, active:true,
    };
    setRecipients(prev => [...prev, r]);
    setAdding(false);
    setForm({ name:"", email:"", role:"", notifyOn:["critical","major"] });
    toast.success(`${form.name} added to alert recipients`);
  }

  function toggleActive(id: string) {
    setRecipients(prev => prev.map(r => r.id===id ? { ...r, active:!r.active } : r));
  }

  function removeRecipient(id: string) {
    setRecipients(prev => prev.filter(r => r.id !== id));
    toast.info("Recipient removed");
  }

  function toggleNotifyOn(id: string, level: "critical"|"major"|"minor") {
    setRecipients(prev => prev.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        notifyOn: r.notifyOn.includes(level)
          ? r.notifyOn.filter(x=>x!==level)
          : [...r.notifyOn, level],
      };
    }));
  }

  const LEVELS: ("critical"|"major"|"minor")[] = ["critical","major","minor"];
  const levelColor = (l: string) =>
    l==="critical" ? T.red : l==="major" ? T.amber : "#4A90D9";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div style={{ ...DISPLAY, fontSize:16, color:T.text }}>Alert Notification Recipients</div>
          <div style={{ color:T.sub, fontSize:13, marginTop:2 }}>
            {recipients.filter(r=>r.active).length} active recipients · notified automatically when incidents occur
          </div>
        </div>
        <button onClick={() => setAdding(v=>!v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
          style={{ background:adding?T.redBg:"linear-gradient(135deg,#3A5BD9,#5B7BF5)",
            color:adding?T.red:"#fff", border:adding?`1px solid ${T.redBd}`:"none",
            boxShadow:adding?"none":"0 4px 14px rgba(58,91,217,0.35)" }}>
          {adding ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Add Recipient</>}
        </button>
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
        style={{ background:T.primBg, border:`1px solid ${T.primBd}` }}>
        <Bell size={16} color={T.primary} style={{ flexShrink:0, marginTop:1 }}/>
        <div>
          <div style={{ color:T.text, fontSize:13, fontWeight:600, marginBottom:4 }}>How Alert Notifications Work</div>
          <div style={{ color:T.sub, fontSize:12, lineHeight:1.7 }}>
            Recipients are automatically emailed when a new incident is created or status is updated.
            Each recipient can be configured to receive <span style={{ color:T.red, fontWeight:600 }}>critical</span>,{" "}
            <span style={{ color:T.amber, fontWeight:600 }}>major</span>, and/or{" "}
            <span style={{ color:"#4A90D9", fontWeight:600 }}>minor</span> alerts.
            Inactive recipients remain in the list but receive no emails.
          </div>
        </div>
      </div>

      {/* Add recipient form */}
      {adding && (
        <div style={CARD}>
          <SLabel>New Alert Recipient</SLabel>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label:"FULL NAME *", key:"name",  ph:"e.g. Alex Rivera" },
              { label:"EMAIL *",     key:"email", ph:"a.rivera@email.com" },
              { label:"ROLE",        key:"role",  ph:"e.g. Backend Engineer" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  placeholder={f.ph} style={INPUT}/>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:8 }}>NOTIFY ON</div>
            <div className="flex gap-3">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setForm(p=>({
                  ...p, notifyOn:p.notifyOn.includes(l)?p.notifyOn.filter(x=>x!==l):[...p.notifyOn,l]
                }))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background:form.notifyOn.includes(l)?`${levelColor(l)}15`:"rgba(58,91,217,0.04)",
                    border:`1.5px solid ${form.notifyOn.includes(l)?levelColor(l):T.border}`,
                    color:form.notifyOn.includes(l)?levelColor(l):T.muted }}>
                  {form.notifyOn.includes(l) ? <CheckCircle size={13}/> : <div style={{ width:13,height:13,borderRadius:"50%",border:`1.5px solid ${T.border}` }}/>}
                  {l.charAt(0).toUpperCase()+l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={addRecipient}
            className="px-6 py-2.5 rounded-xl font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff",
              boxShadow:"0 4px 14px rgba(58,91,217,0.3)" }}>
            Add Recipient
          </button>
        </div>
      )}

      {/* Recipients table */}
      <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
        <div className="grid px-5 py-3"
          style={{ gridTemplateColumns:"1fr auto auto auto auto", gap:16,
            background:"rgba(10,20,40,0.9)", borderBottom:`1px solid ${T.border}` }}>
          {["Recipient","Role","Notify On","Status","Actions"].map(h => (
            <span key={h} style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>{h.toUpperCase()}</span>
          ))}
        </div>
        {recipients.map((r, i) => (
          <div key={r.id} className="grid items-center px-5 py-4 border-b"
            style={{ gridTemplateColumns:"1fr auto auto auto auto", gap:16,
              background:i%2===0?"#fff":"#F8FAFF", borderColor:"rgba(58,91,217,0.05)" }}>
            {/* Recipient */}
            <div>
              <div style={{ color:T.text, fontSize:13, fontWeight:500 }}>{r.name}</div>
              <div style={{ color:T.muted, fontSize:11, ...MONO }}>{r.email}</div>
            </div>
            {/* Role */}
            <span style={{ color:T.sub, fontSize:12, whiteSpace:"nowrap" }}>{r.role || "—"}</span>
            {/* Notify levels */}
            <div className="flex gap-1.5">
              {LEVELS.map(l => (
                <button key={l} onClick={() => toggleNotifyOn(r.id, l)}
                  className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background:r.notifyOn.includes(l)?`${levelColor(l)}18`:"rgba(58,91,217,0.04)",
                    border:`1px solid ${r.notifyOn.includes(l)?levelColor(l):T.border}`,
                    color:r.notifyOn.includes(l)?levelColor(l):T.muted, fontSize:9, ...MONO }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Active toggle */}
            <button onClick={() => toggleActive(r.id)} style={{ color:r.active?T.green:T.muted }}>
              {r.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
            </button>
            {/* Remove */}
            <button onClick={() => removeRecipient(r.id)}
              className="p-1.5 rounded-lg"
              style={{ color:T.red, background:T.redBg, border:`1px solid ${T.redBd}` }}>
              <X size={12}/>
            </button>
          </div>
        ))}
      </div>

      {/* Test alert button */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
        style={{ background:T.card3, border:`1px solid ${T.border}` }}>
        <div>
          <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>Send Test Alert</div>
          <div style={{ color:T.sub, fontSize:12, marginTop:2 }}>
            Sends a test email to all active recipients to verify delivery
          </div>
        </div>
        <button onClick={() => toast.success(`Test alert sent to ${recipients.filter(r=>r.active).length} active recipients`)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background:T.primBg, color:T.primary, border:`1px solid ${T.primBd}` }}>
          <Bell size={13}/> Send Test Alert
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   API MONITOR PANEL — live endpoint health checker
   ═══════════════════════════════════════════════════════════════════ */
function checkStatusColor(s: CheckStatus) {
  return { up:T.green, slow:T.amber, degraded:"#F6AD55", down:T.red, checking:T.muted }[s];
}
function checkStatusBg(s: CheckStatus) {
  return { up:T.greenBg, slow:T.amberBg, degraded:T.amberBg, down:T.redBg, checking:"rgba(138,154,184,0.1)" }[s];
}
function checkStatusBd(s: CheckStatus) {
  return { up:T.greenBd, slow:T.amberBd, degraded:T.amberBd, down:T.redBd, checking:"rgba(138,154,184,0.2)" }[s];
}
function httpColor(code: number) {
  if (code >= 500) return T.red;
  if (code >= 400) return T.amber;
  if (code >= 200 && code < 300) return T.green;
  return T.muted;
}

function ApiMonitorPanel() {
  const [endpoints, setEndpoints] = useState<MonitoredEndpoint[]>(INITIAL_MONITORED);
  const [checking, setChecking]   = useState<Set<string>>(new Set());
  const [selected, setSelected]   = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all"|CheckStatus>("all");
  const [autoRefresh, setAutoRefresh]   = useState(true);
  const [addingEp, setAddingEp]         = useState(false);
  const [newEp, setNewEp] = useState({ method:"GET", path:"", description:"",
    thresholdWarnMs:"200", thresholdDownMs:"1000", checkIntervalSec:"60" });
  const tickRef = useRef(0);

  /* ── Simulated auto-refresh every 15s ─────────────────────────── */
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      setEndpoints(prev => prev.map(ep => {
        if (!ep.enabled) return ep;
        const jitter = Math.round(ep.latencyMs * (0.85 + Math.random() * 0.3));
        const newStatus: CheckStatus =
          jitter > ep.thresholdDownMs ? "down"
          : jitter > ep.thresholdWarnMs * 1.5 ? "degraded"
          : jitter > ep.thresholdWarnMs ? "slow"
          : "up";
        const result: CheckResult = {
          ts: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
          latencyMs: jitter, httpStatus: newStatus==="down"?504:200, status: newStatus,
        };
        return {
          ...ep,
          status: newStatus,
          latencyMs: jitter,
          httpStatus: result.httpStatus,
          lastChecked: "just now",
          consecutiveFails: newStatus==="up" ? 0 : ep.consecutiveFails+1,
          history: [...ep.history.slice(-19), result],
        };
      }));
    }, 15000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  /* ── Manual single-endpoint check ─────────────────────────────── */
  function runCheck(id: string) {
    setChecking(prev => new Set([...prev, id]));
    const delay = 600 + Math.random() * 800;
    setTimeout(() => {
      setEndpoints(prev => prev.map(ep => {
        if (ep.id !== id) return ep;
        const jitter = Math.round(ep.latencyMs * (0.8 + Math.random() * 0.4));
        const newStatus: CheckStatus =
          jitter > ep.thresholdDownMs ? "down"
          : jitter > ep.thresholdWarnMs * 1.5 ? "degraded"
          : jitter > ep.thresholdWarnMs ? "slow"
          : "up";
        const result: CheckResult = {
          ts: new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),
          latencyMs: jitter, httpStatus: newStatus==="down"?504:200, status: newStatus,
        };
        const label = { up:"✅ Up", slow:"⚠️ Slow", degraded:"⚠️ Degraded", down:"🔴 Down", checking:"" }[newStatus];
        toast.success(`${ep.method} ${ep.path} — ${label} · ${jitter}ms`);
        return {
          ...ep, status:newStatus, latencyMs:jitter, httpStatus:result.httpStatus,
          lastChecked:"just now", consecutiveFails: newStatus==="up"?0:ep.consecutiveFails+1,
          history:[...ep.history.slice(-19), result],
        };
      }));
      setChecking(prev => { const n=new Set(prev); n.delete(id); return n; });
    }, delay);
  }

  /* ── Check all endpoints ───────────────────────────────────────── */
  function runAllChecks() {
    endpoints.filter(ep=>ep.enabled).forEach(ep => runCheck(ep.id));
    toast.info(`Running checks on ${endpoints.filter(ep=>ep.enabled).length} endpoints…`);
  }

  /* ── Toggle endpoint enabled ──────────────────────────────────── */
  function toggleEnabled(id: string) {
    setEndpoints(prev => prev.map(ep => ep.id===id ? {...ep,enabled:!ep.enabled} : ep));
  }

  /* ── Add new endpoint ─────────────────────────────────────────── */
  function addEndpoint() {
    if (!newEp.path.trim()) { toast.error("Endpoint path is required"); return; }
    const ep: MonitoredEndpoint = {
      id: `ep_custom_${Date.now()}`,
      method: newEp.method, path: newEp.path,
      baseUrl: "https://api.finalpassdown.com",
      description: newEp.description || "Custom endpoint",
      thresholdWarnMs: parseInt(newEp.thresholdWarnMs)||200,
      thresholdDownMs: parseInt(newEp.thresholdDownMs)||1000,
      checkIntervalSec: parseInt(newEp.checkIntervalSec)||60,
      enabled: true, status:"checking", latencyMs:0, httpStatus:0,
      lastChecked:"Never", uptime24h:100, consecutiveFails:0,
      history:[],
    };
    setEndpoints(prev => [...prev, ep]);
    setAddingEp(false);
    setNewEp({ method:"GET", path:"", description:"", thresholdWarnMs:"200", thresholdDownMs:"1000", checkIntervalSec:"60" });
    toast.success(`Endpoint added — running first check…`);
    setTimeout(() => runCheck(ep.id), 300);
  }

  const filtered = endpoints.filter(ep => filterStatus==="all" || ep.status===filterStatus);
  const upCount   = endpoints.filter(e=>e.status==="up").length;
  const slowCount = endpoints.filter(e=>e.status==="slow"||e.status==="degraded").length;
  const downCount = endpoints.filter(e=>e.status==="down").length;
  const avgLatency = Math.round(endpoints.filter(e=>e.enabled).reduce((s,e)=>s+e.latencyMs,0)/Math.max(endpoints.filter(e=>e.enabled).length,1));
  const avgUptime  = (endpoints.reduce((s,e)=>s+e.uptime24h,0)/Math.max(endpoints.length,1)).toFixed(2);

  const selectedEp = endpoints.find(e=>e.id===selected) ?? null;

  const METHOD_COLORS: Record<string,string> = {
    GET:"#3A5BD9", POST:"#48BB78", PUT:"#F6AD55", DELETE:"#FC8181", PATCH:"#6E8BFF"
  };

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div style={{ ...DISPLAY, fontSize:16, color:T.text }}>API Monitor</div>
          <div style={{ color:T.sub, fontSize:13, marginTop:2 }}>
            Live health checks on all platform endpoints — auto-refreshes every 15 seconds
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button onClick={() => setAutoRefresh(v=>!v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background:autoRefresh?T.greenBg:T.redBg,
              color:autoRefresh?T.green:T.red,
              border:`1px solid ${autoRefresh?T.greenBd:T.redBd}` }}>
            {autoRefresh ? <><ToggleRight size={14}/> Auto-refresh ON</> : <><ToggleLeft size={14}/> Auto-refresh OFF</>}
          </button>
          <button onClick={runAllChecks}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff",
              boxShadow:"0 4px 14px rgba(58,91,217,0.3)" }}>
            <RefreshCw size={13}/> Check All Now
          </button>
          <button onClick={() => setAddingEp(v=>!v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background:addingEp?T.redBg:T.primBg, color:addingEp?T.red:T.primary,
              border:`1px solid ${addingEp?T.redBd:T.primBd}` }}>
            {addingEp ? <><X size={13}/> Cancel</> : <><Plus size={13}/> Add Endpoint</>}
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label:"Endpoints Up",      value:upCount,                          sub:"Healthy",           color:T.green  },
          { label:"Slow / Degraded",   value:slowCount,                        sub:"Above warn threshold",color:T.amber  },
          { label:"Down",              value:downCount,                        sub:"Failed checks",     color:downCount>0?T.red:T.muted },
          { label:"Avg Latency",       value:`${avgLatency} ms`,               sub:"All enabled endpoints",color:T.primary},
          { label:"24h Avg Uptime",    value:`${avgUptime}%`,                  sub:"All endpoints",     color:T.green  },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ ...DISPLAY, fontSize:26, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ color:T.text, fontSize:12, fontWeight:500, marginTop:6 }}>{s.label}</div>
            <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Add endpoint form ────────────────────────────────────── */}
      {addingEp && (
        <div style={CARD}>
          <SLabel>Add New Monitored Endpoint</SLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Method picker */}
            <div>
              <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:8 }}>METHOD</label>
              <div className="flex gap-2">
                {["GET","POST","PUT","PATCH","DELETE"].map(m => (
                  <button key={m} onClick={() => setNewEp(p=>({...p,method:m}))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background:newEp.method===m?`${METHOD_COLORS[m]}18`:"rgba(58,91,217,0.04)",
                      border:`1px solid ${newEp.method===m?METHOD_COLORS[m]:T.border}`,
                      color:newEp.method===m?METHOD_COLORS[m]:T.muted }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>PATH *</label>
              <input value={newEp.path} onChange={e=>setNewEp(p=>({...p,path:e.target.value}))}
                placeholder="/api/v1/your-endpoint" style={INPUT}/>
            </div>
            <div>
              <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>DESCRIPTION</label>
              <input value={newEp.description} onChange={e=>setNewEp(p=>({...p,description:e.target.value}))}
                placeholder="What this endpoint does" style={INPUT}/>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label:"WARN THRESHOLD (ms)", key:"thresholdWarnMs", ph:"200" },
                { label:"DOWN THRESHOLD (ms)", key:"thresholdDownMs", ph:"1000" },
                { label:"CHECK INTERVAL (s)",  key:"checkIntervalSec",ph:"60" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:T.muted, fontSize:9, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input type="number" value={(newEp as any)[f.key]}
                    onChange={e=>setNewEp(p=>({...p,[f.key]:e.target.value}))}
                    placeholder={f.ph} style={{...INPUT,padding:"8px 10px"}}/>
                </div>
              ))}
            </div>
          </div>
          <button onClick={addEndpoint}
            className="px-6 py-2.5 rounded-xl font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff",
              boxShadow:"0 4px 14px rgba(58,91,217,0.3)" }}>
            Add & Start Monitoring
          </button>
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span style={{ color:T.muted, fontSize:12 }}>Filter:</span>
        {(["all","up","slow","degraded","down"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold capitalize"
            style={{ background: filterStatus===s
                ? s==="all" ? T.primary : checkStatusColor(s as CheckStatus)
                : "rgba(58,91,217,0.05)",
              color: filterStatus===s ? "#fff" : T.muted,
              border: `1px solid ${filterStatus===s
                ? s==="all" ? T.primary : checkStatusColor(s as CheckStatus)
                : T.border}` }}>
            {s === "all" ? `All (${endpoints.length})` : s}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {autoRefresh && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background:T.greenBg, border:`1px solid ${T.greenBd}` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.green,
                animation:"pulse 1.5s infinite" }}/>
              <span style={{ color:T.green, fontSize:11, ...MONO }}>LIVE · checks every 15s</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Two-panel layout: list + detail ─────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Endpoint list ─────────────────────────────────────── */}
        <div style={{ flex:selected ? "0 0 52%" : "1", minWidth:0 }}>
          <div style={{ ...CARD, padding:0, overflow:"hidden" }}>
            {/* Table header */}
            <div className="grid px-4 py-3"
              style={{ gridTemplateColumns:"56px 1fr 80px 80px 90px 70px 80px", gap:12,
                background:"rgba(10,20,40,0.9)", borderBottom:`1px solid ${T.border}` }}>
              {["Method","Endpoint","Status","Latency","HTTP","Uptime","Actions"].map(h => (
                <span key={h} style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>{h.toUpperCase()}</span>
              ))}
            </div>

            {filtered.map((ep, i) => {
              const sc   = checkStatusColor(ep.status);
              const isCk = checking.has(ep.id);
              const isSelected = selected === ep.id;
              return (
                <div key={ep.id}
                  className="grid items-center px-4 py-3 border-b cursor-pointer transition-all"
                  onClick={() => setSelected(isSelected ? null : ep.id)}
                  style={{
                    gridTemplateColumns:"56px 1fr 80px 80px 90px 70px 80px", gap:12,
                    background: isSelected ? T.primBg : i%2===0 ? "#fff" : "#F8FAFF",
                    borderColor:"rgba(58,91,217,0.05)",
                    borderLeft: isSelected ? `3px solid ${T.primary}` : "3px solid transparent",
                    opacity: ep.enabled ? 1 : 0.5,
                  }}>
                  {/* Method badge */}
                  <span className="px-2 py-0.5 rounded text-center font-bold"
                    style={{ background:`${METHOD_COLORS[ep.method] ?? T.muted}18`,
                      color:METHOD_COLORS[ep.method] ?? T.muted, fontSize:8, ...MONO }}>
                    {ep.method}
                  </span>

                  {/* Path + description */}
                  <div className="min-w-0">
                    <div style={{ color:T.text, fontSize:12, ...MONO, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ep.path}</div>
                    <div style={{ color:T.muted, fontSize:10, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ep.description}</div>
                  </div>

                  {/* Status pill */}
                  <span className="px-2 py-0.5 rounded-full text-center font-bold"
                    style={{ background:isCk?T.card3:checkStatusBg(ep.status),
                      color:isCk?T.muted:sc, border:`1px solid ${isCk?T.border:checkStatusBd(ep.status)}`,
                      fontSize:8, ...MONO }}>
                    {isCk ? "CHECKING" : ep.status.toUpperCase()}
                  </span>

                  {/* Latency + sparkline */}
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: ep.latencyMs > ep.thresholdDownMs ? T.red
                        : ep.latencyMs > ep.thresholdWarnMs ? T.amber : T.green,
                      fontSize:11, fontWeight:700, ...MONO, flexShrink:0 }}>
                      {ep.latencyMs >= 1000 ? `${(ep.latencyMs/1000).toFixed(1)}s` : `${ep.latencyMs}ms`}
                    </span>
                    <Sparkline
                      data={ep.history.slice(-8).map(h=>h.latencyMs)}
                      color={sc} width={36} height={18}/>
                  </div>

                  {/* HTTP status */}
                  <span style={{ color:httpColor(ep.httpStatus), fontSize:11, fontWeight:700, ...MONO }}>
                    {isCk ? "—" : ep.httpStatus || "—"}
                  </span>

                  {/* Uptime */}
                  <span style={{ color: ep.uptime24h >= 99.9 ? T.green : ep.uptime24h >= 99 ? T.amber : T.red,
                    fontSize:11, fontWeight:700, ...MONO }}>
                    {ep.uptime24h}%
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => runCheck(ep.id)} disabled={isCk}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background:T.primBg, color:T.primary, border:`1px solid ${T.primBd}`,
                        opacity:isCk?0.5:1 }}>
                      <RefreshCw size={11} style={{ animation:isCk?"spin 1s linear infinite":"none" }}/>
                    </button>
                    <button onClick={() => toggleEnabled(ep.id)}
                      className="p-1.5 rounded-lg"
                      style={{ background:ep.enabled?T.greenBg:T.redBg,
                        color:ep.enabled?T.green:T.red,
                        border:`1px solid ${ep.enabled?T.greenBd:T.redBd}` }}>
                      {ep.enabled ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10" style={{ color:T.muted, fontSize:13 }}>
              No endpoints match this filter
            </div>
          )}
        </div>

        {/* ── Detail panel ──────────────────────────────────────── */}
        {selectedEp && (
          <div style={{ flex:"0 0 46%", minWidth:0, position:"sticky", top:16 }}>
            <div style={CARD}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded font-bold text-xs"
                      style={{ background:`${METHOD_COLORS[selectedEp.method]??T.muted}18`,
                        color:METHOD_COLORS[selectedEp.method]??T.muted, ...MONO }}>
                      {selectedEp.method}
                    </span>
                    <span style={{ ...MONO, color:T.text, fontSize:13, fontWeight:600 }}>{selectedEp.path}</span>
                  </div>
                  <div style={{ color:T.sub, fontSize:12 }}>{selectedEp.description}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ color:T.muted }}>
                  <X size={15}/>
                </button>
              </div>

              {/* Current status */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
                style={{ background:checkStatusBg(selectedEp.status), border:`1px solid ${checkStatusBd(selectedEp.status)}` }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:checkStatusColor(selectedEp.status),
                  boxShadow:`0 0 8px ${checkStatusColor(selectedEp.status)}`, flexShrink:0 }}/>
                <div>
                  <div style={{ color:checkStatusColor(selectedEp.status), fontSize:14, fontWeight:700 }}>
                    {selectedEp.status.toUpperCase()}
                    {selectedEp.consecutiveFails > 0 && (
                      <span style={{ color:T.red, fontSize:11, fontWeight:400, marginLeft:8 }}>
                        · {selectedEp.consecutiveFails} consecutive fail{selectedEp.consecutiveFails>1?"s":""}
                      </span>
                    )}
                  </div>
                  <div style={{ color:T.sub, fontSize:11 }}>
                    {selectedEp.latencyMs}ms · HTTP {selectedEp.httpStatus} · Last checked: {selectedEp.lastChecked}
                  </div>
                </div>
                <button onClick={() => runCheck(selectedEp.id)}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  style={{ background:T.primBg, color:T.primary, border:`1px solid ${T.primBd}` }}>
                  <RefreshCw size={11}/> Check Now
                </button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label:"24h Uptime",  value:`${selectedEp.uptime24h}%`,
                    color: selectedEp.uptime24h>=99.9?T.green:selectedEp.uptime24h>=99?T.amber:T.red },
                  { label:"Warn Threshold", value:`${selectedEp.thresholdWarnMs}ms`, color:T.amber },
                  { label:"Down Threshold", value:`${selectedEp.thresholdDownMs}ms`, color:T.red },
                  { label:"Check Interval", value:`${selectedEp.checkIntervalSec}s`,  color:T.primary },
                  { label:"HTTP Status",    value:selectedEp.httpStatus||"—",          color:httpColor(selectedEp.httpStatus) },
                  { label:"Enabled",        value:selectedEp.enabled?"Yes":"Paused",  color:selectedEp.enabled?T.green:T.muted },
                ].map(s => (
                  <div key={s.label} className="px-3 py-2.5 rounded-xl text-center"
                    style={{ background:T.card3, border:`1px solid ${T.border}` }}>
                    <div style={{ ...DISPLAY, fontSize:18, color:s.color, lineHeight:1 }}>{s.value}</div>
                    <div style={{ color:T.muted, fontSize:10, marginTop:4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Latency chart — last 20 checks */}
              <div style={{ marginBottom:20 }}>
                <SLabel>Latency History — Last 20 Checks</SLabel>
                {selectedEp.history.length > 1 ? (
                  <>
                    <div style={{ height:80, position:"relative" }}>
                      {/* threshold lines */}
                      <div style={{ position:"absolute", left:0, right:0,
                        top:`${Math.max(0,(1 - selectedEp.thresholdWarnMs / Math.max(...selectedEp.history.map(h=>h.latencyMs),1))*80)}px`,
                        borderTop:`1px dashed ${T.amber}`, opacity:0.5 }}/>
                      <div className="flex items-end gap-0.5" style={{ height:80 }}>
                        {selectedEp.history.map((h, i) => {
                          const maxMs = Math.max(...selectedEp.history.map(x=>x.latencyMs),1);
                          const barH  = Math.max((h.latencyMs/maxMs)*76, 2);
                          const bc    = checkStatusColor(h.status);
                          return (
                            <div key={i} title={`${h.ts} · ${h.latencyMs}ms · HTTP ${h.httpStatus}`}
                              style={{ flex:1, height:80, display:"flex", alignItems:"flex-end" }}>
                              <div style={{ width:"100%", height:barH, background:bc,
                                borderRadius:"2px 2px 0 0", opacity: i===selectedEp.history.length-1?1:0.65 }}/>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ color:T.muted, fontSize:9, ...MONO }}>
                        {selectedEp.history[0]?.ts}
                      </span>
                      <span style={{ color:T.muted, fontSize:9, ...MONO }}>
                        {selectedEp.history[selectedEp.history.length-1]?.ts}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span style={{ color:T.muted, fontSize:10 }}>
                        Min: <strong style={{ color:T.green }}>{Math.min(...selectedEp.history.map(h=>h.latencyMs))}ms</strong>
                      </span>
                      <span style={{ color:T.muted, fontSize:10 }}>
                        Max: <strong style={{ color:T.red }}>{Math.max(...selectedEp.history.map(h=>h.latencyMs))}ms</strong>
                      </span>
                      <span style={{ color:T.muted, fontSize:10 }}>
                        Avg: <strong style={{ color:T.primary }}>{Math.round(selectedEp.history.reduce((s,h)=>s+h.latencyMs,0)/selectedEp.history.length)}ms</strong>
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ color:T.muted, fontSize:12, padding:"16px 0" }}>No history yet — run a check first</div>
                )}
              </div>

              {/* Check log */}
              <div>
                <SLabel>Recent Check Log</SLabel>
                <div className="space-y-1.5" style={{ maxHeight:200, overflowY:"auto" }}>
                  {[...selectedEp.history].reverse().slice(0,12).map((h, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                      style={{ background:h.status==="up"?T.card3:checkStatusBg(h.status),
                        border:`1px solid ${h.status==="up"?T.border:checkStatusBd(h.status)}` }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
                        background:checkStatusColor(h.status),
                        boxShadow:`0 0 5px ${checkStatusColor(h.status)}` }}/>
                      <span style={{ color:T.muted, fontSize:10, ...MONO, flexShrink:0, width:64 }}>{h.ts}</span>
                      <span className="flex-1" style={{ color:checkStatusColor(h.status), fontSize:11, fontWeight:600, ...MONO }}>
                        {h.status.toUpperCase()}
                      </span>
                      <span style={{ color:T.text, fontSize:11, ...MONO }}>{h.latencyMs}ms</span>
                      <span style={{ color:httpColor(h.httpStatus), fontSize:10, fontWeight:700, ...MONO }}>
                        {h.httpStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configure thresholds */}
              <div className="mt-5 pt-4 border-t" style={{ borderColor:T.border }}>
                <SLabel>Alert Thresholds</SLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={{ color:T.muted, fontSize:9, ...MONO, display:"block", marginBottom:4 }}>
                      WARN WHEN LATENCY &gt; (ms)
                    </label>
                    <input type="number" defaultValue={selectedEp.thresholdWarnMs}
                      onChange={e => setEndpoints(prev=>prev.map(ep=>
                        ep.id===selectedEp.id?{...ep,thresholdWarnMs:parseInt(e.target.value)||200}:ep))}
                      style={{...INPUT,padding:"7px 10px"}}/>
                  </div>
                  <div>
                    <label style={{ color:T.muted, fontSize:9, ...MONO, display:"block", marginBottom:4 }}>
                      DOWN WHEN LATENCY &gt; (ms)
                    </label>
                    <input type="number" defaultValue={selectedEp.thresholdDownMs}
                      onChange={e => setEndpoints(prev=>prev.map(ep=>
                        ep.id===selectedEp.id?{...ep,thresholdDownMs:parseInt(e.target.value)||1000}:ep))}
                      style={{...INPUT,padding:"7px 10px"}}/>
                  </div>
                </div>
                <button onClick={() => toast.success("Thresholds saved")}
                  className="mt-3 px-5 py-2 rounded-xl text-xs font-bold"
                  style={{ background:T.primBg, color:T.primary, border:`1px solid ${T.primBd}` }}>
                  Save Thresholds
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Rate Limits ─────────────────────────────────────────── */}
      <div style={CARD}>
        <SLabel>Rate Limits — Per Plan</SLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { tier:"Starter",        rps:10,   burst:50,    daily:1000,   color:"#5A6A88" },
            { tier:"Foundation",     rps:30,   burst:150,   daily:5000,   color:"#4A90D9" },
            { tier:"Legacy Archive", rps:100,  burst:500,   daily:20000,  color:"#3A5BD9" },
            { tier:"Legacy Pro",     rps:300,  burst:1500,  daily:100000, color:"#6E8BFF" },
            { tier:"Legacy Vault",   rps:1000, burst:5000,  daily:500000, color:"#48BB78" },
            { tier:"Admin / API Key",rps:5000, burst:10000, daily:999999, color:"#F6AD55" },
          ].map(r => (
            <div key={r.tier} className="px-4 py-3 rounded-xl"
              style={{ background:T.card3, border:`1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width:8, height:8, borderRadius:"50%", background:r.color, flexShrink:0 }}/>
                <span style={{ color:T.text, fontSize:12, fontWeight:600 }}>{r.tier}</span>
              </div>
              {[
                { label:"Req / sec", value:r.rps.toLocaleString(), color:r.color },
                { label:"Burst",     value:r.burst.toLocaleString(), color:T.text },
                { label:"Daily cap", value:r.daily===999999?"Unlimited":r.daily.toLocaleString(), color:T.text },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1 border-b"
                  style={{ borderColor:"rgba(58,91,217,0.06)" }}>
                  <span style={{ color:T.muted, fontSize:11 }}>{row.label}</span>
                  <span style={{ color:row.color, fontSize:11, fontWeight:700, ...MONO }}>{row.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-5 py-3 rounded-2xl"
        style={{ background:T.card3, border:`1px solid ${T.border}` }}>
        <span style={{ color:T.muted, fontSize:11 }}>Status key:</span>
        {([["up",T.green,"Response within normal thresholds"],
           ["slow",T.amber,"Response exceeded warn threshold"],
           ["degraded",T.amber,"Error rate elevated"],
           ["down",T.red,"Response timeout or server error"]] as const).map(([s,c,desc]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div style={{ width:7, height:7, borderRadius:"50%", background:c, boxShadow:`0 0 5px ${c}` }}/>
            <span style={{ color:T.sub, fontSize:11, fontWeight:600 }}>{s}</span>
            <span style={{ color:T.muted, fontSize:10 }}>— {desc}</span>
          </div>
        ))}
        <span style={{ color:T.muted, fontSize:10, marginLeft:"auto" }}>
          Click any row to inspect · Click refresh to run a manual check
        </span>
      </div>
    </div>
  );
}
