/**
 * ConciergePortal
 * Restricted dashboard for White Glove staff employees.
 * Only shows the clients assigned to the logged-in employee.
 * No access to master admin, revenue, other users, or system settings.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Star, LogOut, Phone, Video, Calendar, CheckCircle, Plus,
  X, Edit2, ChevronDown, ChevronUp, Send, Clock, FileText,
  Users, Shield, Bell, Upload, AlertCircle, MessageSquare,
  BookOpen, Camera, Inbox, PhoneMissed, Link, Copy
} from "lucide-react";
import { toast } from "sonner";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";
import { type ConciergeEmployee, ROLE_LABELS, ROLE_COLORS } from "../services/conciergeStaff";
import { subscribeToClients, createScheduleToken, type WGClient } from "../services/wgClientStore";
import { ScanButton } from "./DocumentScanner";
import { WaiverSignPage, waiverStore } from "./WaiverForm";
import { WGDocumentInbox } from "./WGDocumentInbox";
import { submissionStore } from "./WGClientSubmit";
import { WGSessionTimer } from "./WGSessionTimer";
import { WGCardOnFile } from "./WGCardOnFile";
import { WGVideoSession } from "./WGVideoSession";

const GLASS: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(159,122,234,0.12)", boxShadow:"0 2px 12px rgba(159,122,234,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily:"var(--font-display)" };

/* ── Demo client data (same as WhiteGloveAdmin seed) ─────────────── */
const ALL_CLIENTS = [
  {
    id:"WG-001", name:"Dorothy Henderson", email:"d.henderson@email.com", phone:"(916) 555-0291", age:82,
    plan:"Premium", subscriptionWaived:true,
    status:"active" as const, reason:"82 years old, not tech-savvy. Daughter set up account.",
    intakeDate:"Jun 15, 2026", completionPct:65, nextSession:"Jun 28, 2026 · 2:00 PM",
    notes:"Very receptive. Prefers phone calls. Has will + insurance ready.",
    sessions:[
      { id:"S-001", date:"Jun 15, 2026", time:"10:00 AM", type:"phone" as const, notes:"Intake call. Explained vault structure.", status:"completed" as const, duration:"42 min" },
      { id:"S-002", date:"Jun 20, 2026", time:"11:00 AM", type:"phone" as const, notes:"Uploaded will + insurance policy. Added 2 legacy contacts.", status:"completed" as const, duration:"58 min" },
      { id:"S-003", date:"Jun 28, 2026", time:"2:00 PM",  type:"video" as const, notes:"", status:"scheduled" as const, duration:"—" },
    ],
  },
  {
    id:"WG-002", name:"Walter & Edna Briggs", email:"w.briggs@email.com", phone:"(404) 555-0841", age:76,
    plan:"Legacy Pro", subscriptionWaived:false,
    status:"active" as const, reason:"Referred by estate attorney. Both need help navigating the platform.",
    intakeDate:"Jun 18, 2026", completionPct:30, nextSession:"Jun 27, 2026 · 3:30 PM",
    notes:"Two users, both attend sessions. Video preferred.",
    sessions:[
      { id:"S-004", date:"Jun 18, 2026", time:"3:00 PM", type:"video" as const, notes:"Intro session. Showed dashboard and explained legacy contacts.", status:"completed" as const, duration:"35 min" },
      { id:"S-005", date:"Jun 27, 2026", time:"3:30 PM", type:"video" as const, notes:"", status:"scheduled" as const, duration:"—" },
    ],
  },
  {
    id:"WG-003", name:"Margaret Thompson", email:"m.thompson@email.com", phone:"(213) 555-0192", age:71,
    plan:"Essential", subscriptionWaived:true,
    status:"intake" as const, reason:"Lives alone. Upcoming medical procedure — urgent timeline.",
    intakeDate:"Jun 22, 2026", completionPct:5, nextSession:"Jun 26, 2026 · 1:00 PM",
    notes:"Prioritize: will, medical directives, emergency contacts.",
    sessions:[
      { id:"S-006", date:"Jun 26, 2026", time:"1:00 PM", type:"phone" as const, notes:"", status:"scheduled" as const, duration:"—" },
    ],
  },
];

