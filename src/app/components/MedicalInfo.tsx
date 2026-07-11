import React, { useState } from "react";
import { Heart, AlertTriangle, Pill, Phone, Plus, Trash2, X, Pencil, Check, Building2, Stethoscope, ShieldCheck, Droplet } from "lucide-react";
import { useDemo, type Allergy, type Medication } from "../context/DemoContext";
import { toast } from "sonner";
import { AttachDocumentField } from "./AttachDocumentField";
import { TextField, SelectField, InfoField, ToggleChip } from "./ui/FormControls";

const CARD: React.CSSProperties = { background: "#101728", border: "1px solid rgba(58,91,217,0.14)" };
const GLASS: React.CSSProperties = { background: "#101728", border: "1px solid rgba(58,91,217,0.16)" };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(58,91,217,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(58,91,217,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
type Tab = "emergency" | "allergies" | "medications";

const sevStyle = {
  severe:   { bg: "rgba(229,62,62,0.12)",  color: "#FC8181", label: "SEVERE" },
  moderate: { bg: "rgba(246,173,85,0.12)", color: "#F6AD55", label: "MODERATE" },
  mild:     { bg: "rgba(72,187,120,0.12)", color: "#48BB78", label: "MILD" },
};

type EmergencyInfo = {
  bloodType: string; height: string; weight: string; primaryLanguage: string; codeStatus: string;
  dnr: boolean; organDonor: boolean; advanceDirective: boolean;
  conditions: string[];
  primaryDoctor: { name: string; specialty: string; phone: string; address: string };
  hospital: { name: string; phone: string };
  pharmacy: { name: string; phone: string };
  insurance: { carrier: string; policyNum: string; groupNum: string; memberId: string };
};

const initialEmergency: EmergencyInfo = {
  bloodType: "O+", height: `5'11"`, weight: "182 lb", primaryLanguage: "English", codeStatus: "Full Code",
  dnr: true, organDonor: true, advanceDirective: true,
  conditions: ["Type 2 Diabetes (diagnosed 2019)", "Hypertension (controlled)", "Mild sleep apnea"],
  primaryDoctor: { name: "Dr. Karen Fields, MD", specialty: "Internal Medicine", phone: "(916) 555-0182", address: "4200 Medical Center Dr, Sacramento, CA" },
  hospital: { name: "UC Davis Medical Center", phone: "(916) 734-2011" },
  pharmacy: { name: "CVS Pharmacy — Elk Grove", phone: "(916) 555-0311" },
  insurance: { carrier: "Blue Cross Blue Shield", policyNum: "BCBS-X29841-CA", groupNum: "GRP-88213", memberId: "MEM-449201" },
};

const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map(v => ({ value: v, label: v }));
const codeOptions = ["Full Code", "DNR", "DNI", "DNR / DNI", "Comfort Care Only"].map(v => ({ value: v, label: v }));

function AddAllergyModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: Omit<Allergy, "id">) => Promise<void> }) {
  const [form, setForm] = useState({ allergen: "", severity: "mild" as Allergy["severity"], reaction: "", type: "food", diagnosed: new Date().getFullYear().toString() });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!form.allergen) { toast.error("Allergen name required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#FFFFFF" }}>Add Allergy</h3><button onClick={onClose} style={{ color: "#8A97B8" }}><X size={15} /></button></div>
        <div className="space-y-3.5">
          <TextField label="Allergen Name" value={form.allergen} onChange={set("allergen")} placeholder="e.g. Penicillin, Shellfish" required icon={<AlertTriangle size={13} />} />
          <TextField label="Reaction" value={form.reaction} onChange={set("reaction")} placeholder="e.g. Anaphylaxis, Hives" />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Severity" value={form.severity} onChange={v => set("severity")(v)} options={[{ value: "mild", label: "Mild" }, { value: "moderate", label: "Moderate" }, { value: "severe", label: "Severe" }]} />
            <SelectField label="Type" value={form.type} onChange={set("type")} options={[{ value: "food", label: "Food" }, { value: "medication", label: "Medication" }, { value: "environmental", label: "Environmental" }]} />
          </div>
          <TextField label="Year Diagnosed" value={form.diagnosed} onChange={set("diagnosed")} placeholder="2015" />
          <AttachDocumentField value={null} onChange={doc => { if (doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (allergy test, prescription)" />
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm fpd-btn-lift" style={{ background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color: "#FFFFFF", opacity: loading ? 0.7 : 1 }}>{loading ? "Saving..." : "Save Allergy"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(58,91,217,0.06)", color: "#8A97B8" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddMedModal({ onClose, onAdd }: { onClose: () => void; onAdd: (m: Omit<Medication, "id">) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", dose: "", frequency: "", condition: "", prescriber: "", pharmacy: "", refillDate: "" });
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!form.name || !form.dose) { toast.error("Medication name and dose required"); return; }
    setLoading(true);
    await onAdd(form);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-5"><h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "#FFFFFF" }}>Add Medication</h3><button onClick={onClose} style={{ color: "#8A97B8" }}><X size={15} /></button></div>
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Medication Name" value={form.name} onChange={set("name")} placeholder="e.g. Metformin" required icon={<Pill size={13} />} />
            <TextField label="Dose" value={form.dose} onChange={set("dose")} placeholder="e.g. 1000mg" required />
          </div>
          <TextField label="Frequency" value={form.frequency} onChange={set("frequency")} placeholder="e.g. Twice daily with meals" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Condition Treated" value={form.condition} onChange={set("condition")} placeholder="e.g. Type 2 Diabetes" />
            <TextField label="Prescriber" value={form.prescriber} onChange={set("prescriber")} placeholder="e.g. Dr. Karen Fields" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Pharmacy" value={form.pharmacy} onChange={set("pharmacy")} placeholder="e.g. CVS Pharmacy" />
            <TextField label="Next Refill Date" value={form.refillDate} onChange={set("refillDate")} placeholder="e.g. Jul 1, 2026" />
          </div>
          <AttachDocumentField value={null} onChange={doc => { if (doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (prescription, pharmacy receipt)" />
          <div className="flex gap-3 pt-1">
            <button onClick={submit} disabled={loading} className="flex-1 py-2.5 rounded-xl font-semibold text-sm fpd-btn-lift" style={{ background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color: "#FFFFFF", opacity: loading ? 0.7 : 1 }}>{loading ? "Saving..." : "Save Medication"}</button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(58,91,217,0.06)", color: "#8A97B8" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, span }: { title: string; icon: React.ReactNode; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`p-6 rounded-2xl glow-surface ${span ? "md:col-span-2" : ""}`} style={CARD}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: "rgba(58,91,217,0.12)", color: "#5B7BF5" }}>{icon}</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#FFFFFF" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function MedicalInfo() {
  const { allergies, medications, addAllergy, removeAllergy, addMedication, removeMedication } = useDemo();
  const [tab, setTab] = useState<Tab>("emergency");
  const [showAddAllergy, setShowAddAllergy] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);

  const [info, setInfo] = useState<EmergencyInfo>(initialEmergency);
  const [draft, setDraft] = useState<EmergencyInfo>(initialEmergency);
  const [editing, setEditing] = useState(false);
  const [newCondition, setNewCondition] = useState("");

  const startEdit = () => { setDraft(info); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setNewCondition(""); };
  const saveEdit = () => { setInfo(draft); setEditing(false); setNewCondition(""); toast.success("Emergency information updated"); };
  const d = editing ? draft : info;
  const setD = (patch: Partial<EmergencyInfo>) => setDraft(p => ({ ...p, ...patch }));
  const setNested = <K extends "primaryDoctor" | "hospital" | "pharmacy" | "insurance">(k: K, patch: Partial<EmergencyInfo[K]>) =>
    setDraft(p => ({ ...p, [k]: { ...p[k], ...patch } }));
  const addCondition = () => { if (!newCondition.trim()) return; setDraft(p => ({ ...p, conditions: [...p.conditions, newCondition.trim()] })); setNewCondition(""); };
  const removeCondition = (i: number) => setDraft(p => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));

  const tabs = [
    { id: "emergency" as Tab, label: "Emergency Info", icon: <Phone size={13} /> },
    { id: "allergies" as Tab, label: `Allergies (${allergies.length})`, icon: <AlertTriangle size={13} /> },
    { id: "medications" as Tab, label: `Medications (${medications.length})`, icon: <Pill size={13} /> },
  ];

  return (
    <div className="p-6 space-y-5 relative" style={{ maxWidth: 1100, ...GRID }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#FFFFFF", marginBottom: 4 }}>Medical Information</h1>
          <p style={{ color: "#8A97B8", fontSize: 13, maxWidth: "60ch" }}>Critical medical data accessible to verified legacy contacts and first responders.</p>
        </div>
        {tab === "emergency" && (
          editing ? (
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold fpd-btn-lift" style={{ background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color: "#FFFFFF" }}><Check size={14} /> Save Changes</button>
              <button onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(58,91,217,0.08)", color: "#8A97B8", border: "1px solid rgba(58,91,217,0.2)" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "rgba(58,91,217,0.1)", color: "#8AA0FF", border: "1px solid rgba(58,91,217,0.28)" }}><Pencil size={13} /> Edit Info</button>
          )
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#0A1020", width: "fit-content", border: "1px solid rgba(58,91,217,0.12)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background: tab === t.id ? "linear-gradient(135deg,#3A5BD9,#5B7BF5)" : "transparent", color: tab === t.id ? "#FFFFFF" : "#8A97B8", fontWeight: tab === t.id ? 700 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "emergency" && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Vital information */}
          <SectionCard title="Vital Information" icon={<Droplet size={16} />}>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-3" style={{ background: "rgba(58,91,217,0.08)", border: "1px solid rgba(58,91,217,0.2)" }}>
              <span style={{ color: "#B8C8E0", fontSize: 13 }}>Blood Type</span>
              {editing
                ? <div style={{ width: 130 }}><SelectField label="" value={d.bloodType} onChange={v => setD({ bloodType: v })} options={bloodOptions} /></div>
                : <span style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "#5B7BF5", fontWeight: 700 }}>{d.bloodType}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {editing ? <>
                <TextField label="Height" value={d.height} onChange={v => setD({ height: v })} placeholder={`5'11"`} />
                <TextField label="Weight" value={d.weight} onChange={v => setD({ weight: v })} placeholder="182 lb" />
                <TextField label="Primary Language" value={d.primaryLanguage} onChange={v => setD({ primaryLanguage: v })} placeholder="English" />
                <SelectField label="Code Status" value={d.codeStatus} onChange={v => setD({ codeStatus: v })} options={codeOptions} />
              </> : <>
                <InfoField label="Height" value={d.height} />
                <InfoField label="Weight" value={d.weight} />
                <InfoField label="Primary Language" value={d.primaryLanguage} />
                <InfoField label="Code Status" value={d.codeStatus} />
              </>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <ToggleChip label="DNR on File" active={d.dnr} onToggle={editing ? () => setD({ dnr: !d.dnr }) : undefined} />
              <ToggleChip label="Organ Donor" active={d.organDonor} onToggle={editing ? () => setD({ organDonor: !d.organDonor }) : undefined} />
              <ToggleChip label="Advance Directive" active={d.advanceDirective} onToggle={editing ? () => setD({ advanceDirective: !d.advanceDirective }) : undefined} />
            </div>
          </SectionCard>

          {/* Insurance */}
          <SectionCard title="Health Insurance" icon={<ShieldCheck size={16} />}>
            <div className="space-y-3">
              {editing ? <>
                <TextField label="Carrier" value={d.insurance.carrier} onChange={v => setNested("insurance", { carrier: v })} placeholder="Blue Cross Blue Shield" />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Policy Number" value={d.insurance.policyNum} onChange={v => setNested("insurance", { policyNum: v })} placeholder="BCBS-XXXXX" />
                  <TextField label="Group Number" value={d.insurance.groupNum} onChange={v => setNested("insurance", { groupNum: v })} placeholder="GRP-XXXXX" />
                </div>
                <TextField label="Member ID" value={d.insurance.memberId} onChange={v => setNested("insurance", { memberId: v })} placeholder="MEM-XXXXX" />
              </> : <>
                <InfoField label="Carrier" value={d.insurance.carrier} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Policy Number" value={d.insurance.policyNum} mono />
                  <InfoField label="Group Number" value={d.insurance.groupNum} mono />
                </div>
                <InfoField label="Member ID" value={d.insurance.memberId} mono />
              </>}
            </div>
          </SectionCard>

          {/* Physician */}
          <SectionCard title="Primary Physician" icon={<Stethoscope size={16} />}>
            <div className="space-y-3">
              {editing ? <>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Physician Name" value={d.primaryDoctor.name} onChange={v => setNested("primaryDoctor", { name: v })} placeholder="Dr. Karen Fields, MD" />
                  <TextField label="Specialty" value={d.primaryDoctor.specialty} onChange={v => setNested("primaryDoctor", { specialty: v })} placeholder="Internal Medicine" />
                </div>
                <TextField label="Phone" value={d.primaryDoctor.phone} onChange={v => setNested("primaryDoctor", { phone: v })} placeholder="(916) 555-0182" icon={<Phone size={13} />} />
                <TextField label="Office Address" value={d.primaryDoctor.address} onChange={v => setNested("primaryDoctor", { address: v })} placeholder="Street, City, State" />
              </> : <>
                <div className="grid grid-cols-2 gap-3">
                  <InfoField label="Physician Name" value={d.primaryDoctor.name} />
                  <InfoField label="Specialty" value={d.primaryDoctor.specialty} />
                </div>
                <InfoField label="Phone" value={d.primaryDoctor.phone} icon={<Phone size={12} color="#5B7BF5" />} mono />
                <InfoField label="Office Address" value={d.primaryDoctor.address} />
              </>}
            </div>
          </SectionCard>

          {/* Hospital & pharmacy */}
          <SectionCard title="Hospital & Pharmacy" icon={<Building2 size={16} />}>
            <div className="space-y-3">
              {editing ? <>
                <TextField label="Preferred Hospital" value={d.hospital.name} onChange={v => setNested("hospital", { name: v })} placeholder="UC Davis Medical Center" />
                <TextField label="Hospital Phone" value={d.hospital.phone} onChange={v => setNested("hospital", { phone: v })} placeholder="(916) 734-2011" icon={<Phone size={13} />} />
                <TextField label="Preferred Pharmacy" value={d.pharmacy.name} onChange={v => setNested("pharmacy", { name: v })} placeholder="CVS Pharmacy" />
                <TextField label="Pharmacy Phone" value={d.pharmacy.phone} onChange={v => setNested("pharmacy", { phone: v })} placeholder="(916) 555-0311" icon={<Phone size={13} />} />
              </> : <>
                <InfoField label="Preferred Hospital" value={d.hospital.name} />
                <InfoField label="Hospital Phone" value={d.hospital.phone} icon={<Phone size={12} color="#5B7BF5" />} mono />
                <InfoField label="Preferred Pharmacy" value={d.pharmacy.name} />
                <InfoField label="Pharmacy Phone" value={d.pharmacy.phone} icon={<Phone size={12} color="#5B7BF5" />} mono />
              </>}
            </div>
          </SectionCard>

          {/* Conditions */}
          <SectionCard title="Active Medical Conditions" icon={<Heart size={16} />} span>
            <div className="flex flex-wrap gap-2">
              {d.conditions.map((c, i) => (
                <span key={`${c}-${i}`} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: "rgba(58,91,217,0.06)", color: "#D6E0F5", border: "1px solid rgba(58,91,217,0.14)" }}>
                  <Heart size={11} color="#5B7BF5" />{c}
                  {editing && <button onClick={() => removeCondition(i)} style={{ color: "#FC8181", marginLeft: 2 }}><X size={12} /></button>}
                </span>
              ))}
              {d.conditions.length === 0 && <span style={{ color: "#5A6A88", fontSize: 13 }}>No conditions recorded.</span>}
            </div>
            {editing && (
              <div className="flex gap-2 mt-4 max-w-md">
                <input value={newCondition} onChange={e => setNewCondition(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCondition(); }}
                  placeholder="Add a condition and press Enter" className="fpd-field" />
                <button onClick={addCondition} className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold flex-shrink-0" style={{ background: "rgba(58,91,217,0.12)", color: "#8AA0FF", border: "1px solid rgba(58,91,217,0.28)" }}><Plus size={14} /> Add</button>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "allergies" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddAllergy(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl fpd-btn-lift"
              style={{ background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color: "#FFFFFF", fontWeight: 700, fontSize: 13, boxShadow: "0 0 20px rgba(58,91,217,0.3)" }}>
              <Plus size={14} /> Add Allergy
            </button>
          </div>
          {allergies.length === 0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><AlertTriangle size={28} color="rgba(58,91,217,0.35)" style={{ margin: "0 auto 12px" }} /><div style={{ color: "#8A97B8" }}>No allergies recorded.</div></div>}
          {allergies.map(a => {
            const s = sevStyle[a.severity];
            return (
              <div key={a.id} className="p-5 rounded-2xl glow-surface fpd-hover-lift" style={CARD}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span style={{ color: "#FFFFFF", fontSize: 15, fontWeight: 500 }}>{a.allergen}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: s.bg, color: s.color, ...MONO, fontSize: 9 }}>{s.label}</span>
                      <span className="px-2 py-0.5 rounded text-xs capitalize" style={{ background: "rgba(58,91,217,0.06)", color: "#8A97B8" }}>{a.type}</span>
                    </div>
                    <div style={{ color: "#B8C8E0", fontSize: 13 }}>Reaction: {a.reaction}</div>
                    <div style={{ color: "#8A97B8", fontSize: 11, marginTop: 3, ...MONO }}>Diagnosed: {a.diagnosed}</div>
                  </div>
                  <button onClick={() => removeAllergy(a.id)} style={{ color: "#FC8181" }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
          {showAddAllergy && <AddAllergyModal onClose={() => setShowAddAllergy(false)} onAdd={addAllergy} />}
        </div>
      )}

      {tab === "medications" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowAddMed(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl fpd-btn-lift"
              style={{ background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color: "#FFFFFF", fontWeight: 700, fontSize: 13, boxShadow: "0 0 20px rgba(58,91,217,0.3)" }}>
              <Plus size={14} /> Add Medication
            </button>
          </div>
          {medications.length === 0 && <div className="py-12 text-center rounded-2xl glow-surface" style={GLASS}><Pill size={28} color="rgba(58,91,217,0.35)" style={{ margin: "0 auto 12px" }} /><div style={{ color: "#8A97B8" }}>No medications recorded.</div></div>}
          {medications.map(m => (
            <div key={m.id} className="p-5 rounded-2xl glow-surface fpd-hover-lift" style={CARD}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Pill size={15} color="#5B7BF5" />
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "#FFFFFF" }}>{m.name}</span>
                    <span style={{ color: "#5B7BF5", ...MONO, fontSize: 13, fontWeight: 700 }}>{m.dose}</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-2">
                    {[{ l: "Frequency", v: m.frequency }, { l: "Condition", v: m.condition }, { l: "Prescriber", v: m.prescriber }, { l: "Pharmacy", v: m.pharmacy }, { l: "Next Refill", v: m.refillDate }].map(f => (
                      <div key={f.l} className="px-3 py-2 rounded-xl" style={{ background: "rgba(58,91,217,0.05)", border: "1px solid rgba(58,91,217,0.10)" }}>
                        <div style={{ color: "#8A97B8", fontSize: 9, ...MONO, marginBottom: 2 }}>{f.l.toUpperCase()}</div>
                        <div style={{ color: "#FFFFFF", fontSize: 12 }}>{f.v || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeMedication(m.id)} style={{ color: "#FC8181" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {showAddMed && <AddMedModal onClose={() => setShowAddMed(false)} onAdd={addMedication} />}
        </div>
      )}
    </div>
  );
}
