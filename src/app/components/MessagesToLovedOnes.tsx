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
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#808BAA";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

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
  letter: { label: "Letter", icon: <FileText size={14} />, color: "#5B6EE1" },
  voice:  { label: "Voice",  icon: <Mic size={14} />,      color: "#48BB78" },
  video:  { label: "Video",  icon: <Video size={14} />,    color: "#FC8181" },
};

const TRIGGER_META: Record<Trigger, { label: string; short: string; color: string }> = {
  on_passing:  { label: "Delivered after my passing",     short: "On passing",   color: "#5BA7D6" },
  on_date:     { label: "Delivered on a specific date",   short: "On date",      color: "#F6AD55" },
  birthday:    { label: "Delivered each birthday",        short: "Birthday",     color: "#FC8181" },
  anniversary: { label: "Delivered each anniversary",     short: "Anniversary",  color: "#ED8936" },
};

const STATUS_META: Record<Status, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "#8A9AB8" },
  sealed:    { label: "Sealed",    color: "#48BB78" },
  delivered: { label: "Delivered", color: "#5B6EE1" },
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

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-msg so nothing else in the app is affected. */
const MSG_CSS = `
.fpd-msg{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-msg *{box-sizing:border-box;}
.fpd-msg-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-msg .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-msg .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-msg .card.pad{padding:22px;}
.fpd-msg .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-msg .sec-title{display:flex;align-items:center;gap:9px;font-family:var(--font-display);font-size:14px;font-weight:600;color:${TEXT};margin-bottom:16px;}
.fpd-msg .sec-title .tick{width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* header */
.fpd-msg .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-msg .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-msg .pg-sub{color:${MUTED};font-size:13px;max-width:640px;line-height:1.6;}
.fpd-msg .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-msg .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-msg .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-msg .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-msg .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-msg .kcell:first-child{border-left:none;}
.fpd-msg .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-msg .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-msg .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-msg .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-msg .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-msg .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-msg .kstrip{grid-template-columns:1fr 1fr;}.fpd-msg .kcell:nth-child(3){border-left:none;}.fpd-msg .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* segmented tabs + search */
.fpd-msg .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);width:fit-content;}
.fpd-msg .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-msg .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}
.fpd-msg .seg .segcount{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:rgba(255,255,255,0.1);font-family:var(--font-mono);font-size:10px;}
.fpd-msg .seg button.on .segcount{background:rgba(255,255,255,0.25);}
.fpd-msg .searchbar{display:flex;align-items:center;gap:9px;padding:0 13px;height:40px;min-width:240px;border-radius:9px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${FAINT};transition:border-color .18s,box-shadow .18s;}
.fpd-msg .searchbar:focus-within{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-msg .searchbar input{flex:1;background:transparent;border:none;outline:none;color:${TEXT};font-size:12.5px;font-family:var(--font-body);}
.fpd-msg .searchbar input::placeholder{color:${FAINT};}
.fpd-msg .searchbar button{background:none;border:none;color:${MUTED};display:flex;cursor:pointer;}

/* recipient groups + tags */
.fpd-msg .rgroup-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.fpd-msg .ravatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${ACCENT},${ACCENT2});color:#fff;font-size:11px;font-weight:700;flex-shrink:0;}
.fpd-msg .rname{font-family:var(--font-display);font-size:15px;font-weight:600;color:${TEXT};}
.fpd-msg .rrel{color:${MUTED};font-size:12px;}
.fpd-msg .tag{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}

/* message rows */
.fpd-msg .mrows{display:flex;flex-direction:column;gap:10px;}
.fpd-msg .mrow{border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);transition:border-color .18s;}
.fpd-msg .mrow-head{width:100%;display:flex;align-items:flex-start;gap:12px;padding:16px;background:none;border:none;cursor:pointer;text-align:left;font-family:var(--font-body);}
.fpd-msg .mrow-ico{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-msg .mrow-title{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:6px;}
.fpd-msg .mrow-title span.t{color:${TEXT};font-size:14px;font-weight:600;}
.fpd-msg .mrow-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.fpd-msg .mrow-preview{color:${MUTED};font-size:12px;margin-top:8px;line-height:1.6;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.fpd-msg .mrow-date{color:${FAINT};font-family:var(--font-mono);font-size:10.5px;flex-shrink:0;white-space:nowrap;}
.fpd-msg .mrow-body{padding:0 16px 16px;border-top:1px solid rgba(255,255,255,0.22);margin-top:2px;padding-top:14px;}
.fpd-msg .mrow-media{padding:12px 14px;border-radius:10px;background:#0B111D;border:1px solid rgba(255,255,255,0.22);margin-bottom:12px;}
.fpd-msg .mrow-text{padding:12px 14px;border-radius:10px;background:#0B111D;border:1px solid rgba(255,255,255,0.22);color:${SOFT};font-size:13px;line-height:1.85;white-space:pre-wrap;}
.fpd-msg .mrow-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px;}
.fpd-msg .mrow-when{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:11.5px;}
.fpd-msg .mrow-actions{display:flex;align-items:center;gap:8px;}
.fpd-msg .btn-ghost-sm{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);}
.fpd-msg .btn-del{width:36px;height:36px;border-radius:10px;background:rgba(208,107,107,0.1);color:${NEG};border:1px solid rgba(208,107,107,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.fpd-msg .sample-tag{font-family:var(--font-mono);font-size:10px;color:${MUTED};margin-top:3px;letter-spacing:0.04em;}

/* empty state */
.fpd-msg .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:54px 24px;gap:8px;}
.fpd-msg .empty-ico{width:52px;height:52px;border-radius:14px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:${ACCENT2};display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
.fpd-msg .empty-title{color:${TEXT};font-size:15px;font-weight:600;}
.fpd-msg .empty-desc{color:${MUTED};font-size:12.5px;max-width:360px;line-height:1.6;margin-bottom:6px;}

/* delivery-works notes */
.fpd-msg .dgrid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media (max-width:720px){.fpd-msg .dgrid2{grid-template-columns:1fr;}}
.fpd-msg .note{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-msg .note .nt-title{color:${TEXT};font-size:13px;font-weight:600;margin-bottom:3px;}
.fpd-msg .note .nt-desc{color:${MUTED};font-size:11.5px;line-height:1.6;}

/* recorder panel */
.fpd-msg .rec-panel{border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);padding:20px;text-align:center;}
.fpd-msg .rec-video{width:100%;max-height:200px;border-radius:12px;background:#0B111D;margin-bottom:12px;object-fit:cover;}
.fpd-msg .rec-dot{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;transition:box-shadow .3s;}
.fpd-msg .rec-time{font-family:var(--font-mono);font-size:24px;font-weight:700;margin-bottom:4px;}
.fpd-msg .rec-status{color:${MUTED};font-size:11.5px;margin-bottom:14px;}
.fpd-msg .rec-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-msg .rec-hint{font-family:var(--font-mono);font-size:10.5px;margin-top:12px;}
.fpd-msg .rec-saved{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;background:#0F1624;border:1px solid rgba(95,190,145,0.3);}
.fpd-msg .rerecord{color:${NEG};font-size:12px;font-weight:600;background:none;border:none;cursor:pointer;font-family:var(--font-body);}

/* medium picker in compose modal */
.fpd-msg .medium-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.fpd-msg .medium-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:13px 8px;border-radius:12px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${MUTED};transition:all .16s;}
.fpd-msg .word-count{font-family:var(--font-mono);font-size:10.5px;color:${FAINT};margin-top:5px;}

/* modal */
.fpd-msg .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-msg .modal{width:100%;max-width:620px;max-height:90vh;overflow-y:auto;}
.fpd-msg .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-msg .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-msg .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-msg .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-msg .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-msg .field input,.fpd-msg .field select,.fpd-msg .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-msg .field input::placeholder,.fpd-msg .field textarea::placeholder{color:${FAINT};}
.fpd-msg .field input:focus,.fpd-msg .field select:focus,.fpd-msg .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-msg .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media (max-width:520px){.fpd-msg .field-row{grid-template-columns:1fr;}}
.fpd-msg .modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-msg .save{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-msg .save:hover{filter:brightness(1.08);}
`;

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
    <div className="rec-panel" style={{ borderColor: `${color}33` }}>
      {/* Live camera preview — so the user can see they are actually on camera */}
      {medium === "video" && (
        <video
          ref={preview}
          muted
          playsInline
          className="rec-video"
          style={{ display: state === "idle" ? "none" : "block", transform: "scaleX(-1)" }}
        />
      )}
      <div className="rec-dot" style={{
        background: `${color}1A`, color,
        boxShadow: state === "recording" ? `0 0 0 6px ${color}18` : "none",
        display: medium === "video" && state !== "idle" ? "none" : "flex",
      }}>
        {medium === "voice" ? <Mic size={26} /> : <Video size={26} />}
      </div>

      <div className="rec-time" style={{ color: state === "recording" ? color : TEXT }}>
        {mm}
      </div>
      <div className="rec-status">
        {state === "idle" ? `Ready to record your ${MEDIUM_META[medium].label.toLowerCase()} message`
          : state === "recording" ? "Recording…" : "Paused"}
      </div>

      <div className="flex items-center justify-center gap-2">
        {state === "idle" && (
          <button onClick={start} className="rec-btn" style={{ background: color, color: "#fff" }}>
            <Play size={14} /> Start Recording
          </button>
        )}
        {state === "recording" && (
          <>
            <button onClick={pause} className="rec-btn" style={{ background: `${WARN}26`, color: WARN }}>
              <Pause size={14} /> Pause
            </button>
            <button onClick={stop} className="rec-btn" style={{ background: `${NEG}26`, color: NEG }}>
              <Square size={13} /> Stop &amp; Save
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button onClick={resume} className="rec-btn" style={{ background: `${color}26`, color }}>
              <Play size={14} /> Resume
            </button>
            <button onClick={stop} className="rec-btn" style={{ background: `${NEG}26`, color: NEG }}>
              <Square size={13} /> Stop &amp; Save
            </button>
          </>
        )}
      </div>
      <div className="rec-hint" style={{ color: denied ? NEG : FAINT }}>
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
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card modal glow-surface">
        <div className="modal-head">
          <h3>{editing ? "Edit Message" : "New Message"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Medium picker */}
          <div className="field">
            <label>Format</label>
            <div className="medium-grid">
              {(Object.keys(MEDIUM_META) as Medium[]).map(m => {
                const meta = MEDIUM_META[m];
                const on = form.medium === m;
                return (
                  <button key={m} onClick={() => setF("medium", m)} className="medium-btn"
                    style={{
                      background: on ? `${meta.color}1F` : "#0F1624",
                      borderColor: on ? meta.color : "rgba(255,255,255,0.09)",
                      color: on ? meta.color : MUTED,
                    }}>
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label>Title *</label>
            <input value={form.title ?? ""}
              onChange={e => setF("title", e.target.value)}
              placeholder="e.g. To my daughter on her wedding day" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Recipient *</label>
              <select value={form.recipient ?? ""} onChange={e => setF("recipient", e.target.value)}>
                <option value="">Select a person…</option>
                {RECIPIENTS.map(r => <option key={r.name} value={r.name}>{r.name} — {r.relationship}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Delivery Trigger</label>
              <select value={form.trigger ?? "on_passing"} onChange={e => setF("trigger", e.target.value as Trigger)}>
                {(Object.keys(TRIGGER_META) as Trigger[]).map(t => (
                  <option key={t} value={t}>{TRIGGER_META[t].label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.trigger !== "on_passing" && (
            <div className="field">
              <label>Delivery Date *</label>
              <input type="date" value={form.triggerDate ?? ""} onChange={e => setF("triggerDate", e.target.value)} />
            </div>
          )}

          {/* Body or recorder */}
          {form.medium === "letter" ? (
            <div className="field">
              <label>Message *</label>
              <textarea style={{ minHeight: 160 }} value={form.body ?? ""}
                onChange={e => setF("body", e.target.value)}
                placeholder="Write what you'd want them to read…" />
              <div className="word-count">{(form.body ?? "").trim().split(/\s+/).filter(Boolean).length} words</div>
            </div>
          ) : (
            <div className="field">
              <label>Recording *</label>
              {form.duration ? (
                <div className="rec-saved">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} color={POS} />
                    <span style={{ color: TEXT, fontSize: 13 }}>Recording captured — {form.duration}</span>
                  </div>
                  <button className="rerecord" onClick={() => setF("duration", undefined as never)}>Re-record</button>
                </div>
              ) : (
                <RecorderPanel
                  medium={form.medium as Medium}
                  onCapture={(d, _blob, url) => { setF("duration", d); setF("mediaUrl", url); }}
                />
              )}
              <textarea style={{ marginTop: 10, minHeight: 70 }} value={form.body ?? ""}
                onChange={e => setF("body", e.target.value)}
                placeholder="Optional description — what this recording covers" />
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-sec" onClick={onClose}>Cancel</button>
          <button className="save" onClick={submit}>
            <Send size={14} /> {editing ? "Save Changes" : "Save Message"}
          </button>
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

  const tabs: { id: "all" | Medium; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "all",    label: "All Messages", icon: <Heart size={14} />,    count: messages.length },
    { id: "letter", label: "Letters",      icon: <FileText size={14} />, count: messages.filter(m => m.medium === "letter").length },
    { id: "voice",  label: "Voice",        icon: <Mic size={14} />,      count: messages.filter(m => m.medium === "voice").length },
    { id: "video",  label: "Video",        icon: <Video size={14} />,    count: messages.filter(m => m.medium === "video").length },
  ];

  const kpis = [
    { label: "Total Messages", value: String(messages.length), sub: `For ${new Set(messages.map(m => m.recipient)).size} people`, icon: <Heart size={14} />, dot: ACCENT2 },
    { label: "Sealed", value: String(messages.filter(m => m.status === "sealed").length), sub: "Locked & ready", icon: <Lock size={14} />, dot: POS },
    { label: "Drafts", value: String(messages.filter(m => m.status === "draft").length), sub: "Not yet sealed", icon: <Pencil size={14} />, dot: WARN },
    { label: "Recordings", value: String(messages.filter(m => m.medium !== "letter").length), sub: "Voice & video", icon: <Video size={14} />, dot: NEG },
  ];

  return (
    <div className="fpd-msg">
      <style dangerouslySetInnerHTML={{ __html: MSG_CSS }} />
      <div className="fpd-msg-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Heart size={12} /> Held In Escrow · Released On Trigger</div>
            <h1 className="pg-h1">Messages to Loved Ones</h1>
            <div className="pg-sub">Letters, voice notes and videos addressed to specific people, delivered only when their trigger fires — after your passing, on a chosen date, or every birthday. Sealing a message locks it from edits so it reads exactly as you left it.</div>
          </div>
          <button className="btn-primary" onClick={() => { setEditing(null); setComposing(true); }}>
            <Plus size={15} /> New Message
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs + search ── */}
        <div className="card pad glow-surface" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div className="seg">
            {tabs.map(t => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
                {t.icon} {t.label} <span className="segcount">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="searchbar">
            <Search size={14} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages…" />
            {query && <button onClick={() => setQuery("")}><X size={13} /></button>}
          </div>
        </div>

        {/* ── Messages grouped by recipient ── */}
        {byRecipient.length === 0 ? (
          <div className="card pad glow-surface empty">
            <div className="empty-ico"><Heart size={22} /></div>
            <div className="empty-title">{query ? "No messages match your search" : "No messages yet"}</div>
            <div className="empty-desc">
              {query
                ? `Nothing found for "${query}". Try a different name or phrase.`
                : "Start with one letter to one person. You can seal it later — nothing is delivered until its trigger fires."}
            </div>
            {!query && (
              <button className="btn-primary" onClick={() => setComposing(true)}>
                <Plus size={15} /> Write your first message
              </button>
            )}
          </div>
        ) : (
          <div className="dlist" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {byRecipient.map(([recipient, msgs]) => (
              <div key={recipient} className="card pad glow-surface">
                <div className="rgroup-head">
                  <span className="ravatar">{recipient.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                  <span className="rname">{recipient}</span>
                  <span className="rrel">{msgs[0].relationship}</span>
                  <span className="tag" style={{ background: `${ACCENT2}1A`, color: ACCENT2, marginLeft: "auto" }}>
                    {msgs.length} message{msgs.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mrows">
                  {msgs.map(m => {
                    const mm = MEDIUM_META[m.medium];
                    const tm = TRIGGER_META[m.trigger];
                    const sm = STATUS_META[m.status];
                    const open = expanded === m.id;
                    return (
                      <div key={m.id} className="mrow" style={{ borderColor: open ? `${mm.color}55` : "rgba(255,255,255,0.065)" }}>
                        <button className="mrow-head" onClick={() => setExpanded(open ? null : m.id)}>
                          <div className="mrow-ico" style={{ background: `${mm.color}1A`, color: mm.color }}>
                            {mm.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="mrow-title">
                              <span className="t">{m.title}</span>
                              {m.status === "sealed" && <Lock size={11} color={POS} />}
                            </div>
                            <div className="mrow-tags">
                              <span className="tag" style={{ background: `${mm.color}1A`, color: mm.color }}>{mm.label}{m.duration ? ` · ${m.duration}` : ""}</span>
                              <span className="tag" style={{ background: `${tm.color}1A`, color: tm.color }}>{tm.short}{m.triggerDate ? ` · ${fmtTriggerDate(m.triggerDate)}` : ""}</span>
                              <span className="tag" style={{ background: `${sm.color}1A`, color: sm.color }}>{sm.label}</span>
                            </div>
                            {!open && <div className="mrow-preview">{m.body}</div>}
                          </div>
                          <span className="mrow-date">{m.created}</span>
                          {open ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
                        </button>

                        {open && (
                          <div className="mrow-body">
                            {m.medium !== "letter" && (
                              <div className="mrow-media" style={{ borderColor: `${mm.color}33` }}>
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
                                      <div style={{ color: TEXT, fontSize: 12.5 }}>
                                        {mm.label} message · {m.duration}
                                      </div>
                                      <div className="sample-tag">SAMPLE ENTRY — NO MEDIA FILE ATTACHED</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="mrow-text">{m.body}</div>

                            <div className="mrow-foot">
                              <div className="mrow-when">
                                <Clock size={12} />
                                {m.status === "sealed"
                                  ? <>Sealed on {m.sealedOn} · {tm.label.toLowerCase()}</>
                                  : <>Draft — not sealed, will not be delivered</>}
                              </div>
                              <div className="mrow-actions">
                                {m.status === "draft" ? (
                                  <>
                                    <button className="btn-ghost-sm" style={{ color: MUTED }} onClick={() => { setEditing(m); setComposing(true); }}>
                                      <Pencil size={13} /> Edit
                                    </button>
                                    <button className="btn-ghost-sm" style={{ color: POS, background: "rgba(95,190,145,0.1)", borderColor: "rgba(95,190,145,0.2)" }} onClick={() => seal(m.id)}>
                                      <Lock size={13} /> Seal
                                    </button>
                                  </>
                                ) : (
                                  <button className="btn-ghost-sm" style={{ color: WARN, background: "rgba(217,165,94,0.1)", borderColor: "rgba(217,165,94,0.2)" }} onClick={() => unseal(m.id)}>
                                    <Pencil size={13} /> Unseal to Edit
                                  </button>
                                )}
                                <button className="btn-del" title="Delete" onClick={() => remove(m.id)}>
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
              </div>
            ))}
          </div>
        )}

        {/* ── How delivery works ── */}
        <div className="card pad glow-surface">
          <div className="sec-title"><span className="tick" />How Delivery Works</div>
          <div className="dgrid2">
            {(Object.keys(TRIGGER_META) as Trigger[]).map(t => {
              const meta = TRIGGER_META[t];
              const n = messages.filter(m => m.trigger === t).length;
              return (
                <div key={t} className="note" style={{ borderColor: `${meta.color}22` }}>
                  <CalendarDays size={16} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div className="nt-title">{meta.label}</div>
                    <div className="nt-desc">
                      {t === "on_passing" && "Released to the named recipient once your passing is verified by FPD and the Legacy Continuation Fee is settled."}
                      {t === "on_date" && "Sent by email on the exact date you choose, whether or not anything has happened to you."}
                      {t === "birthday" && "Sent every year on the recipient's birthday, starting from the year you pick."}
                      {t === "anniversary" && "Sent every year on the anniversary date you set."}
                    </div>
                  </div>
                  <span className="tag" style={{ background: `${meta.color}1A`, color: meta.color }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {composing && (
        <ComposeModal
          editing={editing}
          onClose={() => { setComposing(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </div>
  );
}
