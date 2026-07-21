/**
 * MessagesToLovedOnes — personal messages held in escrow and released later.
 *
 * Distinct from Digital Diary (a private journal for yourself) and from
 * Memories (shared media). A message here is addressed to one named person and
 * has a delivery trigger: on your passing, on a fixed date, or on a recurring
 * birthday/anniversary. Nothing is sent until its trigger fires.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, Plus, X, Mic, Video, FileText, Play, Pause, Square, Trash2,
  Clock, CalendarDays, Send, Lock, CheckCircle2, Pencil, Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Page, PageHeader, Card, CardTitle, StatGrid, TabBar, EmptyState,
  PrimaryButton, GhostButton, Pill, MONO, type TabDef,
} from "./ui/PageShell";

type Medium = "letter" | "voice" | "video";
type Trigger = "on_passing" | "on_date" | "birthday" | "anniversary";
type Status = "draft" | "sealed" | "delivered";

interface Message {
  id: string;
  title: string;
  recipient: string;
  relationship: string;
  medium: Medium;
  trigger: Trigger;
  triggerDate?: string;
  status: Status;
  body: string;
  duration?: string;
  /** Object URL for a locally recorded voice/video blob (demo-only, not persisted). */
  mediaUrl?: string;
  created: string;
  /** Sealed messages are read-only until unsealed — mirrors the real escrow rule. */
  sealedOn?: string;
}

const MEDIUM_META: Record<Medium, { label: string; icon: React.ReactNode; color: string }> = {
  letter: { label: "Letter", icon: <FileText size={14} />, color: "#3A5BD9" },
  voice:  { label: "Voice",  icon: <Mic size={14} />,      color: "#48BB78" },
  video:  { label: "Video",  icon: <Video size={14} />,    color: "#FC8181" },
};

const TRIGGER_META: Record<Trigger, { label: string; short: string; color: string }> = {
  on_passing:  { label: "Delivered after my passing",     short: "On passing",   color: "#8AA0FF" },
  on_date:     { label: "Delivered on a specific date",   short: "On date",      color: "#F6AD55" },
  birthday:    { label: "Delivered each birthday",        short: "Birthday",     color: "#FC8181" },
  anniversary: { label: "Delivered each anniversary",     short: "Anniversary",  color: "#ED8936" },
};

const STATUS_META: Record<Status, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "#8A9AB8" },
  sealed:    { label: "Sealed",    color: "#48BB78" },
  delivered: { label: "Delivered", color: "#5B7BF5" },
};

/** Trigger dates are stored as ISO (what <input type="date"> gives us) but
 *  must never be shown raw — "2028-07-24" reads as a database field, not a date. */
