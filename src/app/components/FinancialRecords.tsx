import React, { useState } from "react";
import { Shield, Home, TrendingUp, Briefcase, DollarSign, Receipt, Plus, Edit2, Trash2, Building, X, Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

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

const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>{title}</h3>
          <button onClick={onClose} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
        </div>

        {/* Form fields */}
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{f.label.toUpperCase()}</label>
            <input type={f.type||"text"} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder||""} style={INPUT}/>
          </div>
        ))}

        {/* Document upload — attach the actual file right here */}
        <div>
          <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:6 }}>
            ATTACH DOCUMENT (optional — upload the actual file)
          </label>
          {attachedDoc ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.25)" }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} color="#48BB78"/>
                <span style={{ color:"var(--foreground)", fontSize:13 }}>{attachedDoc}</span>
              </div>
              <button onClick={() => setAttachedDoc(null)} style={{ color:"#FC8181" }}><X size={13}/></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                style={{ border:"1px dashed rgba(108,92,231,0.3)", background:"rgba(108,92,231,0.03)", color:"var(--primary)" }}>
                <Upload size={14}/> Upload File (PDF, image, doc)
              </button>
              <ScanButton
                folder="financial"
                onUpload={doc => { setAttachedDoc(doc.name); toast.success(`"${doc.name}" scanned`); }}
                size="sm"
                label="Scan"
              />
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleFileUpload}/>
          {!attachedDoc && (
            <p style={{ color:"var(--muted-foreground)", fontSize:11, marginTop:6, lineHeight:1.5 }}>
              Upload the actual document (policy PDF, statement, deed, etc.) so it's stored alongside the record details. It will also sync to the File Cabinet automatically.
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={() => onAdd(form, attachedDoc ?? undefined)}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{ background:"var(--primary)", color:"#070D1A" }}>
            Add Record{attachedDoc ? " + Document" : ""}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl text-sm"
            style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
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

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="p-5 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{children}</div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-lg" style={{ background: "#1C1C28" }}>
      <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>{label.toUpperCase()}</span>
      <span style={{ color: "var(--foreground)", fontSize: 13 }}>{value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Financial Records</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Insurance policies, real estate, investments, retirement accounts, taxes, and business information.</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: "var(--card)", width: "fit-content" }}>
        {tabConfig.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
            style={{ background: tab === t.id ? "var(--primary)" : "transparent", color: tab === t.id ? "#070D1A" : "var(--muted-foreground)", fontWeight: tab === t.id ? 600 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "insurance" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("insurance")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Policy</button></div>
          {policies.map(policy => (
            <Card key={policy.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={16} color="var(--primary)" />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>{policy.type}</span>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{policy.carrier}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-xs" style={{ background: "rgba(72,187,120,0.12)", color: "#48BB78", fontFamily: "var(--font-mono)" }}>ACTIVE</span>
                  <button style={{ color: "var(--muted-foreground)" }}><Edit2 size={14} /></button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Policy Number" value={policy.policyNum} />
                <Field label="Coverage" value={policy.coverage} />
                <Field label="Premium" value={policy.premium} />
                <Field label="Beneficiary" value={policy.beneficiary} />
                <Field label="Agent / Contact" value={policy.agent} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(policy as any).attachedDoc && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                    style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}>
                    <FileText size={11}/> {(policy as any).attachedDoc}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "realestate" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("realestate")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Property</button></div>
          {properties.map(prop => (
            <Card key={prop.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Home size={16} color="var(--primary)" />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>{prop.type}</span>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{prop.address}</div>
                </div>
                <div style={{ color: "var(--primary)", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{prop.value}</div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Mortgage / Lender" value={prop.mortgage} />
                <Field label="Monthly Payment" value={prop.mortgagePayment} />
                <Field label="Title Holder" value={prop.titleHolder} />
                <Field label="Deed Recording" value={prop.deed} />
                <Field label="Notes" value={prop.notes} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(prop as any).attachedDoc && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}><FileText size={11}/> {(prop as any).attachedDoc}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "portfolios" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("portfolios")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Account</button></div>
          {investments.map(p => (
            <Card key={p.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 2 }}>{p.institution}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{p.accountType} · {p.accountNum}</div>
                </div>
                <div style={{ color: "#48BB78", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{p.value}</div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Holdings" value={p.holdings} />
                <Field label="Beneficiary" value={p.beneficiary} />
                <Field label="Contact / Login" value={p.contact} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(p as any).attachedDoc && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}><FileText size={11}/> {(p as any).attachedDoc}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "retirement" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("retirement")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Account</button></div>
          {retirement.map(r => (
            <Card key={r.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-xs mb-2 inline-block" style={{ background: "rgba(108,92,231,0.1)", color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{r.type}</span>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>{r.institution}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{r.employer && `${r.employer} · `}{r.accountNum}</div>
                </div>
                <div style={{ color: "#9F7AEA", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>{r.balance}</div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Contributions" value={r.contributions} />
                <Field label="Vested" value={r.vested} />
                <Field label="Beneficiary" value={r.beneficiary} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(r as any).attachedDoc && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}><FileText size={11}/> {(r as any).attachedDoc}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "taxes" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("taxes")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Tax Year</button></div>
          {taxList.map(t => (
            <Card key={t.year}>
              <div className="flex items-start justify-between mb-4">
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)" }}>Tax Year {t.year}</div>
                <span style={{ color: t.refund.includes("refund") ? "#48BB78" : "#FC8181", fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{t.refund}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Filed Date" value={t.filedDate} />
                <Field label="Filed With" value={t.filedWith} />
                <Field label="Tax Preparer" value={t.accountant} />
                <Field label="Documents" value={t.documents} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(t as any).attachedDoc && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}><FileText size={11}/> {(t as any).attachedDoc}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "business" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("business")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Business</button></div>
          {bizList.map(b => (
            <Card key={b.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl p-2" style={{ background: "rgba(108,92,231,0.1)" }}><Briefcase size={18} color="var(--primary)" /></div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--foreground)" }}>{b.businessName}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{b.type} · EIN: {b.ein}</div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Bank" value={b.bank} />
                <Field label="Account Number" value={b.accountNum} />
                <Field label="Annual Revenue" value={b.revenue} />
                <Field label="Accountant" value={b.accountant} />
              </div>
              <div className="mt-3 px-4 py-3 rounded-lg" style={{ background: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.25)" }}>
                <span style={{ color: "#F6AD55", fontSize: 13 }}>Succession Note: {b.notes}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                {(b as any).attachedDoc && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs" style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}><FileText size={11}/> {(b as any).attachedDoc}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd === "insurance" && <AddModal title="Add Insurance Policy" onClose={()=>setShowAdd(null)}
        fields={[{label:"Type",key:"type",placeholder:"e.g. Life Insurance"},{label:"Carrier",key:"carrier",placeholder:"e.g. MetLife"},{label:"Policy Number",key:"policyNum"},{label:"Coverage Amount",key:"coverage",placeholder:"e.g. $500,000"},{label:"Premium",key:"premium",placeholder:"e.g. $182/month"},{label:"Beneficiary",key:"beneficiary"},{label:"Agent",key:"agent"},{label:"Status",key:"status",placeholder:"active"}]}
        onAdd={(f,doc)=>{ setPolicies(p=>[...p,{id:Date.now(),type:f.type||"Policy",carrier:f.carrier||"",policyNum:f.policyNum||"",coverage:f.coverage||"",premium:f.premium||"",beneficiary:f.beneficiary||"",agent:f.agent||"",status:f.status||"active",attachedDoc:doc||null}]); toast.success(`${f.type||"Policy"} added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}

      {showAdd === "realestate" && <AddModal title="Add Property" onClose={()=>setShowAdd(null)}
        fields={[{label:"Type",key:"type",placeholder:"e.g. Primary Residence, Rental"},{label:"Address",key:"address"},{label:"Estimated Value",key:"value",placeholder:"e.g. $485,000"},{label:"Mortgage",key:"mortgage",placeholder:"Lender or None"},{label:"Monthly Payment",key:"mortgagePayment"},{label:"Title Holder",key:"titleHolder"},{label:"Deed Info",key:"deed"},{label:"Notes",key:"notes"}]}
        onAdd={(f,doc)=>{ setProperties(p=>[...p,{id:Date.now(),type:f.type||"Property",address:f.address||"",value:f.value||"",mortgage:f.mortgage||"",mortgagePayment:f.mortgagePayment||"",titleHolder:f.titleHolder||"",deed:f.deed||"",notes:f.notes||"",attachedDoc:doc||null}]); toast.success(`Property added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}

      {showAdd === "portfolios" && <AddModal title="Add Investment Account" onClose={()=>setShowAdd(null)}
        fields={[{label:"Institution",key:"institution",placeholder:"e.g. Fidelity Investments"},{label:"Account Type",key:"accountType",placeholder:"e.g. Brokerage, Roth IRA"},{label:"Account Number (last 4)",key:"accountNum",placeholder:"XXXX-1234"},{label:"Estimated Value",key:"value",placeholder:"e.g. $50,000"},{label:"Holdings",key:"holdings",placeholder:"e.g. S&P 500 Index"},{label:"Beneficiary",key:"beneficiary"},{label:"Contact",key:"contact"}]}
        onAdd={(f,doc)=>{ setInvestments(p=>[...p,{id:Date.now(),institution:f.institution||"",accountType:f.accountType||"",accountNum:f.accountNum||"XXXX-????",value:f.value||"",holdings:f.holdings||"",beneficiary:f.beneficiary||"",contact:f.contact||"",attachedDoc:doc||null}]); toast.success(`Investment account added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}

      {showAdd === "retirement" && <AddModal title="Add Retirement Account" onClose={()=>setShowAdd(null)}
        fields={[{label:"Account Type",key:"type",placeholder:"e.g. 401(k), IRA, Pension"},{label:"Employer (if 401k)",key:"employer",placeholder:"Optional"},{label:"Institution",key:"institution"},{label:"Account Number (last 4)",key:"accountNum",placeholder:"XXXX-1234"},{label:"Balance",key:"balance",placeholder:"e.g. $120,000"},{label:"Contributions",key:"contributions",placeholder:"e.g. $500/month"},{label:"Vesting",key:"vested",placeholder:"e.g. 100%"},{label:"Beneficiary",key:"beneficiary"}]}
        onAdd={(f,doc)=>{ setRetirement(p=>[...p,{id:Date.now(),type:f.type||"",employer:f.employer||"",institution:f.institution||"",accountNum:f.accountNum||"XXXX-????",balance:f.balance||"",contributions:f.contributions||"",vested:f.vested||"",beneficiary:f.beneficiary||"",attachedDoc:doc||null}]); toast.success(`Retirement account added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}

      {showAdd === "taxes" && <AddModal title="Add Tax Year" onClose={()=>setShowAdd(null)}
        fields={[{label:"Tax Year",key:"year",placeholder:"e.g. 2026"},{label:"Filed Date",key:"filedDate",placeholder:"e.g. Apr 15, 2027"},{label:"Filed With",key:"filedWith",placeholder:"e.g. TurboTax, H&R Block"},{label:"Result",key:"refund",placeholder:"e.g. $1,200 refund or $800 owed"},{label:"Accountant",key:"accountant",placeholder:"Name or Self-prepared"},{label:"Document Location",key:"documents",placeholder:"e.g. 2026_1040.pdf in Legacy Vault"}]}
        onAdd={(f,doc)=>{ setTaxList(p=>[...p,{year:f.year||"",filedDate:f.filedDate||"",filedWith:f.filedWith||"",refund:f.refund||"",accountant:f.accountant||"",documents:doc||f.documents||""}]); toast.success(`Tax year ${f.year||""} added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}

      {showAdd === "business" && <AddModal title="Add Business" onClose={()=>setShowAdd(null)}
        fields={[{label:"Business Name",key:"businessName"},{label:"Entity Type",key:"type",placeholder:"e.g. LLC, S-Corp, Sole Proprietor"},{label:"EIN",key:"ein",placeholder:"XX-XXXXXXX"},{label:"Bank",key:"bank"},{label:"Account Number (last 4)",key:"accountNum",placeholder:"XXXX-1234"},{label:"Annual Revenue",key:"revenue",placeholder:"e.g. ~$60,000/year"},{label:"Accountant",key:"accountant"},{label:"Notes / Transfer Instructions",key:"notes"}]}
        onAdd={(f,doc)=>{ setBizList(p=>[...p,{id:Date.now(),businessName:f.businessName||"",type:f.type||"",ein:f.ein||"",bank:f.bank||"",accountNum:f.accountNum||"",revenue:f.revenue||"",accountant:f.accountant||"",notes:f.notes||"",attachedDoc:doc||null}]); toast.success(`${f.businessName||"Business"} added${doc?` with document "${doc}"`:""}` ); setShowAdd(null); }}/>}
    </div>
  );
}
