import React, { useState } from "react";
import { AdminRoles } from "./AdminRoles";
import { ReportsDownloads } from "./ReportsDownloads";
import { UserDetailModal, ADMIN_USERS, type AdminUser } from "./UserDetailModal";
import { SystemHealth } from "./SystemHealth";
import { AdminAIAgent } from "../AdminAIAgent";
import {
  Users, DollarSign, HardDrive, TrendingUp, Globe, Crown,
  Activity, ArrowUp, ArrowDown, Search, Filter, Eye,
  CheckCircle, XCircle, Clock, Edit, Trash2, Download,
  AlertTriangle, Bell, BarChart3, UserCheck, Lock, Settings,
  RefreshCw, Shield, UserPlus, X, ToggleLeft, ToggleRight,
  Star, Send, Gift, Bot
} from "lucide-react";
import { toast } from "sonner";

const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(91,110,225,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.025) 1px,transparent 1px)", backgroundSize:"60px 60px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ── mock data ──────────────────────────────────────────────────── */
const revenueData = [
  { month:"Jan", mrr:42180, overage:1240, affiliates:8420 },
  { month:"Feb", mrr:51320, overage:1890, affiliates:10260 },
  { month:"Mar", mrr:64780, overage:2341, affiliates:12960 },
  { month:"Apr", mrr:77450, overage:3124, affiliates:15490 },
  { month:"May", mrr:95210, overage:4089, affiliates:19040 },
  { month:"Jun", mrr:112340, overage:5212, affiliates:23040 },
];

const userGrowth = [
  { month:"Jan", new:842, churn:34 }, { month:"Feb", new:1024, churn:41 },
  { month:"Mar", new:1287, churn:38 }, { month:"Apr", new:1541, churn:52 },
  { month:"May", new:1893, churn:61 }, { month:"Jun", new:2241, churn:57 },
];

const planDist = [
  { name:"Foundation", value:18420, color:"#6FAE8B" },
  { name:"Legacy Archive", value:24180, color:"#6E90C9" },
  { name:"Legacy Pro", value:7890, color:"#6FAE8B" },
];

const storageByPlan = [
  { plan:"Foundation", avgUsed:3.2, limit:50 },
  { plan:"Legacy Archive", avgUsed:12.4, limit:250 },
  { plan:"Legacy Pro", avgUsed:38.8, limit:1000 },
];

/* Users data is now in UserDetailModal.tsx as ADMIN_USERS */

const auditLogs = [
  { id:"LOG-9912", user:"admin@fpd.com", action:"Approved ID verification", target:"VER-2026-0841", time:"2 min ago", severity:"info" },
  { id:"LOG-9911", user:"admin@fpd.com", action:"Suspended user account", target:"USR-8777 (Derek Mills)", time:"1 hour ago", severity:"warning" },
  { id:"LOG-9910", user:"system", action:"Overage billing triggered", target:"USR-8798 (Patricia Wells)", time:"3 hours ago", severity:"info" },
  { id:"LOG-9909", user:"admin@fpd.com", action:"Updated Legacy Archive plan price", target:"Plans Config", time:"1 day ago", severity:"critical" },
  { id:"LOG-9908", user:"system", action:"Storage alert sent (80%)", target:"USR-8821 (James Doe)", time:"2 days ago", severity:"info" },
  { id:"LOG-9907", user:"admin@fpd.com", action:"Processed batch payout", target:"18 affiliates · $52,840", time:"3 days ago", severity:"info" },
];

const pendingVerifications = [
  { id:"VER-2026-0841", contact:"Linda Torres", forUser:"James Doe", type:"State ID", submitted:"Jun 11, 2026" },
  { id:"VER-2026-0838", contact:"Thomas Rivera", forUser:"Maria Lopez", type:"Passport", submitted:"Jun 10, 2026" },
  { id:"VER-2026-0835", contact:"Grace Nakamura", forUser:"Kevin Park", type:"Driver's License", submitted:"Jun 9, 2026" },
];

type AdminTab = "overview"|"users"|"revenue"|"storage"|"verification"|"payouts"|"audit"|"continuation"|"analytics"|"notifications"|"admin_roles"|"reports"|"admin_ai"|"system_health";

/* ─────────────────────────────────────────────────────────────────
   ANALYTICS DATA — all demo-mode seed data
   ───────────────────────────────────────────────────────────────── */

// Gender
const genderData = [
  { label:"Female",          pct:54.2, count:27_894, color:"#6FAE8B" },
  { label:"Male",            pct:40.1, count:20_647, color:"#6E90C9" },
  { label:"Non-binary",      pct:3.8,  count:1_957,  color:"#D99A6B" },
  { label:"Prefer not to say",pct:1.9, count:992,    color:"#8A9AB8" },
];

// Age cohorts
const ageData = [
  { range:"18 – 24", count:2_841,  pct:5.5,  color:"#6FAE8B", avgPlan:"Foundation" },
  { range:"25 – 34", count:7_284,  pct:14.1, color:"#6E90C9", avgPlan:"Legacy Archive" },
  { range:"35 – 44", count:11_492, pct:22.3, color:"#6E90C9", avgPlan:"Legacy Archive" },
  { range:"45 – 54", count:13_840, pct:26.9, color:"#6FAE8B", avgPlan:"Legacy Pro" },
  { range:"55 – 64", count:10_284, pct:20.0, color:"#D99A6B", avgPlan:"Legacy Pro" },
  { range:"65 – 74", count:4_821,  pct:9.4,  color:"#F6AD55", avgPlan:"Legacy Archive" },
  { range:"75+",     count:928,    pct:1.8,  color:"#FC8181", avgPlan:"Foundation" },
];

// Top US states
const stateData = [
  { state:"California",    abbr:"CA", users:9_284,  pct:18.0, mrr:232_100, color:"#6E90C9" },
  { state:"Texas",         abbr:"TX", users:6_841,  pct:13.3, mrr:171_025, color:"#6E90C9" },
  { state:"Florida",       abbr:"FL", users:5_492,  pct:10.7, mrr:137_300, color:"#6FAE8B" },
  { state:"New York",      abbr:"NY", users:4_821,  pct:9.4,  mrr:120_525, color:"#6FAE8B" },
  { state:"Georgia",       abbr:"GA", users:3_284,  pct:6.4,  mrr:82_100,  color:"#6FAE8B" },
  { state:"Illinois",      abbr:"IL", users:2_948,  pct:5.7,  mrr:73_700,  color:"#6FAE8B" },
  { state:"North Carolina",abbr:"NC", users:2_491,  pct:4.8,  mrr:62_275,  color:"#D99A6B" },
  { state:"Pennsylvania",  abbr:"PA", users:2_284,  pct:4.4,  mrr:57_100,  color:"#D99A6B" },
  { state:"Ohio",          abbr:"OH", users:1_941,  pct:3.8,  mrr:48_525,  color:"#F6AD55" },
  { state:"Arizona",       abbr:"AZ", users:1_724,  pct:3.3,  mrr:43_100,  color:"#F6AD55" },
];

// Top cities
const cityData = [
  { city:"Los Angeles, CA",    users:3_284, pct:6.4 },
  { city:"Houston, TX",        users:2_941, pct:5.7 },
  { city:"Atlanta, GA",        users:2_184, pct:4.2 },
  { city:"Chicago, IL",        users:2_041, pct:4.0 },
  { city:"New York, NY",       users:1_892, pct:3.7 },
  { city:"Dallas, TX",         users:1_741, pct:3.4 },
  { city:"Miami, FL",          users:1_584, pct:3.1 },
  { city:"Phoenix, AZ",        users:1_241, pct:2.4 },
  { city:"Philadelphia, PA",   users:1_184, pct:2.3 },
  { city:"Sacramento, CA",     users:1_092, pct:2.1 },
];

