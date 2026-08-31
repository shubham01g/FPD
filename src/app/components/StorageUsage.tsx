import React, { useState, useRef, useEffect, useCallback } from "react";
import { HardDrive, AlertTriangle, TrendingUp, Bell, ArrowUp, Percent, Gauge, ShieldAlert, CheckCircle, X, CreditCard, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { CryptoPayment } from "./CryptoPayment";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { STORAGE_BREAKDOWN, STORAGE_USED_GB, STORAGE_LIMIT_GB } from "../utils/storageBreakdown";
import { publicApi } from "../services/publicApi";
import { useAdminFetch } from "../hooks/useAdminFetch";
import heroStoragePhoto from "../../imports/storageusage_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const usageByMonth = [
  { month: "Jan", used: 4.2, limit: 25 }, { month: "Feb", used: 6.8, limit: 25 },
  { month: "Mar", used: 9.1, limit: 25 }, { month: "Apr", used: 11.5, limit: 25 },
  { month: "May", used: 14.3, limit: 25 }, { month: "Jun", used: 16.9, limit: 25 },
];

/* Shared with the Dashboard breakdown so the two views always agree. */
const usageByCategory = STORAGE_BREAKDOWN.map(c => ({ category: c.label, gb: c.gb, color: c.color }));

interface DBPlan { id: string; name: string; price_monthly: number; storage_gb: number; overage_rate: number; }

// "current" is hardcoded to Legacy Archive — there's no logged-in-user session
// wired up on this screen yet, so it can't look up the real subscriber's plan.
const CURRENT_PLAN_ID = "family_archive";

const FALLBACK_PLANS = [
  { id: "starter",        name: "Starter",       storage: 1,    price: 1.99,   overage: 0.50 },
  { id: "foundation",     name: "Foundation",    storage: 50,   price: 9.99,   overage: 0.40 },
  { id: "family_archive", name: "Legacy Archive",storage: 250,  price: 24.99,  overage: 0.40 },
  { id: "legacy_pro",     name: "Legacy Pro",    storage: 500,  price: 49.99,  overage: 0.40 },
  { id: "legacy_vault",   name: "Legacy Vault",  storage: 1024, price: 129.99, overage: 0.40 },
];

