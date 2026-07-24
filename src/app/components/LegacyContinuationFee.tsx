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

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes, wills & account settings) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B7BF5";
const ACCENT2 = "#8AA0FF";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

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
  { icon:<FileText size={14}/>,    color:ACCENT,  label:"All Documents (18 folders)", desc:"Every file uploaded across all 18 folder categories" },
  { icon:<Heart size={14}/>,       color:NEG,     label:"Final Wishes & Wills", desc:"Complete estate instructions and bequests" },
  { icon:<Stethoscope size={14}/>, color:POS,     label:"Medical Records", desc:"Allergies, medications, healthcare directives" },
  { icon:<Wallet size={14}/>,      color:WARN,    label:"Financial Records", desc:"Insurance, investments, real estate, retirement" },
  { icon:<Car size={14}/>,         color:ACCENT2, label:"Personal Assets", desc:"Vehicles, utilities, digital assets, firearms" },
  { icon:<Camera size={14}/>,      color:ACCENT2, label:"Memories & Family Media", desc:"Photos, videos, written memories, diary entries" },
  { icon:<BookOpen size={14}/>,    color:WARN,    label:"Digital Diary", desc:"All audio, video, and written diary entries" },
  { icon:<Key size={14}/>,         color:"#5FB6C4", label:"Password Manager", desc:"All saved credentials and account information" },
  { icon:<Users size={14}/>,       color:POS,     label:"Contacts & Legacy Instructions", desc:"All designated contacts and their permissions" },
  { icon:<PawPrint size={14}/>,    color:WARN,    label:"Pet Records & Instructions", desc:"Veterinary records and pet care instructions" },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-lcf so nothing else in the app is affected. */
