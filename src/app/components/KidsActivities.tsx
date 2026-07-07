import React, { useState } from "react";
import { Star, Plus, X, Clock, MapPin, Phone, User, ChevronDown, ChevronUp, Calendar, DollarSign, Car } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { AttachDocumentField } from "./AttachDocumentField";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const ACTIVITY_TYPES = ["Soccer","Baseball / Softball","Basketball","Football","Swimming","Tennis","Gymnastics","Dance","Martial Arts","Track & Field","Volleyball","Cheerleading","Music / Band","Piano","Guitar","Violin","Drama / Theater","Art Class","Coding / STEM","Chess","Scouts / Scouting","Religious Education","Tutoring","Language Class","Yoga / Fitness","Other"];

const ACT_META: Record<string, {emoji:string; color:string; bg:string}> = {
  "Soccer":          {emoji:"⚽",color:"#48BB78",bg:"rgba(72,187,120,0.1)"},
  "Baseball / Softball":{emoji:"⚾",color:"#F6AD55",bg:"rgba(246,173,85,0.1)"},
  "Basketball":      {emoji:"🏀",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Football":        {emoji:"🏈",color:"#9F7AEA",bg:"rgba(159,122,234,0.1)"},
  "Swimming":        {emoji:"🏊",color:"#4A90D9",bg:"rgba(74,144,217,0.1)"},
  "Gymnastics":      {emoji:"🤸",color:"#FC8181",bg:"rgba(252,129,129,0.1)"},
  "Dance":           {emoji:"💃",color:"#9F7AEA",bg:"rgba(159,122,234,0.1)"},
  "Martial Arts":    {emoji:"🥋",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Music / Band":    {emoji:"🎵",color:"#6C5CE7",bg:"rgba(108,92,231,0.1)"},
  "Piano":           {emoji:"🎹",color:"#6C5CE7",bg:"rgba(108,92,231,0.1)"},
  "Guitar":          {emoji:"🎸",color:"#9F7AEA",bg:"rgba(159,122,234,0.1)"},
  "Drama / Theater": {emoji:"🎭",color:"#FC8181",bg:"rgba(252,129,129,0.1)"},
  "Art Class":       {emoji:"🎨",color:"#ED8936",bg:"rgba(237,137,54,0.1)"},
  "Coding / STEM":   {emoji:"💻",color:"#48BB78",bg:"rgba(72,187,120,0.1)"},
  "Chess":           {emoji:"♟️",color:"#6C5CE7",bg:"rgba(108,92,231,0.1)"},
  "Scouts / Scouting":{emoji:"🏕️",color:"#48BB78",bg:"rgba(72,187,120,0.1)"},
  "Religious Education":{emoji:"⛪",color:"#6C5CE7",bg:"rgba(108,92,231,0.1)"},
  "Tutoring":        {emoji:"📚",color:"#F6AD55",bg:"rgba(246,173,85,0.1)"},
  "Tennis":          {emoji:"🎾",color:"#48BB78",bg:"rgba(72,187,120,0.1)"},
  "Violin":          {emoji:"🎻",color:"#9F7AEA",bg:"rgba(159,122,234,0.1)"},
};
function getMeta(type:string) { return ACT_META[type] || {emoji:"⭐",color:"rgba(255,255,255,0.65)",bg:"rgba(138,154,184,0.1)"}; }

interface Activity {
  id: number;
  childName: string;
  activityType: string;
  organizationName: string;
  teamOrGroup: string;
  location: string;
  locationPhone: string;
  coachInstructor: string;
  coachPhone: string;
  schedule: string;
  seasonDates: string;
  monthlyCost: string;
  paymentDue: string;
  uniformRequired: string;
  transportationNotes: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
  status: "active"|"inactive"|"seasonal";
  documents: string[];
}

const initActivities: Activity[] = [
  {
    id:1, childName:"Emma Doe", activityType:"Soccer", organizationName:"Sacramento Youth Soccer League",
    teamOrGroup:"U6 Ladybugs — Team #14", location:"William Land Park, Field 3 — 3800 Land Park Dr, Sacramento",
    locationPhone:"(916) 555-0291", coachInstructor:"Coach Maria Santos", coachPhone:"(916) 555-0482",
    schedule:"Saturdays 9:00 AM – 10:30 AM · Practice Tuesdays 4:30 PM", seasonDates:"Sep 2025 – Nov 2025",
    monthlyCost:"$85/season registration", paymentDue:"Paid in full at registration",
    uniformRequired:"Team jersey #7, shin guards, cleats (all provided by league)",
    transportationNotes:"James drops off Saturdays. Sarah covers Tuesday practices. Carpooling with the Kim family on alternating weeks — Linda Kim: (916) 555-0841.",
    emergencyContact:"Sarah Johnson (mother)", emergencyPhone:"(916) 555-0182",
    notes:"Emma loves playing left forward. Bring water bottle, snack for after game. Team party at season end — TBD location.",
    status:"active", documents:["SYSL Registration 2025","Medical Release Form","Team Photo Waiver"],
  },
  {
    id:2, childName:"Emma Doe", activityType:"Dance", organizationName:"Sacramento Dance Academy",
    teamOrGroup:"Creative Movement — Beginner (Ages 4–5)", location:"4821 Manzanita Ave, Sacramento, CA 95821",
    locationPhone:"(916) 555-0844", coachInstructor:"Ms. Brianna Cole", coachPhone:"(916) 555-0844",
    schedule:"Thursdays 4:00 PM – 4:45 PM", seasonDates:"Sep 2025 – Jun 2026",
    monthlyCost:"$95/month", paymentDue:"1st of each month — auto-pay on file",
    uniformRequired:"Pink leotard, pink tights, ballet slippers (purchased at studio — $45)",
    transportationNotes:"Sarah picks up from daycare at 3:45, drives directly to studio. James covers when Sarah travels for work.",
    emergencyContact:"Sarah Johnson (mother)", emergencyPhone:"(916) 555-0182",
    notes:"Annual recital in June — costume fee approximately $60. Hair must be in a bun. Studio has strict no-perfume policy.",
    status:"active", documents:["Enrollment Contract 2025-26","Recital Permission Form"],
  },
  {
    id:3, childName:"Lucas Doe", activityType:"Swimming", organizationName:"Gold River Aquatic Center",
    teamOrGroup:"Parent & Tot Swim — Level 1", location:"2250 Gold River Rd, Rancho Cordova, CA 95670",
    locationPhone:"(916) 555-0372", coachInstructor:"Instructor Keanu Makoa", coachPhone:"(916) 555-0372",
    schedule:"Wednesdays & Fridays 10:30 AM – 11:00 AM", seasonDates:"Rolling enrollment — current session Jan–Mar 2026",
    monthlyCost:"$120/session (8 classes)", paymentDue:"At session registration",
    uniformRequired:"Swim diaper, swim trunks, swim cap (optional)",
    transportationNotes:"Parent must be in water with child. Sarah attends all sessions. James covers when Sarah is unavailable.",
    emergencyContact:"Sarah Johnson (mother)", emergencyPhone:"(916) 555-0182",
    notes:"Bring 2 swim diapers, towel, change of clothes. Shower before entering pool. Lucas is terrified of the splash pad — avoid it.",
    status:"active", documents:["Aquatic Center Enrollment","Medical Clearance Form"],
  },
  {
    id:4, childName:"Emma Doe", activityType:"Art Class", organizationName:"Crocker Art Museum",
    teamOrGroup:"Little Artists Saturday Workshop", location:"216 O Street, Sacramento, CA 95814",
    locationPhone:"(916) 808-7000", coachInstructor:"Instructor Rosa Mendez", coachPhone:"",
    schedule:"2nd & 4th Saturday 10:00 AM – 11:30 AM", seasonDates:"Oct 2025 – May 2026",
    monthlyCost:"$50/month (museum member discount applied)",
    paymentDue:"Quarterly — next due Jan 1, 2026",
    uniformRequired:"Wear clothes that can get messy. Smock provided.",
    transportationNotes:"James drops off. Emma joins parents for museum visit afterward — family activity.",
    emergencyContact:"James Doe (father)", emergencyPhone:"(916) 555-0291",
    notes:"We are museum members — membership card at front desk. Emma keeps all artwork — labeled folder in her bedroom.",
    status:"seasonal", documents:["Museum Workshop Registration"],
  },
];

export function KidsActivities() {
  const [activities, setActivities] = useState<Activity[]>(initActivities);
  const [expanded, setExpanded] = useState<number|null>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [filterChild, setFilterChild] = useState("all");
  const [form, setForm] = useState({
    childName:"", activityType:ACTIVITY_TYPES[0], organizationName:"", teamOrGroup:"",
    location:"", locationPhone:"", coachInstructor:"", coachPhone:"", schedule:"",
    seasonDates:"", monthlyCost:"", paymentDue:"", uniformRequired:"", transportationNotes:"",
    emergencyContact:"", emergencyPhone:"", notes:"", status:"active" as "active"|"inactive"|"seasonal",
  });

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addActivity() {
    if (!form.childName || !form.activityType) { toast.error("Child name and activity type required"); return; }
    setActivities(p => [...p, { ...form, id:Date.now(), documents:[] }]);
    toast.success(`${form.activityType} added for ${form.childName}`);
    setForm({ childName:"", activityType:ACTIVITY_TYPES[0], organizationName:"", teamOrGroup:"", location:"", locationPhone:"", coachInstructor:"", coachPhone:"", schedule:"", seasonDates:"", monthlyCost:"", paymentDue:"", uniformRequired:"", transportationNotes:"", emergencyContact:"", emergencyPhone:"", notes:"", status:"active" });
    setShowAdd(false);
  }

  const children = ["all", ...Array.from(new Set(activities.map(a=>a.childName)))];
  const filtered = activities.filter(a => filterChild==="all" || a.childName===filterChild);

  const statusColors = { active:"#48BB78", inactive:"#8A9AB8", seasonal:"#F6AD55" };
  const statusBgs   = { active:"rgba(72,187,120,0.12)", inactive:"rgba(138,154,184,0.12)", seasonal:"rgba(246,173,85,0.12)" };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Kids' Activities</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Track every activity for every child — schedules, coaches, transportation, costs, and important documents.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Activity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Total Activities", value:activities.length,                                color:"var(--primary)" },
          { label:"Active",           value:activities.filter(a=>a.status==="active").length,  color:"#48BB78" },
          { label:"Children",         value:new Set(activities.map(a=>a.childName)).size,      color:"#9F7AEA" },
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-2xl text-center" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Child filter */}
      <div className="flex gap-2 flex-wrap">
        {children.map(child => (
          <button key={child} onClick={() => setFilterChild(child)}
            className="px-4 py-1.5 rounded-xl text-sm font-semibold"
            style={{ background:filterChild===child?"var(--primary)":"rgba(108,92,231,0.06)", color:filterChild===child?"#070D1A":"var(--muted-foreground)", border:`1px solid ${filterChild===child?"var(--primary)":"rgba(108,92,231,0.12)"}` }}>
            {child==="all" ? "👦👧 All Children" : `👧 ${child}`}
          </button>
        ))}
      </div>

      {/* Activity cards */}
      <div className="space-y-4">
        {filtered.map(act => {
          const meta = getMeta(act.activityType);
          return (
            <div key={act.id} className="rounded-2xl overflow-hidden" style={CARD}>
              <button className="w-full p-5 text-left" onClick={() => setExpanded(expanded===act.id ? null : act.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width:52, height:52, background:meta.bg }}>
                      {meta.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{ fontFamily:"var(--font-display)", fontSize:17, color:"var(--foreground)" }}>{act.activityType}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:statusBgs[act.status], color:statusColors[act.status], ...MONO }}>{act.status.toUpperCase()}</span>
                      </div>
                      <div style={{ color:"var(--foreground)", fontSize:13, fontWeight:500 }}>
                        {act.childName} · {act.organizationName}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Clock size={10}/>{act.schedule}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><DollarSign size={10}/>{act.monthlyCost}</span>
                      </div>
                    </div>
                  </div>
                  {expanded===act.id ? <ChevronUp size={16} color="var(--muted-foreground)"/> : <ChevronDown size={16} color="var(--muted-foreground)"/>}
                </div>
              </button>

              {expanded===act.id && (
                <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"var(--border)" }}>
                  <div className="grid md:grid-cols-2 gap-3 pt-4">
                    {[
                      ["Team / Group",act.teamOrGroup||"—"],
                      ["Coach / Instructor",act.coachInstructor||"—"],
                      ["Coach Phone",act.coachPhone||"—"],
                      ["Location",act.location],
                      ["Location Phone",act.locationPhone||"—"],
                      ["Schedule",act.schedule],
                      ["Season / Dates",act.seasonDates],
                      ["Cost",act.monthlyCost],
                      ["Payment Due",act.paymentDue||"—"],
                      ["Uniform / Equipment",act.uniformRequired||"—"],
                      ["Emergency Contact",act.emergencyContact],
                      ["Emergency Phone",act.emergencyPhone],
                    ].map(([label,value])=>(
                      <div key={label} className="px-4 py-3 rounded-xl" style={{ background:"#1C1C28" }}>
                        <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:3 }}>{label.toUpperCase()}</div>
                        <div style={{ color:"var(--foreground)", fontSize:13 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {act.transportationNotes && (
                    <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(74,144,217,0.05)", border:"1px solid rgba(74,144,217,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Car size={13} color="#4A90D9"/>
                        <span style={{ color:"#4A90D9", fontSize:10, ...MONO, fontWeight:700 }}>TRANSPORTATION & PICKUP NOTES</span>
                      </div>
                      <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.7 }}>{act.transportationNotes}</div>
                    </div>
                  )}

                  {act.notes && (
                    <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.05)", border:"1px solid rgba(246,173,85,0.2)" }}>
                      <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                      <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.7 }}>{act.notes}</div>
                    </div>
                  )}

                  <div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:8 }}>DOCUMENTS ({act.documents.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {act.documents.map(d => (
                        <button key={d} onClick={() => toast.success(`Opening: ${d}`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                          style={{ background:"rgba(108,92,231,0.07)", color:"var(--primary)", border:"1px solid rgba(108,92,231,0.15)" }}>
                          📄 {d}
                        </button>
                      ))}
                      <ScanButton folder="personal" onUpload={doc => { setActivities(p=>p.map(a=>a.id===act.id?{...a,documents:[...a.documents,doc.name]}:a)); toast.success(`"${doc.name}" added`); }} size="sm" label="Add Document"/>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Activity</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>ACTIVITY TYPE</label>
              <select value={form.activityType} onChange={F("activityType")} style={INPUT}>
                {ACTIVITY_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>STATUS</label>
              <select value={form.status} onChange={F("status")} style={INPUT}>
                <option value="active">Active</option>
                <option value="seasonal">Seasonal</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {[
              ["Child's Full Name *","childName","e.g. Emma Doe"],
              ["Organization / Club Name","organizationName","e.g. Sacramento Youth Soccer League"],
              ["Team or Group","teamOrGroup","e.g. U6 Ladybugs — Team #14"],
              ["Location","location","Address or facility name"],
              ["Location Phone","locationPhone",""],
              ["Coach / Instructor","coachInstructor",""],
              ["Coach Phone","coachPhone",""],
              ["Schedule","schedule","e.g. Saturdays 9:00 AM – 10:30 AM"],
              ["Season / Dates","seasonDates","e.g. Sep 2025 – Nov 2025"],
              ["Cost","monthlyCost","e.g. $85/month"],
              ["Payment Due","paymentDue","e.g. 1st of month"],
              ["Uniform / Equipment","uniformRequired","What the child needs"],
              ["Transportation Notes","transportationNotes","Who drops off, picks up, carpool info"],
              ["Emergency Contact","emergencyContact",""],
              ["Emergency Phone","emergencyPhone",""],
              ["Notes","notes","Anything else important"],
            ].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (registration form, waiver, medical clearance)" sectionId="kids-activities" sectionLabel="Kids Activities"/>
            <div className="flex gap-3 pt-2">
              <button onClick={addActivity} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Activity</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
