import { copyToClipboard, copyWithToast } from "../utils/clipboard";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { billing } from "../services/billing";
import { supabase } from "../services/supabase";
import { SERVER_BASE } from "../services/serverBase";
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
import { FPD_EMAIL } from "../utils/fpdEmails";
import { money, usePlatform } from "../services/platform";
import { usePlans } from "../utils/planCatalog";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };

/* ── Volume-based commission tiers ──────────────────────────────── */
const VOLUME_TIERS = [
  { tier:1, label:"Tier 1", range:"1 – 50 active accounts",  rate:20, color:"#6FAE8B", glow:"rgba(91,167,214,0.2)" },
  { tier:2, label:"Tier 2", range:"51 – 100 active accounts", rate:25, color:"#6E90C9", glow:"rgba(91,110,225,0.2)" },
  { tier:3, label:"Tier 3", range:"101+ active accounts",     rate:30, color:"#D99A6B", glow:"rgba(72,187,120,0.2)" },
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
  /* The setup fee as checkout charges it (billing_products "partner_setup",
     via /public/platform). Until it is known, nothing can be paid. */
  const setupFee = usePlatform().prices.partnerSetup;
  // The earnings example uses a real plan from the live catalog.
  const examplePlan = usePlans().find(p => p.id === "family_archive");
  const examplePrice = examplePlan?.priceMonthly ?? 24.99;
  const feeLabel = money(setupFee);
  const { refresh: refreshEntitlement } = useWLEntitlement();
  const [step, setStep] = useState<WizardStep>("overview");
  const [org, setOrg] = useState({ name:"", type:"law_firm", email:"", phone:"", contact:"", website:"", why:"" });
  const [paying, setPaying] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);
  // Admin → Settings → Feature flags → Crypto Payments.
  const cryptoOn = usePlatform().flags.cryptoPayments;
  const { session } = useAuth();
  const navigate = useNavigate();

  /* Real payment: Stripe Checkout (product partner_setup, migration 053).
     No card details are typed into this page. The webhook creates the
     partner record once Stripe confirms; the dashboard then shows it.
     Paying needs a (free) Final Pass Down account to attach it to. */
  const submitPayment = async () => {
    if (!session) { navigate(`/login?next=${encodeURIComponent("/partner" + window.location.search)}`); return; }
    if (org.name.trim().length < 2) { toast.error("Enter your organization's name"); setStep("details"); return; }
    setPaying(true);
    try {
      // An admin invite link (/partner?ref=<code>) activates that partner record.
      const inviteCode = new URLSearchParams(window.location.search).get("ref") ?? undefined;
      const { url } = await billing.partnerCheckout(org, inviteCode);
      window.location.href = url;
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not open checkout");
    }
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
            Thank you. Your partner account appears on your dashboard as soon as the payment is confirmed. Questions? Email <strong>{FPD_EMAIL.partnerships}</strong>.
          </p>
          <p style={{ color:"#8A9AB8", fontSize:17.5, lineHeight:1.8, marginBottom:32 }}>
            You start at <strong style={{ color:"#6FAE8B" }}>Tier 1 (20% commission)</strong>. As you grow to 51+ accounts you automatically advance to Tier 2 (25%), and 101+ unlocks Tier 3 (30%).
          </p>
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
              <div style={{ ...DISPLAY, fontSize:70, color:"#6E90C9", lineHeight:1, marginBottom:4 }}>{feeLabel}</div>
              <div style={{ color:"#8A9AB8", fontSize:17.5, marginBottom:20 }}>Paid once. No monthly fees. Ever.</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon:<Globe size={16}/>,    label:"Your referral link" },
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                {[
                  { accounts:25,  tier:1, rate:20 },
                  { accounts:75,  tier:2, rate:25 },
                  { accounts:150, tier:3, rate:30 },
                ].map(row => {
                  const est = Math.round(row.accounts * examplePrice * row.rate / 100);
                  return (
                    <div key={row.accounts}>
                      <div style={{ color:"#4A5A7A", fontSize:12.5, ...MONO }}>{row.accounts} ACCOUNTS · TIER {row.tier}</div>
                      <div style={{ ...DISPLAY, fontSize:30, color:"#6E90C9", marginTop:4 }}>${est.toLocaleString()}<span style={{ fontSize:14, color:"#4A5A7A" }}>/mo</span></div>
                    </div>
                  );
                })}
              </div>
              <p style={{ color:"#4A5A7A", fontSize:12.5, textAlign:"center", marginTop:8 }}>Example only: every account on {examplePlan?.name ?? "Legacy Archive"} ({money(examplePrice)}/mo). Actual earnings depend on the plans your referrals choose.</p>
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
                  <div style={{ ...DISPLAY, fontSize:40.5, color:"#6E90C9" }}>{feeLabel}</div>
                </div>
                <div className="space-y-2 pt-4 border-t" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
                  {[
                    "Partner dashboard with referral tracking",
                    "Your own referral link and code",
                    "Commission on every referred account, for as long as it stays",
                    "Volume-based commission tiers (20% → 25% → 30%), raised automatically",
                    "Earnings tracked on your partner dashboard",
                    "Payouts reviewed and sent by the Final Pass Down team",
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={12} color="#FFFFFF"/>
                      <span style={{ color:"#8A9AB8", fontSize:15 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secure checkout — card details are entered on Stripe's page */}
              <div className="rounded-2xl p-6 space-y-3" style={GLASS}>
                <div style={{ color:"#8A9AB8", fontSize:14, ...MONO }}>PAYMENT — STRIPE SECURE CHECKOUT</div>
                <p style={{ color:"#C7D0E3", fontSize:16, lineHeight:1.7 }}>
                  You'll pay on Stripe's secure page; Final Pass Down never sees your card number. Stripe emails your receipt.
                </p>
                {!session && (
                  <p style={{ color:"#F6AD55", fontSize:15, lineHeight:1.6 }}>
                    Sign in or create a free Final Pass Down account first, so your partner dashboard has somewhere to live.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep("details")} className="flex items-center gap-2 px-6 py-3 rounded-2xl"
                style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                <ArrowLeft size={15}/> Back
              </button>
              <button onClick={submitPayment} disabled={paying || setupFee == null} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 28px rgba(91,110,225,0.4)", opacity:paying || setupFee == null ? 0.7 : 1 }}>
                {paying ? "Opening checkout…" : session ? <><CheckCircle size={16}/> Pay {feeLabel} by Card</> : <>Sign in to continue</>}
              </button>
              {cryptoOn && (
              <button onClick={() => setShowCrypto(true)} disabled={setupFee == null} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#F7931A,#E8780C)", color:"#fff", boxShadow:"0 0 20px rgba(247,147,26,0.3)", opacity:setupFee == null ? 0.7 : 1 }}>
                <span style={{ fontSize:22.5 }}>₿</span> Pay with Crypto
              </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    <CryptoPayment
      open={showCrypto}
      amountUSD={setupFee ?? 0}
      label={`${feeLabel} Partner Program Setup Fee`}
      onSuccess={() => { setShowCrypto(false); void refreshEntitlement(); setStep("complete"); }}
      onClose={() => setShowCrypto(false)}
    />
    </>
  );
}

/* ── Partner Dashboard (GET /account/partner) ───────────────────── */
interface PartnerData {
  partner: { organization_name: string; partner_code: string; tier: number; commission_rate: number; status: string; joined_at: string; contact_email: string } | null;
  referrals: { name: string; plan: string; status: string; referredAt: string; commission: number }[];
  payouts: { amount: number; status: string; processed_at: string | null; created_at: string }[];
  stats: { totalAccounts: number; activePaid: number; totalEarned: number };
}

function PartnerDashboard({ data, onSignOut }: { data: PartnerData; onSignOut: () => void }) {
  const p = data.partner!;
  const link = `${window.location.origin}/signup?ref=${encodeURIComponent(p.partner_code)}`;
  const tier = VOLUME_TIERS.find(t => t.tier === p.tier) ?? VOLUME_TIERS[0];
  const card = (label: string, value: string, sub?: string) => (
    <div className="p-5 rounded-2xl" style={GLASS}>
      <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{label}</div>
      <div style={{ ...DISPLAY, fontSize:30, color:"#E8EDF5", marginTop:4 }}>{value}</div>
      {sub && <div style={{ color:"#8A9AB8", fontSize:13.5 }}>{sub}</div>}
    </div>
  );
  return (
    <div className="min-h-screen" style={{ background:"#070A12" }}>
      <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor:"rgba(91,110,225,0.16)" }}>
        <div>
          <img src={fpdFullLogo} alt="Final Pass Down" style={{ height:36, width:55, objectFit:"contain", display:"block", marginBottom:3 }}/>
          <div style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>PARTNER DASHBOARD · {p.organization_name.toUpperCase()}</div>
        </div>
        <button onClick={onSignOut} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ color:"#8A9AB8" }}><LogOut size={14}/> Sign out</button>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {p.status !== "active" && (
          <div className="p-4 rounded-2xl" style={{ background:"rgba(246,173,85,0.08)", color:"#F6AD55" }}>Your partner account is {p.status}. Contact {FPD_EMAIL.partnerships}.</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {card("REFERRED ACCOUNTS", String(data.stats.totalAccounts), `${data.stats.activePaid} on a paid plan`)}
          {card("YOUR TIER", `${tier.label} · ${Math.round(Number(p.commission_rate) * 100)}%`, tier.range)}
          {card("TOTAL EARNED", `$${data.stats.totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Paid out monthly by the partnerships team")}
        </div>
        <div className="p-5 rounded-2xl" style={GLASS}>
          <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:8 }}>YOUR REFERRAL LINK</div>
          <div className="flex gap-2 flex-wrap items-center">
            <code style={{ color:"#9CC7E6", fontSize:15, wordBreak:"break-all", flex:1 }}>{link}</code>
            <button onClick={() => { void copyWithToast(link, "Link copied"); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm" style={{ background:"rgba(91,110,225,0.12)", color:"#AEB9F5" }}><Copy size={13}/> Copy</button>
          </div>
          <div style={{ color:"#8A9AB8", fontSize:13.5, marginTop:8 }}>Partner code <strong>{p.partner_code}</strong>. Anyone who signs up through this link is credited to you.</div>
        </div>
        <div className="p-5 rounded-2xl" style={GLASS}>
          <div style={{ ...DISPLAY, fontSize:20, color:"#E8EDF5", marginBottom:10 }}>Referred accounts</div>
          {data.referrals.length === 0 ? <div style={{ color:"#8A9AB8" }}>No signups through your link yet.</div> : (
            <div className="space-y-2">
              {data.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
                  <span style={{ color:"#E8EDF5" }}>{r.name}</span>
                  <span style={{ color:"#8A9AB8", fontSize:14 }}>{r.plan} · {r.status} · {new Date(r.referredAt).toLocaleDateString("en-US")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 rounded-2xl" style={GLASS}>
          <div style={{ ...DISPLAY, fontSize:20, color:"#E8EDF5", marginBottom:10 }}>Payouts</div>
          {data.payouts.length === 0 ? <div style={{ color:"#8A9AB8" }}>No payouts yet.</div> : data.payouts.map((po, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <span style={{ color:"#E8EDF5" }}>${Number(po.amount).toFixed(2)}</span>
              <span style={{ color:"#8A9AB8", fontSize:14 }}>{po.status} · {new Date(po.processed_at ?? po.created_at).toLocaleDateString("en-US")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Root export ─────────────────────────────────────────────────── */
export function PartnerOnboarding() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PartnerData | null | undefined>(undefined);
  const returning = new URLSearchParams(window.location.search).get("payment");

  const [loadErr, setLoadErr] = useState("");
  useEffect(() => {
    if (loading) return;
    if (!session) { setData(null); return; }
    let alive = true;
    let tries = 0;
    const load = async () => {
      try {
        const d = await partnerRequest<PartnerData>();
        if (!alive) return;
        // Right after paying, the webhook may still be on its way.
        if (!d.partner && returning === "success" && tries++ < 10) { setTimeout(load, 3000); setData(undefined); return; }
        setData(d);
        setLoadErr("");
      } catch (err) {
        // Shown above the wizard: an existing partner whose dashboard failed
        // to load must not be told to sign up (and pay) again.
        if (alive) { setData(null); setLoadErr(err instanceof Error ? err.message : "Could not load your partner account"); }
      }
    };
    void load();
    return () => { alive = false; };
  }, [session, loading, returning]);

  if (data === undefined) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background:"#070A12", color:"#8A9AB8" }}>
      {returning === "success" ? "Confirming your payment…" : "Loading…"}
    </div>;
  }
  if (data?.partner) {
    return <PartnerDashboard data={data} onSignOut={async () => { await supabase.auth.signOut(); navigate("/"); }}/>;
  }
  return (
    <div className="min-h-screen" style={{ fontFamily:"var(--font-body)" }}>
      {loadErr && (
        <div className="px-6 py-2" style={{ background:"rgba(252,129,129,0.1)", color:"#FC8181", fontSize:14 }}>
          We couldn't load your partner account ({loadErr}). If you are already a partner, reload this page instead of signing up again.
        </div>
      )}
      {returning === "cancelled" && (
        <div className="px-6 py-2" style={{ background:"rgba(246,173,85,0.08)", color:"#F6AD55", fontSize:14 }}>Checkout was cancelled — nothing was charged.</div>
      )}
      {returning === "success" && (
        <div className="px-6 py-2" style={{ background:"rgba(246,173,85,0.08)", color:"#F6AD55", fontSize:14 }}>
          We're still waiting for Stripe to confirm your payment. Refresh in a minute, or email {FPD_EMAIL.partnerships}.
        </div>
      )}
      <WizardOnboarding onComplete={() => window.location.reload()}/>
    </div>
  );
}

async function partnerRequest<T>(): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!SERVER_BASE || !session) throw new Error("Not signed in");
  const res = await fetch(`${SERVER_BASE}/account/partner`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}
