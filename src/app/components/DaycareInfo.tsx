import React, { useState } from "react";
import { Baby, Plus, X, Phone, MapPin, Clock, ChevronDown, ChevronUp, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B7BF5";
const ACCENT2 = "#8AA0FF";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

interface AuthorizedPerson {
  name: string;
  relationship: string;
  phone: string;
  photoId: string;
}

interface DaycareRecord {
  id: number;
  facilityName: string;
  childName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  directorName: string;
  teacherName: string;
  teacherPhone: string;
  dropoffTime: string;
  pickupTime: string;
  days: string;
  tuition: string;
  tuitionDue: string;
  paymentMethod: string;
  allergiesOnFile: string;
  medicationsOnFile: string;
  emergencyContact: string;
  emergencyPhone: string;
  enrollDate: string;
  status: "active" | "inactive";
  notes: string;
  authorizedPickups: AuthorizedPerson[];
  documents: string[];
}

const initRecords: DaycareRecord[] = [
  {
    id: 1,
    facilityName: "Sunshine Learning Center",
    childName: "Emma Doe",
    address: "4821 Amber Oaks Drive, Sacramento, CA 95841",
    phone: "(916) 555-0291",
    email: "info@sunshinelearning.com",
    website: "sunshinelearningcenter.com",
    directorName: "Ms. Patricia Rivera",
    teacherName: "Ms. Amanda Cole",
    teacherPhone: "(916) 555-0384",
    dropoffTime: "7:30 AM",
    pickupTime: "5:30 PM",
    days: "Monday – Friday",
    tuition: "$1,450/month",
    tuitionDue: "1st of each month",
    paymentMethod: "Auto-pay — Chase checking account",
    allergiesOnFile: "Peanuts (severe — EpiPen on file), Tree nuts",
    medicationsOnFile: "EpiPen Jr. — stored in Emma's cubby and director's office",
    emergencyContact: "Sarah Johnson (mother)",
    emergencyPhone: "(916) 555-0182",
    enrollDate: "Sep 2023",
    status: "active",
    notes: "Emma is in the Butterfly Room (3–4 year olds). Nap time 1:00–2:30 PM. Bring labeled lunch and two snacks daily.",
    authorizedPickups: [
      { name: "Sarah Johnson", relationship: "Mother", phone: "(916) 555-0182", photoId: "Driver's License on file" },
      { name: "James Doe", relationship: "Father", phone: "(916) 555-0291", photoId: "Driver's License on file" },
      { name: "Margaret Thompson", relationship: "Grandmother", phone: "(916) 555-0841", photoId: "Passport on file" },
      { name: "Linda Torres", relationship: "Emergency Backup", phone: "(916) 555-0492", photoId: "State ID on file" },
    ],
    documents: ["Enrollment Agreement 2023","Immunization Records","EpiPen Authorization Form","Emergency Contact Form"],
  },
  {
    id: 2,
    facilityName: "Little Stars Academy",
    childName: "Lucas Doe",
    address: "2210 Fair Oaks Blvd, Sacramento, CA 95825",
    phone: "(916) 555-0481",
    email: "admin@littlestarsacademy.com",
    website: "littlestarsacademy.com",
    directorName: "Mr. David Park",
    teacherName: "Ms. Jennifer Lee",
    teacherPhone: "(916) 555-0572",
    dropoffTime: "8:00 AM",
    pickupTime: "4:00 PM",
    days: "Monday, Wednesday, Friday",
    tuition: "$880/month",
    tuitionDue: "15th of each month",
    paymentMethod: "Check mailed monthly",
    allergiesOnFile: "None known",
    medicationsOnFile: "None",
    emergencyContact: "Sarah Johnson (mother)",
    emergencyPhone: "(916) 555-0182",
    enrollDate: "Jan 2024",
    status: "active",
    notes: "Lucas is in the Sunshine Room (18 months – 2 years). Bring 3 changes of clothes, diapers, wipes. Sippy cup labeled with name.",
    authorizedPickups: [
      { name: "Sarah Johnson", relationship: "Mother", phone: "(916) 555-0182", photoId: "Driver's License on file" },
      { name: "James Doe", relationship: "Father", phone: "(916) 555-0291", photoId: "Driver's License on file" },
    ],
    documents: ["Enrollment Agreement 2024","Immunization Records","Emergency Contact Form"],
  },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-daycare so nothing else in the app is affected. */
const DAYCARE_CSS = `
.fpd-daycare{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,123,245,0.10),transparent 70%);}
.fpd-daycare *{box-sizing:border-box;}
.fpd-daycare-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-daycare .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-daycare .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-daycare .card.pad{padding:22px;}
.fpd-daycare .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-daycare .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-daycare .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-daycare .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-daycare .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(74,99,222,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-daycare .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-daycare .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented sub-tabs (per record) */
.fpd-daycare .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);width:fit-content;flex-wrap:wrap;}
.fpd-daycare .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-daycare .seg button.on{background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;box-shadow:0 6px 16px -8px rgba(74,99,222,0.8);}

/* record cards */
.fpd-daycare .rlist{display:flex;flex-direction:column;gap:14px;}
.fpd-daycare .rhead{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;background:none;border:none;cursor:pointer;text-align:left;}
.fpd-daycare .rico{width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,123,245,0.10);border:1px solid rgba(91,123,245,0.24);color:${ACCENT2};}
.fpd-daycare .rtitle{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;}
.fpd-daycare .rname{font-family:var(--font-display);font-size:16.5px;color:${TEXT};font-weight:600;letter-spacing:-0.01em;}
.fpd-daycare .rchild{color:${SOFT};font-size:13px;font-weight:500;margin-bottom:6px;}
.fpd-daycare .rmeta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fpd-daycare .rmeta span{display:flex;align-items:center;gap:5px;color:${MUTED};font-size:11.5px;}
.fpd-daycare .stat-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;}
.fpd-daycare .rbody{border-top:1px solid rgba(255,255,255,0.22);}
.fpd-daycare .rtabbar{padding:16px 22px 0;}
.fpd-daycare .rpanel{padding:18px 22px 22px;display:flex;flex-direction:column;gap:14px;}

/* facility info tile grid */
.fpd-daycare .igrid{display:grid;grid-template-columns:1fr 1fr;border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);overflow:hidden;}
.fpd-daycare .igrid .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-daycare .igrid .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}
@media (max-width:760px){
.fpd-daycare .igrid{grid-template-columns:1fr;}
.fpd-daycare .igrid .tile:nth-child(2n){border-left:none;}
.fpd-daycare .igrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.22);}
}
.fpd-daycare .tile{padding:12px 14px;}
.fpd-daycare .tile .tk{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-daycare .tile .tv{color:${TEXT};font-size:13px;line-height:1.5;}

/* alert / notes */
.fpd-daycare .alert{display:flex;align-items:flex-start;gap:10px;padding:13px 15px;border-radius:11px;background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.28);}
.fpd-daycare .alert .ak{color:${NEG};font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.06em;margin-bottom:4px;}
.fpd-daycare .alert .av{color:${TEXT};font-size:13px;}
.fpd-daycare .alert .am{color:${MUTED};font-size:12px;margin-top:4px;}
.fpd-daycare .notebox{padding:13px 15px;border-radius:11px;background:rgba(217,165,94,0.07);border:1px solid rgba(217,165,94,0.22);}
.fpd-daycare .notebox .nk{color:${WARN};font-family:var(--font-mono);font-size:10px;letter-spacing:0.06em;margin-bottom:6px;}
.fpd-daycare .notebox .nv{color:${TEXT};font-size:13px;line-height:1.6;}

/* authorized pickups */
.fpd-daycare .pickup-intro{color:${MUTED};font-size:12.5px;line-height:1.65;}
.fpd-daycare .pcard{display:flex;align-items:flex-start;gap:14px;padding:15px 16px;border-radius:12px;background:rgba(91,123,245,0.04);border:1px solid rgba(91,123,245,0.14);}
.fpd-daycare .pavatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,123,245,0.14);color:${ACCENT2};font-family:var(--font-display);font-weight:700;font-size:14px;}
.fpd-daycare .pinfo-name{display:flex;align-items:center;gap:8px;margin-bottom:3px;flex-wrap:wrap;}
.fpd-daycare .pinfo-name b{color:${TEXT};font-size:14px;font-weight:600;}
.fpd-daycare .pinfo-name span{color:${MUTED};font-size:12px;}
.fpd-daycare .pinfo-row{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:11.5px;}
.fpd-daycare .pinfo-row.ok{color:${POS};margin-top:3px;}
.fpd-daycare .adddash{width:100%;padding:12px;border-radius:11px;border:1px dashed rgba(91,123,245,0.4);background:rgba(91,123,245,0.04);color:${ACCENT2};font-size:12.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-daycare .adddash:hover{background:rgba(91,123,245,0.09);}

/* documents */
.fpd-daycare .docrow{display:flex;flex-wrap:wrap;gap:8px;}
.fpd-daycare .docchip{display:inline-flex;align-items:center;gap:7px;padding:9px 13px;border-radius:10px;font-size:12px;background:rgba(91,123,245,0.08);color:${ACCENT2};border:1px solid rgba(91,123,245,0.18);cursor:pointer;font-family:var(--font-body);transition:background .16s;}
.fpd-daycare .docchip:hover{background:rgba(91,123,245,0.16);}

/* modal */
.fpd-daycare .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-daycare .modal{width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
.fpd-daycare .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-daycare .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-daycare .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-daycare .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-daycare .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-daycare .field input,.fpd-daycare .field select,.fpd-daycare .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-daycare .field input::placeholder,.fpd-daycare .field textarea::placeholder{color:${FAINT};}
.fpd-daycare .field input:focus,.fpd-daycare .field select:focus,.fpd-daycare .field textarea:focus{border-color:rgba(91,123,245,0.5);box-shadow:0 0 0 3px rgba(91,123,245,0.12);}
.fpd-daycare .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);flex-wrap:wrap;}
.fpd-daycare .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#647FF7,#4A63DE);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-daycare .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function DaycareInfo() {
  const [records, setRecords] = useState<DaycareRecord[]>(initRecords);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"info"|"pickups"|"docs">("info");
  const [form, setForm] = useState({ facilityName:"", childName:"", address:"", phone:"", email:"", directorName:"", teacherName:"", dropoffTime:"", pickupTime:"", days:"Monday – Friday", tuition:"", allergiesOnFile:"None known", emergencyContact:"", emergencyPhone:"", notes:"" });

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addRecord() {
    if (!form.facilityName || !form.childName) { toast.error("Facility name and child's name required"); return; }
    const rec: DaycareRecord = { ...form, id:Date.now(), website:"", teacherPhone:"", email:form.email, tuitionDue:"", paymentMethod:"", medicationsOnFile:"None", enrollDate:new Date().toLocaleDateString("en-US",{month:"short",year:"numeric"}), status:"active", authorizedPickups:[], documents:[] };
    setRecords(p => [rec, ...p]);
    toast.success(`${form.childName} at ${form.facilityName} added`);
    setShowAdd(false);
  }

  const statusColor: Record<string, string> = { active: POS, inactive: MUTED };

  return (
    <div className="fpd-daycare">
      <style dangerouslySetInnerHTML={{ __html: DAYCARE_CSS }} />
      <div className="fpd-daycare-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Baby size={12} /> Childcare Records</div>
            <h1 className="pg-h1">Daycare Information</h1>
            <div className="pg-sub">Facility details, authorized pickup persons, allergies, schedules, and important documents for each child.</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Daycare
          </button>
        </div>

        {/* ── Records ── */}
        <div className="rlist">
          {records.map(rec => (
            <div key={rec.id} className="card glow-surface">
              <button className="rhead" onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div className="rico"><Baby size={22} /></div>
                  <div>
                    <div className="rtitle">
                      <span className="rname">{rec.facilityName}</span>
                      <span className="stat-badge" style={{ background: rec.status === "active" ? "rgba(95,190,145,0.14)" : "rgba(140,151,180,0.14)", color: statusColor[rec.status] }}>{rec.status.toUpperCase()}</span>
                    </div>
                    <div className="rchild">Child: {rec.childName}</div>
                    <div className="rmeta">
                      <span><Clock size={10} />{rec.dropoffTime} drop-off · {rec.pickupTime} pickup</span>
                      <span><MapPin size={10} />{rec.address.split(",")[1]?.trim()}</span>
                    </div>
                  </div>
                </div>
                {expanded === rec.id ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
              </button>

              {expanded === rec.id && (
                <div className="rbody">
                  {/* ── Segmented sub-tabs ── */}
                  <div className="rtabbar">
                    <div className="seg">
                      {([["info","📋 Facility Info"],["pickups","🚗 Authorized Pickups"],["docs","📄 Documents"]] as const).map(([id,label]) => (
                        <button key={id} className={activeTab === id ? "on" : ""} onClick={() => setActiveTab(id)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rpanel">
                    {activeTab === "info" && (
                      <>
                        <div className="igrid">
                          {[
                            ["Director",rec.directorName],["Teacher / Caregiver",rec.teacherName],
                            ["Teacher Phone",rec.teacherPhone||"—"],["Facility Phone",rec.phone],
                            ["Email",rec.email],["Website",rec.website],
                            ["Days",rec.days],["Drop-off Time",rec.dropoffTime],
                            ["Pickup Time",rec.pickupTime],["Tuition",rec.tuition],
                            ["Tuition Due",rec.tuitionDue],["Payment Method",rec.paymentMethod],
                            ["Emergency Contact",rec.emergencyContact],["Emergency Phone",rec.emergencyPhone],
                            ["Enrolled",rec.enrollDate],["Address",rec.address],
                          ].map(([label,value]) => (
                            <div key={label} className="tile">
                              <div className="tk">{label}</div>
                              <div className="tv">{value}</div>
                            </div>
                          ))}
                        </div>
                        {rec.allergiesOnFile !== "None known" && (
                          <div className="alert">
                            <AlertCircle size={14} color={NEG} style={{ marginTop: 1, flexShrink: 0 }} />
                            <div>
                              <div className="ak">ALLERGIES ON FILE</div>
                              <div className="av">{rec.allergiesOnFile}</div>
                              {rec.medicationsOnFile !== "None" && <div className="am">Medications: {rec.medicationsOnFile}</div>}
                            </div>
                          </div>
                        )}
                        {rec.notes && (
                          <div className="notebox">
                            <div className="nk">NOTES</div>
                            <div className="nv">{rec.notes}</div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === "pickups" && (
                      <>
                        <div className="pickup-intro">
                          These individuals are authorized to pick up {rec.childName}. All must present a government-issued photo ID to facility staff.
                        </div>
                        {rec.authorizedPickups.map((p,i) => (
                          <div key={i} className="pcard glow-surface">
                            <div className="pavatar">{p.name.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="pinfo-name">
                                <b>{p.name}</b>
                                <span>{p.relationship}</span>
                              </div>
                              <div className="pinfo-row"><Phone size={10} />{p.phone}</div>
                              <div className="pinfo-row ok"><CheckCircle size={10} />{p.photoId}</div>
                            </div>
                          </div>
                        ))}
                        <button className="adddash" onClick={() => toast.success("Add authorized pickup — opens form (demo)")}>
                          <Plus size={13} /> Add Authorized Pickup Person
                        </button>
                      </>
                    )}

                    {activeTab === "docs" && (
                      <>
                        <div className="docrow">
                          {rec.documents.map(d => (
                            <button key={d} className="docchip" onClick={() => toast.success(`Opening: ${d}`)}>
                              <FileText size={12} /> {d}
                            </button>
                          ))}
                        </div>
                        <ScanButton folder="personal" onUpload={doc => { setRecords(p=>p.map(r=>r.id===rec.id?{...r,documents:[...r.documents,doc.name]}:r)); toast.success(`"${doc.name}" added`); }} size="sm" label="Scan or Upload Document" />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Add daycare modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Daycare / Childcare</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {[["Child's Full Name *","childName",""],["Facility Name *","facilityName",""],["Address","address",""],["Phone","phone",""],["Email","email",""],["Director's Name","directorName",""],["Teacher / Caregiver","teacherName",""],["Drop-off Time","dropoffTime","e.g. 7:30 AM"],["Pickup Time","pickupTime","e.g. 5:30 PM"],["Days Attended","days","e.g. Monday – Friday"],["Monthly Tuition","tuition","e.g. $1,200/month"],["Allergies on File","allergiesOnFile","e.g. Peanuts or None known"],["Emergency Contact","emergencyContact",""],["Emergency Phone","emergencyPhone",""],["Notes","notes",""]].map(([label,key,ph]) => (
                  <div className="field" key={key}>
                    <label>{label.toUpperCase()}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (enrollment agreement, immunization records)" sectionId="daycare-info" sectionLabel="Daycare Information" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addRecord}>Add Daycare</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