const fmtTriggerDate = (isoStr?: string) => {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-").map(Number);
  if (!y || !m || !d) return isoStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const RECIPIENTS = [
  { name: "Sarah Johnson", relationship: "Spouse" },
  { name: "Michael Doe",   relationship: "Son" },
  { name: "Emily Doe",     relationship: "Daughter" },
  { name: "Tyler Doe",     relationship: "Grandson" },
  { name: "Lily Doe",      relationship: "Granddaughter" },
  { name: "Robert Doe",    relationship: "Brother" },
];

const INITIAL: Message[] = [
  {
    id: "m1", title: "To my wife, on the day I'm gone", recipient: "Sarah Johnson", relationship: "Spouse",
    medium: "letter", trigger: "on_passing", status: "sealed", created: "Mar 2, 2026", sealedOn: "Mar 2, 2026",
    body: "Sarah — if you're reading this, it means I ran out of time before I ran out of things to say to you. Thirty-eight years and I still never got tired of watching you make coffee in the morning. Don't stay in the house if it's too quiet. Go see Emily. Take the Mustang out at least once a year and let it be loud.",
  },
  {
    id: "m2", title: "Advice for when you buy your first house", recipient: "Michael Doe", relationship: "Son",
    medium: "voice", trigger: "on_passing", status: "sealed", created: "Feb 14, 2026", sealedOn: "Feb 14, 2026",
    duration: "12:04",
    body: "Recorded walkthrough of everything I learned buying and losing property — the 1998 mistake, the inspection I skipped, and what I'd do differently.",
  },
  {
    id: "m3", title: "Happy 21st, Tyler", recipient: "Tyler Doe", relationship: "Grandson",
    medium: "video", trigger: "birthday", triggerDate: "2032-12-02", status: "sealed", created: "Jan 20, 2026",
    sealedOn: "Jan 20, 2026", duration: "6:38",
    body: "A message for Tyler's 21st birthday — recorded while he was still ten, so he can see what his grandfather looked like when he still had all his hair.",
  },
  {
    id: "m4", title: "For Emily — the letter I should have written in 2019", recipient: "Emily Doe", relationship: "Daughter",
    medium: "letter", trigger: "on_passing", status: "draft", created: "Jun 11, 2026",
    body: "Em — I've started this one four times. What I want to say is that the year we didn't speak was my fault, not yours, and I never found the right moment to say it out loud...",
  },
  {
    id: "m5", title: "Our 40th anniversary", recipient: "Sarah Johnson", relationship: "Spouse",
    medium: "video", trigger: "anniversary", triggerDate: "2028-07-24", status: "sealed", created: "May 30, 2026",
    sealedOn: "May 30, 2026", duration: "4:12",
    body: "In case I don't make it to forty — a message to play on the day.",
  },
];

/* ── Recorder — real capture via getUserMedia + MediaRecorder.
   This must genuinely record: a user leaving a goodbye video has no way to
   discover a simulated capture failed, and by the time anyone checks they are
   not around to re-record it. Matches the pattern already used in
   DigitalDiary.tsx and FamilyMemories.tsx. ── */
function RecorderPanel({ medium, onCapture }: { medium: Medium; onCapture: (dur: string, blob: Blob, url: string) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle");
  const [secs, setSecs] = useState(0);
  const [denied, setDenied] = useState(false);
  const timer = useRef<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const preview = useRef<HTMLVideoElement | null>(null);
  const secsRef = useRef(0);

  /* Keep a ref alongside state — MediaRecorder.onstop closes over stale state. */
  const tick = () => setSecs(s => { secsRef.current = s + 1; return s + 1; });

  /* Release camera/mic if the modal closes mid-recording. */
  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    stream.current?.getTracks().forEach(t => t.stop());
  }, []);

  const start = async () => {
    try {
      const constraints = medium === "voice" ? { audio: true } : { audio: true, video: true };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      stream.current = s;
      if (medium === "video" && preview.current) {
        preview.current.srcObject = s;
        await preview.current.play().catch(() => {});
      }
      chunks.current = [];
      const mr = new MediaRecorder(s);
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const type = medium === "voice" ? "audio/webm" : "video/webm";
        const blob = new Blob(chunks.current, { type });
        const d = secsRef.current;
        const dur = `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
        s.getTracks().forEach(t => t.stop());
        stream.current = null;
        if (blob.size === 0) {
          toast.error("Nothing was captured — please try again.");
          return;
        }
        onCapture(dur, blob, URL.createObjectURL(blob));
        toast.success(`${MEDIUM_META[medium].label} recorded — ${dur}`);
      };
      mr.start();
      recorder.current = mr;
      setDenied(false);
      setState("recording");
      secsRef.current = 0;
      setSecs(0);
      timer.current = window.setInterval(tick, 1000);
    } catch {
      setDenied(true);
      toast.error(medium === "voice"
        ? "Microphone access denied. Allow microphone access to record."
        : "Camera access denied. Allow camera and microphone access to record.");
    }
  };

  const pause = () => {
    recorder.current?.pause();
    setState("paused");
    if (timer.current) window.clearInterval(timer.current);
  };
  const resume = () => {
    recorder.current?.resume();
    setState("recording");
    timer.current = window.setInterval(tick, 1000);
  };
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    recorder.current?.stop();
    recorder.current = null;
    setState("idle");
    setSecs(0);
  };

  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const color = MEDIUM_META[medium].color;

  return (
    <div className="rounded-xl" style={{ background: "#141B2E", border: `1px solid ${color}33`, padding: 20, textAlign: "center" }}>
      {/* Live camera preview — so the user can see they are actually on camera */}
      {medium === "video" && (
        <video
          ref={preview}
          muted
          playsInline
          style={{
            width: "100%", maxHeight: 200, borderRadius: 12, background: "#0B1120",
            marginBottom: 12, objectFit: "cover",
            display: state === "idle" ? "none" : "block",
            transform: "scaleX(-1)",
          }}
        />
      )}
      <div className="flex items-center justify-center rounded-full" style={{
        width: 64, height: 64, margin: "0 auto 12px",
        background: `${color}1A`, color,
        boxShadow: state === "recording" ? `0 0 0 6px ${color}18` : "none",
        transition: "box-shadow .3s",
        display: medium === "video" && state !== "idle" ? "none" : "flex",
      }}>
        {medium === "voice" ? <Mic size={26} /> : <Video size={26} />}
      </div>

      <div style={{ fontSize: 24, ...MONO, color: state === "recording" ? color : "var(--foreground)", fontWeight: 700, marginBottom: 4 }}>
        {mm}
      </div>
      <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, marginBottom: 14 }}>
        {state === "idle" ? `Ready to record your ${MEDIUM_META[medium].label.toLowerCase()} message`
          : state === "recording" ? "Recording…" : "Paused"}
      </div>

      <div className="flex items-center justify-center gap-2">
        {state === "idle" && (
          <button onClick={start} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
            style={{ background: color, color: "#fff", fontWeight: 600 }}>
            <Play size={14} /> Start Recording
          </button>
        )}
        {state === "recording" && (
          <>
            <button onClick={pause} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(246,173,85,0.15)", color: "#F6AD55", fontWeight: 600 }}>
              <Pause size={14} /> Pause
            </button>
            <button onClick={stop} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(229,62,62,0.15)", color: "#FC8181", fontWeight: 600 }}>
              <Square size={13} /> Stop & Save
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button onClick={resume} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: `${color}26`, color, fontWeight: 600 }}>
              <Play size={14} /> Resume
            </button>
            <button onClick={stop} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(229,62,62,0.15)", color: "#FC8181", fontWeight: 600 }}>
              <Square size={13} /> Stop & Save
            </button>
          </>
        )}
      </div>
      <div style={{ color: denied ? "#FC8181" : "var(--muted-foreground)", fontSize: 10.5, marginTop: 12, ...MONO }}>
        {denied
          ? `${medium === "voice" ? "MICROPHONE" : "CAMERA"} BLOCKED — ENABLE IT IN YOUR BROWSER AND RETRY`
          : "RECORDED LOCALLY IN YOUR BROWSER · NOT UPLOADED IN THIS DEMO"}
      </div>
    </div>
  );
}

/* ── Compose / edit modal ── */
function ComposeModal({
  editing, onClose, onSave,
}: { editing: Message | null; onClose: () => void; onSave: (m: Message) => void }) {
  const [form, setForm] = useState<Partial<Message>>(
    editing ?? { medium: "letter", trigger: "on_passing", status: "draft", body: "", title: "" }
  );

  const setF = <K extends keyof Message>(k: K, v: Message[K]) => setForm(p => ({ ...p, [k]: v }));

  /* Escape closes the dialog — expected of any modal, and without it the
     overlay traps clicks for anyone who opens it by accident. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!form.title?.trim()) return toast.error("Give the message a title.");
    if (!form.recipient) return toast.error("Choose who this message is for.");
    if (form.medium === "letter" && !form.body?.trim()) return toast.error("Write something before saving.");
    if (form.medium !== "letter" && !form.duration && !editing) return toast.error("Record the message before saving.");
    if ((form.trigger === "on_date" || form.trigger === "birthday" || form.trigger === "anniversary") && !form.triggerDate) {
      return toast.error("Pick the delivery date.");
    }

    const rec = RECIPIENTS.find(r => r.name === form.recipient);
    onSave({
      id: editing?.id ?? `m${Date.now()}`,
      title: form.title!.trim(),
      recipient: form.recipient!,
      relationship: rec?.relationship ?? "",
      medium: form.medium as Medium,
      trigger: form.trigger as Trigger,
      triggerDate: form.triggerDate,
      status: (form.status as Status) ?? "draft",
      body: form.body ?? "",
      duration: form.duration,
      mediaUrl: form.mediaUrl,
      created: editing?.created ?? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      sealedOn: editing?.sealedOn,
    });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(3,6,12,0.75)", backdropFilter: "blur(4px)", zIndex: 100 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="rounded-2xl fpd-scroll" style={{
        background: "var(--card)", border: "1px solid rgba(58,91,217,0.3)",
        width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
      }}>
        <div className="flex items-center justify-between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--foreground)" }}>
            {editing ? "Edit Message" : "New Message"}
          </h3>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>

        <div className="space-y-4" style={{ padding: 22 }}>
          {/* Medium picker */}
          <div>
            <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>FORMAT</label>
            <div className="grid grid-cols-3 gap-2" style={{ marginTop: 6 }}>
              {(Object.keys(MEDIUM_META) as Medium[]).map(m => {
                const meta = MEDIUM_META[m];
                const on = form.medium === m;
                return (
                  <button key={m} onClick={() => setF("medium", m)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                    style={{
                      background: on ? `${meta.color}1F` : "#141B2E",
                      border: `1px solid ${on ? meta.color : "var(--border)"}`,
                      color: on ? meta.color : "var(--muted-foreground)", fontWeight: 600, fontSize: 12.5,
                    }}>
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>TITLE *</label>
            <input className="fpd-field" style={{ marginTop: 6 }} value={form.title ?? ""}
              onChange={e => setF("title", e.target.value)}
              placeholder="e.g. To my daughter on her wedding day" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>RECIPIENT *</label>
              <select className="fpd-field" style={{ marginTop: 6 }} value={form.recipient ?? ""}
                onChange={e => setF("recipient", e.target.value)}>
                <option value="">Select a person…</option>
                {RECIPIENTS.map(r => <option key={r.name} value={r.name}>{r.name} — {r.relationship}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>DELIVERY TRIGGER</label>
              <select className="fpd-field" style={{ marginTop: 6 }} value={form.trigger ?? "on_passing"}
                onChange={e => setF("trigger", e.target.value as Trigger)}>
                {(Object.keys(TRIGGER_META) as Trigger[]).map(t => (
                  <option key={t} value={t}>{TRIGGER_META[t].label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.trigger !== "on_passing" && (
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>DELIVERY DATE *</label>
              <input type="date" className="fpd-field" style={{ marginTop: 6 }} value={form.triggerDate ?? ""}
                onChange={e => setF("triggerDate", e.target.value)} />
            </div>
          )}

          {/* Body or recorder */}
          {form.medium === "letter" ? (
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>MESSAGE *</label>
              <textarea className="fpd-field" style={{ marginTop: 6, minHeight: 160 }} value={form.body ?? ""}
                onChange={e => setF("body", e.target.value)}
                placeholder="Write what you'd want them to read…" />
              <div style={{ color: "var(--muted-foreground)", fontSize: 10.5, marginTop: 4, ...MONO }}>
                {(form.body ?? "").trim().split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          ) : (
            <div>
              <label style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, letterSpacing: "0.08em" }}>RECORDING *</label>
              <div style={{ marginTop: 6 }}>
                {form.duration ? (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "#141B2E", border: "1px solid rgba(72,187,120,0.3)" }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} color="#48BB78" />
                      <span style={{ color: "var(--foreground)", fontSize: 13 }}>Recording captured — {form.duration}</span>
                    </div>
                    <button onClick={() => setF("duration", undefined as never)} style={{ color: "#FC8181", fontSize: 12, fontWeight: 600 }}>
                      Re-record
                    </button>
                  </div>
                ) : (
                  <RecorderPanel
                    medium={form.medium as Medium}
                    onCapture={(d, _blob, url) => { setF("duration", d); setF("mediaUrl", url); }}
                  />
                )}
              </div>
              <textarea className="fpd-field" style={{ marginTop: 10, minHeight: 70 }} value={form.body ?? ""}
                onChange={e => setF("body", e.target.value)}
                placeholder="Optional description — what this recording covers" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2" style={{ padding: "16px 22px", borderTop: "1px solid var(--border)" }}>
          <GhostButton onClick={onClose} tone="#8A9AB8">Cancel</GhostButton>
          <PrimaryButton onClick={submit}>
            <Send size={14} /> {editing ? "Save Changes" : "Save Message"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export function MessagesToLovedOnes() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [tab, setTab] = useState<"all" | Medium>("all");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<Message | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter(m => {
      if (tab !== "all" && m.medium !== tab) return false;
      if (!q) return true;
      return m.title.toLowerCase().includes(q) || m.recipient.toLowerCase().includes(q) || m.body.toLowerCase().includes(q);
    });
  }, [messages, tab, query]);

  /* Group by recipient so the page reads as "who am I leaving things for" */
  const byRecipient = useMemo(() => {
    const map = new Map<string, Message[]>();
    filtered.forEach(m => {
      const list = map.get(m.recipient) ?? [];
      list.push(m);
      map.set(m.recipient, list);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const save = (m: Message) => {
    setMessages(prev => editing ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev]);
    setComposing(false);
    setEditing(null);
    toast.success(editing ? "Message updated." : `Message saved for ${m.recipient}.`);
  };

  const seal = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id
      ? { ...m, status: "sealed", sealedOn: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }
      : m));
    toast.success("Message sealed — it can't be edited until you unseal it.");
  };

  const unseal = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "draft", sealedOn: undefined } : m));
    toast.info("Message unsealed and returned to drafts.");
  };

  const remove = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    toast.success("Message deleted.");
  };

  const tabs: TabDef<"all" | Medium>[] = [
    { id: "all",    label: "All Messages", icon: <Heart size={14} />,    count: messages.length },
    { id: "letter", label: "Letters",      icon: <FileText size={14} />, count: messages.filter(m => m.medium === "letter").length },
    { id: "voice",  label: "Voice",        icon: <Mic size={14} />,      count: messages.filter(m => m.medium === "voice").length },
    { id: "video",  label: "Video",        icon: <Video size={14} />,    count: messages.filter(m => m.medium === "video").length },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="HELD IN ESCROW · RELEASED ON TRIGGER"
        icon={<Heart size={13} />}
        title="Messages to Loved Ones"
        description="Letters, voice notes and videos addressed to specific people, delivered only when their trigger fires — after your passing, on a chosen date, or every birthday. Sealing a message locks it from edits so it reads exactly as you left it."
        actions={
          <PrimaryButton onClick={() => { setEditing(null); setComposing(true); }}>
            <Plus size={15} /> New Message
          </PrimaryButton>
        }
      />

      <StatGrid
        stats={[
          { label: "Total Messages", value: messages.length, sub: `For ${new Set(messages.map(m => m.recipient)).size} people`, color: "#3A5BD9" },
          { label: "Sealed", value: messages.filter(m => m.status === "sealed").length, sub: "Locked & ready", color: "#48BB78" },
          { label: "Drafts", value: messages.filter(m => m.status === "draft").length, sub: "Not yet sealed", color: "#F6AD55" },
          { label: "Recordings", value: messages.filter(m => m.medium !== "letter").length, sub: "Voice & video", color: "#FC8181" },
        ]}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <TabBar tabs={tabs} active={tab} onChange={setTab} />
        <div className="flex items-center gap-2 px-3 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", height: 40, minWidth: 240 }}>
          <Search size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages…"
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 13, width: "100%" }} />
          {query && <button onClick={() => setQuery("")} style={{ color: "var(--muted-foreground)", display: "flex" }}><X size={13} /></button>}
        </div>
      </div>

      {byRecipient.length === 0 ? (
        <EmptyState
          icon={<Heart size={22} />}
          title={query ? "No messages match your search" : "No messages yet"}
          description={query
            ? `Nothing found for "${query}". Try a different name or phrase.`
            : "Start with one letter to one person. You can seal it later — nothing is delivered until its trigger fires."}
          action={!query && <PrimaryButton onClick={() => setComposing(true)}><Plus size={15} /> Write your first message</PrimaryButton>}
        />
      ) : (
        <div className="space-y-6">
          {byRecipient.map(([recipient, msgs]) => (
            <Card key={recipient} padding={20}>
              <CardTitle right={<Pill color="#5B7BF5">{msgs.length} message{msgs.length === 1 ? "" : "s"}</Pill>}>
                <span className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center rounded-full" style={{
                    width: 30, height: 30, background: "linear-gradient(135deg,#3A5BD9,#5B7BF5)",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                  }}>
                    {recipient.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                  {recipient}
                  <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontWeight: 400 }}>
                    {msgs[0].relationship}
                  </span>
                </span>
              </CardTitle>

              <div className="space-y-3">
                {msgs.map(m => {
                  const mm = MEDIUM_META[m.medium];
                  const tm = TRIGGER_META[m.trigger];
                  const sm = STATUS_META[m.status];
                  const open = expanded === m.id;
                  return (
                    <div key={m.id} className="rounded-xl" style={{ background: "#141B2E", border: `1px solid ${open ? mm.color + "55" : "var(--border)"}` }}>
                      <button onClick={() => setExpanded(open ? null : m.id)} className="w-full flex items-start gap-3 text-left" style={{ padding: 16 }}>
                        <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 36, height: 36, background: `${mm.color}1A`, color: mm.color }}>
                          {mm.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 5 }}>
                            <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 600 }}>{m.title}</span>
                            {m.status === "sealed" && <Lock size={11} color="#48BB78" />}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Pill color={mm.color}>{mm.label}{m.duration ? ` · ${m.duration}` : ""}</Pill>
                            <Pill color={tm.color}>{tm.short}{m.triggerDate ? ` · ${fmtTriggerDate(m.triggerDate)}` : ""}</Pill>
                            <Pill color={sm.color}>{sm.label}</Pill>
                          </div>
                          {!open && (
                            <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 7, lineHeight: 1.6, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {m.body}
                            </div>
                          )}
                        </div>
                        <span style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, flexShrink: 0 }}>{m.created}</span>
                      </button>

                      {open && (
                        <div style={{ padding: "0 16px 16px" }}>
                          {m.medium !== "letter" && (
                            <div className="px-4 py-3 rounded-xl" style={{ background: "var(--card)", border: `1px solid ${mm.color}33`, marginBottom: 12 }}>
                              {m.mediaUrl ? (
                                /* A real recording from this session — play the actual media */
                                m.medium === "video" ? (
                                  <video src={m.mediaUrl} controls playsInline
                                    style={{ width: "100%", maxHeight: 300, borderRadius: 10, background: "#0B1120" }} />
                                ) : (
                                  <audio src={m.mediaUrl} controls style={{ width: "100%" }} />
                                )
                              ) : (
                                /* Seeded demo entry — no media file behind it, so say so */
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center rounded-full flex-shrink-0"
                                    style={{ width: 38, height: 38, background: `${mm.color}26`, color: mm.color }}>
                                    <Play size={15} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ color: "var(--foreground)", fontSize: 12.5 }}>
                                      {mm.label} message · {m.duration}
                                    </div>
                                    <div style={{ color: "var(--muted-foreground)", fontSize: 10.5, ...MONO, marginTop: 3 }}>
                                      SAMPLE ENTRY — NO MEDIA FILE ATTACHED
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="px-4 py-3 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: 13.5, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                            {m.body}
                          </div>

                          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ marginTop: 12 }}>
                            <div className="flex items-center gap-1.5" style={{ color: "var(--muted-foreground)", fontSize: 11.5 }}>
                              <Clock size={12} />
                              {m.status === "sealed"
                                ? <>Sealed on {m.sealedOn} · {tm.label.toLowerCase()}</>
                                : <>Draft — not sealed, will not be delivered</>}
                            </div>
                            <div className="flex items-center gap-2">
                              {m.status === "draft" ? (
                                <>
                                  <GhostButton onClick={() => { setEditing(m); setComposing(true); }}>
                                    <Pencil size={13} /> Edit
                                  </GhostButton>
                                  <GhostButton onClick={() => seal(m.id)} tone="#48BB78">
                                    <Lock size={13} /> Seal
                                  </GhostButton>
                                </>
                              ) : (
                                <GhostButton onClick={() => unseal(m.id)} tone="#F6AD55">
                                  <Pencil size={13} /> Unseal to Edit
                                </GhostButton>
                              )}
                              <button onClick={() => remove(m.id)} title="Delete"
                                className="flex items-center justify-center rounded-xl"
                                style={{ width: 38, height: 38, background: "rgba(229,62,62,0.1)", color: "#FC8181", border: "1px solid rgba(229,62,62,0.2)" }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* How delivery works */}
      <Card padding={20}>
        <CardTitle>How Delivery Works</CardTitle>
        <div className="grid md:grid-cols-2 gap-3">
          {(Object.keys(TRIGGER_META) as Trigger[]).map(t => {
            const meta = TRIGGER_META[t];
            const n = messages.filter(m => m.trigger === t).length;
            return (
              <div key={t} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "#141B2E", border: `1px solid ${meta.color}22` }}>
                <CalendarDays size={16} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{meta.label}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 11.5, lineHeight: 1.6 }}>
                    {t === "on_passing" && "Released to the named recipient once your passing is verified by FPD and the Legacy Continuation Fee is settled."}
                    {t === "on_date" && "Sent by email on the exact date you choose, whether or not anything has happened to you."}
                    {t === "birthday" && "Sent every year on the recipient's birthday, starting from the year you pick."}
                    {t === "anniversary" && "Sent every year on the anniversary date you set."}
                  </div>
                </div>
                <Pill color={meta.color}>{n}</Pill>
              </div>
            );
          })}
        </div>
      </Card>

      {composing && (
        <ComposeModal
          editing={editing}
          onClose={() => { setComposing(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </Page>
  );
}
