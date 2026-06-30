import React, { useState } from "react";
import { FileText, Plus, Edit2, CheckCircle, Upload, Shield } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const DOCUMENT_TYPES = [
  "Last Will & Testament",
  "Living Will / Advance Directive",
  "Durable Power of Attorney",
  "Healthcare Power of Attorney",
  "Revocable Living Trust",
  "Irrevocable Trust",
  "Special Needs Trust",
  "Pour-Over Will",
  "QTIP Trust",
  "Charitable Remainder Trust",
];

const initWills = [
  { id:1, type:"Last Will & Testament",          attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"Original: Safe deposit box, Copy: Legacy Vault" },
  { id:2, type:"Living Will / Advance Directive", attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"On file with Dr. Karen Fields & Legacy Vault" },
  { id:3, type:"Durable Power of Attorney",       attorney:"Linda Torres, Esq.", dateExecuted:"March 15, 2026", lastReviewed:"March 15, 2026", status:"current", location:"Legacy Vault" },
];

export function WillsAndTrusts() {
  const [wills, setWills] = useState(initWills);
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({ type: DOCUMENT_TYPES[0], attorney:"", dateExecuted:"", location:"", notes:"" });

  function addDocument() {
    if (!newDoc.attorney.trim()) { toast.error("Attorney name is required"); return; }
    const doc = {
      id: Date.now(),
      type: newDoc.type,
      attorney: newDoc.attorney,
      dateExecuted: newDoc.dateExecuted || new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      lastReviewed: new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}),
      status: "current",
      location: newDoc.location || "Legacy Vault",
    };
    setWills(prev => [doc, ...prev]);
    toast.success(`${newDoc.type} added`);
    setNewDoc({ type:DOCUMENT_TYPES[0], attorney:"", dateExecuted:"", location:"", notes:"" });
    setShowAdd(false);
  }

  const INPUT: React.CSSProperties = { background:"rgba(32,64,192,0.05)", border:"1px solid rgba(32,64,192,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>
            Wills and Living Trusts
          </h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>
            Legal documents executed with your attorney. All originals should be stored securely — keep certified copies in your Legacy Vault.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Document
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-5 py-4 rounded-2xl"
        style={{ background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.15)" }}>
        <Shield size={16} color="var(--primary)" style={{ marginTop:2, flexShrink:0 }}/>
        <div style={{ color:"var(--muted-foreground)", fontSize:13, lineHeight:1.7 }}>
          <strong style={{ color:"var(--foreground)" }}>Important:</strong> Your legal documents should be prepared and executed by a licensed estate attorney.
          Store the original in a fireproof safe or safe deposit box, and upload a certified copy to your Legacy Vault so your legacy contacts can access it when needed.
        </div>
      </div>

      {/* Document list */}
      {wills.length === 0 && (
        <div className="py-16 text-center rounded-2xl" style={CARD}>
          <FileText size={40} color="rgba(32,64,192,0.2)" style={{ margin:"0 auto 12px" }}/>
          <div style={{ color:"var(--muted-foreground)", fontSize:14 }}>No legal documents added yet.</div>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-sm underline" style={{ color:"var(--primary)" }}>
            Add your first document
          </button>
        </div>
      )}

      <div className="space-y-4">
        {wills.map(will => (
          <div key={will.id} className="p-6 rounded-2xl" style={CARD}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width:44, height:44, background:"rgba(32,64,192,0.08)" }}>
                  <FileText size={20} color="var(--primary)"/>
                </div>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)", marginBottom:3 }}>
                    {will.type}
                  </div>
                  <div style={{ color:"var(--muted-foreground)", fontSize:13 }}>
                    Prepared by {will.attorney}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background:"rgba(72,187,120,0.12)", color:"#48BB78", ...MONO }}>
                  <CheckCircle size={10}/> CURRENT
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-5">
              {[
                { label:"Date Executed",    value:will.dateExecuted },
                { label:"Last Reviewed",    value:will.lastReviewed },
                { label:"Document Location",value:will.location },
              ].map(f => (
                <div key={f.label} className="px-4 py-3 rounded-xl" style={{ background:"#EAF0FC" }}>
                  <div style={{ color:"var(--muted-foreground)", fontSize:10, marginBottom:4, ...MONO }}>
                    {f.label.toUpperCase()}
                  </div>
                  <div style={{ color:"var(--foreground)", fontSize:13 }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1">
              <button onClick={() => toast.success(`Opening ${will.type} in Legacy Vault`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                style={{ background:"rgba(32,64,192,0.1)", color:"var(--primary)" }}>
                <FileText size={13}/> View in Vault
              </button>
              <button onClick={() => toast.success("Update record — opens edit form")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                style={{ background:"var(--secondary)", color:"var(--foreground)" }}>
                <Edit2 size={13}/> Update Record
              </button>
              <ScanButton
                folder="legal"
                onUpload={doc => toast.success(`"${doc.name}" uploaded and linked to ${will.type}`)}
                size="sm"
                label="Scan & Upload Copy"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add document modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-7 space-y-4 overflow-y-auto"
            style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(7,13,26,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>
                Add Legal Document
              </h3>
              <button onClick={() => setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}>✕</button>
            </div>

            {/* Document type */}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>
                DOCUMENT TYPE
              </label>
              <select value={newDoc.type} onChange={e => setNewDoc(p=>({...p,type:e.target.value}))} style={INPUT}>
                {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Attorney */}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>
                ATTORNEY / LAW FIRM *
              </label>
              <input value={newDoc.attorney} onChange={e => setNewDoc(p=>({...p,attorney:e.target.value}))}
                placeholder="e.g. Jane Smith, Esq. / Smith & Associates" style={INPUT}/>
            </div>

            {/* Date */}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>
                DATE EXECUTED
              </label>
              <input type="date" value={newDoc.dateExecuted} onChange={e => setNewDoc(p=>({...p,dateExecuted:e.target.value}))} style={INPUT}/>
            </div>

            {/* Location */}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>
                ORIGINAL DOCUMENT LOCATION
              </label>
              <input value={newDoc.location} onChange={e => setNewDoc(p=>({...p,location:e.target.value}))}
                placeholder="e.g. Safe deposit box at First National Bank" style={INPUT}/>
            </div>

            {/* Upload */}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>
                UPLOAD CERTIFIED COPY (optional)
              </label>
              <ScanButton
                folder="legal"
                onUpload={doc => toast.success(`"${doc.name}" will be linked to this document`)}
                size="sm"
                label="Scan or Upload Document"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={addDocument}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background:"var(--primary)", color:"#070D1A" }}>
                Add Document
              </button>
              <button onClick={() => setShowAdd(false)}
                className="px-5 py-3 rounded-xl text-sm"
                style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