type PortalTab = "clients" | "schedule" | "waivers" | "inbox";

interface SessionRowProps {
  s: WGClient["sessions"][0];
}

function SessionBadge({ type }: { type:"phone"|"video"|"in_person" }) {
  const cfg = { phone:{ icon:<Phone size={10}/>, color:"#4A90D9" }, video:{ icon:<Video size={10}/>, color:"#9F7AEA" }, in_person:{ icon:<Users size={10}/>, color:"#48BB78" } }[type];
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
      style={{ background:`${cfg.color}15`, color:cfg.color }}>
      {cfg.icon} {type.replace("_"," ")}
    </div>
  );
}

/* ── Missed Call Modal ───────────────────────────────────────────── */
const DEFAULT_SLOTS = (clientName: string) => {
  const today = new Date();
  const fmt = (d: Date, time: string) =>
    d.toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" }) + " · " + time;
  const d1 = new Date(today); d1.setDate(today.getDate() + 1);
  const d2 = new Date(today); d2.setDate(today.getDate() + 1);
  const d3 = new Date(today); d3.setDate(today.getDate() + 2);
  const d4 = new Date(today); d4.setDate(today.getDate() + 3);
  return [fmt(d1,"10:00 AM"), fmt(d2,"2:00 PM"), fmt(d3,"11:00 AM"), fmt(d4,"3:00 PM")];
};

