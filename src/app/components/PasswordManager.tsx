import { copyToClipboard } from "../utils/clipboard";
import { useEscapeKey } from "../hooks/useEscapeKey";
import React, { useState, useRef } from "react";
import { ScanButton } from "./DocumentScanner";
import {
  Key, Eye, EyeOff, Copy, Plus, Trash2, Edit2, X, Search,
  Lock, Globe, User, FileText, Shield, CheckCircle, Upload,
  AlertTriangle, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import heroPasswordPhoto from "../../imports/passwordmanager_hero_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/* Importance drives what a legacy contact should open first. A plain
   starred/not-starred boolean couldn't express "this one keeps the lights on"
   versus "nice to have", so it is now a graded flag. */
type Importance = "critical" | "high" | "normal";

interface PasswordEntry {
  id: string; title: string; website?: string; username?: string;
  email?: string; password: string; accountNumber?: string;
  securityQuestion?: string; securityAnswer?: string; notes?: string;
  category: string; strength: "weak"|"fair"|"good"|"strong";
  lastUpdated: string; importance?: Importance; twoFactor?: boolean;
  documents?: string[];
}

const IMPORTANCE_META: Record<Importance, { label: string; short: string; color: string; desc: string; rank: number }> = {
  critical: { label: "Critical", short: "CRITICAL", color: NEG, rank: 0, desc: "Losing access here would block everything else — primary email, main bank, password recovery." },
  high:     { label: "High",     short: "HIGH",     color: WARN, rank: 1, desc: "Money, health or legal records live behind this account." },
  normal:   { label: "Normal",   short: "NORMAL",   color: MUTED, rank: 2, desc: "Convenience accounts — shopping, streaming, social." },
};

const rankOf = (p: PasswordEntry) => IMPORTANCE_META[p.importance ?? "normal"].rank;

const categories = ["All","Social Media","Banking","Email","Shopping","Work","Healthcare","Government","Entertainment","Other"];

const strengthColor = { weak:NEG, fair:WARN, good:ACCENT2, strong:POS };
const strengthLabel = { weak:"Weak", fair:"Fair", good:"Good", strong:"Strong" };

function getStrength(pw: string): PasswordEntry["strength"] {
  if (pw.length < 6) return "weak";
  if (pw.length < 10) return "fair";
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) return "strong";
  return "good";
}