// Country distribution
const countryData = [
  { country:"United States",  users:48_241, pct:93.7, color:"#6E90C9" },
  { country:"Canada",         users:1_284,  pct:2.5,  color:"#6FAE8B" },
  { country:"United Kingdom", users:841,    pct:1.6,  color:"#D99A6B" },
  { country:"Australia",      users:492,    pct:1.0,  color:"#6FAE8B" },
  { country:"Germany",        users:241,    pct:0.5,  color:"#F6AD55" },
  { country:"Other",          users:391,    pct:0.7,  color:"#8A9AB8" },
];

// Device / platform
const deviceData = [
  { label:"Mobile (iOS)",     pct:41.2, color:"#6E90C9" },
  { label:"Mobile (Android)", pct:28.4, color:"#D99A6B" },
  { label:"Desktop (Mac)",    pct:18.1, color:"#6FAE8B" },
  { label:"Desktop (Windows)",pct:10.8, color:"#6FAE8B" },
  { label:"Tablet",           pct:1.5,  color:"#F6AD55" },
];

// Relationship status
const relationshipData = [
  { label:"Married / Partnered", pct:58.4, color:"#6E90C9" },
  { label:"Single",              pct:21.2, color:"#6FAE8B" },
  { label:"Divorced / Separated",pct:12.8, color:"#F6AD55" },
  { label:"Widowed",             pct:6.1,  color:"#FC8181" },
  { label:"Prefer not to say",   pct:1.5,  color:"#8A9AB8" },
];

// Feature adoption
const featureAdoption = [
  { feature:"Digital File Cabinet", adopted:87.4, total:51490, color:"#6E90C9" },
  { feature:"Legacy Contacts",      adopted:74.2, total:51490, color:"#6FAE8B" },
  { feature:"Final Wishes",         adopted:62.8, total:51490, color:"#D99A6B" },
  { feature:"Medical Info",         adopted:58.1, total:51490, color:"#6FAE8B" },
  { feature:"Financial Records",    adopted:52.4, total:51490, color:"#F6AD55" },
  { feature:"Digital Diary",        adopted:41.8, total:51490, color:"#ED8936" },
  { feature:"Password Manager",     adopted:38.2, total:51490, color:"#D68FA8" },
  { feature:"Affiliate Program",    adopted:29.4, total:51490, color:"#FC8181" },
  { feature:"$199 Continuation Fee",adopted:18.7, total:51490, color:"#E53E3E" },
];

// Vault completion scores
const completionBuckets = [
  { range:"0 – 20%  (Just started)",  count:8_241,  color:"#FC8181" },
  { range:"21 – 40% (In progress)",   count:11_284, color:"#F6AD55" },
  { range:"41 – 60% (Halfway)",       count:13_841, color:"#6FAE8B" },
  { range:"61 – 80% (Nearly done)",   count:12_492, color:"#6FAE8B" },
  { range:"81 – 100% (Complete)",     count:5_632,  color:"#D99A6B" },
];

// Engagement
const engagementData = [
  { month:"Jan", dau:4_284, mau:21_840, sessions:89_241, avgMin:8.4 },
  { month:"Feb", dau:5_181, mau:26_492, sessions:108_841, avgMin:8.9 },
  { month:"Mar", dau:6_284, mau:31_284, sessions:128_492, avgMin:9.1 },
  { month:"Apr", dau:7_841, mau:37_841, sessions:154_841, avgMin:9.4 },
  { month:"May", dau:9_284, mau:44_492, sessions:182_841, avgMin:9.8 },
  { month:"Jun", dau:11_492,mau:51_490, sessions:214_841, avgMin:10.2 },
];

// Signup sources
const acquisitionData = [
  { source:"Organic Search (Google)", pct:38.4, color:"#6E90C9" },
  { source:"Affiliate Referral",      pct:22.1, color:"#6FAE8B" },
  { source:"Social Media",            pct:14.8, color:"#D99A6B" },
  { source:"Partner Referral",        pct:12.4, color:"#F6AD55" },
  { source:"Direct / Typed URL",      pct:8.2,  color:"#6FAE8B" },
  { source:"Paid Ads",                pct:4.1,  color:"#FC8181" },
];

// Health / retention
const retentionData = [
  { month:"Month 1", retained:91.2, color:"#D99A6B" },
  { month:"Month 2", retained:84.8, color:"#D99A6B" },
  { month:"Month 3", retained:80.1, color:"#6FAE8B" },
  { month:"Month 6", retained:74.4, color:"#6FAE8B" },
  { month:"Month 12",retained:68.2, color:"#F6AD55" },
];

// NPS
const npsData = { promoters:62.4, passives:21.8, detractors:15.8, score:47 };

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
    <div className="p-4 rounded-2xl" style={{ background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)" }}>
      <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color, lineHeight:1 }}>{value}</div>
      <div style={{ color:"#E8EDF5", fontSize:15, fontWeight:500, marginTop:4 }}>{label}</div>
      {sub && <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ title, sub }: { title:string; sub?:string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <div style={{ fontFamily:"var(--font-display)", fontSize:21.5, color:"#E8EDF5" }}>{title}</div>
      {sub && <div style={{ color:"#8A9AB8", fontSize:15 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, className = "" }: { children:React.ReactNode; className?:string }) {
  return (
    <div className={`p-5 rounded-2xl ${className}`}
      style={{ background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)" }}>
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

let _onboardedUsers: OnboardedUser[] = [
  { id:"MAN-001", name:"Dorothy Henderson", email:"d.henderson@email.com", phone:"(916) 555-0291", plan:"family_archive", subscriptionWaived:true, waiveReason:"white_glove", whiteGlove:true, sendWelcome:true, notes:"82 years old, daughter contacted us on her behalf. Specialist: Marcus.", onboardedAt:"Jun 15, 2026", onboardedBy:"admin@finalpassdown.com", status:"active" },
  { id:"MAN-002", name:"Robert Ashford III", email:"r.ashford@gmail.com", phone:"(404) 555-0182", plan:"legacy_pro", subscriptionWaived:false, waiveReason:"", whiteGlove:false, sendWelcome:true, notes:"Referred by Greenfield Law Offices.", onboardedAt:"Jun 18, 2026", onboardedBy:"admin@finalpassdown.com", status:"active" },
  { id:"MAN-003", name:"Community Care Foundation", email:"admin@ccfoundation.org", phone:"(212) 555-0841", plan:"foundation", subscriptionWaived:true, waiveReason:"charity", whiteGlove:false, sendWelcome:true, notes:"501(c)3 nonprofit, full subscription waiver approved.", onboardedAt:"Jun 20, 2026", onboardedBy:"admin@finalpassdown.com", status:"active" },
];

function OnboardUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: OnboardedUser) => void }) {
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
        onboardedBy: "admin@finalpassdown.com",
        status: "active",
      };
      _onboardedUsers = [newUser, ..._onboardedUsers];
      onCreated(newUser);
      setSaving(false);
      toast.success(`${form.name} onboarded${form.subscriptionWaived ? " · Subscription waived" : ""}${form.whiteGlove ? " · White Glove assigned" : ""}`);
      onClose();
    }, 900);
  }

  const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
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

const topMetrics = [
  { label:"Total Active Users", value:"51,490", change:+18.4, color:"#6E90C9" },
  { label:"Monthly Recurring Revenue", value:"$112,340", change:+22.1, color:"#D99A6B" },
  { label:"Overage Revenue (Jun)", value:"$5,212", change:+27.5, color:"#6FAE8B" },
  { label:"Affiliate Payouts (Jun)", value:"$23,040", change:+14.2, color:"#F6AD55" },
  { label:"Avg Storage/User", value:"12.4 GB", change:+8.1, color:"#6E90C9" },
  { label:"Churn Rate (Jun)", value:"2.3%", change:-0.4, color:"#FC8181", lowerBetter:true },
];

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

