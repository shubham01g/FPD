import React, { useState } from "react";
import { Baby, Plus, X, Phone, MapPin, Clock, User, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(110,139,255,0.05)", border:"1px solid rgba(110,139,255,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

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

  const statusColor = { active:"#48BB78", inactive:"#8A9AB8" };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1240, margin:"0 auto" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Daycare Information</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Facility details, authorized pickup persons, allergies, schedules, and important documents for each child.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Daycare
        </button>
      </div>

      <div className="space-y-4">
        {records.map(rec => (
          <div key={rec.id} className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
            {/* Header */}
            <button className="w-full p-5 text-left" onClick={() => setExpanded(expanded===rec.id ? null : rec.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width:48, height:48, background:"rgba(110,139,255,0.12)" }}>
                    <Baby size={22} color="#6E8BFF"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontFamily:"var(--font-display)", fontSize:17, color:"var(--foreground)" }}>{rec.facilityName}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:rec.status==="active"?"rgba(72,187,120,0.12)":"rgba(107,114,128,0.12)", color:statusColor[rec.status], ...MONO }}>{rec.status.toUpperCase()}</span>
                    </div>
                    <div style={{ color:"var(--foreground)", fontSize:14, fontWeight:500 }}>Child: {rec.childName}</div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Clock size={10}/>{rec.dropoffTime} drop-off · {rec.pickupTime} pickup</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><MapPin size={10}/>{rec.address.split(",")[1]?.trim()}</span>
                    </div>
                  </div>
                </div>
                {expanded===rec.id ? <ChevronUp size={16} color="var(--muted-foreground)"/> : <ChevronDown size={16} color="var(--muted-foreground)"/>}
              </div>
            </button>

            {expanded===rec.id && (
              <div className="border-t" style={{ borderColor:"var(--border)" }}>
                {/* Sub tabs */}
                <div className="flex gap-1 p-2 px-5" style={{ background:"rgba(110,139,255,0.03)" }}>
                  {[["info","📋 Facility Info"],["pickups","🚗 Authorized Pickups"],["docs","📄 Documents"]].map(([id,label]) => (
                    <button key={id} onClick={() => setActiveTab(id as any)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background:activeTab===id?"#6E8BFF":"transparent", color:activeTab===id?"#fff":"var(--muted-foreground)" }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-4">
                  {activeTab === "info" && (
                    <>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          ["Director",rec.directorName],["Teacher / Caregiver",rec.teacherName],
                          ["Teacher Phone",rec.teacherPhone||"—"],["Facility Phone",rec.phone],
                          ["Email",rec.email],["Website",rec.website],
                          ["Days",rec.days],["Drop-off Time",rec.dropoffTime],
                          ["Pickup Time",rec.pickupTime],["Tuition",rec.tuition],
                          ["Tuition Due",rec.tuitionDue],["Payment Method",rec.paymentMethod],
                          ["Emergency Contact",rec.emergencyContact],["Emergency Phone",rec.emergencyPhone],
                          ["Enrolled",rec.enrollDate],["Address",rec.address],
                        ].map(([label,value])=>(
                          <div key={label} className="px-4 py-3 rounded-xl" style={{ background:"#141B2E" }}>
                            <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:3 }}>{label.toUpperCase()}</div>
                            <div style={{ color:"var(--foreground)", fontSize:13 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {rec.allergiesOnFile !== "None known" && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl" style={{ background:"rgba(252,129,129,0.07)", border:"1px solid rgba(252,129,129,0.25)" }}>
                          <AlertCircle size={14} color="#FC8181" style={{ marginTop:1, flexShrink:0 }}/>
                          <div>
                            <div style={{ color:"#FC8181", fontSize:11, fontWeight:700, ...MONO }}>ALLERGIES ON FILE</div>
                            <div style={{ color:"var(--foreground)", fontSize:13 }}>{rec.allergiesOnFile}</div>
                            {rec.medicationsOnFile !== "None" && <div style={{ color:"var(--muted-foreground)", fontSize:12, marginTop:2 }}>Medications: {rec.medicationsOnFile}</div>}
                          </div>
                        </div>
                      )}
                      {rec.notes && (
                        <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
                          <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                          <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{rec.notes}</div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === "pickups" && (
                    <div className="space-y-3">
                      <div style={{ color:"var(--muted-foreground)", fontSize:12, lineHeight:1.6 }}>
                        These individuals are authorized to pick up {rec.childName}. All must present a government-issued photo ID to facility staff.
                      </div>
                      {rec.authorizedPickups.map((p,i) => (
                        <div key={i} className="flex items-start gap-4 p-4 rounded-xl glow-surface" style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.1)" }}>
                          <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0" style={{ width:40, height:40, background:"rgba(110,139,255,0.12)", color:"#6E8BFF", fontFamily:"var(--font-display)", fontSize:14 }}>
                            {p.name.split(" ").map((w:string)=>w[0]).join("").slice(0,2)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span style={{ color:"var(--foreground)", fontSize:14, fontWeight:600 }}>{p.name}</span>
                              <span style={{ color:"var(--muted-foreground)", fontSize:12 }}>{p.relationship}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Phone size={10}/>{p.phone}</div>
                            <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color:"#48BB78" }}><CheckCircle size={10}/>{p.photoId}</div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => toast.success("Add authorized pickup — opens form (demo)")}
                        className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
                        style={{ border:"1px dashed rgba(110,139,255,0.4)", color:"#6E8BFF", background:"rgba(110,139,255,0.04)" }}>
                        <Plus size={13}/> Add Authorized Pickup Person
                      </button>
                    </div>
                  )}

                  {activeTab === "docs" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {rec.documents.map(d => (
                          <button key={d} onClick={() => toast.success(`Opening: ${d}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                            style={{ background:"rgba(58,91,217,0.07)", color:"var(--primary)", border:"1px solid rgba(58,91,217,0.15)" }}>
                            📄 {d}
                          </button>
                        ))}
                      </div>
                      <ScanButton folder="personal" onUpload={doc => { setRecords(p=>p.map(r=>r.id===rec.id?{...r,documents:[...r.documents,doc.name]}:r)); toast.success(`"${doc.name}" added`); }} size="sm" label="Scan or Upload Document"/>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Daycare / Childcare</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            {[["Child's Full Name *","childName",""],["Facility Name *","facilityName",""],["Address","address",""],["Phone","phone",""],["Email","email",""],["Director's Name","directorName",""],["Teacher / Caregiver","teacherName",""],["Drop-off Time","dropoffTime","e.g. 7:30 AM"],["Pickup Time","pickupTime","e.g. 5:30 PM"],["Days Attended","days","e.g. Monday – Friday"],["Monthly Tuition","tuition","e.g. $1,200/month"],["Allergies on File","allergiesOnFile","e.g. Peanuts or None known"],["Emergency Contact","emergencyContact",""],["Emergency Phone","emergencyPhone",""],["Notes","notes",""]].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (enrollment agreement, immunization records)" sectionId="daycare-info" sectionLabel="Daycare Information"/>
              <button onClick={addRecord} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Daycare</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
