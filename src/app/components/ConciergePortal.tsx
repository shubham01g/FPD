/**
 * ConciergePortal
 * Restricted dashboard for White Glove staff employees.
 * Only shows the clients assigned to the logged-in employee.
 * No access to master admin, revenue, other users, or system settings.
 *
 * Runs on real data (services/conciergeApi.ts → /concierge routes,
 * migration 051). It used to read in-memory stores that were empty on every
 * load, and its emails, calendar invites, uploads and calls were timers:
 *   - sessions are saved and the client is emailed a calendar invite;
 *   - "Start" opens the session's real meeting link (Zoom, Meet...) or
 *     dials the client; there is no built-in video;
 *   - completing a session charges the client's saved card through the
 *     same billing code the admin uses;
 *   - the authorization waiver is emailed and signed at /waiver/:token;
 *   - documents go straight into the client's vault once it is signed.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Star, LogOut, Phone, Video, Calendar, CheckCircle, Plus, X, ChevronDown, ChevronUp, Send, Clock,
  FileText, Users, Shield, Upload, AlertCircle, ExternalLink, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { type ConciergeEmployee, ROLE_LABELS, ROLE_COLORS } from "../services/conciergeStaff";
import { TwoFactorSettingsCard } from "./twofa/TwoFactorSettingsCard";
import { conciergeApi, type SessionType, type WgClientRow, type WgSession } from "../services/conciergeApi";

const GLASS: React.CSSProperties = { background:"#101728", border:"1.5px solid rgba(91,167,214,0.35)", boxShadow:"0 0 0 1px rgba(91,167,214,0.12), 0 8px 24px rgba(0,0,0,0.35)", borderRadius:22 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily:"var(--font-display)" };
const INPUT: React.CSSProperties = { background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", borderRadius:10, padding:"9px 12px", fontSize:15, color:"#FFFFFF", outline:"none", width:"100%" };
const BTN: React.CSSProperties = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 14px", borderRadius:14, fontSize:13.5, fontWeight:600, cursor:"pointer", border:"none" };

type PortalTab = "clients" | "schedule" | "waivers";

const FOLDERS = [
  ["legal", "Legal Documents"], ["financial", "Financial Records"], ["medical", "Medical Records"], ["insurance", "Insurance Policies"],
  ["property", "Property & Real Estate"], ["taxes", "Tax Records"], ["vehicles", "Vehicles"], ["personal", "Personal Letters & Messages"],
] as const;

const nameOf = (c: WgClientRow) => c.users?.full_name || c.users?.email || "Client";
const fmtWhen = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function SessionBadge({ type }: { type: SessionType }) {
  const icon = type === "phone" ? <Phone size={10}/> : type === "video" ? <Video size={10}/> : <Users size={10}/>;
  return <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background:"rgba(255,255,255,0.08)", color:"#fff" }}>{icon} {type.replace("_", " ")}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background:"rgba(7,13,26,0.7)", backdropFilter:"blur(6px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl" style={{ background:"#101728", border:"1px solid rgba(255,255,255,0.08)", maxHeight:"90vh", overflowY:"auto" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(91,110,225,0.2)" }}>
          <div style={{ ...DISPLAY, fontSize:20, color:"#E8EDF5" }}>{title}</div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }} aria-label="Close"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, marginBottom:5 }}>{children}</div>
);

/* ── Schedule / reschedule ───────────────────────────────────────── */
function ScheduleModal({ client, session, onClose, onDone }: { client: WgClientRow; session?: WgSession; onClose: () => void; onDone: () => void }) {
  const start = session ? new Date(session.scheduled_at) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; })();
  const [type, setType] = useState<SessionType>(session?.session_type ?? "video");
  const [when, setWhen] = useState(toLocalInput(start));
  const [minutes, setMinutes] = useState(session?.duration_minutes ?? 30);
  const [link, setLink] = useState(session?.meeting_url ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (type === "video" && !link.trim()) { toast.error("Add the video meeting link (Zoom, Google Meet, Teams…)"); return; }
    setBusy(true);
    try {
      const iso = new Date(when).toISOString();
      const r = session
        ? await conciergeApi.updateSession(session.id, { scheduledAt: iso, meetingUrl: link })
        : await conciergeApi.schedule(client.id, { type, scheduledAt: iso, durationMinutes: minutes, meetingUrl: link || undefined, notes: notes || undefined });
      toast.success(r.emailed ? `${session ? "Moved" : "Booked"} — invite emailed to ${client.users?.email}` : "Saved (the email could not be sent)");
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  return (
    <Modal title={session ? "Reschedule Session" : `Schedule a Session — ${nameOf(client)}`} onClose={onClose}>
      {!session && (
        <div><Label>TYPE</Label>
          <div className="flex gap-2">
            {(["video", "phone", "in_person"] as SessionType[]).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ ...BTN, flex:1, background: type === t ? "#5BA7D6" : "rgba(91,167,214,0.08)", color:"#fff" }}>
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}
      <div><Label>DATE &amp; TIME (YOUR TIME ZONE)</Label><input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={INPUT}/></div>
      {!session && <div><Label>LENGTH (MINUTES)</Label><input type="number" min={15} max={240} step={15} value={minutes} onChange={e => setMinutes(Number(e.target.value))} style={INPUT}/></div>}
      {(type !== "phone") && (
        <div><Label>{type === "video" ? "MEETING LINK *" : "LOCATION / LINK (OPTIONAL)"}</Label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://zoom.us/j/…" style={INPUT}/></div>
      )}
      {!session && <div><Label>NOTE (OPTIONAL, NOT SENT)</Label><textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...INPUT, resize:"none" }}/></div>}
      <button onClick={save} disabled={busy} style={{ ...BTN, width:"100%", background:"#5BA7D6", color:"#fff", opacity: busy ? 0.6 : 1 }}>
        <Calendar size={14}/> {busy ? "Saving…" : session ? "Move & Email Client" : "Book & Email Invite"}
      </button>
    </Modal>
  );
}