const NOTIF_HISTORY: SentNotification[] = [
  { id:"NTF-004", title:"🎉 New Feature: Document Scanner", body:"Scan physical documents with your phone camera and upload them directly to your vault. Try it in the File Cabinet!", type:"feature", target:"all", sentAt:"Jun 22, 2026 · 10:00 AM", sentBy:"admin@finalpassdown.com", delivered:51490, opened:28420, openRate:55.2, scheduled:false },
  { id:"NTF-003", title:"Reminder: Complete Your Vault", body:"You're 65% done setting up your legacy vault. Add your Legacy Contacts to finish protecting your family.", type:"reminder", target:"family_archive", sentAt:"Jun 18, 2026 · 9:00 AM", sentBy:"admin@finalpassdown.com", delivered:24180, opened:11400, openRate:47.1, scheduled:false },
  { id:"NTF-002", title:"⚠️ Storage Alert Threshold Update", body:"We've adjusted storage alert thresholds for all plans. You'll now receive earlier warnings at 75%.", type:"update", target:"all", sentAt:"Jun 10, 2026 · 2:00 PM", sentBy:"admin@finalpassdown.com", delivered:51490, opened:22140, openRate:43.0, scheduled:false },
  { id:"NTF-001", title:"Welcome to Final Pass Down 2.0", body:"We've completely rebuilt the platform with new features, faster performance, and more ways to protect your legacy. Explore what's new!", type:"marketing", target:"all", sentAt:"Jun 1, 2026 · 8:00 AM", sentBy:"admin@finalpassdown.com", delivered:48200, opened:31820, openRate:66.0, scheduled:false },
];

const NOTIF_TYPE_COLORS: Record<NotifType, string> = {
  marketing:"#F7931A", feature:"#5B6EE1", update:"#5BA7D6",
  alert:"#FC8181", reminder:"#48BB78",
};
const TARGET_LABELS: Record<NotifTarget, string> = {
  all:"All Users (51,490)", starter:"Starter", essential:"Foundation",
  premium:"Legacy Archive", legacy_pro:"Legacy Pro", enterprise:"Legacy Vault", white_glove:"White Glove Clients",
};
const TARGET_COUNTS: Record<NotifTarget, number> = {
  all:51490, starter:1840, essential:18420, premium:24180, legacy_pro:5490, enterprise:1560, white_glove:3,
};