const initPasswords: PasswordEntry[] = [
  { id:"p1", title:"Gmail – Primary", website:"https://mail.google.com", username:"james.doe", email:"james.doe@gmail.com", password:"MyP@ssw0rd2024!", category:"Email", strength:"strong", lastUpdated:"Jun 8, 2026", importance:"critical", twoFactor:true, securityQuestion:"What was your first car?", securityAnswer:"1967 Ford Mustang", notes:"Password resets for almost every other account land here. Open this one first." },
  { id:"p2", title:"Wells Fargo Online Banking", website:"https://wellsfargo.com", username:"jdoe8821", accountNumber:"XXXX-XXXX-8821", password:"WF@Banking99!", category:"Banking", strength:"strong", lastUpdated:"May 15, 2026", importance:"critical", twoFactor:true, securityQuestion:"Mother's maiden name", securityAnswer:"Williams" },
  { id:"p3", title:"Fidelity Investments", website:"https://fidelity.com", username:"james.doe@fidelity", accountNumber:"7721-XXXX", password:"Fid3lity$Invest!", category:"Banking", strength:"strong", lastUpdated:"Apr 1, 2026", importance:"high", twoFactor:true },
  { id:"p4", title:"Facebook", website:"https://facebook.com", username:"james.doe.1962", email:"james.doe@gmail.com", password:"FB#Social24!", category:"Social Media", strength:"good", lastUpdated:"Mar 20, 2026", importance:"normal" },
  { id:"p5", title:"Amazon Shopping", website:"https://amazon.com", email:"james.doe@gmail.com", password:"Amaz0n@Shop!", category:"Shopping", strength:"good", lastUpdated:"Feb 10, 2026", importance:"normal" },
  { id:"p6", title:"Kaiser Permanente Patient Portal", website:"https://kp.org", username:"jdoe8821", password:"KP$Health22", category:"Healthcare", strength:"fair", lastUpdated:"Jan 5, 2026", importance:"high", notes:"Use this to access all medical records and test results online." },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-pwd so nothing else in the app is affected. */
const PWD_CSS = `
.fpd-pwd{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-pwd *{box-sizing:border-box;}
.fpd-pwd-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-pwd .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-pwd .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-pwd .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-pwd .hbanner:hover .art{transform:scale(1.08);}
.fpd-pwd .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-pwd .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-pwd .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-pwd .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-pwd .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-pwd .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-pwd .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-pwd .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-pwd .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-pwd .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-pwd .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-pwd .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-pwd .hbanner{min-height:auto;} .fpd-pwd .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-pwd .hbanner h1{font-size:29px;}}

.fpd-pwd .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-pwd .card.pad{padding:28px;}
.fpd-pwd .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-pwd .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-pwd .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-pwd .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}
.fpd-pwd .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-pwd .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-pwd .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-pwd .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-pwd .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-pwd .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(95,190,145,0.12);color:#D99A6B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-pwd .btn-pos:hover{background:rgba(95,190,145,0.2);}

/* KPI ledger */
.fpd-pwd .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-pwd .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-pwd .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-pwd .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-pwd .kpi-mini-txt{flex:1;min-width:0;}
.fpd-pwd .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-pwd .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-pwd .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-pwd .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-pwd .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-pwd .kpi-stack{grid-template-columns:1fr;}}

/* search + category filters */
.fpd-pwd .toolbar-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fpd-pwd .search{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:16px;background:#0D1421;border:1px solid rgba(255,255,255,0.08);flex:1;min-width:220px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);}
.fpd-pwd .search input{background:none;border:none;outline:none;color:${TEXT};font-size:16px;width:100%;font-family:var(--font-body);}
.fpd-pwd .search input::placeholder{color:${FAINT};}
.fpd-pwd .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-pwd .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:99px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-pwd .chip.off{opacity:.55;}
.fpd-pwd .chip.off:hover{opacity:.8;}

/* two-column bento */
.fpd-pwd .bento{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:18px;align-items:start;}
@media (max-width:1024px){.fpd-pwd .bento{grid-template-columns:1fr;}}

/* password list rows */
.fpd-pwd .plist{display:flex;flex-direction:column;gap:10px;}
.fpd-pwd .prow{display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer;border:1.5px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 0 16px -8px rgba(91,110,225,0.35);transition:border-color .18s ease,background .18s ease,box-shadow .18s ease;}
.fpd-pwd .prow:hover{border-color:rgba(91,110,225,0.6);box-shadow:0 0 0 1px rgba(91,110,225,0.14),0 0 22px -6px rgba(91,110,225,0.45);}
.fpd-pwd .prow.sel{border-color:rgba(91,110,225,0.5);box-shadow:inset 0 0 0 1px rgba(91,110,225,0.4),0 6px 20px -8px rgba(91,110,225,0.45);}
.fpd-pwd .pico{width:42px;height:42px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-pwd .ptitle-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-pwd .ptitle{font-family:var(--font-display);font-size:18px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-pwd .psub{color:${MUTED};font-size:15px;margin-top:2px;}
.fpd-pwd .pbadge{padding:2.5px 8px;border-radius:6px;font-family:var(--font-mono);font-size:11px;font-weight:700;letter-spacing:0.05em;}
.fpd-pwd .pacts{display:flex;align-items:center;gap:1px;flex-shrink:0;}
.fpd-pwd .icon-btn{background:none;border:none;cursor:pointer;padding:7px;border-radius:16px;display:flex;color:${MUTED};transition:color .16s,background .16s;}
.fpd-pwd .icon-btn:hover{color:#FFFFFF;background:rgba(91,110,225,0.1);}
.fpd-pwd .icon-btn.del:hover{color:${NEG};background:rgba(208,107,107,0.1);}

/* strength meter */
.fpd-pwd .sbar{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-pwd .sbar .sseg{display:flex;gap:2px;}
.fpd-pwd .sbar .sseg i{display:block;width:22px;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);}
.fpd-pwd .sbar .slabel{font-size:14px;font-weight:600;font-family:var(--font-mono);}

/* detail panel */
.fpd-pwd .dpanel{position:sticky;top:16px;}
.fpd-pwd .dhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-pwd .dhead .dname{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-pwd .tile-group{display:flex;flex-direction:column;gap:8px;margin-top:14px;}
.fpd-pwd .tile-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-pwd .tile-row .tk{font-size:11px;font-weight:600;color:${MUTED};margin-bottom:4px;display:flex;align-items:center;gap:6px;}
.fpd-pwd .tile-row .tv{color:${TEXT};font-size:16px;}
.fpd-pwd .tile-row .tv.mono{font-family:var(--font-mono);}
.fpd-pwd .tile-row .trow-l{flex:1;min-width:0;}
.fpd-pwd .tile-row .trow-l .tv{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fpd-pwd .tfa-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:16px;background:rgba(95,190,145,0.10);border:1px solid rgba(95,190,145,0.24);color:#D99A6B;font-size:15px;font-weight:500;margin-top:10px;}
.fpd-pwd .sq-box{padding:13px 15px;border-radius:16px;background:rgba(217,165,94,0.06);border:1px solid rgba(217,165,94,0.22);margin-top:10px;}
.fpd-pwd .sq-box .tk{font-size:11px;font-weight:600;color:${MUTED};margin-bottom:4px;}
.fpd-pwd .sq-box .qtext{color:${SOFT};font-size:15.5px;margin-bottom:8px;}
.fpd-pwd .sq-box .qans{color:${TEXT};font-size:16px;}
.fpd-pwd .notes-box{padding:13px 15px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);margin-top:10px;}
.fpd-pwd .notes-box .tk{font-size:11px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-pwd .notes-box .tv{color:${SOFT};font-size:16px;line-height:1.7;}
.fpd-pwd .dfoot{color:${MUTED};font-size:14px;margin-top:14px;}

/* empty state */
.fpd-pwd .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 16px;}
.fpd-pwd .empty .ei{width:52px;height:52px;border-radius:18px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:14px;}
.fpd-pwd .empty .et{color:${SOFT};font-size:17px;}

/* importance picker */
.fpd-pwd .imp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.fpd-pwd .imp-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:11px 8px;border-radius:16px;cursor:pointer;font-family:var(--font-body);transition:background .16s,border-color .16s;border:1px solid rgba(255,255,255,0.08);background:#0F1624;color:${MUTED};}
.fpd-pwd .imp-btn span{font-size:15px;font-weight:600;}
.fpd-pwd .imp-desc{color:${MUTED};font-size:14px;margin-top:7px;line-height:1.6;}
.fpd-pwd .check-row{display:flex;align-items:center;gap:9px;cursor:pointer;color:${SOFT};font-size:16px;}
.fpd-pwd .check-row input{width:15px;height:15px;accent-color:${ACCENT};}
.fpd-pwd .dropzone{flex:1;display:flex;align-items:center;gap:10px;padding:13px 15px;border-radius:16px;border:1.5px dashed rgba(91,110,225,0.28);background:rgba(91,110,225,0.03);cursor:pointer;color:${MUTED};font-size:16px;}

/* modal */
.fpd-pwd .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-pwd .modal{width:100%;max-width:600px;max-height:90vh;overflow-y:auto;}
.fpd-pwd .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-pwd .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;display:flex;align-items:center;gap:9px;}
.fpd-pwd .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-pwd .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-pwd .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-pwd .field input,.fpd-pwd .field select,.fpd-pwd .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-pwd .field input::placeholder,.fpd-pwd .field textarea::placeholder{color:${FAINT};}
.fpd-pwd .field input:focus,.fpd-pwd .field select:focus,.fpd-pwd .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-pwd .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-pwd .pw-wrap{position:relative;}
.fpd-pwd .pw-wrap input{padding-right:38px;}
.fpd-pwd .pw-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-pwd .login-box{padding:15px;border-radius:16px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);display:flex;flex-direction:column;gap:12px;}
.fpd-pwd .login-box .lbl{font-size:12px;font-weight:600;color:#6FAE8B;font-weight:700;}
.fpd-pwd .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-pwd .modal-foot .save{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;opacity:1;}
.fpd-pwd .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-pwd .modal-foot .save[disabled]{opacity:.6;cursor:default;}
@media (max-width:640px){.fpd-pwd .field-grid{grid-template-columns:1fr;}.fpd-pwd .imp-grid{grid-template-columns:1fr;}}
`;

function PasswordStrengthBar({ strength }: { strength: PasswordEntry["strength"] }) {
  const levels = { weak:1, fair:2, good:3, strong:4 };
  return (
    <div className="sbar">
      <div className="sseg">
        {[1,2,3,4].map(n => (
          <i key={n} style={{ background: n <= levels[strength] ? strengthColor[strength] : undefined }} />
        ))}
      </div>
      <span className="slabel" style={{ color:strengthColor[strength] }}>{strengthLabel[strength]}</span>
    </div>
  );
}

function AddPasswordModal({ editing, onClose, onSave }: { editing: PasswordEntry | null; onClose:()=>void; onSave:(p:PasswordEntry)=>void }) {
  useEscapeKey(true, onClose);
  const [form, setForm] = useState(() => editing
    ? {
        title: editing.title, website: editing.website ?? "", username: editing.username ?? "",
        email: editing.email ?? "", password: editing.password, accountNumber: editing.accountNumber ?? "",
        securityQuestion: editing.securityQuestion ?? "", securityAnswer: editing.securityAnswer ?? "",
        notes: editing.notes ?? "", category: editing.category, twoFactor: editing.twoFactor ?? false,
        importance: editing.importance ?? "normal" as Importance,
      }
    : { title:"", website:"", username:"", email:"", password:"", accountNumber:"", securityQuestion:"", securityAnswer:"", notes:"", category:"Other", twoFactor:false, importance:"normal" as Importance });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!form.title || !form.password) { toast.error("Title and password are required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onSave({
      ...form,
      id: editing?.id ?? `pw-${Date.now()}`,
      strength: getStrength(form.password),
      lastUpdated: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      documents: editing?.documents,
    });
    toast.success(editing ? "Password entry updated" : `"${form.title}" saved to Password Manager 🔒`);
    onClose();
  };

  const f = (key: string, label: string, ph: string, type = "text") => (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} placeholder={ph} />
    </div>
  );

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal">
        <div className="modal-head">
          <h3><Key size={16} color="#FFFFFF" /> {editing ? "Edit Password" : "Add Password Entry"}</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <div className="field-grid">
            {f("title","TITLE *","e.g. Gmail Account")}
            <div className="field">
              <label>CATEGORY</label>
              <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                {categories.filter(c=>c!=="All").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field-grid">
            {f("website","WEBSITE URL","https://example.com","url")}
            {f("accountNumber","ACCOUNT NUMBER","e.g. XXXX-8821")}
          </div>
          <div className="field-grid">
            {f("username","USERNAME","your.username")}
            {f("email","EMAIL ADDRESS","email@example.com","email")}
          </div>
          {/* Password with show/hide */}
          <div className="field">
            <label>PASSWORD *</label>
            <div className="pw-wrap">
              <input type={showPw?"text":"password"} value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))} placeholder="Enter password" style={{ fontFamily:"var(--font-mono)" }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
            {form.password && <div style={{ marginTop:9 }}><PasswordStrengthBar strength={getStrength(form.password)}/></div>}
          </div>
          <div className="field-grid">
            {f("securityQuestion","SECURITY QUESTION","e.g. Mother's maiden name?")}
            {f("securityAnswer","SECURITY ANSWER","Your answer")}
          </div>
          <div className="field">
            <label>NOTES &amp; SIGN-IN PROCEDURES</label>
            <textarea style={{ minHeight:78, resize:"vertical" }} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Special instructions for logging in, 2FA notes, backup codes location..." rows={3} />
          </div>
          {/* Importance — graded, because legacy contacts need a triage order */}
          <div>
            <label style={{ display:"block", marginBottom:8, fontFamily:"var(--font-mono)", fontSize:12, letterSpacing:"0.1em", textTransform:"uppercase", color:MUTED }}>IMPORTANCE</label>
            <div className="imp-grid">
              {(Object.keys(IMPORTANCE_META) as Importance[]).map(k => {
                const meta = IMPORTANCE_META[k];
                const on = form.importance === k;
                return (
                  <button key={k} type="button" onClick={() => setForm(p=>({...p,importance:k}))} className="imp-btn"
                    style={{ background: on ? `${meta.color}1F` : "#0F1624", borderColor: on ? meta.color : "rgba(255,255,255,0.09)", color: on ? meta.color : MUTED }}>
                    <AlertTriangle size={13} style={{ opacity: k === "normal" ? 0.5 : 1 }}/>
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="imp-desc">{IMPORTANCE_META[form.importance].desc}</div>
          </div>
          <label className="check-row">
            <input type="checkbox" checked={form.twoFactor} onChange={e => setForm(p=>({...p,twoFactor:e.target.checked}))} />
            2FA / MFA Enabled
          </label>
          {/* Document upload */}
          <div className="field">
            <label>UPLOAD SUPPORTING DOCUMENTS (optional)</label>
            <input ref={fileRef} type="file" multiple className="hidden" style={{ display:"none" }} accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => { if (e.target.files?.[0]) toast.success(`Document attached: ${e.target.files[0].name}`); }}/>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div onClick={() => fileRef.current?.click()} className="dropzone">
                <Upload size={15} color="#FFFFFF" style={{ opacity:0.7 }}/>
                <span>Attach PDF, image, or document</span>
              </div>
              <ScanButton folder="other" onUpload={doc => toast.success(`"${doc.name}" attached`)} size="sm" label="Scan"/>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="save" onClick={submit} disabled={loading}>
            <Lock size={13}/>{loading ? (editing ? "Saving..." : "Encrypting & Saving...") : (editing ? "Save Changes" : "Save to Vault")}
          </button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function PasswordManager() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>(initPasswords);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<PasswordEntry|null>(null);
  const [showPwFor, setShowPwFor] = useState<string|null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPw, setEditingPw] = useState<PasswordEntry|null>(null);

  const openAddPw = () => { setEditingPw(null); setShowAdd(true); };
  const openEditPw = (p: PasswordEntry) => { setEditingPw(p); setShowAdd(true); };
  const closePwModal = () => { setShowAdd(false); setEditingPw(null); };
  const savePw = (p: PasswordEntry) => {
    setPasswords(prev => editingPw ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]);
    if (editingPw && selected?.id === p.id) setSelected(p);
    setShowAdd(false);
    setEditingPw(null);
  };

  /* Critical entries float to the top so a legacy contact opening this page
     under stress sees the accounts that unlock everything else first. */
  const filtered = passwords
    .filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || (p.website??"").includes(search) || (p.username??"").includes(search);
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    })
    .sort((a, b) => rankOf(a) - rankOf(b));

  const copy = (text: string, label: string) => { copyToClipboard(text); toast.success(`${label} copied to clipboard`) };

  const kpis = [
    { label: "Total Entries", value: String(passwords.length), sub: "Stored credentials", icon: <Key size={14} />, dot: ACCENT2 },
    { label: "Critical Accounts", value: String(passwords.filter(p=>p.importance==="critical").length), sub: "Unlock everything else", icon: <Shield size={14} />, dot: NEG },
    { label: "Weak / Fair Passwords", value: String(passwords.filter(p=>p.strength==="weak"||p.strength==="fair").length), sub: "Consider strengthening", icon: <AlertTriangle size={14} />, dot: WARN },
    { label: "2FA Enabled", value: String(passwords.filter(p=>p.twoFactor).length), sub: `of ${passwords.length} accounts`, icon: <CheckCircle size={14} />, dot: POS },
  ];

  return (
    <div className="fpd-pwd">
      <style dangerouslySetInnerHTML={{ __html: PWD_CSS }} />
      <div className="fpd-pwd-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroPasswordPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Encrypted &amp; Ready</span>
            <h1>Every login, <span className="accent">locked down and handed off.</span></h1>
            <p>Zero-knowledge, AES-256 encrypted credentials — accessible to your designated legacy contacts, and no one else.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAddPw}><Plus size={15} /> Add Password</button>
              <button className="hbtn ghost" onClick={() => setCategory("All")}><Shield size={15} /> View All Entries</button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Lock size={12} /> AES-256 ENCRYPTED · ZERO-KNOWLEDGE</div>
            <h1 className="pg-h1">Password Manager</h1>
            <div className="pg-sub">{passwords.length} entries · Encrypted and accessible to your designated legacy contacts</div>
          </div>
          <button className="btn-primary" onClick={openAddPw}>
            <Plus size={14} /> Add Password
          </button>
        </div>

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

        {/* ── Search + category filters ── */}
        <div className="toolbar-row">
          <div className="search">
            <Search size={13} color={MUTED} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search passwords..." />
          </div>
          <div className="filters">
            {categories.slice(0,6).map(c => {
              const on = category === c;
              return (
                <button key={c} onClick={() => setCategory(c)} className={`chip ${on ? "" : "off"}`}
                  style={{ background: on ? "rgba(91,110,225,0.16)" : "transparent", color: on ? "#6FAE8B" : MUTED, borderColor: on ? "rgba(91,110,225,0.4)" : "rgba(255,255,255,0.09)" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bento">
          {/* Password list */}
          <div className="plist">
            {filtered.map(p => (
              <div key={p.id} className={`card prow ${selected?.id===p.id ? "sel" : ""}`} onClick={() => setSelected(selected?.id===p.id ? null : p)}>
                <div className="pico"><Globe size={18}/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="ptitle-row">
                    <span className="ptitle">{p.title}</span>
                    {p.importance && p.importance !== "normal" && (
                      <span className="pbadge" title={IMPORTANCE_META[p.importance].desc}
                        style={{ background:`${IMPORTANCE_META[p.importance].color}1F`, color:IMPORTANCE_META[p.importance].color }}>
                        {IMPORTANCE_META[p.importance].short}
                      </span>
                    )}
                    {p.twoFactor && <Shield size={12} color="#FFFFFF"/>}
                  </div>
                  <div className="psub">{p.username || p.email || p.website}</div>
                </div>
                <PasswordStrengthBar strength={p.strength}/>
                <div className="pacts">
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); copy(p.username||p.email||"", "Username"); }}>
                    <User size={13}/>
                  </button>
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); copy(p.password, "Password"); }}>
                    <Copy size={13}/>
                  </button>
                  <button className="icon-btn" onClick={e => { e.stopPropagation(); openEditPw(p); }}>
                    <Edit2 size={13}/>
                  </button>
                  <button className="icon-btn del" onClick={e => { e.stopPropagation(); setPasswords(prev => prev.filter(x => x.id !== p.id)); if(selected?.id===p.id) setSelected(null); toast.success("Entry deleted"); }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {selected ? (
              <div className="card pad dpanel">
                <div className="dhead">
                  <div className="dname">{selected.title}</div>
                  <div style={{ display:"flex", gap:2 }}>
                    <button className="icon-btn" onClick={() => openEditPw(selected)}><Edit2 size={13}/></button>
                    <button className="icon-btn" onClick={() => setSelected(null)}><X size={13}/></button>
                  </div>
                </div>
                <PasswordStrengthBar strength={selected.strength}/>
                <div className="tile-group">
                  {[
                    { label:"Website", value:selected.website, icon:<Globe size={11}/> },
                    { label:"Username", value:selected.username, icon:<User size={11}/>, copy:true },
                    { label:"Email", value:selected.email, icon:<FileText size={11}/>, copy:true },
                    { label:"Account #", value:selected.accountNumber, icon:<Key size={11}/> },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="tile-row">
                      <div className="trow-l">
                        <div className="tk">{row.icon}{row.label.toUpperCase()}</div>
                        <div className="tv">{row.value}</div>
                      </div>
                      {row.copy && <button className="icon-btn" onClick={() => copy(row.value!, row.label)}><Copy size={12}/></button>}
                    </div>
                  ))}
                  {/* Password field */}
                  <div className="tile-row">
                    <div className="trow-l">
                      <div className="tk"><Lock size={11}/>PASSWORD</div>
                      <div className="tv mono">{showPwFor===selected.id ? selected.password : "••••••••••••"}</div>
                    </div>
                    <div style={{ display:"flex", gap:1 }}>
                      <button className="icon-btn" onClick={() => setShowPwFor(showPwFor===selected.id ? null : selected.id)}>
                        {showPwFor===selected.id ? <EyeOff size={12}/> : <Eye size={12}/>}
                      </button>
                      <button className="icon-btn" onClick={() => copy(selected.password, "Password")}><Copy size={12}/></button>
                    </div>
                  </div>
                </div>
                {selected.twoFactor && (
                  <div className="tfa-banner">
                    <Shield size={13}/>
                    <span>Two-Factor Authentication enabled</span>
                  </div>
                )}
                {selected.securityQuestion && (
                  <div className="sq-box">
                    <div className="tk">SECURITY QUESTION</div>
                    <div className="qtext">{selected.securityQuestion}</div>
                    <div className="tk">ANSWER</div>
                    <div className="qans">{selected.securityAnswer}</div>
                  </div>
                )}
                {selected.notes && (
                  <div className="notes-box">
                    <div className="tk">NOTES &amp; SIGN-IN PROCEDURES</div>
                    <div className="tv">{selected.notes}</div>
                  </div>
                )}
                <div className="dfoot">Last updated: {selected.lastUpdated}</div>
              </div>
            ) : (
              <div className="card empty">
                <div className="ei"><Key size={24}/></div>
                <div className="et">Select a password entry to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddPasswordModal editing={editingPw} onClose={closePwModal} onSave={savePw}/>}
    </div>
  );
}
