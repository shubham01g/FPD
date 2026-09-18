import React, { useState } from "react";
import {
  Star, Phone, Mail, Calendar, Clock, CheckCircle, Plus,
  X, User, FileText, MessageSquare, ChevronDown, ChevronUp,
  Edit2, Send, AlertCircle, Users, TrendingUp, DollarSign,
  Shield, Search, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { WaiverManager } from "../WaiverForm";
import { ConciergeStaffAdmin } from "./ConciergeStaffAdmin";
import { WGCardOnFile } from "../WGCardOnFile";
import { WGBillingHistory } from "../WGSessionTimer";
import { ROLE_LABELS, ROLE_COLORS } from "./ConciergeStaffAdmin";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";

const CARD: React.CSSProperties = { background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,167,214,0.3)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

interface DBEmployee { id: string; name: string; email: string; role: "junior_concierge"|"senior_concierge"|"lead_concierge"; status: "active"|"invited"|"suspended"; }

function avatarFor(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* Specialists are the concierge staff the admin has actually invited — there
   is no separate hard-coded roster. */
function toSpecialists(employees: DBEmployee[]) {
  return employees
    .filter(e => e.status !== "suspended")
    .map(e => ({ id:e.id, name:e.name, title:ROLE_LABELS[e.role], avatar:avatarFor(e.name), color:ROLE_COLORS[e.role] }));
}

interface DBWGClient {
  id: string; specialist_id: string | null; status: "intake"|"active"|"completed"|"paused";
  reason: string | null; notes: string | null; completion_pct: number;
  intake_date: string; next_session_at: string | null;
  users: { full_name: string; email: string; phone: string | null; plan: string; subscription_waived: boolean } | null;
  concierge_employees: { id: string; name: string } | null;
  wg_sessions: { id: string; specialist_id: string; session_type: "phone"|"video"|"in_person"; status: string; scheduled_at: string; duration_minutes: number | null; notes: string | null }[];
}

function mapClient(r: DBWGClient): WGClient {
  return {
    id: r.id,
    name: r.users?.full_name ?? "Unknown",
    email: r.users?.email ?? "",
    phone: r.users?.phone ?? "",
    plan: r.users?.plan ?? "",
    subscriptionWaived: !!r.users?.subscription_waived,
    specialist: r.specialist_id ?? "",
    status: r.status,
    reason: r.reason ?? "",
    intakeDate: new Date(r.intake_date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
    sessions: (r.wg_sessions ?? []).map(s => ({
      id: s.id,
      date: new Date(s.scheduled_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
      time: new Date(s.scheduled_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }),
      type: s.session_type,
      specialist: s.specialist_id,
      notes: s.notes ?? "",
      status: (s.status === "no_show" ? "cancelled" : s.status) as SessionStatus,
      duration: s.duration_minutes ? `${s.duration_minutes} min` : "—",
    })),
    notes: r.notes ?? "",
    completionPct: r.completion_pct ?? 0,
    nextSession: r.next_session_at ? new Date(r.next_session_at).toLocaleString() : undefined,
  };
}

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
          <span style={{ color:"#E8EDF5", fontSize:15, fontWeight:500 }}>{session.date} · {session.time}</span>
          <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background:`${statusColor}18`, color:statusColor, ...MONO }}>{session.status.toUpperCase()}</span>
          {session.duration !== "—" && <span style={{ color:"#8A9AB8", fontSize:14 }}>{session.duration}</span>}
        </div>
        {session.notes && <div style={{ color:"#8A9AB8", fontSize:14, marginTop:3, lineHeight:1.5 }}>{session.notes}</div>}
      </div>
    </div>
  );
}