/* ── Complete a session (and charge it) ──────────────────────────── */
function CompleteModal({ client, session, onClose, onDone }: { client: WgClientRow; session: WgSession; onClose: () => void; onDone: () => void }) {
  const start = new Date(session.scheduled_at);
  const [startedAt, setStartedAt] = useState(toLocalInput(start));
  const [endedAt, setEndedAt] = useState(toLocalInput(new Date(Math.min(Date.now(), start.getTime() + (session.duration_minutes ?? 30) * 60000))));
  const [notes, setNotes] = useState(session.notes ?? "");
  const [charge, setCharge] = useState(Boolean(client.card));
  const [busy, setBusy] = useState(false);
  const minutes = Math.max(0, Math.ceil((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  const blocks = Math.max(1, Math.ceil(minutes / 30));

  const save = async () => {
    setBusy(true);
    try {
      const r = await conciergeApi.complete(session.id, { startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString(), notes, charge });
      if (!charge) toast.success("Session completed (not charged)");
      else if (r.billing?.duplicate) toast.info("Completed — this session was already charged");
      else if (r.billing?.invoiceStatus === "paid") toast.success(`Completed and charged $${Number(r.billing.session?.amount_charged ?? 0).toFixed(2)}`);
      else toast.warning(`Completed, but the card wasn't charged yet${r.billing?.message ? `: ${r.billing.message}` : ""}. Stripe will retry.`);
      onDone();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  return (
    <Modal title={`Complete Session — ${nameOf(client)}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>STARTED</Label><input type="datetime-local" value={startedAt} onChange={e => setStartedAt(e.target.value)} style={INPUT}/></div>
        <div><Label>ENDED</Label><input type="datetime-local" value={endedAt} onChange={e => setEndedAt(e.target.value)} style={INPUT}/></div>
      </div>
      <div><Label>SESSION NOTES</Label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...INPUT, resize:"none" }}/></div>
      <label className="flex items-start gap-2" style={{ color:"#E8EDF5", fontSize:14.5 }}>
        <input type="checkbox" checked={charge} disabled={!client.card} onChange={e => setCharge(e.target.checked)} style={{ marginTop:3 }}/>
        <span>
          Charge {minutes} min = {blocks} × 30-minute block{blocks === 1 ? "" : "s"} to {client.card ? `${client.card.card_brand ?? "card"} •••• ${client.card.card_last4}` : "the saved card"}
          {!client.card && <span style={{ display:"block", color:"#F6AD55", fontSize:13 }}>No card on file — the client hasn't completed White Glove setup.</span>}
        </span>
      </label>
      <button onClick={save} disabled={busy || minutes <= 0} style={{ ...BTN, width:"100%", background:"#48BB78", color:"#fff", opacity: busy || minutes <= 0 ? 0.6 : 1 }}>
        <CheckCircle size={14}/> {busy ? "Saving…" : charge ? "Complete & Charge" : "Complete Session"}
      </button>
    </Modal>
  );
}

/* ── Check-in email ──────────────────────────────────────────────── */
function EmailModal({ client, onClose }: { client: WgClientRow; onClose: () => void }) {
  const [subject, setSubject] = useState("Checking in on your vault setup");
  const [message, setMessage] = useState(`Hi ${(client.users?.full_name ?? "").split(" ")[0] || "there"},\n\n`);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await conciergeApi.email(client.id, subject, message); toast.success(`Email sent to ${client.users?.email}`); onClose(); }
    catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };
  return (
    <Modal title={`Email ${nameOf(client)}`} onClose={onClose}>
      <div style={{ color:"#8A9AB8", fontSize:14 }}>To {client.users?.email} · replies come to you</div>
      <div><Label>SUBJECT</Label><input value={subject} onChange={e => setSubject(e.target.value)} style={INPUT}/></div>
      <div><Label>MESSAGE</Label><textarea rows={7} value={message} onChange={e => setMessage(e.target.value)} style={{ ...INPUT, resize:"vertical" }}/></div>
      <button onClick={send} disabled={busy} style={{ ...BTN, width:"100%", background:"#5BA7D6", color:"#fff", opacity: busy ? 0.6 : 1 }}>
        <Send size={14}/> {busy ? "Sending…" : "Send Email"}
      </button>
    </Modal>
  );
}

/* ── Client card ─────────────────────────────────────────────────── */
function ClientCard({ client, onChanged }: { client: WgClientRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pct, setPct] = useState(client.completion_pct);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | { kind: "schedule" } | { kind: "move"; s: WgSession } | { kind: "complete"; s: WgSession } | { kind: "email" }>(null);
  const [folder, setFolder] = useState<string>("legal");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setPct(client.completion_pct), [client.completion_pct]);

  const signed = client.waiver?.status === "signed";
  const sessions = [...(client.wg_sessions ?? [])].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
  /* `ok` is the success message, or a function of the server's answer (so a
     toast can say "emailed" only when the email really went out). */
  const run = async <R,>(fn: () => Promise<R>, ok?: string | ((r: R) => string)) => {
    setBusy(true);
    try { const r = await fn(); if (ok) toast.success(typeof ok === "function" ? ok(r) : ok); onChanged(); } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const addNote = () => run(async () => {
    if (!noteText.trim()) return;
    const stamp = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
    await conciergeApi.updateClient(client.id, { notes: [client.notes, `${stamp}: ${noteText.trim()}`].filter(Boolean).join("\n\n") });
    setNoteText("");
  }, "Note saved");

  const upload = (files: FileList | null) => run(async () => {
    for (const f of Array.from(files ?? [])) {
      await conciergeApi.uploadDocument(client.id, f, folder);
      toast.success(`"${f.name}" added to ${nameOf(client)}'s vault`);
    }
  });

  return (
    <div style={GLASS}>
      <button className="w-full text-left p-5" onClick={() => setOpen(o => !o)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div style={{ ...DISPLAY, fontSize:20, color:"#E8EDF5" }}>{nameOf(client)}</div>
            <div style={{ color:"#8A9AB8", fontSize:14 }}>{client.users?.email}{client.users?.phone ? ` · ${client.users.phone}` : ""}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(91,167,214,0.15)", color:"#9CC7E6", ...MONO }}>{client.status.toUpperCase()}</span>
            {open ? <ChevronUp size={16} color="#8A9AB8"/> : <ChevronDown size={16} color="#8A9AB8"/>}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span style={{ color:"#8A9AB8", fontSize:14 }}>Vault completion</span>
            <span style={{ color:"#6FAE8B", fontSize:14, fontWeight:700 }}>{client.completion_pct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background:"rgba(91,167,214,0.1)" }}>
            <div className="h-2 rounded-full" style={{ width:`${client.completion_pct}%`, background:"linear-gradient(90deg,#5BA7D6,#6F9E94)" }}/>
          </div>
        </div>
        {client.next_session_at && (
          <div className="flex items-center gap-2 mt-3" style={{ color:"#F6AD55", fontSize:14 }}><Clock size={12}/> Next: {fmtWhen(client.next_session_at)}</div>
        )}
        <div className="flex items-center gap-2 mt-2" style={{ fontSize:14, color: signed ? "#48BB78" : "#FC8181" }}>
          {signed ? <><Shield size={12}/> Waiver signed by {client.waiver?.signed_name}</> : <><AlertCircle size={12}/> {client.waiver?.status === "pending" ? "Waiver sent — awaiting signature" : "Authorization waiver not signed"}</>}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t space-y-5" style={{ borderColor:"rgba(91,167,214,0.1)" }}>
          {client.reason && (
            <div className="pt-4"><Label>INTAKE REASON</Label><div style={{ color:"#C7D0E3", fontSize:15, lineHeight:1.7 }}>{client.reason}</div></div>
          )}

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <Label>SESSIONS ({sessions.length})</Label>
              <button onClick={() => setModal({ kind: "schedule" })} style={{ ...BTN, padding:"5px 10px", background:"rgba(91,167,214,0.1)", color:"#9CC7E6" }}><Plus size={11}/> Schedule</button>
            </div>
            {sessions.length === 0 && <div style={{ color:"#6B7FA8", fontSize:14 }}>No sessions yet.</div>}
            <div className="space-y-2">
              {sessions.map(s => (
                <div key={s.id} className="p-3 rounded-2xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SessionBadge type={s.session_type}/>
                    <span style={{ color:"#E8EDF5", fontSize:14.5 }}>{fmtWhen(s.scheduled_at)}</span>
                    <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO }}>{s.status.toUpperCase()}{s.duration_minutes ? ` · ${s.duration_minutes} MIN` : ""}</span>
                  </div>
                  {s.notes && <div style={{ color:"#8A9AB8", fontSize:13.5, marginTop:4, whiteSpace:"pre-wrap" }}>{s.notes}</div>}
                  {s.status === "scheduled" && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <StartButton session={s} client={client}/>
                      <button onClick={() => setModal({ kind: "complete", s })} style={{ ...BTN, padding:"5px 10px", background:"rgba(72,187,120,0.12)", color:"#7FD6A0" }}><CheckCircle size={11}/> Complete</button>
                      <button onClick={() => setModal({ kind: "move", s })} style={{ ...BTN, padding:"5px 10px", background:"rgba(255,255,255,0.05)", color:"#C7D0E3" }}>Reschedule</button>
                      <button onClick={() => run(() => conciergeApi.updateSession(s.id, { status: "cancelled" }), (r: { emailed?: boolean }) => r?.emailed ? "Cancelled — client emailed" : "Cancelled (the email to the client could not be sent)")} style={{ ...BTN, padding:"5px 10px", background:"rgba(252,129,129,0.08)", color:"#FC8181" }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>MY NOTES</Label>
            {client.notes && <div className="px-3 py-2.5 rounded-2xl mb-2" style={{ background:"rgba(91,167,214,0.04)", color:"#C7D0E3", fontSize:14.5, whiteSpace:"pre-wrap", lineHeight:1.6 }}>{client.notes}</div>}
            <div className="flex gap-2">
              <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note…" style={INPUT}/>
              <button onClick={addNote} disabled={busy || !noteText.trim()} style={{ ...BTN, background:"#5BA7D6", color:"#fff", opacity: busy || !noteText.trim() ? 0.5 : 1 }}>Save</button>
            </div>
          </div>

          <div>
            <Label>VAULT COMPLETION</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setPct(Number(e.target.value))} style={{ flex:1 }}/>
              <span style={{ color:"#E8EDF5", width:42, ...MONO }}>{pct}%</span>
              <button onClick={() => run(() => conciergeApi.updateClient(client.id, { completionPct: pct }), "Progress saved")} disabled={busy || pct === client.completion_pct}
                style={{ ...BTN, background:"rgba(91,167,214,0.12)", color:"#9CC7E6", opacity: pct === client.completion_pct ? 0.5 : 1 }}>Save</button>
            </div>
          </div>

          <div>
            <Label>UPLOAD TO {nameOf(client).toUpperCase()}'S VAULT</Label>
            {signed ? (
              <div className="flex gap-2">
                <select value={folder} onChange={e => setFolder(e.target.value)} style={{ ...INPUT, width:"auto", flex:1 }}>
                  {FOLDERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ ...BTN, background:"#5BA7D6", color:"#fff", opacity: busy ? 0.6 : 1 }}><Upload size={13}/> {busy ? "Working…" : "Choose files"}</button>
                <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx" capture={undefined} onChange={e => { void upload(e.target.files); e.target.value = ""; }}/>
              </div>
            ) : (
              <div style={{ color:"#F6AD55", fontSize:14 }}>Uploading is locked until the client signs the authorization waiver.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setModal({ kind: "email" })} style={{ ...BTN, background:"rgba(72,187,120,0.1)", color:"#D99A6B" }}><Send size={12}/> Email Client</button>
            {!signed && (
              <button onClick={() => run(() => conciergeApi.sendWaiver(client.id), client.waiver?.status === "pending" ? "New waiver link emailed" : "Waiver emailed")}
                disabled={busy} style={{ ...BTN, background:"rgba(252,129,129,0.08)", color:"#FC8181" }}>
                <FileText size={12}/> {client.waiver?.status === "pending" ? "Resend Waiver" : "Send Waiver"}
              </button>
            )}
            {client.status !== "completed" && (
              <button onClick={() => run(() => conciergeApi.updateClient(client.id, { status: "completed", completionPct: 100 }), `${nameOf(client)} marked complete`)}
                disabled={busy} className="col-span-2" style={{ ...BTN, background:"rgba(72,187,120,0.08)", color:"#7FD6A0" }}>
                <CheckCircle size={12}/> Mark Vault Setup Complete
              </button>
            )}
          </div>
        </div>
      )}

      {modal?.kind === "schedule" && <ScheduleModal client={client} onClose={() => setModal(null)} onDone={() => { setModal(null); onChanged(); }}/>}
      {modal?.kind === "move" && <ScheduleModal client={client} session={modal.s} onClose={() => setModal(null)} onDone={() => { setModal(null); onChanged(); }}/>}
      {modal?.kind === "complete" && <CompleteModal client={client} session={modal.s} onClose={() => setModal(null)} onDone={() => { setModal(null); onChanged(); }}/>}
      {modal?.kind === "email" && <EmailModal client={client} onClose={() => setModal(null)}/>}
    </div>
  );
}

/* Opens the session's meeting link, or dials the client for a phone call. */
function StartButton({ session, client }: { session: WgSession; client: WgClientRow }) {
  const phone = client.users?.phone?.replace(/[^\d+]/g, "");
  if (session.meeting_url) {
    return (
      <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" style={{ ...BTN, padding:"5px 10px", background:"rgba(91,167,214,0.15)", color:"#9CC7E6", textDecoration:"none" }}>
        <ExternalLink size={11}/> Join
      </a>
    );
  }
  if (session.session_type === "phone" && phone) {
    return <a href={`tel:${phone}`} style={{ ...BTN, padding:"5px 10px", background:"rgba(91,167,214,0.15)", color:"#9CC7E6", textDecoration:"none" }}><Phone size={11}/> Call</a>;
  }
  return null;
}

/* ── Main portal ─────────────────────────────────────────────────── */
export function ConciergePortal({ employee, onSignOut }: { employee: ConciergeEmployee; onSignOut: () => void }) {
  const [tab, setTab] = useState<PortalTab>("clients");
  const [clients, setClients] = useState<WgClientRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setClients((await conciergeApi.clients()).clients); setError(null); }
    catch (err) { setError((err as Error).message); setClients([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const myClients = clients ?? [];
  const roleColor = ROLE_COLORS[employee.role];
  const pendingWaivers = myClients.filter(c => c.waiver?.status !== "signed").length;
  const upcoming = myClients.flatMap(c => (c.wg_sessions ?? []).filter(s => s.status === "scheduled").map(s => ({ s, c })))
    .sort((a, b) => a.s.scheduled_at.localeCompare(b.s.scheduled_at));

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily:"var(--font-body)" }}>
      <aside className="w-56 flex flex-col flex-shrink-0" style={{ background:"#060B16", borderRight:"1px solid rgba(91,167,214,0.12)" }}>
        <div className="px-4 py-4 border-b" style={{ borderColor:"rgba(91,167,214,0.12)" }}>
          <img src={fpdFullLogo} alt="Final Pass Down" style={{ height:32, width:49, borderRadius:6, objectFit:"contain", display:"block", marginBottom:4 }}/>
          <div style={{ color:"#34456A", fontSize:9, letterSpacing:"0.12em", ...MONO }}>CONCIERGE PORTAL</div>
        </div>
        <div className="mx-2 my-2 px-3 py-2.5 rounded-2xl" style={{ background:`${roleColor}15`, border:`1px solid ${roleColor}30` }}>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0" style={{ width:32, height:32, background:`${roleColor}25`, color:roleColor, fontSize:15, ...DISPLAY }}>{employee.avatar}</div>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:14, fontWeight:600 }}>{employee.name}</div>
              <div style={{ color:roleColor, fontSize:10, ...MONO }}>{ROLE_LABELS[employee.role].toUpperCase()}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-1">
          {[
            { id:"clients" as PortalTab, label:"My Clients", icon:<Users size={14}/>, badge: myClients.length || undefined },
            { id:"schedule" as PortalTab, label:"Schedule", icon:<Calendar size={14}/>, badge: upcoming.length || undefined },
            { id:"waivers" as PortalTab, label:"Waivers", icon:<FileText size={14}/>, badge: pendingWaivers || undefined },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className="w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left"
              style={{ background:tab===item.id?"rgba(91,167,214,0.15)":"transparent", color:tab===item.id?"#FFFFFF":"#B0C0DC", borderLeft:`2px solid ${tab===item.id?"#5BA7D6":"transparent"}` }}>
              {item.icon}<span style={{ fontSize:15, flex:1 }}>{item.label}</span>
              {item.badge !== undefined && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background:"rgba(91,167,214,0.2)", color:"#D68FA8", ...MONO, fontSize:11 }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="mx-2 mb-2 px-3 py-2 rounded-2xl" style={{ background:"rgba(252,129,129,0.05)", border:"1px solid rgba(252,129,129,0.15)" }}>
          <div className="flex items-center gap-1.5"><Shield size={10} color="#FC8181"/><span style={{ color:"#FC8181", fontSize:11, ...MONO }}>RESTRICTED ACCESS</span></div>
          <p style={{ color:"#6B7FA8", fontSize:11, lineHeight:1.5, marginTop:2 }}>You can only access your {myClients.length} assigned client{myClients.length!==1?"s":""}.</p>
        </div>
        <div className="px-2 py-3 border-t" style={{ borderColor:"rgba(91,167,214,0.1)" }}>
          <button onClick={onSignOut} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-2xl" style={{ color:"#8A9AB8" }}><LogOut size={13}/><span style={{ fontSize:15 }}>Sign Out</span></button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ background:"rgba(10,10,15,0.98)", borderColor:"rgba(91,167,214,0.16)" }}>
          <div>
            <h1 style={{ ...DISPLAY, fontSize:22.5, color:"#E8EDF5" }}>{tab === "clients" ? "My Assigned Clients" : tab === "schedule" ? "Upcoming Sessions" : "Authorization Waivers"}</h1>
            <div style={{ color:"#6B7FA8", fontSize:12.5, ...MONO }}>{employee.name} · {ROLE_LABELS[employee.role]}</div>
          </div>
          <button onClick={() => void load()} style={{ ...BTN, background:"rgba(91,167,214,0.08)", color:"#9CC7E6" }}><RefreshCw size={13}/> Refresh</button>
        </header>

        <main className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background:"#070A12" }}>
          {error && <div className="p-4 rounded-2xl" style={{ background:"rgba(252,129,129,0.08)", color:"#FC8181", fontSize:15 }}>{error}</div>}
          {clients === null && <div style={{ color:"#8A9AB8" }}>Loading…</div>}

          {tab === "clients" && clients && (
            <>
              <TwoFactorSettingsCard eyebrow="YOUR STAFF ACCOUNT" portalName="Concierge Portal"
                rationale="This portal opens your clients' records. Protect it with an authenticator app — a password on its own is not enough."
                downloadName="final-pass-down-concierge-backup-codes.txt"/>
              {myClients.length === 0 && !error && (
                <div className="py-16 text-center rounded-2xl" style={GLASS}>
                  <Star size={40} color="rgba(91,167,214,0.2)" style={{ margin:"0 auto 12px" }}/>
                  <div style={{ color:"#8A9AB8", fontSize:17.5 }}>No clients assigned yet.</div>
                  <div style={{ color:"#6B7FA8", fontSize:15, marginTop:4 }}>Your administrator assigns clients in White Glove Admin.</div>
                </div>
              )}
              {myClients.map(c => <ClientCard key={c.id} client={c} onChanged={() => void load()}/>)}
            </>
          )}

          {tab === "schedule" && clients && (
            upcoming.length === 0 ? (
              <div className="py-12 text-center rounded-2xl" style={GLASS}>
                <Calendar size={36} color="rgba(91,167,214,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"#8A9AB8", fontSize:17.5 }}>No upcoming sessions. Schedule one from a client's card.</div>
              </div>
            ) : upcoming.map(({ s, c }) => (
              <div key={s.id} className="p-5 rounded-2xl flex items-center justify-between gap-3 flex-wrap" style={GLASS}>
                <div>
                  <div style={{ ...DISPLAY, fontSize:19, color:"#E8EDF5" }}>{nameOf(c)}</div>
                  <div style={{ color:"#8A9AB8", fontSize:15 }}>{fmtWhen(s.scheduled_at)} · {s.duration_minutes ?? 30} min</div>
                  <div className="mt-1"><SessionBadge type={s.session_type}/></div>
                </div>
                <StartButton session={s} client={c}/>
              </div>
            ))
          )}

          {tab === "waivers" && clients && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background:"rgba(91,167,214,0.04)", border:"1px solid rgba(91,167,214,0.15)" }}>
                <Shield size={13} color="#FFFFFF" style={{ marginTop:2 }}/>
                <p style={{ color:"#8A9AB8", fontSize:15, lineHeight:1.7 }}>Clients sign their Authorization Waiver from a link we email them. Uploading to their vault unlocks once it is signed.</p>
              </div>
              {myClients.map(c => {
                const w = c.waiver;
                const color = w?.status === "signed" ? "#48BB78" : w?.status === "pending" ? "#F6AD55" : "#8A9AB8";
                const label = w?.status === "signed" ? "Signed" : w?.status === "pending" ? "Awaiting signature" : "Not sent";
                return (
                  <div key={c.id} className="p-5 rounded-2xl flex items-center justify-between gap-3 flex-wrap" style={GLASS}>
                    <div>
                      <div style={{ ...DISPLAY, fontSize:19, color:"#E8EDF5" }}>{nameOf(c)}</div>
                      <div style={{ color:"#8A9AB8", fontSize:14 }}>{c.users?.email}</div>
                      {w?.signed_at && <div style={{ color:"#7FD6A0", fontSize:14, marginTop:4 }}>Signed by {w.signed_name} on {new Date(w.signed_at).toLocaleDateString("en-US")}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background:`${color}20`, color, ...MONO }}>{label.toUpperCase()}</span>
                      {w?.status !== "signed" && (
                        <button onClick={async () => { try { await conciergeApi.sendWaiver(c.id); toast.success("Waiver emailed"); void load(); } catch (err) { toast.error((err as Error).message); } }}
                          style={{ ...BTN, padding:"6px 12px", background:"rgba(91,167,214,0.1)", color:"#9CC7E6" }}>
                          {w?.status === "pending" ? "Resend" : "Send Waiver"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