const LCF_CSS = `
.fpd-lcf{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,123,245,0.10),transparent 70%);}
.fpd-lcf *{box-sizing:border-box;}
.fpd-lcf-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-lcf .wrap{max-width:1000px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-lcf .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.065);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-lcf .card.pad{padding:22px;}
.fpd-lcf .sec-title{font-size:16px;font-weight:600;color:${TEXT};font-family:var(--font-display);letter-spacing:-0.01em;display:flex;align-items:center;gap:9px;}
.fpd-lcf .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-lcf .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-lcf .pg-sub{color:${MUTED};font-size:13.5px;max-width:700px;line-height:1.75;}
.fpd-lcf .pg-sub strong{color:${TEXT};}
.fpd-lcf .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(74,99,222,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-lcf .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-lcf .btn-primary:disabled{opacity:.7;cursor:default;transform:none;}
.fpd-lcf .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,123,245,0.10);border:1px solid rgba(91,123,245,0.28);color:${ACCENT2};font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-lcf .btn-ghost:hover{background:rgba(91,123,245,0.18);}
.fpd-lcf .btn-ghost:disabled{opacity:.6;cursor:default;}
.fpd-lcf .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.065);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-lcf .btn-crypto{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#EFA13F,#D9781A);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(217,120,26,0.6),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-lcf .btn-crypto:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-lcf .btn-reset{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:9px;background:rgba(208,107,107,0.10);border:1px solid rgba(208,107,107,0.28);color:${NEG};font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* demo banner */
.fpd-lcf .demo-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 20px;border-radius:14px;background:rgba(91,123,245,0.06);border:1px dashed rgba(91,123,245,0.4);}
.fpd-lcf .demo-tag{font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.06em;color:${ACCENT2};margin-bottom:4px;}
.fpd-lcf .demo-text{color:${MUTED};font-size:12.5px;line-height:1.6;}
.fpd-lcf .demo-acts{display:flex;gap:8px;flex-wrap:wrap;}

/* two-condition gate */
.fpd-lcf .gate{background:rgba(91,123,245,0.04);border:1px solid rgba(91,123,245,0.16);border-radius:15px;padding:20px 22px;}
.fpd-lcf .gate-head{font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.1em;color:${ACCENT2};margin-bottom:14px;}
.fpd-lcf .ggrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-lcf .gcard{display:flex;align-items:flex-start;gap:12px;padding:15px 16px;border-radius:13px;border:1px solid;}
.fpd-lcf .gcard .gnum{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:700;}
.fpd-lcf .gcard .gtitle{color:${TEXT};font-size:13px;font-weight:600;margin-bottom:4px;}
.fpd-lcf .gcard .gdesc{color:${MUTED};font-size:12px;line-height:1.65;}
.fpd-lcf .gate-status{margin-top:14px;display:flex;align-items:center;gap:9px;padding:10px 15px;border-radius:11px;border:1px solid;}
@media (max-width:760px){.fpd-lcf .ggrid{grid-template-columns:1fr;}}

/* coverage disclosure */
.fpd-lcf .cov-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;cursor:pointer;padding:0;}
.fpd-lcf .cov-desc{color:${MUTED};font-size:13px;margin-top:8px;line-height:1.7;}
.fpd-lcf .cov-desc strong{color:${TEXT};}
.fpd-lcf .cov-desc em{color:${ACCENT2};font-style:normal;font-weight:600;}
.fpd-lcf .cgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;}
.fpd-lcf .citem{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.05);}
.fpd-lcf .citem .cico{width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-lcf .citem .clabel{color:${TEXT};font-size:12px;font-weight:600;}
.fpd-lcf .citem .cdesc{color:${MUTED};font-size:11px;line-height:1.5;margin-top:2px;}
@media (max-width:760px){.fpd-lcf .cgrid{grid-template-columns:1fr;}}

/* paid status banner */
.fpd-lcf .paid-banner{display:flex;align-items:flex-start;gap:16px;padding:22px;border-radius:15px;background:rgba(95,190,145,0.05);border:1px solid rgba(95,190,145,0.3);}
.fpd-lcf .paid-icon{width:48px;height:48px;border-radius:14px;background:rgba(95,190,145,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-lcf .paid-title{font-family:var(--font-display);font-size:17px;color:${TEXT};margin-bottom:6px;}
.fpd-lcf .paid-desc{color:${MUTED};font-size:12.5px;line-height:1.7;margin-bottom:14px;}
.fpd-lcf .pstat{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.fpd-lcf .pstat .pcell{padding:11px 13px;border-radius:11px;background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.16);}
.fpd-lcf .pstat .plbl{font-family:var(--font-mono);font-size:9.5px;color:${POS};margin-bottom:3px;}
.fpd-lcf .pstat .pval{color:${TEXT};font-size:12px;font-weight:500;}
@media (max-width:800px){.fpd-lcf .pstat{grid-template-columns:1fr 1fr;}}

/* two-column bento */
.fpd-lcf .bento{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;}
@media (max-width:900px){.fpd-lcf .bento{grid-template-columns:1fr;}}

/* price panel */
.fpd-lcf .price-hero{text-align:center;margin-bottom:20px;}
.fpd-lcf .price-val{font-family:var(--font-display);font-size:48px;color:${ACCENT2};font-weight:800;line-height:1;}
.fpd-lcf .price-sub{color:${MUTED};font-size:13px;margin-top:6px;}
.fpd-lcf .price-badge{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:7px 15px;border-radius:99px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.22);color:${POS};font-size:12px;}
.fpd-lcf .payer-label{color:${MUTED};font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;margin-bottom:8px;}
.fpd-lcf .payer{width:100%;display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border-radius:12px;background:#0F1624;border:2px solid transparent;cursor:pointer;text-align:left;transition:border-color .16s,background .16s;margin-bottom:8px;}
.fpd-lcf .payer.on{background:rgba(91,123,245,0.08);border-color:${ACCENT};}
.fpd-lcf .payer .prad{width:16px;height:16px;border-radius:50%;border:2px solid ${SOFT};flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;}
.fpd-lcf .payer.on .prad{border-color:${ACCENT};}
.fpd-lcf .payer .pdot{width:8px;height:8px;border-radius:50%;background:${ACCENT};}
.fpd-lcf .payer .plabel{color:${TEXT};font-size:13px;font-weight:500;}
.fpd-lcf .payer .psub{color:${MUTED};font-size:11px;margin-top:2px;}
.fpd-lcf .pay-acts{display:flex;flex-direction:column;gap:10px;margin-top:16px;}
.fpd-lcf .pay-acts .btn-primary,.fpd-lcf .pay-acts .btn-crypto{width:100%;justify-content:center;padding:14px;font-size:14px;border-radius:14px;}
.fpd-lcf .secure-row{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px;flex-wrap:wrap;}
.fpd-lcf .secure-item{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:10.5px;}

/* paid state card */
.fpd-lcf .paid-panel{text-align:center;padding:8px;}
.fpd-lcf .paid-emoji{font-size:44px;}
.fpd-lcf .paid-panel h4{font-family:var(--font-display);font-size:17px;color:${TEXT};margin:12px 0 10px;}
.fpd-lcf .paid-panel p{color:${MUTED};font-size:12.5px;line-height:1.7;}
.fpd-lcf .paid-panel p strong{color:${ACCENT2};}
.fpd-lcf .doc-box{margin-top:14px;padding:13px 15px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.06);text-align:left;}
.fpd-lcf .doc-box .dk{font-family:var(--font-mono);font-size:9.5px;color:${MUTED};margin-bottom:6px;}
.fpd-lcf .doc-box .dv{color:${SOFT};font-size:12px;line-height:1.7;}
.fpd-lcf .tid-box{margin-top:12px;padding:13px 15px;border-radius:12px;background:rgba(91,123,245,0.05);border:1px solid rgba(91,123,245,0.14);}
.fpd-lcf .tid-box .tk{font-family:var(--font-mono);font-size:9.5px;color:${MUTED};margin-bottom:4px;}
.fpd-lcf .tid-box .tv{color:${ACCENT2};font-family:var(--font-mono);font-size:13px;}

/* FAQ */
.fpd-lcf .faq-item{padding-bottom:13px;margin-bottom:13px;border-bottom:1px solid rgba(255,255,255,0.05);}
.fpd-lcf .faq-item:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
.fpd-lcf .faq-q{color:${TEXT};font-size:12.5px;font-weight:600;margin-bottom:4px;}
.fpd-lcf .faq-a{color:${MUTED};font-size:12px;line-height:1.65;}

/* modal */
.fpd-lcf .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-lcf .modal{width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
.fpd-lcf .modal-head{display:flex;align-items:center;gap:12px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,0.065);}
.fpd-lcf .modal-head .mico{width:40px;height:40px;border-radius:11px;background:rgba(91,123,245,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-lcf .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-lcf .modal-head .msub{color:${MUTED};font-size:11.5px;margin-top:2px;}
.fpd-lcf .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-lcf .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-lcf .field input{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.09);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-lcf .field input::placeholder{color:${FAINT};}
.fpd-lcf .field input:focus{border-color:rgba(91,123,245,0.5);box-shadow:0 0 0 3px rgba(91,123,245,0.12);}
.fpd-lcf .row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-lcf .sumbox{padding:14px 15px;border-radius:12px;background:rgba(91,123,245,0.05);border:1px solid rgba(91,123,245,0.14);}
.fpd-lcf .sumrow{display:flex;justify-content:space-between;font-size:12.5px;color:${MUTED};margin-bottom:6px;}
.fpd-lcf .sumrow.total{border-top:1px solid rgba(91,123,245,0.16);margin-top:8px;padding-top:10px;font-size:14px;color:${TEXT};font-weight:700;}
.fpd-lcf .sumrow.total span:last-child{color:${ACCENT2};font-family:var(--font-display);font-size:16px;}
.fpd-lcf .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.065);}
.fpd-lcf .modal-foot .save{flex:1;padding:13px;border-radius:12px;font-size:13.5px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-lcf .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-lcf .modal-foot .save:disabled{opacity:.8;cursor:default;}
.fpd-lcf .ssl-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:2px;color:${MUTED};font-size:11px;}
`;

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
    <div className="fpd-lcf">
      <style dangerouslySetInnerHTML={{ __html: LCF_CSS }} />
      <div className="fpd-lcf-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Shield size={12} /> Legacy Protection</div>
          <h1 className="pg-h1">Activate Legacy Access</h1>
          <div className="pg-sub">
            A one-time fee of <strong>$199</strong> that preserves your legacy contacts' ability to download your
            <strong> complete Final Pass Down account</strong> — every document, video, memory, record, and file you have ever uploaded — after your passing is verified.
          </div>
        </div>

        {/* Demo simulation banner */}
        <div className="demo-banner">
          <div>
            <div className="demo-tag">🎮 DEMO MODE — SIMULATE THE FULL FLOW</div>
            <div className="demo-text">
              {!status.paid && !status.deathCertificateVerified && "Step 1: Pay the $199 fee using the payment form below, then Step 2: simulate admin verification."}
              {status.paid && !status.deathCertificateVerified && "Fee paid ✓ — Now simulate the FPD admin verifying the confirmation of passing to fully unlock."}
              {status.deathCertificateVerified && !status.paid && "Passing verified ✓ — Now pay the $199 fee to complete both conditions and unlock the vault."}
              {status.fullyUnlocked && "🎉 Both conditions met — vault is fully unlocked! Scroll down to see the Legacy Vault Clone."}
            </div>
          </div>
          <div className="demo-acts">
            {!status.paid && (
              <button onClick={() => { setShowPayment(true); }} className="btn-ghost">
                1. Pay Fee →
              </button>
            )}
            {!status.deathCertificateVerified && (
              <button onClick={simulateAdminVerification} disabled={simulatingVerif} className="btn-ghost">
                {simulatingVerif ? "Verifying…" : "2. Simulate Admin Verification →"}
              </button>
            )}
            {(status.paid || status.deathCertificateVerified) && (
              <button onClick={() => { setStatus(initStatus); setContinuationFeePaid(false); }} className="btn-reset">
                Reset Demo
              </button>
            )}
          </div>
        </div>

        {/* Two-condition gate explanation */}
        <div className="gate">
          <div className="gate-head">HOW ACCESS WORKS — TWO CONDITIONS MUST BOTH BE MET</div>
          <div className="ggrid">
            <div className="gcard" style={{ background:status.paid?"rgba(95,190,145,0.08)":"rgba(91,123,245,0.04)", borderColor:status.paid?"rgba(95,190,145,0.28)":"rgba(91,123,245,0.14)" }}>
              <div className="gnum" style={{ background:status.paid?"rgba(95,190,145,0.16)":"rgba(91,123,245,0.1)", color:status.paid?POS:ACCENT }}>
                {status.paid ? <CheckCircle size={16}/> : "1"}
              </div>
              <div>
                <div className="gtitle">
                  {status.paid ? "✓ Legacy Continuation Fee Paid" : "Legacy Continuation Fee"}
                </div>
                <div className="gdesc">
                  $199 one-time fee. Can be paid by the account owner at any time — even now, years before passing. Or the legacy contact can pay it after the passing occurs.
                </div>
              </div>
            </div>
            <div className="gcard" style={{ background:status.deathCertificateVerified?"rgba(95,190,145,0.08)":"rgba(217,165,94,0.04)", borderColor:status.deathCertificateVerified?"rgba(95,190,145,0.28)":"rgba(217,165,94,0.22)" }}>
              <div className="gnum" style={{ background:status.deathCertificateVerified?"rgba(95,190,145,0.16)":"rgba(217,165,94,0.12)", color:status.deathCertificateVerified?POS:WARN }}>
                {status.deathCertificateVerified ? <CheckCircle size={16}/> : "2"}
              </div>
              <div>
                <div className="gtitle">
                  {status.deathCertificateVerified ? "✓ Confirmation of Passing Verified" : "Confirmation of Passing — Verified by FPD Admin"}
                </div>
                <div className="gdesc">
                  Account takeover requires documentation confirming the user is no longer living — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. Verification and admin approval required, with a follow-up confirmation of death once received.
                </div>
              </div>
            </div>
          </div>
          <div className="gate-status" style={{ background:status.fullyUnlocked?"rgba(95,190,145,0.07)":"rgba(208,107,107,0.06)", borderColor:status.fullyUnlocked?"rgba(95,190,145,0.22)":"rgba(208,107,107,0.22)" }}>
            {status.fullyUnlocked
              ? <><CheckCircle size={14} color={POS}/><span style={{ color:POS, fontSize:13, fontWeight:600 }}>Both conditions met — Legacy Vault Clone is fully unlocked for all verified legacy contacts.</span></>
              : <><AlertTriangle size={14} color={NEG}/><span style={{ color:NEG, fontSize:13 }}>Downloads are locked until <strong>both</strong> conditions are met. The fee alone does not unlock access.</span></>
            }
          </div>
        </div>

        {/* What gets downloaded */}
        <div className="card pad glow-surface">
          <button onClick={() => setShowCoverage(!showCoverage)} className="cov-toggle">
            <span className="sec-title">
              <Download size={16} color={ACCENT2}/> What the Legacy Vault Clone Downloads
            </span>
            {showCoverage ? <ChevronUp size={16} color={MUTED}/> : <ChevronDown size={16} color={MUTED}/>}
          </button>
          <div className="cov-desc">
            When conditions are met and a legacy contact clicks <strong>LEGACY VAULT CLONE</strong>, they receive a complete, encrypted download of <em>everything</em> the account holder ever saved — across all 30+ life categories.
          </div>
          {showCoverage && (
            <div className="cgrid">
              {FULL_COVERAGE.map(item => (
                <div key={item.label} className="citem">
                  <div className="cico" style={{ background:`${item.color}1E`, color:item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="clabel">{item.label}</div>
                    <div className="cdesc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paid status banner */}
        {status.paid && (
          <div className="paid-banner">
            <div className="paid-icon">
              <CheckCircle size={24} color={POS}/>
            </div>
            <div style={{ flex: 1 }}>
              <div className="paid-title">Legacy Continuation Fee Paid ✓</div>
              <div className="paid-desc">
                The fee has been recorded. Once a legacy contact submits confirmation of passing and FPD administrators verify it, the Legacy Vault Clone will be fully unlocked.
              </div>
              <div className="pstat">
                {[
                  { label:"Paid On", value:status.paidDate ?? "—" },
                  { label:"Paid By", value:status.paidBy === "user" ? "Account Owner" : "Legacy Contact" },
                  { label:"Access Window", value:status.activeUntil ?? "—" },
                  { label:"Transaction ID", value:status.transactionId ?? "—" },
                ].map(item => (
                  <div key={item.label} className="pcell">
                    <div className="plbl">{item.label.toUpperCase()}</div>
                    <div className="pval">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bento">
          {/* Payment panel */}
          <div>
            {!status.paid ? (
              <div className="card pad glow-surface">
                <div className="price-hero">
                  <div className="price-val">$199</div>
                  <div className="price-sub">One-time · Never expires · Non-refundable</div>
                  <div className="price-badge">
                    <Star size={13} fill={POS} color={POS}/>
                    <span>Covers complete download of all account data</span>
                  </div>
                </div>

                <div className="payer-label">WHO IS PAYING?</div>
                {[
                  { id:"user",           label:"I'm paying now (account owner)", sub:"Pay at any time — even years before passing" },
                  { id:"legacy_contact", label:"Legacy contact paying after passing", sub:"Contact pays after confirmation of passing is submitted" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setPayerType(opt.id as any)}
                    className={`payer${payerType===opt.id ? " on" : ""}`}>
                    <div className="prad">{payerType===opt.id && <div className="pdot"/>}</div>
                    <div>
                      <div className="plabel">{opt.label}</div>
                      <div className="psub">{opt.sub}</div>
                    </div>
                  </button>
                ))}

                <div className="pay-acts">
                  <button onClick={() => setShowPayment(true)} className="btn-primary">
                    <CreditCard size={16}/>
                    Pay $199 with Card (Stripe)
                  </button>
                  <button onClick={() => setShowCrypto(true)} className="btn-crypto">
                    <span style={{ fontSize: 16 }}>₿</span>
                    Pay $199 with Cryptocurrency
                  </button>
                  <div className="secure-row">
                    <div className="secure-item">
                      <Lock size={11}/>
                      <span>Stripe · PCI-DSS</span>
                    </div>
                    <span>·</span>
                    <div className="secure-item">
                      <span style={{ color:"#EFA13F", fontSize: 12 }}>₿</span>
                      <span>Coinbase Commerce · BitPay</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card pad glow-surface paid-panel">
                <div className="paid-emoji">🛡️</div>
                <h4>Fee Paid — Awaiting Confirmation of Passing</h4>
                <p>
                  Your legacy contacts will be able to download <strong>everything in your account</strong> for <strong>{status.activationPeriod} months</strong> from your date of passing — once a legacy contact submits confirmation of passing and FPD administrators verify it.
                </p>
                <div className="doc-box">
                  <div className="dk">ACCEPTED CONFIRMATION DOCUMENTS</div>
                  <div className="dv">
                    Death certificates · Obituaries · Hospital or hospice notices · Coroner reports · Funeral home letters · Probate filings · Any credible official record
                  </div>
                </div>
                <div className="tid-box">
                  <div className="tk">TRANSACTION ID</div>
                  <div className="tv">{status.transactionId}</div>
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="card pad glow-surface">
            <h3 className="sec-title" style={{ marginBottom: 14 }}>Common Questions</h3>
            {[
              { q:"Can my legacy contact pay the fee after I pass?", a:"Yes. Either the account owner or a designated legacy contact can pay the $199 fee — before or after the passing. Both conditions (fee paid + confirmation of passing verified) must be met to unlock downloads." },
              { q:"Does paying the fee immediately unlock downloads?", a:"No. Paying the fee alone does not unlock access. A legacy contact must also submit confirmation of passing — accepted documents include death certificates, obituaries, hospital notices, coroner reports, funeral home letters, probate filings, or any credible official record. FPD administrators review, verify, and approve before access is granted." },
              { q:"What documents are accepted as confirmation of passing?", a:"Death certificates are the most common, but we also accept obituaries, hospital or hospice notices, coroner reports, funeral home letters, probate filings, or any other credible official record. Verification and admin approval are required, with a follow-up confirmation of death once received — regardless of document type." },
              { q:"What exactly can be downloaded?", a:"Everything — all 18 document folders, final wishes, medical records, financial records, personal assets, memories, digital diary entries, password manager contents, contacts, and all other data in the account." },
              { q:"How long does the access last?", a:"The continuation period is set by FPD administrators (default 24 months from the verified date of passing). After that period, the account is archived." },
              { q:"Is the fee refundable?", a:"No. The Legacy Continuation Fee is non-refundable once processed." },
              { q:"What if I'm still alive when the period ends?", a:"The fee only applies during the post-passing continuation window. Your standard subscription continues normally while you're alive." },
            ].map(item => (
              <div key={item.q} className="faq-item">
                <div className="faq-q">{item.q}</div>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      {showPayment && (
        <div className="backdrop">
          <div className="card modal glow-surface">
            <div className="modal-head">
              <div className="mico"><CreditCard size={20} color={ACCENT2}/></div>
              <div>
                <h3>Payment Details</h3>
                <div className="msub">Legacy Continuation Fee · $199.00</div>
              </div>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>CARDHOLDER NAME</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="James Doe" />
              </div>
              <div className="field">
                <label>CARD NUMBER</label>
                <input value={cardNum} onChange={e=>setCardNum(formatCard(e.target.value))} placeholder="4242 4242 4242 4242" maxLength={19}
                  style={{ fontFamily: "var(--font-mono)" }} />
              </div>
              <div className="row2">
                <div className="field">
                  <label>EXPIRY</label>
                  <input value={expiry} onChange={e=>setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5}
                    style={{ fontFamily: "var(--font-mono)" }} />
                </div>
                <div className="field">
                  <label>CVC</label>
                  <input value={cvv} onChange={e=>setCvv(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••"
                    style={{ fontFamily: "var(--font-mono)" }} />
                </div>
              </div>
              <div className="sumbox">
                <div className="sumrow"><span>Legacy Continuation Fee</span><span style={{ color:TEXT }}>$199.00</span></div>
                <div className="sumrow"><span>Processing Fee</span><span style={{ color:TEXT }}>$0.00</span></div>
                <div className="sumrow total"><span>Total</span><span>$199.00</span></div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handlePay} disabled={processing} className="save">
                  {processing ? "Processing Stripe Payment..." : "Pay $199 Now"}
                </button>
                <button onClick={() => setShowPayment(false)} className="btn-sec">Cancel</button>
              </div>
              <div className="ssl-row">
                <Lock size={11}/>
                <span>256-bit SSL · Stripe PCI-DSS Level 1</span>
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
