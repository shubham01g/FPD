import { copyToClipboard } from "../utils/clipboard";
import React, { useState } from "react";
import { CryptoPayment } from "./CryptoPayment";
import { useWLEntitlement } from "../context/WLEntitlementContext";
import {
  ArrowRight, ArrowLeft, CheckCircle, Copy, TrendingUp, Users,
  DollarSign, BarChart3, Globe, FileText, Download, Bell,
  Settings, LogOut, ChevronRight, Activity, Calendar, Award,
  Send, Building, Mail, Phone, Handshake, Shield, Zap, Star
} from "lucide-react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { toast } from "sonner";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };

/* ── Volume-based commission tiers ──────────────────────────────── */
const VOLUME_TIERS = [
  { tier:1, label:"Tier 1", range:"1 – 50 active accounts",  rate:20, color:"#6FAE8B", glow:"rgba(91,167,214,0.2)" },
  { tier:2, label:"Tier 2", range:"51 – 100 active accounts", rate:25, color:"#6E90C9", glow:"rgba(91,110,225,0.2)" },
  { tier:3, label:"Tier 3", range:"101+ active accounts",     rate:30, color:"#D99A6B", glow:"rgba(72,187,120,0.2)" },
];

const SETUP_FEE = 599;

/* ── Demo dashboard data ─────────────────────────────────────────── */
const DEMO_STATS = {
  accounts: 134, tier: 2, rate: 25,
  monthlyEarned: 8945.60, totalEarned: 67_234.00, pendingPayout: 2_210.75,
  nextPayout: "Jul 1, 2026",
};

const DEMO_REFERRALS = [
  { id:"REF-0091", name:"Carter & Associates Law",   plan:"Legacy Pro",  date:"Jun 18, 2026", mrr:49.99,  status:"active" },
  { id:"REF-0090", name:"Johnson Financial Svcs",    plan:"Premium",     date:"Jun 12, 2026", mrr:24.99,  status:"active" },
  { id:"REF-0089", name:"Rebecca Trout",             plan:"Essential",   date:"Jun 5, 2026",  mrr:9.99,   status:"active" },
  { id:"REF-0088", name:"Hernandez Insurance Group", plan:"Enterprise",  date:"May 28, 2026", mrr:99.99,  status:"active" },
  { id:"REF-0087", name:"Patricia Owens",            plan:"Starter",     date:"May 20, 2026", mrr:4.99,   status:"active" },
  { id:"REF-0086", name:"Bright Future Planning",    plan:"Legacy Pro",  date:"May 10, 2026", mrr:49.99,  status:"paused" },
];

const DEMO_PAYOUTS = [
  { date:"Jun 1, 2026",  amount:2_108.40, status:"paid",    ref:"PAY-2026-06" },
  { date:"May 1, 2026",  amount:1_876.20, status:"paid",    ref:"PAY-2026-05" },
  { date:"Apr 1, 2026",  amount:1_543.80, status:"paid",    ref:"PAY-2026-04" },
  { date:"Jul 1, 2026",  amount:2_210.75, status:"pending", ref:"PAY-2026-07" },
];

/* ── Onboarding wizard ──────────────────────────────────────────── */
type WizardStep = "overview" | "details" | "payment" | "complete";

const ORG_TYPES = [
  { id:"law_firm",   label:"Law Firm" },       { id:"financial", label:"Financial Advisor" },
  { id:"insurance",  label:"Insurance Agency" }, { id:"funeral",   label:"Funeral Home" },
  { id:"medical",    label:"Medical / Healthcare" }, { id:"senior",  label:"Senior Care" },
  { id:"bank",       label:"Bank / Credit Union" }, { id:"other",   label:"Other" },
];

function StepTracker({ step }: { step: WizardStep }) {
  const steps: { id: WizardStep; label: string }[] = [
    { id:"overview", label:"Overview" },
    { id:"details",  label:"Your Info" },
    { id:"payment",  label:"Setup Fee" },
    { id:"complete", label:"Complete" },
  ];
  const idx = steps.findIndex(s => s.id === step);
  return (
    <div className="hidden md:flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{ width:22, height:22, background:i<=idx?"#5B6EE1":"rgba(91,110,225,0.1)", color:i<=idx?"#fff":"#4A5A7A" }}>
              {i<idx ? <CheckCircle size={12}/> : i+1}
            </div>
            <span style={{ fontSize:14, color:i===idx?"#E8EDF5":"#4A5A7A", fontWeight:i===idx?600:400 }}>{s.label}</span>
          </div>
          {i<steps.length-1 && <ChevronRight size={12} color="#4A5A7A"/>}
        </React.Fragment>
      ))}
    </div>
  );
}

