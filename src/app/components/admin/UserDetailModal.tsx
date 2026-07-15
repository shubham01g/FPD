import React, { useState } from "react";
import {
  Edit, Lock, Gift, Shield, CreditCard,
  CheckCircle, ToggleLeft, ToggleRight, Eye, EyeOff,
  Save, Activity, Download
} from "lucide-react";
import { toast } from "sonner";

/* ── Design tokens — matches platform blue/white theme ─────────── */
const T = {
  bg:      "#F0F4FA",
  card:    "#FFFFFF",
  card2:   "#F8FAFF",
  card3:   "#EAF0FC",
  primary: "#2040C0",
  primaryBg: "rgba(32,64,192,0.08)",
  primaryBd: "rgba(32,64,192,0.2)",
  text:    "#0D1428",
  sub:     "#5A6A88",
  muted:   "#8A9AB8",
  border:  "rgba(32,64,192,0.1)",
  green:   "#48BB78",
  greenBg: "rgba(72,187,120,0.12)",
  greenBd: "rgba(72,187,120,0.3)",
  red:     "#FC8181",
  redBg:   "rgba(252,129,129,0.12)",
  redBd:   "rgba(252,129,129,0.25)",
  amber:   "#F6AD55",
  amberBg: "rgba(246,173,85,0.12)",
  amberBd: "rgba(246,173,85,0.3)",
  purple:  "#9F7AEA",
  purpleBg:"rgba(159,122,234,0.12)",
};

const MONO: React.CSSProperties    = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

