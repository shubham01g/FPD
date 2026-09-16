import React, { useState } from "react";
import { AdminRoles } from "./AdminRoles";
import { ReportsDownloads } from "./ReportsDownloads";
import { UserDetailModal } from "./UserDetailModal";
import { UserAvatar } from "./UserAvatar";
import { SystemHealth } from "./SystemHealth";
import { DisasterRecoveryAdmin } from "./DisasterRecoveryAdmin";
import { IDVerification } from "./IDVerification";
import { PayoutManagement } from "./PayoutManagement";
import { ContinuationFeeAdmin } from "./ContinuationFeeAdmin";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import {
  Users, DollarSign, HardDrive, TrendingUp, TrendingDown, Globe, Crown,
  Activity, Search, Filter, Eye, CheckCircle, Clock, Edit, Download,
  AlertTriangle, Bell, BarChart3, UserCheck, Shield, UserPlus, X,
  ToggleLeft, ToggleRight, Star, Send, Gift, Handshake, ShieldAlert, RefreshCw
} from "lucide-react";

// How often screens showing live user activity re-poll the backend.
const LIVE_POLL_MS = 15_000;

// Ticks its own 1s clock so it can show "updated Ns ago" without re-rendering
// the rest of MasterAdmin every second.
function LiveUpdatedBadge({ updatedAt, loading }: { updatedAt: number | null; loading: boolean }) {
  const [, setNow] = useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const secondsAgo = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;
  const label = loading ? "Refreshing…" : secondsAgo === null ? "" : secondsAgo < 1 ? "Updated just now" : `Updated ${secondsAgo}s ago`;
  return (
    <div className="flex items-center gap-1.5 px-2" title={`Auto-refreshes every ${LIVE_POLL_MS / 1000}s`}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6FAE8B", display: "inline-block" }} className={loading ? undefined : "animate-pulse"} />
      <span style={{ color: "#8A9AB8", fontSize: 12.5 }}>{label}</span>
    </div>
  );
}
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* Icon-chip tones — same values as the Dashboard/Calendar "at a glance" tiles, for a consistent look */
const CHIP_TONES: Record<string, { bg: string; fg: string }> = {
  accent:   { bg: "linear-gradient(150deg, rgba(91,110,225,0.32), rgba(91,110,225,0.09))",  fg: "#AEB9F5" },
  sky:      { bg: "linear-gradient(150deg, rgba(91,167,214,0.32), rgba(91,167,214,0.09))",  fg: "#9FD3EE" },
  mint:     { bg: "linear-gradient(150deg, rgba(111,174,139,0.32), rgba(111,174,139,0.09))", fg: "#A9DABC" },
  good:     { bg: "linear-gradient(150deg, rgba(95,190,145,0.30), rgba(95,190,145,0.09))",   fg: "#A9E6C4" },
  warn:     { bg: "linear-gradient(150deg, rgba(217,165,94,0.30), rgba(217,165,94,0.09))",   fg: "#F0C088" },
  critical: { bg: "linear-gradient(150deg, rgba(208,107,107,0.30), rgba(208,107,107,0.09))", fg: "#F0A9A9" },
};

/* Every tab in this file reads from the admin backend (services/adminApi).
 * Where the schema has no column to answer a question — demographics,
 * engagement, NPS, churn history — the chart renders an explicit "not
 * collected yet" state rather than a seeded stand-in. */

/* Row shape from GET /admin/verification — see routes/verification.ts */
interface PendingVerification {
  id: string;
  id_type: string;
  submitted_at: string;
  contacts: {
    full_name: string;
    owner: { full_name: string } | null;
  } | null;
}

/* Row shape from GET /admin/audit — written by the auditLog middleware. */
interface AuditLogRow {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  severity: "info" | "warning" | "critical" | null;
  created_at: string;
}

const PLAN_COLORS = ["#6E90C9", "#6FAE8B", "#D99A6B", "#F6AD55", "#7E6BD8"];

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/* Shown in place of a chart whose underlying data the platform does not
 * record anywhere. Says what is missing and what would populate it, so the
 * empty panel reads as a known gap rather than a loading failure. */
function NotCollected({ what, how }: { what:string; how:string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding:"28px 18px", minHeight:120 }}>
      <div style={{ width:34, height:34, borderRadius:"50%", border:"1px dashed rgba(138,154,184,0.45)", marginBottom:10 }}/>
      <div style={{ color:"#B8C8E0", fontSize:15, fontWeight:600 }}>{what} isn't collected yet</div>
      <div style={{ color:"#8A9AB8", fontSize:13.5, marginTop:4, maxWidth:340, lineHeight:1.5 }}>{how}</div>
    </div>
  );
}

type AdminTab = "overview"|"users"|"revenue"|"storage"|"verification"|"payouts"|"audit"|"continuation"|"analytics"|"notifications"|"admin_roles"|"reports"|"system_health"|"disaster_recovery";

/* ── Reusable chart sub-components ────────────────────────────────── */
function HorizBar({ label, pct, value, color, subtext }: { label:string; pct:number; value?:string|number; color:string; subtext?:string }) {
  const maxW = pct;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <span style={{ color:"#E8EDF5", fontSize:16 }}>{label}</span>
          {subtext && <span style={{ color:"#8A9AB8", fontSize:14, marginLeft:6 }}>{subtext}</span>}
        </div>
        <span style={{ color, fontSize:15, fontWeight:700, fontFamily:"var(--font-mono)" }}>
          {value !== undefined ? value : `${pct}%`}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width:`${Math.min(maxW,100)}%`, background:color }}/>
      </div>
    </div>
  );
}

