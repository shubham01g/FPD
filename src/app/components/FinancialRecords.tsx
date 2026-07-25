import React, { useState } from "react";
import { Shield, Home, TrendingUp, Briefcase, DollarSign, Receipt, Plus, Edit2, Building, X, Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

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

type Tab = "insurance" | "realestate" | "portfolios" | "retirement" | "taxes" | "business";

const insurancePolicies = [
  { id: 1, type: "Life Insurance", carrier: "MetLife", policyNum: "ML-88291-CA", coverage: "$500,000", premium: "$182/month", beneficiary: "Sarah Johnson (100%)", agent: "Tom Richards — (916) 555-0291", status: "active" },
  { id: 2, type: "Homeowner's Insurance", carrier: "State Farm", policyNum: "SF-44821-CA", coverage: "$420,000 dwelling", premium: "$142/month", beneficiary: "N/A — Property", agent: "Linda Park — (916) 555-0482", status: "active" },
  { id: 3, type: "Auto Insurance", carrier: "GEICO", policyNum: "GI-293847-CA", coverage: "Full Coverage", premium: "$98/month", beneficiary: "N/A", agent: "Online Policy", status: "active" },
  { id: 4, type: "Umbrella Policy", carrier: "State Farm", policyNum: "SF-UMB-1029-CA", coverage: "$1,000,000", premium: "$28/month", beneficiary: "N/A", agent: "Linda Park — (916) 555-0482", status: "active" },
];

const realEstate = [
  { id: 1, type: "Primary Residence", address: "1842 Oak Ridge Drive, Sacramento, CA 95825", value: "$485,000", mortgage: "Wells Fargo — Balance: $201,400", mortgagePayment: "$1,842/month", titleHolder: "James & Sarah Doe", deed: "Recorded with Sacramento County", notes: "Paid off 2034" },
  { id: 2, type: "Rental Property", address: "524 Elm Street, Roseville, CA 95678", value: "$320,000", mortgage: "None — Owned free & clear", mortgagePayment: "N/A", titleHolder: "James Doe", deed: "Recorded with Placer County", notes: "Rented to Tenant — $1,800/month income" },
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
  { id: "realestate" as Tab, label: "Real Estate", icon: <Home size={14} /> },
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

.fpd-fin .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.34);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-fin .card.pad{padding:22px;}
.fpd-fin .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-fin .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-fin .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-fin .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-fin .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-fin .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-fin .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.34);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-fin .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.34);width:fit-content;flex-wrap:wrap;}
.fpd-fin .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-fin .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-fin .toolbar{display:flex;align-items:center;justify-content:flex-end;}

/* KPI ledger */
.fpd-fin .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-fin .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.34);position:relative;text-align:left;overflow:hidden;}
.fpd-fin .kcell:first-child{border-left:none;}
.fpd-fin .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-fin .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-fin .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.34);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-fin .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-fin .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-fin .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-fin .kstrip{grid-template-columns:1fr 1fr;}.fpd-fin .kcell:nth-child(3){border-left:none;}.fpd-fin .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.34);}}