function MissedCallModal({ client, specialistName, onClose, onSent }: {
  client: WGClient; specialistName: string; onClose: () => void; onSent: (token: string) => void;
}) {
  const INPUT: React.CSSProperties = { background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.15)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"#0D1428", outline:"none", width:"100%" };
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS(client.name));
  const [customSlot, setCustomSlot] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [scheduleLink, setScheduleLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  function updateSlot(i: number, val: string) {
    setSlots(prev => prev.map((s, idx) => idx === i ? val : s));
  }
  function addCustomSlot() {
    if (customSlot.trim()) { setSlots(prev => [...prev, customSlot.trim()]); setCustomSlot(""); }
  }
  function removeSlot(i: number) {
    setSlots(prev => prev.filter((_, idx) => idx !== i));
  }

  function sendEmail() {
    if (slots.filter(s => s.trim()).length === 0) { toast.error("Add at least one time slot"); return; }
    setSending(true);
    setTimeout(() => {
      const token = createScheduleToken(client.id, client.name, specialistName, slots.filter(s => s.trim()));
      const link = `finalpassdown.com/schedule?token=${token.token}`;
      setScheduleLink(link);
      setSent(true);
      setSending(false);
      onSent(token.token);
      toast.success(`Scheduling email sent to ${client.name}`);
    }, 1200);
  }

  function copyLink() {
    try { navigator.clipboard.writeText(`https://${scheduleLink}`); } catch {}
    setLinkCopied(true);
    toast.success("Link copied");
    setTimeout(() => setLinkCopied(false), 3000);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background:"rgba(7,13,26,0.7)", backdropFilter:"blur(6px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background:"#F8FAFF", boxShadow:"0 32px 80px rgba(7,13,26,0.3)", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor:"rgba(32,64,192,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl"
              style={{ width:40, height:40, background:"rgba(246,173,85,0.12)" }}>
              <PhoneMissed size={18} color="#F6AD55"/>
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#0D1428" }}>Missed Call — Send Scheduling Link</div>
              <div style={{ color:"#8A9AB8", fontSize:12, marginTop:1 }}>
                {client.name} will tap a link and pick the best time to call back
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={18}/></button>
        </div>

        {!sent ? (
          <>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Email preview */}
              <div>
                <div style={{ color:"#5A6A88", fontSize:11, fontWeight:600, fontFamily:"var(--font-mono)", marginBottom:8 }}>
                  EMAIL PREVIEW
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(32,64,192,0.12)" }}>
                  <div className="px-4 py-2.5 flex items-center gap-1.5 border-b"
                    style={{ background:"rgba(32,64,192,0.04)", borderColor:"rgba(32,64,192,0.08)" }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#FC8181" }}/>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#F6AD55" }}/>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:"#48BB78" }}/>
                    <span style={{ color:"#8A9AB8", fontSize:10, fontFamily:"var(--font-mono)", marginLeft:8 }}>
                      TO: {client.email}
                    </span>
                  </div>
                  <div className="p-4" style={{ background:"#fff" }}>
                    <div style={{ color:"#8A9AB8", fontSize:11, marginBottom:10 }}>
                      Subject: <strong>We tried to reach you — pick a time that works!</strong>
                    </div>
                    <div style={{ color:"#0D1428", fontSize:13, lineHeight:1.7 }}>
                      Hi <strong>{client.name.split(" ")[0]}</strong>,<br/><br/>
                      This is <strong>{specialistName}</strong> from the Final Pass Down White Glove team.
                      I tried to reach you today but wasn't able to connect — no worries at all!<br/><br/>
                      I'd love to help you get your important documents organized.
                      Just tap the button below and pick a time that works best for you, and I'll call you right at that time.
                    </div>
                    <div className="flex justify-center my-4">
                      <div className="px-6 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F", display:"inline-block" }}>
                        Choose Your Callback Time →
                      </div>
                    </div>
                    <div style={{ color:"#8A9AB8", fontSize:11, textAlign:"center" }}>
                      Questions? Call us at (800) 555-0199
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional personal note */}
              <div>
                <label style={{ color:"#5A6A88", fontSize:12, fontWeight:600, display:"block", marginBottom:4 }}>
                  Add a personal note (optional)
                </label>
                <textarea value={emailNote} onChange={e => setEmailNote(e.target.value)} rows={2}
                  placeholder={`e.g. "Hi Dorothy, I hope you're doing well — looking forward to helping you!"`}
                  className="resize-none" style={{ ...INPUT, display:"block" }}/>
              </div>

              {/* Time slots */}
              <div>
                <label style={{ color:"#5A6A88", fontSize:12, fontWeight:600, display:"block", marginBottom:6 }}>
                  Available time slots (client picks one)
                </label>
                <div className="space-y-2">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={slot} onChange={e => updateSlot(i, e.target.value)}
                        style={{ ...INPUT, flex:1 }}/>
                      <button onClick={() => removeSlot(i)} className="px-3 rounded-xl"
                        style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)", flexShrink:0 }}>
                        <X size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={customSlot} onChange={e => setCustomSlot(e.target.value)}
                    placeholder="Add another time slot…"
                    onKeyDown={e => e.key === "Enter" && addCustomSlot()}
                    style={{ ...INPUT, flex:1 }}/>
                  <button onClick={addCustomSlot}
                    className="px-3 rounded-xl text-xs font-semibold flex-shrink-0"
                    style={{ background:"rgba(32,64,192,0.08)", color:"#2040C0" }}>
                    <Plus size={13}/>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0">
              <button onClick={sendEmail} disabled={sending}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background:"linear-gradient(135deg,#F6AD55,#FBBF24)", color:"#0D1428" }}>
                <Send size={14}/> {sending ? "Sending…" : `Send Email to ${client.name.split(" ")[0]}`}
              </button>
              <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm"
                style={{ background:"rgba(32,64,192,0.06)", color:"#5A6A88" }}>Cancel</button>
            </div>
          </>
        ) : (
          /* Sent confirmation */
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="flex items-center justify-center rounded-full"
                style={{ width:60, height:60, background:"rgba(72,187,120,0.12)", border:"2px solid rgba(72,187,120,0.3)" }}>
                <CheckCircle size={28} color="#48BB78"/>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#0D1428" }}>Email Sent!</div>
                <div style={{ color:"#5A6A88", fontSize:13, marginTop:4 }}>
                  <strong style={{ color:"#0D1428" }}>{client.name}</strong> will receive the scheduling link shortly.
                  When they pick a time, it will appear on their client card automatically.
                </div>
              </div>
            </div>

            {/* Copy link */}
            <div>
              <div style={{ color:"#5A6A88", fontSize:11, fontWeight:600, fontFamily:"var(--font-mono)", marginBottom:6 }}>
                SCHEDULING LINK (share directly if needed)
              </div>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2.5 rounded-xl truncate text-xs"
                  style={{ background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.12)", color:"#5A6A88", fontFamily:"var(--font-mono)" }}>
                  {scheduleLink}
                </div>
                <button onClick={copyLink}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{ background:linkCopied?"rgba(72,187,120,0.1)":"rgba(32,64,192,0.08)", color:linkCopied?"#48BB78":"#2040C0", border:`1px solid ${linkCopied?"rgba(72,187,120,0.3)":"rgba(32,64,192,0.15)"}` }}>
                  {linkCopied ? <><CheckCircle size={11}/> Copied!</> : <><Copy size={11}/> Copy</>}
                </button>
              </div>
            </div>

            <div className="px-4 py-3 rounded-xl text-sm" style={{ background:"rgba(32,64,192,0.04)", color:"#5A6A88", lineHeight:1.6 }}>
              📅 Once {client.name.split(" ")[0]} picks a time, it will automatically show as their <strong>Next Session</strong> on your client card — no manual update needed.
            </div>

            <button onClick={onClose} className="w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background:"rgba(32,64,192,0.06)", color:"#5A6A88" }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Client card ─────────────────────────────────────────────────── */
function ClientCard({ client, specialistName }: { client: WGClient; specialistName: string }) {
  const [open, setOpen] = useState(false);
  const [addNote, setAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(client.notes);
  const [completionPct, setCompletionPct] = useState(client.completionPct);
  const [showWaiver, setShowWaiver] = useState(false);
  const [showMissedCall, setShowMissedCall] = useState(false);
  const [scheduleToken, setScheduleToken] = useState<string | null>(null);

  const statusColor = { active:"#48BB78", intake:"#F6AD55", completed:"#2040C0", paused:"#8A9AB8" }[client.status];
  const pendingWaiver = waiverStore.find(w => w.userId === client.id && w.status === "pending");
  const signedWaiver  = waiverStore.find(w => w.userId === client.id && w.status === "signed");

  if (showWaiver) {
    const waiver = waiverStore.find(w => w.userId === client.id);
    return (
      <div style={GLASS}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor:"rgba(159,122,234,0.1)" }}>
          <button onClick={() => setShowWaiver(false)} style={{ color:"#9F7AEA" }}>← Back to {client.name}</button>
        </div>
        <div className="p-5">
          <WaiverSignPage waiverId={waiver?.id} onBack={() => setShowWaiver(false)}/>
        </div>
      </div>
    );
  }

  return (
    <div style={GLASS}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:44, height:44, background:"rgba(159,122,234,0.12)", color:"#9F7AEA", fontSize:16, ...DISPLAY }}>
              {client.name.split(" ").map(w=>w[0]).join("").slice(0,2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ ...DISPLAY, fontSize:16, color:"#0D1428" }}>{client.name}</span>
                {client.age && <span style={{ color:"#8A9AB8", fontSize:12 }}>Age {client.age}</span>}
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:`${statusColor}15`, color:statusColor, ...MONO }}>
                  {client.status.toUpperCase()}
                </span>
                {client.subscriptionWaived && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background:"rgba(72,187,120,0.1)", color:"#48BB78", ...MONO }}>WAIVED</span>
                )}
              </div>
              <div style={{ color:"#5A6A88", fontSize:12, marginTop:2 }}>{client.email} · {client.phone}</div>
              <div style={{ color:"#8A9AB8", fontSize:11, marginTop:1 }}>{client.plan} · Intake: {client.intakeDate}</div>
            </div>
          </div>
          <button onClick={() => setOpen(!open)} style={{ color:"#8A9AB8" }}>
            {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span style={{ color:"#5A6A88", fontSize:11 }}>Vault completion</span>
            <span style={{ color:"#9F7AEA", fontSize:11, fontWeight:700 }}>{completionPct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background:"rgba(159,122,234,0.1)" }}>
            <div className="h-2 rounded-full" style={{ width:`${completionPct}%`, background:"linear-gradient(90deg,#9F7AEA,#C4B5FD)" }}/>
          </div>
        </div>

        {/* Next session */}
        {client.nextSession && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background:"rgba(246,173,85,0.07)", border:"1px solid rgba(246,173,85,0.2)" }}>
            <Clock size={11} color="#F6AD55"/>
            <span style={{ color:"#F6AD55", fontSize:11, fontWeight:600 }}>Next:</span>
            <span style={{ color:"#5A6A88", fontSize:11 }}>{client.nextSession}</span>
          </div>
        )}

        {/* Waiver alert */}
        {pendingWaiver && (
          <button onClick={() => setShowWaiver(true)}
            className="flex items-center gap-2 w-full mt-3 px-3 py-2.5 rounded-xl text-left"
            style={{ background:"rgba(252,129,129,0.07)", border:"1px solid rgba(252,129,129,0.25)" }}>
            <AlertCircle size={12} color="#FC8181"/>
            <span style={{ color:"#FC8181", fontSize:11, fontWeight:600 }}>Authorization waiver not yet signed</span>
            <span style={{ color:"#FC8181", fontSize:11, marginLeft:"auto" }}>View →</span>
          </button>
        )}
        {signedWaiver && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <Shield size={11} color="#48BB78"/>
            <span style={{ color:"#48BB78", fontSize:11, fontWeight:600 }}>Authorization waiver signed · Access granted</span>
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-5 pb-5 border-t space-y-4" style={{ borderColor:"rgba(159,122,234,0.1)" }}>
          {/* Reason */}
          <div className="pt-4">
            <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:4 }}>INTAKE REASON</div>
            <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>{client.reason}</div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>SESSIONS ({client.sessions.length})</div>
              <button onClick={() => toast.success("Session scheduled — calendar invite sent (demo)")}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg"
                style={{ background:"rgba(159,122,234,0.08)", color:"#9F7AEA" }}>
                <Plus size={10}/> Schedule
              </button>
            </div>
            <div className="space-y-2">
              {client.sessions.map(s => {
                const sc = { scheduled:"#F6AD55", completed:"#48BB78", cancelled:"#FC8181" }[s.status];
                return (
                  <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background:`${sc}06`, border:`1px solid ${sc}20` }}>
                    <SessionBadge type={s.type}/>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ color:"#0D1428", fontSize:12, fontWeight:500 }}>{s.date} · {s.time}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{ background:`${sc}15`, color:sc, ...MONO }}>{s.status.toUpperCase()}</span>
                        {s.duration !== "—" && <span style={{ color:"#8A9AB8", fontSize:10 }}>{s.duration}</span>}
                      </div>
                      {s.notes && <div style={{ color:"#5A6A88", fontSize:11, marginTop:3, lineHeight:1.5 }}>{s.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:4 }}>MY NOTES</div>
            {notes && (
              <div className="px-3 py-2.5 rounded-xl mb-2" style={{ background:"rgba(159,122,234,0.04)", border:"1px solid rgba(159,122,234,0.1)" }}>
                <div style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>{notes}</div>
              </div>
            )}
            {addNote ? (
              <div className="space-y-2">
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2}
                  placeholder="Add a session note…" className="w-full resize-none px-3 py-2 rounded-xl"
                  style={{ background:"rgba(159,122,234,0.05)", border:"1px solid rgba(159,122,234,0.2)", color:"#0D1428", fontSize:12, outline:"none" }}/>
                <div className="flex gap-2">
                  <button onClick={() => { if(noteText.trim()) { setNotes(n => n ? n+"\n\n"+noteText.trim() : noteText.trim()); toast.success("Note saved"); } setNoteText(""); setAddNote(false); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background:"#9F7AEA", color:"#fff" }}>
                    Save Note
                  </button>
                  <button onClick={() => { setNoteText(""); setAddNote(false); }}
                    className="px-4 py-2 rounded-xl text-xs" style={{ background:"rgba(32,64,192,0.06)", color:"#5A6A88" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddNote(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
                style={{ background:"rgba(159,122,234,0.04)", color:"#8A9AB8", border:"1px solid rgba(159,122,234,0.1)" }}>
                <Edit2 size={10}/> Add note
              </button>
            )}
          </div>

          {/* Live Video Session — see client on camera while uploading */}
          <WGVideoSession
            clientId={client.id}
            clientName={client.name}
            specialistName={specialistName}
            onEnd={() => toast.success("Video session ended — billing logged")}
          />

          {/* Session Timer & Billing */}
          <WGSessionTimer
            clientId={client.id}
            clientName={client.name}
            specialistName={specialistName}
          />

          {/* Other actions */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <ScanButton folder="legal"
              onUpload={doc => { toast.success(`"${doc.name}" uploaded to ${client.name}'s vault`); setCompletionPct(p => Math.min(100, p + 5)); }}
              size="sm" label="Scan Document"/>
            <button onClick={() => toast.success(`Check-in email sent to ${client.name}`)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(72,187,120,0.1)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}>
              <Send size={12}/> Send Check-in
            </button>

            {/* Missed Call — sends scheduling link email */}
            <button onClick={() => setShowMissedCall(true)}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(246,173,85,0.08)", color:"#F6AD55", border:"1px solid rgba(246,173,85,0.25)" }}>
              <PhoneMissed size={12}/> No Answer — Send Scheduling Link
            </button>

            {pendingWaiver && (
              <button onClick={() => setShowWaiver(true)}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", border:"1px solid rgba(252,129,129,0.2)" }}>
                <FileText size={12}/> Review Authorization Waiver
              </button>
            )}
            <button
              onClick={() => { setCompletionPct(100); toast.success(`${client.name} marked as complete!`); }}
              className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background:"rgba(72,187,120,0.08)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.15)" }}>
              <CheckCircle size={12}/> Mark Vault Setup Complete
            </button>
          </div>
        </div>
      )}

      {/* Missed call modal */}
      {showMissedCall && (
        <MissedCallModal
          client={client}
          specialistName={specialistName}
          onClose={() => setShowMissedCall(false)}
          onSent={token => { setScheduleToken(token); setShowMissedCall(false); }}
        />
      )}

      {/* Scheduling link sent badge */}
      {scheduleToken && !client.nextSession && (
        <div className="mx-5 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background:"rgba(246,173,85,0.07)", border:"1px solid rgba(246,173,85,0.2)" }}>
          <Link size={11} color="#F6AD55"/>
          <span style={{ color:"#F6AD55", fontSize:11 }}>Scheduling link sent — waiting for {client.name.split(" ")[0]} to pick a time</span>
        </div>
      )}
    </div>
  );
}

