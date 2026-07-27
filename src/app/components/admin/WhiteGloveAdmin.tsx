import React, { useState, useEffect, useCallback } from "react";
import {
  Star, Phone, Mail, Calendar, Clock, CheckCircle, Plus,
  X, User, FileText, MessageSquare, ChevronDown, ChevronUp,
  Edit2, Send, AlertCircle, Users, TrendingUp, DollarSign,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { WaiverManager } from "../WaiverForm";
import { ConciergeStaffAdmin } from "./ConciergeStaffAdmin";
import { WGCardOnFile } from "../WGCardOnFile";
import { WGBillingHistory } from "../WGSessionTimer";
import { subscribeToClients, addClient as storeAddClient, updateClient as storeUpdateClient, type WGClient as StoreWGClient } from "../../services/wgClientStore";

const CARD: React.CSSProperties = { background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,167,214,0.3)", color:"#FFFFFF", fontSize:13, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

const SPECIALISTS = [
  { id:"marcus", name:"Marcus Williams", title:"Senior Legacy Specialist", clients:12, rating:4.9, avatar:"MW", color:"#6E90C9" },
  { id:"patricia", name:"Patricia Chen",  title:"Legacy Onboarding Specialist", clients:9,  rating:4.8, avatar:"PC", color:"#6FAE8B" },
  { id:"james",   name:"James Rivera",   title:"Estate Documentation Specialist", clients:7, rating:5.0, avatar:"JR", color:"#D99A6B" },
];

type SessionStatus = "scheduled" | "completed" | "cancelled" | "pending";
type ClientStatus  = "active" | "intake" | "completed" | "paused";

interface WGSession {
  id: string; date: string; time: string; type: "phone" | "video" | "in_person";
  specialist: string; notes: string; status: SessionStatus; duration: string;
}

interface WGClient {
  id: string; name: string; email: string; phone: string; age?: number;
  plan: string; subscriptionWaived: boolean; specialist: string;
  status: ClientStatus; reason: string; intakeDate: string;
  sessions: WGSession[]; notes: string; completionPct: number;
  nextSession?: string;
}

const initClients: WGClient[] = [
  {
    id:"WG-001", name:"Dorothy Henderson", email:"d.henderson@email.com", phone:"(916) 555-0291", age:82,
    plan:"Premium", subscriptionWaived:true, specialist:"marcus", status:"active",
    reason:"Daughter contacted us — client is not comfortable with technology and needs full setup assistance.",
    intakeDate:"Jun 15, 2026", completionPct:65, nextSession:"Jun 28, 2026 · 2:00 PM",
    notes:"Very receptive. Has important documents (will, insurance, photos) ready to be uploaded. Prefers phone calls.",
    sessions:[
      { id:"S-001", date:"Jun 15, 2026", time:"10:00 AM", type:"phone", specialist:"Marcus Williams", notes:"Initial intake call. Confirmed documents to gather. Explained vault structure.", status:"completed", duration:"42 min" },
      { id:"S-002", date:"Jun 20, 2026", time:"11:00 AM", type:"phone", specialist:"Marcus Williams", notes:"Uploaded will, insurance policy, and bank information. Set up 2 legacy contacts.", status:"completed", duration:"58 min" },
      { id:"S-003", date:"Jun 28, 2026", time:"2:00 PM",  type:"video", specialist:"Marcus Williams", notes:"", status:"scheduled", duration:"—" },
    ],
  },
  {
    id:"WG-002", name:"Walter & Edna Briggs", email:"w.briggs@email.com", phone:"(404) 555-0841", age:76,
    plan:"Legacy Pro", subscriptionWaived:false, specialist:"patricia", status:"active",
    reason:"Referred by their estate attorney. Both need help navigating the digital platform.",
    intakeDate:"Jun 18, 2026", completionPct:30, nextSession:"Jun 27, 2026 · 3:30 PM",
    notes:"Two users sharing one specialist. Both are involved in sessions together.",
    sessions:[
      { id:"S-004", date:"Jun 18, 2026", time:"3:00 PM", type:"video", specialist:"Patricia Chen", notes:"Intro session. Showed dashboard and explained legacy contacts.", status:"completed", duration:"35 min" },
      { id:"S-005", date:"Jun 27, 2026", time:"3:30 PM", type:"video", specialist:"Patricia Chen", notes:"", status:"scheduled", duration:"—" },
    ],
  },
  {
    id:"WG-003", name:"Margaret Thompson", email:"m.thompson@email.com", phone:"(213) 555-0192", age:71,
    plan:"Essential", subscriptionWaived:true, specialist:"james", status:"intake",
    reason:"Lives alone. Children live out of state. Wants vault set up before upcoming medical procedure.",
    intakeDate:"Jun 22, 2026", completionPct:5, nextSession:"Jun 26, 2026 · 1:00 PM",
    notes:"Urgent timeline. Prioritize will, medical directives, and emergency contacts first.",
    sessions:[
      { id:"S-006", date:"Jun 26, 2026", time:"1:00 PM", type:"phone", specialist:"James Rivera", notes:"", status:"scheduled", duration:"—" },
    ],
  },
];

/* ── Session log row ─────────────────────────────────────────────── */
function SessionRow({ session }: { session: WGSession }) {
  const statusColor = { scheduled:"#F6AD55", completed:"#48BB78", cancelled:"#FC8181", pending:"#8A9AB8" }[session.status];
  const typeIcon = { phone:<Phone size={12}/>, video:<MessageSquare size={12}/>, in_person:<Users size={12}/> }[session.type];
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl" style={{ background:session.status==="scheduled"?"rgba(246,173,85,0.06)":"rgba(91,110,225,0.04)", border:`1px solid ${statusColor}25` }}>
      <div className="flex items-center justify-center rounded-full mt-0.5" style={{ width:26, height:26, background:`${statusColor}18`, color:statusColor, flexShrink:0 }}>
        {typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color:"#E8EDF5", fontSize:12, fontWeight:500 }}>{session.date} · {session.time}</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background:`${statusColor}18`, color:statusColor, ...MONO }}>{session.status.toUpperCase()}</span>
          {session.duration !== "—" && <span style={{ color:"#8A9AB8", fontSize:11 }}>{session.duration}</span>}
        </div>
        {session.notes && <div style={{ color:"#8A9AB8", fontSize:11, marginTop:3, lineHeight:1.5 }}>{session.notes}</div>}
      </div>
    </div>
  );
}