/* ── Client card ─────────────────────────────────────────────────── */
function ClientCard({ client, specialists, onUpdate }: { client: WGClient; specialists: ReturnType<typeof toSpecialists>; onUpdate: (id: string, changes: Partial<WGClient>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const specialist = specialists.find(s => s.id === client.specialist);
  const statusColor = { active:"#48BB78", intake:"#F6AD55", completed:"#5B6EE1", paused:"#8A9AB8" }[client.status];

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:44, height:44, background:"rgba(91,167,214,0.12)", color:"#6FAE8B", fontSize:20, fontFamily:"var(--font-display)" }}>
              {client.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>{client.name}</span>
                {client.age && <span style={{ color:"#8A9AB8", fontSize:15 }}>Age {client.age}</span>}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:`${statusColor}18`, color:statusColor, ...MONO }}>{client.status.toUpperCase()}</span>
                {client.subscriptionWaived && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B", ...MONO }}>WAIVED</span>}
                <WGCardOnFile clientId={client.id} clientName={client.name} compact={true}/>
              </div>
              <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{client.email} · {client.phone}</div>
              <div style={{ color:"#8A9AB8", fontSize:14, marginTop:1 }}>
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
            <span style={{ color:"#8A9AB8", fontSize:14 }}>Vault Setup Progress</span>
            <span style={{ color:"#6FAE8B", fontSize:14, fontWeight:700 }}>{client.completionPct}%</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {[
                { label:"Setup Fee", value:"$99", color:"#6FAE8B", sub:"one-time" },
                { label:"Session Time", value:`${totalMins} min`, color:"#6E90C9", sub:`$${sessionCost} billed` },
                { label:"Est. Total", value:`$${totalCost}`, color:"#D99A6B", sub:"setup + sessions" },
              ].map(s => (
                <div key={s.label} className="px-3 py-2 rounded-2xl text-center" style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.1)" }}>
                  <div style={{ color:s.color, fontSize:17.5, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
                  <div style={{ color:"#8A9AB8", fontSize:11, ...MONO }}>{s.label.toUpperCase()}</div>
                  <div style={{ color:"#B0C0DC", fontSize:11 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Next session */}
        {client.nextSession && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl mt-2" style={{ background:"rgba(246,173,85,0.08)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <Calendar size={12} color="#F6AD55"/>
            <span style={{ color:"#F6AD55", fontSize:14, fontWeight:600 }}>Next session:</span>
            <span style={{ color:"#8A9AB8", fontSize:14 }}>{client.nextSession}</span>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor:"rgba(91,167,214,0.12)" }}>
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:6 }}>INTAKE REASON</div>
            <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>{client.reason}</div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>SESSION LOG ({client.sessions.length})</div>
              <button onClick={() => toast.info("Session scheduling isn't built yet.")}
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
              <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:4 }}>SPECIALIST NOTES</div>
              <div className="px-3 py-2.5 rounded-2xl" style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
                <div style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>{client.notes}</div>
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
            <button onClick={() => { window.location.href = `mailto:${client.email}`; }}
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
            <div style={{ color:"#8A9AB8", fontSize:12.5, fontFamily:"var(--font-mono)", marginBottom:8 }}>PAYMENT METHOD</div>
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
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<ClientStatus | "all">("all");

  const { data: employeesData, refetch: refetchEmployees } = useAdminFetch(
    () => adminApi.get<{ employees: DBEmployee[] }>("/concierge"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const { data: clientsData, refetch: refetchClients } = useAdminFetch(
    () => adminApi.get<{ clients: DBWGClient[] }>("/white-glove/clients"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const clients = (clientsData?.clients ?? []).map(mapClient);
  const specialists = toSpecialists(employeesData?.employees ?? []);

  function refreshAll() { refetchEmployees(); refetchClients(); }

  async function updateClient(id: string, changes: Partial<WGClient>) {
    const patch: Record<string, unknown> = {};
    if ("status" in changes) patch.status = changes.status;
    if ("completionPct" in changes) patch.completion_pct = changes.completionPct;
    if ("notes" in changes) patch.notes = changes.notes;
    if ("specialist" in changes) patch.specialist_id = changes.specialist || null;
    if ("nextSession" in changes) patch.next_session_at = changes.nextSession ?? null;
    try {
      await adminApi.patch(`/white-glove/clients/${id}`, patch);
      refetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
    }
  }

  const filtered = filter === "all" ? clients : clients.filter(c => c.status === filter);
  const activeCount = clients.filter(c => c.status === "active" || c.status === "intake").length;
  const completedCount = clients.filter(c => c.status === "completed").length;
  const avgCompletion = Math.round(clients.reduce((s,c)=>s+c.completionPct,0)/Math.max(clients.length,1));

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star size={15} color="#FFFFFF"/>
            <span style={{ color:"#6FAE8B", fontSize:14, ...MONO, letterSpacing:"0.1em" }}>ADMIN · WHITE GLOVE SERVICE</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:32.5, color:"#E8EDF5" }}>White Glove Concierge</h1>
          <p style={{ color:"#8A9AB8", fontSize:16, marginTop:4 }}>
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
            <div style={{ color:"#6FAE8B", fontSize:14, fontFamily:"var(--font-mono)", letterSpacing:"0.1em", marginBottom:4 }}>
              WHITE GLOVE · BILLING
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:25, color:"#E8EDF5" }}>Session Billing</h2>
            <p style={{ color:"#8A9AB8", fontSize:15, marginTop:4 }}>
              $99 one-time setup fee · $25 per 30-minute block · Cards charged automatically after each session.
            </p>
          </div>
          {/* Cards on file per client */}
          <div className="space-y-4">
            <div style={{ color:"#8A9AB8", fontSize:14, fontFamily:"var(--font-mono)" }}>PAYMENT METHODS ON FILE</div>
            {clients.map(c => (
              <div key={c.id} className="p-4 rounded-2xl" style={{ background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:17.5, color:"#E8EDF5", marginBottom:10 }}>{c.name}</div>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Active Clients",     value:activeCount,     color:"#6FAE8B" },
          { label:"Completed",          value:completedCount,  color:"#D99A6B" },
          { label:"Avg. Completion",    value:`${avgCompletion}%`, color:"#6E90C9" },
          { label:"Specialists",        value:specialists.length, color:"#F6AD55" },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:35.5, color:s.color }}>{s.value}</div>
            <div style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Specialist roster */}
      <div className="p-5 rounded-2xl" style={CARD}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:19, color:"#E8EDF5", marginBottom:14 }}>Specialist Roster</div>
        {specialists.length === 0 && (
          <div style={{ color:"#8A9AB8", fontSize:15 }}>No specialists yet. Invite concierge staff in the Concierge Staff tab.</div>
        )}
        <div className="grid md:grid-cols-3 gap-4">
          {specialists.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background:`${s.color}08`, border:`1px solid ${s.color}25` }}>
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                style={{ width:40, height:40, background:`${s.color}15`, color:s.color, fontSize:17.5, fontFamily:"var(--font-display)" }}>
                {s.avatar}
              </div>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:16, fontWeight:600 }}>{s.name}</div>
                <div style={{ color:"#8A9AB8", fontSize:14 }}>{s.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ color:s.color, fontSize:14, fontWeight:700 }}>
                    {clients.filter(c => c.specialist === s.id).length} clients
                  </span>
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
            <div style={{ color:"#8A9AB8", fontSize:17.5 }}>No clients in this category</div>
          </div>
        )}
        {filtered.map(c => <ClientCard key={c.id} client={c} specialists={specialists} onUpdate={updateClient}/>)}
      </div>
      </>}

      {/* Add client modal */}
      {showAdd && (
        <AddClientModal specialists={specialists} onClose={() => setShowAdd(false)} onAdded={refreshAll}/>
      )}
    </div>
  );
}