function StatChip({ label, value, sub, color }: { label:string; value:string|number; sub?:string; color:string }) {
  return (
    <div className="p-4 rounded-2xl transition-all" style={GLASS}>
      <div style={{ fontFamily:"var(--font-display)", fontSize:27.5, fontWeight:700, color, lineHeight:1.15 }}>{value}</div>
      <div style={{ color:"#EFF2F9", fontSize:14.5, fontWeight:500, marginTop:5 }}>{label}</div>
      {sub && <div style={{ color:"#8A9AB8", fontSize:13, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ title, sub }: { title:string; sub?:string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:600, color:"#EFF2F9" }}>{title}</div>
      {sub && <div style={{ color:"#8A9AB8", fontSize:14.5 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, className = "" }: { children:React.ReactNode; className?:string }) {
  return (
    <div className={`p-5 ${className}`} style={GLASS}>
      {children}
    </div>
  );
}

function VertBar({ label, pct, color, topLabel }: { label:string; pct:number; color:string; topLabel?:string }) {
  const h = Math.round((pct / 100) * 120);
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      {topLabel && <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>{topLabel}</span>}
      <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
        <div style={{ width:"100%", height:h, background:color, borderRadius:"4px 4px 0 0" }}/>
      </div>
      <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)", textAlign:"center", lineHeight:1.2 }}>{label}</span>
    </div>
  );
}

const PLANS = [
  { id:"starter",    name:"Starter",    price:1.99,  storage:"1 GB",   color:"#8A9AB8" },
  { id:"foundation",  name:"Foundation",  price:9.99,  storage:"50 GB",   color:"#6FAE8B" },
  { id:"family_archive",    name:"Legacy Archive",    price:24.99, storage:"250 GB",  color:"#6E90C9" },
  { id:"legacy_pro", name:"Legacy Pro", price:49.99, storage:"1 TB", color:"#6FAE8B" },
  { id:"legacy_vault", name:"Legacy Vault", price:129.99, storage:"5 TB", color:"#D99A6B" },
];

const WAIVE_REASONS = [
  { id:"white_glove",  label:"White Glove Service client" },
  { id:"partner",      label:"Strategic partner / referral" },
  { id:"charity",      label:"Nonprofit / charitable org" },
  { id:"press",        label:"Press / media / influencer" },
  { id:"beta",         label:"Beta tester / early adopter" },
  { id:"internal",     label:"Internal / employee account" },
  { id:"hardship",     label:"Financial hardship waiver" },
  { id:"other",        label:"Other (see notes)" },
];

interface OnboardedUser {
  id: string; name: string; email: string; phone: string;
  plan: string; subscriptionWaived: boolean; waiveReason: string;
  whiteGlove: boolean; sendWelcome: boolean; notes: string;
  onboardedAt: string; onboardedBy: string; status: string;
}

/* Accounts onboarded by hand during this console session. There is no
   "manually onboarded" flag on the users table, so this cannot be reloaded
   from the backend and starts empty on every visit. */
let _onboardedUsers: OnboardedUser[] = [];

function OnboardUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: OnboardedUser) => void }) {
  const { authUser } = useAuth();
  const [step, setStep] = useState<"info"|"plan"|"review">("info");
  const [form, setForm] = useState({
    name:"", email:"", phone:"", plan:"foundation",
    subscriptionWaived:false, waiveReason:"white_glove",
    whiteGlove:false, sendWelcome:true, notes:"",
  });
  const [saving, setSaving] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === form.plan)!;

  function submit() {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    setTimeout(() => {
      const newUser: OnboardedUser = {
        ...form,
        id: `MAN-${String(Date.now()).slice(-3)}`,
        onboardedAt: new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
        onboardedBy: authUser?.email ?? "unknown admin",
        status: "active",
      };
      _onboardedUsers = [newUser, ..._onboardedUsers];
      onCreated(newUser);
      setSaving(false);
      toast.success(`${form.name} onboarded${form.subscriptionWaived ? " · Subscription waived" : ""}${form.whiteGlove ? " · White Glove assigned" : ""}`);
      onClose();
    }, 900);
  }

  const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
  const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };
  const MONO_S: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ background:"#0A0F1A", borderColor:"rgba(91,110,225,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2" style={{ background:"rgba(91,110,225,0.08)" }}>
              <UserPlus size={16} color="#FFFFFF"/>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Manually Onboard User</div>
              <div style={{ color:"#8A9AB8", fontSize:14, ...MONO_S }}>
                {step === "info" ? "1 · Contact Information" : step === "plan" ? "2 · Package & Billing" : "3 · Review & Create"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Step 1: Contact Info ── */}
          {step === "info" && (
            <>
              {[
                { label:"FULL NAME *",    key:"name",  ph:"e.g. Dorothy Henderson",    type:"text" },
                { label:"EMAIL ADDRESS *",key:"email", ph:"their-email@example.com",   type:"email" },
                { label:"PHONE NUMBER",   key:"phone", ph:"+1 (555) 000-0000",         type:"tel" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                    onChange={e => setForm(p => ({ ...p, [f.key]:e.target.value }))} style={INPUT}/>
                </div>
              ))}

              {/* White Glove toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <Star size={14} color="#FFFFFF"/>
                    <span style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>White Glove Service</span>
                  </div>
                  <div style={{ color:"#8A9AB8", fontSize:14, marginTop:2 }}>Assign a dedicated FPD concierge to assist this user</div>
                </div>
                <button onClick={() => setForm(p => ({ ...p, whiteGlove:!p.whiteGlove, subscriptionWaived: !p.whiteGlove || p.subscriptionWaived }))}
                  style={{ color:form.whiteGlove?"#6FAE8B":"#8A9AB8" }}>
                  {form.whiteGlove ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                </button>
              </div>

              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:5 }}>ADMIN NOTES (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes:e.target.value }))} rows={2}
                  placeholder="e.g. Client's daughter called on their behalf. Needs full setup assistance."
                  className="w-full resize-none" style={INPUT}/>
              </div>

              <button onClick={() => {
                if (!form.name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
                setStep("plan");
              }} className="w-full py-3 rounded-2xl font-bold text-sm"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                Continue to Package Selection →
              </button>
            </>
          )}

          {/* ── Step 2: Plan & Billing ── */}
          {step === "plan" && (
            <>
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:10 }}>SELECT SUBSCRIPTION PACKAGE</label>
                <div className="space-y-2">
                  {PLANS.map(plan => (
                    <button key={plan.id} onClick={() => setForm(p => ({ ...p, plan:plan.id }))}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                      style={{ background:form.plan===plan.id?`${plan.color}10`:"rgba(91,110,225,0.03)",
                        border:`1.5px solid ${form.plan===plan.id?plan.color:"rgba(91,110,225,0.12)"}` }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width:10, height:10, borderRadius:"50%", background:plan.color, flexShrink:0 }}/>
                        <div className="text-left">
                          <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>{plan.name}</div>
                          <div style={{ color:"#8A9AB8", fontSize:14 }}>{plan.storage} storage</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div style={{ color:plan.color, fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>
                          {form.subscriptionWaived ? <span style={{ textDecoration:"line-through", color:"#8A9AB8", fontSize:16 }}>${plan.price}/mo</span> : `$${plan.price}/mo`}
                        </div>
                        {form.plan===plan.id && <CheckCircle size={14} color={plan.color}/>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription waiver */}
              <div className="rounded-2xl overflow-hidden" style={{ border:`2px solid ${form.subscriptionWaived?"rgba(72,187,120,0.4)":"rgba(91,110,225,0.15)"}` }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ background:form.subscriptionWaived?"rgba(72,187,120,0.08)":"rgba(91,110,225,0.04)" }}>
                  <div className="flex items-center gap-2">
                    <Gift size={15} color={form.subscriptionWaived?"#48BB78":"#5B6EE1"}/>
                    <div>
                      <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>Waive Subscription Fee</div>
                      <div style={{ color:"#8A9AB8", fontSize:14 }}>User gets full access at $0/mo</div>
                    </div>
                  </div>
                  <button onClick={() => setForm(p => ({ ...p, subscriptionWaived:!p.subscriptionWaived }))}
                    style={{ color:form.subscriptionWaived?"#D99A6B":"#8A9AB8" }}>
                    {form.subscriptionWaived ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                  </button>
                </div>
                {form.subscriptionWaived && (
                  <div className="px-4 py-3 border-t" style={{ borderColor:"rgba(72,187,120,0.2)" }}>
                    <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:6 }}>WAIVER REASON</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WAIVE_REASONS.map(r => (
                        <button key={r.id} onClick={() => setForm(p => ({ ...p, waiveReason:r.id }))}
                          className="px-3 py-2 rounded-xl text-xs text-left transition-all"
                          style={{ background:form.waiveReason===r.id?"rgba(72,187,120,0.1)":"rgba(91,110,225,0.04)",
                            border:`1px solid ${form.waiveReason===r.id?"#48BB78":"rgba(91,110,225,0.1)"}`,
                            color:form.waiveReason===r.id?"#D99A6B":"#8A9AB8", fontWeight:form.waiveReason===r.id?600:400 }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Send welcome email toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
                <div className="flex items-center gap-2">
                  <Send size={13} color="#FFFFFF"/>
                  <span style={{ color:"#E8EDF5", fontSize:16 }}>Send welcome email to user</span>
                </div>
                <button onClick={() => setForm(p => ({ ...p, sendWelcome:!p.sendWelcome }))}
                  style={{ color:form.sendWelcome?"#6E90C9":"#8A9AB8" }}>
                  {form.sendWelcome ? <ToggleRight size={26}/> : <ToggleLeft size={26}/>}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("info")} className="px-5 py-3 rounded-2xl text-sm"
                  style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>← Back</button>
                <button onClick={() => setStep("review")} className="flex-1 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                  Review & Create Account →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Review ── */}
          {step === "review" && (
            <>
              <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.15)" }}>
                {[
                  { label:"Name",    value:form.name },
                  { label:"Email",   value:form.email },
                  { label:"Phone",   value:form.phone || "—" },
                  { label:"Package", value:`${selectedPlan.name} · ${selectedPlan.storage}` },
                  { label:"Monthly", value:form.subscriptionWaived ? "$0.00 (WAIVED)" : `$${selectedPlan.price}/mo` },
                  { label:"Waiver",  value:form.subscriptionWaived ? (WAIVE_REASONS.find(r=>r.id===form.waiveReason)?.label ?? "—") : "None" },
                  { label:"White Glove", value:form.whiteGlove ? "✓ Assigned" : "No" },
                  { label:"Welcome Email", value:form.sendWelcome ? "Will be sent" : "Skip" },
                ].map((row, i) => (
                  <div key={row.label} className="flex items-center px-4 py-3"
                    style={{ background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderBottom:"1px solid rgba(91,110,225,0.06)" }}>
                    <span style={{ color:"#8A9AB8", fontSize:14, width:120, flexShrink:0, ...MONO_S }}>{row.label.toUpperCase()}</span>
                    <span style={{ color:row.label==="Monthly"&&form.subscriptionWaived?"#D99A6B":row.label==="White Glove"&&form.whiteGlove?"#6FAE8B":"#E8EDF5", fontSize:16, fontWeight:500 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {form.notes && (
                <div className="px-4 py-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.1)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO_S, marginBottom:4 }}>ADMIN NOTES</div>
                  <div style={{ color:"#8A9AB8", fontSize:15 }}>{form.notes}</div>
                </div>
              )}

              {form.subscriptionWaived && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-2xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
                  <Gift size={13} color="#FFFFFF" style={{ marginTop:1 }}/>
                  <p style={{ color:"#D99A6B", fontSize:15 }}>
                    <strong>Subscription waived.</strong> This account will be created with full {selectedPlan.name} access at $0/mo. The waiver and reason are logged in the audit trail.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("plan")} className="px-5 py-3 rounded-2xl text-sm"
                  style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>← Back</button>
                <button onClick={submit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", opacity:saving?0.7:1 }}>
                  <UserPlus size={15}/>{saving ? "Creating Account…" : "Create Account"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TopMetric {
  label: string; value: string; color: string; tone: string;
  icon: React.ReactNode; change?: number; lowerBetter?: boolean; note?: string;
}

/* KPI row. `change` is only set where the trend endpoint actually returns a
 * previous month to compare against — a metric with no prior period shows its
 * current value and no delta rather than an invented percentage. */
function buildTopMetrics(
  overview: { totalUsers: number; mrr: number } | null,
  trend: { month: string; mrr: number; overage: number; affiliates: number }[],
  avgStorageGb: number | null,
): TopMetric[] {
  const cur = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const pctChange = (now: number, before: number): number | undefined =>
    prev && before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : undefined;

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const monthLabel = cur ? new Date(`${cur.month}-01T00:00:00`).toLocaleDateString("en-US", { month:"short" }) : "";

  return [
    { label:"Total Users", value: overview ? overview.totalUsers.toLocaleString() : "—",
      color:"#6E90C9", tone:"accent", icon:<Users size={16}/>,
      note:"No signup history — growth % not available" },
    { label:"Monthly Recurring Revenue", value: overview ? money(overview.mrr) : "—",
      color:"#D99A6B", tone:"warn", icon:<DollarSign size={16}/>,
      note:"From active subscriptions" },
    { label: cur ? `Overage Revenue (${monthLabel})` : "Overage Revenue", value: cur ? money(cur.overage) : "—",
      change: cur && prev ? pctChange(cur.overage, prev.overage) : undefined,
      color:"#6FAE8B", tone:"good", icon:<TrendingUp size={16}/> },
    { label: cur ? `Affiliate Payouts (${monthLabel})` : "Affiliate Payouts", value: cur ? money(cur.affiliates) : "—",
      change: cur && prev ? pctChange(cur.affiliates, prev.affiliates) : undefined,
      color:"#F6AD55", tone:"mint", icon:<Handshake size={16}/> },
    { label:"Avg Storage/User", value: avgStorageGb != null ? `${avgStorageGb} GB` : "—",
      color:"#6E90C9", tone:"sky", icon:<HardDrive size={16}/>,
      note:"Current billing period" },
    { label:"Churn Rate", value:"—", color:"#FC8181", lowerBetter:true, tone:"critical", icon:<TrendingDown size={16}/>,
      note:"Not tracked — plan_status has no history" },
  ];
}

/* ─────────────────────────────────────────────────────────────────
   PUSH NOTIFICATION CENTER
   ───────────────────────────────────────────────────────────────── */

type NotifType = "marketing" | "feature" | "update" | "alert" | "reminder";
type NotifTarget = "all" | "starter" | "foundation" | "family_archive" | "legacy_pro" | "legacy_vault" | "white_glove";

interface SentNotification {
  id: string; title: string; body: string; type: NotifType; target: NotifTarget;
  sentAt: string; sentBy: string; delivered: number; opened: number; openRate: number;
  scheduled: boolean; scheduledFor?: string;
}

const NOTIF_TYPE_COLORS: Record<NotifType, string> = {
  marketing:"#F7931A", feature:"#5B6EE1", update:"#5BA7D6",
  alert:"#FC8181", reminder:"#48BB78",
};

/* Keys must match NotifTarget — the previous map was keyed on plan names that
   no longer exist ("essential"/"premium"/"enterprise"), so three segments
   silently rendered as undefined. */
const TARGET_LABELS: Record<NotifTarget, string> = {
  all:"All Users", starter:"Starter", foundation:"Foundation",
  family_archive:"Legacy Archive", legacy_pro:"Legacy Pro",
  legacy_vault:"Legacy Vault", white_glove:"White Glove Clients",
};

/* Audience size per segment, counted from the live plan mix. White Glove has
   no plan id of its own, so it has no count to report. */
function targetCounts(usersByPlan: Record<string, number>, totalUsers: number): Record<NotifTarget, number | null> {
  return {
    all: totalUsers,
    starter: usersByPlan["starter"] ?? 0,
    foundation: usersByPlan["foundation"] ?? 0,
    family_archive: usersByPlan["family_archive"] ?? 0,
    legacy_pro: usersByPlan["legacy_pro"] ?? 0,
    legacy_vault: usersByPlan["legacy_vault"] ?? 0,
    white_glove: null,
  };
}

function PushNotificationCenter({ usersByPlan, totalUsers }: { usersByPlan: Record<string, number>; totalUsers: number }) {
  const { authUser } = useAuth();
  /* No table stores sent notifications, so history covers this session only.
     Delivery and open rates are not reported back by any provider yet. */
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [view, setView] = useState<"compose"|"history">("compose");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotifType>("marketing");
  const [target, setTarget] = useState<NotifTarget>("all");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [channel, setChannel] = useState<"push"|"email"|"both">("push");

  const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.16)", borderRadius:20 };
  const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };
  const MONO_S: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  const counts = targetCounts(usersByPlan, totalUsers);
  const recipientCount = counts[target];
  const recipientLabel = recipientCount === null ? "an untracked number of" : recipientCount.toLocaleString();

  function send() {
    if (!title.trim()) { toast.error("Notification title is required"); return; }
    if (!body.trim()) { toast.error("Message body is required"); return; }
    setSending(true);
    setTimeout(() => {
      const newNotif: SentNotification = {
        id: `NTF-${String(Date.now()).slice(-3)}`,
        title, body, type, target,
        sentAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        sentBy: authUser?.email ?? "unknown admin",
        delivered: recipientCount ?? 0,
        opened: 0, openRate: 0,
        scheduled: scheduleMode, scheduledFor: scheduleMode ? scheduleDate : undefined,
      };
      setHistory(prev => [newNotif, ...prev]);
      setSending(false);
      toast.success(`🔔 Push notification ${scheduleMode ? "scheduled" : "sent"} to ${recipientLabel} users!`);
      setTitle(""); setBody(""); setType("marketing"); setTarget("all"); setScheduleMode(false); setScheduleDate("");
      setView("history");
    }, 1200);
  }

  const totalDelivered = history.reduce((s,n) => s+n.delivered, 0);
  // Open tracking needs a delivery provider webhook; nothing reports it back today.

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Sent This Session",     value:history.length,                  color:"#6E90C9" },
          { label:"Total Delivered",       value:totalDelivered.toLocaleString(), color:"#D99A6B" },
          { label:"Avg Open Rate",         value:"—",                             color:"#6FAE8B" },
          { label:"Scheduled / Pending",   value:history.filter(n=>n.scheduled).length, color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0F1624", border:"1px solid rgba(91,110,225,0.18)" }}>
        {[["compose","✏️ Compose"],["history","📋 Sent History"]].map(([id,label]) => (
          <button key={id} onClick={() => setView(id as any)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background:view===id?"linear-gradient(180deg,#7E6BD8,#5B6EE1)":"transparent", color:view===id?"#fff":"#8A9AB8" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Compose ── */}
      {view === "compose" && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Form */}
          <div className="p-6 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Compose Push Notification</div>

            {/* Type */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:7 }}>NOTIFICATION TYPE</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(NOTIF_TYPE_COLORS) as [NotifType,string][]).map(([id, color]) => (
                  <button key={id} onClick={() => setType(id)}
                    className="px-3 py-1.5 rounded-2xl text-xs font-bold capitalize transition-all"
                    style={{ background:type===id?`${color}15`:"rgba(91,110,225,0.04)",
                      border:`1px solid ${type===id?color:"rgba(91,110,225,0.12)"}`,
                      color:type===id?color:"#8A9AB8" }}>
                    {id}
                  </button>
                ))}
              </div>
            </div>

            {/* Target audience */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:7 }}>TARGET AUDIENCE</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TARGET_LABELS) as [NotifTarget,string][]).map(([id, label]) => (
                  <button key={id} onClick={() => setTarget(id)}
                    className="px-3 py-1.5 rounded-2xl text-xs font-bold transition-all"
                    style={{ background:target===id?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.04)",
                      border:`1px solid ${target===id?"#5B6EE1":"rgba(91,110,225,0.12)"}`,
                      color:target===id?"#6E90C9":"#8A9AB8" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ color:"#D99A6B", fontSize:14, marginTop:6 }}>
                📣 Will reach <strong>{recipientLabel}</strong> users
              </div>
            </div>

            {/* Delivery channel */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:7 }}>DELIVERY CHANNEL</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { id:"push",  label:"Push Only",  icon:"🔔", desc:"In-app + device notification" },
                  { id:"email", label:"Email Only",  icon:"✉️", desc:"Email to all users in segment" },
                  { id:"both",  label:"Push & Email",icon:"📡", desc:"Both channels simultaneously" },
                ] as const).map(ch => (
                  <button key={ch.id} onClick={() => setChannel(ch.id)}
                    className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl text-center transition-all"
                    style={{ background:channel===ch.id?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.03)", border:`1px solid ${channel===ch.id?"#5B6EE1":"rgba(91,110,225,0.12)"}` }}>
                    <span style={{ fontSize:22.5 }}>{ch.icon}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:channel===ch.id?"#6E90C9":"#8A9AB8" }}>{ch.label}</span>
                    <span style={{ fontSize:11, color:"#8A9AB8", lineHeight:1.3 }}>{ch.desc}</span>
                  </button>
                ))}
              </div>
              {channel === "both" && (
                <div className="mt-2 px-3 py-2 rounded-2xl text-xs flex items-center gap-1.5"
                  style={{ background:"rgba(91,110,225,0.04)", color:"#8A9AB8" }}>
                  <Bell size={10} color="#FFFFFF"/>
                  Push & Email will be sent simultaneously. Email recipients must have email notifications enabled.
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:5 }}>
                NOTIFICATION TITLE * <span style={{ color:"#8A9AB8" }}>({title.length}/65 chars)</span>
              </label>
              <input value={title} onChange={e => setTitle(e.target.value.slice(0,65))}
                placeholder="e.g. 🎉 New Feature: Document Scanner" style={INPUT}/>
            </div>

            {/* Body */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:5 }}>
                MESSAGE * <span style={{ color:"#8A9AB8" }}>({body.length}/240 chars)</span>
              </label>
              <textarea value={body} onChange={e => setBody(e.target.value.slice(0,240))} rows={4}
                placeholder="Write your message here. Keep it concise — push notifications are most effective at 100 characters or less."
                className="w-full resize-none" style={INPUT}/>
            </div>

            {/* Schedule toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl"
              style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>Schedule for later</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>Send at a specific date and time</div>
              </div>
              <button onClick={() => setScheduleMode(!scheduleMode)}
                style={{ color:scheduleMode?"#6E90C9":"#8A9AB8" }}>
                {scheduleMode ? <ToggleRight size={26}/> : <ToggleLeft size={26}/>}
              </button>
            </div>
            {scheduleMode && (
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:5 }}>SCHEDULE DATE & TIME</label>
                <input type="datetime-local" value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)} style={INPUT}/>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPreview(!preview)}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold"
                style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                {preview ? "Hide Preview" : "Preview"}
              </button>
              <button onClick={send} disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA",
                  boxShadow:"0 0 20px rgba(91,110,225,0.3)", opacity:sending?0.7:1 }}>
                <Bell size={15}/>
                {sending ? "Sending…" : scheduleMode
                  ? `Schedule ${channel==="both"?"Push + Email":channel==="email"?"Email":"Push"} to ${recipientLabel} Users`
                  : `Send ${channel==="both"?"Push + Email":channel==="email"?"Email Only":"Push Only"} → ${recipientLabel} Users`}
              </button>
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl" style={CARD}>
              <div style={{ color:"#8A9AB8", fontSize:15, fontFamily:"var(--font-mono)", marginBottom:12 }}>LIVE PREVIEW</div>

              {/* Mobile push notification mockup */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background:"#1A1A2E", border:"1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12.5, fontFamily:"var(--font-mono)" }}>LOCK SCREEN NOTIFICATION</div>
                <div className="flex items-start gap-3 p-3 rounded-2xl"
                  style={{ background:"rgba(255,255,255,0.08)", backdropFilter:"blur(10px)" }}>
                  <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                    style={{ width:36, height:36, background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)" }}>
                    <Bell size={18} color="#fff"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600, marginBottom:2 }}>
                      {title || "Notification Title"}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.6)", fontSize:15, lineHeight:1.5 }} className="line-clamp-2">
                      {body || "Your notification message will appear here…"}
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12.5, marginTop:4 }}>
                      Final Pass Down · now
                    </div>
                  </div>
                </div>
              </div>

              {/* In-app notification preview */}
              <div className="mt-4 rounded-2xl p-4 space-y-3" style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(91,110,225,0.25)" }}>
                <div style={{ color:"#8A9AB8", fontSize:12.5, fontFamily:"var(--font-mono)" }}>IN-APP NOTIFICATION</div>
                <div className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                  style={{ background:"#fff", border:"1px solid rgba(91,110,225,0.1)" }}>
                  <div className="rounded-full flex-shrink-0"
                    style={{ width:8, height:8, marginTop:5, background:NOTIF_TYPE_COLORS[type], boxShadow:`0 0 8px ${NOTIF_TYPE_COLORS[type]}` }}/>
                  <div>
                    <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>{title || "Notification Title"}</div>
                    <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{body || "Message preview…"}</div>
                    <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:4 }}>just now</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.12)" }}>
              <div style={{ color:"#6E90C9", fontSize:14, fontFamily:"var(--font-mono)", fontWeight:700, marginBottom:8 }}>BEST PRACTICES</div>
              <ul className="space-y-1.5">
                {[
                  "Keep titles under 50 characters for full display on all devices",
                  "Include an emoji at the start of the title to increase open rates by ~20%",
                  "Messages under 100 chars get 35% higher engagement",
                  "Best send times: 9–11 AM and 6–8 PM in user's timezone",
                  "Tuesday and Thursday have the highest open rates",
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2">
                    <div style={{ width:4, height:4, borderRadius:"50%", background:"#5B6EE1", marginTop:6, flexShrink:0 }}/>
                    <span style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.6 }}>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {view === "history" && (
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="p-8 rounded-2xl text-center" style={CARD}>
              <div style={{ color:"#B8C8E0", fontSize:15.5, fontWeight:600 }}>No notifications sent yet</div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:6, lineHeight:1.6 }}>
                Sent notifications are not written to a table, so this list only covers the
                current session and resets when the console is reloaded.
              </div>
            </div>
          )}
          {history.map(n => (
            <div key={n.id} className="p-5 rounded-2xl" style={CARD}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-2xl flex-shrink-0"
                    style={{ width:40, height:40, background:`${NOTIF_TYPE_COLORS[n.type]}15`, color:NOTIF_TYPE_COLORS[n.type] }}>
                    <Bell size={18}/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5" }}>{n.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
                        style={{ background:`${NOTIF_TYPE_COLORS[n.type]}15`, color:NOTIF_TYPE_COLORS[n.type], fontFamily:"var(--font-mono)" }}>
                        {n.type}
                      </span>
                      {n.scheduled && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background:"rgba(246,173,85,0.12)", color:"#F6AD55", fontFamily:"var(--font-mono)" }}>
                          SCHEDULED
                        </span>
                      )}
                    </div>
                    <div style={{ color:"#8A9AB8", fontSize:15, marginTop:3, lineHeight:1.5 }}>{n.body}</div>
                    <div style={{ color:"#8A9AB8", fontSize:14, marginTop:4 }}>
                      Sent: {n.sentAt} · Target: {TARGET_LABELS[n.target]}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>DELIVERED</div>
                  <div style={{ color:"#6E90C9", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>{n.delivered.toLocaleString()}</div>
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>OPENED</div>
                  <div style={{ color:"#8A9AB8", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>—</div>
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>OPEN RATE</div>
                  <div style={{ color:"#8A9AB8", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>—</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* DB row shape returned by GET /admin/users (list) — see routes/users.ts */
interface DBUserRow {
  id: string; email: string; full_name: string; phone: string | null; avatar_url: string | null;
  plan: string; plan_status: "active" | "paused" | "cancelled" | "past_due";
  is_admin: boolean; email_verified: boolean; created_at: string;
  contact_count: number; used_bytes: number;
}

export function MasterAdmin() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [manualUsers, setManualUsers] = useState<OnboardedUser[]>(_onboardedUsers);

  const { data: usersData, loading: usersLoading, error: usersError, updatedAt: usersUpdatedAt, refetch: refetchUsers } = useAdminFetch(
    () => adminApi.get<{ users: DBUserRow[]; total: number }>(`/users?search=${encodeURIComponent(userSearch)}&pageSize=50`),
    [userSearch],
    LIVE_POLL_MS,
  );
  const filteredUsers = usersData?.users ?? [];

  const { data: revenueTrendData } = useAdminFetch(
    () => adminApi.get<{ trend: { month: string; mrr: number; overage: number; affiliates: number }[] }>("/analytics/revenue-trend"),
    [],
  );
  const { data: overviewData } = useAdminFetch(
    () => adminApi.get<{ totalUsers: number; usersByPlan: Record<string, number>; mrr: number; totalRevenue: number; revenueByType: Record<string, number> }>("/analytics/overview"),
    [],
    LIVE_POLL_MS,
  );
  const { data: verificationData } = useAdminFetch(
    () => adminApi.get<{ verifications: PendingVerification[] }>("/verification?status=pending"),
    [],
    LIVE_POLL_MS,
  );
  const { data: auditData, loading: auditLoading, error: auditError } = useAdminFetch(
    () => adminApi.get<{ logs: AuditLogRow[]; total: number }>("/audit?pageSize=100"),
    [],
    LIVE_POLL_MS,
  );
  const { data: storageData } = useAdminFetch(
    () => adminApi.get<{ perPlan: { plan: string; planName: string; avgUsedGb: number; limitGb: number }[]; totals: { totalStorageGb: number; totalOverageGb: number; avgPerUserGb: number; overageRatePerGb: number | null } }>("/analytics/storage"),
    [],
  );

  const pendingVerifCount = verificationData?.verifications.length ?? 0;

  const topMetrics = buildTopMetrics(
    overviewData,
    revenueTrendData?.trend ?? [],
    storageData?.totals.avgPerUserGb ?? null,
  );

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id:"overview",     label:"Overview",        icon:<BarChart3 size={13}/> },
    { id:"analytics",    label:"Analytics",       icon:<Globe size={13}/>, badge:"New" },
    { id:"users",        label:"Users",           icon:<Users size={13}/> },
    { id:"revenue",      label:"Revenue",         icon:<DollarSign size={13}/> },
    { id:"storage",      label:"Storage",         icon:<HardDrive size={13}/> },
    { id:"verification", label:"ID Verification", icon:<UserCheck size={13}/>, badge: pendingVerifCount > 0 ? String(pendingVerifCount) : undefined },
    { id:"payouts",      label:"Payouts",         icon:<TrendingUp size={13}/> },
    { id:"continuation", label:"$199 Fee",        icon:<DollarSign size={13}/> },
    { id:"audit",        label:"Audit Log",       icon:<Shield size={13}/> },
    { id:"system_health",label:"System Health",   icon:<Activity size={13}/>, badge:"Live" },
    { id:"disaster_recovery", label:"Disaster Recovery", icon:<ShieldAlert size={13}/>, badge:"DR" },
    { id:"notifications",label:"Push Notifications",icon:<Bell size={13}/>, badge:"NEW" },
    { id:"admin_roles",  label:"Admin Team",          icon:<Shield size={13}/>,   badge:"New" },
    { id:"reports",      label:"Reports & Downloads", icon:<Download size={13}/> },
  ];

  return (
    <div className="p-7 space-y-6 relative" style={{ maxWidth:1360, margin:"0 auto" }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full" style={{ background:"rgba(91,110,225,0.12)", border:"1px solid rgba(91,110,225,0.3)" }}>
            <Crown size={13} color="#FFFFFF" />
            <span style={{ color:"#AEB9F5", fontSize:13, fontWeight:700, letterSpacing:"0.1em", ...MONO }}>MASTER ADMIN · FINAL PASS DOWN</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:30, fontWeight:600, color:"#EFF2F9", letterSpacing:"-0.02em" }}>Platform Command Center</h1>
          <p style={{ color:"#8A9AB8", fontSize:15.5, marginTop:5 }}>Real-time metrics · User management · Revenue · Compliance · Audit trail</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowOnboard(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-transform"
            style={{ background:"linear-gradient(180deg,#7E6BD8,#5B6EE1)", color:"#fff", boxShadow:"0 8px 20px -8px rgba(91,110,225,0.7)" }}>
            <UserPlus size={14}/> Onboard User
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background:"rgba(95,190,145,0.08)", border:"1px solid rgba(95,190,145,0.22)" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#5FBE91", boxShadow:"0 0 6px #5FBE91" }}/>
            <span style={{ color:"#D99A6B", fontSize:13.5, fontWeight:600, ...MONO }}>
              LIVE · {new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Manually onboarded users strip */}
      {manualUsers.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3.5 flex-wrap" style={GLASS}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <UserPlus size={14} color="#FFFFFF"/>
            <span style={{ color:"#B8C8E0", fontSize:15, fontWeight:600, whiteSpace:"nowrap" }}>Manually Onboarded</span>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {manualUsers.slice(0,4).map(u => (
              <span key={u.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                style={{ background:`rgba(91,110,225,0.1)`, color:"#AEB9F5", fontWeight:500 }}>
                {u.whiteGlove && <Star size={9} color="#FFFFFF"/>}
                {u.name}
                {u.subscriptionWaived && <Gift size={9} color="#FFFFFF"/>}
              </span>
            ))}
            {manualUsers.length > 4 && <span style={{ color:"#8A9AB8", fontSize:14.5 }}>+{manualUsers.length-4} more</span>}
          </div>
          <button onClick={() => setTab("users")} style={{ color:"#6FAE8B", fontSize:14, fontWeight:600, flexShrink:0 }}>View all →</button>
        </div>
      )}

      {/* Top metrics — same "at a glance" tile treatment as the Dashboard and Calendar KPI rows */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {topMetrics.map(m => {
          const chip = CHIP_TONES[m.tone] ?? CHIP_TONES.accent;
          const hasChange = m.change !== undefined;
          const good = m.lowerBetter ? (m.change ?? 0) < 0 : (m.change ?? 0) > 0;
          const dot = good ? "#5FBE91" : "#D06B6B";
          return (
            <div key={m.label} className="flex items-start gap-3.5 p-4"
              style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.045)", borderRadius:18 }}>
              <div className="flex items-center justify-center flex-shrink-0" style={{ width:36, height:36, borderRadius:13, background:chip.bg, color:chip.fg, boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:600, color:m.color, lineHeight:1.15 }}>{m.value}</div>
                <div style={{ fontSize:12.5, color:"#929CBC", marginTop:4, lineHeight:1.3 }}>{m.label}</div>
                {hasChange ? (
                  <div className="flex items-center gap-1.5" style={{ fontSize:12.5, color:"#BCC5DA", marginTop:4 }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:dot, flexShrink:0 }} />
                    {(m.change ?? 0) > 0 ? "+" : ""}{m.change}% vs last month
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:"#7C88A6", marginTop:4, lineHeight:1.3 }}>{m.note ?? ""}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab bar — wraps to as many rows as needed so every tab stays visible, no horizontal scrolling */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl" style={{ background:"#0F1624", border:"1px solid rgba(91,110,225,0.18)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background:tab===t.id?"linear-gradient(180deg,#7E6BD8,#5B6EE1)":"transparent", color:tab===t.id?"#fff":"#8A9AB8", fontWeight:tab===t.id?700:500, whiteSpace:"nowrap" }}>
            {t.icon} {t.label}
            {t.badge && (
              <span style={{ fontSize:10.5, fontWeight:700, padding:"1px 6px", borderRadius:99, background:tab===t.id?"rgba(255,255,255,0.22)":"rgba(91,110,225,0.2)", color:tab===t.id?"#fff":"#AEB9F5" }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          ANALYTICS TAB
          Only three things on this screen have a column behind them:
          headcount, plan mix and storage. Everything the original design
          charted — gender, age, geography, device, acquisition, engagement,
          retention, NPS, feature adoption, vault completion — has no field
          anywhere in the schema and nothing collecting it, so each panel
          states that plainly instead of rendering a seeded stand-in.
          ══════════════════════════════════════════════ */}
      {tab === "analytics" && (() => {
        const usersByPlan = overviewData?.usersByPlan ?? {};
        const planRows = PLANS
          .map((p, i) => ({ ...p, count: usersByPlan[p.id] ?? 0, chart: PLAN_COLORS[i % PLAN_COLORS.length] }))
          .filter(p => p.count > 0);
        const planTotal = planRows.reduce((sum, p) => sum + p.count, 0);
        const totals = storageData?.totals;
        return (
        <div className="space-y-6">

          <div className="px-4 py-3 rounded-2xl flex items-start gap-3" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <AlertTriangle size={15} color="#F6AD55" style={{ flexShrink:0, marginTop:2 }}/>
            <div style={{ color:"#D7C3A6", fontSize:14.5, lineHeight:1.6 }}>
              Demographic, engagement and satisfaction analytics are not available. The platform
              does not currently record age, gender, location, device, referral source, session
              activity or survey responses for any account. The panels below stay in place so the
              screen is ready the moment that collection is added.
            </div>
          </div>

          {/* ── What the schema can actually answer ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatChip label="Total Users" value={overviewData ? overviewData.totalUsers.toLocaleString() : "—"} sub="All accounts" color="#E8EDF5"/>
            <StatChip label="Paying Plans" value={planRows.length} sub="Plans with at least one account" color="#6E90C9"/>
            <StatChip label="Total Data Stored" value={totals ? `${totals.totalStorageGb.toLocaleString()} GB` : "—"} sub="Current billing period" color="#6FAE8B"/>
            <StatChip label="Avg per User" value={totals ? `${totals.avgPerUserGb} GB` : "—"} sub="Current billing period" color="#D99A6B"/>
          </div>

          <Card>
            <SectionHead title="Plan Mix" sub={planTotal ? `${planTotal.toLocaleString()} accounts on a plan` : undefined}/>
            {planRows.length === 0 ? (
              <div style={{ color:"#8A9AB8", fontSize:15, padding:"20px 0" }}>No accounts on a plan yet.</div>
            ) : (
              <>
                <div className="space-y-3 mt-2">
                  {planRows.map(p => (
                    <HorizBar key={p.id} label={p.name} pct={(p.count/planTotal)*100}
                      value={`${Math.round((p.count/planTotal)*1000)/10}% · ${p.count.toLocaleString()}`} color={p.chart}/>
                  ))}
                </div>
                <div className="flex gap-1 h-4 rounded-full overflow-hidden mt-4">
                  {planRows.map(p => (
                    <div key={p.id} style={{ flex:p.count, background:p.chart }} title={`${p.name} · ${p.count}`}/>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* ── Panels with no backing column ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Gender Distribution"/>
              <NotCollected what="Gender" how="No gender field exists on the users table and signup never asks for one."/>
            </Card>
            <Card>
              <SectionHead title="Relationship Status"/>
              <NotCollected what="Relationship status" how="Not captured at signup or anywhere in the profile screens."/>
            </Card>
          </div>

          <Card>
            <SectionHead title="Age Distribution"/>
            <NotCollected what="Date of birth" how="Accounts store no birthdate, so users cannot be grouped into age cohorts."/>
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Geography — States & Cities"/>
              <NotCollected what="Account location" how="No billing or mailing address is stored on the users table."/>
            </Card>
            <Card>
              <SectionHead title="Country Distribution"/>
              <NotCollected what="Country" how="Not derived from signup, billing, or request metadata today."/>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Device & Platform"/>
              <NotCollected what="Device and platform" how="Sessions are not instrumented, so no user-agent or PWA-install data is recorded."/>
            </Card>
            <Card>
              <SectionHead title="Acquisition Sources"/>
              <NotCollected what="Signup source" how="Referral and campaign attribution is not written at account creation."/>
            </Card>
          </div>

          <Card>
            <SectionHead title="Feature Adoption Rate"/>
            <NotCollected what="Feature usage" how="Nothing records which screens an account has used; per-feature row counts would need a dedicated aggregation job."/>
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Vault Completion Score"/>
              <NotCollected what="Vault completion" how="No completion score is computed or stored for an account."/>
            </Card>
            <Card>
              <SectionHead title="Monthly Engagement"/>
              <NotCollected what="DAU / MAU and session length" how="There is no session or event table, so active-user counts cannot be calculated."/>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Subscription Retention"/>
              <NotCollected what="Retention" how="plan_status holds only a current value with no change history to measure against."/>
            </Card>
            <Card>
              <SectionHead title="Net Promoter Score (NPS)"/>
              <NotCollected what="NPS" how="No survey has been sent and no responses table exists."/>
            </Card>
          </div>

        </div>
        );
      })()}

      {/* OVERVIEW */}
      {tab === "overview" && (() => {
        const trend = revenueTrendData?.trend ?? [];
        const usersByPlan = overviewData?.usersByPlan ?? {};
        const planRows = PLANS
          .map((p, i) => ({ name:p.name, value:usersByPlan[p.id] ?? 0, color:PLAN_COLORS[i % PLAN_COLORS.length] }))
          .filter(p => p.value > 0);
        const planTotal = planRows.reduce((sum, p) => sum + p.value, 0);
        const pending = verificationData?.verifications ?? [];
        return (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:8 }}>Revenue — 6 Months (MRR + Overage)</h3>
              <div className="flex items-center gap-4 mb-4">
                {[{color:"#6E90C9",label:"MRR"},{color:"#6FAE8B",label:"Overage"}].map(l=>(
                  <div key={l.label} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:2,background:l.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{l.label}</span></div>
                ))}
              </div>
              {trend.length === 0 ? (
                <div style={{ color:"#8A9AB8", fontSize:15, textAlign:"center", padding:"56px 0" }}>
                  No succeeded payments in the last 6 months.
                </div>
              ) : (
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:180 }}>
                {trend.map(d => {
                  const maxMrr = Math.max(1, ...trend.map(x=>x.mrr));
                  const mrrH = Math.round((d.mrr/maxMrr)*140);
                  const ovH = Math.round((d.overage/maxMrr)*140);
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <div style={{display:"flex",alignItems:"flex-end",gap:2,height:140,width:"100%"}}>
                        <div style={{flex:1,background:"#5B6EE1",borderRadius:"3px 3px 0 0",height:mrrH,opacity:0.85}}/>
                        <div style={{flex:1,background:"#5BA7D6",borderRadius:"3px 3px 0 0",height:ovH,opacity:0.85}}/>
                      </div>
                      <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{d.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:16 }}>Plan Distribution</h3>
              {planRows.length === 0 ? (
                <div style={{ color:"#8A9AB8", fontSize:15, textAlign:"center", padding:"32px 0" }}>No accounts on a plan yet.</div>
              ) : (
              <div className="space-y-3">
                {planRows.map(p => {
                  const pct = Math.round((p.value/planTotal)*100);
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2"><div style={{width:8,height:8,borderRadius:2,background:p.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{p.name}</span></div>
                        <span style={{color:"#E8EDF5",fontSize:15,...MONO}}>{p.value.toLocaleString()} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{background:"rgba(255,255,255,0.08)"}}>
                        <div className="h-2 rounded-full" style={{width:`${pct}%`,background:p.color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:8 }}>User Growth vs Churn</h3>
              {/* users.created_at would give signups, but nothing records WHEN an
                  account churned — plan_status has no history — so neither series
                  can be drawn honestly. */}
              <NotCollected
                what="Signup and churn history"
                how="The users table keeps only a current plan_status with no change history, so month-over-month growth and churn cannot be derived."
              />
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:16 }}>ID Verification Queue</h3>
              {pending.length > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-2xl" style={{background:"rgba(246,173,85,0.08)",border:"1px solid rgba(246,173,85,0.25)"}}>
                  <Clock size={13} color="#F6AD55"/>
                  <span style={{color:"#F6AD55",fontSize:16}}>{pending.length} contact{pending.length===1?"":"s"} awaiting ID review</span>
                </div>
              )}
              {pending.length === 0 ? (
                <div style={{ color:"#8A9AB8", fontSize:15, textAlign:"center", padding:"32px 0" }}>No IDs are waiting for review.</div>
              ) : (
              <div className="space-y-2">
                {pending.slice(0,5).map(v=>(
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-2xl" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.1)"}}>
                    <div>
                      <div style={{color:"#E8EDF5",fontSize:16}}>{v.contacts?.full_name ?? "Unknown contact"}</div>
                      <div style={{color:"#8A9AB8",fontSize:14}}>For: {v.contacts?.owner?.full_name ?? "—"} · {v.id_type} · {shortDate(v.submitted_at)}</div>
                    </div>
                    <button onClick={()=>setTab("verification")} className="px-3 py-1 rounded-xl text-xs" style={{background:"rgba(91,110,225,0.15)",color:"#AEB9F5",fontWeight:700}}>Review</button>
                  </div>
                ))}
                {pending.length > 5 && (
                  <button onClick={()=>setTab("verification")} style={{color:"#6FAE8B",fontSize:14,fontWeight:600}}>
                    View all {pending.length} →
                  </button>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* USER MANAGEMENT */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl flex-1" style={GLASS}>
              <Search size={13} color="#8A9AB8"/>
              <input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Search by name, email, or user ID..." style={{background:"transparent",border:"none",outline:"none",color:"#E8EDF5",fontSize:16,width:"100%"}}/>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={GLASS}>
              <Filter size={13} color="#8A9AB8"/><span style={{color:"#8A9AB8"}}>Filter</span>
            </button>
            <button onClick={refetchUsers} disabled={usersLoading} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={GLASS} title="Refresh now">
              <RefreshCw size={13} color="#8A9AB8" className={usersLoading ? "animate-spin" : undefined}/>
              <span style={{color:"#8A9AB8"}}>Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={{...GLASS}}>
              <Download size={13} color="#FFFFFF"/><span style={{color:"#6E90C9"}}>Export CSV</span>
            </button>
          </div>
          <LiveUpdatedBadge updatedAt={usersUpdatedAt} loading={usersLoading} />
          {usersError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <span style={{ color:"#FC8181", fontSize:16 }}>{usersError}</span>
            </div>
          )}
          <div className="rounded-2xl overflow-x-auto" style={{border:"1px solid rgba(91,110,225,0.14)"}}>
            <div className="grid px-5 py-3" style={{gridTemplateColumns:"auto auto 1fr auto auto auto auto auto",background:"rgba(10,10,15,0.9)",borderBottom:"1px solid rgba(91,110,225,0.1)",gap:12,alignItems:"center"}}>
              {["","ID","User","Plan","Storage","Contacts","Status","Actions"].map((h,hi)=>(
                <div key={hi} style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{h.toUpperCase()}</div>
              ))}
            </div>
            {usersLoading && (
              <div className="px-5 py-8 text-center" style={{color:"#8A9AB8"}}>Loading users…</div>
            )}
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="px-5 py-8 text-center" style={{color:"#8A9AB8"}}>No users match this search.</div>
            )}
            {filteredUsers.map((user,i)=>{
              const usedGb = Math.round((user.used_bytes / 1024 ** 3) * 10) / 10;
              const isActive = user.plan_status === "active";
              return (
              <div key={user.id} className="grid px-5 py-3 items-center border-b" style={{gridTemplateColumns:"auto auto 1fr auto auto auto auto auto",background:i%2===0?"transparent":"rgba(255,255,255,0.025)",borderColor:"rgba(91,110,225,0.06)",gap:12}}>
                <UserAvatar name={user.full_name} photoUrl={user.avatar_url ?? undefined}/>
                <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{user.id.slice(0,8)}</span>
                <div>
                  <div style={{color:"#E8EDF5",fontSize:16}}>{user.full_name}</div>
                  <div style={{color:"#8A9AB8",fontSize:14}}>{user.email}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs" style={{background:"rgba(91,110,225,0.1)",color:"#6E90C9",...MONO,fontSize:12.5}}>{user.plan}</span>
                <span style={{color:"#E8EDF5",fontSize:15,...MONO}}>{usedGb} GB</span>
                <span style={{color:"#E8EDF5",fontSize:15,...MONO}}>{user.contact_count}</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:isActive?"rgba(72,187,120,0.12)":"rgba(252,129,129,0.12)",color:isActive?"#D99A6B":"#FC8181",...MONO,fontSize:11}}>{user.plan_status.toUpperCase()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setSelectedUserId(user.id)} style={{color:"#6E90C9"}}><Eye size={13}/></button>
                  <button onClick={()=>setSelectedUserId(user.id)} style={{color:"#8A9AB8"}}><Edit size={13}/></button>
                </div>
              </div>
              );
            })}
          </div>
          <div style={{color:"#8A9AB8",fontSize:15,...MONO}}>Showing {filteredUsers.length} of {usersData?.total ?? 0} users</div>

          {/* User detail modal — Overview / Edit Account / Billing / Security */}
          {selectedUserId && (
            <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
          )}
        </div>
      )}

      {/* REVENUE */}
      {tab === "revenue" && (() => {
        const trend = revenueTrendData?.trend ?? [];
        const thisMonth = trend[trend.length - 1];
        const revenueByType = overviewData?.revenueByType ?? {};
        return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {label:"This Month MRR",value:`$${(overviewData?.mrr ?? 0).toLocaleString()}`,sub:"Active subscriptions",color:"#6E90C9"},
              {label:"This Month Overage",value:`$${(thisMonth?.overage ?? 0).toLocaleString()}`,sub:"Billed overage this month",color:"#6FAE8B"},
              {label:"Affiliate Paid",value:`$${(thisMonth?.affiliates ?? 0).toLocaleString()}`,sub:"This month's payouts",color:"#D99A6B"},
              {label:"Continuation Fees",value:`$${(revenueByType["continuation_fee"] ?? 0).toLocaleString()}`,sub:"$199 fees, last 1,000 payments",color:"#F6AD55"},
            ].map(s=>(
              <div key={s.label} className="p-5 rounded-2xl" style={GLASS}>
                <div style={{fontFamily:"var(--font-display)",fontSize:32.5,color:s.color}}>{s.value}</div>
                <div style={{color:"#E8EDF5",fontSize:16,marginTop:4}}>{s.label}</div>
                <div style={{color:"#8A9AB8",fontSize:14,marginTop:2,...MONO}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5",marginBottom:8}}>Revenue Breakdown — 6 Months</h3>
            <div className="flex items-center gap-4 mb-4">
              {[{color:"#6E90C9",label:"Subscriptions"},{color:"#6FAE8B",label:"Overage"},{color:"#D99A6B",label:"Affiliates"}].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:2,background:l.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{l.label}</span></div>
              ))}
            </div>
            {trend.length === 0 ? (
              <div style={{color:"#8A9AB8",fontSize:15,textAlign:"center",padding:"40px 0"}}>No succeeded payments or paid payouts in the last 6 months.</div>
            ) : (
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:200 }}>
              {trend.map(d => {
                const maxV = Math.max(1, ...trend.map(x=>x.mrr));
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:170,width:"100%"}}>
                      <div style={{flex:2,background:"#5B6EE1",borderRadius:"3px 3px 0 0",height:Math.round((d.mrr/maxV)*160),opacity:0.85}}/>
                      <div style={{flex:1,background:"#5BA7D6",borderRadius:"3px 3px 0 0",height:Math.round((d.overage/maxV)*160),opacity:0.85}}/>
                      <div style={{flex:1,background:"#48BB78",borderRadius:"3px 3px 0 0",height:Math.round((d.affiliates/maxV)*160),opacity:0.85}}/>
                    </div>
                    <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{d.month.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* STORAGE */}
      {tab === "storage" && (() => {
        const perPlan = storageData?.perPlan ?? [];
        const totals = storageData?.totals;
        return (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-5">
            {perPlan.length === 0 && (
              <div className="p-6 rounded-2xl md:col-span-3 text-center" style={{...GLASS, color:"#8A9AB8"}}>No storage usage recorded for the current billing period yet.</div>
            )}
            {perPlan.map(s=>(
              <div key={s.plan} className="p-6 rounded-2xl" style={GLASS}>
                <div style={{color:"#6E90C9",fontSize:14,...MONO,letterSpacing:"0.1em",marginBottom:8}}>{s.planName.toUpperCase()} PLAN</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:35.5,color:"#E8EDF5"}}>{s.avgUsedGb} GB</div>
                <div style={{color:"#8A9AB8",fontSize:16,marginBottom:12}}>avg. used of {s.limitGb} GB limit</div>
                <div className="h-2 rounded-full" style={{background:"rgba(91,110,225,0.1)"}}>
                  <div className="h-2 rounded-full" style={{width:`${s.limitGb ? Math.min(100,(s.avgUsedGb/s.limitGb)*100) : 0}%`,background:"linear-gradient(90deg,#5B6EE1,#5B6EE1)",boxShadow:"0 0 8px rgba(91,110,225,0.4)"}}/>
                </div>
                <div style={{color:"#8A9AB8",fontSize:14,marginTop:6,...MONO}}>{s.limitGb ? Math.round((s.avgUsedGb/s.limitGb)*100) : 0}% average utilization</div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5",marginBottom:16}}>Platform Storage Totals — Current Billing Period</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {label:"Total Data Stored",value:`${(totals?.totalStorageGb ?? 0).toLocaleString()} GB`,color:"#6E90C9"},
                {label:"Total Overage",value:`${(totals?.totalOverageGb ?? 0).toLocaleString()} GB`,color:"#6FAE8B"},
                {label:"Avg per User",value:`${totals?.avgPerUserGb ?? 0} GB`,color:"#D99A6B"},
                {label:"Overage Rate/GB",value:totals?.overageRatePerGb != null ? `$${totals.overageRatePerGb}` : "—",color:"#F6AD55"},
              ].map(s=>(
                <div key={s.label} className="p-4 rounded-2xl" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.1)"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:27.5,color:s.color}}>{s.value}</div>
                  <div style={{color:"#8A9AB8",fontSize:15,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {/* VERIFICATION — the wired IDVerification screen, not a second copy */}
      {tab === "verification" && <IDVerification/>}

      {/* PAYOUTS — the wired PayoutManagement screen */}
      {tab === "payouts" && <PayoutManagement/>}

      {/* AUDIT LOG */}
      {tab === "audit" && (() => {
        const logs = auditData?.logs ?? [];
        return (
        <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(91,110,225,0.14)"}}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{background:"rgba(10,10,15,0.9)",borderColor:"rgba(91,110,225,0.1)"}}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5"}}>System Audit Log</h3>
            <span style={{color:"#8A9AB8",fontSize:14,...MONO}}>{auditData?.total ?? 0} entries</span>
          </div>
          {auditLoading && <div className="px-5 py-8 text-center" style={{color:"#8A9AB8"}}>Loading audit trail…</div>}
          {auditError && <div className="px-5 py-8 text-center" style={{color:"#FC8181"}}>{auditError}</div>}
          {!auditLoading && !auditError && logs.length === 0 && (
            <div className="px-5 py-8 text-center" style={{color:"#8A9AB8",fontSize:15}}>
              No admin actions recorded yet. Every mutating request to the admin backend writes an entry here.
            </div>
          )}
          {logs.map((log,i)=>{
            const sc = {info:"#8A9AB8",warning:"#F6AD55",critical:"#FC8181"}[log.severity ?? "info"] ?? "#8A9AB8";
            const target = [log.target_type, log.target_id && log.target_id.slice(0,8)].filter(Boolean).join(" · ");
            return (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 border-b" style={{background:i%2===0?"transparent":"rgba(255,255,255,0.025)",borderColor:"rgba(91,110,225,0.06)"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:`0 0 6px ${sc}`,flexShrink:0}}/>
                <div style={{color:"#8A9AB8",fontSize:12.5,...MONO,flexShrink:0,minWidth:80}}>{log.id.slice(0,8)}</div>
                <div style={{color:"#8A9AB8",fontSize:15,flexShrink:0,minWidth:140,...MONO}}>{log.actor_email ?? "system"}</div>
                <div style={{color:"#E8EDF5",fontSize:16,flex:1}}>{log.action}</div>
                <div style={{color:"#8A9AB8",fontSize:15,...MONO,flexShrink:0}}>{target || "—"}</div>
                <div style={{color:"#8A9AB8",fontSize:14,...MONO,flexShrink:0}}>{relativeTime(log.created_at)}</div>
              </div>
            );
          })}
        </div>
        );
      })()}

      {/* $199 LEGACY CONTINUATION FEE — the wired ContinuationFeeAdmin screen */}
      {tab === "continuation" && <ContinuationFeeAdmin/>}

      {/* PUSH NOTIFICATIONS TAB */}
      {tab === "notifications" && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} color="#FFFFFF"/>
              <span style={{ color:"#6E90C9", fontSize:14, fontFamily:"var(--font-mono)", letterSpacing:"0.1em" }}>COMMAND CENTER · PUSH NOTIFICATIONS</span>
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:27.5, color:"#E8EDF5" }}>Push Notification Center</h2>
            <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
              Send in-app and device push notifications to all users or specific plan segments. Track delivery and open rates.
            </p>
          </div>
          <PushNotificationCenter
            usersByPlan={overviewData?.usersByPlan ?? {}}
            totalUsers={overviewData?.totalUsers ?? 0}
          />
        </div>
      )}

      {/* ADMIN TEAM & ROLES TAB */}
      {tab === "admin_roles" && <AdminRoles/>}
      {tab === "reports"     && <ReportsDownloads/>}
      {tab === "system_health" && <SystemHealth/>}
      {tab === "disaster_recovery" && <DisasterRecoveryAdmin/>}

      {/* Manually Onboarded Users — shown in Users tab */}
      {tab === "users" && manualUsers.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border:"2px solid rgba(91,110,225,0.2)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ background:"rgba(91,110,225,0.05)", borderColor:"rgba(91,110,225,0.12)" }}>
            <div className="flex items-center gap-2">
              <UserPlus size={15} color="#FFFFFF"/>
              <span style={{ fontFamily:"var(--font-display)", fontSize:17.5, color:"#E8EDF5" }}>Manually Onboarded Accounts</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:"rgba(91,110,225,0.1)", color:"#6E90C9", fontFamily:"var(--font-mono)" }}>{manualUsers.length}</span>
            </div>
            <button onClick={() => setShowOnboard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
              <UserPlus size={11}/> Onboard Another
            </button>
          </div>
          {manualUsers.map((u, i) => {
            const plan = PLANS.find(p => p.id === u.plan) ?? PLANS[2];
            return (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b"
                style={{ background:i%2===0?"transparent":"rgba(255,255,255,0.025)", borderColor:"rgba(91,110,225,0.06)" }}>
                <span style={{ color:"#6E90C9", fontSize:12.5, fontFamily:"var(--font-mono)", minWidth:70 }}>{u.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color:"#E8EDF5", fontSize:16, fontWeight:500 }}>{u.name}</span>
                    {u.whiteGlove && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(91,167,214,0.1)", color:"#6FAE8B", fontFamily:"var(--font-mono)" }}>⭐ WHITE GLOVE</span>}
                  </div>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>{u.email} · {u.onboardedAt}</div>
                </div>
                <div className="text-center">
                  <div style={{ color:plan.color, fontSize:15, fontWeight:700 }}>{plan.name}</div>
                  <div style={{ color:"#8A9AB8", fontSize:12.5 }}>{plan.storage}</div>
                </div>
                <div className="text-center">
                  {u.subscriptionWaived ? (
                    <div>
                      <div style={{ color:"#D99A6B", fontSize:15, fontWeight:700 }}>$0.00/mo</div>
                      <div style={{ color:"#D99A6B", fontSize:11, fontFamily:"var(--font-mono)" }}>WAIVED</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color:"#E8EDF5", fontSize:15, fontWeight:700 }}>${plan.price}/mo</div>
                      <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>BILLING</div>
                    </div>
                  )}
                </div>
                {u.subscriptionWaived && (
                  <span className="px-2 py-1 rounded-xl text-xs font-bold"
                    style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B", fontFamily:"var(--font-mono)" }}>
                    {WAIVE_REASONS.find(r=>r.id===u.waiveReason)?.label ?? "Waived"}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B", fontFamily:"var(--font-mono)" }}>
                  ACTIVE
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showOnboard && (
        <OnboardUserModal
          onClose={() => setShowOnboard(false)}
          onCreated={u => setManualUsers(prev => [u, ...prev])}
        />
      )}
    </div>
  );
}
