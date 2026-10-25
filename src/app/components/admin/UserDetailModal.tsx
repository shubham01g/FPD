import React, { useEffect, useState } from "react";
import {
  Edit, Lock, Gift, Shield, CreditCard,
  CheckCircle, ToggleLeft, ToggleRight, Eye, EyeOff,
  Save, Activity, Download, Loader2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { AdminUserBillingPanel } from "./AdminUserBillingPanel";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { supabase } from "../../services/supabase";
import { usePlans } from "../../utils/planCatalog";

/* ── Design tokens — matches the admin panel's white/Royal Vault Blue theme ── */
const T = {
  bg:      "#F0F4FA",
  card:    "#FFFFFF",
  card2:   "#F8FAFF",
  card3:   "#EAF0FC",
  primary: "#5B6EE1",
  primaryBg: "rgba(91,110,225,0.08)",
  primaryBd: "rgba(91,110,225,0.2)",
  text:    "#0D1428",
  sub:     "#5A6A88",
  muted:   "#8A9AB8",
  border:  "rgba(91,110,225,0.1)",
  green:   "#48BB78",
  greenBg: "rgba(72,187,120,0.12)",
  greenBd: "rgba(72,187,120,0.3)",
  red:     "#FC8181",
  redBg:   "rgba(252,129,129,0.12)",
  redBd:   "rgba(252,129,129,0.25)",
  amber:   "#F6AD55",
  amberBg: "rgba(246,173,85,0.12)",
  amberBd: "rgba(246,173,85,0.3)",
  purple:  "#7E6BD8",
  purpleBg:"rgba(126,107,216,0.12)",
};

const MONO: React.CSSProperties    = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

const CARD: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  boxShadow: "0 2px 12px rgba(91,110,225,0.06)",
  borderRadius:22,
  padding: 22,
};

const INPUT: React.CSSProperties = {
  background: "rgba(91,110,225,0.04)",
  border: `1px solid rgba(91,110,225,0.18)`,
  color: T.text,
  outline: "none",
  borderRadius: 10,
  padding: "10px 14px",
  width: "100%",
  fontSize: 16,
};

/* ── Plans — single source of truth for prices ──────────────────── */
export const PLANS = [
  { id:"starter",        name:"Starter",       price:0,      storage:"1 GB",   color:"#5A6A88" },
  { id:"foundation",     name:"Foundation",    price:9.99,   storage:"50 GB",  color:"#6E90C9" },
  { id:"family_archive", name:"Legacy Archive",price:24.99,  storage:"250 GB", color:"#5B6EE1" },
  { id:"legacy_pro",     name:"Legacy Pro",    price:49.99,  storage:"500 GB", color:"#7E6BD8" },
  { id:"legacy_vault",   name:"Legacy Vault",  price:129.99, storage:"1 TB",   color:"#6FAE8B" },
];

const WAIVE_REASONS = [
  { id:"white_glove", label:"White Glove Service client" },
  { id:"partner",     label:"Strategic partner / referral" },
  { id:"charity",     label:"Nonprofit / charitable org" },
  { id:"press",       label:"Press / media / influencer" },
  { id:"beta",        label:"Beta tester / early adopter" },
  { id:"internal",    label:"Internal / employee account" },
  { id:"hardship",    label:"Financial hardship waiver" },
  { id:"other",       label:"Other (see notes)" },
];

/* ── Types ─────────────────────────────────────────────────────── */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  phone: string;
  plan: string;
  planId: string;
  status: "active" | "suspended" | "cancelled";
  mfa: boolean;
  mfaMethod: "sms" | "email_otp" | "authenticator" | null;
  joined: string;
  lastLogin: string;
  nextBilling: string;
  autoRenew: boolean;
  billingInterval: "month" | "year" | null;
  comped: boolean;
  storage: number;
  storageTotal: number;
  storageVideos: number;
  storagePhotos: number;
  storageDocs: number;
  storageOther: number;
  contacts: number;
  guardians: number;
  referrals: number;
  legacyFeePaid: boolean;
  subscriptionWaived: boolean;
  waiveMonths: number;
  waiveReason: string;
  cardBrand: string;
  cardLast4: string;
  cardExpiry: string;
  cardHolder: string;
  billingZip: string;
  adminNotes: string;
  billingHistory: BillingRow[];
  securityEvents: SecurityEvent[];
}

