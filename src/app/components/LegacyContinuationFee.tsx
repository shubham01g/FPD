import React, { useState } from "react";
import {
  Shield, CheckCircle, Clock, CreditCard, Star, Info,
  Lock, AlertTriangle, Users, Zap, Download, FileText,
  Heart, Stethoscope, Wallet, Car, Camera, Key, BookOpen,
  PawPrint, X, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";
import { CryptoPayment } from "./CryptoPayment";

const CARD: React.CSSProperties = { background:"#16161F", border:"1px solid rgba(108,92,231,0.1)", boxShadow:"0 2px 12px rgba(108,92,231,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

interface ContinuationStatus {
  paid: boolean;
  paidDate?: string;
  paidBy: "user" | "legacy_contact" | null;
  activeUntil?: string;
  activationPeriod?: number;
  transactionId?: string;
  deathCertificateVerified: boolean;
  fullyUnlocked: boolean; // true only when BOTH paid AND death cert verified
}

const initStatus: ContinuationStatus = {
  paid: false,
  paidBy: null,
  deathCertificateVerified: false,
  fullyUnlocked: false,
};

// Everything the legacy contact receives when fully unlocked
const FULL_COVERAGE = [
  { icon:<FileText size={14}/>,    color:"#6C5CE7", label:"All Documents (18 folders)", desc:"Every file uploaded across all 18 folder categories" },
  { icon:<Heart size={14}/>,       color:"#FC8181", label:"Final Wishes & Wills", desc:"Complete estate instructions and bequests" },
  { icon:<Stethoscope size={14}/>, color:"#48BB78", label:"Medical Records", desc:"Allergies, medications, healthcare directives" },
  { icon:<Wallet size={14}/>,      color:"#F6AD55", label:"Financial Records", desc:"Insurance, investments, real estate, retirement" },
  { icon:<Car size={14}/>,         color:"#9F7AEA", label:"Personal Assets", desc:"Vehicles, utilities, digital assets, firearms" },
  { icon:<Camera size={14}/>,      color:"#8B7CF6", label:"Memories & Family Media", desc:"Photos, videos, written memories, diary entries" },
  { icon:<BookOpen size={14}/>,    color:"#ED8936", label:"Digital Diary", desc:"All audio, video, and written diary entries" },
  { icon:<Key size={14}/>,         color:"#38B2AC", label:"Password Manager", desc:"All saved credentials and account information" },
  { icon:<Users size={14}/>,       color:"#68D391", label:"Contacts & Legacy Instructions", desc:"All designated contacts and their permissions" },
  { icon:<PawPrint size={14}/>,    color:"#F6AD55", label:"Pet Records & Instructions", desc:"Veterinary records and pet care instructions" },
];

export function LegacyContinuationFee() {
  const { setContinuationFeePaid } = useDemo();
  const [status, setStatus] = useState<ContinuationStatus>(initStatus);
  const [processing, setProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCrypto, setShowCrypto] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [payerType, setPayerType] = useState<"user"|"legacy_contact">("user");
  const [showCoverage, setShowCoverage] = useState(false);
  const [simulatingVerif, setSimulatingVerif] = useState(false);

  const simulateAdminVerification = async () => {
    setSimulatingVerif(true);
    const tid = toast.loading("Simulating FPD admin verifying confirmation of passing…");
    await new Promise(r => setTimeout(r, 2000));
    setStatus(s => ({
      ...s,
      deathCertificateVerified: true,
      fullyUnlocked: s.paid, // unlock only if fee was also paid
    }));
    setSimulatingVerif(false);
    toast.success("✅ Admin verified — Confirmation of Passing confirmed", { id: tid });
  };

  const formatCard   = (v: string) => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g,"").slice(0,4); return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2)}` : d; };

  const handlePay = async () => {
    if (!cardNum || !expiry || !cvv || !name) { toast.error("Please complete all payment fields"); return; }
    setProcessing(true);
    const tid = toast.loading("Processing payment via Stripe...");
    await new Promise(r => setTimeout(r, 2200));
    const txId = `txn_${Date.now().toString(36).toUpperCase()}`;
    const paidDate = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
    setStatus(s => ({
      ...s,
      paid: true, paidDate, paidBy: payerType,
      activeUntil: "24 months from date of passing",
      activationPeriod: 24, transactionId: txId,
      fullyUnlocked: s.deathCertificateVerified, // only unlock if cert already verified
    }));
    setProcessing(false);
    setShowPayment(false);
    setContinuationFeePaid(true);
    toast.success("Legacy Continuation Fee paid! Fee recorded — access activates after confirmation of passing is verified by FPD admin.", { id: tid });
  };

  return (
    <div style={{ background:"#0A0A0F", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:960, margin:"0 auto" }} className="space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} color="#6C5CE7"/>
            <span style={{ color:"#6C5CE7", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>LEGACY PROTECTION</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:8 }}>Activate Legacy Access</h1>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.8 }}>
            A one-time fee of <strong style={{ color:"#FFFFFF" }}>$199</strong> that preserves your legacy contacts' ability to download your
            <strong style={{ color:"#FFFFFF" }}> complete Final Pass Down account</strong> — every document, video, memory, record, and file you have ever uploaded — after your passing is verified.
          </p>
        </div>

        {/* Demo simulation banner */}
        <div className="flex items-center justify-between px-5 py-4 rounded-2xl flex-wrap gap-3"
          style={{ background:"rgba(159,122,234,0.07)", border:"1px dashed rgba(159,122,234,0.4)" }}>
          <div>
            <div style={{ color:"#9F7AEA", fontSize:11, ...MONO, fontWeight:700, marginBottom:2 }}>🎮 DEMO MODE — SIMULATE THE FULL FLOW</div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>
              {!status.paid && !status.deathCertificateVerified && "Step 1: Pay the $199 fee using the payment form below, then Step 2: simulate admin verification."}
              {status.paid && !status.deathCertificateVerified && "Fee paid ✓ — Now simulate the FPD admin verifying the confirmation of passing to fully unlock."}
              {status.deathCertificateVerified && !status.paid && "Passing verified ✓ — Now pay the $199 fee to complete both conditions and unlock the vault."}
              {status.fullyUnlocked && "🎉 Both conditions met — vault is fully unlocked! Scroll down to see the Legacy Vault Clone."}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!status.paid && (
              <button onClick={() => { setShowPayment(true); }}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background:"rgba(108,92,231,0.1)", color:"#6C5CE7" }}>
                1. Pay Fee →
              </button>
            )}
            {!status.deathCertificateVerified && (
              <button onClick={simulateAdminVerification} disabled={simulatingVerif}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background:"rgba(159,122,234,0.15)", color:"#9F7AEA" }}>
                {simulatingVerif ? "Verifying…" : "2. Simulate Admin Verification →"}
              </button>
            )}
            {(status.paid || status.deathCertificateVerified) && (
              <button onClick={() => { setStatus(initStatus); setContinuationFeePaid(false); }}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181" }}>
                Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Two-condition gate explanation */}
        <div className="p-5 rounded-2xl" style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.15)" }}>
          <div style={{ color:"#6C5CE7", fontSize:12, fontWeight:700, ...MONO, marginBottom:10 }}>HOW ACCESS WORKS — TWO CONDITIONS MUST BOTH BE MET</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background:status.paid?"rgba(72,187,120,0.08)":"rgba(108,92,231,0.04)", border:`1px solid ${status.paid?"rgba(72,187,120,0.25)":"rgba(108,92,231,0.12)"}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width:32, height:32, background:status.paid?"rgba(72,187,120,0.15)":"rgba(108,92,231,0.1)", color:status.paid?"#48BB78":"#6C5CE7", fontSize:13, fontWeight:700 }}>
                {status.paid ? <CheckCircle size={16}/> : "1"}
              </div>
              <div>
                <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600, marginBottom:3 }}>
                  {status.paid ? "✓ Legacy Continuation Fee Paid" : "Legacy Continuation Fee"}
                </div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.6 }}>
                  $199 one-time fee. Can be paid by the account owner at any time — even now, years before passing. Or the legacy contact can pay it after the passing occurs.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background:status.deathCertificateVerified?"rgba(72,187,120,0.08)":"rgba(246,173,85,0.04)", border:`1px solid ${status.deathCertificateVerified?"rgba(72,187,120,0.25)":"rgba(246,173,85,0.2)"}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width:32, height:32, background:status.deathCertificateVerified?"rgba(72,187,120,0.15)":"rgba(246,173,85,0.1)", color:status.deathCertificateVerified?"#48BB78":"#F6AD55", fontSize:13, fontWeight:700 }}>
                {status.deathCertificateVerified ? <CheckCircle size={16}/> : "2"}
              </div>
              <div>
                <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600, marginBottom:3 }}>
                  {status.deathCertificateVerified ? "✓ Confirmation of Passing Verified" : "Confirmation of Passing — Verified by FPD Admin"}
                </div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.6 }}>
                  Account takeover requires documentation confirming the user is no longer living — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. Verification and admin approval required, with a follow-up confirmation of death once received.
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:status.fullyUnlocked?"rgba(72,187,120,0.06)":"rgba(229,62,62,0.05)", border:`1px solid ${status.fullyUnlocked?"rgba(72,187,120,0.2)":"rgba(229,62,62,0.2)"}` }}>
            {status.fullyUnlocked
              ? <><CheckCircle size={14} color="#48BB78"/><span style={{ color:"#48BB78", fontSize:13, fontWeight:600 }}>Both conditions met — Legacy Vault Clone is fully unlocked for all verified legacy contacts.</span></>
              : <><AlertTriangle size={14} color="#FC8181"/><span style={{ color:"#FC8181", fontSize:13 }}>Downloads are locked until <strong>both</strong> conditions are met. The fee alone does not unlock access.</span></>
            }
          </div>
        </div>

        {/* What gets downloaded */}
        <div className="p-5 rounded-2xl" style={CARD}>
          <button onClick={() => setShowCoverage(!showCoverage)}
            className="w-full flex items-center justify-between"
            style={{ background:"transparent", border:"none", cursor:"pointer" }}>
            <div className="flex items-center gap-2">
              <Download size={16} color="#6C5CE7"/>
              <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>What the Legacy Vault Clone Downloads</span>
            </div>
            {showCoverage ? <ChevronUp size={16} color="rgba(255,255,255,0.65)"/> : <ChevronDown size={16} color="rgba(255,255,255,0.65)"/>}
          </button>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, marginTop:6, lineHeight:1.7 }}>
            When conditions are met and a legacy contact clicks <strong style={{ color:"#FFFFFF" }}>LEGACY VAULT CLONE</strong>, they receive a complete, encrypted download of <strong style={{ color:"#6C5CE7" }}>everything</strong> the account holder ever saved — across all 30+ life categories.
          </p>
          {showCoverage && (
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              {FULL_COVERAGE.map(item => (
                <div key={item.label} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                  style={{ background:"rgba(108,92,231,0.03)", border:"1px solid rgba(108,92,231,0.08)" }}>
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                    style={{ width:28, height:28, background:`${item.color}14`, color:item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ color:"#FFFFFF", fontSize:12, fontWeight:600 }}>{item.label}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, lineHeight:1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paid status banner */}
        {status.paid && (
          <div className="flex items-start gap-4 p-6 rounded-2xl border" style={{ background:"rgba(72,187,120,0.05)", borderColor:"rgba(72,187,120,0.3)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:"rgba(72,187,120,0.12)" }}>
              <CheckCircle size={24} color="#48BB78"/>
            </div>
            <div className="flex-1">
              <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF", marginBottom:6 }}>Legacy Continuation Fee Paid ✓</div>
              <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7, marginBottom:12 }}>
                The fee has been recorded. Once a legacy contact submits confirmation of passing and FPD administrators verify it, the Legacy Vault Clone will be fully unlocked.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label:"Paid On", value:status.paidDate ?? "—" },
                  { label:"Paid By", value:status.paidBy === "user" ? "Account Owner" : "Legacy Contact" },
                  { label:"Access Window", value:status.activeUntil ?? "—" },
                  { label:"Transaction ID", value:status.transactionId ?? "—" },
                ].map(item => (
                  <div key={item.label} className="px-4 py-3 rounded-xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.15)" }}>
                    <div style={{ color:"#48BB78", fontSize:10, ...MONO, marginBottom:3 }}>{item.label.toUpperCase()}</div>
                    <div style={{ color:"#FFFFFF", fontSize:12, fontWeight:500 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment panel */}
          <div className="space-y-4">
            {!status.paid ? (
              <div className="p-6 rounded-2xl" style={CARD}>
                <div className="text-center mb-6">
                  <div style={{ fontFamily:"var(--font-display)", fontSize:52, color:"#6C5CE7", fontWeight:900, lineHeight:1 }}>$199</div>
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:14, marginTop:4 }}>One-time · Never expires · Non-refundable</div>
                  <div className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-full mx-auto"
                    style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)", width:"fit-content" }}>
                    <Star size={13} fill="#48BB78" color="#48BB78"/>
                    <span style={{ color:"#48BB78", fontSize:12 }}>Covers complete download of all account data</span>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, marginBottom:6 }}>WHO IS PAYING?</div>
                  {[
                    { id:"user",           label:"I'm paying now (account owner)", sub:"Pay at any time — even years before passing" },
                    { id:"legacy_contact", label:"Legacy contact paying after passing", sub:"Contact pays after confirmation of passing is submitted" },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setPayerType(opt.id as any)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={{ background:payerType===opt.id?"rgba(108,92,231,0.08)":"#0F1A33", border:`2px solid ${payerType===opt.id?"#6C5CE7":"transparent"}`, color:"#FFFFFF" }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor:payerType===opt.id?"#6C5CE7":"#C8D4EE" }}>
                        {payerType===opt.id && <div style={{ width:8, height:8, borderRadius:"50%", background:"#6C5CE7" }}/>}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{opt.label}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:2 }}>{opt.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <button onClick={() => setShowPayment(true)} className="w-full py-4 rounded-2xl font-bold text-base"
                    style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff", boxShadow:"0 8px 24px rgba(108,92,231,0.4)" }}>
                    <CreditCard size={16} style={{ display:"inline", marginRight:8 }}/>
                    Pay $199 with Card (Stripe)
                  </button>
                  <button onClick={() => setShowCrypto(true)} className="w-full py-4 rounded-2xl font-bold text-base"
                    style={{ background:"linear-gradient(135deg,#F7931A,#E8780C)", color:"#fff", boxShadow:"0 8px 24px rgba(247,147,26,0.35)" }}>
                    <span style={{ fontSize:16, marginRight:8 }}>₿</span>
                    Pay $199 with Cryptocurrency
                  </button>
                  <div className="flex items-center justify-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <Lock size={11} color="rgba(255,255,255,0.65)"/>
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:10 }}>Stripe · PCI-DSS</span>
                    </div>
                    <span style={{ color:"rgba(255,255,255,0.75)" }}>·</span>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color:"#F7931A", fontSize:12 }}>₿</span>
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:10 }}>Coinbase Commerce · BitPay</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl text-center space-y-4" style={CARD}>
                <div className="text-5xl">🛡️</div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>Fee Paid — Awaiting Confirmation of Passing</div>
                <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7 }}>
                  Your legacy contacts will be able to download <strong style={{ color:"#6C5CE7" }}>everything in your account</strong> for <strong style={{ color:"#6C5CE7" }}>{status.activationPeriod} months</strong> from your date of passing — once a legacy contact submits confirmation of passing and FPD administrators verify it.
                </p>
                <div className="px-4 py-3 rounded-xl text-left" style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.1)" }}>
                  <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, fontFamily:"var(--font-mono)", marginBottom:6 }}>ACCEPTED CONFIRMATION DOCUMENTS</div>
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.7 }}>
                    Death certificates · Obituaries · Hospital or hospice notices · Coroner reports · Funeral home letters · Probate filings · Any credible official record
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.1)" }}>
                  <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, ...MONO, marginBottom:4 }}>TRANSACTION ID</div>
                  <div style={{ color:"#6C5CE7", fontSize:13, ...MONO }}>{status.transactionId}</div>
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="p-5 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF", marginBottom:4 }}>Common Questions</div>
            {[
              { q:"Can my legacy contact pay the fee after I pass?", a:"Yes. Either the account owner or a designated legacy contact can pay the $199 fee — before or after the passing. Both conditions (fee paid + confirmation of passing verified) must be met to unlock downloads." },
              { q:"Does paying the fee immediately unlock downloads?", a:"No. Paying the fee alone does not unlock access. A legacy contact must also submit confirmation of passing — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. FPD administrators review, verify, and approve before access is granted." },
              { q:"What documents are accepted as confirmation of passing?", a:"Death certificates are the most common, but we also accept obituaries, hospital or hospice notices, coroner reports, funeral home letters, probate filings, or any other credible official record. Verification and admin approval are required, with a follow-up confirmation of death once received — regardless of document type." },
              { q:"What exactly can be downloaded?", a:"Everything — all 18 document folders, final wishes, medical records, financial records, personal assets, memories, digital diary entries, password manager contents, contacts, and all other data in the account." },
              { q:"How long does the access last?", a:"The continuation period is set by FPD administrators (default 24 months from the verified date of passing). After that period, the account is archived." },
              { q:"Is the fee refundable?", a:"No. The Legacy Continuation Fee is non-refundable once processed." },
              { q:"What if I'm still alive when the period ends?", a:"The fee only applies during the post-passing continuation window. Your standard subscription continues normally while you're alive." },
            ].map(item => (
              <div key={item.q} className="pb-3 border-b" style={{ borderColor:"rgba(108,92,231,0.06)" }}>
                <div style={{ color:"#FFFFFF", fontSize:12, fontWeight:600, marginBottom:3 }}>{item.q}</div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.45)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-7" style={CARD}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:"rgba(108,92,231,0.1)" }}>
                <CreditCard size={20} color="#6C5CE7"/>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>Payment Details</div>
                <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>Legacy Continuation Fee · $199.00</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>CARDHOLDER NAME</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="James Doe"
                  className="w-full px-4 py-3 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.15)", color:"#FFFFFF", fontSize:14, outline:"none" }}/>
              </div>
              <div>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>CARD NUMBER</label>
                <input value={cardNum} onChange={e=>setCardNum(formatCard(e.target.value))} placeholder="4242 4242 4242 4242" maxLength={19}
                  className="w-full px-4 py-3 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.15)", color:"#FFFFFF", fontSize:14, outline:"none", fontFamily:"var(--font-mono)" }}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>EXPIRY</label>
                  <input value={expiry} onChange={e=>setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5}
                    className="w-full px-4 py-3 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.15)", color:"#FFFFFF", fontSize:14, outline:"none", fontFamily:"var(--font-mono)" }}/>
                </div>
                <div>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>CVC</label>
                  <input value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••"
                    className="w-full px-4 py-3 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(108,92,231,0.15)", color:"#FFFFFF", fontSize:14, outline:"none", fontFamily:"var(--font-mono)" }}/>
                </div>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.12)" }}>
                <div className="flex justify-between mb-1"><span style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Legacy Continuation Fee</span><span style={{ color:"#FFFFFF", fontSize:13 }}>$199.00</span></div>
                <div className="flex justify-between mb-1"><span style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Processing Fee</span><span style={{ color:"#FFFFFF", fontSize:13 }}>$0.00</span></div>
                <div className="border-t my-2" style={{ borderColor:"rgba(108,92,231,0.1)" }}/>
                <div className="flex justify-between"><span style={{ color:"#FFFFFF", fontSize:14, fontWeight:700 }}>Total</span><span style={{ color:"#6C5CE7", fontSize:16, fontWeight:700, fontFamily:"var(--font-display)" }}>$199.00</span></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePay} disabled={processing} className="flex-1 py-3.5 rounded-xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#fff", boxShadow:"0 4px 16px rgba(108,92,231,0.35)", opacity:processing?0.8:1 }}>
                  {processing ? "Processing Stripe Payment..." : "Pay $199 Now"}
                </button>
                <button onClick={() => setShowPayment(false)} className="px-5 py-3.5 rounded-xl text-sm" style={{ background:"#0A0A0F", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Lock size={11} color="rgba(255,255,255,0.65)"/>
                <span style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>256-bit SSL · Stripe PCI-DSS Level 1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CryptoPayment
        open={showCrypto}
        amountUSD={199}
        label="$199 Legacy Continuation Fee"
        onSuccess={() => {
          setShowCrypto(false);
          const txId = `crypto_${Date.now().toString(36).toUpperCase()}`;
          const paidDate = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
          setStatus(s => ({
            ...s, paid:true, paidDate, paidBy:payerType,
            activeUntil:"24 months from date of passing",
            activationPeriod:24, transactionId:txId,
            fullyUnlocked: s.deathCertificateVerified,
          }));
          setContinuationFeePaid(true);
          toast.success("Crypto payment confirmed — fee recorded successfully!");
        }}
        onClose={() => setShowCrypto(false)}
      />
    </div>
  );
}