function WizardOnboarding({ onComplete }: { onComplete: () => void }) {
  const { activate } = useWLEntitlement();
  const [step, setStep] = useState<WizardStep>("overview");
  const [org, setOrg] = useState({ name:"", type:"law_firm", email:"", phone:"", contact:"", website:"", why:"" });
  const [paying, setPaying] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);
  const [refCode] = useState(`FPD-PART-${Math.random().toString(36).slice(2,8).toUpperCase()}`);

  /* Unlocks the White Label Studio. Only ever called from a settled payment,
     never from package selection. In production the paymentRef must come from
     the processor webhook, not the client. */
  const unlockWhiteLabel = (processor: string) => {
    activate({
      packageId:   "partner_program",
      packageName: "Partner Program",
      paymentRef:  `${processor}_${Date.now().toString(36).toUpperCase()}`,
    });
  };

  const submitPayment = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      unlockWhiteLabel("card");
      setStep("complete");
    }, 1500);
  };

  if (step === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background:"#070A12" }}>
        <div className="w-full max-w-lg text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-full p-6" style={{ background:"rgba(72,187,120,0.1)", border:"2px solid rgba(72,187,120,0.3)" }}>
              <CheckCircle size={52} color="#FFFFFF"/>
            </div>
          </div>
          <h2 style={{ ...DISPLAY, fontSize:40.5, color:"#E8EDF5", marginBottom:8 }}>Welcome to the Partner Program!</h2>
          <p style={{ color:"#8A9AB8", fontSize:19, lineHeight:1.9, marginBottom:8 }}>
            Your $599 one-time setup fee has been processed. Our team will activate your partner account within <strong>1 business day</strong>.
          </p>
          <p style={{ color:"#8A9AB8", fontSize:17.5, lineHeight:1.8, marginBottom:32 }}>
            You start at <strong style={{ color:"#6FAE8B" }}>Tier 1 (20% commission)</strong>. As you grow to 51+ accounts you automatically advance to Tier 2 (25%), and 101+ unlocks Tier 3 (30%).
          </p>
          <div className="p-5 rounded-2xl mb-6" style={{ ...GLASS, border:"1px solid rgba(72,187,120,0.2)" }}>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>YOUR PARTNER REFERENCE</div>
            <div style={{ ...MONO, fontSize:25, color:"#6E90C9", fontWeight:700, marginBottom:4 }}>{refCode}</div>
            <div style={{ color:"#4A5A7A", fontSize:14 }}>Your unique referral link will be emailed within 24 hours</div>
          </div>
          <button onClick={onComplete} className="w-full py-4 rounded-2xl font-bold text-base"
            style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 32px rgba(91,110,225,0.35)" }}>
            Access Partner Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen" style={{ background:"#070A12" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4 border-b"
        style={{ background:"rgba(10,10,15,0.98)", borderColor:"rgba(91,110,225,0.16)", backdropFilter:"blur(16px)" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:36, width:55, flexShrink:0, borderRadius:7, objectFit:"contain", display:"block", marginBottom:3 }}/>
            <div style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>PARTNER PORTAL — ONBOARDING</div>
          </div>
          <StepTracker step={step}/>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Step 1: Overview ── */}
        {step === "overview" && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h1 style={{ ...DISPLAY, fontSize:37.5, color:"#E8EDF5", marginBottom:8 }}>Final Pass Down Partner Program</h1>
              <p style={{ color:"#8A9AB8", fontSize:19, maxWidth:520, margin:"0 auto" }}>
                One-time setup. Recurring lifetime commissions. No monthly fees. Your commission tier grows automatically with your volume.
              </p>
            </div>

            {/* Setup fee card */}
            <div className="rounded-2xl p-7 text-center" style={{ ...GLASS, border:"2px solid rgba(91,110,225,0.2)", background:"rgba(91,110,225,0.02)" }}>
              <div style={{ color:"#4A5A7A", fontSize:14, ...MONO, marginBottom:8 }}>ONE-TIME SETUP FEE</div>
              <div style={{ ...DISPLAY, fontSize:70, color:"#6E90C9", lineHeight:1, marginBottom:4 }}>${SETUP_FEE}</div>
              <div style={{ color:"#8A9AB8", fontSize:17.5, marginBottom:20 }}>Paid once. No monthly fees. Ever.</div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon:<Globe size={16}/>,    label:"Custom subdomain" },
                  { icon:<Shield size={16}/>,   label:"Partner dashboard" },
                  { icon:<Zap size={16}/>,      label:"Referral tracking" },
                ].map(f => (
                  <div key={f.label} className="flex flex-col items-center gap-2 py-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.06)" }}>
                    <span style={{ color:"#FFFFFF" }}>{f.icon}</span>
                    <span style={{ color:"#8A9AB8", fontSize:14, fontWeight:600 }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Volume tiers */}
            <div>
              <div style={{ color:"#8A9AB8", fontSize:14, ...MONO, marginBottom:12, textAlign:"center" }}>COMMISSION TIERS — ADVANCE AUTOMATICALLY BY VOLUME</div>
              <div className="grid grid-cols-3 gap-4">
                {VOLUME_TIERS.map(t => (
                  <div key={t.tier} className="rounded-2xl p-6 text-center" style={{ ...GLASS, border:`2px solid ${t.color}30`, boxShadow:`0 0 24px ${t.glow}` }}>
                    <div style={{ color:t.color, fontSize:12.5, ...MONO, fontWeight:700, marginBottom:6 }}>{t.label.toUpperCase()}</div>
                    <div style={{ ...DISPLAY, fontSize:50.5, color:t.color, lineHeight:1, marginBottom:6 }}>{t.rate}%</div>
                    <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.5 }}>{t.range}</div>
                    <div className="mt-3 flex items-center justify-center gap-1" style={{ color:"#D99A6B", fontSize:14 }}>
                      <CheckCircle size={11}/> Recurring · Lifetime
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Earnings estimate */}
            <div className="rounded-2xl p-6" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.15)" }}>
              <div style={{ color:"#6E90C9", fontSize:14, ...MONO, marginBottom:12 }}>ESTIMATED MONTHLY EARNINGS AT SCALE</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { accounts:25,  tier:1, rate:20 },
                  { accounts:75,  tier:2, rate:25 },
                  { accounts:150, tier:3, rate:30 },
                ].map(row => {
                  const est = Math.round(row.accounts * 24.99 * row.rate / 100);
                  return (
                    <div key={row.accounts}>
                      <div style={{ color:"#4A5A7A", fontSize:12.5, ...MONO }}>{row.accounts} ACCOUNTS · TIER {row.tier}</div>
                      <div style={{ ...DISPLAY, fontSize:30, color:"#6E90C9", marginTop:4 }}>${est.toLocaleString()}<span style={{ fontSize:14, color:"#4A5A7A" }}>/mo</span></div>
                    </div>
                  );
                })}
              </div>
              <p style={{ color:"#4A5A7A", fontSize:12.5, textAlign:"center", marginTop:8 }}>Based on avg Premium plan ($24.99/mo). Actual earnings vary by plan mix.</p>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setStep("details")} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 24px rgba(91,110,225,0.35)" }}>
                Apply Now <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === "details" && (
          <div>
            <div className="mb-8">
              <h1 style={{ ...DISPLAY, fontSize:35.5, color:"#E8EDF5", marginBottom:6 }}>Your Organization</h1>
              <p style={{ color:"#8A9AB8", fontSize:17.5 }}>Tell us about your business so we can set up your partner account.</p>
            </div>
            <div className="rounded-2xl p-8 space-y-5" style={GLASS}>
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:8 }}>ORGANIZATION TYPE</label>
                <div className="flex flex-wrap gap-2">
                  {ORG_TYPES.map(t => (
                    <button key={t.id} onClick={() => setOrg(o=>({...o,type:t.id}))}
                      className="px-3 py-2 rounded-2xl text-xs font-bold transition-all"
                      style={{ background:org.type===t.id?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.04)", border:`1px solid ${org.type===t.id?"#5B6EE1":"rgba(91,110,225,0.12)"}`, color:org.type===t.id?"#6E90C9":"#8A9AB8" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key:"name",    label:"ORGANIZATION NAME",    ph:"e.g. Carter & Associates Law" },
                { key:"contact", label:"PRIMARY CONTACT NAME", ph:"Your full name" },
                { key:"email",   label:"BUSINESS EMAIL",       ph:"you@yourcompany.com", type:"email" },
                { key:"phone",   label:"PHONE NUMBER",         ph:"+1 (555) 000-0000" },
                { key:"website", label:"WEBSITE (optional)",   ph:"https://yourcompany.com" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
                  <input type={f.type||"text"} value={(org as any)[f.key]} onChange={e=>setOrg(o=>({...o,[f.key]:e.target.value}))} placeholder={f.ph}
                    className="w-full px-4 py-3 rounded-2xl"
                    style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none" }}/>
                </div>
              ))}
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>HOW WILL YOU REFER CLIENTS? (optional)</label>
                <textarea value={org.why} onChange={e=>setOrg(o=>({...o,why:e.target.value}))} rows={2}
                  placeholder="e.g. I advise clients on estate planning and will recommend FPD to each one..."
                  className="w-full px-4 py-3 rounded-2xl resize-none"
                  style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none" }}/>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep("overview")} className="flex items-center gap-2 px-6 py-3 rounded-2xl"
                style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                <ArrowLeft size={15}/> Back
              </button>
              <button onClick={() => setStep("payment")} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 24px rgba(91,110,225,0.35)" }}>
                Continue to Payment <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ── */}
        {step === "payment" && (
          <div>
            <div className="mb-8">
              <h1 style={{ ...DISPLAY, fontSize:35.5, color:"#E8EDF5", marginBottom:6 }}>One-Time Setup Fee</h1>
              <p style={{ color:"#8A9AB8", fontSize:17.5 }}>Pay once. No recurring charges. Your commission account is activated immediately after payment.</p>
            </div>
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-2xl p-6" style={{ ...GLASS, border:"2px solid rgba(91,110,225,0.2)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div style={{ ...DISPLAY, fontSize:22.5, color:"#E8EDF5" }}>Final Pass Down Partner Setup</div>
                    <div style={{ color:"#8A9AB8", fontSize:16 }}>{org.name || "Your Organization"} · {ORG_TYPES.find(t=>t.id===org.type)?.label}</div>
                  </div>
                  <div style={{ ...DISPLAY, fontSize:40.5, color:"#6E90C9" }}>${SETUP_FEE}</div>
                </div>
                <div className="space-y-2 pt-4 border-t" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
                  {[
                    "Partner dashboard with referral tracking",
                    "Unique referral link + tracking pixel",
                    "Custom subdomain (yourname.finalpassdown.com)",
                    "Volume-based commission tiers (20% → 25% → 30%)",
                    "Monthly auto-payouts via ACH",
                    "Marketing kit & onboarding materials",
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={12} color="#FFFFFF"/>
                      <span style={{ color:"#8A9AB8", fontSize:15 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment form */}
              <div className="rounded-2xl p-6 space-y-4" style={GLASS}>
                <div style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>PAYMENT DETAILS — STRIPE SECURE CHECKOUT</div>
                <div>
                  <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>CARDHOLDER NAME</label>
                  <input defaultValue={org.contact} placeholder="Name on card"
                    className="w-full px-4 py-3 rounded-2xl"
                    style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>CARD NUMBER</label>
                  <input placeholder="4242 4242 4242 4242" maxLength={19}
                    className="w-full px-4 py-3 rounded-2xl"
                    style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none", ...MONO }}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>EXPIRY</label>
                    <input placeholder="MM / YY" maxLength={7}
                      className="w-full px-4 py-3 rounded-2xl"
                      style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none", ...MONO }}/>
                  </div>
                  <div>
                    <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>CVC</label>
                    <input placeholder="•••" maxLength={4}
                      className="w-full px-4 py-3 rounded-2xl"
                      style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none", ...MONO }}/>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
                  <Shield size={12} color="#FFFFFF"/>
                  <span style={{ color:"#D99A6B", fontSize:14 }}>256-bit SSL encryption · Processed by Stripe · No card data stored</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep("details")} className="flex items-center gap-2 px-6 py-3 rounded-2xl"
                style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                <ArrowLeft size={15}/> Back
              </button>
              <button onClick={submitPayment} disabled={paying} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 28px rgba(91,110,225,0.4)", opacity:paying?0.7:1 }}>
                {paying ? "Processing…" : <><CheckCircle size={16}/> Pay ${SETUP_FEE} (Card)</>}
              </button>
              <button onClick={() => setShowCrypto(true)} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#F7931A,#E8780C)", color:"#fff", boxShadow:"0 0 20px rgba(247,147,26,0.3)" }}>
                <span style={{ fontSize:22.5 }}>₿</span> Pay with Crypto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    <CryptoPayment
      open={showCrypto}
      amountUSD={SETUP_FEE}
      label={`$${SETUP_FEE} Partner Program Setup Fee`}
      onSuccess={() => { setShowCrypto(false); unlockWhiteLabel("crypto"); setStep("complete"); }}
      onClose={() => setShowCrypto(false)}
    />
    </>
  );
}

/* ── Partner Dashboard ───────────────────────────────────────────── */
type DashTab = "overview" | "referrals" | "payouts" | "resources" | "settings";

function PartnerDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<DashTab>("overview");
  const stats = DEMO_STATS;
  const currentTier = VOLUME_TIERS.find(t => t.tier === stats.tier)!;
  const nextTier = VOLUME_TIERS.find(t => t.tier === stats.tier + 1);

  const navItems: { id: DashTab; label: string; icon: React.ReactNode }[] = [
    { id:"overview",  label:"Overview",  icon:<BarChart3 size={14}/> },
    { id:"referrals", label:"Referrals", icon:<Users size={14}/> },
    { id:"payouts",   label:"Payouts",   icon:<DollarSign size={14}/> },
    { id:"resources", label:"Resources", icon:<FileText size={14}/> },
    { id:"settings",  label:"Settings",  icon:<Settings size={14}/> },
  ];

  return (
    <div className="flex overflow-hidden" style={{ height:"calc(100vh - 60px)", fontFamily:"var(--font-body)" }}>
      {/* Sidebar */}
      <aside className="w-52 flex flex-col flex-shrink-0" style={{ background:"#070A12", borderRight:"1px solid rgba(91,110,225,0.12)" }}>
        <div className="px-4 py-4 border-b" style={{ borderColor:"rgba(91,110,225,0.12)" }}>
          <div>
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:30, width:46, flexShrink:0, borderRadius:6, objectFit:"contain", display:"block", marginBottom:3 }}/>
            <div style={{ color:"#4A5A7A", fontSize:9, letterSpacing:"0.12em", ...MONO }}>PARTNER PORTAL</div>
          </div>
        </div>

        {/* Tier badge */}
        <div className="mx-2 my-2 px-3 py-2.5 rounded-2xl" style={{ background:`${currentTier.color}18`, border:`1px solid ${currentTier.color}40` }}>
          <div style={{ color:"#E8EDF5", fontSize:12.5, fontWeight:600 }}>Heritage Trust Co.</div>
          <div style={{ color:currentTier.color, fontSize:11, ...MONO, marginTop:2 }}>
            {currentTier.label.toUpperCase()} · {currentTier.rate}% COMMISSION
          </div>
          <div style={{ color:"#8A9AB8", fontSize:10, marginTop:1 }}>{stats.accounts} active accounts</div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className="w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-all text-left"
              style={{ background:tab===item.id?"rgba(91,110,225,0.12)":"transparent", color:tab===item.id?"#FFFFFF":"#B0C0DC", borderLeft:`2px solid ${tab===item.id?"#5B6EE1":"transparent"}` }}>
              <span style={{ color:tab===item.id?"#FFFFFF":"inherit" }}>{item.icon}</span>
              <span style={{ fontSize:15, fontWeight:tab===item.id?600:400 }}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-2 py-3 border-t" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl"
            style={{ color:"#4A5A7A" }}>
            <LogOut size={13}/><span style={{ fontSize:15 }}>Exit Portal</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
          style={{ background:"rgba(10,10,15,0.98)", borderColor:"rgba(91,110,225,0.16)" }}>
          <div>
            <h1 style={{ ...DISPLAY, fontSize:20, color:"#E8EDF5" }}>Partner Dashboard</h1>
            <div style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>
              DEMO · Heritage Trust Co. · {currentTier.label} · {currentTier.rate}% commission
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
              style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)", color:"#D99A6B", ...MONO }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"#48BB78" }}/>LIVE DEMO
            </div>
            <button style={{ color:"#4A5A7A" }}><Bell size={14}/></button>
            <div className="flex items-center justify-center rounded-full text-xs font-bold"
              style={{ width:26, height:26, background:`${currentTier.color}18`, color:currentTier.color }}>HT</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5" style={{ background:"#070A12" }}>

          {tab === "overview" && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Active Accounts", value:stats.accounts, sub:"Current volume",     color:currentTier.color },
                  { label:"Current Tier",    value:`${currentTier.rate}%`, sub:currentTier.label+" commission", color:currentTier.color },
                  { label:"Monthly Earned",  value:`$${stats.monthlyEarned.toLocaleString()}`, sub:"This month",  color:"#6FAE8B" },
                  { label:"Total Earned",    value:`$${stats.totalEarned.toLocaleString()}`,   sub:"All time",    color:"#F6AD55" },
                ].map(kpi => (
                  <div key={kpi.label} className="p-4 rounded-2xl" style={GLASS}>
                    <div style={{ color:"#8A9AB8", fontSize:11, ...MONO, marginBottom:6 }}>{kpi.label.toUpperCase()}</div>
                    <div style={{ ...DISPLAY, fontSize:27.5, color:"#E8EDF5", marginBottom:2 }}>{kpi.value}</div>
                    <div style={{ color:"#4A5A7A", fontSize:12.5 }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Tier progress */}
              {nextTier && (
                <div className="p-5 rounded-2xl" style={{ ...GLASS, border:`1px solid ${nextTier.color}30`, background:`${nextTier.color}04` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div style={{ color:nextTier.color, fontSize:14, fontWeight:700, ...MONO }}>NEXT TIER UNLOCK</div>
                      <div style={{ color:"#E8EDF5", fontSize:16, marginTop:2 }}>
                        {nextTier.label} ({nextTier.rate}% commission) — {nextTier.range}
                      </div>
                    </div>
                    <div style={{ ...DISPLAY, fontSize:22.5, color:nextTier.color }}>
                      {nextTier.tier === 2 ? `${51 - stats.accounts} more` : `${101 - stats.accounts} more`} accounts
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(91,110,225,0.1)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${Math.min(100, (stats.accounts / (nextTier.tier===2 ? 51 : 101)) * 100)}%`, background:nextTier.color }}/>
                  </div>
                  <div style={{ color:"#4A5A7A", fontSize:12.5, marginTop:4 }}>
                    {stats.accounts} / {nextTier.tier===2 ? 51 : 101} accounts to unlock {nextTier.rate}% commission
                  </div>
                </div>
              )}

              {/* Commission bar chart */}
              <div className="p-5 rounded-2xl" style={GLASS}>
                <div style={{ ...DISPLAY, fontSize:17.5, color:"#E8EDF5", marginBottom:2 }}>Monthly Commission Earnings</div>
                <div style={{ color:"#4A5A7A", fontSize:12.5, marginBottom:14 }}>Last 6 months</div>
                {(() => {
                  const months = [
                    { m:"Jan", v:1_340 }, { m:"Feb", v:1_580 }, { m:"Mar", v:1_710 },
                    { m:"Apr", v:1_544 }, { m:"May", v:1_876 }, { m:"Jun", v:2_108 },
                  ];
                  const max = Math.max(...months.map(x=>x.v));
                  return (
                    <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:90 }}>
                      {months.map(d => {
                        const h = Math.round((d.v/max)*70);
                        return (
                          <div key={d.m} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                            <span style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>${(d.v/1000).toFixed(1)}k</span>
                            <div style={{ width:"100%", height:70, display:"flex", alignItems:"flex-end" }}>
                              <div style={{ width:"100%", height:h, background:`linear-gradient(180deg,${currentTier.color},${currentTier.color}99)`, borderRadius:"3px 3px 0 0", opacity:d.m==="Jun"?1:0.6 }}/>
                            </div>
                            <span style={{ color:"#4A5A7A", fontSize:10, ...MONO }}>{d.m}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl" style={{ ...GLASS, border:"1px solid rgba(72,187,120,0.2)", background:"rgba(72,187,120,0.03)" }}>
                  <div style={{ color:"#D99A6B", fontSize:11, ...MONO, marginBottom:6 }}>NEXT PAYOUT</div>
                  <div style={{ ...DISPLAY, fontSize:30, color:"#E8EDF5", marginBottom:2 }}>${stats.pendingPayout.toLocaleString()}</div>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>Scheduled {stats.nextPayout} · Auto-deposit</div>
                </div>
                <div className="p-5 rounded-2xl space-y-2" style={GLASS}>
                  <div style={{ color:"#8A9AB8", fontSize:11, ...MONO, marginBottom:4 }}>QUICK ACTIONS</div>
                  {[
                    { label:"Copy Referral Link", fn:()=>{ copyToClipboard("https://finalpassdown.com/ref/HTC-2026"); toast.success("Referral link copied!") } },
                    { label:"Download Payout Report", fn:()=>toast.success("Report downloading…") },
                    { label:"Marketing Kit", fn:()=>toast.success("Opening marketing kit…") },
                  ].map(a => (
                    <button key={a.label} onClick={a.fn} className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-left"
                      style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.1)", color:"#6E90C9" }}>
                      <Copy size={11}/><span style={{ fontSize:14, fontWeight:600 }}>{a.label}</span>
                      <ArrowRight size={10} style={{ marginLeft:"auto" }}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "referrals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ ...DISPLAY, fontSize:25, color:"#E8EDF5" }}>Your Referrals</h2>
                  <p style={{ color:"#8A9AB8", fontSize:14 }}>{stats.accounts} active · Earning at {currentTier.rate}% commission</p>
                </div>
                <button onClick={() => { copyToClipboard("https://finalpassdown.com/ref/HTC-2026"); toast.success("Referral link copied!") }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs"
                  style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                  <Copy size={12}/> Copy Referral Link
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden" style={GLASS}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(91,110,225,0.08)" }}>
                      {["Ref #","Client","Plan","Joined",`Commission (${currentTier.rate}%)`,"Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left" style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_REFERRALS.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom:i<DEMO_REFERRALS.length-1?"1px solid rgba(91,110,225,0.06)":"none" }}>
                        <td className="px-4 py-3" style={{ color:"#6E90C9", fontSize:12.5, ...MONO }}>{r.id}</td>
                        <td className="px-4 py-3" style={{ color:"#E8EDF5", fontSize:15, fontWeight:500 }}>{r.name}</td>
                        <td className="px-4 py-3" style={{ color:"#8A9AB8", fontSize:14 }}>{r.plan}</td>
                        <td className="px-4 py-3" style={{ color:"#8A9AB8", fontSize:12.5 }}>{r.date}</td>
                        <td className="px-4 py-3" style={{ color:"#D99A6B", fontSize:15, fontWeight:700 }}>
                          ${(r.mrr * currentTier.rate / 100).toFixed(2)}/mo
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:r.status==="active"?"rgba(72,187,120,0.1)":"rgba(246,173,85,0.1)", color:r.status==="active"?"#D99A6B":"#F6AD55", ...MONO }}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "payouts" && (
            <div className="space-y-4">
              <h2 style={{ ...DISPLAY, fontSize:25, color:"#E8EDF5" }}>Payout History</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:"Total Earned",  value:`$${stats.totalEarned.toLocaleString()}`,  color:"#6E90C9" },
                  { label:"Pending",       value:`$${stats.pendingPayout.toLocaleString()}`, color:"#F6AD55" },
                  { label:"Next Pay Date", value:stats.nextPayout, color:"#D99A6B" },
                ].map(k => (
                  <div key={k.label} className="p-4 rounded-2xl" style={GLASS}>
                    <div style={{ color:"#4A5A7A", fontSize:11, ...MONO, marginBottom:5 }}>{k.label.toUpperCase()}</div>
                    <div style={{ ...DISPLAY, fontSize:25, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl overflow-hidden" style={GLASS}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(91,110,225,0.08)" }}>
                      {["Reference","Date","Amount","Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left" style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_PAYOUTS.map((p, i) => (
                      <tr key={p.ref} style={{ borderBottom:i<DEMO_PAYOUTS.length-1?"1px solid rgba(91,110,225,0.06)":"none" }}>
                        <td className="px-4 py-3" style={{ color:"#6E90C9", fontSize:12.5, ...MONO }}>{p.ref}</td>
                        <td className="px-4 py-3" style={{ color:"#8A9AB8", fontSize:15 }}>{p.date}</td>
                        <td className="px-4 py-3" style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>${p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:p.status==="paid"?"rgba(72,187,120,0.1)":"rgba(246,173,85,0.1)", color:p.status==="paid"?"#D99A6B":"#F6AD55", ...MONO }}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "resources" && (
            <div className="space-y-4">
              <h2 style={{ ...DISPLAY, fontSize:25, color:"#E8EDF5" }}>Partner Resources</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title:"Marketing Kit",           desc:"Logos, banners, pitch decks, email templates",  emoji:"📦" },
                  { title:"Referral Link Generator", desc:"Create custom tracking links per campaign",      emoji:"🔗" },
                  { title:"Commission Calculator",   desc:"Estimate monthly earnings by volume",            emoji:"💰" },
                  { title:"Client Onboarding Guide", desc:"Step-by-step guide to onboard clients onto FPD", emoji:"📋" },
                  { title:"Tier Advancement Guide",  desc:"How to move from Tier 1 → 2 → 3",              emoji:"📈" },
                ].map(r => (
                  <div key={r.title} className="p-5 rounded-2xl flex items-start gap-4" style={GLASS}>
                    <span style={{ fontSize:32.5 }}>{r.emoji}</span>
                    <div className="flex-1">
                      <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600, marginBottom:2 }}>{r.title}</div>
                      <div style={{ color:"#8A9AB8", fontSize:14, marginBottom:8 }}>{r.desc}</div>
                      <button onClick={() => toast.success(`${r.title} — opening…`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold"
                        style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9", border:"1px solid rgba(91,110,225,0.15)" }}>
                        Open <ArrowRight size={10}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="space-y-4 max-w-md">
              <h2 style={{ ...DISPLAY, fontSize:25, color:"#E8EDF5" }}>Account Settings</h2>
              {[
                { label:"Organization Name", value:"Heritage Trust Co." },
                { label:"Primary Contact",   value:"Michael Heritage" },
                { label:"Email",             value:"michael@heritagetrust.com" },
                { label:"Phone",             value:"+1 (404) 555-0182" },
                { label:"Payout Method",     value:"ACH · Chase ****4821" },
                { label:"Setup Fee Paid",    value:"$599 · Jun 2025 · Confirmed" },
                { label:"Current Tier",      value:`${currentTier.label} — ${currentTier.rate}% commission (${stats.accounts} accounts)` },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between p-4 rounded-2xl" style={GLASS}>
                  <div>
                    <div style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>{f.label.toUpperCase()}</div>
                    <div style={{ color:"#E8EDF5", fontSize:15, marginTop:2 }}>{f.value}</div>
                  </div>
                  {f.label !== "Setup Fee Paid" && f.label !== "Current Tier" && (
                    <button onClick={() => toast.success(`Edit ${f.label} — coming soon`)} style={{ color:"#6E90C9", fontSize:14 }}>Edit</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Root export ─────────────────────────────────────────────────── */
export function PartnerOnboarding() {
  const [view, setView] = useState<"onboarding" | "dashboard">("onboarding");

  return (
    <div className="min-h-screen" style={{ fontFamily:"var(--font-body)" }}>
      {/* Demo banner */}
      <div className="px-6 py-2 flex items-center justify-between flex-wrap gap-2"
        style={{ background:"rgba(72,187,120,0.08)", borderBottom:"1px solid rgba(72,187,120,0.2)" }}>
        <div className="flex items-center gap-2">
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 8px #48BB78" }}/>
          <span style={{ color:"#D99A6B", fontSize:12.5, ...MONO, fontWeight:700 }}>PARTNER PORTAL — FULL DEMO MODE</span>
          <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>· $599 one-time setup · Volume-based commission tiers</span>
        </div>
        <button onClick={() => setView(view === "dashboard" ? "onboarding" : "dashboard")}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
          style={{ background:"rgba(72,187,120,0.12)", color:"#D99A6B", border:"1px solid rgba(72,187,120,0.25)", ...MONO }}>
          <BarChart3 size={11}/>
          {view === "dashboard" ? "← Back to Onboarding" : "Skip → Partner Dashboard"}
        </button>
      </div>

      {view === "onboarding"
        ? <WizardOnboarding onComplete={() => setView("dashboard")}/>
        : <PartnerDashboard onSignOut={() => setView("onboarding")}/>
      }
    </div>
  );
}
