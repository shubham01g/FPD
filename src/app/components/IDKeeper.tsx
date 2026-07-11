import React, { useState } from "react";
import { CreditCard, Plus, X, Eye, EyeOff, Shield, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const ID_TYPES = ["Driver's License","Passport","Social Security Card","Birth Certificate","Military ID","Medicare Card","Medicaid Card","Health Insurance Card","Dental Insurance Card","Vision Insurance Card","Work / Employee ID","Student ID","Global Entry / TSA PreCheck","Green Card / Permanent Resident","Voter Registration","Vehicle Registration","Concealed Carry Permit","Professional License","Other"];

const CATEGORIES: Record<string, { color:string; bg:string; emoji:string }> = {
  "Government ID":   { color:"#3A5BD9", bg:"rgba(58,91,217,0.1)",   emoji:"🪪" },
  "Insurance":       { color:"#48BB78", bg:"rgba(72,187,120,0.1)",  emoji:"🛡️" },
  "Professional":    { color:"#6E8BFF", bg:"rgba(110,139,255,0.1)", emoji:"💼" },
  "Military":        { color:"#ED8936", bg:"rgba(237,137,54,0.1)",  emoji:"🎖️" },
  "Other":           { color:"rgba(255,255,255,0.65)", bg:"rgba(138,154,184,0.1)", emoji:"📋" },
};

const typeCategory: Record<string, string> = {
  "Driver's License":"Government ID","Passport":"Government ID","Social Security Card":"Government ID",
  "Birth Certificate":"Government ID","Green Card / Permanent Resident":"Government ID",
  "Voter Registration":"Government ID","Vehicle Registration":"Government ID",
  "Medicare Card":"Insurance","Medicaid Card":"Insurance","Health Insurance Card":"Insurance",
  "Dental Insurance Card":"Insurance","Vision Insurance Card":"Insurance",
  "Military ID":"Military","Work / Employee ID":"Professional","Student ID":"Professional",
  "Professional License":"Professional","Concealed Carry Permit":"Professional",
  "Global Entry / TSA PreCheck":"Professional",
};

interface IDRecord {
  id: number;
  type: string;
  idNumber: string;
  holder: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  documentScanned: boolean;
  masked: boolean;
}

const initIDs: IDRecord[] = [
  { id:1, type:"Driver's License", idNumber:"D1234567", holder:"James William Doe", issuedBy:"CA DMV", issueDate:"Mar 12, 2021", expiryDate:"Mar 12, 2029", notes:"Real ID compliant. Star on upper right corner.", documentScanned:true, masked:true },
  { id:2, type:"Passport", idNumber:"A12345678", holder:"James William Doe", issuedBy:"U.S. Department of State", issueDate:"Jun 5, 2019", expiryDate:"Jun 4, 2029", notes:"Valid for international travel. Keep with travel documents.", documentScanned:true, masked:true },
  { id:3, type:"Social Security Card", idNumber:"XXX-XX-4821", holder:"James William Doe", issuedBy:"Social Security Administration", issueDate:"N/A", expiryDate:"No Expiry", notes:"Original card stored in home safe. Do not carry in wallet.", documentScanned:false, masked:true },
  { id:4, type:"Medicare Card", idNumber:"1EG4-TE5-MK72", holder:"James William Doe", issuedBy:"Centers for Medicare & Medicaid", issueDate:"Jan 1, 2024", expiryDate:"No Expiry", notes:"Medicare Part A and B. Supplemental plan through Aetna.", documentScanned:true, masked:false },
  { id:5, type:"Health Insurance Card", idNumber:"GEH292847200", holder:"James William Doe", issuedBy:"Blue Shield of California", issueDate:"Jan 1, 2026", expiryDate:"Dec 31, 2026", notes:"Group plan through TechCorp Inc. Rx Group: BSC-RX-2024. PCP: Dr. Karen Fields.", documentScanned:true, masked:false },
  { id:6, type:"Global Entry / TSA PreCheck", idNumber:"KTN: 882941024", holder:"James William Doe", issuedBy:"U.S. Customs & Border Protection", issueDate:"Sep 15, 2022", expiryDate:"Sep 14, 2027", notes:"Known Traveler Number. Add to all airline bookings for PreCheck lanes.", documentScanned:false, masked:false },
];

export function IDKeeper() {
  const [ids, setIds] = useState<IDRecord[]>(initIDs);
  const [showAdd, setShowAdd] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [form, setForm] = useState({ type:ID_TYPES[0], idNumber:"", holder:"James William Doe", issuedBy:"", issueDate:"", expiryDate:"", notes:"", photo:"" });

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function toggleMask(id:number) {
    setIds(p => p.map(r => r.id===id ? {...r,masked:!r.masked} : r));
  }

  function addID() {
    if (!form.type || !form.holder) { toast.error("ID type and holder name required"); return; }
    setIds(p => [...p, { ...form, id:Date.now(), documentScanned:form.photo?true:false, masked:true }]);
    toast.success(`${form.type} added to ID Keeper`);
    setForm({ type:ID_TYPES[0], idNumber:"", holder:"James William Doe", issuedBy:"", issueDate:"", expiryDate:"", notes:"" });
    setShowAdd(false);
  }

  function isExpiringSoon(expiry:string) {
    if (expiry === "No Expiry" || expiry === "N/A") return false;
    const d = new Date(expiry);
    const diff = (d.getTime() - Date.now()) / (1000*60*60*24);
    return diff < 180 && diff > 0;
  }
  function isExpired(expiry:string) {
    if (expiry === "No Expiry" || expiry === "N/A") return false;
    return new Date(expiry) < new Date();
  }

  const filtered = ids.filter(r => {
    const cat = typeCategory[r.type] || "Other";
    return activeCategory === "all" || cat === activeCategory;
  });

  const categories = ["all", ...Object.keys(CATEGORIES)];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1240, margin:"0 auto" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>ID Keeper</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Securely store all identification documents — government IDs, insurance cards, professional licenses, and more.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add ID
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => {
          const meta = cat === "all" ? null : CATEGORIES[cat];
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background:activeCategory===cat ? (meta?.bg || "rgba(58,91,217,0.1)") : "rgba(58,91,217,0.04)", color:activeCategory===cat ? (meta?.color || "var(--primary)") : "var(--muted-foreground)", border:`1px solid ${activeCategory===cat ? (meta?.color || "var(--primary)")+"40" : "rgba(58,91,217,0.1)"}` }}>
              {meta ? `${meta.emoji} ${cat}` : "📂 All IDs"}
            </button>
          );
        })}
      </div>

      {/* ID grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(r => {
          const cat = typeCategory[r.type] || "Other";
          const meta = CATEGORIES[cat];
          const expired = isExpired(r.expiryDate);
          const expiring = isExpiringSoon(r.expiryDate);

          return (
            <div key={r.id} className="p-5 rounded-2xl glow-surface" style={CARD}>
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width:48, height:48, background:meta.bg }}>
                    {meta.emoji}
                  </div>
                  <div>
                    <div style={{ color:"var(--foreground)", fontSize:14, fontWeight:600 }}>{r.type}</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:12 }}>{r.holder}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {expired && <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(252,129,129,0.12)", color:"#FC8181", ...MONO }}>EXPIRED</span>}
                  {expiring && !expired && <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(246,173,85,0.12)", color:"#F6AD55", ...MONO }}>EXPIRING SOON</span>}
                  {r.documentScanned && <span className="px-2 py-0.5 rounded text-xs" style={{ background:"rgba(72,187,120,0.1)", color:"#48BB78", ...MONO }}>✓ SCANNED</span>}
                </div>
              </div>

              {/* ID number with mask toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3" style={{ background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.12)" }}>
                <div>
                  <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:2 }}>ID NUMBER</div>
                  <div style={{ color:"var(--foreground)", fontSize:14, ...MONO, fontWeight:600 }}>
                    {r.masked ? r.idNumber.replace(/[A-Z0-9]/g,"•") : r.idNumber}
                  </div>
                </div>
                <button onClick={() => toggleMask(r.id)} style={{ color:"var(--muted-foreground)" }}>
                  {r.masked ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[["Issued By",r.issuedBy],["Issue Date",r.issueDate],["Expiry Date",r.expiryDate]].map(([label,value])=>(
                  <div key={label} className="px-3 py-2 rounded-lg" style={{ background:"#141B2E" }}>
                    <div style={{ color:"var(--muted-foreground)", fontSize:9, ...MONO }}>{label.toUpperCase()}</div>
                    <div style={{ color:label==="Expiry Date" && expired ? "#FC8181" : "var(--foreground)", fontSize:12 }}>{value||"—"}</div>
                  </div>
                ))}
              </div>

              {r.notes && <div style={{ color:"var(--muted-foreground)", fontSize:12, lineHeight:1.5 }}>{r.notes}</div>}

              {!r.documentScanned && (
                <div className="mt-3">
                  <ScanButton folder="personal" onUpload={doc => { setIds(p=>p.map(x=>x.id===r.id?{...x,documentScanned:true}:x)); toast.success(`${r.type} scanned and saved`); }} size="sm" label="Scan & Upload ID Document"/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add ID Document</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            {/* Scan or upload the ID card */}
            <div className="p-4 rounded-xl border-2 border-dashed glow-surface" style={{ borderColor:"rgba(58,91,217,0.25)", background:"rgba(58,91,217,0.02)" }}>
              <div style={{ color:"var(--muted-foreground)", fontSize:12, marginBottom:10, fontWeight:600 }}>SCAN OR UPLOAD ID DOCUMENT</div>
              <div className="flex gap-2 flex-wrap">
                <ScanButton folder="personal" onUpload={doc => { setForm(p=>({...p,documentScanned:"true" as any})); toast.success(`"${doc.name}" scanned and attached`); }} size="sm" label="📷 Scan with Camera"/>
              </div>
              <div className="mt-3">
                <PhotoPicker value={form.photo} onChange={url => setForm(p=>({...p,photo:url}))} label="Or upload a photo of the ID" aspectRatio="16/9"/>
              </div>
            </div>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:4 }}>ID TYPE</label>
              <select value={form.type} onChange={F("type")} style={INPUT}>
                {ID_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            {[["ID / Document Number","idNumber","e.g. D1234567"],["ID Holder (Full Legal Name)","holder",""],["Issued By","issuedBy","e.g. CA DMV"],["Issue Date","issueDate","e.g. Jan 15, 2022"],["Expiry Date","expiryDate","e.g. Jan 14, 2030 or No Expiry"],["Notes","notes","Any important details"]].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={addID} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add to ID Keeper</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