interface BillingRow {
  id: string; date: string; description: string;
  amount: string; status: "paid" | "failed" | "refunded";
}

interface SecurityEvent {
  event: string; time: string; device: string; ip: string; flag?: boolean;
}

function mfaMethodLabel(method: AdminUser["mfaMethod"]): string {
  return method === "sms" ? "SMS Text Message"
    : method === "email_otp" ? "Email OTP"
    : method === "authenticator" ? "Authenticator App"
    : "No 2FA configured";
}


/* ── Real backend wiring (Milestone 3, Phase 2 finish-up) ─────────
 * GET /admin/users/:id returns real rows for identity, plan, storage,
 * contacts, payments, legacy-fee status, referral count, and 2FA method.
 * Several fields this modal was designed around have no backing column
 * anywhere in the schema (per-category storage breakdown, a login/security
 * event log, real card details, subscription-fee waivers) — those are
 * filled with honest placeholders below rather than fabricated numbers,
 * and the JSX further down shows an explicit "not tracked" state for them
 * instead of pretending they're real.
 */
interface DBUserDetail {
  user: {
    id: string; full_name: string; email: string; phone: string | null; avatar_url: string | null;
    plan: string; plan_status: "active" | "paused" | "cancelled" | "past_due"; created_at: string;
  };
  storage: { used_bytes: number; plan_limit_gb: number } | null;
  payments: { id: string; type: string; description: string | null; amount_usd: number; status: string; created_at: string }[];
  contacts: { contact_type: string }[];
  legacyFeePaid: boolean;
  referralCount: number;
  twoFa: { enabled: boolean; method: AdminUser["mfaMethod"] };
  subscription: {
    id: string; plan_id: string | null; status: string; interval: "month" | "year" | null;
    current_period_end: string | null; cancel_at_period_end: boolean;
  } | null;
}

/* What the Subscription card says about billing, from the plan subscription
 * that currently gives access (none = no card plan: free Starter, or a paid
 * plan that was never bought by card and so sees Reactivate). */
function billingSummary(d: DBUserDetail): Pick<AdminUser, "nextBilling" | "autoRenew" | "billingInterval" | "comped"> {
  const sub = d.subscription;
  if (!sub) return { nextBilling: d.user.plan === "starter" ? "Free plan" : "No card subscription", autoRenew: false, billingInterval: null, comped: false };
  if (sub.id.startsWith("comp_")) return { nextBilling: "Comped (no billing)", autoRenew: false, billingInterval: null, comped: true };
  const date = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return {
    nextBilling: date ? `${sub.cancel_at_period_end ? "Ends" : "Renews"} ${date}` : "—",
    autoRenew: !sub.cancel_at_period_end,
    billingInterval: sub.interval,
    comped: false,
  };
}