function PushNotificationCenter() {
  const [history, setHistory] = useState<SentNotification[]>(NOTIF_HISTORY);
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

  const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
  const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };
  const MONO_S: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  const recipientCount = TARGET_COUNTS[target];

  function send() {
    if (!title.trim()) { toast.error("Notification title is required"); return; }
    if (!body.trim()) { toast.error("Message body is required"); return; }
    setSending(true);
    setTimeout(() => {
      const newNotif: SentNotification = {
        id: `NTF-${String(Date.now()).slice(-3)}`,
        title, body, type, target,
        sentAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        sentBy:"admin@finalpassdown.com",
        delivered: recipientCount,
        opened: 0, openRate: 0,
        scheduled: scheduleMode, scheduledFor: scheduleMode ? scheduleDate : undefined,
      };
      setHistory(prev => [newNotif, ...prev]);
      setSending(false);
      toast.success(`🔔 Push notification ${scheduleMode ? "scheduled" : "sent"} to ${recipientCount.toLocaleString()} users!`);
      setTitle(""); setBody(""); setType("marketing"); setTarget("all"); setScheduleMode(false); setScheduleDate("");
      setView("history");
    }, 1200);
  }

  const totalDelivered = history.reduce((s,n) => s+n.delivered, 0);
  const avgOpenRate = Math.round(history.reduce((s,n) => s+n.openRate, 0) / Math.max(history.length,1));

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Notifications Sent",   value:history.length,                  color:"#6E90C9" },
          { label:"Total Delivered",       value:totalDelivered.toLocaleString(), color:"#D99A6B" },
          { label:"Avg Open Rate",         value:`${avgOpenRate}%`,               color:"#6FAE8B" },
          { label:"Scheduled / Pending",   value:history.filter(n=>n.scheduled).length, color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0A0F1A", border:"1px solid rgba(91,110,225,0.25)" }}>
        {[["compose","✏️ Compose"],["history","📋 Sent History"]].map(([id,label]) => (
          <button key={id} onClick={() => setView(id as any)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background:view===id?"#5B6EE1":"transparent", color:view===id?"#fff":"#8A9AB8" }}>
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
                📣 Will reach <strong>{TARGET_COUNTS[target].toLocaleString()}</strong> users
              </div>
            </div>

            {/* Delivery channel */}
            <div>
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO_S, display:"block", marginBottom:7 }}>DELIVERY CHANNEL</label>
              <div className="grid grid-cols-3 gap-2">
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
                  ? `Schedule ${channel==="both"?"Push + Email":channel==="email"?"Email":"Push"} to ${TARGET_COUNTS[target].toLocaleString()} Users`
                  : `Send ${channel==="both"?"Push + Email":channel==="email"?"Email Only":"Push Only"} → ${TARGET_COUNTS[target].toLocaleString()} Users`}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>DELIVERED</div>
                  <div style={{ color:"#6E90C9", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>{n.delivered.toLocaleString()}</div>
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>OPENED</div>
                  <div style={{ color:"#D99A6B", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>{n.opened.toLocaleString()}</div>
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>OPEN RATE</div>
                  <div style={{ color:n.openRate > 50 ? "#D99A6B" : n.openRate > 30 ? "#F6AD55" : "#FC8181", fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>
                    {n.openRate}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MasterAdmin() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [manualUsers, setManualUsers] = useState<OnboardedUser[]>(_onboardedUsers);

  const filteredUsers = ADMIN_USERS.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id:"overview",     label:"Overview",        icon:<BarChart3 size={13}/> },
    { id:"analytics",    label:"Analytics",       icon:<Globe size={13}/>, badge:"New" },
    { id:"users",        label:"Users",           icon:<Users size={13}/> },
    { id:"revenue",      label:"Revenue",         icon:<DollarSign size={13}/> },
    { id:"storage",      label:"Storage",         icon:<HardDrive size={13}/> },
    { id:"verification", label:"ID Verification", icon:<UserCheck size={13}/>, badge:"3" },
    { id:"payouts",      label:"Payouts",         icon:<TrendingUp size={13}/> },
    { id:"continuation", label:"$199 Fee",        icon:<DollarSign size={13}/> },
    { id:"audit",        label:"Audit Log",       icon:<Shield size={13}/> },
    { id:"system_health",label:"System Health",   icon:<Activity size={13}/>, badge:"Live" },
    { id:"notifications",label:"Push Notifications",icon:<Bell size={13}/>, badge:"NEW" },
    { id:"admin_roles",  label:"Admin Team",          icon:<Shield size={13}/>,   badge:"New" },
    { id:"reports",      label:"Reports & Downloads", icon:<Download size={13}/> },
    { id:"admin_ai",     label:"Admin AI Assistant",  icon:<Bot size={13}/>,      badge:"AI" },
  ];

  return (
    <div className="p-6 space-y-5 relative" style={{ maxWidth:1400, ...GRID }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Crown size={15} color="#FFFFFF" />
            <span style={{ color:"#6E90C9", fontSize:14, ...MONO, letterSpacing:"0.12em" }}>MASTER ADMIN · FINAL PASS DOWN</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>Platform Command Center</h1>
          <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>Real-time metrics · User management · Revenue · Compliance · Audit trail</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowOnboard(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#fff", boxShadow:"0 4px 16px rgba(91,110,225,0.35)" }}>
            <UserPlus size={14}/> Onboard User
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={GLASS}>
            <Activity size={13} color="#FFFFFF" />
            <span style={{ color:"#D99A6B", fontSize:14, ...MONO }}>LIVE · Jun 24, 2026</span>
          </div>
        </div>
      </div>

      {/* Manually onboarded users strip */}
      {manualUsers.length > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.15)" }}>
          <UserPlus size={14} color="#FFFFFF"/>
          <span style={{ color:"#6E90C9", fontSize:15, fontWeight:600 }}>Manually Onboarded:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {manualUsers.slice(0,4).map(u => (
              <span key={u.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                style={{ background:`rgba(91,110,225,0.1)`, color:"#6E90C9", fontWeight:500 }}>
                {u.whiteGlove && <Star size={9} color="#FFFFFF"/>}
                {u.name}
                {u.subscriptionWaived && <Gift size={9} color="#FFFFFF"/>}
              </span>
            ))}
            {manualUsers.length > 4 && <span style={{ color:"#8A9AB8", fontSize:15 }}>+{manualUsers.length-4} more</span>}
          </div>
          <button onClick={() => setTab("users")} style={{ color:"#6E90C9", fontSize:14, fontWeight:600 }}>View all →</button>
        </div>
      )}

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {topMetrics.map(m => (
          <div key={m.label} className="p-4 rounded-2xl" style={GLASS}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{m.label.toUpperCase().split(" ").slice(-2).join(" ")}</div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                style={{ background: (m.lowerBetter ? m.change<0 : m.change>0) ? "rgba(72,187,120,0.12)" : "rgba(252,129,129,0.12)",
                  color: (m.lowerBetter ? m.change<0 : m.change>0) ? "#D99A6B" : "#FC8181", fontSize:11, ...MONO }}>
                {m.change>0 ? <ArrowUp size={8}/> : <ArrowDown size={8}/>}
                {Math.abs(m.change)}%
              </div>
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:25, color:m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl" style={{ background:"#0A0F1A", border:"1px solid rgba(91,110,225,0.2)", width:"fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm transition-all"
            style={{ background:tab===t.id?"#5B6EE1":"transparent", color:tab===t.id?"#F0F4FA":"#8A9AB8", fontWeight:tab===t.id?700:400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          ANALYTICS TAB — full demographic dashboard
          ══════════════════════════════════════════════ */}
      {tab === "analytics" && (
        <div className="space-y-6">

          {/* ── Top KPIs ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatChip label="Total Users" value="51,490" sub="All time" color="#FFFFFF"/>
            <StatChip label="Female Users" value="54.2%" sub="27,894 accounts" color="#FFFFFF"/>
            <StatChip label="Male Users" value="40.1%" sub="20,647 accounts" color="#FFFFFF"/>
            <StatChip label="Median Age" value="47" sub="Years old" color="#FFFFFF"/>
            <StatChip label="US Users" value="93.7%" sub="48,241 accounts" color="#FFFFFF"/>
            <StatChip label="NPS Score" value={npsData.score} sub="Net Promoter Score" color="#F6AD55"/>
          </div>

          {/* ── Gender + Age side by side ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Gender Distribution" sub="51,490 total users"/>
              <div className="space-y-3 mt-2">
                {genderData.map(g => (
                  <HorizBar key={g.label} label={g.label} pct={g.pct} value={`${g.pct}% · ${g.count.toLocaleString()}`} color={g.color}/>
                ))}
              </div>
              {/* Visual donut-style bars */}
              <div className="flex gap-1 h-4 rounded-full overflow-hidden mt-4">
                {genderData.map(g => (
                  <div key={g.label} style={{ flex:g.pct, background:g.color }} title={`${g.label} ${g.pct}%`}/>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHead title="Relationship Status" sub="All users"/>
              <div className="space-y-3 mt-2">
                {relationshipData.map(r => (
                  <HorizBar key={r.label} label={r.label} pct={r.pct} color={r.color}/>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Age distribution ── */}
          <Card>
            <SectionHead title="Age Distribution" sub="Users by age cohort"/>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Vertical bars */}
              <div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:140 }}>
                  {ageData.map(a => {
                    const maxCount = Math.max(...ageData.map(x=>x.count));
                    const h = Math.round((a.count/maxCount)*120);
                    return (
                      <div key={a.range} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                        <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>{a.pct}%</span>
                        <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                          <div style={{ width:"100%", height:h, background:a.color, borderRadius:"4px 4px 0 0", opacity:0.85 }}/>
                        </div>
                        <span style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)", textAlign:"center", lineHeight:1.2 }}>{a.range}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Table */}
              <div className="space-y-2">
                {ageData.map(a => (
                  <div key={a.range} className="flex items-center justify-between py-2 border-b" style={{ borderColor:"rgba(91,110,225,0.06)" }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width:8, height:8, borderRadius:"50%", background:a.color, flexShrink:0 }}/>
                      <span style={{ color:"#E8EDF5", fontSize:15 }}>{a.range}</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span style={{ color:a.color, fontSize:14, fontFamily:"var(--font-mono)", fontWeight:700 }}>{a.pct}%</span>
                      <span style={{ color:"#8A9AB8", fontSize:14 }}>{a.count.toLocaleString()} users</span>
                      <span style={{ color:"#8A9AB8", fontSize:12.5, fontStyle:"italic" }}>avg: {a.avgPlan}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── Geographic: States + Countries ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Top 10 States" sub="United States"/>
              <div className="space-y-2.5">
                {stateData.map((s, i) => {
                  const maxU = stateData[0].users;
                  return (
                    <div key={s.state}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ color:"#8A9AB8", fontSize:12.5, fontFamily:"var(--font-mono)", width:16, textAlign:"right" }}>{i+1}</span>
                          <span style={{ color:"#E8EDF5", fontSize:16 }}>{s.state}</span>
                          <span style={{ color:"#8A9AB8", fontSize:12.5, fontFamily:"var(--font-mono)" }}>({s.abbr})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{ color:"#8A9AB8", fontSize:14 }}>{s.users.toLocaleString()}</span>
                          <span style={{ color:s.color, fontSize:14, fontWeight:700, fontFamily:"var(--font-mono)" }}>{s.pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                        <div className="h-1.5 rounded-full" style={{ width:`${(s.users/maxU)*100}%`, background:s.color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-5">
              <Card>
                <SectionHead title="Country Distribution"/>
                <div className="space-y-2.5">
                  {countryData.map(c => (
                    <HorizBar key={c.country} label={c.country} pct={c.pct}
                      value={`${c.pct}% · ${c.users.toLocaleString()}`} color={c.color}/>
                  ))}
                </div>
                <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mt-4">
                  {countryData.map(c => (
                    <div key={c.country} style={{ flex:c.pct, background:c.color }} title={`${c.country} ${c.pct}%`}/>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionHead title="Top 10 Cities"/>
                <div className="space-y-1.5">
                  {cityData.map((c, i) => (
                    <div key={c.city} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor:"rgba(91,110,225,0.06)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)", width:14, textAlign:"right" }}>{i+1}</span>
                        <span style={{ color:"#E8EDF5", fontSize:15 }}>{c.city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color:"#8A9AB8", fontSize:14 }}>{c.users.toLocaleString()}</span>
                        <span style={{ color:"#6E90C9", fontSize:14, fontWeight:700, fontFamily:"var(--font-mono)" }}>{c.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* ── Device + Acquisition ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Device & Platform" sub="How users access FPD"/>
              <div className="space-y-3">
                {deviceData.map(d => (
                  <HorizBar key={d.label} label={d.label} pct={d.pct} color={d.color}/>
                ))}
              </div>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mt-4">
                {deviceData.map(d => (
                  <div key={d.label} style={{ flex:d.pct, background:d.color }} title={`${d.label} ${d.pct}%`}/>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label:"Mobile Total", value:"69.6%", color:"#6E90C9" },
                  { label:"Desktop Total", value:"28.9%", color:"#6FAE8B" },
                  { label:"PWA Installed", value:"34.2%", color:"#D99A6B" },
                ].map(s => (
                  <div key={s.label} className="text-center px-2 py-2 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)" }}>
                    <div style={{ color:s.color, fontSize:20, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
                    <div style={{ color:"#8A9AB8", fontSize:12.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHead title="Acquisition Sources" sub="Where users come from"/>
              <div className="space-y-3">
                {acquisitionData.map(a => (
                  <HorizBar key={a.source} label={a.source} pct={a.pct} color={a.color}/>
                ))}
              </div>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mt-4">
                {acquisitionData.map(a => (
                  <div key={a.source} style={{ flex:a.pct, background:a.color }} title={`${a.source} ${a.pct}%`}/>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Feature adoption ── */}
          <Card>
            <SectionHead title="Feature Adoption Rate" sub="% of users who have used each feature"/>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {featureAdoption.map(f => (
                <HorizBar key={f.feature} label={f.feature} pct={f.adopted}
                  value={`${f.adopted}% · ${Math.round(f.total*f.adopted/100).toLocaleString()} users`}
                  color={f.color}/>
              ))}
            </div>
          </Card>

          {/* ── Vault completion + Engagement ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Vault Completion Score" sub="Where users are in their setup journey"/>
              <div className="space-y-3">
                {completionBuckets.map(b => {
                  const total = completionBuckets.reduce((s,x)=>s+x.count,0);
                  return (
                    <HorizBar key={b.range} label={b.range} pct={(b.count/total)*100}
                      value={b.count.toLocaleString() + " users"} color={b.color}/>
                  );
                })}
              </div>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mt-4">
                {completionBuckets.map(b => {
                  const total = completionBuckets.reduce((s,x)=>s+x.count,0);
                  return <div key={b.range} style={{ flex:b.count/total, background:b.color }} title={b.range}/>;
                })}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.15)" }}>
                  <div style={{ color:"#D99A6B", fontSize:22.5, fontFamily:"var(--font-display)", fontWeight:700 }}>10.9%</div>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>Fully complete vaults</div>
                </div>
                <div className="px-3 py-2 rounded-2xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.15)" }}>
                  <div style={{ color:"#F6AD55", fontSize:22.5, fontFamily:"var(--font-display)", fontWeight:700 }}>16.0%</div>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>Just started (drop-off risk)</div>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHead title="Monthly Engagement" sub="DAU / MAU / Avg session"/>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130, marginBottom:8 }}>
                {engagementData.map(d => {
                  const maxDAU = Math.max(...engagementData.map(x=>x.dau));
                  const h = Math.round((d.dau/maxDAU)*110);
                  return (
                    <div key={d.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>{(d.dau/1000).toFixed(1)}k</span>
                      <div style={{ width:"100%", height:110, display:"flex", alignItems:"flex-end" }}>
                        <div style={{ width:"100%", height:h, background:"#5B6EE1", borderRadius:"4px 4px 0 0", opacity:d.month==="Jun"?1:0.6 }}/>
                      </div>
                      <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label:"Avg DAU",         value:"9,284",    color:"#6E90C9" },
                  { label:"DAU/MAU Ratio",   value:"18.0%",    color:"#6FAE8B" },
                  { label:"Avg Session",     value:"10.2 min", color:"#D99A6B" },
                ].map(s => (
                  <div key={s.label} className="text-center px-2 py-2 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)" }}>
                    <div style={{ color:s.color, fontSize:19, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
                    <div style={{ color:"#8A9AB8", fontSize:12.5 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Retention + NPS ── */}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <SectionHead title="Subscription Retention" sub="% of users still active after N months"/>
              <div className="space-y-4">
                {retentionData.map(r => (
                  <div key={r.month}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color:"#E8EDF5", fontSize:16 }}>{r.month}</span>
                      <span style={{ color:r.color, fontSize:16, fontWeight:700, fontFamily:"var(--font-mono)" }}>{r.retained}%</span>
                    </div>
                    <div className="h-3 rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div className="h-3 rounded-full" style={{ width:`${r.retained}%`, background:r.color }}/>
                    </div>
                  </div>
                ))}
                <div className="px-3 py-2 rounded-2xl mt-2" style={{ background:"rgba(91,110,225,0.05)" }}>
                  <span style={{ color:"#8A9AB8", fontSize:15 }}>
                    Industry benchmark (legacy planning): 58–65% at Month 12. FPD at <strong style={{ color:"#D99A6B" }}>68.2%</strong> — above average.
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <SectionHead title="Net Promoter Score (NPS)" sub={`Score: ${npsData.score} — Industry avg: 32`}/>
              {/* NPS gauge */}
              <div className="text-center py-4">
                <div style={{ fontFamily:"var(--font-display)", fontSize:80, lineHeight:1,
                  color: npsData.score >= 50 ? "#D99A6B" : npsData.score >= 30 ? "#F6AD55" : "#FC8181" }}>
                  {npsData.score}
                </div>
                <div style={{ color:"#D99A6B", fontSize:17.5, fontWeight:600, marginTop:4 }}>
                  {npsData.score >= 50 ? "Excellent" : npsData.score >= 30 ? "Good" : "Needs Improvement"}
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label:"Promoters (9–10)", pct:npsData.promoters, color:"#D99A6B", desc:"Would recommend" },
                  { label:"Passives (7–8)",   pct:npsData.passives,  color:"#F6AD55", desc:"Neutral" },
                  { label:"Detractors (0–6)", pct:npsData.detractors,color:"#FC8181", desc:"At churn risk" },
                ].map(n => (
                  <HorizBar key={n.label} label={n.label} pct={n.pct} color={n.color} subtext={n.desc}/>
                ))}
              </div>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden mt-4">
                <div style={{ flex:npsData.promoters, background:"#48BB78" }}/>
                <div style={{ flex:npsData.passives,  background:"#F6AD55" }}/>
                <div style={{ flex:npsData.detractors,background:"#FC8181" }}/>
              </div>
            </Card>
          </div>

          {/* ── Platform health KPIs ── */}
          <Card>
            <SectionHead title="Platform Health Metrics"/>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label:"Monthly Churn Rate",      value:"2.3%",      sub:"↓ 0.4% from last mo", color:"#D99A6B" },
                { label:"Annual Churn Rate",        value:"15.8%",     sub:"Industry avg: 24%",    color:"#D99A6B" },
                { label:"Avg Revenue per User",     value:"$27.40",    sub:"ARPU monthly",          color:"#6E90C9" },
                { label:"Customer Lifetime Value",  value:"$1,942",    sub:"At 12% annual churn",   color:"#6FAE8B" },
                { label:"$199 Fee Adoption",        value:"18.7%",     sub:"Of total users",        color:"#F6AD55" },
                { label:"Support Tickets (Jun)",    value:"284",       sub:"Avg 9.4/day",           color:"#6FAE8B" },
                { label:"Avg Resolution Time",      value:"4.2 hrs",   sub:"Ticket-to-close",       color:"#D99A6B" },
                { label:"White Glove Clients",      value:"3",         sub:"Active concierge",      color:"#6FAE8B" },
                { label:"Verified ID Contacts",     value:"12,841",    sub:"23.5% of contact pool", color:"#6E90C9" },
                { label:"Avg Vault Documents",      value:"11.4",      sub:"Per active user",       color:"#6FAE8B" },
                { label:"Storage Overage Rate",     value:"8.4%",      sub:"Users over plan limit", color:"#F6AD55" },
                { label:"2FA Enabled",              value:"44.1%",     sub:"Security adoption",     color:"#D99A6B" },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.08)" }}>
                  <div style={{ color:m.color, fontSize:25, fontFamily:"var(--font-display)", fontWeight:700 }}>{m.value}</div>
                  <div style={{ color:"#E8EDF5", fontSize:14, fontWeight:500, marginTop:2 }}>{m.label}</div>
                  <div style={{ color:"#8A9AB8", fontSize:12.5, marginTop:1 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:8 }}>Revenue — 6 Months (MRR + Overage)</h3>
              <div className="flex items-center gap-4 mb-4">
                {[{color:"#6E90C9",label:"MRR"},{color:"#6FAE8B",label:"Overage"}].map(l=>(
                  <div key={l.label} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:2,background:l.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{l.label}</span></div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:180 }}>
                {revenueData.map((d,i) => {
                  const maxMrr = Math.max(...revenueData.map(x=>x.mrr));
                  const mrrH = Math.round((d.mrr/maxMrr)*140);
                  const ovH = Math.round((d.overage/maxMrr)*140);
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <div style={{display:"flex",alignItems:"flex-end",gap:2,height:140,width:"100%"}}>
                        <div style={{flex:1,background:"#5B6EE1",borderRadius:"3px 3px 0 0",height:mrrH,opacity:0.85}}/>
                        <div style={{flex:1,background:"#5BA7D6",borderRadius:"3px 3px 0 0",height:ovH,opacity:0.85}}/>
                      </div>
                      <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:16 }}>Plan Distribution</h3>
              <div className="space-y-3">
                {planDist.map(p => {
                  const total = planDist.reduce((s,x)=>s+x.value,0);
                  const pct = Math.round((p.value/total)*100);
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
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:8 }}>User Growth vs Churn</h3>
              <div className="flex items-center gap-4 mb-4">
                {[{color:"#6E90C9",label:"New Users"},{color:"#FC8181",label:"Churned"}].map(l=>(
                  <div key={l.label} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:2,background:l.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{l.label}</span></div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:160 }}>
                {userGrowth.map(d => {
                  const maxNew = Math.max(...userGrowth.map(x=>x.new));
                  return (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                      <div style={{display:"flex",alignItems:"flex-end",gap:2,height:140,width:"100%"}}>
                        <div style={{flex:1,background:"#5B6EE1",borderRadius:"3px 3px 0 0",height:Math.round((d.new/maxNew)*130),opacity:0.85}}/>
                        <div style={{flex:1,background:"#FC8181",borderRadius:"3px 3px 0 0",height:Math.round((d.churn/maxNew)*130),opacity:0.85}}/>
                      </div>
                      <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:16 }}>ID Verification Queue</h3>
              {pendingVerifications.length > 0 && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-2xl" style={{background:"rgba(246,173,85,0.08)",border:"1px solid rgba(246,173,85,0.25)"}}>
                  <Clock size={13} color="#F6AD55"/>
                  <span style={{color:"#F6AD55",fontSize:16}}>{pendingVerifications.length} contacts awaiting ID review</span>
                </div>
              )}
              <div className="space-y-2">
                {pendingVerifications.map(v=>(
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-2xl" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.1)"}}>
                    <div>
                      <div style={{color:"#E8EDF5",fontSize:16}}>{v.contact}</div>
                      <div style={{color:"#8A9AB8",fontSize:14}}>For: {v.forUser} · {v.type} · {v.submitted}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-xl text-xs" style={{background:"rgba(72,187,120,0.15)",color:"#D99A6B",fontWeight:700}}>Approve</button>
                      <button className="px-3 py-1 rounded-xl text-xs" style={{background:"rgba(252,129,129,0.12)",color:"#FC8181"}}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={{...GLASS}}>
              <Download size={13} color="#FFFFFF"/><span style={{color:"#6E90C9"}}>Export CSV</span>
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(91,110,225,0.14)"}}>
            <div className="grid px-5 py-3" style={{gridTemplateColumns:"auto 1fr auto auto auto auto auto auto",background:"rgba(10,10,15,0.9)",borderBottom:"1px solid rgba(91,110,225,0.1)",gap:12,alignItems:"center"}}>
              {["ID","User","Plan","Storage","Contacts","Referrals","Status","Actions"].map(h=>(
                <div key={h} style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{h.toUpperCase()}</div>
              ))}
            </div>
            {filteredUsers.map((user,i)=>(
              <div key={user.id} className="grid px-5 py-3 items-center border-b" style={{gridTemplateColumns:"auto 1fr auto auto auto auto auto auto",background:i%2===0?"transparent":"rgba(255,255,255,0.025)",borderColor:"rgba(91,110,225,0.06)",gap:12}}>
                <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{user.id}</span>
                <div>
                  <div style={{color:"#E8EDF5",fontSize:16}}>{user.name}</div>
                  <div style={{color:"#8A9AB8",fontSize:14}}>{user.email}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs" style={{background:"rgba(91,110,225,0.1)",color:"#6E90C9",...MONO,fontSize:12.5}}>{user.plan}</span>
                <span style={{color:"#E8EDF5",fontSize:15,...MONO}}>{user.storage} GB</span>
                <span style={{color:"#E8EDF5",fontSize:15,...MONO}}>{user.contacts}</span>
                <span style={{color:"#6E90C9",fontSize:15,...MONO}}>{user.referrals}</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:user.status==="active"?"rgba(72,187,120,0.12)":"rgba(252,129,129,0.12)",color:user.status==="active"?"#D99A6B":"#FC8181",...MONO,fontSize:11}}>{user.status.toUpperCase()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setSelectedUser(user)} style={{color:"#6E90C9"}}><Eye size={13}/></button>
                  <button style={{color:"#8A9AB8"}}><Edit size={13}/></button>
                  <button style={{color:"#FC8181"}}><XCircle size={13}/></button>
                </div>
              </div>
            ))}
          </div>
          <div style={{color:"#8A9AB8",fontSize:15,...MONO}}>Showing {filteredUsers.length} of 51,490 users</div>

          {/* User detail modal — Overview / Edit Account / Billing / Security */}
          {selectedUser && (
            <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
          )}
        </div>
      )}

      {/* REVENUE */}
      {tab === "revenue" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{label:"Jun MRR",value:"$112,340",sub:"+22.1% MoM",color:"#6E90C9"},{label:"Jun Overage",value:"$5,212",sub:"52,120 GB billed",color:"#6FAE8B"},{label:"Affiliate Paid",value:"$23,040",sub:"Jun payouts",color:"#D99A6B"},{label:"Partnership Paid",value:"$33,710",sub:"Jun recurring",color:"#F6AD55"}].map(s=>(
              <div key={s.label} className="p-5 rounded-2xl" style={GLASS}>
                <div style={{fontFamily:"var(--font-display)",fontSize:32.5,color:s.color}}>{s.value}</div>
                <div style={{color:"#E8EDF5",fontSize:16,marginTop:4}}>{s.label}</div>
                <div style={{color:"#8A9AB8",fontSize:14,marginTop:2,...MONO}}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5",marginBottom:8}}>Full Revenue Breakdown — 6 Months</h3>
            <div className="flex items-center gap-4 mb-4">
              {[{color:"#6E90C9",label:"Subscriptions"},{color:"#6FAE8B",label:"Overage"},{color:"#D99A6B",label:"Affiliates"}].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5"><div style={{width:10,height:10,borderRadius:2,background:l.color}}/><span style={{color:"#8A9AB8",fontSize:15}}>{l.label}</span></div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:200 }}>
              {revenueData.map(d => {
                const maxV = Math.max(...revenueData.map(x=>x.mrr));
                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                    <div style={{display:"flex",alignItems:"flex-end",gap:2,height:170,width:"100%"}}>
                      <div style={{flex:2,background:"#5B6EE1",borderRadius:"3px 3px 0 0",height:Math.round((d.mrr/maxV)*160),opacity:0.85}}/>
                      <div style={{flex:1,background:"#5BA7D6",borderRadius:"3px 3px 0 0",height:Math.round((d.overage/maxV)*160),opacity:0.85}}/>
                      <div style={{flex:1,background:"#48BB78",borderRadius:"3px 3px 0 0",height:Math.round((d.affiliates/maxV)*160),opacity:0.85}}/>
                    </div>
                    <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STORAGE */}
      {tab === "storage" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-3 gap-5">
            {storageByPlan.map(s=>(
              <div key={s.plan} className="p-6 rounded-2xl" style={GLASS}>
                <div style={{color:"#6E90C9",fontSize:14,...MONO,letterSpacing:"0.1em",marginBottom:8}}>{s.plan.toUpperCase()} PLAN</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:35.5,color:"#E8EDF5"}}>{s.avgUsed} GB</div>
                <div style={{color:"#8A9AB8",fontSize:16,marginBottom:12}}>avg. used of {s.limit} GB limit</div>
                <div className="h-2 rounded-full" style={{background:"rgba(91,110,225,0.1)"}}>
                  <div className="h-2 rounded-full" style={{width:`${(s.avgUsed/s.limit)*100}%`,background:"linear-gradient(90deg,#5B6EE1,#5B6EE1)",boxShadow:"0 0 8px rgba(91,110,225,0.4)"}}/>
                </div>
                <div style={{color:"#8A9AB8",fontSize:14,marginTop:6,...MONO}}>{Math.round((s.avgUsed/s.limit)*100)}% average utilization</div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5",marginBottom:16}}>Platform Storage Totals</h3>
            <div className="grid grid-cols-4 gap-4">
              {[{label:"Total Data Stored",value:"428.4 TB",color:"#6E90C9"},{label:"Total Overage Billed",value:"52,120 GB",color:"#6FAE8B"},{label:"Avg per User",value:"12.4 GB",color:"#D99A6B"},{label:"Storage Revenue/GB",value:"$0.10",color:"#F6AD55"}].map(s=>(
                <div key={s.label} className="p-4 rounded-2xl" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.1)"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:27.5,color:s.color}}>{s.value}</div>
                  <div style={{color:"#8A9AB8",fontSize:15,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION */}
      {tab === "verification" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[{label:"Pending Review",value:3,color:"#F6AD55"},{label:"Approved Today",value:7,color:"#D99A6B"},{label:"Rejected Today",value:1,color:"#FC8181"},{label:"Avg Review Time",value:"4.2h",color:"#6E90C9"}].map(s=>(
              <div key={s.label} className="p-5 rounded-2xl" style={GLASS}>
                <div style={{fontFamily:"var(--font-display)",fontSize:35.5,color:s.color}}>{s.value}</div>
                <div style={{color:"#8A9AB8",fontSize:16,marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>
          {pendingVerifications.map(v=>(
            <div key={v.id} className="p-6 rounded-2xl" style={GLASS}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div style={{fontFamily:"var(--font-display)",fontSize:20,color:"#E8EDF5",marginBottom:2}}>{v.contact}</div>
                  <div style={{color:"#8A9AB8",fontSize:16}}>Submitted for: <strong style={{color:"#E8EDF5"}}>{v.forUser}</strong> · {v.type} · Submitted {v.submitted}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs" style={{background:"rgba(246,173,85,0.12)",color:"#F6AD55",...MONO,fontWeight:700}}>PENDING REVIEW</span>
              </div>
              <div className="flex items-center gap-2 mb-4 p-4 rounded-2xl" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.1)"}}>
                <div style={{color:"#8A9AB8",fontSize:16}}>⚠ Government ID document is uploaded and waiting for admin review. Click "View Document" to inspect the submitted ID.</div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold" style={{background:"rgba(72,187,120,0.12)",color:"#D99A6B",border:"1px solid rgba(72,187,120,0.25)"}}>
                  <CheckCircle size={14}/> Approve
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold" style={{background:"rgba(252,129,129,0.1)",color:"#FC8181",border:"1px solid rgba(252,129,129,0.2)"}}>
                  <XCircle size={14}/> Reject
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={{background:"rgba(91,110,225,0.08)",color:"#6E90C9"}}>
                  <Eye size={14}/> View Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAYOUTS */}
      {tab === "payouts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{label:"Pending",value:"$4,396.58",n:3,color:"#F6AD55"},{label:"Processing",value:"$1,049.74",n:1,color:"#6E90C9"},{label:"Paid This Month",value:"$53,277.22",n:22,color:"#D99A6B"}].map(s=>(
              <div key={s.label} className="p-5 rounded-2xl" style={GLASS}>
                <div style={{fontFamily:"var(--font-display)",fontSize:32.5,color:s.color}}>{s.value}</div>
                <div style={{color:"#E8EDF5",fontSize:16,marginTop:4}}>{s.label}</div>
                <div style={{color:"#8A9AB8",fontSize:14,marginTop:2,...MONO}}>{s.n} recipients</div>
              </div>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5"}}>Pending Payouts</h3>
              <button className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm" style={{background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)",color:"#F0F4FA",fontWeight:700,boxShadow:"0 0 16px rgba(91,110,225,0.3)"}}>Process All Pending</button>
            </div>
            {[{id:"PAY-0912",name:"James Doe",type:"Affiliate",amount:189.50,method:"ACH"},{id:"PAY-0911",name:"Sarah Chen",type:"Affiliate",amount:847.20,method:"ACH"},{id:"PAY-0910",name:"Greenfield Law Offices",type:"Partnership",amount:3359.88,method:"Wire"}].map((p,i)=>(
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl mb-2" style={{background:"rgba(91,110,225,0.04)",border:"1px solid rgba(91,110,225,0.08)"}}>
                <div>
                  <div style={{color:"#E8EDF5",fontSize:16}}>{p.name}</div>
                  <div style={{color:"#8A9AB8",fontSize:14,...MONO}}>{p.id} · {p.type} · {p.method}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{fontFamily:"var(--font-display)",fontSize:22.5,color:"#6E90C9"}}>${p.amount.toFixed(2)}</span>
                  <button className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{background:"rgba(72,187,120,0.15)",color:"#D99A6B"}}>Process</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {tab === "audit" && (
        <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(91,110,225,0.14)"}}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{background:"rgba(10,10,15,0.9)",borderColor:"rgba(91,110,225,0.1)"}}>
            <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5"}}>System Audit Log</h3>
            <button className="flex items-center gap-2 text-sm" style={{color:"#6E90C9",...MONO,fontSize:15}}><Download size={13}/> Export</button>
          </div>
          {auditLogs.map((log,i)=>{
            const sc = {info:"#8A9AB8",warning:"#F6AD55",critical:"#FC8181"}[log.severity] ?? "#8A9AB8";
            return (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 border-b" style={{background:i%2===0?"transparent":"rgba(255,255,255,0.025)",borderColor:"rgba(91,110,225,0.06)"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:`0 0 6px ${sc}`,flexShrink:0}}/>
                <div style={{color:"#8A9AB8",fontSize:12.5,...MONO,flexShrink:0,minWidth:80}}>{log.id}</div>
                <div style={{color:"#8A9AB8",fontSize:15,flexShrink:0,minWidth:140,...MONO}}>{log.user}</div>
                <div style={{color:"#E8EDF5",fontSize:16,flex:1}}>{log.action}</div>
                <div style={{color:"#8A9AB8",fontSize:15,...MONO,flexShrink:0}}>{log.target}</div>
                <div style={{color:"#8A9AB8",fontSize:14,...MONO,flexShrink:0}}>{log.time}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* $199 LEGACY CONTINUATION FEE TAB */}
      {tab === "continuation" && (
        <div className="space-y-5">
          {/* Admin config */}
          <div className="p-6 rounded-2xl" style={GLASS}>
            <div className="flex items-center gap-2 mb-5">
              <DollarSign size={16} color="#FFFFFF"/>
              <h3 style={{fontFamily:"var(--font-display)",fontSize:20,color:"#E8EDF5"}}>Legacy Continuation Fee Configuration</h3>
              <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{background:"rgba(246,173,85,0.1)",color:"#F6AD55",border:"1px solid rgba(246,173,85,0.25)",...MONO,fontSize:11}}>REAL-TIME — UPDATES VIA SUPABASE</span>
            </div>
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              {[{label:"Current Fee Amount",value:"$199.00",color:"#6E90C9"},{label:"Activation Window",value:"24 Months",color:"#D99A6B"},{label:"Total Revenue Collected",value:"$597.00",color:"#6FAE8B"}].map(s=>(
                <div key={s.label} className="p-4 rounded-2xl" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(91,110,225,0.1)"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:27.5,color:s.color}}>{s.value}</div>
                  <div style={{color:"#8A9AB8",fontSize:15,marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label style={{color:"#8A9AB8",fontSize:12.5,...MONO,display:"block",marginBottom:4}}>FEE AMOUNT ($) — Shown to users on payment page</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{background:"rgba(255,255,255,0.06)",border:"2px solid rgba(91,110,225,0.2)"}}>
                  <DollarSign size={14} color="#FFFFFF"/>
                  <input defaultValue="199.00" type="number" step="0.01" style={{background:"transparent",border:"none",outline:"none",color:"#E8EDF5",fontSize:22.5,fontWeight:700,...MONO,width:"100%"}} onChange={() => toast.info("Save to update fee amount in Supabase")}/>
                </div>
              </div>
              <div>
                <label style={{color:"#8A9AB8",fontSize:12.5,...MONO,display:"block",marginBottom:4}}>ACTIVATION WINDOW (MONTHS) — After death certification</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{background:"rgba(255,255,255,0.06)",border:"2px solid rgba(91,110,225,0.2)"}}>
                  <Clock size={14} color="#FFFFFF"/>
                  <input defaultValue="24" type="number" step="1" min="1" max="120" style={{background:"transparent",border:"none",outline:"none",color:"#E8EDF5",fontSize:22.5,fontWeight:700,...MONO,width:"100%"}} onChange={() => toast.info("Save to update period in Supabase")}/>
                </div>
              </div>
            </div>
            <button onClick={() => toast.success("Legacy Continuation Fee settings saved to Supabase admin_settings")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm"
              style={{background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)",color:"#fff",boxShadow:"0 4px 12px rgba(91,110,225,0.3)"}}>
              Save Configuration to Supabase
            </button>
          </div>

          {/* Paid fees table */}
          <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(91,110,225,0.1)"}}>
            <div className="px-5 py-3 border-b" style={{background:"rgba(255,255,255,0.08)",borderColor:"rgba(91,110,225,0.08)"}}>
              <h3 style={{fontFamily:"var(--font-display)",fontSize:19,color:"#E8EDF5"}}>All Legacy Continuation Fee Payments</h3>
            </div>
            <div className="grid px-5 py-3" style={{gridTemplateColumns:"auto 1fr auto auto auto auto auto",background:"rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(91,110,225,0.2)",gap:16,alignItems:"center"}}>
              {["ID","User","Paid By","Date","Amount","Status","Action"].map(h=>(
                <div key={h} style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{h.toUpperCase()}</div>
              ))}
            </div>
            {[
              {id:"LCF-0012",user:"James Doe",email:"james.doe@email.com",plan:"Legacy Archive",paidBy:"Account Owner",date:"Jun 8, 2026",amount:"$199",status:"paid",activated:false},
              {id:"LCF-0011",user:"Patricia Wells",email:"p.wells@email.com",plan:"Legacy Pro",paidBy:"Legacy Contact",date:"May 22, 2026",amount:"$199",status:"paid",activated:false},
              {id:"LCF-0010",user:"Robert Kim",email:"r.kim@email.com",plan:"Foundation",paidBy:"Account Owner",date:"Apr 10, 2026",amount:"$199",status:"activated",activated:true,expires:"Apr 10, 2028"},
            ].map((fee,i) => (
              <div key={fee.id} className="grid px-5 py-4 items-center border-b" style={{gridTemplateColumns:"auto 1fr auto auto auto auto auto",background:i%2===0?"transparent":"rgba(255,255,255,0.025)",borderColor:"rgba(91,110,225,0.06)",gap:16}}>
                <span style={{color:"#8A9AB8",fontSize:12.5,...MONO}}>{fee.id}</span>
                <div>
                  <div style={{color:"#E8EDF5",fontSize:16,fontWeight:500}}>{fee.user}</div>
                  <div style={{color:"#8A9AB8",fontSize:14}}>{fee.email} · {fee.plan}</div>
                </div>
                <span style={{color:"#8A9AB8",fontSize:15}}>{fee.paidBy}</span>
                <span style={{color:"#8A9AB8",fontSize:15}}>{fee.date}</span>
                <span style={{color:"#6E90C9",fontSize:16,fontWeight:700,...MONO}}>{fee.amount}</span>
                <div>
                  {fee.activated
                    ? <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:"rgba(91,167,214,0.12)",color:"#6FAE8B",...MONO,fontSize:11}}>ACTIVATED · Expires {fee.expires}</span>
                    : <span className="px-2 py-0.5 rounded text-xs font-bold" style={{background:"rgba(72,187,120,0.12)",color:"#D99A6B",...MONO,fontSize:11}}>PAID · AWAITING ACTIVATION</span>
                  }
                </div>
                {!fee.activated
                  ? <button onClick={() => toast.success(`Activated for ${fee.user} — 24-month window started`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold"
                      style={{background:"rgba(91,167,214,0.12)",color:"#6FAE8B",border:"1px solid rgba(91,167,214,0.25)"}}>
                      🛡 Activate
                    </button>
                  : <span style={{color:"#8A9AB8",fontSize:14}}>Active ✓</span>
                }
              </div>
            ))}
          </div>
          <div className="px-4 py-3 rounded-2xl border" style={{background:"rgba(91,110,225,0.03)",borderColor:"rgba(91,110,225,0.12)"}}>
            <div style={{color:"#6E90C9",fontSize:14,...MONO,fontWeight:700,marginBottom:4}}>ACTIVATION PROCESS</div>
            <div style={{color:"#8A9AB8",fontSize:15,lineHeight:1.8}}>1. User or legacy contact pays the $199 fee via Stripe. 2. Admin receives notification. 3. When a death certificate is submitted and verified, admin clicks "Activate" above. 4. The vault stays fully accessible to all verified legacy contacts for the configured period. 5. Stripe webhook updates the Supabase <code>legacy_continuation_fees</code> table automatically.</div>
          </div>
        </div>
      )}

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
          <PushNotificationCenter/>
        </div>
      )}

      {/* ADMIN TEAM & ROLES TAB */}
      {tab === "admin_roles" && <AdminRoles/>}
      {tab === "reports"     && <ReportsDownloads/>}
      {tab === "system_health" && <SystemHealth/>}
      {tab === "admin_ai"    && (
        <div className="p-6" style={{ maxWidth:900 }}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Bot size={16} color="#FFFFFF"/>
              <span style={{ color:"#6FAE8B", fontSize:14, fontFamily:"var(--font-mono)", letterSpacing:"0.1em" }}>COMMAND CENTER · ADMIN AI ASSISTANT</span>
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:27.5, color:"#E8EDF5" }}>Admin AI Assistant</h2>
            <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
              Your Command Center expert. Ask anything about tabs, workflows, reports, ID verification, vault activation, team roles, White Glove billing, or getting started as a new hire.
            </p>
          </div>
          <AdminAIAgent inline={true}/>
        </div>
      )}

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
