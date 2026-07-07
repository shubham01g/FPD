import React, { useState } from "react";
import { Heart, AlertTriangle, Pill, Phone, Plus, Trash2, X } from "lucide-react";
import { useDemo, type Allergy, type Medication } from "../context/DemoContext";
import { toast } from "sonner";
import { AttachDocumentField } from "./AttachDocumentField";

const GLASS: React.CSSProperties = { background:"rgba(22,22,31,0.95)", border:"1px solid rgba(108,92,231,0.14)", backdropFilter:"blur(12px)" };
const GRID: React.CSSProperties = { backgroundImage:"linear-gradient(rgba(108,92,231,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(108,92,231,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
type Tab = "emergency"|"allergies"|"medications";

const sevStyle = {
  severe:   { bg:"rgba(229,62,62,0.12)",   color:"#FC8181", label:"SEVERE" },
  moderate: { bg:"rgba(246,173,85,0.12)",  color:"#F6AD55", label:"MODERATE" },
  mild:     { bg:"rgba(72,187,120,0.12)",  color:"#48BB78", label:"MILD" },
};

const emergencyInfo = {
  bloodType:"O+", dnr:true, organDonor:true, advanceDirective:true,
  conditions:["Type 2 Diabetes (diagnosed 2019)","Hypertension (controlled)","Mild sleep apnea"],
  primaryDoctor:{ name:"Dr. Karen Fields, MD", phone:"(916) 555-0182", address:"4200 Medical Center Dr, Sacramento, CA" },
  hospital:{ name:"UC Davis Medical Center", phone:"(916) 734-2011" },
  insurance:{ carrier:"Blue Cross Blue Shield", policyNum:"BCBS-X29841-CA" },
};

function Field({ label, value }: { label:string; value:string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.04)" }}>
      <span style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO }}>{label.toUpperCase()}</span>
      <span style={{ color:"#FFFFFF", fontSize:13 }}>{value}</span>
    </div>
  );
}

function AddAllergyModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(a:Omit<Allergy,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ allergen:"", severity:"mild" as Allergy["severity"], reaction:"", type:"food", diagnosed:new Date().getFullYear().toString() });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.allergen) { toast.error("Allergen name required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Add Allergy</h3><button onClick={onClose} style={{ color:"rgba(255,255,255,0.7)" }}><X size={15}/></button></div>
        <div className="space-y-3">
          {[{key:"allergen",label:"ALLERGEN NAME",ph:"e.g. Penicillin, Shellfish"},{key:"reaction",label:"REACTION",ph:"e.g. Anaphylaxis, Hives"},{key:"diagnosed",label:"YEAR DIAGNOSED",ph:"2015"}].map(f=>(
            <div key={f.key}><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}
          <div><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>SEVERITY</label>
            <select value={form.severity} onChange={e=>setForm(f=>({...f,severity:e.target.value as any}))}
              className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option>
            </select>
          </div>
          <div><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>TYPE</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
              className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}>
              <option value="food">Food</option><option value="medication">Medication</option><option value="environmental">Environmental</option>
            </select>
          </div>
          <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (allergy test, prescription)"/>
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", opacity:loading?0.7:1 }}>{loading?"Saving...":"Save Allergy"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:"rgba(108,92,231,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMedModal({ onClose, onAdd }: { onClose:()=>void; onAdd:(m:Omit<Medication,"id">)=>Promise<void> }) {
  const [form, setForm] = useState({ name:"", dose:"", frequency:"", condition:"", prescriber:"", pharmacy:"", refillDate:"" });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!form.name || !form.dose) { toast.error("Medication name and dose required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Add Medication</h3><button onClick={onClose} style={{ color:"rgba(255,255,255,0.7)" }}><X size={15}/></button></div>
        <div className="space-y-3">
          {[{key:"name",label:"MEDICATION NAME",ph:"e.g. Metformin"},{key:"dose",label:"DOSE",ph:"e.g. 1000mg"},{key:"frequency",label:"FREQUENCY",ph:"e.g. Twice daily with meals"},{key:"condition",label:"CONDITION",ph:"e.g. Type 2 Diabetes"},{key:"prescriber",label:"PRESCRIBER",ph:"e.g. Dr. Karen Fields"},{key:"pharmacy",label:"PHARMACY",ph:"e.g. CVS Pharmacy"},{key:"refillDate",label:"NEXT REFILL DATE",ph:"e.g. Jul 1, 2026"}].map(f=>(
            <div key={f.key}><label style={{ color:"rgba(255,255,255,0.7)", fontSize:10, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.2)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
            </div>
          ))}
          <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (prescription, pharmacy receipt)"/>
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", opacity:loading?0.7:1 }}>{loading?"Saving...":"Save Medication"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background:"rgba(108,92,231,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MedicalInfo() {
  const { allergies, medications, addAllergy, removeAllergy, addMedication, removeMedication } = useDemo();
  const [tab, setTab] = useState<Tab>("emergency");
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);

  const tabs = [
    { id:"emergency" as Tab, label:"Emergency Info", icon:<Phone size={13}/> },
    { id:"allergies" as Tab, label:`Allergies (${allergies.length})`, icon:<AlertTriangle size={13}/> },
    { id:"medications" as Tab, label:`Medications (${medications.length})`, icon:<Pill size={13}/> },
  ];

  return (
    <div className="p-6 space-y-5 relative" style={{ maxWidth:1100, ...GRID }}>
      <div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4 }}>Medical Information</h1>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Critical medical data accessible to verified legacy contacts and first responders.</p>
      </div>
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background:"rgba(22,22,31,0.95)", width:"fit-content" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background:tab===t.id?"#6C5CE7":"transparent", color:tab===t.id?"#FFFFFF":"rgba(255,255,255,0.7)", fontWeight:tab===t.id?700:400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab==="emergency" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl space-y-3 glow-surface" style={GLASS}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF", marginBottom:12 }}>Vital Information</h3>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background:"rgba(108,92,231,0.08)", border:"1px solid rgba(108,92,231,0.2)" }}>
              <span style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Blood Type</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#6C5CE7", fontWeight:700 }}>{emergencyInfo.bloodType}</span>
            </div>
            <Field label="Insurance Carrier" value={emergencyInfo.insurance.carrier}/>
            <Field label="Policy Number" value={emergencyInfo.insurance.policyNum}/>
            <div className="mt-2">
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[{label:"DNR on File",active:emergencyInfo.dnr},{label:"Organ Donor",active:emergencyInfo.organDonor},{label:"Advance Directive",active:emergencyInfo.advanceDirective}].map(b=>(
                <span key={b.label} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background:b.active?"rgba(72,187,120,0.12)":"rgba(107,114,128,0.12)", color:b.active?"#48BB78":"rgba(255,255,255,0.7)" }}>
                  {b.active?"✓":"✗"} {b.label}
                </span>
              ))}
            </div>
          </div>
          <div className="p-6 rounded-2xl space-y-3 glow-surface" style={GLASS}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF", marginBottom:12 }}>Primary Physician & Hospital</h3>
            <Field label="Primary Care Physician" value={emergencyInfo.primaryDoctor.name}/>
            <Field label="Doctor Phone" value={emergencyInfo.primaryDoctor.phone}/>
            <Field label="Doctor Address" value={emergencyInfo.primaryDoctor.address}/>
            <Field label="Preferred Hospital" value={emergencyInfo.hospital.name}/>
            <Field label="Hospital Phone" value={emergencyInfo.hospital.phone}/>
          </div>
          <div className="p-6 rounded-2xl md:col-span-2 glow-surface" style={GLASS}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#FFFFFF", marginBottom:12 }}>Active Medical Conditions</h3>
            <div className="flex flex-wrap gap-2">
              {emergencyInfo.conditions.map(c=>(
                <span key={c} className="px-3 py-2 rounded-xl text-sm" style={{ background:"rgba(108,92,231,0.06)", color:"rgba(255,255,255,0.8)", border:"1px solid rgba(108,92,231,0.12)" }}>
                  <Heart size={11} color="#6C5CE7" style={{ display:"inline", marginRight:6 }}/>{c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="allergies" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={()=>setShowAddAllergy(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", fontWeight:700, fontSize:13, boxShadow:"0 0 20px rgba(108,92,231,0.3)" }}>
              <Plus size={14}/> Add Allergy
            </button>
          </div>
          {allergies.length===0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><AlertTriangle size={28} color="rgba(108,92,231,0.2)" style={{ margin:"0 auto 12px" }}/><div style={{ color:"rgba(255,255,255,0.65)" }}>No allergies recorded.</div></div>}
          {allergies.map(a=>{
            const s = sevStyle[a.severity];
            return (
              <div key={a.id} className="p-5 rounded-2xl glow-surface" style={GLASS}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ color:"#FFFFFF", fontSize:15, fontWeight:500 }}>{a.allergen}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:s.bg, color:s.color, ...MONO, fontSize:9 }}>{s.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background:"rgba(108,92,231,0.06)", color:"rgba(255,255,255,0.7)" }}>{a.type}</span>
                    </div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Reaction: {a.reaction}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:3, ...MONO }}>Diagnosed: {a.diagnosed}</div>
                  </div>
                  <button onClick={()=>removeAllergy(a.id)} style={{ color:"#FC8181" }}><Trash2 size={14}/></button>
                </div>
              </div>
            );
          })}
          {showAddAllergy && <AddAllergyModal onClose={()=>setShowAddAllergy(false)} onAdd={addAllergy}/>}
        </div>
      )}

      {tab==="medications" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={()=>setShowAddMed(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", fontWeight:700, fontSize:13, boxShadow:"0 0 20px rgba(108,92,231,0.3)" }}>
              <Plus size={14}/> Add Medication
            </button>
          </div>
          {medications.length===0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><Pill size={28} color="rgba(108,92,231,0.2)" style={{ margin:"0 auto 12px" }}/><div style={{ color:"rgba(255,255,255,0.65)" }}>No medications recorded.</div></div>}
          {medications.map(m=>(
            <div key={m.id} className="p-5 rounded-2xl glow-surface" style={GLASS}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Pill size={15} color="#6C5CE7"/>
                    <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>{m.name}</span>
                    <span style={{ color:"#6C5CE7", ...MONO, fontSize:13, fontWeight:700 }}>{m.dose}</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2">
                    {[{l:"Frequency",v:m.frequency},{l:"Condition",v:m.condition},{l:"Prescriber",v:m.prescriber},{l:"Pharmacy",v:m.pharmacy},{l:"Next Refill",v:m.refillDate}].map(f=>(
                      <div key={f.l} className="px-3 py-2 rounded-xl" style={{ background:"rgba(108,92,231,0.04)" }}>
                        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:9, ...MONO, marginBottom:2 }}>{f.l.toUpperCase()}</div>
                        <div style={{ color:"#FFFFFF", fontSize:12 }}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={()=>removeMedication(m.id)} style={{ color:"#FC8181" }}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
          {showAddMed && <AddMedModal onClose={()=>setShowAddMed(false)} onAdd={addMedication}/>}
        </div>
      )}
    </div>
  );
}
