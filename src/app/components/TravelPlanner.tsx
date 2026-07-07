import React, { useState } from "react";
import { Plane, Plus, X, MapPin, Calendar, Users, DollarSign, ChevronDown, ChevronUp, Globe, Hotel, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const TRIP_TYPES = ["Vacation","Family Visit","Business Travel","Medical Travel","Honeymoon","Anniversary Trip","Holiday Travel","Road Trip","Cruise","Backpacking","Mission / Volunteer","Other"];

interface TravelDoc { name:string; type:string; }
interface Trip {
  id: number;
  destination: string;
  country: string;
  tripType: string;
  startDate: string;
  endDate: string;
  companions: string;
  accommodation: string;
  accommodationPhone: string;
  confirmationNum: string;
  transportation: string;
  budget: string;
  actualCost: string;
  highlights: string;
  notes: string;
  status: "planned"|"completed"|"cancelled";
  documents: TravelDoc[];
  photo?: string;
}

const initTrips: Trip[] = [
  { id:1, destination:"Maui, Hawaii", country:"USA", tripType:"Vacation", startDate:"Jul 4, 2025", endDate:"Jul 11, 2025", companions:"Sarah, Emma, Lucas", accommodation:"Wailea Beach Resort & Spa", accommodationPhone:"(808) 879-1922", confirmationNum:"WBR-48291-X", transportation:"Delta Flight DL-1204 (SFO→OGG)", budget:"$8,500", actualCost:"$9,120", highlights:"Snorkeling at Molokini Crater, Road to Hana, Emma's first plane ride, sunrise at Haleakalā.", notes:"Travel insurance purchased through AAA. Passports used for inter-island travel verification.", status:"completed", documents:[{name:"Delta Confirmation",type:"Flight"},{name:"Hotel Reservation",type:"Accommodation"},{name:"Travel Insurance Policy",type:"Insurance"},{name:"Car Rental Agreement",type:"Transportation"}] },
  { id:2, destination:"New Orleans, LA", country:"USA", tripType:"Vacation", startDate:"Nov 1, 2024", endDate:"Nov 5, 2024", companions:"Sarah", accommodation:"Hotel Monteleone", accommodationPhone:"(504) 523-3341", confirmationNum:"HM-29184", transportation:"Southwest Airlines (SMF→MSY)", budget:"$3,200", actualCost:"$3,050", highlights:"Jazz Fest, beignets at Café Du Monde, Garden District tour, Preservation Hall jazz concert.", notes:"Anniversary trip. Highly recommend Commander's Palace restaurant.", status:"completed", documents:[{name:"Southwest Booking",type:"Flight"},{name:"Hotel Monteleone Reservation",type:"Accommodation"}] },
  { id:3, destination:"Rome & Amalfi Coast, Italy", country:"Italy", tripType:"Vacation", startDate:"Sep 15, 2026", endDate:"Sep 27, 2026", companions:"Sarah", accommodation:"Hotel de Russie (Rome), Villa Cimbrone (Ravello)", accommodationPhone:"", confirmationNum:"", transportation:"United Airlines EWR layover", budget:"$18,000", actualCost:"", highlights:"", notes:"25th anniversary trip. Still planning — need to book flights. Passports expire 2029, good. Get international phone plan.", status:"planned", documents:[] },
  { id:4, destination:"Cancún, Mexico", country:"Mexico", tripType:"Vacation", startDate:"Mar 20, 2023", endDate:"Mar 27, 2023", companions:"Sarah, Emma, Lucas", accommodation:"Sandos Caracol Eco Resort (all-inclusive)", accommodationPhone:"(998) 884-9800", confirmationNum:"SC-77481", transportation:"Alaska Airlines (SMF→CUN)", budget:"$7,000", actualCost:"$6,840", highlights:"Kids' first international trip. Emma loved the snorkeling. Lucas fed parrots at the resort.", notes:"Both kids needed Mexican tourist cards (FMT). Kept copies in this vault.", status:"completed", documents:[{name:"Alaska Airlines Booking",type:"Flight"},{name:"Resort Reservation",type:"Accommodation"},{name:"Travel Insurance",type:"Insurance"},{name:"Kids FMT Tourist Cards",type:"Legal"}] },
];

const statusConfig = {
  planned:   { color:"#4A90D9", bg:"rgba(74,144,217,0.12)",   label:"PLANNED" },
  completed: { color:"#48BB78", bg:"rgba(72,187,120,0.12)",  label:"COMPLETED" },
  cancelled: { color:"#FC8181", bg:"rgba(252,129,129,0.12)", label:"CANCELLED" },
};

export function TravelPlanner() {
  const [trips, setTrips] = useState<Trip[]>(initTrips);
  const [expanded, setExpanded] = useState<number|null>(1);
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all"|"planned"|"completed">("all");
  const [form, setForm] = useState({ destination:"", country:"", tripType:"Vacation", startDate:"", endDate:"", companions:"", accommodation:"", accommodationPhone:"", confirmationNum:"", transportation:"", budget:"", notes:"", status:"planned" as "planned"|"completed", photo:"" });

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addTrip() {
    if (!form.destination) { toast.error("Destination required"); return; }
    const trip: Trip = { ...form, id:Date.now(), actualCost:"", highlights:"", documents:[], photo:form.photo };
    setTrips(p => [trip, ...p]);
    toast.success(`${form.destination} added to Travel Planner`);
    setShowAdd(false);
  }

  const filtered = trips.filter(t => filterStatus==="all" || t.status===filterStatus);
  const stats = { total:trips.length, completed:trips.filter(t=>t.status==="completed").length, planned:trips.filter(t=>t.status==="planned").length, countries:new Set(trips.map(t=>t.country)).size };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Travel Planner</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Record every trip — past and future. Attach itineraries, tickets, hotel confirmations, and travel documents.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Trip
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Total Trips",value:stats.total,color:"var(--primary)"},{label:"Completed",value:stats.completed,color:"#48BB78"},{label:"Planned",value:stats.planned,color:"#4A90D9"},{label:"Countries",value:stats.countries,color:"#ED8936"}].map(s=>(
          <div key={s.label} className="p-4 rounded-2xl text-center glow-surface" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color, fontWeight:700 }}>{s.value}</div>
            <div style={{ color:"var(--muted-foreground)", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"var(--card)" }}>
        {(["all","planned","completed"] as const).map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background:filterStatus===s?"var(--primary)":"transparent", color:filterStatus===s?"#070D1A":"var(--muted-foreground)" }}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Trip list */}
      <div className="space-y-4">
        {filtered.map(trip => {
          const sc = statusConfig[trip.status];
          return (
            <div key={trip.id} className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
              {trip.photo && <img src={trip.photo} alt={trip.destination} style={{ width:"100%", height:180, objectFit:"cover" }}/>}
              <button className="w-full p-5 text-left" onClick={() => setExpanded(expanded===trip.id ? null : trip.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center rounded-xl flex-shrink-0 text-2xl" style={{ width:52, height:52, background:"rgba(108,92,231,0.08)" }}>
                      {trip.status==="planned" ? "✈️" : "🌍"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>{trip.destination}</span>
                        <span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{trip.country}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:sc.bg, color:sc.color, ...MONO }}>{sc.label}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Calendar size={10}/>{trip.startDate} – {trip.endDate}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Users size={10}/>{trip.companions || "Solo"}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><Globe size={10}/>{trip.tripType}</span>
                        {trip.budget && <span className="flex items-center gap-1 text-xs" style={{ color:"var(--muted-foreground)" }}><DollarSign size={10}/>Budget: {trip.budget}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded===trip.id ? <ChevronUp size={16} color="var(--muted-foreground)"/> : <ChevronDown size={16} color="var(--muted-foreground)"/>}
                </div>
              </button>

              {expanded===trip.id && (
                <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"var(--border)" }}>
                  <div className="grid md:grid-cols-2 gap-3 pt-4">
                    {[
                      ["Accommodation",trip.accommodation||"—"],
                      ["Accommodation Phone",trip.accommodationPhone||"—"],
                      ["Confirmation #",trip.confirmationNum||"—"],
                      ["Transportation",trip.transportation||"—"],
                      ["Budget",trip.budget||"—"],
                      ["Actual Cost",trip.actualCost||"—"],
                      ["Travel Companions",trip.companions||"Solo"],
                      ["Trip Type",trip.tripType],
                    ].map(([label,value])=>(
                      <div key={label} className="px-4 py-3 rounded-xl" style={{ background:"#1C1C28" }}>
                        <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:3 }}>{label.toUpperCase()}</div>
                        <div style={{ color:"var(--foreground)", fontSize:13 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {trip.highlights && (
                    <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(72,187,120,0.05)", border:"1px solid rgba(72,187,120,0.2)" }}>
                      <div style={{ color:"#48BB78", fontSize:10, ...MONO, marginBottom:4 }}>HIGHLIGHTS & MEMORIES</div>
                      <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.7 }}>{trip.highlights}</div>
                    </div>
                  )}

                  {trip.notes && (
                    <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.05)", border:"1px solid rgba(246,173,85,0.15)" }}>
                      <div style={{ color:"#F6AD55", fontSize:10, ...MONO, marginBottom:4 }}>NOTES</div>
                      <div style={{ color:"var(--foreground)", fontSize:13, lineHeight:1.6 }}>{trip.notes}</div>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO, marginBottom:8 }}>TRAVEL DOCUMENTS ({trip.documents.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {trip.documents.map(d => (
                        <button key={d.name} onClick={() => toast.success(`Opening: ${d.name}`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                          style={{ background:"rgba(108,92,231,0.07)", color:"var(--primary)", border:"1px solid rgba(108,92,231,0.15)" }}>
                          📄 {d.name} <span style={{ color:"var(--muted-foreground)", marginLeft:4 }}>({d.type})</span>
                        </button>
                      ))}
                      <ScanButton folder="personal" onUpload={doc => { setTrips(p=>p.map(t=>t.id===trip.id?{...t,documents:[...t.documents,{name:doc.name,type:"Document"}]}:t)); toast.success(`"${doc.name}" added to ${trip.destination}`); }} size="sm" label="Add Document"/>
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
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Trip</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            <PhotoPicker value={form.photo} onChange={url => setForm(p=>({...p,photo:url}))} label="Cover Photo (destination)" aspectRatio="16/9"/>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>TRIP TYPE</label>
              <select value={form.tripType} onChange={F("tripType")} style={INPUT}>{TRIP_TYPES.map(t=><option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>STATUS</label>
              <select value={form.status} onChange={F("status")} style={INPUT}><option value="planned">Planned</option><option value="completed">Completed</option></select>
            </div>
            {[["Destination *","destination","e.g. Paris, France"],["Country","country","e.g. France"],["Start Date","startDate","e.g. Jun 15, 2026"],["End Date","endDate","e.g. Jun 25, 2026"],["Travel Companions","companions","e.g. Sarah, Emma (leave blank for solo)"],["Accommodation","accommodation","Hotel name or Airbnb"],["Accommodation Phone","accommodationPhone",""],["Confirmation Number","confirmationNum",""],["Transportation","transportation","e.g. United Airlines UA-100 (SFO→CDG)"],["Budget","budget","e.g. $5,000"],["Notes","notes","Planning notes, reminders, tips"]].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <AttachDocumentField value={null} onChange={doc => { if(doc) toast.success(`"${doc}" attached`); }} folder="personal" label="Attach Document (itinerary, tickets, travel insurance, passport copy)" sectionId="travel-planner" sectionLabel="Travel Planner"/>
            <div className="flex gap-3 pt-2">
              <button onClick={addTrip} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Trip</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