/* ── Client card ─────────────────────────────────────────────────── */
function ClientCard({ client, onUpdate }: { client: WGClient; onUpdate: (id: string, changes: Partial<WGClient>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const specialist = SPECIALISTS.find(s => s.id === client.specialist);
  const statusColor = { active:"#48BB78", intake:"#F6AD55", completed:"#5B6EE1", paused:"#8A9AB8" }[client.status];

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:44, height:44, background:"rgba(91,167,214,0.12)", color:"#6FAE8B", fontSize:16, fontFamily:"var(--font-display)" }}>
              {client.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#E8EDF5" }}>{client.name}</span>
                {client.age && <span style={{ color:"#8A9AB8", fontSize:12 }}>Age {client.age}</span>}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:`${statusColor}18`, color:statusColor, ...MONO }}>{client.status.toUpperCase()}</span>
                {client.subscriptionWaived && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B", ...MONO }}>WAIVED</span>}
                <WGCardOnFile clientId={client.id} clientName={client.name} compact={true}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>{client.email} · {client.phone}</div>
              <div style={{ color:"#8A9AB8", fontSize:11, marginTop:1 }}>
                {client.plan} plan · Intake: {client.intakeDate} · Specialist: {specialist?.name}
              </div>
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{ color:"#8A9AB8" }}>
            {expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span style={{ color:"#8A9AB8", fontSize:11 }}>Vault Setup Progress</span>
            <span style={{ color:"#6FAE8B", fontSize:11, fontWeight:700 }}>{client.completionPct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background:"rgba(91,167,214,0.1)" }}>
            <div className="h-2 rounded-full" style={{ width:`${client.completionPct}%`, background:"linear-gradient(90deg,#5BA7D6,#6F9E94)" }}/>
          </div>
        </div>

        {/* Billing summary */}
        {(() => {
          const SETUP_FEE = 99;
          const RATE_PER_30 = 25;
          const completedSessions = client.sessions.filter(s => s.status === "completed");
          const totalMins = completedSessions.reduce((sum, s) => {
            const m = parseInt(s.duration);
            return sum + (isNaN(m) ? 0 : m);
          }, 0);
          const sessionCost = Math.ceil(totalMins / 30) * RATE_PER_30;
          const totalCost = SETUP_FEE + sessionCost;
          return (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label:"Setup Fee", value:"$99", color:"#6FAE8B", sub:"one-time" },
                { label:"Session Time", value:`${totalMins} min`, color:"#6E90C9", sub:`$${sessionCost} billed` },
                { label:"Total Billed", value:`$${totalCost}`, color:"#D99A6B", sub:"to date" },
              ].map(s => (
                <div key={s.label} className="px-3 py-2 rounded-2xl text-center" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.1)" }}>
                  <div style={{ color:s.color, fontSize:14, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
                  <div style={{ color:"#8A9AB8", fontSize:9, ...MONO }}>{s.label.toUpperCase()}</div>
                  <div style={{ color:"#B0C0DC", fontSize:9 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Next session */}
        {client.nextSession && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl mt-2" style={{ background:"rgba(246,173,85,0.08)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <Calendar size={12} color="#F6AD55"/>
            <span style={{ color:"#F6AD55", fontSize:11, fontWeight:600 }}>Next session:</span>
            <span style={{ color:"#8A9AB8", fontSize:11 }}>{client.nextSession}</span>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor:"rgba(91,167,214,0.12)" }}>
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:6 }}>INTAKE REASON</div>
            <div style={{ color:"#8A9AB8", fontSize:12, lineHeight:1.7 }}>{client.reason}</div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>SESSION LOG ({client.sessions.length})</div>
              <button onClick={() => toast.success("Schedule session — opens calendar (demo)")}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-xl"
                style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B" }}>
                <Plus size={10}/> Schedule Session
              </button>
            </div>
            <div className="space-y-2">
              {client.sessions.map(s => <SessionRow key={s.id} session={s}/>)}
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div>
              <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:4 }}>SPECIALIST NOTES</div>
              <div className="px-3 py-2.5 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
                <div style={{ color:"#8A9AB8", fontSize:12, lineHeight:1.7 }}>{client.notes}</div>
              </div>
            </div>
          )}

          {/* Add note */}
          {addingNote ? (
            <div className="space-y-2">
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2} placeholder="Add specialist note…"
                className="w-full resize-none" style={INPUT}/>
              <div className="flex gap-2">
                <button onClick={() => {
                  if (noteText.trim()) {
                    onUpdate(client.id, { notes: client.notes ? client.notes + "\n\n" + noteText.trim() : noteText.trim() });
                    toast.success("Note added");
                  }
                  setNoteText(""); setAddingNote(false);
                }} className="flex-1 py-2 rounded-2xl text-xs font-semibold"
                  style={{ background:"#5BA7D6", color:"#fff" }}>Save Note</button>
                <button onClick={() => { setNoteText(""); setAddingNote(false); }}
                  className="px-4 py-2 rounded-2xl text-xs" style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingNote(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-2xl"
              style={{ background:"rgba(91,110,225,0.05)", color:"#8A9AB8", border:"1px solid rgba(91,110,225,0.1)" }}>
              <Edit2 size={11}/> Add note
            </button>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => toast.success(`Sending check-in email to ${client.name}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold flex-1"
              style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
              <Send size={11}/> Send Check-in
            </button>
            <button onClick={() => { onUpdate(client.id, { completionPct:100, status:"completed", nextSession:undefined }); toast.success(`${client.name} marked as complete`); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold"
              style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B" }}>
              <CheckCircle size={11}/> Mark Complete
            </button>
          </div>

          {/* Payment method */}
          <div>
            <div style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)", marginBottom:8 }}>PAYMENT METHOD</div>
            <WGCardOnFile clientId={client.id} clientName={client.name}/>
          </div>

          {/* Session billing history for this client */}
          <WGBillingHistory clientId={client.id}/>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function WhiteGloveAdmin() {
  const [mainTab, setMainTab] = useState<"clients"|"waivers"|"staff"|"billing">("clients");
  const [clients, setClients] = useState<WGClient[]>(initClients);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [newClient, setNewClient] = useState({ name:"", email:"", phone:"", age:"", plan:"foundation", specialist:"marcus", subscriptionWaived:true, reason:"", notes:"" });
  const [adding, setAdding] = useState(false);

  // Sync from shared store
  const readStore = useCallback((updated: StoreWGClient[]) => {
    setClients(updated as WGClient[]);
  }, []);
  useEffect(() => subscribeToClients(readStore), [readStore]);

  function updateClient(id: string, changes: Partial<WGClient>) {
    storeUpdateClient(id, changes);
  }

  function addClient() {
    if (!newClient.name.trim() || !newClient.email.trim()) { toast.error("Name and email required"); return; }
    setAdding(true);
    setTimeout(() => {
      storeAddClient({
        ...newClient,
        age: newClient.age ? Number(newClient.age) : undefined,
        subscriptionWaived: newClient.subscriptionWaived,
      });
      toast.success(`${newClient.name} added to White Glove program — visible in specialist portal instantly`);
      setNewClient({ name:"", email:"", phone:"", age:"", plan:"foundation", specialist:"marcus", subscriptionWaived:true, reason:"", notes:"" });
      setAdding(false); setShowAdd(false);
    }, 600);
  }

  const filtered = filter === "all" ? clients : clients.filter(c => c.status === filter);
  const activeCount = clients.filter(c => c.status === "active" || c.status === "intake").length;
  const completedCount = clients.filter(c => c.status === "completed").length;
  const avgCompletion = Math.round(clients.reduce((s,c)=>s+c.completionPct,0)/Math.max(clients.length,1));

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star size={15} color="#FFFFFF"/>
            <span style={{ color:"#6FAE8B", fontSize:11, ...MONO, letterSpacing:"0.1em" }}>ADMIN · WHITE GLOVE SERVICE</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#E8EDF5" }}>White Glove Concierge</h1>
          <p style={{ color:"#8A9AB8", fontSize:13, marginTop:4 }}>
            Hands-on onboarding for clients who need personal assistance. Each client is assigned a dedicated FPD specialist.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
          style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", boxShadow:"0 0 20px rgba(91,167,214,0.35)" }}>
          <Plus size={14}/> Add WG Client
        </button>
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0A0F1A", border:"1px solid rgba(91,167,214,0.3)" }}>
        <button onClick={() => setMainTab("clients")} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background:mainTab==="clients"?"#5BA7D6":"transparent", color:mainTab==="clients"?"#fff":"#8A9AB8" }}>
          ⭐ Clients
        </button>
        <button onClick={() => setMainTab("waivers")} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background:mainTab==="waivers"?"#5BA7D6":"transparent", color:mainTab==="waivers"?"#fff":"#8A9AB8" }}>
          📄 Authorization Waivers
        </button>
        <button onClick={() => setMainTab("staff")} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background:mainTab==="staff"?"#5BA7D6":"transparent", color:mainTab==="staff"?"#fff":"#8A9AB8" }}>
          👥 Concierge Staff
        </button>
        <button onClick={() => setMainTab("billing")} className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background:mainTab==="billing"?"#5BA7D6":"transparent", color:mainTab==="billing"?"#fff":"#8A9AB8" }}>
          💳 Billing
        </button>
      </div>

      {mainTab === "waivers"  && <WaiverManager/>}
      {mainTab === "staff"    && <ConciergeStaffAdmin/>}
      {mainTab === "billing"  && (
        <div className="space-y-5">
          <div>
            <div style={{ color:"#6FAE8B", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:"0.1em", marginBottom:4 }}>
              WHITE GLOVE · BILLING
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Session Billing</h2>
            <p style={{ color:"#8A9AB8", fontSize:12, marginTop:4 }}>
              $99 one-time setup fee · $25 per 30-minute block · Cards charged automatically after each session.
            </p>
          </div>
          {/* Cards on file per client */}
          <div className="space-y-4">
            <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>PAYMENT METHODS ON FILE</div>
            {clients.map(c => (
              <div key={c.id} className="p-4 rounded-2xl" style={{ background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#E8EDF5", marginBottom:10 }}>{c.name}</div>
                <WGCardOnFile clientId={c.id} clientName={c.name}/>
              </div>
            ))}
          </div>
          {/* All billing history */}
          <WGBillingHistory/>
        </div>
      )}

      {mainTab === "clients" && <>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Active Clients",     value:activeCount,     color:"#6FAE8B" },
          { label:"Completed",          value:completedCount,  color:"#D99A6B" },
          { label:"Avg. Completion",    value:`${avgCompletion}%`, color:"#6E90C9" },
          { label:"Specialists",        value:SPECIALISTS.length, color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:12, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Specialist roster */}
      <div className="p-5 rounded-2xl" style={CARD}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"#E8EDF5", marginBottom:14 }}>Specialist Roster</div>
        <div className="grid md:grid-cols-3 gap-4">
          {SPECIALISTS.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background:`${s.color}08`, border:`1px solid ${s.color}25` }}>
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                style={{ width:40, height:40, background:`${s.color}15`, color:s.color, fontSize:14, fontFamily:"var(--font-display)" }}>
                {s.avatar}
              </div>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:600 }}>{s.name}</div>
                <div style={{ color:"#8A9AB8", fontSize:11 }}>{s.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ color:s.color, fontSize:11, fontWeight:700 }}>{s.clients} clients</span>
                  <span style={{ color:"#F6AD55", fontSize:11 }}>★ {s.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + client list */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background:"#0A0F1A", border:"1px solid rgba(91,167,214,0.3)" }}>
        {([["all","All"],["intake","Intake"],["active","Active"],["completed","Completed"],["paused","Paused"]] as [ClientStatus|"all",string][]).map(([id,label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background:filter===id?"#5BA7D6":"transparent", color:filter===id?"#fff":"#8A9AB8" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="py-12 text-center rounded-2xl" style={CARD}>
            <Star size={32} color="rgba(91,167,214,0.2)" style={{ margin:"0 auto 12px" }}/>
            <div style={{ color:"#8A9AB8", fontSize:14 }}>No clients in this category</div>
          </div>
        )}
        {filtered.map(c => <ClientCard key={c.id} client={c} onUpdate={updateClient}/>)}
      </div>
      </>}

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"90vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
              <div className="flex items-center gap-2">
                <Star size={16} color="#FFFFFF"/>
                <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#E8EDF5" }}>Add White Glove Client</span>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ color:"#8A9AB8" }}><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label:"FULL NAME *",    key:"name",  ph:"Client's full name",     type:"text" },
                { label:"EMAIL *",        key:"email", ph:"their@email.com",        type:"email" },
                { label:"PHONE",          key:"phone", ph:"+1 (555) 000-0000",      type:"tel" },
                { label:"AGE (optional)", key:"age",   ph:"e.g. 78",               type:"number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>{f.label}</label>
                  <input type={f.type} value={(newClient as any)[f.key]} placeholder={f.ph}
                    onChange={e => setNewClient(p => ({ ...p, [f.key]:e.target.value }))} style={INPUT}/>
                </div>
              ))}

              <div>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>ASSIGN SPECIALIST</label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECIALISTS.map(s => (
                    <button key={s.id} onClick={() => setNewClient(p => ({ ...p, specialist:s.id }))}
                      className="px-3 py-2 rounded-2xl text-xs font-bold transition-all"
                      style={{ background:newClient.specialist===s.id?`${s.color}12`:"rgba(91,110,225,0.04)",
                        border:`1px solid ${newClient.specialist===s.id?s.color:"rgba(91,110,225,0.12)"}`,
                        color:newClient.specialist===s.id?s.color:"#8A9AB8" }}>
                      {s.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>PLAN</label>
                <select value={newClient.plan} onChange={e => setNewClient(p => ({ ...p, plan:e.target.value }))} style={INPUT}>
                  {["starter","essential","premium","legacy_pro","enterprise"].map(p => (
                    <option key={p} value={p}>{p.replace("_"," ").replace(/\b\w/g, l=>l.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color:"#8A9AB8", fontSize:11, ...MONO, display:"block", marginBottom:5 }}>INTAKE REASON *</label>
                <textarea value={newClient.reason} onChange={e => setNewClient(p => ({ ...p, reason:e.target.value }))} rows={2}
                  placeholder="Why does this client need White Glove assistance?" className="w-full resize-none" style={INPUT}/>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
                <span style={{ color:"#E8EDF5", fontSize:13 }}>Waive subscription fee</span>
                <button onClick={() => setNewClient(p => ({ ...p, subscriptionWaived:!p.subscriptionWaived }))}
                  style={{ color:newClient.subscriptionWaived?"#D99A6B":"#8A9AB8" }}>
                  {newClient.subscriptionWaived ? <CheckCircle size={20}/> : <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid #8A9AB8" }}/>}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={addClient} disabled={adding}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", opacity:adding?0.7:1 }}>
                  <Star size={14}/>{adding ? "Adding…" : "Add to White Glove Program"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-5 py-3 rounded-2xl text-sm"
                  style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
