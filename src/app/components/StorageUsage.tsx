import React, { useState, useRef, useEffect } from "react";
import { HardDrive, AlertTriangle, TrendingUp, ArrowUp, Percent, Gauge, CheckCircle, CreditCard, Shield, Trash2, Save, Clock } from "lucide-react";
import { toast } from "sonner";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { deriveStorageBreakdown, deriveMonthlyUsage, projectEndOfMonth } from "../utils/storageBreakdown";
import { useDemo } from "../context/DemoContext";
import { usePlatform } from "../services/platform";
import { starterDaysLeft } from "../utils/starterPlan";
import { billing, notifyBillingChanged, type Interval } from "../services/billing";
import { useBillingSummary } from "../hooks/useBillingSummary";
import { annualSavingPct, formatPrice, formatStorage, usePlans, useProducts } from "../utils/planCatalog";
import { CheckoutConsentModal, type Purchase } from "./billing/CheckoutConsentModal";
import heroStoragePhoto from "../../imports/storageusage_hero_photo.webp";

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

/* Billing state comes from the server (/account/billing/summary): the plan
   subscription, the storage usage period and overage so far, the overage
   limit, and the add-ons. Charts are derived from the account's documents
   (utils/storageBreakdown.ts). */

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
@media (max-width:430px){.fpd-storage .kpi-stack{grid-template-columns:1fr;}}

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
.fpd-storage .cap-card{overflow:hidden;transition:border-color .2s,background .2s;}
.fpd-storage .cap-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 28px;border-bottom:1px solid rgba(255,255,255,0.06);}
.fpd-storage .cap-title{font-family:var(--font-display);font-size:19px;font-weight:600;color:${TEXT};letter-spacing:-0.01em;}
.fpd-storage .cap-sub{color:${MUTED};font-size:14.5px;margin-top:2px;}
.fpd-storage .cap-body{padding:24px 28px;display:flex;flex-direction:column;gap:18px;}
.fpd-storage .cap-wall{display:flex;align-items:flex-start;gap:16px;padding:18px;border-radius:16px;background:rgba(229,62,62,0.09);border:1px solid rgba(229,62,62,0.35);}
.fpd-storage .cap-wall-title{color:#F08A8A;font-weight:700;font-size:16.5px;margin-bottom:5px;}
.fpd-storage .cap-wall-copy{color:${SOFT};font-size:15px;line-height:1.55;margin-bottom:14px;}
.fpd-storage .cap-wall-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;}
.fpd-storage .cap-wall-btn.del{background:#C53030;color:#fff;}
.fpd-storage .cap-wall-btn.up{background:rgba(91,110,225,0.14);color:#AEB9F5;border:1px solid rgba(91,110,225,0.36);}
.fpd-storage .cap-line{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.fpd-storage .cap-meter{height:12px;border-radius:99px;background:#0F1624;overflow:hidden;margin:8px 0 7px;}
.fpd-storage .cap-meter-fill{height:100%;border-radius:99px;transition:width .3s;}
.fpd-storage .cap-info{display:flex;align-items:center;gap:9px;padding:12px 16px;border-radius:14px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.14);color:${MUTED};font-size:14.5px;line-height:1.5;}
.fpd-storage .toggle{position:relative;width:44px;height:24px;border-radius:99px;flex-shrink:0;border:1px solid;cursor:pointer;transition:background .18s,border-color .18s;padding:0;}
.fpd-storage .toggle .thumb{position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#0A0F1A;transition:left .18s;}
.fpd-storage .cap-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fpd-storage .cap-input-wrap{position:relative;}
.fpd-storage .cap-input-wrap span{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:${MUTED};font-size:15px;}
.fpd-storage .cap-input-wrap input{width:104px;padding:8px 10px 8px 24px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:15px;outline:none;font-family:var(--font-mono);transition:border-color .18s;}
.fpd-storage .cap-input-wrap input:focus{border-color:rgba(91,110,225,0.5);}
.fpd-storage .cap-input-wrap input:disabled{opacity:.45;cursor:not-allowed;}
.fpd-storage .cap-save{padding:8px 14px;border-radius:12px;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;transition:filter .18s;display:inline-flex;align-items:center;gap:7px;}
.fpd-storage .cap-save:hover{filter:brightness(1.08);}

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
/* subscription panel + billing-period toggle */
.fpd-storage .sub-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-storage .sub-name{font-family:var(--font-display);font-size:22px;color:${TEXT};font-weight:600;}
.fpd-storage .sub-meta{color:${MUTED};font-size:15px;margin-top:4px;}
.fpd-storage .sub-actions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-storage .sub-btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:${SOFT};}
.fpd-storage .sub-btn.primary{border:none;background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;}
.fpd-storage .sub-btn:disabled{opacity:.5;cursor:not-allowed;}
.fpd-storage .sub-note{margin-top:14px;padding:12px 16px;border-radius:14px;display:flex;align-items:center;gap:10px;font-size:15px;line-height:1.5;}
.fpd-storage .iv-toggle{display:inline-flex;padding:4px;border-radius:99px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-storage .iv-toggle button{padding:7px 16px;border-radius:99px;border:none;cursor:pointer;font-size:14.5px;font-weight:600;background:transparent;color:${MUTED};font-family:var(--font-body);}
.fpd-storage .iv-toggle button.on{background:${ACCENT};color:#fff;}
`;

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const GB = 1024 ** 3;

function longDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}

const usd = (n: number) => `$${n.toFixed(2)}`;

export function StorageUsage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user, docs, notifications } = useDemo();
  const platform = usePlatform();
  const plans = usePlans();
  const products = useProducts();
  const { summary, refresh } = useBillingSummary();
  const [interval, setBillingInterval] = useState<Interval>("month");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [capDraft, setCapDraft] = useState<string>("");
  const plansRef = useRef<HTMLDivElement>(null);
  const { authUser } = useAuth();
  /* An add-on an admin turned on has no subscription; its flag is in
     disaster_recovery_state (read-only to the owner). */
  const [drStateActive, setDrStateActive] = useState(false);
  useEffect(() => {
    if (!authUser) return;
    void db.getDisasterRecoveryState(authUser.id).then(({ data }) => setDrStateActive(Boolean(data?.addon_active)));
  }, [authUser, summary]);

  const planSub = summary?.planSubscription ?? null;
  const drSub = summary?.drSubscription ?? null;
  const comped = Boolean(planSub?.id.startsWith("comp_"));
  const paidSub = planSub && !comped ? planSub : null;
  useEffect(() => { if (paidSub?.interval) setBillingInterval(paidSub.interval); }, [paidSub?.interval]);
  useEffect(() => { if (summary) setCapDraft((summary.capCents / 100).toFixed(2)); }, [summary?.capCents]); // eslint-disable-line react-hooks/exhaustive-deps

  const starterDays = starterDaysLeft(user.plan, user.starterStartedAt, platform.starterTrialDays);
  const currentPlan = plans.find(p => p.id === user.plan);
  const overageRate = currentPlan?.overageRate ?? 0;
  const usage = summary?.usage ?? null;
  const overageAllowed = Boolean(usage?.overage_allowed);

  /* Storage figures: the meter (usage period) when it's there, otherwise the
     sum of the account's documents — the same numbers the Dashboard shows. */
  const used = usage ? +(usage.current_bytes / GB).toFixed(2) : user.storageUsed;
  const total = usage ? +(usage.included_bytes / GB).toFixed(2) || user.storageLimit : user.storageLimit || 1;
  const percent = Math.min(100, Math.round((used / (total || 1)) * 100));
  const overageSoFar = (usage?.billable_cents ?? 0) / 100;
  const cap = (summary?.capCents ?? 0) / 100;
  const capPct = cap > 0 ? Math.min(100, Math.round((overageSoFar / cap) * 100)) : 0;
  const capBarColor = capPct >= 100 ? "#E53E3E" : capPct >= 80 ? NEG : capPct >= 50 ? WARN : POS;
  const resetsOn = usage?.period_end ? longDate(usage.period_end) : longDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString());

  const usageByCategory = deriveStorageBreakdown(docs).map(c => ({ category: c.label, gb: c.gb, color: c.color }));
  const usageByMonth = deriveMonthlyUsage(docs);
  const projectedEOM = projectEndOfMonth(docs, used);
  const projectedOverGb = Math.max(0, projectedEOM - total);
  const storageAlerts = notifications.filter(n => /storage|usage|overage|limit|payment|renew/i.test(`${n.title} ${n.message}`));

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      notifyBillingChanged();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = () => run("portal", async () => { window.location.assign((await billing.portal()).url); });

  const saveCap = () => {
    const value = Number(capDraft);
    if (!Number.isFinite(value) || value < 0) { toast.error("Enter a dollar amount"); return; }
    void run("cap", () => billing.setOverageCap(value), `Overage limit set to ${usd(value)} a month`);
  };

  const choosePlan = (planId: string, planName: string, priceMonthly: number, priceAnnual: number) => {
    if (comped) { toast.info("Your plan was provided by Final Pass Down. Contact support to change it."); return; }
    if (!paidSub) { setPurchase({ kind: "plan", planId, planName, interval }); return; }
    const cur = plans.find(p => p.id === paidSub.plan_id);
    const curEq = cur ? (paidSub.interval === "year" ? cur.priceAnnual / 12 : cur.priceMonthly) : 0;
    const newEq = interval === "year" ? priceAnnual / 12 : priceMonthly;
    // Yearly → monthly always waits for the end of the paid year (same rule as the server).
    const up = !(paidSub.interval === "year" && interval === "month")
      && (newEq > curEq || (paidSub.plan_id === planId && paidSub.interval === "month" && interval === "year"));
    setPurchase({
      kind: "change", planId, planName, interval, direction: up ? "up" : "down",
      priceLabel: interval === "year" ? `${formatPrice(priceAnnual)}/yr` : `${formatPrice(priceMonthly)}/mo`,
      effectiveAt: paidSub.current_period_end,
    });
  };

  const getBarColor = (pct: number) => pct >= 95 ? "#E53E3E" : pct >= 90 ? NEG : pct >= 80 ? WARN : ACCENT;
  const bannerColor = percent >= 95 ? "#E53E3E" : percent >= 90 ? NEG : WARN;
  const pendingPlan = paidSub?.pending_plan_id ? plans.find(p => p.id === paidSub.pending_plan_id) : null;
  const drMonthly = products.dr_addon_month?.amountCents ?? 499;
  const drYearly = products.dr_addon_year?.amountCents ?? 4788;
  const drAdminGranted = !drSub && drStateActive;
  const bestSaving = Math.max(0, ...plans.filter(p => p.billable).map(annualSavingPct));

  const kpis = [
    { label: "Storage Used", value: `${used} GB`, sub: `of ${total} GB included`, icon: <HardDrive size={14}/>, dot: getBarColor(percent) },
    { label: "Usage %", value: `${percent}%`, sub: `Period ends ${resetsOn}`, icon: <Percent size={14}/>, dot: getBarColor(percent) },
    { label: "Projected", value: `${projectedEOM} GB`, sub: "End-of-month estimate", icon: <TrendingUp size={14}/>, dot: projectedEOM > total ? NEG : POS },
    { label: "Overage this period", value: usd(overageSoFar), sub: overageAllowed ? `${usage?.billable_units ?? 0} GB over × ${usd(overageRate)}/GB` : projectedOverGb > 0 ? "Uploads stop at your limit" : "None", icon: <Gauge size={14}/>, dot: overageSoFar > 0 ? NEG : POS },
  ];

  return (
    <div className="fpd-storage">
      <style dangerouslySetInnerHTML={{ __html: STORAGE_CSS }} />
      <div className="fpd-storage-grain" />

      <div className="wrap fpd-fade-in-up">
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroStoragePhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Usage &amp; Billing</span>
            <h1>Every gigabyte, <span className="accent">clearly accounted for.</span></h1>
            <p>See what you're using and what you're paying, change your plan, and manage your card and invoices.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><TrendingUp size={15} /> View Plans</button>
              {summary?.hasCustomer && <button className="hbtn ghost" onClick={() => void openPortal()}><CreditCard size={15}/> Manage billing</button>}
            </div>
          </div>
        </div>

        {/* ── Your subscription ── */}
        <div className="card pad">
          <h3 className="sec-title"><span className="tick"/>Your Plan</h3>
          <div className="sub-row">
            <div>
              <div className="sub-name">{currentPlan?.name ?? summary?.planName ?? user.plan}</div>
              <div className="sub-meta">
                {comped ? "Provided by Final Pass Down. No charge."
                  : paidSub ? `${paidSub.interval === "year" ? formatPrice(currentPlan?.priceAnnual ?? 0) + "/yr" : formatPrice(currentPlan?.priceMonthly ?? 0) + "/mo"} · ${paidSub.cancel_at_period_end ? `Ends ${longDate(paidSub.current_period_end)}` : `Renews ${longDate(paidSub.current_period_end)}`}`
                  : user.plan === "starter" ? `Free for ${platform.starterTrialDays} days${starterDays !== null ? ` · ${starterDays} day${starterDays === 1 ? "" : "s"} left` : ""}`
                  : "No card subscription on this account yet."}
              </div>
            </div>
            <div className="sub-actions">
              {paidSub && !paidSub.cancel_at_period_end && (
                <button className="sub-btn" disabled={busy !== null}
                  onClick={() => { if (window.confirm(`Cancel ${currentPlan?.name ?? "your plan"}? It stays active until ${longDate(paidSub.current_period_end)}, then it won't renew.`)) void run("cancel", () => billing.cancel("plan"), "Your plan won't renew. It stays active until the end of this period."); }}>
                  {busy === "cancel" ? "Cancelling…" : "Cancel plan"}
                </button>
              )}
              {paidSub?.cancel_at_period_end && (
                <button className="sub-btn primary" disabled={busy !== null} onClick={() => void run("resume", () => billing.resume("plan"), "Your plan will renew as usual.")}>
                  {busy === "resume" ? "Resuming…" : "Keep my plan"}
                </button>
              )}
              {summary?.hasCustomer && <button className="sub-btn" disabled={busy !== null} onClick={() => void openPortal()}><CreditCard size={14}/> Cards &amp; invoices</button>}
            </div>
          </div>
          {pendingPlan && paidSub && (
            <div className="sub-note" style={{ background: "rgba(91,110,225,0.07)", border: "1px solid rgba(91,110,225,0.22)", color: SOFT }}>
              <Clock size={15} color={ACCENT}/>
              <span style={{ flex: 1 }}>Switching to <strong style={{ color: TEXT }}>{pendingPlan.name}</strong> ({paidSub.pending_interval === "year" ? "yearly" : "monthly"}) on {longDate(paidSub.pending_change_at)}.</span>
              <button className="sub-btn" disabled={busy !== null} onClick={() => void run("keep", () => billing.cancelPendingChange(), `You'll stay on ${currentPlan?.name}.`)}>Keep current plan</button>
            </div>
          )}
          {user.planStatus === "past_due" && (
            <div className="sub-note" style={{ background: "rgba(208,107,107,0.08)", border: "1px solid rgba(208,107,107,0.3)", color: "#F08A8A" }}>
              <AlertTriangle size={15}/> Your last payment didn't go through. Update your card in Cards &amp; invoices; we'll retry automatically.
            </div>
          )}
          {summary?.billingPaused && (
            <div className="sub-note" style={{ background: "rgba(217,165,94,0.08)", border: "1px solid rgba(217,165,94,0.3)", color: WARN }}>
              <AlertTriangle size={15}/> Billing is being updated. New purchases and plan changes will be back in a few minutes.
            </div>
          )}
        </div>

        {percent >= 80 && (
          <div className="alert-banner" style={{ background: `${bannerColor}14`, borderColor: `${bannerColor}4D` }}>
            <AlertTriangle size={16} color={bannerColor}/>
            <div>
              <span style={{ color: bannerColor, fontWeight: 600, fontSize: 17.5 }}>{percent}% of your storage used</span>
              <span style={{ color: MUTED, fontSize: 17.5 }}>
                {!overageAllowed ? " — uploads stop at your plan's limit. Upgrade for more room."
                  : percent >= 95 ? ` — storage above your plan is billed at ${usd(overageRate)}/GB.`
                  : " — consider upgrading or tidying up."}
              </span>
            </div>
          </div>
        )}

        {/* ── Overage limit ── */}
        <div className="card cap-card" style={capPct >= 100 || summary?.overageBlocked ? { borderColor: "rgba(229,62,62,0.4)", background: "#1A1420" } : undefined}>
          <div className="cap-head">
            <div className="flex items-center gap-3">
              <Shield size={18} color={capPct >= 100 ? "#F08A8A" : ACCENT} />
              <div>
                <div className="cap-title">Overage Limit</div>
                <div className="cap-sub">
                  {overageAllowed
                    ? `Storage above your plan is ${usd(overageRate)}/GB (the peak over the period). Uploads pause before overage would pass ${usd(cap)} a month.`
                    : user.plan === "starter" ? "Starter includes 1 GB with no overage. Uploads stop at the limit."
                    : comped ? "Your plan has no overage. Uploads stop at the limit."
                    : "Overage applies to paid plans."}
                </div>
              </div>
            </div>
            {overageAllowed && (
              <div className="cap-controls">
                <div className="cap-input-wrap">
                  <span>$</span>
                  <input type="number" min={0} step={1} aria-label="Monthly overage limit" value={capDraft} onChange={e => setCapDraft(e.target.value)} />
                </div>
                <button className="cap-save" disabled={busy !== null} onClick={saveCap}><Save size={14}/> {busy === "cap" ? "Saving…" : "Save limit"}</button>
              </div>
            )}
          </div>

          <div className="cap-body">
            {summary?.overageBlocked && (
              <div className="cap-wall">
                <AlertTriangle size={20} color="#F08A8A" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div className="cap-wall-title">Overage payment failed</div>
                  <div className="cap-wall-copy">We couldn't take your last storage overage payment, so uploads are limited to your plan's {total} GB until it's paid. Everything stored is safe.</div>
                  <button className="cap-wall-btn up" onClick={() => void openPortal()}><CreditCard size={13}/> Pay or update card</button>
                </div>
              </div>
            )}
            {overageAllowed && capPct >= 100 && !summary?.overageBlocked && (
              <div className="cap-wall">
                <AlertTriangle size={20} color="#F08A8A" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div className="cap-wall-title">Uploads paused: {usd(cap)} overage limit reached</div>
                  <div className="cap-wall-copy">Raise your limit to keep uploading (nothing extra is charged for what was already paused), free up space, or move to a bigger plan.</div>
                  <div className="flex gap-3 flex-wrap">
                    <button className="cap-wall-btn up" onClick={() => setCapDraft(String(Math.ceil(cap * 2) || 10))}><ArrowUp size={13}/> Raise my limit</button>
                    <button className="cap-wall-btn del" onClick={() => onNavigate?.("file-cabinet")}><Trash2 size={13}/> Free up space</button>
                  </div>
                </div>
              </div>
            )}
            {overageAllowed && (
              <div>
                <div className="cap-line">
                  <span style={{ color: TEXT, fontSize: 15.5, fontWeight: 500 }}>Overage this period</span>
                  <span style={{ ...MONO, fontSize: 15.5, fontWeight: 700, color: capBarColor }}>{usd(overageSoFar)} / {usd(cap)}</span>
                </div>
                <div className="cap-meter"><div className="cap-meter-fill" style={{ width: `${capPct}%`, background: capBarColor }} /></div>
                <div className="cap-line">
                  <span style={{ color: MUTED, fontSize: 13.5 }}>
                    {paidSub?.interval === "year" ? "Billed monthly, separately from your yearly plan." : "Added to your next renewal invoice."}
                  </span>
                  <span style={{ color: MUTED, fontSize: 13.5, ...MONO }}>PERIOD ENDS {resetsOn.toUpperCase()}</span>
                </div>
              </div>
            )}
            {!overageAllowed && (
              <div className="cap-info"><CheckCircle size={14} color={POS} style={{ flexShrink: 0 }} /><span>You'll never be charged for overage on this plan.</span></div>
            )}
          </div>
        </div>

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

        <div className="card pad">
          <div className="meter-hd">
            <h3 className="sec-title" style={{ marginBottom: 0 }}><span className="tick"/>Current Usage Period</h3>
            <div style={{ color: MUTED, fontSize: 15, fontFamily: "var(--font-mono)" }}>Ends {resetsOn}</div>
          </div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${getBarColor(40)}, ${getBarColor(percent)})` }}/>
            {[80, 90, 95].map(threshold => (
              <div key={threshold} className="meter-mark" style={{ left: `${threshold}%` }}><span>{threshold}%</span></div>
            ))}
            <div className="meter-label">{used} GB / {total} GB</div>
          </div>
          <div className="thresh-row">
            {[
              { label: "80% Threshold", pct: 80, msg: "Usage warning", color: WARN },
              { label: "90% Threshold", pct: 90, msg: "Upgrade recommended", color: NEG },
              { label: "95% Threshold", pct: 95, msg: "Critical alert", color: "#E53E3E" },
              { label: "100% Limit", pct: 100, msg: overageAllowed ? `Overage at ${usd(overageRate)}/GB` : "Uploads stop", color: "#6FAE8B" },
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
          <div className="card pad">
            <h3 className="sec-title"><span className="tick"/>6-Month Usage History</h3>
            {(() => {
              const scale = Math.max(total, ...usageByMonth.map(d => d.used));
              return (
                <div className="chart-wrap">
                  <div className="chart-limit" style={{ bottom: Math.round((total / scale) * 120) + 18 }}><span>{total} GB limit</span></div>
                  {usageByMonth.map((d, i) => {
                    const barColor = d.used >= total * 0.95 ? "#E53E3E" : d.used >= total * 0.9 ? NEG : d.used >= total * 0.8 ? WARN : ACCENT;
                    return (
                      <div key={i} className="chart-col">
                        <span className="chart-val">{d.used}GB</span>
                        <div className="chart-bar-wrap"><div className="chart-bar" style={{ height: Math.round((d.used / scale) * 120), background: barColor, opacity: i === usageByMonth.length - 1 ? 1 : 0.65 }}/></div>
                        <span className="chart-val">{d.month}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="chart-foot">{docs.length === 0 ? "Nothing stored yet. Documents you upload to the File Cabinet count against this limit." : "Storage counts what you keep, not what you upload and delete."}</p>
          </div>

          <div className="card pad">
            <h3 className="sec-title"><span className="tick"/>Usage by Category</h3>
            <div>
              {usageByCategory.length === 0 && <p className="chart-foot" style={{ marginTop: 0 }}>No documents yet — categories appear here as you fill your File Cabinet folders.</p>}
              {usageByCategory.map(cat => (
                <div key={cat.category} className="cat-row">
                  <div className="cat-hd">
                    <span style={{ color: TEXT, fontSize: 16 }}>{cat.category}</span>
                    <span style={{ color: MUTED, fontSize: 15, fontFamily: "var(--font-mono)" }}>{cat.gb} GB</span>
                  </div>
                  <div className="cat-track"><div className="cat-fill" style={{ width: `${(cat.gb / (used || 1)) * 100}%`, background: cat.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Plans ── */}
        <div className="card pad" ref={plansRef}>
          <div className="sub-row" style={{ marginBottom: 16 }}>
            <h3 className="sec-title" style={{ marginBottom: 0 }}><span className="tick"/>Plans</h3>
            <div className="iv-toggle" role="group" aria-label="Billing period">
              <button className={interval === "month" ? "on" : ""} onClick={() => setBillingInterval("month")}>Monthly</button>
              <button className={interval === "year" ? "on" : ""} onClick={() => setBillingInterval("year")}>Yearly{bestSaving > 0 ? ` · save ${bestSaving}%` : ""}</button>
            </div>
          </div>
          <div className="plan-grid">
            {plans.filter(p => p.billable || p.id === user.plan).map(plan => {
              const isCurrent = plan.id === user.plan && (!paidSub || paidSub.interval === interval) && user.planStatus !== "cancelled";
              const price = interval === "year" ? plan.priceAnnual : plan.priceMonthly;
              return (
                <div key={plan.id} className={`plan-card ${isCurrent ? "current" : ""}`}>
                  {isCurrent && <div className="plan-tag">CURRENT PLAN</div>}
                  <div className="plan-name">{plan.name}</div>
                  <div className="flex items-baseline gap-1" style={{ marginBottom: 4 }}>
                    <span className="plan-price">{plan.billable ? formatPrice(price) : "Free"}</span>
                    <span className="plan-price-sub">{plan.billable ? `/${interval === "year" ? "yr" : "mo"}` : ` for ${platform.starterTrialDays} days`}</span>
                  </div>
                  <div className="plan-detail" style={{ marginBottom: 8, fontSize: 14, minHeight: 20 }}>
                    {plan.billable && interval === "year" ? `${formatPrice(+(plan.priceAnnual / 12).toFixed(2))}/mo billed yearly` : ""}
                  </div>
                  <div className="plan-detail" style={{ marginBottom: 4 }}>{formatStorage(plan.storageGb)} storage</div>
                  <div className="plan-detail" style={{ marginBottom: 12, fontSize: 14 }}>{plan.overageRate > 0 ? `Overage: ${usd(plan.overageRate)}/GB` : "No overage"}</div>
                  {!isCurrent && plan.billable && (
                    <button disabled={busy !== null || summary?.billingPaused}
                      onClick={() => choosePlan(plan.id, plan.name, plan.priceMonthly, plan.priceAnnual)}
                      className={`plan-btn ${!paidSub || plan.storageGb >= (currentPlan?.storageGb ?? 0) ? "up" : "down"}`}>
                      {!paidSub ? `Choose ${plan.name}` : plan.id === paidSub.plan_id ? `Switch to ${interval === "year" ? "yearly" : "monthly"}` : plan.storageGb > (currentPlan?.storageGb ?? 0) ? "Upgrade" : "Downgrade"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="overage-note">
            <ArrowUp size={13} color={NEG} />
            <span>
              Upgrades apply right away with a prorated charge; downgrades start when your current period ends. Overage on paid plans is the peak GB above your plan,
              at <strong style={{ color: TEXT }}>{usd(overageRate || 0.4)}/GB</strong>, never more than your overage limit. Starter has no overage.
            </span>
          </div>
        </div>

        {/* ── Add-ons ── */}
        <div>
          <h3 className="sec-title"><span className="tick"/>Platform Add-Ons</h3>
          <div className={`addon-card ${drSub || drAdminGranted ? "on" : ""}`}>
            <div className="addon-ico">🛡️</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Disaster Recovery Protection</span>
                {drSub || drAdminGranted
                  ? <span className="addon-badge" style={{ background: "rgba(217,165,94,0.14)", color: WARN, border: "1px solid rgba(217,165,94,0.3)" }}>⚡ ACTIVE</span>
                  : <span className="addon-badge" style={{ background: "rgba(163,173,201,0.1)", color: MUTED, border: "1px solid rgba(163,173,201,0.2)" }}>NOT SUBSCRIBED</span>}
              </div>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                {drSub ? (drSub.cancel_at_period_end ? `Active until ${longDate(drSub.current_period_end)}, then it won't renew.` : `Renews ${longDate(drSub.current_period_end)} (${drSub.interval === "year" ? "yearly" : "monthly"}).`)
                  : drAdminGranted ? "Turned on for your account by Final Pass Down."
                  : "Emergency bulk-export access for your vault during a crisis — data loss, account compromise, or urgent estate needs. 48-hour admin-activated bypass, 100 GB export limit."}
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {drSub ? (
                drSub.cancel_at_period_end
                  ? <button className="addon-btn" disabled={busy !== null} onClick={() => void run("dr-resume", () => billing.resume("dr_addon"), "Disaster Recovery will renew as usual.")}>Keep add-on</button>
                  : <button className="addon-cancel" disabled={busy !== null} onClick={() => { if (window.confirm("Cancel Disaster Recovery Protection? It stays active until the end of the period you've paid for.")) void run("dr-cancel", () => billing.cancel("dr_addon"), "Disaster Recovery won't renew."); }}>Cancel add-on</button>
              ) : !drAdminGranted && (
                <div>
                  <div style={{ fontSize: 11, color: MUTED, ...MONO, marginBottom: 4 }}>FROM</div>
                  <div className="addon-price" style={{ color: TEXT }}>{usd(drYearly / 1200)}<span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>/mo yearly</span></div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>or {usd(drMonthly / 100)}/mo monthly</div>
                  {user.plan === "starter" || user.planStatus === "cancelled" ? (
                    <div style={{ fontSize: 12.5, color: MUTED, maxWidth: 180 }}>Available with a paid plan.</div>
                  ) : (
                    <div className="flex gap-2 justify-end">
                      <button className="addon-btn" disabled={busy !== null || summary?.billingPaused} onClick={() => setPurchase({ kind: "dr_addon", interval: "month" })}>Monthly</button>
                      <button className="addon-btn" disabled={busy !== null || summary?.billingPaused} onClick={() => setPurchase({ kind: "dr_addon", interval: "year" })}>Yearly</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card pad">
          <h3 className="sec-title"><span className="tick"/>Notification History</h3>
          <div>
            {storageAlerts.length === 0 ? (
              <p className="chart-foot" style={{ marginTop: 0 }}>No storage or billing alerts yet.</p>
            ) : storageAlerts.map(alert => {
              const color = alert.type === "error" ? NEG : alert.type === "warning" ? WARN : POS;
              return (
                <div key={alert.id} className="alert-row">
                  <div className="alert-tag" style={{ background: `${color}20`, color }}>{alert.title}</div>
                  <div style={{ color: TEXT, fontSize: 16, flex: 1 }}>{alert.message}</div>
                  <div style={{ color: MUTED, fontSize: 15, flexShrink: 0 }}>{alert.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {purchase && <CheckoutConsentModal purchase={purchase} page="storage-usage" onClose={() => setPurchase(null)} onChanged={() => void refresh()}/>}
    </div>
  );
}
