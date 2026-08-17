import React, { useState } from "react";
import { Shield, TrendingUp, Briefcase, DollarSign, Receipt, Plus, Edit2, User, X, Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import heroFinancialPhoto from "../../imports/financialrecords_hero_photo.png";

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

type Tab = "insurance" | "personal" | "portfolios" | "retirement" | "taxes" | "business";

const insurancePolicies = [
  { id: 1, type: "Life Insurance", carrier: "MetLife", policyNum: "ML-88291-CA", coverage: "$500,000", premium: "$182/month", beneficiary: "Sarah Johnson (100%)", agent: "Tom Richards — (916) 555-0291", status: "active" },
  { id: 2, type: "Homeowner's Insurance", carrier: "State Farm", policyNum: "SF-44821-CA", coverage: "$420,000 dwelling", premium: "$142/month", beneficiary: "N/A — Property", agent: "Linda Park — (916) 555-0482", status: "active" },
  { id: 3, type: "Auto Insurance", carrier: "GEICO", policyNum: "GI-293847-CA", coverage: "Full Coverage", premium: "$98/month", beneficiary: "N/A", agent: "Online Policy", status: "active" },
  { id: 4, type: "Umbrella Policy", carrier: "State Farm", policyNum: "SF-UMB-1029-CA", coverage: "$1,000,000", premium: "$28/month", beneficiary: "N/A", agent: "Linda Park — (916) 555-0482", status: "active" },
];

const personalAccounts = [
  { id: 1, accountName: "Primary Checking", bank: "Wells Fargo", accountType: "Checking", accountNum: "XXXX-2891", balance: "$8,420", beneficiary: "Sarah Johnson (POD)", notes: "Direct deposit and all household bills run through this account." },
  { id: 2, accountName: "Emergency Savings", bank: "Ally Bank", accountType: "High-Yield Savings", accountNum: "XXXX-7734", balance: "$32,100", beneficiary: "Sarah Johnson (POD)", notes: "6 months of expenses. Do not touch except in emergency." },
];

const portfolios = [
  { id: 1, institution: "Fidelity Investments", accountType: "Brokerage", accountNum: "XXXX-8821", value: "$184,200", holdings: "60% S&P 500 Index, 25% Bonds, 15% International", beneficiary: "Sarah Johnson", contact: "fidelity.com / 1-800-343-3548" },
  { id: 2, institution: "Vanguard", accountType: "Roth IRA", accountNum: "XXXX-4492", value: "$88,400", holdings: "Total Market Index Fund", beneficiary: "Sarah Johnson (primary), Michael Doe (contingent)", contact: "vanguard.com / 1-800-662-7447" },
];

const retirementAccounts = [
  { id: 1, type: "401(k)", employer: "TechCorp Inc.", institution: "Fidelity", accountNum: "XXXX-7721", balance: "$312,800", contributions: "$2,100/month", vested: "100%", beneficiary: "Sarah Johnson" },
  { id: 2, type: "Traditional IRA", institution: "Charles Schwab", accountNum: "XXXX-3381", balance: "$94,200", contributions: "$500/month", vested: "N/A", beneficiary: "Sarah Johnson" },
  { id: 3, type: "Social Security", institution: "SSA", accountNum: "SSN on file", balance: "Est. $2,841/month at age 67", contributions: "N/A", vested: "N/A", beneficiary: "Contact SSA at 1-800-772-1213" },
];

const taxes = [
  { year: "2025", filedDate: "Apr 12, 2026", filedWith: "TurboTax / E-filed", refund: "$2,180 refund", accountant: "Self-prepared", documents: "2025_1040.pdf in Legacy Vault" },
  { year: "2024", filedDate: "Apr 8, 2025", filedWith: "H&R Block (Karen Mills)", refund: "$941 refund", accountant: "Karen Mills, CPA — (916) 555-0812", documents: "2024_1040.pdf in Legacy Vault" },
  { year: "2023", filedDate: "Apr 11, 2024", filedWith: "H&R Block (Karen Mills)", refund: "$1,440 owed", accountant: "Karen Mills, CPA — (916) 555-0812", documents: "2023_1040.pdf in Legacy Vault" },
];

const businessAccounts = [
  { id: 1, businessName: "Doe Photography LLC", type: "LLC", ein: "XX-XXXXXXX", bank: "Chase Business", accountNum: "XXXX-9281", revenue: "~$48,000/year", accountant: "Karen Mills, CPA", notes: "Business should be dissolved or transferred to Michael Doe upon death." },
];

const tabConfig = [
  { id: "insurance" as Tab, label: "Insurance", icon: <Shield size={14} /> },
  { id: "personal" as Tab, label: "Personal", icon: <User size={14} /> },
  { id: "portfolios" as Tab, label: "Investments", icon: <TrendingUp size={14} /> },
  { id: "retirement" as Tab, label: "Retirement", icon: <DollarSign size={14} /> },
  { id: "taxes" as Tab, label: "Tax Records", icon: <Receipt size={14} /> },
  { id: "business" as Tab, label: "Business", icon: <Briefcase size={14} /> },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-fin so nothing else in the app is affected. */
const FIN_CSS = `
.fpd-fin{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-fin *{box-sizing:border-box;}
.fpd-fin-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-fin .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-fin .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-fin .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-fin .hbanner:hover .art{transform:scale(1.08);}
.fpd-fin .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-fin .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-fin .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-fin .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-fin .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-fin .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-fin .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-fin .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-fin .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-fin .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-fin .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-fin .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-fin .hbanner{min-height:auto;} .fpd-fin .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-fin .hbanner h1{font-size:29px;}}

.fpd-fin .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-fin .card.pad{padding:28px;}
.fpd-fin .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-fin .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-fin .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-fin .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-fin .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-fin .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-fin .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-fin .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-fin .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-fin .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-fin .toolbar{display:flex;align-items:center;justify-content:flex-end;}

/* KPI ledger */
.fpd-fin .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-fin .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-fin .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-fin .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-fin .kpi-mini-txt{flex:1;min-width:0;}
.fpd-fin .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-fin .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-fin .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-fin .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-fin .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-fin .kpi-stack{grid-template-columns:1fr;}}

/* record cards */
.fpd-fin .rlist{display:flex;flex-direction:column;gap:14px;}
.fpd-fin .rtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-fin .rico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-fin .rtitle{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px;}
.fpd-fin .rsub{color:${MUTED};font-size:15.5px;}
.fpd-fin .rbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;background:rgba(95,190,145,0.14);color:#D99A6B;flex-shrink:0;}
.fpd-fin .rtag{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:#6FAE8B;margin-bottom:6px;}
.fpd-fin .rgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-fin .rgrid.c2{grid-template-columns:1fr 1fr;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n+2),.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fin .rgrid.c2 .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-fin .rgrid.c2 .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fin .tile{padding:12px 14px;position:relative;transition:background .18s ease;}
.fpd-fin .tile:hover{background:rgba(126,107,216,0.08);}
.fpd-fin .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-fin .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;transition:color .18s ease;}
.fpd-fin .tile:hover .tv{color:#C9BFF0;}
.fpd-fin .bigval{font-family:var(--font-display);font-size:25px;font-weight:700;flex-shrink:0;}
.fpd-fin .redit{background:none;border:none;color:${MUTED};cursor:pointer;padding:6px;display:flex;flex-shrink:0;transition:color .16s;}
.fpd-fin .redit:hover{color:#6FAE8B;}
.fpd-fin .docpill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:99px;font-size:15px;background:rgba(95,190,145,0.08);color:#D99A6B;border:1px solid rgba(95,190,145,0.22);margin-top:14px;}
.fpd-fin .notewarn{margin-top:14px;padding:12px 14px;border-radius:16px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);color:${WARN};font-size:16px;line-height:1.6;}
@media (max-width:760px){
.fpd-fin .rgrid,.fpd-fin .rgrid.c2{grid-template-columns:1fr;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n+2),.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n){border-left:none;}
.fpd-fin .rgrid.c2 .tile:nth-child(2n){border-left:none;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(n+2),.fpd-fin .rgrid.c2 .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

/* modal */
.fpd-fin .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-fin .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-fin .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-fin .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-fin .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-fin .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-fin .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-fin .field input,.fpd-fin .field select,.fpd-fin .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fin .field input::placeholder,.fpd-fin .field textarea::placeholder{color:${FAINT};}
.fpd-fin .field input:focus,.fpd-fin .field select:focus,.fpd-fin .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fin .upload-row{display:flex;gap:8px;}
.fpd-fin .upload-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:16px;border:1px dashed rgba(91,110,225,0.32);background:rgba(91,110,225,0.04);color:#6FAE8B;font-size:16px;cursor:pointer;font-family:var(--font-body);}
.fpd-fin .upload-ok{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:16px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.25);}
.fpd-fin .upload-ok button{background:none;border:none;color:${NEG};cursor:pointer;display:flex;}
.fpd-fin .upload-hint{color:${MUTED};font-size:14px;line-height:1.5;margin-top:6px;}
.fpd-fin .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-fin .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-fin .modal-foot .save:hover{filter:brightness(1.08);}
`;

function AddModal({ title, submitLabel, fields, initial, initialDoc, onClose, onAdd }: {
  title: string;
  submitLabel?: string;
  fields: { label: string; key: string; placeholder?: string; type?: string }[];
  initial?: Record<string, string>;
  initialDoc?: string | null;
  onClose: () => void;
  onAdd: (form: Record<string, string>, attachedDoc: string | null) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(initial ?? Object.fromEntries(fields.map(f => [f.key, ""])));
  const [attachedDoc, setAttachedDoc] = useState<string | null>(initialDoc ?? null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedDoc(file.name);
    toast.success(`"${file.name}" attached`);
    e.target.value = "";
  }

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {fields.map(f => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <input type={f.type || "text"} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder || ""} />
            </div>
          ))}

          {/* Document upload — attach the actual file right here */}
          <div className="field">
            <label>Attach Document (optional — upload the actual file)</label>
            {attachedDoc ? (
              <div className="upload-ok">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={14} color="#FFFFFF" />
                  <span style={{ color: TEXT, fontSize: 16 }}>{attachedDoc}</span>
                </div>
                <button onClick={() => setAttachedDoc(null)}><X size={13} /></button>
              </div>
            ) : (
              <div className="upload-row">
                <button onClick={() => fileRef.current?.click()} className="upload-btn"><Upload size={14} /> Upload File (PDF, image, doc)</button>
                <ScanButton
                  folder="financial"
                  onUpload={doc => { setAttachedDoc(doc.name); toast.success(`"${doc.name}" scanned`); }}
                  size="sm"
                  label="Scan"
                />
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleFileUpload} />
            {!attachedDoc && (
              <p className="upload-hint">
                Upload the actual document (policy PDF, statement, deed, etc.) so it's stored alongside the record details. It will also sync to the File Cabinet automatically.
              </p>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="save" onClick={() => onAdd(form, attachedDoc)}>{submitLabel ?? `Add Record${attachedDoc ? " + Document" : ""}`}</button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* Generic upsert: replaces `original` in-place when editing, otherwise appends. */
function upsert<T>(setList: React.Dispatch<React.SetStateAction<T[]>>, original: T | undefined, record: T) {
  if (original) {
    setList(list => list.map(item => (item === original ? record : item)));
  } else {
    setList(list => [...list, record]);
  }
}

export function FinancialRecords() {
  const [tab, setTab] = useState<Tab>("insurance");
  const [showAdd, setShowAdd] = useState<Tab | null>(null);
  const [editingItem, setEditingItem] = useState<{ tab: Tab; original: any } | null>(null);
  const [policies, setPolicies]       = useState(insurancePolicies);
  const [personalList, setPersonalList] = useState(personalAccounts);
  const [investments, setInvestments] = useState(portfolios);
  const [retirement, setRetirement]   = useState(retirementAccounts);
  const [taxList, setTaxList]         = useState(taxes);
  const [bizList, setBizList]         = useState(businessAccounts);
  const contentRef = React.useRef<HTMLDivElement>(null);

  function openEdit(t: Tab, item: any) {
    setEditingItem({ tab: t, original: item });
    setShowAdd(t);
  }
  function closeModal() {
    setShowAdd(null);
    setEditingItem(null);
  }

  const insuranceFields = [{ label: "Type", key: "type", placeholder: "e.g. Life Insurance" }, { label: "Carrier", key: "carrier", placeholder: "e.g. MetLife" }, { label: "Policy Number", key: "policyNum" }, { label: "Coverage Amount", key: "coverage", placeholder: "e.g. $500,000" }, { label: "Premium", key: "premium", placeholder: "e.g. $182/month" }, { label: "Beneficiary", key: "beneficiary" }, { label: "Agent", key: "agent" }, { label: "Status", key: "status", placeholder: "active" }];
  const personalFields = [{ label: "Account Name", key: "accountName", placeholder: "e.g. Primary Checking" }, { label: "Bank", key: "bank", placeholder: "e.g. Wells Fargo" }, { label: "Account Type", key: "accountType", placeholder: "e.g. Checking, Savings" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Balance", key: "balance", placeholder: "e.g. $8,000" }, { label: "Beneficiary", key: "beneficiary", placeholder: "e.g. Payable on Death (POD) name" }, { label: "Notes", key: "notes" }];
  const portfolioFields = [{ label: "Institution", key: "institution", placeholder: "e.g. Fidelity Investments" }, { label: "Account Type", key: "accountType", placeholder: "e.g. Brokerage, Roth IRA" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Estimated Value", key: "value", placeholder: "e.g. $50,000" }, { label: "Holdings", key: "holdings", placeholder: "e.g. S&P 500 Index" }, { label: "Beneficiary", key: "beneficiary" }, { label: "Contact", key: "contact" }];
  const retirementFields = [{ label: "Account Type", key: "type", placeholder: "e.g. 401(k), IRA, Pension" }, { label: "Employer (if 401k)", key: "employer", placeholder: "Optional" }, { label: "Institution", key: "institution" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Balance", key: "balance", placeholder: "e.g. $120,000" }, { label: "Contributions", key: "contributions", placeholder: "e.g. $500/month" }, { label: "Vesting", key: "vested", placeholder: "e.g. 100%" }, { label: "Beneficiary", key: "beneficiary" }];
  const taxFields = [{ label: "Tax Year", key: "year", placeholder: "e.g. 2026" }, { label: "Filed Date", key: "filedDate", placeholder: "e.g. Apr 15, 2027" }, { label: "Filed With", key: "filedWith", placeholder: "e.g. TurboTax, H&R Block" }, { label: "Result", key: "refund", placeholder: "e.g. $1,200 refund or $800 owed" }, { label: "Accountant", key: "accountant", placeholder: "Name or Self-prepared" }, { label: "Document Location", key: "documents", placeholder: "e.g. 2026_1040.pdf in Legacy Vault" }];
  const businessFields = [{ label: "Business Name", key: "businessName" }, { label: "Entity Type", key: "type", placeholder: "e.g. LLC, S-Corp, Sole Proprietor" }, { label: "EIN", key: "ein", placeholder: "XX-XXXXXXX" }, { label: "Bank", key: "bank" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Annual Revenue", key: "revenue", placeholder: "e.g. ~$60,000/year" }, { label: "Accountant", key: "accountant" }, { label: "Notes / Transfer Instructions", key: "notes" }];

  /* Builds the AddModal's `initial` field values from the record being edited (undefined in add mode). */
  function editInitial(t: Tab, fields: { key: string }[]): Record<string, string> | undefined {
    if (editingItem?.tab !== t) return undefined;
    return Object.fromEntries(fields.map(f => [f.key, String((editingItem.original as any)[f.key] ?? "")]));
  }

  const kpis = [
    { label: "Insurance Policies", value: String(policies.length), sub: "On file", icon: <Shield size={14} />, dot: ACCENT2 },
    { label: "Personal Accounts", value: String(personalList.length), sub: personalList.length === 1 ? "Bank account" : "Bank accounts", icon: <User size={14} />, dot: ACCENT2 },
    { label: "Investment Accounts", value: String(investments.length), sub: "Brokerage & retirement", icon: <TrendingUp size={14} />, dot: POS },
    { label: "Tax Years Filed", value: String(taxList.length), sub: "Years on record", icon: <Receipt size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-fin">
      <style dangerouslySetInnerHTML={{ __html: FIN_CSS }} />
      <div className="fpd-fin-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroFinancialPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">One Ledger, Every Account</span>
            <h1>Insurance, banking, and investments — <span className="accent">organized in one place.</span></h1>
            <p>Policies, personal bank accounts, portfolios, retirement accounts, taxes, and business records — all where your legacy contacts can find them.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setTab("insurance")}>
                <Shield size={15}/> View Insurance
              </button>
              <button className="hbtn ghost" onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <TrendingUp size={15}/> View All Records
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><DollarSign size={12} /> Financial Records</div>
            <h1 className="pg-h1">Financial Records</h1>
            <div className="pg-sub">Insurance policies, personal bank accounts, investments, retirement accounts, taxes, and business information.</div>
          </div>
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

        {/* ── Tabs ── */}
        <div className="seg">
          {tabConfig.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div ref={contentRef}>
        {/* ── Insurance ── */}
        {tab === "insurance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("insurance")}><Plus size={14} /> Add Policy</button></div>
            <div className="rlist">
              {policies.map(policy => (
                <div key={policy.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><Shield size={20} /></div>
                      <div>
                        <div className="rtitle">{policy.type}</div>
                        <div className="rsub">{policy.carrier}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="rbadge">{policy.status.toUpperCase()}</span>
                      <button className="redit" onClick={() => openEdit("insurance", policy)}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Policy Number</div><div className="tv">{policy.policyNum}</div></div>
                    <div className="tile"><div className="tk">Coverage</div><div className="tv">{policy.coverage}</div></div>
                    <div className="tile"><div className="tk">Premium</div><div className="tv">{policy.premium}</div></div>
                    <div className="tile"><div className="tk">Beneficiary</div><div className="tv">{policy.beneficiary}</div></div>
                    <div className="tile"><div className="tk">Agent / Contact</div><div className="tv">{policy.agent}</div></div>
                  </div>
                  {(policy as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(policy as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Personal ── */}
        {tab === "personal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("personal")}><Plus size={14} /> Add Account</button></div>
            <div className="rlist">
              {personalList.map(acct => (
                <div key={acct.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><User size={20} /></div>
                      <div>
                        <div className="rtitle">{acct.accountName}</div>
                        <div className="rsub">{acct.bank} · {acct.accountType}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bigval" style={{ color: "#6FAE8B" }}>{acct.balance}</div>
                      <button className="redit" onClick={() => openEdit("personal", acct)}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Account Number</div><div className="tv">{acct.accountNum}</div></div>
                    <div className="tile"><div className="tk">Beneficiary</div><div className="tv">{acct.beneficiary}</div></div>
                    <div className="tile"><div className="tk">Notes</div><div className="tv">{acct.notes}</div></div>
                  </div>
                  {(acct as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(acct as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Investments ── */}
        {tab === "portfolios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("portfolios")}><Plus size={14} /> Add Account</button></div>
            <div className="rlist">
              {investments.map(p => (
                <div key={p.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><TrendingUp size={20} /></div>
                      <div>
                        <div className="rtitle">{p.institution}</div>
                        <div className="rsub">{p.accountType} · {p.accountNum}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bigval" style={{ color: "#D99A6B" }}>{p.value}</div>
                      <button className="redit" onClick={() => openEdit("portfolios", p)}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Holdings</div><div className="tv">{p.holdings}</div></div>
                    <div className="tile"><div className="tk">Beneficiary</div><div className="tv">{p.beneficiary}</div></div>
                    <div className="tile"><div className="tk">Contact / Login</div><div className="tv">{p.contact}</div></div>
                  </div>
                  {(p as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(p as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Retirement ── */}
        {tab === "retirement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("retirement")}><Plus size={14} /> Add Account</button></div>
            <div className="rlist">
              {retirement.map(r => (
                <div key={r.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><DollarSign size={20} /></div>
                      <div>
                        <span className="rtag">{r.type}</span>
                        <div className="rtitle">{r.institution}</div>
                        <div className="rsub">{r.employer && `${r.employer} · `}{r.accountNum}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bigval" style={{ color: "#6FAE8B" }}>{r.balance}</div>
                      <button className="redit" onClick={() => openEdit("retirement", r)}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Contributions</div><div className="tv">{r.contributions}</div></div>
                    <div className="tile"><div className="tk">Vested</div><div className="tv">{r.vested}</div></div>
                    <div className="tile"><div className="tk">Beneficiary</div><div className="tv">{r.beneficiary}</div></div>
                  </div>
                  {(r as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(r as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tax Records ── */}
        {tab === "taxes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("taxes")}><Plus size={14} /> Add Tax Year</button></div>
            <div className="rlist">
              {taxList.map(t => (
                <div key={t.year} className="card pad">
                  <div className="rtop">
                    <div className="rtitle" style={{ fontSize: 22.5 }}>Tax Year {t.year}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="bigval" style={{ fontSize: 19, color: t.refund.includes("refund") ? "#D99A6B" : NEG }}>{t.refund}</div>
                      <button className="redit" onClick={() => openEdit("taxes", t)}><Edit2 size={14} /></button>
                    </div>
                  </div>
                  <div className="rgrid c2">
                    <div className="tile"><div className="tk">Filed Date</div><div className="tv">{t.filedDate}</div></div>
                    <div className="tile"><div className="tk">Filed With</div><div className="tv">{t.filedWith}</div></div>
                    <div className="tile"><div className="tk">Tax Preparer</div><div className="tv">{t.accountant}</div></div>
                    <div className="tile"><div className="tk">Documents</div><div className="tv">{t.documents}</div></div>
                  </div>
                  {(t as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(t as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Business ── */}
        {tab === "business" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("business")}><Plus size={14} /> Add Business</button></div>
            <div className="rlist">
              {bizList.map(b => (
                <div key={b.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><Briefcase size={20} /></div>
                      <div>
                        <div className="rtitle">{b.businessName}</div>
                        <div className="rsub">{b.type} · EIN: {b.ein}</div>
                      </div>
                    </div>
                    <button className="redit" onClick={() => openEdit("business", b)}><Edit2 size={14} /></button>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Bank</div><div className="tv">{b.bank}</div></div>
                    <div className="tile"><div className="tk">Account Number</div><div className="tv">{b.accountNum}</div></div>
                    <div className="tile"><div className="tk">Annual Revenue</div><div className="tv">{b.revenue}</div></div>
                    <div className="tile"><div className="tk">Accountant</div><div className="tv">{b.accountant}</div></div>
                  </div>
                  <div className="notewarn"><b>Succession Note:</b> {b.notes}</div>
                  {(b as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(b as any).attachedDoc}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {showAdd === "insurance" && (() => {
          const isEdit = editingItem?.tab === "insurance";
          const orig = isEdit ? (editingItem!.original as typeof insurancePolicies[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Insurance Policy" : "Add Insurance Policy"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={insuranceFields} initial={editInitial("insurance", insuranceFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { id: orig?.id ?? Date.now(), type: f.type || "Policy", carrier: f.carrier || "", policyNum: f.policyNum || "", coverage: f.coverage || "", premium: f.premium || "", beneficiary: f.beneficiary || "", agent: f.agent || "", status: f.status || "active", attachedDoc: doc };
                upsert(setPolicies, orig, record);
                toast.success(isEdit ? `${record.type} updated` : `${record.type} added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}

        {showAdd === "personal" && (() => {
          const isEdit = editingItem?.tab === "personal";
          const orig = isEdit ? (editingItem!.original as typeof personalAccounts[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Personal Account" : "Add Personal Account"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={personalFields} initial={editInitial("personal", personalFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { id: orig?.id ?? Date.now(), accountName: f.accountName || "Account", bank: f.bank || "", accountType: f.accountType || "", accountNum: f.accountNum || "XXXX-????", balance: f.balance || "", beneficiary: f.beneficiary || "", notes: f.notes || "", attachedDoc: doc };
                upsert(setPersonalList, orig, record);
                toast.success(isEdit ? `${record.accountName} updated` : `${record.accountName} added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}

        {showAdd === "portfolios" && (() => {
          const isEdit = editingItem?.tab === "portfolios";
          const orig = isEdit ? (editingItem!.original as typeof portfolios[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Investment Account" : "Add Investment Account"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={portfolioFields} initial={editInitial("portfolios", portfolioFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { id: orig?.id ?? Date.now(), institution: f.institution || "", accountType: f.accountType || "", accountNum: f.accountNum || "XXXX-????", value: f.value || "", holdings: f.holdings || "", beneficiary: f.beneficiary || "", contact: f.contact || "", attachedDoc: doc };
                upsert(setInvestments, orig, record);
                toast.success(isEdit ? `${record.institution} updated` : `Investment account added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}

        {showAdd === "retirement" && (() => {
          const isEdit = editingItem?.tab === "retirement";
          const orig = isEdit ? (editingItem!.original as typeof retirementAccounts[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Retirement Account" : "Add Retirement Account"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={retirementFields} initial={editInitial("retirement", retirementFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { id: orig?.id ?? Date.now(), type: f.type || "", employer: f.employer || "", institution: f.institution || "", accountNum: f.accountNum || "XXXX-????", balance: f.balance || "", contributions: f.contributions || "", vested: f.vested || "", beneficiary: f.beneficiary || "", attachedDoc: doc };
                upsert(setRetirement, orig, record);
                toast.success(isEdit ? `${record.type || "Retirement account"} updated` : `Retirement account added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}

        {showAdd === "taxes" && (() => {
          const isEdit = editingItem?.tab === "taxes";
          const orig = isEdit ? (editingItem!.original as typeof taxes[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Tax Year" : "Add Tax Year"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={taxFields} initial={editInitial("taxes", taxFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { year: f.year || "", filedDate: f.filedDate || "", filedWith: f.filedWith || "", refund: f.refund || "", accountant: f.accountant || "", documents: doc || f.documents || "" };
                upsert(setTaxList, orig, record);
                toast.success(isEdit ? `Tax year ${record.year} updated` : `Tax year ${record.year} added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}

        {showAdd === "business" && (() => {
          const isEdit = editingItem?.tab === "business";
          const orig = isEdit ? (editingItem!.original as typeof businessAccounts[0]) : undefined;
          return (
            <AddModal title={isEdit ? "Edit Business" : "Add Business"} submitLabel={isEdit ? "Save Changes" : undefined}
              fields={businessFields} initial={editInitial("business", businessFields)} initialDoc={(orig as any)?.attachedDoc ?? null} onClose={closeModal}
              onAdd={(f, doc) => {
                const record = { id: orig?.id ?? Date.now(), businessName: f.businessName || "", type: f.type || "", ein: f.ein || "", bank: f.bank || "", accountNum: f.accountNum || "", revenue: f.revenue || "", accountant: f.accountant || "", notes: f.notes || "", attachedDoc: doc };
                upsert(setBizList, orig, record);
                toast.success(isEdit ? `${record.businessName} updated` : `${record.businessName || "Business"} added${doc ? ` with document "${doc}"` : ""}`);
                closeModal();
              }} />
          );
        })()}
      </div>
    </div>
  );
}
