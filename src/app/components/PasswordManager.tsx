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

.fpd-pwd .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-pwd .card.pad{padding:22px;}
.fpd-pwd .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-pwd .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-pwd .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-pwd .pg-sub{color:${MUTED};font-size:13px;max-width:640px;line-height:1.6;}
.fpd-pwd .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-pwd .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-pwd .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-pwd .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-pwd .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-pwd .btn-pos{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:9px;background:rgba(95,190,145,0.12);color:${POS};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:none;transition:background .18s;}
.fpd-pwd .btn-pos:hover{background:rgba(95,190,145,0.2);}

/* KPI ledger */
.fpd-pwd .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-pwd .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-pwd .kcell:first-child{border-left:none;}
.fpd-pwd .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-pwd .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-pwd .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-pwd .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-pwd .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-pwd .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-pwd .kstrip{grid-template-columns:1fr 1fr;}.fpd-pwd .kcell:nth-child(3){border-left:none;}.fpd-pwd .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* search + category filters */
.fpd-pwd .toolbar-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fpd-pwd .search{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:11px;background:#0D1421;border:1px solid rgba(255,255,255,0.22);flex:1;min-width:220px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);}
.fpd-pwd .search input{background:none;border:none;outline:none;color:${TEXT};font-size:13px;width:100%;font-family:var(--font-body);}
.fpd-pwd .search input::placeholder{color:${FAINT};}
.fpd-pwd .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-pwd .chip{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-pwd .chip.off{opacity:.55;}
.fpd-pwd .chip.off:hover{opacity:.8;}

/* two-column bento */
.fpd-pwd .bento{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:18px;align-items:start;}
@media (max-width:980px){.fpd-pwd .bento{grid-template-columns:1fr;}}

/* password list rows */
.fpd-pwd .plist{display:flex;flex-direction:column;gap:10px;}
.fpd-pwd .prow{display:flex;align-items:center;gap:14px;padding:14px 16px;cursor:pointer;transition:border-color .18s,background .18s;}
.fpd-pwd .prow.sel{border-color:rgba(91,110,225,0.5);box-shadow:inset 0 0 0 1px rgba(91,110,225,0.4),0 6px 20px -8px rgba(91,110,225,0.45);}
.fpd-pwd .pico{width:42px;height:42px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:${ACCENT2};}
.fpd-pwd .ptitle-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-pwd .ptitle{font-family:var(--font-display);font-size:14.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-pwd .psub{color:${MUTED};font-size:12px;margin-top:2px;}
.fpd-pwd .pbadge{padding:2.5px 8px;border-radius:6px;font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:0.05em;}
.fpd-pwd .pacts{display:flex;align-items:center;gap:1px;flex-shrink:0;}
.fpd-pwd .icon-btn{background:none;border:none;cursor:pointer;padding:7px;border-radius:8px;display:flex;color:${MUTED};transition:color .16s,background .16s;}
.fpd-pwd .icon-btn:hover{color:${ACCENT2};background:rgba(91,110,225,0.1);}
.fpd-pwd .icon-btn.del:hover{color:${NEG};background:rgba(208,107,107,0.1);}

/* strength meter */
.fpd-pwd .sbar{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.fpd-pwd .sbar .sseg{display:flex;gap:2px;}
.fpd-pwd .sbar .sseg i{display:block;width:22px;height:4px;border-radius:2px;background:rgba(255,255,255,0.08);}
.fpd-pwd .sbar .slabel{font-size:11px;font-weight:600;font-family:var(--font-mono);}

/* detail panel */
.fpd-pwd .dpanel{position:sticky;top:16px;}
.fpd-pwd .dhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-pwd .dhead .dname{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-pwd .tile-group{display:flex;flex-direction:column;gap:8px;margin-top:14px;}
.fpd-pwd .tile-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-pwd .tile-row .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:4px;display:flex;align-items:center;gap:6px;}
.fpd-pwd .tile-row .tv{color:${TEXT};font-size:13px;}
.fpd-pwd .tile-row .tv.mono{font-family:var(--font-mono);}
.fpd-pwd .tile-row .trow-l{flex:1;min-width:0;}
.fpd-pwd .tile-row .trow-l .tv{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fpd-pwd .tfa-banner{display:flex;align-items:center;gap:8px;padding:10px 13px;border-radius:11px;background:rgba(95,190,145,0.10);border:1px solid rgba(95,190,145,0.24);color:${POS};font-size:12px;font-weight:500;margin-top:10px;}
.fpd-pwd .sq-box{padding:13px 15px;border-radius:11px;background:rgba(217,165,94,0.06);border:1px solid rgba(217,165,94,0.22);margin-top:10px;}
.fpd-pwd .sq-box .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:4px;}
.fpd-pwd .sq-box .qtext{color:${SOFT};font-size:12.5px;margin-bottom:8px;}
.fpd-pwd .sq-box .qans{color:${TEXT};font-size:13px;}
.fpd-pwd .notes-box{padding:13px 15px;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);margin-top:10px;}
.fpd-pwd .notes-box .tk{font-family:var(--font-mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-pwd .notes-box .tv{color:${SOFT};font-size:13px;line-height:1.7;}
.fpd-pwd .dfoot{color:${MUTED};font-size:11px;margin-top:14px;}

/* empty state */
.fpd-pwd .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 16px;}
.fpd-pwd .empty .ei{width:52px;height:52px;border-radius:14px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:${ACCENT2};margin-bottom:14px;}
.fpd-pwd .empty .et{color:${SOFT};font-size:13.5px;}

/* importance picker */
.fpd-pwd .imp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.fpd-pwd .imp-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:11px 8px;border-radius:11px;cursor:pointer;font-family:var(--font-body);transition:background .16s,border-color .16s;border:1px solid rgba(255,255,255,0.22);background:#0F1624;color:${MUTED};}
.fpd-pwd .imp-btn span{font-size:12px;font-weight:600;}
.fpd-pwd .imp-desc{color:${MUTED};font-size:11px;margin-top:7px;line-height:1.6;}
.fpd-pwd .check-row{display:flex;align-items:center;gap:9px;cursor:pointer;color:${SOFT};font-size:13px;}
.fpd-pwd .check-row input{width:15px;height:15px;accent-color:${ACCENT};}
.fpd-pwd .dropzone{flex:1;display:flex;align-items:center;gap:10px;padding:13px 15px;border-radius:11px;border:1.5px dashed rgba(91,110,225,0.28);background:rgba(91,110,225,0.03);cursor:pointer;color:${MUTED};font-size:13px;}

/* modal */
.fpd-pwd .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-pwd .modal{width:100%;max-width:600px;max-height:90vh;overflow-y:auto;}
.fpd-pwd .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-pwd .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;display:flex;align-items:center;gap:9px;}
.fpd-pwd .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-pwd .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-pwd .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-pwd .field input,.fpd-pwd .field select,.fpd-pwd .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-pwd .field input::placeholder,.fpd-pwd .field textarea::placeholder{color:${FAINT};}
.fpd-pwd .field input:focus,.fpd-pwd .field select:focus,.fpd-pwd .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-pwd .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-pwd .pw-wrap{position:relative;}
.fpd-pwd .pw-wrap input{padding-right:38px;}
.fpd-pwd .pw-toggle{position:absolute;right:11px;top:50%;transform:translateY(-50%);background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-pwd .login-box{padding:15px;border-radius:12px;background:rgba(91,110,225,0.04);border:1px solid rgba(91,110,225,0.14);display:flex;flex-direction:column;gap:12px;}
.fpd-pwd .login-box .lbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${ACCENT2};font-weight:700;}
.fpd-pwd .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-pwd .modal-foot .save{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;opacity:1;}
.fpd-pwd .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-pwd .modal-foot .save[disabled]{opacity:.6;cursor:default;}
@media (max-width:560px){.fpd-pwd .field-grid{grid-template-columns:1fr;}.fpd-pwd .imp-grid{grid-template-columns:1fr;}}
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

function AddPasswordModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(p:PasswordEntry)=>void }) {
  useEscapeKey(true, onClose);
  const [form, setForm] = useState({ title:"", website:"", username:"", email:"", password:"", accountNumber:"", securityQuestion:"", securityAnswer:"", notes:"", category:"Other", twoFactor:false, importance:"normal" as Importance });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!form.title || !form.password) { toast.error("Title and password are required"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onAdd({ ...form, id:`pw-${Date.now()}`, strength: getStrength(form.password), lastUpdated: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) });
    toast.success(`"${form.title}" saved to Password Manager 🔒`);
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
      <div className="card modal glow-surface">
        <div className="modal-head">
          <h3><Key size={16} color={ACCENT2} /> Add Password Entry</h3>
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
            <label style={{ display:"block", marginBottom:8, fontFamily:"var(--font-mono)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase", color:MUTED }}>IMPORTANCE</label>
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
                <Upload size={15} color={ACCENT2} style={{ opacity:0.7 }}/>
                <span>Attach PDF, image, or document</span>
              </div>
              <ScanButton folder="other" onUpload={doc => toast.success(`"${doc.name}" attached`)} size="sm" label="Scan"/>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="save" onClick={submit} disabled={loading}>
            <Lock size={13}/>{loading?"Encrypting & Saving...":"Save to Vault"}
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
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Lock size={12} /> AES-256 ENCRYPTED · ZERO-KNOWLEDGE</div>
            <h1 className="pg-h1">Password Manager</h1>
            <div className="pg-sub">{passwords.length} entries · Encrypted and accessible to your designated legacy contacts</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Password
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
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
                  style={{ background: on ? "rgba(91,110,225,0.16)" : "transparent", color: on ? ACCENT2 : MUTED, borderColor: on ? "rgba(91,110,225,0.4)" : "rgba(255,255,255,0.09)" }}>
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
              <div key={p.id} className={`card prow glow-surface ${selected?.id===p.id ? "sel" : ""}`} onClick={() => setSelected(selected?.id===p.id ? null : p)}>
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
                    {p.twoFactor && <Shield size={12} color={POS}/>}
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
              <div className="card pad glow-surface dpanel">
                <div className="dhead">
                  <div className="dname">{selected.title}</div>
                  <div style={{ display:"flex", gap:2 }}>
                    <button className="icon-btn" onClick={() => {
                      const newPw = prompt("Set new password for demo:", selected.password);
                      if (newPw && newPw.trim()) {
                        setPasswords(prev => prev.map(e => e.id === selected.id ? { ...e, password: newPw.trim() } : e));
                        setSelected(s => s ? { ...s, password: newPw.trim() } : s);
                        toast.success("Password updated");
                      }
                    }}><Edit2 size={13}/></button>
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
              <div className="card empty glow-surface">
                <div className="ei"><Key size={24}/></div>
                <div className="et">Select a password entry to view details</div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showAdd && <AddPasswordModal onClose={() => setShowAdd(false)} onAdd={p => setPasswords(prev => [p, ...prev])}/>}
    </div>
  );
}