/* ── Main portal ─────────────────────────────────────────────────── */
export function ConciergePortal({ employee, onSignOut }: { employee: ConciergeEmployee; onSignOut: () => void }) {
  const [tab, setTab] = useState<PortalTab>("clients");
  const [allClients, setAllClients] = useState<WGClient[]>([]);

  // Subscribe to shared store — picks up clients added by admin in real time
  const readStore = useCallback((updated: WGClient[]) => setAllClients(updated), []);
  useEffect(() => subscribeToClients(readStore), [readStore]);

  // Only show clients assigned to this employee (by specialist key matching employee id key)
  const specialistKey = employee.name.split(" ")[0].toLowerCase(); // "marcus", "patricia", "james"
  const myClients = allClients.filter(c =>
    employee.assignedClientIds.includes(c.id) || c.specialist === specialistKey
  );
  const roleColor = ROLE_COLORS[employee.role];

  const pendingWaivers = myClients.filter(c => {
    const w = waiverStore.find(w => w.userId === c.id);
    return w && w.status === "pending";
  }).length;

  const upcomingSessions = myClients.flatMap(c =>
    c.sessions.filter(s => s.status === "scheduled")
      .map(s => ({ ...s, clientName: c.name, clientId: c.id }))
  ).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily:"var(--font-body)" }}>
      {/* Sidebar */}
      <aside className="w-56 flex flex-col flex-shrink-0"
        style={{ background:"#0A0520", borderRight:"1px solid rgba(159,122,234,0.12)" }}>
        <div className="px-4 py-4 border-b" style={{ borderColor:"rgba(159,122,234,0.12)" }}>
          <div className="flex items-center gap-2.5">
            <img src={fpdSquareLogo} alt="FPD" style={{ width:30, height:30, borderRadius:7, objectFit:"cover" }}/>
            <div>
              <div style={{ ...DISPLAY, color:"#C4B5FD", fontSize:9, fontWeight:700, letterSpacing:"0.06em" }}>FINAL PASS DOWN</div>
              <div style={{ color:"#4A3A6A", fontSize:7, letterSpacing:"0.12em", ...MONO }}>CONCIERGE PORTAL</div>
            </div>
          </div>
        </div>

        {/* Staff badge */}
        <div className="mx-2 my-2 px-3 py-2.5 rounded-xl"
          style={{ background:`${roleColor}15`, border:`1px solid ${roleColor}30` }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
              style={{ width:32, height:32, background:`${roleColor}25`, color:roleColor, fontSize:12, ...DISPLAY }}>
              {employee.avatar}
            </div>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:11, fontWeight:600 }}>{employee.name}</div>
              <div style={{ color:roleColor, fontSize:8, ...MONO }}>{ROLE_LABELS[employee.role].toUpperCase()}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-1">
          {[
            { id:"clients" as PortalTab, label:"My Clients", icon:<Users size={14}/>, badge:myClients.length },
            { id:"inbox" as PortalTab, label:"Document Inbox", icon:<Inbox size={14}/>,
              badge: (() => { const n = employee.assignedClientIds.flatMap(id => { const t = `TOKEN_${id.replace("WG-","").padStart(3,"0")}_${["MARCUS","PATRICIA","JAMES"][employee.assignedClientIds.indexOf(id)] ?? "X"}`; return Object.values(submissionStore).flat(); }).filter(d => d.status==="pending").length; return n || undefined; })() },
            { id:"schedule" as PortalTab, label:"Schedule", icon:<Calendar size={14}/>, badge:upcomingSessions.length || undefined },
            { id:"waivers" as PortalTab, label:"Waivers", icon:<FileText size={14}/>, badge:pendingWaivers || undefined },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all text-left"
              style={{ background:tab===item.id?"rgba(159,122,234,0.15)":"transparent",
                color:tab===item.id?"#FFFFFF":"#B0C0DC",
                borderLeft:`2px solid ${tab===item.id?"#9F7AEA":"transparent"}` }}>
              <span style={{ color:tab===item.id?"#C4B5FD":"inherit" }}>{item.icon}</span>
              <span style={{ fontSize:12, fontWeight:tab===item.id?600:400, flex:1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background:tab===item.id?"rgba(255,255,255,0.15)":"rgba(159,122,234,0.2)", color:tab===item.id?"#fff":"#C4B5FD", ...MONO, fontSize:9 }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Restriction notice */}
        <div className="mx-2 mb-2 px-3 py-2 rounded-xl"
          style={{ background:"rgba(252,129,129,0.05)", border:"1px solid rgba(252,129,129,0.15)" }}>
          <div className="flex items-center gap-1.5">
            <Shield size={10} color="#FC8181"/>
            <span style={{ color:"#FC8181", fontSize:9, ...MONO }}>RESTRICTED ACCESS</span>
          </div>
          <p style={{ color:"#6B7FA8", fontSize:9, lineHeight:1.5, marginTop:2 }}>
            You can only access your {myClients.length} assigned client{myClients.length!==1?"s":""}.
          </p>
        </div>

        <div className="px-2 py-3 border-t" style={{ borderColor:"rgba(159,122,234,0.1)" }}>
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl"
            style={{ color:"#4A5A7A" }}>
            <LogOut size={13}/><span style={{ fontSize:12 }}>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ background:"rgba(255,255,255,0.98)", borderColor:"rgba(159,122,234,0.1)" }}>
          <div>
            <h1 style={{ ...DISPLAY, fontSize:18, color:"#0D1428" }}>
              {tab === "clients" ? "My Assigned Clients" : tab === "inbox" ? "Document Inbox" : tab === "schedule" ? "Upcoming Sessions" : "Authorization Waivers"}
            </h1>
            <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>
              {employee.name} · {ROLE_LABELS[employee.role]} · Last login: {employee.lastLogin ?? "Now"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"#48BB78", fontSize:10, ...MONO, fontWeight:700 }}>ONLINE</span>
            </div>
            <button style={{ color:"#8A9AB8" }}><Bell size={15}/></button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background:"#F8F4FF" }}>

          {/* ── Clients tab ── */}
          {tab === "clients" && (
            <>
              {myClients.length === 0 && (
                <div className="py-16 text-center rounded-2xl" style={GLASS}>
                  <Star size={40} color="rgba(159,122,234,0.2)" style={{ margin:"0 auto 12px" }}/>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>No clients assigned yet.</div>
                  <div style={{ color:"#6B7FA8", fontSize:12, marginTop:4 }}>Your administrator will assign clients to you shortly.</div>
                </div>
              )}
              {myClients.map(c => <ClientCard key={c.id} client={c} specialistName={employee.name}/>)}
            </>
          )}

          {/* ── Schedule tab ── */}
          {tab === "schedule" && (
            <div className="space-y-4">
              {upcomingSessions.length === 0 ? (
                <div className="py-12 text-center rounded-2xl" style={GLASS}>
                  <Calendar size={36} color="rgba(159,122,234,0.2)" style={{ margin:"0 auto 12px" }}/>
                  <div style={{ color:"#8A9AB8", fontSize:14 }}>No upcoming sessions scheduled.</div>
                </div>
              ) : (
                upcomingSessions.map(s => (
                  <div key={s.id} className="p-5 rounded-2xl" style={GLASS}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-xl"
                          style={{ width:44, height:44, background:"rgba(246,173,85,0.1)", color:"#F6AD55" }}>
                          <Calendar size={20}/>
                        </div>
                        <div>
                          <div style={{ ...DISPLAY, fontSize:15, color:"#0D1428" }}>{s.clientName}</div>
                          <div style={{ color:"#5A6A88", fontSize:12 }}>{s.date} · {s.time}</div>
                          <div className="mt-1"><SessionBadge type={s.type}/></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toast.success(`Starting ${s.type} session with ${s.clientName}`)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{ background:"rgba(159,122,234,0.1)", color:"#9F7AEA" }}>
                          {s.type === "video" ? <Video size={12}/> : <Phone size={12}/>}
                          {s.type === "video" ? "Start Video" : "Call Now"}
                        </button>
                        <button onClick={() => toast.success("Session rescheduled (demo)")}
                          className="px-3 py-2 rounded-xl text-xs"
                          style={{ background:"rgba(32,64,192,0.06)", color:"#5A6A88" }}>
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Waivers tab ── */}
          {tab === "waivers" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background:"rgba(159,122,234,0.04)", border:"1px solid rgba(159,122,234,0.15)" }}>
                <Shield size={13} color="#9F7AEA" style={{ marginTop:1 }}/>
                <p style={{ color:"#5A6A88", fontSize:12, lineHeight:1.7 }}>
                  Clients must sign their Authorization Waiver before you begin uploading documents or making changes on their behalf.
                </p>
              </div>
              {myClients.map(client => {
                const w = waiverStore.find(wv => wv.userId === client.id);
                const statusColor = !w ? "#8A9AB8" : w.status === "signed" ? "#48BB78" : "#F6AD55";
                const statusLabel = !w ? "No Waiver Sent" : w.status === "signed" ? "Signed ✓" : "Awaiting Signature";
                return (
                  <div key={client.id} className="p-5 rounded-2xl" style={GLASS}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div style={{ ...DISPLAY, fontSize:15, color:"#0D1428" }}>{client.name}</div>
                        <div style={{ color:"#8A9AB8", fontSize:11 }}>{client.email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{ background:`${statusColor}15`, color:statusColor, ...MONO }}>
                          {statusLabel.toUpperCase()}
                        </span>
                        {w?.status === "pending" && (
                          <button onClick={() => toast.success(`Reminder sent to ${client.email}`)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55" }}>
                            Send Reminder
                          </button>
                        )}
                        {!w && (
                          <button onClick={() => toast.success("Waiver send request sent to admin")}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background:"rgba(159,122,234,0.1)", color:"#9F7AEA" }}>
                            Request Waiver
                          </button>
                        )}
                      </div>
                    </div>
                    {w?.signedAt && (
                      <div style={{ color:"#48BB78", fontSize:11, marginTop:6 }}>
                        Signed by {w.signedName} on {w.signedAt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Document Inbox tab ── */}
          {tab === "inbox" && (
            <WGDocumentInbox
              employee={employee}
              assignedClientIds={employee.assignedClientIds}
            />
          )}
        </main>
      </div>
    </div>
  );
}
