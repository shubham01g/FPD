import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CryptoPayment } from "./CryptoPayment";
import { useWLPackages } from "../context/WLPackagesContext";
import { createSale } from "../services/wlPackages";
import type { WLPackage } from "../services/wlPackages";
import {
  ArrowRight, ArrowLeft, CheckCircle, ChevronRight, Globe,
  Shield, Building, Layers, Award, Zap,
} from "lucide-react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { toast } from "sonner";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };

type WizardStep = "package" | "details" | "payment" | "complete";

const ORG_TYPES = [
  { id:"law_firm",   label:"Law Firm" },       { id:"financial", label:"Financial Advisor" },
  { id:"insurance",  label:"Insurance Agency" }, { id:"funeral",   label:"Funeral Home" },
  { id:"medical",    label:"Medical / Healthcare" }, { id:"senior",  label:"Senior Care" },
  { id:"bank",       label:"Bank / Credit Union" }, { id:"agency",  label:"Marketing / Reseller Agency" },
  { id:"other",      label:"Other" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "yourbrand";
}

function StepTracker({ step }: { step: WizardStep }) {
  const steps: { id: WizardStep; label: string }[] = [
    { id:"package", label:"Package" },
    { id:"details", label:"Your Business" },
    { id:"payment", label:"Setup Fee" },
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

export function WhiteLabelOnboarding() {
  const { packages } = useWLPackages();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectTier = searchParams.get("tier");

  const [step, setStep] = useState<WizardStep>("package");
  const [selectedId, setSelectedId] = useState<string | null>(preselectTier);
  const [org, setOrg] = useState({ name:"", type:"law_firm", email:"", phone:"", contact:"", website:"", subdomain:"", why:"" });
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const active = packages.filter(p => p.active);
  const selected = active.find(p => p.id === selectedId) ?? null;

  function setOrgName(name: string) {
    setOrg(o => ({ ...o, name, subdomain: subdomainTouched ? o.subdomain : slugify(name) }));
  }

  async function submitApplication(processor: string) {
    if (!selected) return;
    setPaying(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const sale = await createSale({
        org: org.name, contact: org.contact, email: org.email,
        packageId: selected.id, subdomain: `${org.subdomain}.finalpassdown.com`, processor,
      });
      setApplicationId(sale.id);
      setStep("complete");
    } catch {
      toast.error("Something went wrong submitting your application — please try again");
    }
    setPaying(false);
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background:"#070A12" }}>
        <div className="w-full max-w-lg text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="rounded-full p-6" style={{ background:"rgba(72,187,120,0.1)", border:"2px solid rgba(72,187,120,0.3)" }}>
              <CheckCircle size={52} color="#FFFFFF"/>
            </div>
          </div>
          <h2 style={{ ...DISPLAY, fontSize:40.5, color:"#E8EDF5", marginBottom:8 }}>Application Received!</h2>
          <p style={{ color:"#8A9AB8", fontSize:19, lineHeight:1.9, marginBottom:8 }}>
            Your ${selected?.billing.setupFee.toLocaleString()} setup fee has been processed. A member of our white label team will reach out within <strong>1 business day</strong> to begin provisioning "{org.name}" on your custom subdomain.
          </p>
          <p style={{ color:"#8A9AB8", fontSize:17.5, lineHeight:1.8, marginBottom:32 }}>
            There's nothing you need to log in to yet — we'll set up your branding, domain, and admin access, then send you an invite once your instance is live.
          </p>
          <div className="p-5 rounded-2xl mb-6" style={{ ...GLASS, border:"1px solid rgba(72,187,120,0.2)" }}>
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>APPLICATION REFERENCE</div>
            <div style={{ ...MONO, fontSize:25, color:"#6E90C9", fontWeight:700, marginBottom:4 }}>{applicationId}</div>
            <div style={{ color:"#4A5A7A", fontSize:14 }}>Save this reference for any follow-up with our team</div>
          </div>
          <button onClick={() => navigate("/")} className="w-full py-4 rounded-2xl font-bold text-base"
            style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 32px rgba(91,110,225,0.35)" }}>
            Return to Homepage →
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
            <div style={{ color:"#4A5A7A", fontSize:11, ...MONO }}>WHITE LABEL — RESELLER APPLICATION</div>
          </div>
          <StepTracker step={step}/>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* ── Step 1: Package ── */}
        {step === "package" && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h1 style={{ ...DISPLAY, fontSize:37.5, color:"#E8EDF5", marginBottom:8 }}>Resell Final Pass Down — Powered By You</h1>
              <p style={{ color:"#8A9AB8", fontSize:19, maxWidth:560, margin:"0 auto" }}>
                No existing Final Pass Down account required. This is a business application — choose the package that fits how many end-user accounts you expect to run under your brand.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {active.map(p => (
                <button key={p.id} onClick={() => setSelectedId(p.id)} className="rounded-2xl p-6 text-left transition-all"
                  style={{ ...GLASS, border:`2px solid ${selectedId===p.id?p.color:"rgba(91,110,225,0.16)"}`, boxShadow:selectedId===p.id?`0 0 32px ${p.color}30`:"none" }}>
                  {p.badge && (
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-3" style={{ background:p.color, color:"#04080F", ...MONO }}>{p.badge}</div>
                  )}
                  <div style={{ color:p.color, fontSize:12.5, ...MONO, fontWeight:700, marginBottom:6 }}>{p.tier}</div>
                  <div style={{ ...DISPLAY, fontSize:22.5, color:"#E8EDF5", marginBottom:6 }}>{p.name}</div>
                  <div style={{ color:"#8A9AB8", fontSize:15, marginBottom:14 }}>{p.userLimitLabel}</div>
                  <div style={{ color:"#4A5A7A", fontSize:13, ...MONO, marginBottom:2 }}>ONE-TIME SETUP</div>
                  <div style={{ ...DISPLAY, fontSize:27.5, color:p.color }}>${p.billing.setupFee.toLocaleString()}</div>
                  {selectedId===p.id && (
                    <div className="mt-3 flex items-center gap-1.5" style={{ color:p.color, fontSize:14, fontWeight:700 }}>
                      <CheckCircle size={13}/> Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon:<Globe size={16}/>,    label:"Custom domain" },
                { icon:<Layers size={16}/>,   label:"Full branding" },
                { icon:<Award size={16}/>,    label:"HIPAA + SOC 2" },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-2 py-3 rounded-2xl" style={{ background:"rgba(91,110,225,0.06)" }}>
                  <span style={{ color:"#FFFFFF" }}>{f.icon}</span>
                  <span style={{ color:"#8A9AB8", fontSize:14, fontWeight:600 }}>{f.label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button onClick={() => selected ? setStep("details") : toast.error("Select a package to continue")}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 24px rgba(91,110,225,0.35)", opacity:selected?1:0.5 }}>
                Continue <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === "details" && (
          <div>
            <div className="mb-8">
              <h1 style={{ ...DISPLAY, fontSize:35.5, color:"#E8EDF5", marginBottom:6 }}>Your Business</h1>
              <p style={{ color:"#8A9AB8", fontSize:17.5 }}>Tell us about the business that will resell Final Pass Down under its own brand.</p>
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
                { key:"name",    label:"BUSINESS / BRAND NAME", ph:"e.g. Heritage Trust Co." },
                { key:"contact", label:"PRIMARY CONTACT NAME",  ph:"Your full name" },
                { key:"email",   label:"BUSINESS EMAIL",        ph:"you@yourcompany.com", type:"email" },
                { key:"phone",   label:"PHONE NUMBER",          ph:"+1 (555) 000-0000" },
                { key:"website", label:"WEBSITE (optional)",    ph:"https://yourcompany.com" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
                  <input type={f.type||"text"} value={(org as any)[f.key]}
                    onChange={e => f.key==="name" ? setOrgName(e.target.value) : setOrg(o=>({...o,[f.key]:e.target.value}))}
                    placeholder={f.ph}
                    className="w-full px-4 py-3 rounded-2xl"
                    style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none" }}/>
                </div>
              ))}
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>DESIRED SUBDOMAIN</label>
                <div className="flex items-center gap-2">
                  <input value={org.subdomain} onChange={e => { setSubdomainTouched(true); setOrg(o=>({...o,subdomain:slugify(e.target.value)})); }}
                    placeholder="yourbrand"
                    className="px-4 py-3 rounded-2xl"
                    style={{ flex:1, background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none", ...MONO }}/>
                  <span style={{ color:"#4A5A7A", fontSize:15, ...MONO }}>.finalpassdown.com</span>
                </div>
                <div style={{ color:"#4A5A7A", fontSize:13, marginTop:6 }}>A fully custom domain can be connected after your instance is provisioned.</div>
              </div>
              <div>
                <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>HOW DO YOU PLAN TO OFFER THIS? (optional)</label>
                <textarea value={org.why} onChange={e=>setOrg(o=>({...o,why:e.target.value}))} rows={2}
                  placeholder="e.g. We'll bundle white-labeled digital legacy planning into our estate planning packages..."
                  className="w-full px-4 py-3 rounded-2xl resize-none"
                  style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:17.5, outline:"none" }}/>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep("package")} className="flex items-center gap-2 px-6 py-3 rounded-2xl"
                style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>
                <ArrowLeft size={15}/> Back
              </button>
              <button onClick={() => {
                  if (!org.name || !org.contact || !org.email || !org.subdomain) { toast.error("Fill in business name, contact, email, and subdomain"); return; }
                  setStep("payment");
                }} className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 24px rgba(91,110,225,0.35)" }}>
                Continue to Payment <ArrowRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ── */}
        {step === "payment" && selected && (
          <div>
            <div className="mb-8">
              <h1 style={{ ...DISPLAY, fontSize:35.5, color:"#E8EDF5", marginBottom:6 }}>One-Time Setup Fee</h1>
              <p style={{ color:"#8A9AB8", fontSize:17.5 }}>Pay once to submit your application. Our team provisions and hands off your branded instance after review.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl p-6" style={{ ...GLASS, border:"2px solid rgba(91,110,225,0.2)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div style={{ ...DISPLAY, fontSize:22.5, color:"#E8EDF5" }}>{selected.name} — White Label Setup</div>
                    <div style={{ color:"#8A9AB8", fontSize:16 }}>{org.name || "Your Business"} · {org.subdomain || "yourbrand"}.finalpassdown.com</div>
                  </div>
                  <div style={{ ...DISPLAY, fontSize:40.5, color:selected.color }}>${selected.billing.setupFee.toLocaleString()}</div>
                </div>
                <div className="space-y-2 pt-4 border-t" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
                  {selected.features.slice(0, 6).map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <CheckCircle size={12} color="#FFFFFF"/>
                      <span style={{ color:"#8A9AB8", fontSize:15 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

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
              <button onClick={() => submitApplication("card")} disabled={paying} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", boxShadow:"0 0 28px rgba(91,110,225,0.4)", opacity:paying?0.7:1 }}>
                {paying ? "Processing…" : <><CheckCircle size={16}/> Pay ${selected.billing.setupFee.toLocaleString()} (Card)</>}
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

    {selected && (
      <CryptoPayment
        open={showCrypto}
        amountUSD={selected.billing.setupFee}
        label={`$${selected.billing.setupFee.toLocaleString()} White Label Setup Fee`}
        onSuccess={() => { setShowCrypto(false); submitApplication("crypto"); }}
        onClose={() => setShowCrypto(false)}
      />
    )}
    </>
  );
}