/* record cards */
.fpd-fin .rlist{display:flex;flex-direction:column;gap:14px;}
.fpd-fin .rtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-fin .rico{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-fin .rtitle{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px;}
.fpd-fin .rsub{color:${MUTED};font-size:12.5px;}
.fpd-fin .rbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;background:rgba(95,190,145,0.14);color:#D99A6B;flex-shrink:0;}
.fpd-fin .rtag{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:#6FAE8B;margin-bottom:6px;}
.fpd-fin .rgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.34);overflow:hidden;}
.fpd-fin .rgrid.c2{grid-template-columns:1fr 1fr;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n+2),.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.34);}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.34);}
.fpd-fin .rgrid.c2 .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.34);}
.fpd-fin .rgrid.c2 .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.34);}
.fpd-fin .tile{padding:12px 14px;position:relative;transition:background .18s ease;}
.fpd-fin .tile:hover{background:rgba(126,107,216,0.08);}
.fpd-fin .tile::after{content:"";position:absolute;left:0;bottom:0;height:2px;width:100%;pointer-events:none;background:linear-gradient(90deg,#7E6BD8,#5B6EE1);transform:scaleX(0);transform-origin:left;transition:transform .2s ease;box-shadow:0 0 8px 0 rgba(126,107,216,0.65);}
.fpd-fin .tile:hover::after{transform:scaleX(1);}
.fpd-fin .tile .tk{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-fin .tile .tv{color:${TEXT};font-size:13px;line-height:1.5;transition:color .18s ease;}
.fpd-fin .tile:hover .tv{color:#C9BFF0;}
.fpd-fin .bigval{font-family:var(--font-display);font-size:20px;font-weight:700;flex-shrink:0;}
.fpd-fin .redit{background:none;border:none;color:${MUTED};cursor:pointer;padding:6px;display:flex;flex-shrink:0;transition:color .16s;}
.fpd-fin .redit:hover{color:#6FAE8B;}
.fpd-fin .docpill{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:9px;font-size:12px;background:rgba(95,190,145,0.08);color:#D99A6B;border:1px solid rgba(95,190,145,0.22);margin-top:14px;}
.fpd-fin .notewarn{margin-top:14px;padding:12px 14px;border-radius:11px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);color:${WARN};font-size:13px;line-height:1.6;}
@media (max-width:760px){
.fpd-fin .rgrid,.fpd-fin .rgrid.c2{grid-template-columns:1fr;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n+2),.fpd-fin .rgrid:not(.c2) .tile:nth-child(3n){border-left:none;}
.fpd-fin .rgrid.c2 .tile:nth-child(2n){border-left:none;}
.fpd-fin .rgrid:not(.c2) .tile:nth-child(n+2),.fpd-fin .rgrid.c2 .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.34);}
}

/* modal */
.fpd-fin .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-fin .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-fin .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.34);}
.fpd-fin .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-fin .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-fin .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-fin .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-fin .field input,.fpd-fin .field select,.fpd-fin .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.34);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fin .field input::placeholder,.fpd-fin .field textarea::placeholder{color:${FAINT};}
.fpd-fin .field input:focus,.fpd-fin .field select:focus,.fpd-fin .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fin .upload-row{display:flex;gap:8px;}
.fpd-fin .upload-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:11px;border:1px dashed rgba(91,110,225,0.32);background:rgba(91,110,225,0.04);color:#6FAE8B;font-size:13px;cursor:pointer;font-family:var(--font-body);}
.fpd-fin .upload-ok{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:11px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.25);}
.fpd-fin .upload-ok button{background:none;border:none;color:${NEG};cursor:pointer;display:flex;}
.fpd-fin .upload-hint{color:${MUTED};font-size:11px;line-height:1.5;margin-top:6px;}
.fpd-fin .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.34);}
.fpd-fin .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-fin .modal-foot .save:hover{filter:brightness(1.08);}
`;

function AddModal({ title, fields, onClose, onAdd }: {
  title: string;
  fields: { label: string; key: string; placeholder?: string; type?: string }[];
  onClose: () => void;
  onAdd: (form: Record<string, string>, attachedDoc?: string) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(Object.fromEntries(fields.map(f => [f.key, ""])));
  const [attachedDoc, setAttachedDoc] = useState<string | null>(null);
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
      <div className="card modal glow-surface">
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
                  <span style={{ color: TEXT, fontSize: 13 }}>{attachedDoc}</span>
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
          <button className="save" onClick={() => onAdd(form, attachedDoc ?? undefined)}>Add Record{attachedDoc ? " + Document" : ""}</button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export function FinancialRecords() {
  const [tab, setTab] = useState<Tab>("insurance");
  const [showAdd, setShowAdd] = useState<Tab | null>(null);
  const [policies, setPolicies]       = useState(insurancePolicies);
  const [properties, setProperties]   = useState(realEstate);
  const [investments, setInvestments] = useState(portfolios);
  const [retirement, setRetirement]   = useState(retirementAccounts);
  const [taxList, setTaxList]         = useState(taxes);
  const [bizList, setBizList]         = useState(businessAccounts);

  const kpis = [
    { label: "Insurance Policies", value: String(policies.length), sub: "On file", icon: <Shield size={14} />, dot: ACCENT2 },
    { label: "Real Estate", value: String(properties.length), sub: properties.length === 1 ? "Property" : "Properties", icon: <Home size={14} />, dot: ACCENT2 },
    { label: "Investment Accounts", value: String(investments.length), sub: "Brokerage & retirement", icon: <TrendingUp size={14} />, dot: POS },
    { label: "Tax Years Filed", value: String(taxList.length), sub: "Years on record", icon: <Receipt size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-fin">
      <style dangerouslySetInnerHTML={{ __html: FIN_CSS }} />
      <div className="fpd-fin-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><DollarSign size={12} /> Financial Records</div>
            <h1 className="pg-h1">Financial Records</h1>
            <div className="pg-sub">Insurance policies, real estate, investments, retirement accounts, taxes, and business information.</div>
          </div>
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

        {/* ── Tabs ── */}
        <div className="seg">
          {tabConfig.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Insurance ── */}
        {tab === "insurance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("insurance")}><Plus size={14} /> Add Policy</button></div>
            <div className="rlist">
              {policies.map(policy => (
                <div key={policy.id} className="card pad glow-surface">
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
                      <button className="redit"><Edit2 size={14} /></button>
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

        {/* ── Real Estate ── */}
        {tab === "realestate" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar"><button className="btn-primary" onClick={() => setShowAdd("realestate")}><Plus size={14} /> Add Property</button></div>
            <div className="rlist">
              {properties.map(prop => (
                <div key={prop.id} className="card pad glow-surface">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><Home size={20} /></div>
                      <div>
                        <div className="rtitle">{prop.type}</div>
                        <div className="rsub">{prop.address}</div>
                      </div>
                    </div>
                    <div className="bigval" style={{ color: "#6FAE8B" }}>{prop.value}</div>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Mortgage / Lender</div><div className="tv">{prop.mortgage}</div></div>
                    <div className="tile"><div className="tk">Monthly Payment</div><div className="tv">{prop.mortgagePayment}</div></div>
                    <div className="tile"><div className="tk">Title Holder</div><div className="tv">{prop.titleHolder}</div></div>
                    <div className="tile"><div className="tk">Deed Recording</div><div className="tv">{prop.deed}</div></div>
                    <div className="tile"><div className="tk">Notes</div><div className="tv">{prop.notes}</div></div>
                  </div>
                  {(prop as any).attachedDoc && <div className="docpill"><FileText size={12} /> {(prop as any).attachedDoc}</div>}
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
                <div key={p.id} className="card pad glow-surface">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><TrendingUp size={20} /></div>
                      <div>
                        <div className="rtitle">{p.institution}</div>
                        <div className="rsub">{p.accountType} · {p.accountNum}</div>
                      </div>
                    </div>
                    <div className="bigval" style={{ color: "#D99A6B" }}>{p.value}</div>
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
                <div key={r.id} className="card pad glow-surface">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><DollarSign size={20} /></div>
                      <div>
                        <span className="rtag">{r.type}</span>
                        <div className="rtitle">{r.institution}</div>
                        <div className="rsub">{r.employer && `${r.employer} · `}{r.accountNum}</div>
                      </div>
                    </div>
                    <div className="bigval" style={{ color: "#6FAE8B" }}>{r.balance}</div>
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
                <div key={t.year} className="card pad glow-surface">
                  <div className="rtop">
                    <div className="rtitle" style={{ fontSize: 18 }}>Tax Year {t.year}</div>
                    <div className="bigval" style={{ fontSize: 15, color: t.refund.includes("refund") ? "#D99A6B" : NEG }}>{t.refund}</div>
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
                <div key={b.id} className="card pad glow-surface">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><Briefcase size={20} /></div>
                      <div>
                        <div className="rtitle">{b.businessName}</div>
                        <div className="rsub">{b.type} · EIN: {b.ein}</div>
                      </div>
                    </div>
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

        {showAdd === "insurance" && <AddModal title="Add Insurance Policy" onClose={() => setShowAdd(null)}
          fields={[{ label: "Type", key: "type", placeholder: "e.g. Life Insurance" }, { label: "Carrier", key: "carrier", placeholder: "e.g. MetLife" }, { label: "Policy Number", key: "policyNum" }, { label: "Coverage Amount", key: "coverage", placeholder: "e.g. $500,000" }, { label: "Premium", key: "premium", placeholder: "e.g. $182/month" }, { label: "Beneficiary", key: "beneficiary" }, { label: "Agent", key: "agent" }, { label: "Status", key: "status", placeholder: "active" }]}
          onAdd={(f, doc) => { setPolicies(p => [...p, { id: Date.now(), type: f.type || "Policy", carrier: f.carrier || "", policyNum: f.policyNum || "", coverage: f.coverage || "", premium: f.premium || "", beneficiary: f.beneficiary || "", agent: f.agent || "", status: f.status || "active", attachedDoc: doc || null }]); toast.success(`${f.type || "Policy"} added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}

        {showAdd === "realestate" && <AddModal title="Add Property" onClose={() => setShowAdd(null)}
          fields={[{ label: "Type", key: "type", placeholder: "e.g. Primary Residence, Rental" }, { label: "Address", key: "address" }, { label: "Estimated Value", key: "value", placeholder: "e.g. $485,000" }, { label: "Mortgage", key: "mortgage", placeholder: "Lender or None" }, { label: "Monthly Payment", key: "mortgagePayment" }, { label: "Title Holder", key: "titleHolder" }, { label: "Deed Info", key: "deed" }, { label: "Notes", key: "notes" }]}
          onAdd={(f, doc) => { setProperties(p => [...p, { id: Date.now(), type: f.type || "Property", address: f.address || "", value: f.value || "", mortgage: f.mortgage || "", mortgagePayment: f.mortgagePayment || "", titleHolder: f.titleHolder || "", deed: f.deed || "", notes: f.notes || "", attachedDoc: doc || null }]); toast.success(`Property added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}

        {showAdd === "portfolios" && <AddModal title="Add Investment Account" onClose={() => setShowAdd(null)}
          fields={[{ label: "Institution", key: "institution", placeholder: "e.g. Fidelity Investments" }, { label: "Account Type", key: "accountType", placeholder: "e.g. Brokerage, Roth IRA" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Estimated Value", key: "value", placeholder: "e.g. $50,000" }, { label: "Holdings", key: "holdings", placeholder: "e.g. S&P 500 Index" }, { label: "Beneficiary", key: "beneficiary" }, { label: "Contact", key: "contact" }]}
          onAdd={(f, doc) => { setInvestments(p => [...p, { id: Date.now(), institution: f.institution || "", accountType: f.accountType || "", accountNum: f.accountNum || "XXXX-????", value: f.value || "", holdings: f.holdings || "", beneficiary: f.beneficiary || "", contact: f.contact || "", attachedDoc: doc || null }]); toast.success(`Investment account added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}

        {showAdd === "retirement" && <AddModal title="Add Retirement Account" onClose={() => setShowAdd(null)}
          fields={[{ label: "Account Type", key: "type", placeholder: "e.g. 401(k), IRA, Pension" }, { label: "Employer (if 401k)", key: "employer", placeholder: "Optional" }, { label: "Institution", key: "institution" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Balance", key: "balance", placeholder: "e.g. $120,000" }, { label: "Contributions", key: "contributions", placeholder: "e.g. $500/month" }, { label: "Vesting", key: "vested", placeholder: "e.g. 100%" }, { label: "Beneficiary", key: "beneficiary" }]}
          onAdd={(f, doc) => { setRetirement(p => [...p, { id: Date.now(), type: f.type || "", employer: f.employer || "", institution: f.institution || "", accountNum: f.accountNum || "XXXX-????", balance: f.balance || "", contributions: f.contributions || "", vested: f.vested || "", beneficiary: f.beneficiary || "", attachedDoc: doc || null }]); toast.success(`Retirement account added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}

        {showAdd === "taxes" && <AddModal title="Add Tax Year" onClose={() => setShowAdd(null)}
          fields={[{ label: "Tax Year", key: "year", placeholder: "e.g. 2026" }, { label: "Filed Date", key: "filedDate", placeholder: "e.g. Apr 15, 2027" }, { label: "Filed With", key: "filedWith", placeholder: "e.g. TurboTax, H&R Block" }, { label: "Result", key: "refund", placeholder: "e.g. $1,200 refund or $800 owed" }, { label: "Accountant", key: "accountant", placeholder: "Name or Self-prepared" }, { label: "Document Location", key: "documents", placeholder: "e.g. 2026_1040.pdf in Legacy Vault" }]}
          onAdd={(f, doc) => { setTaxList(p => [...p, { year: f.year || "", filedDate: f.filedDate || "", filedWith: f.filedWith || "", refund: f.refund || "", accountant: f.accountant || "", documents: doc || f.documents || "" }]); toast.success(`Tax year ${f.year || ""} added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}

        {showAdd === "business" && <AddModal title="Add Business" onClose={() => setShowAdd(null)}
          fields={[{ label: "Business Name", key: "businessName" }, { label: "Entity Type", key: "type", placeholder: "e.g. LLC, S-Corp, Sole Proprietor" }, { label: "EIN", key: "ein", placeholder: "XX-XXXXXXX" }, { label: "Bank", key: "bank" }, { label: "Account Number (last 4)", key: "accountNum", placeholder: "XXXX-1234" }, { label: "Annual Revenue", key: "revenue", placeholder: "e.g. ~$60,000/year" }, { label: "Accountant", key: "accountant" }, { label: "Notes / Transfer Instructions", key: "notes" }]}
          onAdd={(f, doc) => { setBizList(p => [...p, { id: Date.now(), businessName: f.businessName || "", type: f.type || "", ein: f.ein || "", bank: f.bank || "", accountNum: f.accountNum || "", revenue: f.revenue || "", accountant: f.accountant || "", notes: f.notes || "", attachedDoc: doc || null }]); toast.success(`${f.businessName || "Business"} added${doc ? ` with document "${doc}"` : ""}`); setShowAdd(null); }} />}
      </div>
    </div>
  );
}