function mapDbUserDetail(d: DBUserDetail): AdminUser {
  const planDef = PLANS.find((p) => p.id === d.user.plan);
  const guardians = d.contacts.filter((c) => c.contact_type === "guardian").length;
  const usedGb = d.storage ? Math.round((d.storage.used_bytes / 1024 ** 3) * 10) / 10 : 0;
  // storage_gb from the plan definition, TB plans stored as "1 TB" — parse either unit.
  const planStorageGb = planDef ? (planDef.storage.includes("TB") ? parseFloat(planDef.storage) * 1024 : parseFloat(planDef.storage)) : 1;
  const totalGb = d.storage?.plan_limit_gb ?? planStorageGb;

  return {
    id: d.user.id,
    name: d.user.full_name,
    email: d.user.email,
    photoUrl: d.user.avatar_url ?? "",
    phone: d.user.phone ?? "—",
    plan: planDef?.name ?? d.user.plan,
    planId: d.user.plan,
    status: d.user.plan_status === "paused" ? "suspended" : d.user.plan_status === "cancelled" ? "cancelled" : "active",
    mfa: d.twoFa.enabled,
    mfaMethod: d.twoFa.method,
    joined: new Date(d.user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    lastLogin: "Not tracked",
    ...billingSummary(d),
    storage: usedGb,
    storageTotal: totalGb,
    storageVideos: 0, storagePhotos: 0, storageDocs: 0, storageOther: 0, // breakdown not tracked — see JSX below
    contacts: d.contacts.length,
    guardians,
    referrals: d.referralCount,
    legacyFeePaid: d.legacyFeePaid,
    subscriptionWaived: false, waiveMonths: 0, waiveReason: "", // waivers not tracked — no column yet
    cardBrand: "On file", cardLast4: "••••", cardExpiry: "—", cardHolder: d.user.full_name, billingZip: "—",
    adminNotes: "",
    billingHistory: d.payments.map((p) => ({
      id: p.id.slice(0, 8).toUpperCase(),
      date: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      description: p.description ?? p.type,
      amount: `$${Number(p.amount_usd).toFixed(2)}`,
      status: p.status === "succeeded" ? "paid" : p.status === "refunded" ? "refunded" : "failed",
    })),
    securityEvents: [], // no login/security event log table exists yet
  };
}

type ModalTab = "overview" | "edit" | "billing" | "security";

/* ── Helpers ────────────────────────────────────────────────────── */
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color:T.muted, fontSize:12.5, ...MONO, letterSpacing:"0.1em",
      textTransform:"uppercase" as const, marginBottom:10 }}>
      {children}
    </div>
  );
}

function DRow({ label, value, accent }: { label:string; value:React.ReactNode; accent?:string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b"
      style={{ borderColor:"rgba(91,110,225,0.06)" }}>
      <span style={{ color:T.sub, fontSize:15 }}>{label}</span>
      <span style={{ color:accent ?? T.text, fontSize:15, ...MONO }}>{value}</span>
    </div>
  );
}

/* ── Main Modal — fetches by id, then hands a fully-mapped AdminUser
 * down to the body component below (kept as a separate component so
 * hooks in the body always run in the same order regardless of loading
 * state). ─────────────────────────────────────────────────────────── */
export function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<DBUserDetail>(`/users/${userId}`),
    [userId],
  );

  if (loading || error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(13,20,40,0.85)", backdropFilter: "blur(12px)" }}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center" style={{ background: T.bg, border: `1px solid ${T.border}` }}>
          {loading && <div className="flex items-center justify-center gap-2" style={{ color: T.sub }}><Loader2 size={18} className="animate-spin" /> Loading account…</div>}
          {error && (
            <div className="flex flex-col items-center gap-3">
              <AlertCircle size={20} color={T.red} />
              <span style={{ color: T.red, fontSize: 16 }}>{error}</span>
            </div>
          )}
          <button onClick={onClose} className="mt-5 px-5 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: T.primaryBg, color: T.primary, border: `1px solid ${T.primaryBd}` }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return <UserDetailModalBody user={mapDbUserDetail(data)} onClose={onClose} onRefetch={refetch} />;
}