const CARD: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.border}`,
  boxShadow: "0 2px 12px rgba(32,64,192,0.06)",
  borderRadius: 16,
  padding: 22,
};

const INPUT: React.CSSProperties = {
  background: "rgba(32,64,192,0.04)",
  border: `1px solid rgba(32,64,192,0.18)`,
  color: T.text,
  outline: "none",
  borderRadius: 10,
  padding: "10px 14px",
  width: "100%",
  fontSize: 13,
};

/* ── Plans — single source of truth for prices ──────────────────── */
export const PLANS = [
  { id:"starter",        name:"Starter",       price:1.99,   storage:"1 GB",   color:"#5A6A88" },
  { id:"foundation",     name:"Foundation",    price:9.99,   storage:"50 GB",  color:"#4A90D9" },
  { id:"family_archive", name:"Legacy Archive",price:24.99,  storage:"250 GB", color:"#2040C0" },
  { id:"legacy_pro",     name:"Legacy Pro",    price:49.99,  storage:"500 GB", color:"#9F7AEA" },
  { id:"legacy_vault",   name:"Legacy Vault",  price:129.99, storage:"1 TB",   color:"#48BB78" },
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
  phone: string;
  plan: string;
  planId: string;
  status: "active" | "suspended" | "cancelled";
  mfa: boolean;
  joined: string;
  lastLogin: string;
  nextBilling: string;
  autoRenew: boolean;
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

/* ── Seed data — prices always match PLANS array ───────────────── */
function planPrice(id: string) {
  return PLANS.find(p => p.id === id)?.price ?? 0;
}

export const ADMIN_USERS: AdminUser[] = [
  {
    id:"USR-8821", name:"James Doe", email:"james.doe@email.com", phone:"(404) 555-0182",
    plan:"Legacy Archive", planId:"family_archive",
    status:"active", mfa:true, joined:"Apr 8, 2026", lastLogin:"2 hours ago",
    nextBilling:"Aug 8, 2026", autoRenew:true,
    storage:16.9, storageTotal:250, storageVideos:7.2, storagePhotos:5.8, storageDocs:2.4, storageOther:1.5,
    contacts:3, guardians:1, referrals:6,
    legacyFeePaid:true, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Visa", cardLast4:"1234", cardExpiry:"04/27", cardHolder:"James W. Doe", billingZip:"30301",
    adminNotes:"Long-time user. Referred by his estate attorney. All documents uploaded.",
    billingHistory:[
      { id:"INV-0412", date:"Jul 8, 2026",  description:"Legacy Archive · Monthly",           amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0389", date:"Jun 8, 2026",  description:"Legacy Archive · Monthly",           amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0362", date:"May 8, 2026",  description:"Legacy Archive · Monthly",           amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"LCF-0012", date:"Jun 8, 2026",  description:"Legacy Continuation Fee (one-time)", amount:"$199.00",                                     status:"paid" },
    ],
    securityEvents:[
      { event:"Login from Chrome/macOS",   time:"2h ago",     device:"MacBook Pro",  ip:"73.104.22.18" },
      { event:"New session started",        time:"2h ago",     device:"MacBook Pro",  ip:"73.104.22.18" },
      { event:"Password changed",           time:"12 days ago",device:"iPhone 15 Pro",ip:"73.104.22.18" },
      { event:"Legacy contact added",       time:"18 days ago",device:"MacBook Pro",  ip:"73.104.22.18" },
    ],
  },
  {
    id:"USR-8812", name:"Sarah Chen", email:"s.chen@email.com", phone:"(213) 555-0841",
    plan:"Legacy Archive", planId:"family_archive",
    status:"active", mfa:true, joined:"Nov 15, 2024", lastLogin:"5 min ago",
    nextBilling:"Aug 15, 2026", autoRenew:true,
    storage:22.1, storageTotal:250, storageVideos:9.8, storagePhotos:8.4, storageDocs:2.8, storageOther:1.1,
    contacts:8, guardians:2, referrals:32,
    legacyFeePaid:false, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Visa", cardLast4:"4821", cardExpiry:"06/26", cardHolder:"Sarah L. Chen", billingZip:"90210",
    adminNotes:"Top affiliate referrer. Legacy continuation fee still outstanding.",
    billingHistory:[
      { id:"INV-0411", date:"Jul 15, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0388", date:"Jun 15, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0340", date:"May 15, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0301", date:"Apr 15, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"failed" },
    ],
    securityEvents:[
      { event:"Login from Chrome/Windows",  time:"5 min ago",  device:"Windows PC",  ip:"98.22.104.11" },
      { event:"2FA code verified",          time:"5 min ago",  device:"Windows PC",  ip:"98.22.104.11" },
      { event:"Failed login attempt",       time:"8 days ago", device:"Unknown",      ip:"192.168.0.1", flag:true },
      { event:"New session started",        time:"2h ago",     device:"iPhone 15",   ip:"98.22.104.11" },
    ],
  },
  {
    id:"USR-8805", name:"Marcus Johnson", email:"m.johnson@email.com", phone:"(312) 555-0294",
    plan:"Foundation", planId:"foundation",
    status:"active", mfa:false, joined:"Jan 20, 2025", lastLogin:"1 day ago",
    nextBilling:"Jul 20, 2026", autoRenew:true,
    storage:4.8, storageTotal:50, storageVideos:1.2, storagePhotos:2.1, storageDocs:1.0, storageOther:0.5,
    contacts:2, guardians:0, referrals:14,
    legacyFeePaid:false, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Mastercard", cardLast4:"9921", cardExpiry:"11/28", cardHolder:"Marcus T. Johnson", billingZip:"60601",
    adminNotes:"",
    billingHistory:[
      { id:"INV-0410", date:"Jul 20, 2026", description:"Foundation · Monthly", amount:`$${planPrice("foundation").toFixed(2)}`, status:"paid" },
      { id:"INV-0387", date:"Jun 20, 2026", description:"Foundation · Monthly", amount:`$${planPrice("foundation").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Login from Safari/iOS",      time:"1 day ago",   device:"iPhone 14",   ip:"50.84.22.91" },
      { event:"Password reset requested",   time:"3 weeks ago", device:"Chrome/Windows",ip:"50.84.22.91" },
    ],
  },
  {
    id:"USR-8798", name:"Patricia Wells", email:"p.wells@email.com", phone:"(512) 555-0184",
    plan:"Legacy Pro", planId:"legacy_pro",
    status:"active", mfa:true, joined:"Sep 3, 2024", lastLogin:"3 hours ago",
    nextBilling:"Aug 3, 2026", autoRenew:true,
    storage:84.2, storageTotal:500, storageVideos:38.1, storagePhotos:31.4, storageDocs:9.8, storageOther:4.9,
    contacts:12, guardians:3, referrals:81,
    legacyFeePaid:true, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Amex", cardLast4:"3344", cardExpiry:"09/27", cardHolder:"Patricia A. Wells", billingZip:"78701",
    adminNotes:"Power user. Estate attorney on file. Manages accounts for elderly parents.",
    billingHistory:[
      { id:"INV-0409", date:"Jul 3, 2026",  description:"Legacy Pro · Monthly",             amount:`$${planPrice("legacy_pro").toFixed(2)}`, status:"paid" },
      { id:"INV-0386", date:"Jun 3, 2026",  description:"Legacy Pro · Monthly",             amount:`$${planPrice("legacy_pro").toFixed(2)}`, status:"paid" },
      { id:"LCF-0011", date:"May 22, 2026", description:"Legacy Continuation Fee (one-time)",amount:"$199.00",                               status:"paid" },
      { id:"INV-0355", date:"May 3, 2026",  description:"Legacy Pro · Monthly",             amount:`$${planPrice("legacy_pro").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Login from Firefox/Windows", time:"3h ago",      device:"HP Laptop",   ip:"99.40.12.44" },
      { event:"New legacy contact added",   time:"3h ago",      device:"HP Laptop",   ip:"99.40.12.44" },
      { event:"2FA enabled",               time:"6 months ago", device:"iPhone 13",   ip:"99.40.12.44" },
    ],
  },
  {
    id:"USR-8791", name:"Robert Kim", email:"r.kim@email.com", phone:"(503) 555-0029",
    plan:"Foundation", planId:"foundation",
    status:"active", mfa:false, joined:"May 22, 2026", lastLogin:"4 days ago",
    nextBilling:"Jun 22, 2026", autoRenew:false,
    storage:2.1, storageTotal:50, storageVideos:0.4, storagePhotos:0.9, storageDocs:0.6, storageOther:0.2,
    contacts:1, guardians:0, referrals:0,
    legacyFeePaid:false, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Visa", cardLast4:"7710", cardExpiry:"02/29", cardHolder:"Robert J. Kim", billingZip:"97201",
    adminNotes:"New user via Google organic. No referral.",
    billingHistory:[
      { id:"INV-0408", date:"Jun 22, 2026", description:"Foundation · Monthly", amount:`$${planPrice("foundation").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Account created",    time:"May 22",     device:"Chrome/Android",ip:"71.22.18.99" },
      { event:"Login from mobile",  time:"4 days ago", device:"Samsung S24",   ip:"71.22.18.99" },
    ],
  },
  {
    id:"USR-8784", name:"Amanda Torres", email:"a.torres@email.com", phone:"(786) 555-0338",
    plan:"Legacy Archive", planId:"family_archive",
    status:"active", mfa:true, joined:"Mar 1, 2026", lastLogin:"30 min ago",
    nextBilling:"Aug 1, 2026", autoRenew:true,
    storage:18.4, storageTotal:250, storageVideos:6.1, storagePhotos:8.2, storageDocs:2.8, storageOther:1.3,
    contacts:5, guardians:1, referrals:7,
    legacyFeePaid:false, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Mastercard", cardLast4:"5588", cardExpiry:"08/27", cardHolder:"Amanda M. Torres", billingZip:"33101",
    adminNotes:"",
    billingHistory:[
      { id:"INV-0407", date:"Jul 1, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0385", date:"Jun 1, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
      { id:"INV-0358", date:"May 1, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Login from Edge/Windows", time:"30 min ago", device:"Surface Pro",    ip:"174.88.22.4" },
      { event:"Password changed",        time:"1 week ago", device:"iPhone 15 Pro",  ip:"174.88.22.4" },
    ],
  },
  {
    id:"USR-8777", name:"Derek Mills", email:"d.mills@email.com", phone:"(614) 555-0091",
    plan:"Legacy Archive", planId:"family_archive",
    status:"suspended", mfa:false, joined:"Jul 12, 2024", lastLogin:"14 days ago",
    nextBilling:"—", autoRenew:false,
    storage:12.0, storageTotal:250, storageVideos:4.2, storagePhotos:5.1, storageDocs:1.8, storageOther:0.9,
    contacts:4, guardians:0, referrals:12,
    legacyFeePaid:false, subscriptionWaived:false, waiveMonths:0, waiveReason:"",
    cardBrand:"Visa", cardLast4:"0042", cardExpiry:"01/26", cardHolder:"Derek R. Mills", billingZip:"43201",
    adminNotes:"Suspended: 3 failed payment attempts and disputed chargeback on Jun 12.",
    billingHistory:[
      { id:"INV-0399", date:"Jun 12, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"failed" },
      { id:"INV-0370", date:"May 12, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"failed" },
      { id:"INV-0341", date:"Apr 12, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"refunded" },
      { id:"INV-0312", date:"Mar 12, 2026", description:"Legacy Archive · Monthly", amount:`$${planPrice("family_archive").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Account suspended by admin",  time:"14 days ago", device:"Admin Panel",  ip:"—" },
      { event:"Failed login attempt",        time:"14 days ago", device:"Unknown",       ip:"103.22.44.91", flag:true },
      { event:"Failed login attempt",        time:"14 days ago", device:"Unknown",       ip:"103.22.44.91", flag:true },
      { event:"Login from Chrome/macOS",     time:"15 days ago", device:"MacBook Air",  ip:"68.12.18.4" },
    ],
  },
  {
    id:"USR-8770", name:"Grace Nakamura", email:"g.nakamura@email.com", phone:"(808) 555-0214",
    plan:"Legacy Pro", planId:"legacy_pro",
    status:"active", mfa:true, joined:"Feb 28, 2025", lastLogin:"1 hour ago",
    nextBilling:"Jul 28, 2026", autoRenew:true,
    storage:51.3, storageTotal:500, storageVideos:22.8, storagePhotos:18.4, storageDocs:6.8, storageOther:3.3,
    contacts:9, guardians:2, referrals:0,
    legacyFeePaid:true, subscriptionWaived:true, waiveMonths:3, waiveReason:"white_glove",
    cardBrand:"Amex", cardLast4:"8821", cardExpiry:"12/27", cardHolder:"Grace K. Nakamura", billingZip:"96801",
    adminNotes:"White Glove client. 3-month fee waiver approved Jun 2026. Specialist: Patricia.",
    billingHistory:[
      { id:"INV-0406", date:"Jul 28, 2026", description:"Legacy Pro · Monthly (WAIVED)", amount:"$0.00",                                 status:"paid" },
      { id:"INV-0380", date:"Jun 28, 2026", description:"Legacy Pro · Monthly (WAIVED)", amount:"$0.00",                                 status:"paid" },
      { id:"LCF-0010", date:"Apr 10, 2026", description:"Legacy Continuation Fee (one-time)", amount:"$199.00",                          status:"paid" },
      { id:"INV-0320", date:"Apr 28, 2026", description:"Legacy Pro · Monthly",          amount:`$${planPrice("legacy_pro").toFixed(2)}`, status:"paid" },
    ],
    securityEvents:[
      { event:"Login from Safari/macOS", time:"1h ago", device:"MacBook Pro", ip:"66.102.8.8" },
      { event:"2FA code verified",       time:"1h ago", device:"MacBook Pro", ip:"66.102.8.8" },
      { event:"Document uploaded",       time:"2h ago", device:"iPad Pro",    ip:"66.102.8.8" },
    ],
  },
];

type ModalTab = "overview" | "edit" | "billing" | "security";

/* ── Helpers ────────────────────────────────────────────────────── */
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color:T.muted, fontSize:10, ...MONO, letterSpacing:"0.1em",
      textTransform:"uppercase" as const, marginBottom:10 }}>
      {children}
    </div>
  );
}

function DRow({ label, value, accent }: { label:string; value:React.ReactNode; accent?:string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b"
      style={{ borderColor:"rgba(32,64,192,0.06)" }}>
      <span style={{ color:T.sub, fontSize:12 }}>{label}</span>
      <span style={{ color:accent ?? T.text, fontSize:12, ...MONO }}>{value}</span>
    </div>
  );
}

/* ── Main Modal ─────────────────────────────────────────────────── */
export function UserDetailModal({ user: init, onClose }: { user: AdminUser; onClose: () => void }) {
  const [tab, setTab]   = useState<ModalTab>("overview");
  const [user, setUser] = useState<AdminUser>(init);

  /* edit state */
  const [eName,    setEName]    = useState(user.name);
  const [eEmail,   setEEmail]   = useState(user.email);
  const [ePhone,   setEPhone]   = useState(user.phone);
  const [ePlan,    setEPlan]    = useState(user.planId);
  const [eRenew,   setERenew]   = useState(user.autoRenew);
  const [eNotes,   setENotes]   = useState(user.adminNotes);
  const [saving,   setSaving]   = useState(false);

  /* card state */
  const [editCard,    setEditCard]   = useState(false);
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
  const price       = plan.price;
  const initials    = user.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  const storagePct  = Math.round((user.storage / user.storageTotal) * 100);
  const warnStorage = storagePct >= 80;

  const statusColor = user.status === "active" ? T.green : T.red;
  const statusBg    = user.status === "active" ? T.greenBg : T.redBg;
  const statusBd    = user.status === "active" ? T.greenBd : T.redBd;

  /* ── Handlers ──────────────────────────────────────────────────── */
  function saveEdit() {
    if (!eName.trim() || !eEmail.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    setTimeout(() => {
      const np = PLANS.find(p => p.id === ePlan)!;
      setUser(u => ({ ...u, name:eName, email:eEmail, phone:ePhone,
        plan:np.name, planId:ePlan, autoRenew:eRenew, adminNotes:eNotes }));
      setSaving(false);
      toast.success("Account updated");
      setTab("overview");
    }, 700);
  }

  function saveCard() {
    if (!cardNum || !cardExp || !cardCvv) { toast.error("All card fields are required"); return; }
    setSavingCard(true);
    setTimeout(() => {
      const last4 = cardNum.replace(/\D/g,"").slice(-4);
      setUser(u => ({ ...u, cardLast4:last4, cardExpiry:cardExp, cardHolder:cardName, billingZip:cardZip }));
      setSavingCard(false); setEditCard(false);
      setCardNum(""); setCardExp(""); setCardCvv("");
      toast.success("Payment method updated");
    }, 800);
  }

  function applyWaive() {
    if (!wReason) { toast.error("Please select a reason for the waiver"); return; }
    setSavingWaive(true);
    setTimeout(() => {
      setUser(u => ({ ...u, subscriptionWaived:true, waiveMonths:wMonths, waiveReason:wReason }));
      setSavingWaive(false);
      toast.success(`Waiver applied — ${wMonths} month${wMonths>1?"s":""} · $${(price * wMonths).toFixed(2)} waived`);
      setWMonths(1); setWReason(""); setWNote("");
    }, 800);
  }

  function toggleSuspend() {
    const next: AdminUser["status"] = user.status === "suspended" ? "active" : "suspended";
    setUser(u => ({ ...u, status:next }));
    toast.success(next === "active" ? `${user.name} reinstated` : `${user.name} suspended`);
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
          boxShadow:"0 24px 80px rgba(32,64,192,0.2)", maxWidth:980, maxHeight:"94vh" }}>

        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <div className="flex items-center gap-5 px-7 py-5 border-b flex-shrink-0"
          style={{ borderColor:T.border, background:T.card }}>

          {/* Avatar */}
          <div className="flex items-center justify-center rounded-2xl flex-shrink-0 font-bold text-xl"
            style={{ width:58, height:58, background:`linear-gradient(135deg,#2040C0,#3355E0)`,
              color:"#fff", boxShadow:"0 4px 16px rgba(32,64,192,0.4)", ...DISPLAY }}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span style={{ color:T.text, fontSize:22, fontWeight:700, ...DISPLAY }}>{user.name}</span>
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
            <div style={{ color:T.sub, fontSize:13 }}>{user.email} · {user.phone} · {user.id}</div>
            <div style={{ color:T.muted, fontSize:11, marginTop:2, ...MONO }}>
              Joined {user.joined} · Last login: {user.lastLogin}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={toggleSuspend}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background:user.status==="suspended" ? T.greenBg : T.redBg,
                color:user.status==="suspended" ? T.green : T.red,
                border:`1px solid ${user.status==="suspended" ? T.greenBd : T.redBd}` }}>
              {user.status==="suspended" ? "Reinstate Account" : "Suspend Account"}
            </button>
            <button onClick={onClose}
              className="px-3 py-2 rounded-xl text-sm font-semibold"
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
              <div className="grid grid-cols-3 gap-5">

                {/* Account Details */}
                <div style={CARD}>
                  <SLabel>Account Details</SLabel>
                  <DRow label="User ID"          value={user.id}/>
                  <DRow label="Email"            value={user.email}/>
                  <DRow label="Phone"            value={user.phone}/>
                  <DRow label="Status"           value={
                    <span style={{ color:statusColor, fontWeight:700 }}>{user.status.toUpperCase()}</span>}/>
                  <DRow label="Two-Factor Auth"  value={user.mfa
                    ? <span style={{ color:T.green }}>✔ Enabled</span>
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
                    <span style={{ color:T.text, fontSize:30, fontWeight:700, ...DISPLAY, lineHeight:1 }}>{user.storage}</span>
                    <span style={{ color:T.sub, fontSize:13, marginBottom:4 }}>GB of {user.storageTotal} GB</span>
                  </div>
                  <div style={{ color:warnStorage ? T.red : T.primary, fontSize:11, ...MONO, marginBottom:14 }}>
                    {storagePct}% used {warnStorage && "· ⚠ Near limit"}
                  </div>

                  {/* Segmented bar */}
                  <div className="flex h-3.5 rounded-full overflow-hidden mb-5" style={{ background:T.card3 }}>
                    <div style={{ width:`${(user.storageVideos/user.storageTotal)*100}%`, background:T.purple }}/>
                    <div style={{ width:`${(user.storagePhotos/user.storageTotal)*100}%`, background:T.amber }}/>
                    <div style={{ width:`${(user.storageDocs/user.storageTotal)*100}%`, background:T.green }}/>
                    <div style={{ width:`${(user.storageOther/user.storageTotal)*100}%`, background:T.muted }}/>
                  </div>
                  {[
                    { label:"Videos & Audio", val:user.storageVideos, color:T.purple },
                    { label:"Photos",          val:user.storagePhotos, color:T.amber },
                    { label:"Documents",       val:user.storageDocs,   color:T.green },
                    { label:"Other",           val:user.storageOther,  color:T.muted },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div style={{ width:9, height:9, borderRadius:2, background:s.color }}/>
                        <span style={{ color:T.sub, fontSize:12 }}>{s.label}</span>
                      </div>
                      <span style={{ color:T.text, fontSize:12, ...MONO }}>{s.val} GB</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="px-3 py-2.5 rounded-xl text-center" style={{ background:T.card3 }}>
                      <div style={{ color:warnStorage?T.red:T.primary, fontSize:18, fontWeight:700, ...DISPLAY }}>{storagePct}%</div>
                      <div style={{ color:T.muted, fontSize:10 }}>Used</div>
                    </div>
                    <div className="px-3 py-2.5 rounded-xl text-center" style={{ background:T.card3 }}>
                      <div style={{ color:T.green, fontSize:18, fontWeight:700, ...DISPLAY }}>{(user.storageTotal - user.storage).toFixed(1)}</div>
                      <div style={{ color:T.muted, fontSize:10 }}>GB Free</div>
                    </div>
                  </div>
                </div>

                {/* Subscription */}
                <div style={CARD}>
                  <SLabel>Subscription</SLabel>
                  <DRow label="Plan" value={<span style={{ color:plan.color, fontWeight:700 }}>{user.plan}</span>}/>
                  <DRow label="Monthly Price" value={
                    user.subscriptionWaived
                      ? <span className="flex items-center gap-2">
                          <span style={{ textDecoration:"line-through", color:T.muted, fontSize:11 }}>${price.toFixed(2)}</span>
                          <span style={{ color:T.green, fontWeight:700 }}>$0.00 WAIVED</span>
                        </span>
                      : <span style={{ color:T.primary, fontWeight:700 }}>${price.toFixed(2)}/mo</span>
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
                    <button onClick={() => toast.success("Upgrade flow opened")}
                      className="w-full py-2.5 rounded-xl text-sm font-bold"
                      style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff",
                        boxShadow:"0 4px 14px rgba(32,64,192,0.35)" }}>
                      Upgrade Plan
                    </button>
                    <button onClick={() => toast.info("Downgrade flow opened")}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                      Downgrade Plan
                    </button>
                    <button onClick={() => setTab("billing")}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold"
                      style={{ background:T.amberBg, color:T.amber, border:`1px solid ${T.amberBd}` }}>
                      Waive Fee →
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              {user.adminNotes && (
                <div className="px-5 py-4 rounded-2xl" style={{ background:T.amberBg, border:`1px solid ${T.amberBd}` }}>
                  <div style={{ color:T.amber, fontSize:10, ...MONO, marginBottom:5 }}>ADMIN NOTES</div>
                  <div style={{ color:T.text, fontSize:13, lineHeight:1.7 }}>{user.adminNotes}</div>
                </div>
              )}

              {/* Security events preview */}
              <div style={CARD}>
                <div className="flex items-center justify-between mb-3">
                  <SLabel>Recent Security Events</SLabel>
                  <button onClick={() => setTab("security")} style={{ color:T.primary, fontSize:12, fontWeight:600 }}>
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {user.securityEvents.slice(0,3).map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background:ev.flag ? T.redBg : T.card3,
                        border:`1px solid ${ev.flag ? T.redBd : T.border}` }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                        background:ev.flag ? T.red : T.green,
                        boxShadow:`0 0 6px ${ev.flag ? T.red : T.green}88` }}/>
                      <div className="flex-1">
                        <span style={{ color:T.text, fontSize:13 }}>{ev.event}</span>
                        <span style={{ color:T.sub, fontSize:11, marginLeft:8 }}>· {ev.device}</span>
                      </div>
                      <span style={{ color:T.muted, fontSize:11, ...MONO }}>{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT ACCOUNT ────────────────────────────────────── */}
          {tab === "edit" && (
            <div className="space-y-5 max-w-2xl">
              <p style={{ color:T.sub, fontSize:13 }}>
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
                    <div key={f.label} className={f.label==="FULL NAME *" ? "" : ""}>
                      <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                      <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                        placeholder={f.ph} style={INPUT}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plan picker */}
              <div style={CARD}>
                <SLabel>Subscription Plan</SLabel>
                <div className="space-y-2 mb-5">
                  {PLANS.map(p => (
                    <button key={p.id} onClick={() => setEPlan(p.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
                      style={{ background:ePlan===p.id?`${p.color}12`:T.card3,
                        border:`1.5px solid ${ePlan===p.id ? p.color : T.border}` }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width:10, height:10, borderRadius:"50%", background:p.color }}/>
                        <div className="text-left">
                          <div style={{ color:T.text, fontSize:13, fontWeight:600 }}>{p.name}</div>
                          <div style={{ color:T.muted, fontSize:11 }}>{p.storage} storage</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ color:p.color, fontWeight:700, ...DISPLAY, fontSize:16 }}>${p.price.toFixed(2)}/mo</span>
                        {ePlan===p.id && <CheckCircle size={14} color={p.color}/>}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Auto-renew toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background:T.card3, border:`1px solid ${T.border}` }}>
                  <div>
                    <div style={{ color:T.text, fontSize:13, fontWeight:500 }}>Auto-Renew</div>
                    <div style={{ color:T.muted, fontSize:11 }}>Charge card automatically on billing date</div>
                  </div>
                  <button onClick={() => setERenew(v => !v)} style={{ color:eRenew ? T.green : T.muted }}>
                    {eRenew ? <ToggleRight size={30}/> : <ToggleLeft size={30}/>}
                  </button>
                </div>
              </div>

              {/* Admin notes */}
              <div style={CARD}>
                <SLabel>Internal Admin Notes</SLabel>
                <textarea value={eNotes} onChange={e => setENotes(e.target.value)} rows={4}
                  placeholder="Visible to admin staff only — context, special instructions, referral source, etc."
                  className="w-full resize-none" style={INPUT}/>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setTab("overview")} className="px-6 py-3 rounded-xl text-sm font-semibold"
                  style={{ background:T.card3, color:T.sub, border:`1px solid ${T.border}` }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff",
                    boxShadow:"0 4px 16px rgba(32,64,192,0.35)", opacity:saving?0.7:1 }}>
                  <Save size={14}/>{saving ? "Saving…" : "Save All Changes"}
                </button>
              </div>
            </div>
          )}

          {/* ── BILLING ─────────────────────────────────────────── */}
          {tab === "billing" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">

                {/* Payment Method */}
                <div style={CARD}>
                  <div className="flex items-center justify-between mb-4">
                    <SLabel>Payment Method</SLabel>
                    <button onClick={() => setEditCard(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                      <Edit size={10}/>{editCard ? "Cancel" : "Update Card"}
                    </button>
                  </div>

                  {/* Card graphic */}
                  <div className="rounded-2xl p-5 mb-4 relative overflow-hidden"
                    style={{ background:"linear-gradient(135deg,#1A2C80,#2040C0)", minHeight:140 }}>
                    <div style={{ position:"absolute", top:-30, right:-30, width:130, height:130,
                      borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>
                    <div style={{ position:"absolute", bottom:-20, right:20, width:90, height:90,
                      borderRadius:"50%", background:"rgba(255,255,255,0.04)" }}/>
                    <div className="flex items-center justify-between mb-6">
                      <div style={{ width:40, height:28, background:"rgba(255,215,100,0.85)", borderRadius:6 }}/>
                      <span style={{ color:"rgba(255,255,255,0.85)", fontSize:14, fontWeight:800, ...MONO }}>
                        {user.cardBrand.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.55)", fontSize:17, ...MONO,
                      letterSpacing:"0.22em", marginBottom:18 }}>
                      ●●●● &nbsp; ●●●● &nbsp; ●●●● &nbsp; {user.cardLast4}
                    </div>
                    <div className="flex items-end gap-8">
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:8, ...MONO, letterSpacing:"0.1em" }}>CARD HOLDER</div>
                        <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12 }}>{user.cardHolder}</div>
                      </div>
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:8, ...MONO, letterSpacing:"0.1em" }}>EXPIRES</div>
                        <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, ...MONO }}>{user.cardExpiry}</div>
                      </div>
                      <div>
                        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:8, ...MONO, letterSpacing:"0.1em" }}>ZIP</div>
                        <div style={{ color:"rgba(255,255,255,0.9)", fontSize:12, ...MONO }}>{user.billingZip}</div>
                      </div>
                    </div>
                  </div>

                  {/* Edit card form */}
                  {editCard && (
                    <div className="space-y-3 pt-4 border-t" style={{ borderColor:T.border }}>
                      <div>
                        <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>NEW CARD NUMBER</label>
                        <input value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g,"").slice(0,16))}
                          placeholder="●●●● ●●●● ●●●● ●●●●" style={INPUT}/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>EXPIRY (MM/YY)</label>
                          <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM/YY" style={INPUT}/>
                        </div>
                        <div>
                          <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>CVV</label>
                          <div className="relative">
                            <input value={cardCvv} type={showCvv?"text":"password"} maxLength={4}
                              onChange={e => setCardCvv(e.target.value)} placeholder="●●●"
                              style={{ ...INPUT, paddingRight:38 }}/>
                            <button onClick={() => setShowCvv(v=>!v)}
                              style={{ position:"absolute", right:12, top:11, color:T.muted }}>
                              {showCvv ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>CARDHOLDER NAME</label>
                        <input value={cardName} onChange={e => setCardName(e.target.value)} style={INPUT}/>
                      </div>
                      <div>
                        <label style={{ color:T.muted, fontSize:10, ...MONO, display:"block", marginBottom:5 }}>BILLING ZIP</label>
                        <input value={cardZip} onChange={e => setCardZip(e.target.value)} maxLength={10} style={INPUT}/>
                      </div>
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                        style={{ background:T.primaryBg, border:`1px solid ${T.primaryBd}` }}>
                        <Lock size={11} color={T.primary} style={{ marginTop:2, flexShrink:0 }}/>
                        <span style={{ color:T.primary, fontSize:11 }}>
                          Transmitted via Stripe PCI vault. Only the last 4 digits and expiry are stored.
                        </span>
                      </div>
                      <button onClick={saveCard} disabled={savingCard}
                        className="w-full py-2.5 rounded-xl font-bold text-sm"
                        style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff",
                          boxShadow:"0 4px 14px rgba(32,64,192,0.3)", opacity:savingCard?0.7:1 }}>
                        {savingCard ? "Saving…" : "Save New Card"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Waive Fee */}
                <div style={CARD}>
                  <SLabel>Waive Subscription Fee</SLabel>
                  <p style={{ color:T.sub, fontSize:12, marginBottom:16, lineHeight:1.7 }}>
                    Choose the number of months to waive, a reason, and confirm. The waiver is logged in the audit trail and takes effect immediately.
                  </p>

                  {/* Active waiver notice */}
                  {user.subscriptionWaived && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
                      style={{ background:T.amberBg, border:`1px solid ${T.amberBd}` }}>
                      <Gift size={14} color={T.amber}/>
                      <span style={{ color:T.amber, fontSize:12 }}>
                        Active waiver: <strong>{user.waiveMonths} months</strong> · {WAIVE_REASONS.find(r=>r.id===user.waiveReason)?.label ?? "—"}
                      </span>
                    </div>
                  )}

                  {/* 1–12 month pills */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:10 }}>MONTHS TO WAIVE</div>
                    <div className="grid gap-2" style={{ gridTemplateColumns:"repeat(6, 1fr)" }}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <button key={m} onClick={() => setWMonths(m)}
                          className="py-2.5 rounded-xl font-bold text-sm transition-all"
                          style={{
                            background: wMonths===m ? T.primary : T.card3,
                            color: wMonths===m ? "#fff" : T.sub,
                            border: `1px solid ${wMonths===m ? T.primary : T.border}`,
                            boxShadow: wMonths===m ? "0 2px 10px rgba(32,64,192,0.35)" : "none",
                            ...MONO,
                          }}>
                          {m}mo
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason grid */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:8 }}>REASON FOR WAIVER *</div>
                    <div className="grid grid-cols-2 gap-2">
                      {WAIVE_REASONS.map(r => (
                        <button key={r.id} onClick={() => setWReason(r.id)}
                          className="px-3 py-2 rounded-xl text-xs text-left transition-all"
                          style={{
                            background: wReason===r.id ? T.primaryBg : T.card3,
                            border: `1px solid ${wReason===r.id ? T.primary : T.border}`,
                            color: wReason===r.id ? T.primary : T.sub,
                            fontWeight: wReason===r.id ? 700 : 400,
                          }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional note */}
                  <div style={{ marginBottom:14 }}>
                    <div style={{ color:T.muted, fontSize:10, ...MONO, marginBottom:6 }}>ADDITIONAL NOTE (optional)</div>
                    <textarea value={wNote} onChange={e => setWNote(e.target.value)} rows={2}
                      placeholder="E.g. Per phone call on Jul 15, 2026 — approved by management…"
                      className="w-full resize-none" style={INPUT}/>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
                    style={{ background:T.card3, border:`1px solid ${T.border}` }}>
                    <span style={{ color:T.sub, fontSize:13 }}>Total Amount Waived</span>
                    <span style={{ color:T.primary, fontSize:24, fontWeight:800, ...DISPLAY }}>
                      ${(price * wMonths).toFixed(2)}
                    </span>
                  </div>

                  <button onClick={applyWaive} disabled={savingWaive}
                    className="w-full py-3 rounded-xl font-bold text-sm"
                    style={{ background:"linear-gradient(135deg,#2040C0,#3355E0)", color:"#fff",
                      boxShadow:"0 4px 16px rgba(32,64,192,0.35)", opacity:savingWaive?0.7:1 }}>
                    {savingWaive
                      ? "Applying Waiver…"
                      : `Confirm Waiver — ${wMonths} Month${wMonths>1?"s":""} · $${(price * wMonths).toFixed(2)} Waived`}
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <div style={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <SLabel>Billing History</SLabel>
                  <button onClick={() => toast.success("CSV export downloaded")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                    <Download size={10}/> Export CSV
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border:`1px solid ${T.border}` }}>
                  <div className="grid px-4 py-2.5"
                    style={{ gridTemplateColumns:"auto 1fr auto auto auto", gap:16,
                      background:"rgba(10,20,40,0.9)" }}>
                    {["Invoice","Description","Date","Amount","Status"].map(h => (
                      <span key={h} style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>{h.toUpperCase()}</span>
                    ))}
                  </div>
                  {user.billingHistory.map((row, i) => {
                    const sc = row.status==="paid" ? T.green : row.status==="failed" ? T.red : T.amber;
                    return (
                      <div key={row.id} className="grid items-center px-4 py-3 border-t"
                        style={{ gridTemplateColumns:"auto 1fr auto auto auto", gap:16,
                          background:i%2===0?"#fff":"#F8FAFF", borderColor:"rgba(32,64,192,0.06)" }}>
                        <span style={{ color:T.muted, fontSize:10, ...MONO }}>{row.id}</span>
                        <span style={{ color:T.text, fontSize:12 }}>{row.description}</span>
                        <span style={{ color:T.sub, fontSize:12, ...MONO }}>{row.date}</span>
                        <span style={{ color:T.primary, fontSize:13, fontWeight:700, ...MONO }}>{row.amount}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{ background:`${sc}18`, color:sc, ...MONO, fontSize:9 }}>
                          {row.status.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY ─────────────────────────────────────────── */}
          {tab === "security" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-5">

                {/* MFA */}
                <div style={CARD}>
                  <SLabel>Two-Factor Authentication</SLabel>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div style={{ color:T.text, fontSize:16, fontWeight:700 }}>{user.mfa ? "Enabled" : "Disabled"}</div>
                      <div style={{ color:T.sub, fontSize:12, marginTop:2 }}>
                        {user.mfa ? "TOTP authenticator active" : "No 2FA configured"}
                      </div>
                    </div>
                    <div style={{ width:44, height:44, borderRadius:"50%", display:"flex",
                      alignItems:"center", justifyContent:"center",
                      background:user.mfa ? T.greenBg : T.redBg,
                      border:`1px solid ${user.mfa ? T.greenBd : T.redBd}` }}>
                      <Shield size={20} color={user.mfa ? T.green : T.red}/>
                    </div>
                  </div>
                  <button onClick={() => { setUser(u=>({...u,mfa:false})); toast.success("2FA reset — user must re-enroll on next login"); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background:T.redBg, color:T.red, border:`1px solid ${T.redBd}` }}>
                    Reset 2FA
                  </button>
                </div>

                {/* Password */}
                <div style={CARD}>
                  <SLabel>Password</SLabel>
                  <p style={{ color:T.sub, fontSize:12, marginBottom:20, lineHeight:1.7 }}>
                    Send a password reset link to the user's registered email. The link expires in 24 hours.
                  </p>
                  <button onClick={() => toast.success(`Password reset email sent to ${user.email}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background:T.primaryBg, color:T.primary, border:`1px solid ${T.primaryBd}` }}>
                    <Lock size={13}/> Send Password Reset Email
                  </button>
                </div>

                {/* Account status */}
                <div style={CARD}>
                  <SLabel>Account Status</SLabel>
                  <p style={{ color:T.sub, fontSize:12, marginBottom:20, lineHeight:1.7 }}>
                    {user.status==="suspended"
                      ? "This account is currently suspended. The user cannot log in or access their vault."
                      : "Account is in good standing. All features are accessible."}
                  </p>
                  <button onClick={toggleSuspend}
                    className="w-full py-2.5 rounded-xl text-sm font-bold"
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
                  {user.securityEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl"
                      style={{ background:ev.flag ? T.redBg : T.card3,
                        border:`1px solid ${ev.flag ? T.redBd : T.border}` }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background:ev.flag ? T.red : T.green,
                        boxShadow:`0 0 6px ${ev.flag ? T.red : T.green}88` }}/>
                      <div className="flex-1">
                        <span style={{ color:ev.flag ? T.red : T.text, fontSize:13, fontWeight:ev.flag?600:400 }}>
                          {ev.flag && "⚠ "}{ev.event}
                        </span>
                        <span style={{ color:T.sub, fontSize:11, marginLeft:8 }}>· {ev.device} · IP: {ev.ip}</span>
                      </div>
                      <span style={{ color:T.muted, fontSize:11, ...MONO, flexShrink:0 }}>{ev.time}</span>
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
