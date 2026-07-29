import React, { useState } from "react";
import { Heart, AlertTriangle, Pill, Phone, Plus, Trash2, X, Pencil, Check, Building2, Stethoscope, ShieldCheck, Droplet } from "lucide-react";
import { useDemo, type Allergy, type Medication } from "../context/DemoContext";
import { toast } from "sonner";
import { AttachDocumentField } from "./AttachDocumentField";
import heroMedicalPhoto from "../../imports/medicalinfo_hero_photo.png";

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

type Tab = "emergency" | "allergies" | "medications";

const sevStyle: Record<Allergy["severity"], { bg: string; color: string; label: string }> = {
  severe:   { bg: "rgba(208,107,107,0.14)", color: NEG,  label: "SEVERE" },
  moderate: { bg: "rgba(217,165,94,0.14)",  color: WARN, label: "MODERATE" },
  mild:     { bg: "rgba(95,190,145,0.14)",  color: "#D99A6B",  label: "MILD" },
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

const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const codeOptions = ["Full Code", "DNR", "DNI", "DNR / DNI", "Comfort Care Only"];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-med so nothing else in the app is affected. */
const MED_CSS = `
.fpd-med{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-med *{box-sizing:border-box;}
.fpd-med-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-med .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-med .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-med .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-med .hbanner:hover .art{transform:scale(1.08);}
.fpd-med .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-med .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-med .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-med .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-med .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-med .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-med .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-med .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-med .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-med .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-med .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-med .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-med .hbanner{min-height:auto;} .fpd-med .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-med .hbanner h1{font-size:29px;}}

.fpd-med .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-med .card.pad{padding:28px;}
.fpd-med .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-med .sec-title{font-size:18px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:9px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-med .sec-title .tick{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* header */
.fpd-med .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-med .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-med .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}
.fpd-med .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-med .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-med .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-med .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-med .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-med .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-med .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-med .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-med .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-med .toolbar p{color:${MUTED};font-size:16px;line-height:1.6;}

/* KPI ledger */
.fpd-med .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-med .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-med .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-med .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-med .kpi-mini-txt{flex:1;min-width:0;}
.fpd-med .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-med .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-med .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-med .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-med .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:420px){.fpd-med .kpi-stack{grid-template-columns:1fr;}}

/* emergency info grid */
.fpd-med .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.fpd-med .mgrid .span2{grid-column:1 / -1;}
.fpd-med .tgrid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fpd-med .hero-tile{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.22);margin-bottom:14px;}
.fpd-med .hero-tile .hlbl{color:${SOFT};font-size:16px;}
.fpd-med .hero-tile .hval{font-family:var(--font-display);font-size:30px;color:#6FAE8B;font-weight:700;}
.fpd-med .hero-tile select{width:130px;padding:9px 11px;border-radius:99px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);}
.fpd-med .chiprow{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
@media (max-width:820px){.fpd-med .mgrid{grid-template-columns:1fr;}.fpd-med .tgrid2{grid-template-columns:1fr;}}

/* tiles (view mode) */
.fpd-med .tile{padding:12px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-med .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-med .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;display:flex;align-items:center;gap:7px;}

/* fields (edit mode) */
.fpd-med .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-med .field input,.fpd-med .field select,.fpd-med .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-med .field input::placeholder,.fpd-med .field textarea::placeholder{color:${FAINT};}
.fpd-med .field input:focus,.fpd-med .field select:focus,.fpd-med .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}

/* chips (toggle pills + filter-style) */
.fpd-med .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:99px;font-size:15px;font-weight:600;cursor:default;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-med .chip.off{opacity:.6;}
button.chip{cursor:pointer;}
button.chip:hover{opacity:.85;}

/* condition tags */
.fpd-med .condrow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-med .condtag{display:inline-flex;align-items:center;gap:8px;padding:9px 13px;border-radius:16px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.14);color:${SOFT};font-size:16px;}
.fpd-med .condtag button{background:none;border:none;color:${NEG};cursor:pointer;display:flex;margin-left:2px;}
.fpd-med .addcond{display:flex;gap:8px;margin-top:14px;max-width:420px;}
.fpd-med .addcond input{flex:1;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);}
.fpd-med .addcond input::placeholder{color:${FAINT};}

/* allergy / medication record cards */
.fpd-med .rlist{display:flex;flex-direction:column;gap:14px;}
.fpd-med .rtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-med .rico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-med .rtitle{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.fpd-med .rsub{color:${MUTED};font-size:15.5px;}
.fpd-med .rbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-med .rtag{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:#6FAE8B;text-transform:uppercase;}
.fpd-med .rgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-med .rgrid .tile{border:none;border-radius:0;background:transparent;}
.fpd-med .rgrid .tile:nth-child(3n+2),.fpd-med .rgrid .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-med .rgrid .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-med .rdel{background:none;border:none;color:${MUTED};cursor:pointer;padding:6px;display:flex;flex-shrink:0;transition:color .16s;}
.fpd-med .rdel:hover{color:${NEG};}
@media (max-width:760px){
.fpd-med .rgrid{grid-template-columns:1fr;}
.fpd-med .rgrid .tile:nth-child(3n+2),.fpd-med .rgrid .tile:nth-child(3n){border-left:none;}
.fpd-med .rgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

/* empty state */
.fpd-med .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 12px;}
.fpd-med .empty .ei{width:48px;height:48px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:#6FAE8B;margin-bottom:13px;}
.fpd-med .empty .et{color:${SOFT};font-size:17.5px;}

/* modal */
.fpd-med .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-med .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-med .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-med .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-med .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-med .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-med .modal-body .row2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fpd-med .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-med .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-med .modal-foot .save:hover{filter:brightness(1.08);}
@media (max-width:520px){.fpd-med .modal-body .row2{grid-template-columns:1fr;}}
`;

/* ── small local field helpers (replace the old FormControls presentation with the new scoped classes) ── */
function FField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function VTile({ label, value, danger }: { label: string; value?: string; danger?: boolean }) {
  return (
    <div className="tile">
      <div className="tk">{label}</div>
      <div className="tv" style={danger ? { color: NEG } : undefined}>{value || "—"}</div>
    </div>
  );
}
function TChip({ label, active, onToggle }: { label: string; active: boolean; onToggle?: () => void }) {
  const Tag: any = onToggle ? "button" : "span";
  return (
    <Tag
      onClick={onToggle}
      className={`chip ${active ? "" : "off"}`}
      style={{
        background: active ? "rgba(95,190,145,0.14)" : "rgba(255,255,255,0.04)",
        color: active ? "#D99A6B" : MUTED,
        borderColor: active ? "rgba(95,190,145,0.35)" : "rgba(255,255,255,0.09)",
      }}
    >
      {active ? <Check size={12} /> : <X size={12} />} {label}
    </Tag>
  );
}

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
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal">
        <div className="modal-head">
          <h3>Add Allergy</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <FField label="ALLERGEN NAME *" value={form.allergen} onChange={set("allergen")} placeholder="e.g. Penicillin, Shellfish" />
          <FField label="REACTION" value={form.reaction} onChange={set("reaction")} placeholder="e.g. Anaphylaxis, Hives" />
          <div className="row2">
            <FSelect label="SEVERITY" value={form.severity} onChange={v => set("severity")(v)} options={["mild", "moderate", "severe"]} />
            <FSelect label="TYPE" value={form.type} onChange={set("type")} options={["food", "medication", "environmental"]} />
          </div>
          <FField label="YEAR DIAGNOSED" value={form.diagnosed} onChange={set("diagnosed")} placeholder="2015" />
          <AttachDocumentField value={null} onChange={doc => { if (doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (allergy test, prescription)" />
        </div>
        <div className="modal-foot">
          <button className="save" onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save Allergy"}</button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
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
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal">
        <div className="modal-head">
          <h3>Add Medication</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="row2">
            <FField label="MEDICATION NAME *" value={form.name} onChange={set("name")} placeholder="e.g. Metformin" />
            <FField label="DOSE *" value={form.dose} onChange={set("dose")} placeholder="e.g. 1000mg" />
          </div>
          <FField label="FREQUENCY" value={form.frequency} onChange={set("frequency")} placeholder="e.g. Twice daily with meals" />
          <div className="row2">
            <FField label="CONDITION TREATED" value={form.condition} onChange={set("condition")} placeholder="e.g. Type 2 Diabetes" />
            <FField label="PRESCRIBER" value={form.prescriber} onChange={set("prescriber")} placeholder="e.g. Dr. Karen Fields" />
          </div>
          <div className="row2">
            <FField label="PHARMACY" value={form.pharmacy} onChange={set("pharmacy")} placeholder="e.g. CVS Pharmacy" />
            <FField label="NEXT REFILL DATE" value={form.refillDate} onChange={set("refillDate")} placeholder="e.g. Jul 1, 2026" />
          </div>
          <AttachDocumentField value={null} onChange={doc => { if (doc) toast.success(`"${doc}" attached`); }} folder="medical" sectionId="medical-info" sectionLabel="Medical Info" label="Attach Document (prescription, pharmacy receipt)" />
        </div>
        <div className="modal-foot">
          <button className="save" onClick={submit} disabled={loading}>{loading ? "Saving..." : "Save Medication"}</button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
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
    { id: "emergency" as Tab, label: "Emergency Info", icon: <Phone size={14} /> },
    { id: "allergies" as Tab, label: `Allergies (${allergies.length})`, icon: <AlertTriangle size={14} /> },
    { id: "medications" as Tab, label: `Medications (${medications.length})`, icon: <Pill size={14} /> },
  ];

  const severeCount = allergies.filter(a => a.severity === "severe").length;
  const kpis = [
    { label: "Blood Type", value: info.bloodType, sub: info.codeStatus, icon: <Droplet size={14} />, dot: ACCENT2 },
    { label: "Allergies", value: String(allergies.length), sub: severeCount > 0 ? `${severeCount} severe` : "None marked severe", icon: <AlertTriangle size={14} />, dot: severeCount > 0 ? NEG : POS },
    { label: "Medications", value: String(medications.length), sub: "Active prescriptions", icon: <Pill size={14} />, dot: ACCENT2 },
    { label: "Active Conditions", value: String(info.conditions.length), sub: "On file", icon: <Heart size={14} />, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-med">
      <style dangerouslySetInnerHTML={{ __html: MED_CSS }} />
      <div className="fpd-med-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroMedicalPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">For Emergencies, Instantly</span>
            <h1>The medical facts <span className="accent">that matter, at a glance.</span></h1>
            <p>Blood type, allergies, medications, and conditions — ready for first responders and the people you trust, the moment they need it.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setShowAddMed(true)}>
                <Pill size={15}/> Add Medication
              </button>
              <button className="hbtn ghost" onClick={() => setShowAddAllergy(true)}>
                <AlertTriangle size={15}/> Add Allergy
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Heart size={12} /> Health &amp; Safety</div>
            <h1 className="pg-h1">Medical Information</h1>
            <div className="pg-sub">Critical medical data accessible to verified legacy contacts and first responders.</div>
          </div>
          {tab === "emergency" && (
            editing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" onClick={saveEdit}><Check size={14} /> Save Changes</button>
                <button className="btn-sec" onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <button className="btn-ghost" onClick={startEdit}><Pencil size={13} /> Edit Info</button>
            )
          )}
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
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Emergency Info ── */}
        {tab === "emergency" && (
          <div className="mgrid">
            {/* Vital information */}
            <div className="card pad">
              <h3 className="sec-title"><span className="tick" />Vital Information</h3>
              <div className="hero-tile">
                <span className="hlbl">Blood Type</span>
                {editing
                  ? <select value={d.bloodType} onChange={e => setD({ bloodType: e.target.value })}>{bloodOptions.map(b => <option key={b} value={b}>{b}</option>)}</select>
                  : <span className="hval">{d.bloodType}</span>}
              </div>
              <div className="tgrid2">
                {editing ? <>
                  <FField label="HEIGHT" value={d.height} onChange={v => setD({ height: v })} placeholder={`5'11"`} />
                  <FField label="WEIGHT" value={d.weight} onChange={v => setD({ weight: v })} placeholder="182 lb" />
                  <FField label="PRIMARY LANGUAGE" value={d.primaryLanguage} onChange={v => setD({ primaryLanguage: v })} placeholder="English" />
                  <FSelect label="CODE STATUS" value={d.codeStatus} onChange={v => setD({ codeStatus: v })} options={codeOptions} />
                </> : <>
                  <VTile label="Height" value={d.height} />
                  <VTile label="Weight" value={d.weight} />
                  <VTile label="Primary Language" value={d.primaryLanguage} />
                  <VTile label="Code Status" value={d.codeStatus} />
                </>}
              </div>
              <div className="chiprow">
                <TChip label="DNR on File" active={d.dnr} onToggle={editing ? () => setD({ dnr: !d.dnr }) : undefined} />
                <TChip label="Organ Donor" active={d.organDonor} onToggle={editing ? () => setD({ organDonor: !d.organDonor }) : undefined} />
                <TChip label="Advance Directive" active={d.advanceDirective} onToggle={editing ? () => setD({ advanceDirective: !d.advanceDirective }) : undefined} />
              </div>
            </div>

            {/* Insurance */}
            <div className="card pad">
              <h3 className="sec-title"><span className="tick" />Health Insurance</h3>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FField label="CARRIER" value={d.insurance.carrier} onChange={v => setNested("insurance", { carrier: v })} placeholder="Blue Cross Blue Shield" />
                  <div className="row2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FField label="POLICY NUMBER" value={d.insurance.policyNum} onChange={v => setNested("insurance", { policyNum: v })} placeholder="BCBS-XXXXX" />
                    <FField label="GROUP NUMBER" value={d.insurance.groupNum} onChange={v => setNested("insurance", { groupNum: v })} placeholder="GRP-XXXXX" />
                  </div>
                  <FField label="MEMBER ID" value={d.insurance.memberId} onChange={v => setNested("insurance", { memberId: v })} placeholder="MEM-XXXXX" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <VTile label="Carrier" value={d.insurance.carrier} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <VTile label="Policy Number" value={d.insurance.policyNum} />
                    <VTile label="Group Number" value={d.insurance.groupNum} />
                  </div>
                  <VTile label="Member ID" value={d.insurance.memberId} />
                </div>
              )}
            </div>

            {/* Physician */}
            <div className="card pad">
              <h3 className="sec-title"><span className="tick" />Primary Physician</h3>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FField label="PHYSICIAN NAME" value={d.primaryDoctor.name} onChange={v => setNested("primaryDoctor", { name: v })} placeholder="Dr. Karen Fields, MD" />
                    <FField label="SPECIALTY" value={d.primaryDoctor.specialty} onChange={v => setNested("primaryDoctor", { specialty: v })} placeholder="Internal Medicine" />
                  </div>
                  <FField label="PHONE" value={d.primaryDoctor.phone} onChange={v => setNested("primaryDoctor", { phone: v })} placeholder="(916) 555-0182" />
                  <FField label="OFFICE ADDRESS" value={d.primaryDoctor.address} onChange={v => setNested("primaryDoctor", { address: v })} placeholder="Street, City, State" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <VTile label="Physician Name" value={d.primaryDoctor.name} />
                    <VTile label="Specialty" value={d.primaryDoctor.specialty} />
                  </div>
                  <VTile label="Phone" value={d.primaryDoctor.phone} />
                  <VTile label="Office Address" value={d.primaryDoctor.address} />
                </div>
              )}
            </div>

            {/* Hospital & pharmacy */}
            <div className="card pad">
              <h3 className="sec-title"><span className="tick" />Hospital &amp; Pharmacy</h3>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FField label="PREFERRED HOSPITAL" value={d.hospital.name} onChange={v => setNested("hospital", { name: v })} placeholder="UC Davis Medical Center" />
                  <FField label="HOSPITAL PHONE" value={d.hospital.phone} onChange={v => setNested("hospital", { phone: v })} placeholder="(916) 734-2011" />
                  <FField label="PREFERRED PHARMACY" value={d.pharmacy.name} onChange={v => setNested("pharmacy", { name: v })} placeholder="CVS Pharmacy" />
                  <FField label="PHARMACY PHONE" value={d.pharmacy.phone} onChange={v => setNested("pharmacy", { phone: v })} placeholder="(916) 555-0311" />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <VTile label="Preferred Hospital" value={d.hospital.name} />
                  <VTile label="Hospital Phone" value={d.hospital.phone} />
                  <VTile label="Preferred Pharmacy" value={d.pharmacy.name} />
                  <VTile label="Pharmacy Phone" value={d.pharmacy.phone} />
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="card pad span2">
              <h3 className="sec-title"><span className="tick" />Active Medical Conditions</h3>
              <div className="condrow">
                {d.conditions.map((c, i) => (
                  <span key={`${c}-${i}`} className="condtag">
                    <Heart size={11} color="#FFFFFF" />{c}
                    {editing && <button onClick={() => removeCondition(i)}><X size={12} /></button>}
                  </span>
                ))}
                {d.conditions.length === 0 && <span style={{ color: FAINT, fontSize: 16 }}>No conditions recorded.</span>}
              </div>
              {editing && (
                <div className="addcond">
                  <input value={newCondition} onChange={e => setNewCondition(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCondition(); }}
                    placeholder="Add a condition and press Enter" />
                  <button className="btn-ghost" onClick={addCondition}><Plus size={14} /> Add</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Allergies ── */}
        {tab === "allergies" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar">
              <p>Known allergies, reactions, and severity — critical for emergency responders.</p>
              <button className="btn-primary" onClick={() => setShowAddAllergy(true)}><Plus size={14} /> Add Allergy</button>
            </div>

            {allergies.length === 0 && (
              <div className="card empty">
                <div className="ei"><AlertTriangle size={22} /></div>
                <div className="et">No allergies recorded.</div>
              </div>
            )}

            <div className="rlist">
              {allergies.map(a => {
                const s = sevStyle[a.severity];
                return (
                  <div key={a.id} className="card pad">
                    <div className="rtop">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <div className="rico"><AlertTriangle size={20} /></div>
                        <div>
                          <div className="rtitle">
                            {a.allergen}
                            <span className="rbadge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                            <span className="rtag">{a.type}</span>
                          </div>
                          <div className="rsub">Diagnosed {a.diagnosed}</div>
                        </div>
                      </div>
                      <button className="rdel" onClick={() => removeAllergy(a.id)} title="Remove allergy"><Trash2 size={16} /></button>
                    </div>
                    <div className="rgrid">
                      <div className="tile">
                        <div className="tk">Reaction</div>
                        <div className="tv">{a.reaction || "—"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {showAddAllergy && <AddAllergyModal onClose={() => setShowAddAllergy(false)} onAdd={addAllergy} />}
          </div>
        )}

        {/* ── Medications ── */}
        {tab === "medications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="toolbar">
              <p>Current prescriptions, dosages, and pharmacy information.</p>
              <button className="btn-primary" onClick={() => setShowAddMed(true)}><Plus size={14} /> Add Medication</button>
            </div>

            {medications.length === 0 && (
              <div className="card empty">
                <div className="ei"><Pill size={22} /></div>
                <div className="et">No medications recorded.</div>
              </div>
            )}

            <div className="rlist">
              {medications.map(m => (
                <div key={m.id} className="card pad">
                  <div className="rtop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div className="rico"><Pill size={20} /></div>
                      <div>
                        <div className="rtitle">{m.name} <span className="rtag">{m.dose}</span></div>
                        <div className="rsub">{m.condition || "—"}</div>
                      </div>
                    </div>
                    <button className="rdel" onClick={() => removeMedication(m.id)} title="Remove medication"><Trash2 size={16} /></button>
                  </div>
                  <div className="rgrid">
                    <div className="tile"><div className="tk">Frequency</div><div className="tv">{m.frequency || "—"}</div></div>
                    <div className="tile"><div className="tk">Prescriber</div><div className="tv">{m.prescriber || "—"}</div></div>
                    <div className="tile"><div className="tk">Pharmacy</div><div className="tv">{m.pharmacy || "—"}</div></div>
                    <div className="tile"><div className="tk">Next Refill</div><div className="tv">{m.refillDate || "—"}</div></div>
                  </div>
                </div>
              ))}
            </div>
            {showAddMed && <AddMedModal onClose={() => setShowAddMed(false)} onAdd={addMedication} />}
          </div>
        )}
      </div>
    </div>
  );
}