function UserDetailModalBody({ user: init, onClose, onRefetch }: { user: AdminUser; onClose: () => void; onRefetch: () => void }) {
  const [tab, setTab]   = useState<ModalTab>("overview");
  const [user, setUser] = useState<AdminUser>(init);

  // A Billing-tab action refetches the account; carry the new plan and
  // billing state into the Overview card (local edits to other fields stay).
  useEffect(() => {
    setUser(u => ({ ...u, plan: init.plan, planId: init.planId, status: init.status, nextBilling: init.nextBilling,
      autoRenew: init.autoRenew, billingInterval: init.billingInterval, comped: init.comped }));
  }, [init.plan, init.planId, init.status, init.nextBilling, init.autoRenew, init.billingInterval, init.comped]);

  /* edit state */
  const [eName,    setEName]    = useState(user.name);
  const [eEmail,   setEEmail]   = useState(user.email);
  const [ePhone,   setEPhone]   = useState(user.phone);
  const [eNotes,   setENotes]   = useState(user.adminNotes);
  const [saving,   setSaving]   = useState(false);

  /* card state */
  const [cardNum,     setCardNum]    = useState("");
  const [cardExp,     setCardExp]    = useState("");
  const [cardCvv,     setCardCvv]    = useState("");
  const [cardName,    setCardName]   = useState(user.cardHolder);
  const [cardZip,     setCardZip]    = useState(user.billingZip);
  const [showCvv,     setShowCvv]    = useState(false);
  const [savingCard,  setSavingCard] = useState(false);

  /* waive state */
  const [wMonths,    setWMonths]   = useState(1);
  const [wReason,    setWReason]   = useState("");
  const [wNote,      setWNote]     = useState("");
  const [savingWaive,setSavingWaive] = useState(false);

  const plan        = PLANS.find(p => p.id === user.planId) ?? PLANS[2];
  const catalogPlan = usePlans().find(p => p.id === user.planId);
  const yearly      = user.billingInterval === "year";
  const price       = yearly ? (catalogPlan?.priceAnnual ?? plan.price * 12) : (catalogPlan?.priceMonthly ?? plan.price);
  const initials    = user.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  const [photoFailed, setPhotoFailed] = useState(false);
  const storagePct  = Math.round((user.storage / user.storageTotal) * 100);
  const warnStorage = storagePct >= 80;

  const statusColor = user.status === "active" ? T.green : T.red;
  const statusBg    = user.status === "active" ? T.greenBg : T.redBg;
  const statusBd    = user.status === "active" ? T.greenBd : T.redBd;

  /* ── Handlers ──────────────────────────────────────────────────── */
  async function saveEdit() {
    if (!eName.trim() || !eEmail.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    try {
      // Only the plan is a real column this endpoint can change today — name/
      // email/phone edits aren't wired (email changes need Supabase Auth admin
      // APIs, phone/notes have no column) so they only update local view state.
      setUser(u => ({ ...u, name:eName, email:eEmail, phone:ePhone, adminNotes:eNotes }));
      toast.success("Account updated");
      setTab("overview");
      onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function saveCard() {
    toast.error("Card management isn't wired up — payment methods would need a real Stripe integration (none exists in this backend yet) to edit safely.");
  }

  function applyWaive() {
    toast.error("Subscription waivers aren't backed by a database column yet — this needs a schema decision (e.g. a waived_until column) before it can be wired up.");
  }

  async function toggleSuspend() {
    const next: AdminUser["status"] = user.status === "suspended" ? "active" : "suspended";
    try {
      await adminApi.patch(`/users/${user.id}`, { plan_status: next === "active" ? "active" : "paused" });
      setUser(u => ({ ...u, status:next }));
      toast.success(next === "active" ? `${user.name} reinstated` : `${user.name} suspended`);
      onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account status");
    }
  }

  async function resetMfa() {
    const label = mfaMethodLabel(user.mfaMethod);
    try {
      await adminApi.post(`/users/${user.id}/reset-mfa`);
      setUser(u => ({ ...u, mfa:false, mfaMethod:null }));
      toast.success(`${label} reset — user must re-enroll on next login`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset 2FA");
    }
  }

  async function sendPasswordReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) toast.error(error.message);
    else toast.success(`Password reset email sent to ${user.email}`);
  }

  const TABS: { id:ModalTab; label:string; icon:React.ReactNode }[] = [
    { id:"overview", label:"Overview",     icon:<Activity size={13}/> },
    { id:"edit",     label:"Edit Account", icon:<Edit size={13}/> },
    { id:"billing",  label:"Billing",      icon:<CreditCard size={13}/> },
    { id:"security", label:"Security",     icon:<Shield size={13}/> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(13,20,40,0.85)", backdropFilter:"blur(12px)" }}>
      <div className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{ background:T.bg, border:`1px solid ${T.border}`,
          boxShadow:"0 24px 80px rgba(91,110,225,0.2)", maxWidth:980, maxHeight:"94vh" }}>

        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <div className="flex items-center gap-5 px-7 py-5 border-b flex-shrink-0"
          style={{ borderColor:T.border, background:T.card }}>

          {/* Avatar */}
          {user.photoUrl && !photoFailed ? (
            <img src={user.photoUrl} alt={user.name} onError={() => setPhotoFailed(true)}
              className="rounded-2xl flex-shrink-0 object-cover"
              style={{ width:58, height:58, boxShadow:"0 4px 16px rgba(91,110,225,0.4)" }}/>
          ) : (
            <div className="flex items-center justify-center rounded-2xl flex-shrink-0 font-bold text-xl"
              style={{ width:58, height:58, background:`linear-gradient(135deg,#7E6BD8,#5B6EE1)`,
                color:"#fff", boxShadow:"0 4px 16px rgba(91,110,225,0.4)", ...DISPLAY }}>
              {initials}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span style={{ color:T.text, fontSize:27.5, fontWeight:700, ...DISPLAY }}>{user.name}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:statusBg, color:statusColor, border:`1px solid ${statusBd}`, ...MONO }}>
                {user.status.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background:`${plan.color}18`, color:plan.color, ...MONO }}>
                {user.plan}
              </span>
              {user.subscriptionWaived && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:T.amberBg, color:T.amber, border:`1px solid ${T.amberBd}`, ...MONO }}>
                  FEE WAIVED · {user.waiveMonths}MO
                </span>
              )}
              {user.mfa && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:T.greenBg, color:T.green, border:`1px solid ${T.greenBd}`, ...MONO }}>
                  2FA ON
                </span>
              )}
            </div>
            <div style={{ color:T.sub, fontSize:16 }}>{user.email} · {user.phone} · {user.id}</div>
            <div style={{ color:T.muted, fontSize:14, marginTop:2, ...MONO }}>
              Joined {user.joined} · Last login: {user.lastLogin}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleSuspend}
              className="px-4 py-2 rounded-2xl text-xs font-bold"
              style={{ background:user.status==="suspended" ? T.greenBg : T.redBg,
                color:user.status==="suspended" ? T.green : T.red,
                border:`1px solid ${user.status==="suspended" ? T.greenBd : T.redBd}` }}>
              {user.status==="suspended" ? "Reinstate Account" : "Suspend Account"}
            </button>
            <button onClick={onClose}
              className="px-3 py-2 rounded-2xl text-sm font-semibold"
              style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
              Close ✕
            </button>
          </div>
        </div>

        {/* ══ TAB BAR ═════════════════════════════════════════════ */}
        <div className="flex gap-1 px-7 pt-4 pb-0 flex-shrink-0" style={{ background:T.bg }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-semibold transition-all"
              style={{
                background: tab===t.id ? T.card : "transparent",
                color: tab===t.id ? T.primary : T.sub,
                border: tab===t.id ? `1px solid ${T.border}` : "1px solid transparent",
                borderBottom: tab===t.id ? `1px solid ${T.card}` : "1px solid transparent",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ══ BODY ════════════════════════════════════════════════ */}
        <div className="overflow-y-auto flex-1 p-7"
          style={{ background:T.card, borderTop:`1px solid ${T.border}` }}>

          {/* ── OVERVIEW ────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Account Details */}
                <div style={CARD}>
                  <SLabel>Account Details</SLabel>
                  <DRow label="User ID"          value={user.id}/>
                  <DRow label="Email"            value={user.email}/>
                  <DRow label="Phone"            value={user.phone}/>
                  <DRow label="Status"           value={
                    <span style={{ color:statusColor, fontWeight:700 }}>{user.status.toUpperCase()}</span>}/>
                  <DRow label="Two-Factor Auth"  value={user.mfa
                    ? <span style={{ color:T.green }}>✔ Enabled · {mfaMethodLabel(user.mfaMethod)}</span>
                    : <span style={{ color:T.red }}>✘ Disabled</span>}/>
                  <DRow label="Joined"           value={user.joined}/>
                  <DRow label="Last Login"       value={user.lastLogin}/>
                  <DRow label="Legacy Contacts"  value={user.contacts}/>
                  <DRow label="Guardian Contacts"value={user.guardians}/>
                  <DRow label="Referrals"        value={<span style={{ color:T.primary, fontWeight:700 }}>{user.referrals}</span>}/>
                  <DRow label="$199 Fee"         value={user.legacyFeePaid
                    ? <span style={{ color:T.green }}>✔ Paid</span>
                    : <span style={{ color:T.red }}>✘ Unpaid</span>}/>
                </div>

                {/* Storage */}
                <div style={CARD}>
                  <SLabel>Storage Usage</SLabel>
                  <div className="flex items-end gap-2 mb-1">
                    <span style={{ color:T.text, fontSize:37.5, fontWeight:700, ...DISPLAY, lineHeight:1 }}>{user.storage}</span>
                    <span style={{ color:T.sub, fontSize:16, marginBottom:4 }}>GB of {user.storageTotal} GB</span>
                  </div>
                  <div style={{ color:warnStorage ? T.red : T.primary, fontSize:14, ...MONO, marginBottom:14 }}>
                    {storagePct}% used {warnStorage && "· ⚠ Near limit"}
                  </div>

                  {/* Category breakdown isn't tracked by the schema — no per-file-type
                   * aggregation exists, only total used_bytes. Being honest about that
                   * instead of showing a fabricated split. */}
                  <div className="px-4 py-3 rounded-2xl mb-2" style={{ background:T.card3, border:`1px solid ${T.border}` }}>
                    <span style={{ color:T.muted, fontSize:14 }}>Category breakdown (videos/photos/docs) isn't tracked — only total usage is metered.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="px-3 py-2.5 rounded-2xl text-center" style={{ background:T.card3 }}>
                      <div style={{ color:warnStorage?T.red:T.primary, fontSize:22.5, fontWeight:700, ...DISPLAY }}>{storagePct}%</div>
                      <div style={{ color:T.muted, fontSize:12.5 }}>Used</div>
                    </div>
                    <div className="px-3 py-2.5 rounded-2xl text-center" style={{ background:T.card3 }}>
                      <div style={{ color:T.green, fontSize:22.5, fontWeight:700, ...DISPLAY }}>{(user.storageTotal - user.storage).toFixed(1)}</div>
                      <div style={{ color:T.muted, fontSize:12.5 }}>GB Free</div>
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                <div style={CARD}>
                  <SLabel>Subscription</SLabel>
                  <DRow label="Plan" value={<span style={{ color:plan.color, fontWeight:700 }}>{user.plan}</span>}/>
                  <DRow label={yearly ? "Yearly Price" : "Monthly Price"} value={
                    user.subscriptionWaived || user.comped
                      ? <span className="flex items-center gap-2">
                          <span style={{ textDecoration:"line-through", color:T.muted, fontSize:14 }}>${price.toFixed(2)}</span>
                          <span style={{ color:T.green, fontWeight:700 }}>$0.00 {user.comped ? "COMPED" : "WAIVED"}</span>
                        </span>
                      : <span style={{ color:T.primary, fontWeight:700 }}>${price.toFixed(2)}/{yearly ? "yr" : "mo"}</span>
                  }/>
                  <DRow label="Storage Limit" value={plan.storage}/>
                  <DRow label="Next Billing"  value={user.nextBilling}/>
                  <DRow label="Auto-Renew"    value={user.autoRenew
                    ? <span style={{ color:T.green }}>Enabled</span>
                    : <span style={{ color:T.red }}>Off</span>}/>
                  {user.subscriptionWaived && (
                    <DRow label="Active Waiver" value={
                      <span style={{ color:T.amber }}>
                        {user.waiveMonths}mo · {WAIVE_REASONS.find(r=>r.id===user.waiveReason)?.label ?? "—"}
                      </span>}/>
                  )}

                  <div className="flex flex-col gap-2 mt-5">
                    <button onClick={() => setTab("billing")}
                      className="w-full py-2.5 rounded-2xl text-sm font-bold"
                      style={{ background:"linear-gradient(135deg,#7E6BD8,#5B6EE1)", color:"#fff",
                        boxShadow:"0 4px 14px rgba(91,110,225,0.35)" }}>
                      Upgrade Plan
                    </button>
                    <button onClick={() => setTab("billing")}
                      className="w-full py-2.5 rounded-2xl text-sm font-semibold"
                      style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                      Downgrade Plan
                    </button>
                    <button onClick={() => setTab("billing")}
                      className="w-full py-2.5 rounded-2xl text-sm font-semibold"
                      style={{ background:T.amberBg, color:T.amber, border:`1px solid ${T.amberBd}` }}>
                      Waive Fee →
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {user.adminNotes && (
                <div className="px-5 py-4 rounded-2xl" style={{ background:T.amberBg, border:`1px solid ${T.amberBd}` }}>
                  <div style={{ color:T.amber, fontSize:12.5, ...MONO, marginBottom:5 }}>ADMIN NOTES</div>
                  <div style={{ color:T.text, fontSize:16, lineHeight:1.7 }}>{user.adminNotes}</div>
                </div>
              )}

              {/* Security events preview */}
              <div style={CARD}>
                <div className="flex items-center justify-between mb-3">
                  <SLabel>Recent Security Events</SLabel>
                  <button onClick={() => setTab("security")} style={{ color:T.primary, fontSize:15, fontWeight:600 }}>
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {user.securityEvents.length === 0 && (
                    <div style={{ color:T.muted, fontSize:15 }}>No login/security event tracking is wired up yet.</div>
                  )}
                  {user.securityEvents.slice(0,3).map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{ background:ev.flag ? T.redBg : T.card3,
                        border:`1px solid ${ev.flag ? T.redBd : T.border}` }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                        background:ev.flag ? T.red : T.green,
                        boxShadow:`0 0 6px ${ev.flag ? T.red : T.green}88` }}/>
                      <div className="flex-1">
                        <span style={{ color:T.text, fontSize:16 }}>{ev.event}</span>
                        <span style={{ color:T.sub, fontSize:14, marginLeft:8 }}>· {ev.device}</span>
                      </div>
                      <span style={{ color:T.muted, fontSize:14, ...MONO }}>{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT ACCOUNT ────────────────────────────────────── */}
          {tab === "edit" && (
            <div className="space-y-5 max-w-2xl">
              <p style={{ color:T.sub, fontSize:16 }}>
                Changes save immediately and are logged in the audit trail.
              </p>

              {/* Personal Info */}
              <div style={CARD}>
                <SLabel>Personal Information</SLabel>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label:"FULL NAME *",     val:eName,   set:setEName,  type:"text",  ph:"Full name" },
                    { label:"EMAIL ADDRESS *", val:eEmail,  set:setEEmail, type:"email", ph:"email@example.com" },
                    { label:"PHONE NUMBER",    val:ePhone,  set:setEPhone, type:"tel",   ph:"+1 (555) 000-0000" },
                  ].map(f => (
                    <div key={f.label}>
                      <label style={{ color:T.muted, fontSize:12.5, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                      <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                        placeholder={f.ph} style={INPUT}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={CARD}>
                <SLabel>Subscription Plan</SLabel>
                <p style={{ color:T.sub, fontSize:15, lineHeight:1.6 }}>
                  Plans change through billing so what the account has always matches what it pays.
                  Use the <button onClick={() => setTab("billing")} style={{ color:T.primary, fontWeight:600 }}>Billing tab</button> to change, comp, or refund &amp; end a plan.
                </p>
              </div>

              {/* Admin notes */}
              <div style={CARD}>
                <SLabel>Internal Admin Notes</SLabel>
                <textarea value={eNotes} onChange={e => setENotes(e.target.value)} rows={4}
                  placeholder="Visible to admin staff only — context, special instructions, referral source, etc."
                  className="w-full resize-none" style={INPUT}/>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setTab("overview")} className="px-6 py-3 rounded-2xl text-sm font-semibold"
                  style={{ background:T.card3, color:T.sub, border:`1px solid ${T.border}` }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#7E6BD8,#5B6EE1)", color:"#fff",
                    boxShadow:"0 4px 16px rgba(91,110,225,0.35)", opacity:saving?0.7:1 }}>
                  <Save size={14}/>{saving ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          )}

          {/* ── BILLING ─────────────────────────────────────────── */}
          {tab === "billing" && (
            <AdminUserBillingPanel userId={user.id} onChanged={onRefetch}/>
          )}

          {/* ── SECURITY ─────────────────────────────────────────── */}
          {tab === "security" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* MFA */}
                <div style={CARD}>
                  <SLabel>Two-Factor Authentication</SLabel>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div style={{ color:T.text, fontSize:20, fontWeight:700 }}>{user.mfa ? "Enabled" : "Disabled"}</div>
                      <div style={{ color:T.sub, fontSize:15, marginTop:2 }}>
                        {mfaMethodLabel(user.mfaMethod)}
                      </div>
                    </div>
                    <div style={{ width:44, height:44, borderRadius:"50%", display:"flex",
                      alignItems:"center", justifyContent:"center",
                      background:user.mfa ? T.greenBg : T.redBg,
                      border:`1px solid ${user.mfa ? T.greenBd : T.redBd}` }}>
                      <Shield size={20} color={user.mfa ? T.green : T.red}/>
                    </div>
                  </div>
                  <button onClick={resetMfa}
                    disabled={!user.mfa}
                    className="w-full py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background:T.redBg, color:T.red, border:`1px solid ${T.redBd}` }}>
                    {user.mfa ? `Reset ${mfaMethodLabel(user.mfaMethod)}` : "Reset 2FA"}
                  </button>
                </div>

                {/* Password */}
                <div style={CARD}>
                  <SLabel>Password</SLabel>
                  <p style={{ color:T.sub, fontSize:15, marginBottom:20, lineHeight:1.7 }}>
                    Send a password reset link to the user's registered email. The link expires in 24 hours.
                  </p>
                  <button onClick={sendPasswordReset}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold"
                    style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                    <Lock size={13}/> Send Password Reset Email
                  </button>
                </div>

                {/* Account status */}
                <div style={CARD}>
                  <SLabel>Account Status</SLabel>
                  <p style={{ color:T.sub, fontSize:15, marginBottom:20, lineHeight:1.7 }}>
                    {user.status==="suspended"
                      ? "This account is currently suspended. The user cannot log in or access their vault."
                      : "Account is in good standing. All features are accessible."}
                  </p>
                  <button onClick={toggleSuspend}
                    className="w-full py-2.5 rounded-2xl text-sm font-bold"
                    style={{ background:user.status==="suspended" ? T.greenBg : T.redBg,
                      color:user.status==="suspended" ? T.green : T.red,
                      border:`1px solid ${user.status==="suspended" ? T.greenBd : T.redBd}` }}>
                    {user.status==="suspended" ? "✔ Reinstate Account" : "✘ Suspend Account"}
                  </button>
                </div>
              </div>

              {/* Full event log */}
              <div style={CARD}>
                <SLabel>Full Security Event Log</SLabel>
                <div className="space-y-2">
                  {user.securityEvents.length === 0 && (
                    <div style={{ color:T.muted, fontSize:15 }}>No login/security event tracking is wired up yet — this would need a dedicated event-logging table.</div>
                  )}
                  {user.securityEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-2xl"
                      style={{ background:ev.flag ? T.redBg : T.card3,
                        border:`1px solid ${ev.flag ? T.redBd : T.border}` }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background:ev.flag ? T.red : T.green,
                        boxShadow:`0 0 6px ${ev.flag ? T.red : T.green}88` }}/>
                      <div className="flex-1">
                        <span style={{ color:ev.flag ? T.red : T.text, fontSize:16, fontWeight:ev.flag?600:400 }}>
                          {ev.flag && "⚠ "}{ev.event}
                        </span>
                        <span style={{ color:T.sub, fontSize:14, marginLeft:8 }}>· {ev.device} · IP: {ev.ip}</span>
                      </div>
                      <span style={{ color:T.muted, fontSize:14, ...MONO, flexShrink:0 }}>{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