const alertHistory = [
  { date: "Jun 10, 2026", type: "80%", message: "Storage at 80% — usage warning sent", color: WARN },
  { date: "May 28, 2026", type: "Reset", message: "Monthly billing cycle reset — storage cleared to 0", color: "#D99A6B" },
  { date: "Apr 29, 2026", type: "90%", message: "Storage at 90% — upgrade recommended", color: NEG },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-storage so nothing else in the app is affected. */
const STORAGE_CSS = `
.fpd-storage{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-storage *{box-sizing:border-box;}
.fpd-storage-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-storage .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-storage .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-storage .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-storage .hbanner:hover .art{transform:scale(1.08);}
.fpd-storage .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-storage .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-storage .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-storage .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-storage .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-storage .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-storage .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-storage .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-storage .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-storage .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-storage .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-storage .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-storage .hbanner{min-height:auto;} .fpd-storage .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-storage .hbanner h1{font-size:29px;}}

.fpd-storage .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-storage .card.pad{padding:28px;}
.fpd-storage .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-storage .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-storage .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-storage .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}

.fpd-storage .sec-title{font-size:19px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-storage .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* alert banner */
.fpd-storage .alert-banner{display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:18px;border:1px solid;}

/* KPI ledger */
.fpd-storage .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-storage .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-storage .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-storage .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-storage .kpi-mini-txt{flex:1;min-width:0;}
.fpd-storage .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-storage .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-storage .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-storage .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-storage .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-storage .kpi-stack{grid-template-columns:1fr;}}

/* meter */
.fpd-storage .meter-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-storage .meter-track{position:relative;height:32px;border-radius:99px;background:#0F1624;margin-bottom:6px;}
.fpd-storage .meter-fill{position:absolute;inset:0 auto 0 0;border-radius:99px;transition:width .4s;}
.fpd-storage .meter-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#04070E;font-size:15px;font-weight:700;}
.fpd-storage .meter-mark{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.16);}
.fpd-storage .meter-mark span{position:absolute;top:100%;margin-top:6px;left:50%;transform:translateX(-50%);font-size:11px;color:${MUTED};font-family:var(--font-mono);white-space:nowrap;}
.fpd-storage .thresh-row{display:flex;align-items:center;justify-content:space-between;margin-top:28px;}
.fpd-storage .thresh{text-align:center;flex:1;}
.fpd-storage .thresh-pct{font-family:var(--font-mono);font-size:16px;font-weight:700;}
.fpd-storage .thresh-lbl{color:${TEXT};font-size:15px;}
.fpd-storage .thresh-msg{color:${MUTED};font-size:14px;}

/* bar chart */
.fpd-storage .chart-wrap{display:flex;align-items:flex-end;gap:8px;height:160px;position:relative;}
.fpd-storage .chart-limit{position:absolute;left:0;right:0;border-top:2px dashed rgba(208,107,107,0.5);pointer-events:none;}
.fpd-storage .chart-limit span{position:absolute;right:0;top:-14px;color:${NEG};font-size:11px;font-family:var(--font-mono);}
.fpd-storage .chart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
.fpd-storage .chart-val{color:${MUTED};font-size:11px;font-family:var(--font-mono);}
.fpd-storage .chart-bar-wrap{width:100%;height:120px;display:flex;align-items:flex-end;}
.fpd-storage .chart-bar{width:100%;border-radius:4px 4px 0 0;}
.fpd-storage .chart-foot{color:${MUTED};font-size:14px;margin-top:8px;}

/* category */
.fpd-storage .cat-row + .cat-row{margin-top:12px;}
.fpd-storage .cat-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.fpd-storage .cat-track{height:8px;border-radius:99px;background:#0F1624;}
.fpd-storage .cat-fill{height:8px;border-radius:99px;}

/* plans */
.fpd-storage .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media (max-width:900px){.fpd-storage .plan-grid{grid-template-columns:1fr;}}
.fpd-storage .plan-card{padding:20px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:#0F1624;}
.fpd-storage .plan-card.current{background:rgba(91,110,225,0.08);border:2px solid ${ACCENT};}
.fpd-storage .plan-tag{font-size:12.5px;font-family:var(--font-mono);color:#6FAE8B;margin-bottom:6px;}
.fpd-storage .plan-name{font-family:var(--font-display);font-size:21.5px;color:${TEXT};margin-bottom:6px;}
.fpd-storage .plan-price{font-size:27.5px;color:${TEXT};font-weight:700;}
.fpd-storage .plan-price-sub{color:${MUTED};font-size:15px;}
.fpd-storage .plan-detail{color:${MUTED};font-size:15.5px;}
.fpd-storage .plan-btn{width:100%;padding:11px;border-radius:16px;font-size:16px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-storage .plan-btn.up{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.7);}
.fpd-storage .plan-btn.down{background:#141B2E;color:${MUTED};}
.fpd-storage .plan-btn.crypto{padding:9px;font-size:15px;background:rgba(247,147,26,0.1);color:#F7931A;border:1px solid rgba(247,147,26,0.3);}
.fpd-storage .overage-note{margin-top:16px;padding:12px 16px;border-radius:16px;background:#0F1624;display:flex;align-items:center;gap:10px;}
.fpd-storage .overage-note span{color:${MUTED};font-size:16px;}

/* spending protection cap */
.fpd-storage .cap-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-storage .cap-copy{color:${MUTED};font-size:15.5px;line-height:1.6;max-width:560px;}
.fpd-storage .toggle{position:relative;width:44px;height:24px;border-radius:99px;flex-shrink:0;border:1px solid;cursor:pointer;transition:background .18s,border-color .18s;padding:0;}
.fpd-storage .toggle .thumb{position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#0A0F1A;transition:left .18s;}
.fpd-storage .cap-controls{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-top:18px;}
.fpd-storage .cap-field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-storage .cap-field .cap-input-wrap{position:relative;}
.fpd-storage .cap-field .cap-input-wrap span{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:${MUTED};font-size:16px;}
.fpd-storage .cap-field input{width:140px;padding:10px 13px 10px 26px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-mono);transition:border-color .18s;}
.fpd-storage .cap-field input:focus{border-color:rgba(91,110,225,0.5);}
.fpd-storage .cap-field input:disabled{opacity:.45;cursor:not-allowed;}
.fpd-storage .cap-save{padding:10px 18px;border-radius:14px;font-size:15px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;transition:filter .18s;display:inline-flex;align-items:center;gap:7px;}
.fpd-storage .cap-save:hover{filter:brightness(1.08);}
.fpd-storage .cap-save:disabled{opacity:.5;cursor:not-allowed;}
.fpd-storage .cap-meter{margin-top:16px;height:8px;border-radius:99px;background:#0F1624;overflow:hidden;}
.fpd-storage .cap-meter-fill{height:100%;border-radius:99px;transition:width .3s;}
.fpd-storage .cap-status{margin-top:10px;font-size:14px;color:${MUTED};}

/* alert history */
.fpd-storage .alert-row{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:16px;background:#0F1624;}
.fpd-storage .alert-row + .alert-row{margin-top:10px;}
.fpd-storage .alert-tag{border-radius:16px;padding:4px 9px;font-family:var(--font-mono);font-size:14px;font-weight:700;flex-shrink:0;}

/* platform add-on */
.fpd-storage .addon-card{padding:22px 26px;border-radius:18px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;background:#0F1624;border:1.5px solid rgba(255,255,255,0.08);transition:background .2s,border-color .2s;}
.fpd-storage .addon-card.on{background:rgba(217,165,94,0.08);border-color:rgba(217,165,94,0.35);}
.fpd-storage .addon-ico{width:52px;height:52px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(217,165,94,0.1);border:1.5px solid rgba(217,165,94,0.25);}
.fpd-storage .addon-badge{font-size:10.5px;padding:2px 9px;border-radius:20px;font-family:var(--font-mono);font-weight:700;flex-shrink:0;}
.fpd-storage .addon-price{font-size:21px;font-weight:800;}
.fpd-storage .addon-btn{padding:10px 20px;border-radius:99px;border:none;cursor:pointer;font-weight:700;font-size:14px;font-family:var(--font-body);background:linear-gradient(135deg,${WARN},#B4842E);color:#1C1608;box-shadow:0 6px 16px -8px rgba(217,165,94,0.6);}
.fpd-storage .addon-cancel{margin-top:8px;font-size:12.5px;color:${MUTED};background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:4px 11px;cursor:pointer;font-family:var(--font-body);}

/* addon purchase modal */
.fpd-storage .backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.8);backdrop-filter:blur(8px);}
.fpd-storage .modal{width:100%;max-width:460px;max-height:92vh;overflow-y:auto;background:#101728;border-radius:22px;border:1px solid rgba(255,255,255,0.08);}
.fpd-storage .modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 22px;background:linear-gradient(135deg,${WARN},#B4842E);}
.fpd-storage .modal-head-title{color:#1C1608;font-weight:700;font-size:15px;}
.fpd-storage .modal-head-sub{color:rgba(28,22,8,0.75);font-size:12px;}
.fpd-storage .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-storage .field label{display:block;margin-bottom:5px;font-size:11px;font-weight:600;color:${MUTED};font-family:var(--font-mono);letter-spacing:0.05em;}
.fpd-storage .field input{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1.5px solid rgba(217,165,94,0.3);color:${TEXT};font-size:14px;outline:none;font-family:var(--font-body);}
.fpd-storage .field input:focus{border-color:rgba(217,165,94,0.6);}
.fpd-storage .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fpd-storage .modal-btn-primary{width:100%;padding:13px;border-radius:12px;border:none;cursor:pointer;font-weight:700;font-size:14.5px;font-family:var(--font-body);background:linear-gradient(135deg,${WARN},#B4842E);color:#1C1608;box-shadow:0 6px 16px -8px rgba(217,165,94,0.6);}
.fpd-storage .modal-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
`;

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ── Disaster Recovery Protection — add-on purchase modal ──────────
   Mirrors the modal in DisasterRecovery.tsx (same pricing). Both read the
   add-on flag from disaster_recovery_state, so subscribing from either page
   stays in sync without either of them being able to set the flag: the row
   grants the owner SELECT only, and the processor webhook is the writer. */
function DRAddonModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [cardNum, setCardNum] = useState("4242424242424242");
  const [cardName, setCardName] = useState("James Doe");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("424");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    onSuccess();
    setStep("done");
  };

  return (
    <div className="backdrop">
      <div className="modal">
        <div className="modal-head">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} color="#1C1608" />
            <div>
              <div className="modal-head-title">Disaster Recovery Protection</div>
              <div className="modal-head-sub">Platform Add-On</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(28,22,8,0.15)", border: "none",
            borderRadius: 8, padding: 6, cursor: "pointer", color: "#1C1608" }}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {step === "select" && (<>
            <div className="row2">
              {(["monthly", "annual"] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding: "14px 12px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                  border: `2px solid ${billing === b ? WARN : "rgba(255,255,255,0.1)"}`,
                  background: billing === b ? "rgba(217,165,94,0.1)" : "#0F1624" }}>
                  <div style={{ fontSize: 11, color: MUTED, ...MONO, marginBottom: 4 }}>{b.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: billing === b ? WARN : TEXT }}>
                    ${b === "annual" ? "3.99" : "4.99"}<span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>/mo</span>
                  </div>
                  {b === "annual" && <div style={{ fontSize: 11, color: POS, marginTop: 3 }}>Save 20% · $47.88/yr</div>}
                </button>
              ))}
            </div>
            <div style={{ background: "rgba(217,165,94,0.06)", border: "1px solid rgba(217,165,94,0.2)",
              borderRadius: 12, padding: "14px 16px" }}>
              {["48-hour emergency bypass window", "100 GB bulk vault export", "AES-256 encrypted archive",
                "Secure 15-min download link", "Full audit trail"].map(item => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <CheckCircle size={12} color={WARN} />
                  <span style={{ fontSize: 13, color: SOFT }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("pay")} className="modal-btn-primary">
              Continue to Payment — ${billing === "annual" ? "3.99" : "4.99"}/mo →
            </button>
          </>)}

          {step === "pay" && (<>
            <div style={{ background: "#0F1624", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: SOFT }}>
              <strong style={{ color: TEXT }}>Disaster Recovery Protection</strong> · {billing === "annual" ? "$47.88/yr ($3.99/mo)" : "$4.99/month"}
            </div>
            <div style={{ background: "rgba(91,110,225,0.08)", border: "1px dashed rgba(91,110,225,0.3)",
              borderRadius: 8, padding: "8px 12px", fontSize: 12, color: ACCENT2 }}>
              🎮 Pre-filled with Stripe test card — just click Pay
            </div>
            <div className="space-y-3">
              <div className="field">
                <label>CARD NUMBER</label>
                <div style={{ position: "relative" }}>
                  <input value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16))}
                    style={{ paddingLeft: 36, letterSpacing: "0.05em" }} />
                  <CreditCard size={14} color={WARN} style={{ position: "absolute", left: 12, top: 34, transform: "translateY(-50%)" }} />
                </div>
              </div>
              <div className="field"><label>NAME ON CARD</label><input value={cardName} onChange={e => setCardName(e.target.value)} /></div>
              <div className="row2">
                <div className="field"><label>EXPIRY</label><input value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} /></div>
                <div className="field"><label>CVV</label><input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} type="password" maxLength={4} /></div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: FAINT, textAlign: "center" }}>🔒 Secured by Stripe · PCI DSS Level 1</div>
            <div className="flex gap-3">
              <button onClick={() => setStep("select")} style={{ flex: 1, padding: "11px", borderRadius: 10,
                border: "1.5px solid rgba(255,255,255,0.12)", background: "transparent",
                cursor: "pointer", color: MUTED, fontWeight: 600, fontSize: 13 }}>Back</button>
              <button onClick={handlePay} disabled={loading} className="modal-btn-primary" style={{ flex: 2, width: "auto" }}>
                {loading ? "Processing…" : `Pay $${billing === "annual" ? "47.88" : "4.99"} →`}
              </button>
            </div>
          </>)}

          {step === "done" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div style={{ width: 60, height: 60, borderRadius: "50%",
                background: "rgba(95,190,145,0.12)", border: "2px solid rgba(95,190,145,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={26} color={POS} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: TEXT, marginBottom: 4 }}>Add-On Activated!</div>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                  Disaster Recovery Protection is now active on your account.<br />
                  Contact support to request an emergency bypass when needed.
                </p>
              </div>
              <button onClick={onClose} className="modal-btn-primary" style={{ width: "auto", padding: "11px 28px" }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StorageUsage() {
  const [overageBilling] = useState(true);
  const [cryptoPlan, setCryptoPlan] = useState<{ name: string; price: number } | null>(null);
  const [showDRModal, setShowDRModal] = useState(false);
  const { authUser } = useAuth();
  const [drActive, setDrActive] = useState(false);
  const [capEnabled, setCapEnabled] = useState(true);
  const [capAmount, setCapAmount] = useState<number>(25);

  const refreshDr = useCallback(async () => {
    if (!authUser) return;
    const { data } = await db.getDisasterRecoveryState(authUser.id);
    setDrActive(Boolean(data?.addon_active));
  }, [authUser]);

  useEffect(() => { void refreshDr(); }, [refreshDr]);

  // The spend cap is the one piece of state on this page the user genuinely
  // owns, so it round-trips to storage_spend_caps rather than localStorage —
  // the limit then applies to billing wherever the account is signed in.
  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    void db.getStorageSpendCap(authUser.id).then(({ data }) => {
      if (cancelled || !data) return;
      setCapEnabled(data.cap_enabled);
      if (data.cap_amount_usd !== null) setCapAmount(Number(data.cap_amount_usd));
    });
    return () => { cancelled = true; };
  }, [authUser]);
  const plansRef = useRef<HTMLDivElement>(null);
  const { data: plansData } = useAdminFetch(() => publicApi.get<{ plans: DBPlan[] }>("/plans"), []);
  const plans = (plansData?.plans?.length
    ? plansData.plans.map(p => ({ id: p.id, name: p.name, storage: p.storage_gb, price: Number(p.price_monthly), overage: Number(p.overage_rate) }))
    : FALLBACK_PLANS
  ).map(p => ({ ...p, current: p.id === CURRENT_PLAN_ID }));
  const used = STORAGE_USED_GB;
  const total = STORAGE_LIMIT_GB;
  const percent = Math.round((used / total) * 100);
  const overageRate = 0.40; // $0.40/GB on Legacy Archive (Starter is $0.50/GB)
  const projectedEOM = 21.4;
  const projectedOverage = Math.max(0, projectedEOM - total);
  const projectedOverageCost = projectedOverage * overageRate;
  const capPercent = capAmount > 0 ? Math.min(100, Math.round((projectedOverageCost / capAmount) * 100)) : 0;
  const capColor = capPercent >= 100 ? "#E53E3E" : capPercent >= 80 ? NEG : capPercent >= 50 ? WARN : POS;

  const saveCap = async () => {
    if (!authUser) { toast.error("Sign in to save your spending cap."); return; }
    const { error } = await db.saveStorageSpendCap(authUser.id, capEnabled, capEnabled ? capAmount : null);
    if (error) { toast.error(`Could not save spending cap: ${error.message}`); return; }
    toast.success(capEnabled ? `Spending cap set to $${capAmount.toFixed(2)}/mo` : "Spending cap disabled — overage charges are uncapped");
  };

  const getBarColor = (pct: number) => {
    if (pct >= 95) return "#E53E3E";
    if (pct >= 90) return NEG;
    if (pct >= 80) return WARN;
    return ACCENT;
  };

  const bannerColor = percent >= 95 ? "#E53E3E" : percent >= 90 ? NEG : WARN;

  const kpis = [
    { label: "Storage Used", value: `${used} GB`, sub: `of ${total} GB`, icon: <HardDrive size={14}/>, dot: getBarColor(percent) },
    { label: "Usage %", value: `${percent}%`, sub: "Current billing cycle", icon: <Percent size={14}/>, dot: getBarColor(percent) },
    { label: "Projected EOM", value: `${projectedEOM} GB`, sub: "End-of-month estimate", icon: <TrendingUp size={14}/>, dot: projectedEOM > total ? NEG : POS },
    { label: "Est. Overage", value: projectedOverage > 0 ? `$${(projectedOverage * overageRate).toFixed(2)}` : "$0.00", sub: projectedOverage > 0 ? `${projectedOverage.toFixed(1)} GB @ $${overageRate}/GB` : "No overage projected", icon: <Gauge size={14}/>, dot: projectedOverage > 0 ? NEG : POS },
  ];

  return (
    <div className="fpd-storage">
      <style dangerouslySetInnerHTML={{ __html: STORAGE_CSS }} />
      <div className="fpd-storage-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroStoragePhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Storage &amp; Billing</span>
            <h1>Every gigabyte, <span className="accent">clearly accounted for.</span></h1>
            <p>Track what you're using across every category, see what's coming, and upgrade before you hit a limit.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><TrendingUp size={15} /> View Plans</button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><HardDrive size={12} /> STORAGE & BILLING</div>
            <h1 className="pg-h1">Storage & Usage</h1>
            <div className="pg-sub">
              Storage is metered in gigabytes. Unused monthly allowance expires at billing cycle reset. Overage is billed at ${overageRate}/GB.
            </div>
          </div>
        </div>

        {/* ── Alert banner ── */}
        {percent >= 80 && (
          <div className="alert-banner" style={{ background: `${bannerColor}14`, borderColor: `${bannerColor}4D` }}>
            <AlertTriangle size={16} color={bannerColor}/>
            <div>
              <span style={{ color: bannerColor, fontWeight: 600, fontSize: 17.5 }}>{percent}% Storage Used</span>
              <span style={{ color: MUTED, fontSize: 17.5 }}>
                {percent >= 95 ? " — Overage billing begins when limit is reached." :
                 percent >= 90 ? " — We recommend upgrading your plan." :
                 " — Consider managing your storage."}
              </span>
            </div>
          </div>
        )}

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background:`linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Storage meter ── */}
        <div className="card pad">
          <div className="meter-hd">
            <h3 className="sec-title" style={{ marginBottom: 0 }}><span className="tick"/>Current Billing Cycle</h3>
            <div style={{ color: MUTED, fontSize: 15, fontFamily: "var(--font-mono)" }}>Resets Jul 1, 2026</div>
          </div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${getBarColor(40)}, ${getBarColor(percent)})` }}/>
            {[80, 90, 95].map(threshold => (
              <div key={threshold} className="meter-mark" style={{ left: `${threshold}%` }}>
                <span>{threshold}%</span>
              </div>
            ))}
            <div className="meter-label">{used} GB / {total} GB</div>
          </div>
          <div className="thresh-row">
            {[
              { label: "80% Threshold", pct: 80, msg: "Usage warning email", color: WARN },
              { label: "90% Threshold", pct: 90, msg: "Upgrade recommended email", color: NEG },
              { label: "95% Threshold", pct: 95, msg: "Critical alert email", color: "#E53E3E" },
              { label: "100% Limit", pct: 100, msg: "Overage billing begins", color: "#6FAE8B" },
            ].map(t => (
              <div key={t.pct} className="thresh">
                <div className="thresh-pct" style={{ color: t.color }}>{t.pct}%</div>
                <div className="thresh-lbl">{t.label}</div>
                <div className="thresh-msg">{t.msg}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Usage by month — pure CSS bar chart */}
          <div className="card pad">
            <h3 className="sec-title"><span className="tick"/>6-Month Usage History</h3>
            <div className="chart-wrap">
              <div className="chart-limit" style={{ bottom: Math.round((total/total)*120) }}>
                <span>{total} GB limit</span>
              </div>
              {usageByMonth.map((d, i) => {
                const barH = Math.round((d.used / total) * 120);
                const barColor = d.used >= total * 0.95 ? "#E53E3E" : d.used >= total * 0.9 ? NEG : d.used >= total * 0.8 ? WARN : ACCENT;
                return (
                  <div key={i} className="chart-col">
                    <span className="chart-val">{d.used}GB</span>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: barH, background: barColor, opacity: i === usageByMonth.length-1 ? 1 : 0.88 }}/>
                    </div>
                    <span className="chart-val">{d.month}</span>
                  </div>
                );
              })}
            </div>
            <p className="chart-foot">Unused monthly GB expire at billing cycle reset. No carry-forward.</p>
          </div>

          {/* Usage by category */}
          <div className="card pad">
            <h3 className="sec-title"><span className="tick"/>Usage by Category</h3>
            <div>
              {usageByCategory.map(cat => (
                <div key={cat.category} className="cat-row">
                  <div className="cat-hd">
                    <span style={{ color: TEXT, fontSize: 16 }}>{cat.category}</span>
                    <span style={{ color: MUTED, fontSize: 15, fontFamily: "var(--font-mono)" }}>{cat.gb} GB</span>
                  </div>
                  <div className="cat-track">
                    <div className="cat-fill" style={{ width: `${(cat.gb / used) * 100}%`, background: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Plan comparison + upgrade ── */}
        <div className="card pad" ref={plansRef}>
          <h3 className="sec-title"><span className="tick"/>Your Plan & Upgrade Options</h3>
          <div className="plan-grid">
            {plans.map(plan => (
              <div key={plan.id} className={`plan-card ${plan.current ? "current" : ""}`}>
                {plan.current && <div className="plan-tag">CURRENT PLAN</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="flex items-baseline gap-1" style={{ marginBottom: 12 }}>
                  <span className="plan-price">${plan.price}</span>
                  <span className="plan-price-sub">/mo</span>
                </div>
                <div className="plan-detail" style={{ marginBottom: 4 }}>{plan.storage >= 1024 ? `${plan.storage / 1024} TB` : `${plan.storage} GB`} storage</div>
                <div className="plan-detail" style={{ marginBottom: 12, fontSize: 14 }}>Overage: ${plan.overage}/GB</div>
                {!plan.current && (
                  <div className="space-y-2">
                    <button
                      onClick={() => toast.success(plan.storage > total ? `Upgrading to ${plan.name} — $${plan.price}/mo` : `Downgrading to ${plan.name} — $${plan.price}/mo`)}
                      className={`plan-btn ${plan.storage > total ? "up" : "down"}`}
                    >
                      {plan.storage > total ? "Upgrade" : "Downgrade"} (Card)
                    </button>
                    {plan.storage > total && (
                      <button onClick={() => setCryptoPlan({ name: plan.name, price: plan.price })} className="plan-btn crypto">
                        <span style={{ marginRight:4 }}>₿</span>Pay with Crypto
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="overage-note">
            <ArrowUp size={13} color={NEG} />
            <span>
              Overage rate: <strong style={{ color: TEXT }}>${overageRate}/GB</strong> above your plan limit (Legacy Archive). Starter plan is $0.50/GB. Billed automatically at end of billing cycle.
            </span>
          </div>
        </div>

        {/* ── Spending protection cap ── */}
        <div className="card pad">
          <div className="cap-row">
            <div>
              <h3 className="sec-title" style={{ marginBottom: 8 }}><span className="tick"/>Spending Protection Cap</h3>
              <p className="cap-copy">Set a maximum monthly overage spend. Once your projected overage charges reach this cap, new uploads pause instead of billing past it — no surprise charges on your card.</p>
            </div>
            <button
              onClick={() => setCapEnabled(!capEnabled)}
              className="toggle"
              style={{ background: capEnabled ? "rgba(91,110,225,0.85)" : "rgba(255,255,255,0.06)", borderColor: capEnabled ? ACCENT : "rgba(255,255,255,0.14)" }}
            >
              <div className="thumb" style={{ left: capEnabled ? 24 : 4 }} />
            </button>
          </div>

          <div className="cap-controls">
            <div className="cap-field">
              <label>MONTHLY OVERAGE CAP</label>
              <div className="cap-input-wrap">
                <span>$</span>
                <input
                  type="number" min={0} step={1} disabled={!capEnabled}
                  value={capAmount}
                  onChange={e => setCapAmount(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
            <button className="cap-save" onClick={saveCap}><Save size={14}/> Save Cap</button>
          </div>

          {capEnabled ? (
            <>
              <div className="cap-meter">
                <div className="cap-meter-fill" style={{ width: `${capPercent}%`, background: capColor }} />
              </div>
              <div className="cap-status">
                <ShieldCheck size={13} color={capColor} style={{ verticalAlign: -2, marginRight: 6 }}/>
                ${projectedOverageCost.toFixed(2)} of ${capAmount.toFixed(2)} projected this cycle
                {capPercent >= 100 ? " — uploads will pause until your next billing cycle or plan upgrade." : "."}
              </div>
            </>
          ) : (
            <div className="cap-status">
              <AlertTriangle size={13} color={WARN} style={{ verticalAlign: -2, marginRight: 6 }}/>
              No cap set — overage charges at ${overageRate}/GB will continue to bill automatically with no limit.
            </div>
          )}
        </div>

        {/* ── Platform Add-Ons ── */}
        <div>
          <h3 className="sec-title"><span className="tick"/>Platform Add-Ons</h3>
          <div className={`addon-card ${drActive ? "on" : ""}`}>
            <div className="addon-ico">🛡️</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Disaster Recovery Protection</span>
                {drActive ? (
                  <span className="addon-badge" style={{ background: "rgba(217,165,94,0.14)", color: WARN, border: "1px solid rgba(217,165,94,0.3)" }}>⚡ ACTIVE</span>
                ) : (
                  <span className="addon-badge" style={{ background: "rgba(163,173,201,0.1)", color: MUTED, border: "1px solid rgba(163,173,201,0.2)" }}>NOT SUBSCRIBED</span>
                )}
              </div>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                {drActive
                  ? "Your account is protected. A Master Admin can activate a 48-hour emergency bypass window giving you bulk-export access to your entire vault."
                  : "Emergency bulk-export access for your vault during a crisis — data loss, account compromise, or urgent estate needs. 48-hour admin-activated bypass, 100 GB export limit."}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {drActive ? (
                <div>
                  <div style={{ fontSize: 11, color: WARN, ...MONO, marginBottom: 4 }}>SUBSCRIBED</div>
                  <div className="addon-price" style={{ color: WARN }}>$4.99<span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>/mo</span></div>
                  <button onClick={() => { toast.info("Cancellation is processed through billing — the add-on stays active until the current period ends."); void refreshDr(); }} className="addon-cancel">
                    Cancel Add-On
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: MUTED, ...MONO, marginBottom: 4 }}>FROM</div>
                  <div className="addon-price" style={{ color: TEXT }}>$3.99<span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>/mo</span></div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>or $4.99/mo monthly</div>
                  <button onClick={() => setShowDRModal(true)} className="addon-btn">Add for $4.99/mo</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Alert history ── */}
        <div className="card pad">
          <h3 className="sec-title"><span className="tick"/>Notification History</h3>
          <div>
            {alertHistory.map((alert, i) => (
              <div key={i} className="alert-row">
                <div className="alert-tag" style={{ background: `${alert.color}20`, color: alert.color }}>{alert.type}</div>
                <div style={{ color: TEXT, fontSize: 16, flex: 1 }}>{alert.message}</div>
                <div style={{ color: MUTED, fontSize: 15, flexShrink: 0 }}>{alert.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {cryptoPlan && (
        <CryptoPayment
          open={true}
          amountUSD={cryptoPlan.price}
          label={`${cryptoPlan.name} Plan — $${cryptoPlan.price}/mo`}
          onSuccess={() => { setCryptoPlan(null); toast.success(`Upgraded to ${cryptoPlan.name} via crypto!`); }}
          onClose={() => setCryptoPlan(null)}
        />
      )}

      {showDRModal && (
        <DRAddonModal
          onClose={() => setShowDRModal(false)}
          onSuccess={() => { setDrActive(true); toast.success("Disaster Recovery Protection is now active"); }}
        />
      )}
    </div>
  );
}