/* ── Add client modal ────────────────────────────────────────────────
   wg_clients has no name/email/phone columns of its own — it's keyed to an
   EXISTING users.id — so "adding a client" means searching for and picking
   a real account, not typing in fresh contact details. */
interface UserSearchResult { id: string; full_name: string; email: string; plan: string; white_glove: boolean }

function AddClientModal({ specialists, onClose, onAdded }: { specialists: ReturnType<typeof toSpecialists>; onClose: () => void; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [specialistId, setSpecialistId] = useState("");
  const [reason, setReason] = useState("");
  const [subscriptionWaived, setSubscriptionWaived] = useState(true);
  const [adding, setAdding] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await adminApi.get<{ users: UserSearchResult[] }>(`/users?search=${encodeURIComponent(query)}&pageSize=10`);
      setResults(res.users);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (!selected) { toast.error("Select an existing user first"); return; }
    if (!reason.trim()) { toast.error("Intake reason is required"); return; }
    setAdding(true);
    try {
      await adminApi.post("/white-glove/clients", {
        userId: selected.id, specialistId: specialistId || undefined, reason, subscriptionWaived,
      });
      toast.success(`${selected.full_name} added to White Glove program`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"90vh", overflowY:"auto" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
          <div className="flex items-center gap-2">
            <Star size={16} color="#FFFFFF"/>
            <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5" }}>Add White Glove Client</span>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>FIND EXISTING ACCOUNT *</label>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 rounded-2xl flex-1" style={INPUT}>
                <Search size={13} color="#8A9AB8"/>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
                  placeholder="Search by name or email…" style={{ background:"transparent", border:"none", outline:"none", color:"#FFFFFF", fontSize:16, width:"100%" }}/>
              </div>
              <button onClick={search} disabled={searching} className="px-4 rounded-2xl text-sm font-semibold disabled:opacity-50" style={{ background:"rgba(91,167,214,0.15)", color:"#6FAE8B" }}>
                {searching ? <Loader2 size={14} className="animate-spin"/> : "Search"}
              </button>
            </div>
            {results && (
              <div className="space-y-1.5 mt-2">
                {results.length === 0 && <div style={{ color:"#8A9AB8", fontSize:14 }}>No matching users.</div>}
                {results.map(u => (
                  <button key={u.id} onClick={() => setSelected(u)} disabled={u.white_glove}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-left disabled:opacity-40"
                    style={{ background:selected?.id===u.id?"rgba(91,167,214,0.15)":"rgba(91,167,214,0.04)", border:`1px solid ${selected?.id===u.id?"#5BA7D6":"rgba(91,167,214,0.12)"}` }}>
                    <div>
                      <div style={{ color:"#E8EDF5", fontSize:15 }}>{u.full_name}</div>
                      <div style={{ color:"#8A9AB8", fontSize:13 }}>{u.email} · {u.plan}</div>
                    </div>
                    {u.white_glove && <span style={{ color:"#8A9AB8", fontSize:12 }}>Already WG</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && <>
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ASSIGN SPECIALIST</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {specialists.length === 0 && <div style={{ color:"#8A9AB8", fontSize:14 }}>No specialists yet — invite one in the Concierge Staff tab.</div>}
              {specialists.map(s => (
                <button key={s.id} onClick={() => setSpecialistId(s.id)}
                  className="px-3 py-2 rounded-2xl text-xs font-bold transition-all"
                  style={{ background:specialistId===s.id?`${s.color}12`:"rgba(91,110,225,0.04)",
                    border:`1px solid ${specialistId===s.id?s.color:"rgba(91,110,225,0.12)"}`,
                    color:specialistId===s.id?s.color:"#8A9AB8" }}>
                  {s.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>INTAKE REASON *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              placeholder="Why does this client need White Glove assistance?" className="w-full resize-none" style={INPUT}/>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <span style={{ color:"#E8EDF5", fontSize:16 }}>Waive subscription fee</span>
            <button onClick={() => setSubscriptionWaived(v => !v)} style={{ color:subscriptionWaived?"#D99A6B":"#8A9AB8" }}>
              {subscriptionWaived ? <CheckCircle size={20}/> : <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid #8A9AB8" }}/>}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={submit} disabled={adding}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", opacity:adding?0.7:1 }}>
              <Star size={14}/>{adding ? "Adding…" : "Add to White Glove Program"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm" style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
          </div>
          </>}
        </div>
      </div>
    </div>
  );
}
