import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScanButton } from "./DocumentScanner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import {
  BookOpen, Mic, Video, Upload, Plus, Play, Pause, Square,
  Trash2, Edit2, X, Save, Lock, Sun, Cloud,
  CloudRain, Smile, Meh, Search, Eye
} from "lucide-react";
import { toast } from "sonner";
import heroDiaryPhoto from "../../imports/diary_hero_photo.webp";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

type EntryType = "written" | "audio" | "video" | "photo";
type Mood = "great" | "good" | "okay" | "sad" | "difficult";

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  body?: string;
  type: EntryType;
  mood?: Mood;
  tags: string[];
  private: boolean;
  duration?: string;
  thumbnail?: string;
  audioUrl?: string;
  videoUrl?: string;
}

const moodConfig: Record<Mood, { icon: React.ReactNode; label: string; color: string }> = {
  great:     { icon: <Sun size={16}/>,      label: "Great",     color: WARN },
  good:      { icon: <Smile size={16}/>,    label: "Good",      color: "#D99A6B" },
  okay:      { icon: <Meh size={16}/>,      label: "Okay",      color: "#6FAE8B" },
  sad:       { icon: <Cloud size={16}/>,    label: "Sad",       color: SOFT },
  difficult: { icon: <CloudRain size={16}/>,label: "Difficult", color: NEG },
};

/* Rows come from `diary_entries`. The screen used to open on sample entries
   identical for every account and lost on refresh. */

const TAGS_PALETTE = ["#5B6EE1","#48BB78","#5B6EE1","#F6AD55","#FC8181","#6F9E94","#ED8936","#E53E3E"];

function TypeBadge({ type, color }: { type: EntryType; color?: string }) {
  const c = color ?? ACCENT2;
  const configs: Record<EntryType, { icon: React.ReactNode; label: string }> = {
    written: { icon: <BookOpen size={11}/>, label: "Written" },
    audio:   { icon: <Mic size={11}/>,      label: "Audio" },
    video:   { icon: <Video size={11}/>,    label: "Video" },
    photo:   { icon: <Eye size={11}/>,      label: "Photo" },
  };
  const cfg = configs[type];
  return (
    <span className="type-badge" style={{ background:`${c}1C`, color:c }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* Recording logic (getUserMedia / MediaRecorder / interval timers) is untouched below —
   only the surrounding JSX classNames/styles were restyled to the shared premium chrome. */
function AudioRecorder({ onSave }: { onSave: (blob: Blob, duration: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  /* onstop fires from a closure created at start(), where `seconds` is still 0.
     The ref is what the handler must read to report a real duration. */
  const secondsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      secondsRef.current = 0;
      setSeconds(0);
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type:"audio/webm" });
        const total = secondsRef.current;
        const mins = Math.floor(total/60);
        const secs = total % 60;
        onSave(blob, `${mins}:${secs.toString().padStart(2,"0")}`);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      intervalRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
    setSeconds(0);
  };

  const mins = Math.floor(seconds/60);
  const secs = seconds % 60;

  return (
    <div className="recorder">
      <div className="rec-dial" style={{ background: recording ? "rgba(208,107,107,0.12)" : "rgba(91,110,225,0.10)", borderColor: recording ? NEG : ACCENT }}>
        {recording
          ? <Square size={28} color={NEG} fill={NEG}/>
          : <Mic size={28} color="#FFFFFF"/>}
        {recording && <div className="rec-ping" />}
      </div>
      <div className="rec-time">{`${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`}</div>
      <div className="rec-hint">{recording ? "Recording… tap to stop" : "Tap to start recording"}</div>
      <button onClick={recording ? stop : start} className="rec-btn"
        style={{ background: recording ? "linear-gradient(135deg,#D06B6B,#E88)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)" }}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
    </div>
  );
}

/* Recording logic (getUserMedia / MediaRecorder / preview stream) is untouched below —
   only the surrounding JSX classNames/styles were restyled to the shared premium chrome. */
function VideoRecorderPanel({ onSave }: { onSave: (duration: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const chunks = useRef<Blob[]>([]);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      streamRef.current = stream;
      setPreview(true);
    } catch { toast.error("Camera/microphone access denied."); }
  };

  /* The <video> only mounts once preview is true, so the stream has to be
     attached after that render — assigning inside startPreview hit a null ref
     and left the panel black. */
  useEffect(() => {
    if (!preview || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [preview]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunks.current = [];
    secondsRef.current = 0;
    setSeconds(0);
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = e => chunks.current.push(e.data);
    mr.onstop = () => {
      const total = secondsRef.current;
      const mins = Math.floor(total/60), secs = total % 60;
      onSave(`${mins}:${secs.toString().padStart(2,"0")}`);
      stopAll();
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
  };

  const stopAll = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPreview(false); setRecording(false); setSeconds(0);
  };

  const mins = Math.floor(seconds/60), secs = seconds % 60;

  if (!preview) {
    return (
      <div className="recorder">
        <div className="rec-dial" style={{ background:"rgba(91,110,225,0.10)", borderColor: ACCENT }}>
          <Video size={28} color="#FFFFFF"/>
        </div>
        <div className="rec-hint">Start your camera to record a video diary entry</div>
        <button onClick={startPreview} className="rec-btn" style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)" }}>
          Open Camera
        </button>
      </div>
    );
  }

  return (
    <div className="recorder">
      <div className="rec-video-wrap">
        <video ref={videoRef} muted className="rec-video"/>
        {recording && (
          <div className="rec-live">
            <div className="rec-live-dot"/>
            <span>{`${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`}</span>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {!recording
          ? <button onClick={startRecording} className="rec-record-btn"><div className="rec-record-dot"/>Record</button>
          : <button onClick={stopRecording} className="rec-stop-btn"><Square size={13} fill="white"/>Stop</button>
        }
        <button onClick={stopAll} className="rec-cancel-btn">Cancel</button>
      </div>
    </div>
  );
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-diary so nothing else in the app is affected. */
const DIARY_CSS = `
.fpd-diary{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-diary *{box-sizing:border-box;}
.fpd-diary-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-diary .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-diary .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-diary .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-diary .hbanner:hover .art{transform:scale(1.08);}
.fpd-diary .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-diary .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-diary .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-diary .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-diary .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-diary .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-diary .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-diary .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-diary .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-diary .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-diary .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-diary .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-diary .hbanner{min-height:auto;} .fpd-diary .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-diary .hbanner h1{font-size:29px;}}

.fpd-diary .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-diary .card.pad{padding:28px;}
.fpd-diary .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-diary .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-diary .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-diary .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-diary .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-diary .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-diary .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-diary .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-diary .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-diary .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-diary .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-diary .kpi-mini-txt{flex:1;min-width:0;}
.fpd-diary .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-diary .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-diary .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-diary .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-diary .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-diary .kpi-stack{grid-template-columns:1fr;}}

/* search + filter toolbar */
.fpd-diary .toolbar{display:flex;flex-wrap:wrap;gap:10px;}
.fpd-diary .search{display:flex;align-items:center;gap:8px;padding:11px 15px;flex:1;min-width:220px;}
.fpd-diary .search input{background:transparent;border:none;outline:none;color:${TEXT};font-size:16px;width:100%;font-family:var(--font-body);}
.fpd-diary .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;}
.fpd-diary .seg button{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:99px;font-size:16px;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-diary .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* bento layout */
.fpd-diary .bento{display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,1fr);gap:16px;align-items:start;}
@media (max-width:1024px){.fpd-diary .bento{grid-template-columns:1fr;}}
.fpd-diary .elist{display:flex;flex-direction:column;gap:12px;}

/* entry cards */
.fpd-diary .ecard{padding:20px;cursor:pointer;transition:border-color .18s;}
.fpd-diary .ecard.sel{border-color:rgba(91,110,225,0.5);}
.fpd-diary .ethumb{border-radius:18px;overflow:hidden;margin-bottom:12px;height:120px;position:relative;}
.fpd-diary .ethumb img{width:100%;height:100%;object-fit:cover;}
.fpd-diary .ethumb-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.32);}
.fpd-diary .ethumb-play{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(13,20,33,0.92);}
.fpd-diary .ethumb-dur{position:absolute;bottom:8px;right:8px;padding:2px 8px;border-radius:6px;background:rgba(0,0,0,0.65);color:#fff;font-size:14px;font-family:var(--font-mono);}
.fpd-diary .etop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;}
.fpd-diary .edate{color:${MUTED};font-size:14px;font-family:var(--font-mono);}
.fpd-diary .type-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:99px;font-size:12.5px;font-family:var(--font-mono);}
.fpd-diary .private-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;background:rgba(208,107,107,0.14);color:${NEG};font-size:11px;font-family:var(--font-mono);}
.fpd-diary .etitle{color:${TEXT};font-size:19px;font-weight:600;font-family:var(--font-display);}
.fpd-diary .emood{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:16px;flex-shrink:0;font-size:14px;font-weight:500;}
.fpd-diary .ebody{color:${MUTED};font-size:16px;line-height:1.7;}
.fpd-diary .eaudio{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;border-radius:16px;background:rgba(91,110,225,0.07);}
.fpd-diary .eaudio-btn{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${ACCENT};color:#fff;border:none;cursor:pointer;flex-shrink:0;}
.fpd-diary .eaudio-track{flex:1;height:4px;border-radius:99px;background:rgba(91,110,225,0.2);}
.fpd-diary .eaudio-fill{height:4px;border-radius:99px;background:${ACCENT};transition:width .3s;}
.fpd-diary .etags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
.fpd-diary .etag{padding:2px 9px;border-radius:99px;font-size:14px;background:#141B2E;color:#6FAE8B;}

/* empty state */
.fpd-diary .empty{padding:52px 12px;text-align:center;}
.fpd-diary .empty .ei{width:36px;height:36px;margin:0 auto 12px;color:rgba(126,147,176,0.3);}
.fpd-diary .empty .et{color:${MUTED};}

/* detail rail */
.fpd-diary .dhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-diary .dacts{display:flex;gap:2px;}
.fpd-diary .dacts button{background:none;border:none;cursor:pointer;padding:5px;display:flex;color:${MUTED};}
.fpd-diary .dbadges{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.fpd-diary .dtitle{font-family:var(--font-display);font-size:22.5px;color:${TEXT};font-weight:600;margin-bottom:12px;}
.fpd-diary .dbody{color:${SOFT};font-size:17.5px;line-height:1.9;white-space:pre-wrap;}
.fpd-diary .daudio{margin-top:16px;padding:18px;border-radius:16px;text-align:center;background:rgba(91,110,225,0.07);border:1px solid rgba(91,110,225,0.16);}
.fpd-diary .daudio-btn{margin-top:12px;display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:18px;font-size:16px;background:${ACCENT};color:#fff;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-diary .dvideo{margin-top:16px;border-radius:16px;overflow:hidden;position:relative;cursor:pointer;}
.fpd-diary .dvideo img,.fpd-diary .dvideo-placeholder{width:100%;height:140px;object-fit:cover;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.09);}
.fpd-diary .dvideo-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.28);}
.fpd-diary .dvideo-play{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(13,20,33,0.92);}

/* diary stats mini panel */
.fpd-diary .stats-hd{color:${TEXT};font-size:16px;font-weight:600;margin-bottom:10px;font-family:var(--font-display);}
.fpd-diary .stat-row{display:flex;justify-content:space-between;padding:9px 12px;border-radius:99px;background:#0F1624;}
.fpd-diary .stat-row + .stat-row{margin-top:6px;}
.fpd-diary .stat-row span:first-child{color:${MUTED};font-size:15px;}
.fpd-diary .stat-row span:last-child{color:#6FAE8B;font-size:15px;font-weight:600;font-family:var(--font-mono);}

/* recorder panel (used inside modal) */
.fpd-diary .recorder{display:flex;flex-direction:column;align-items:center;gap:18px;padding:32px 20px;}
.fpd-diary .rec-dial{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid;position:relative;transition:all .3s;}
.fpd-diary .rec-ping{position:absolute;inset:0;border-radius:50%;background:rgba(208,107,107,0.16);animation:fpd-diary-ping 1.4s cubic-bezier(0,0,0.2,1) infinite;}
@keyframes fpd-diary-ping{75%,100%{transform:scale(1.6);opacity:0;}}
.fpd-diary .rec-time{font-family:var(--font-mono);font-size:30px;color:${TEXT};font-weight:700;}
.fpd-diary .rec-hint{color:${MUTED};font-size:16px;}
.fpd-diary .rec-btn{padding:12px 32px;border-radius:16px;font-weight:600;font-size:16px;color:#fff;border:none;cursor:pointer;font-family:var(--font-body);box-shadow:0 4px 16px rgba(91,110,225,0.35);}
.fpd-diary .rec-video-wrap{position:relative;width:100%;border-radius:16px;overflow:hidden;background:#000;max-height:280px;}
.fpd-diary .rec-video{width:100%;max-height:280px;object-fit:cover;display:block;}
.fpd-diary .rec-live{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:8px;padding:4px 12px;border-radius:99px;background:rgba(208,107,107,0.9);}
.fpd-diary .rec-live-dot{width:8px;height:8px;border-radius:50%;background:#fff;}
.fpd-diary .rec-live span{color:#fff;font-size:14px;font-family:var(--font-mono);}
.fpd-diary .rec-record-btn{display:flex;align-items:center;gap:8px;padding:10px 24px;border-radius:18px;font-weight:600;font-size:16px;background:${NEG};color:#fff;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-diary .rec-record-dot{width:12px;height:12px;border-radius:50%;background:#fff;}
.fpd-diary .rec-stop-btn{display:flex;align-items:center;gap:8px;padding:10px 24px;border-radius:18px;font-weight:600;font-size:16px;background:#374669;color:#fff;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-diary .rec-cancel-btn{padding:10px 24px;border-radius:18px;font-size:16px;background:#0F1624;color:${MUTED};border:none;cursor:pointer;font-family:var(--font-body);}

/* modal */
.fpd-diary .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-diary .modal{width:100%;max-width:620px;max-height:90vh;overflow-y:auto;}
.fpd-diary .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-diary .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-diary .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-diary .modal-body{padding:22px;display:flex;flex-direction:column;gap:16px;}
.fpd-diary .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-diary .field input,.fpd-diary .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-diary .field textarea{resize:none;line-height:1.8;}
.fpd-diary .field input::placeholder,.fpd-diary .field textarea::placeholder{color:${FAINT};}
.fpd-diary .field input:focus,.fpd-diary .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-diary .type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
.fpd-diary .type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px;border-radius:16px;font-size:14px;background:#0F1624;border:2px solid transparent;cursor:pointer;font-family:var(--font-body);transition:all .18s;}
.fpd-diary .type-btn.on{background:rgba(91,110,225,0.14);border-color:${ACCENT};color:#6FAE8B;}
.fpd-diary .type-btn:not(.on){color:${MUTED};}
.fpd-diary .record-box{border-radius:16px;background:#0F1624;border:1px solid rgba(91,110,225,0.14);}
.fpd-diary .record-done{padding:26px 0;text-align:center;}
.fpd-diary .upload-box{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 0;border-radius:16px;border:2px dashed rgba(91,110,225,0.28);background:#0F1624;cursor:pointer;}
.fpd-diary .mood-grid{display:flex;gap:8px;}
.fpd-diary .mood-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px;border-radius:16px;border:2px solid transparent;cursor:pointer;font-family:var(--font-body);background:#0F1624;}
.fpd-diary .privacy-btn{width:100%;display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:16px;font-size:16px;cursor:pointer;font-family:var(--font-body);}
.fpd-diary .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-diary .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;display:flex;align-items:center;justify-content:center;gap:6px;}
.fpd-diary .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function DigitalDiary() {
  const { authUser } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EntryType | "all">("all");
  const [selected, setSelected] = useState<DiaryEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newType, setNewType] = useState<EntryType>("written");
  const [form, setForm] = useState({ title:"", body:"", mood:"good" as Mood, tags:"", private:false });
  const [audioSaved, setAudioSaved] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const entriesRef = React.useRef<HTMLDivElement>(null);

  function closeCreateModal() {
    setCreating(false);
    setEditingId(null);
    setForm({ title:"", body:"", mood:"good", tags:"", private:false });
    setAudioSaved(false); setVideoDuration(null);
  }

  function openAdd() {
    setNewType("written");
    setForm({ title:"", body:"", mood:"good", tags:"", private:false });
    setAudioSaved(false);
    setVideoDuration(null);
    setEditingId(null);
    setCreating(true);
  }

  function openEdit(entry: DiaryEntry) {
    setNewType(entry.type);
    setForm({ title: entry.title, body: entry.body ?? "", mood: entry.mood ?? "good", tags: entry.tags.join(", "), private: entry.private });
    setAudioSaved(entry.type === "audio" ? !!entry.duration : false);
    setVideoDuration(entry.type === "video" ? (entry.duration ?? null) : null);
    setEditingId(entry.id);
    setCreating(true);
  }

  /* Escape closes the open overlay, matching Messages to Loved Ones. */
  useEffect(() => {
    if (!creating && !selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (creating) closeCreateModal();
      else setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [creating, selected]);

  /* Rows come from the `diary_entries` table. The screen used to open on
     sample entries identical for every account and lost on refresh. */
  const reload = useCallback(async () => {
    if (!authUser) return;
    const { data, error } = await tables.diaryEntries.list(authUser.id);
    if (error) { toast.error(`Could not load diary: ${error.message}`); return; }
    setEntries((data ?? []).map(r => ({
      id: String(r.id),
      date: r.created_at
        ? new Date(String(r.created_at)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "",
      title: String(r.title ?? ""),
      body: (r.body as string | null) ?? undefined,
      type: (String(r.entry_type ?? "written") as EntryType),
      mood: (r.mood as Mood | null) ?? undefined,
      tags: (r.tags as string[] | null) ?? [],
      private: Boolean(r.is_private),
      duration: r.duration_s ? String(r.duration_s) : undefined,
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);

  const filtered = entries.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || (e.body??"").toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.includes(search.toLowerCase()));
    const matchType = filterType === "all" || e.type === filterType;
    return matchSearch && matchType;
  });

  const handleSave = async () => {
    if (!authUser) return;
    if (!form.title.trim()) { toast.error("Please add a title"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    // duration_s is INTEGER in the table; the UI's "duration" is a label, so
    // only a real recorded length is worth storing.
    const durationS = newType === "video" && videoDuration ? Number(String(videoDuration).replace(/[^0-9]/g, "")) || null : null;

    const row = {
      title: form.title.trim(),
      body: form.body || null,
      entry_type: newType,
      mood: form.mood || null,
      tags,
      is_private: form.private,
      duration_s: durationS,
    };

    const { error } = editingId != null
      ? await tables.diaryEntries.update(editingId, row)
      : await tables.diaryEntries.add(authUser.id, row);

    if (error) { toast.error(`Could not save: ${error.message}`); return; }

    await reload();
    setSelected(null);
    toast.success(editingId != null ? "Entry updated" : "Diary entry saved securely 🔒");
    closeCreateModal();
  };

  const handleDelete = async (id: string) => {
    const { error } = await tables.diaryEntries.remove(id);
    if (error) { toast.error(`Could not delete: ${error.message}`); return; }
    await reload();
    if (selected?.id === id) setSelected(null);
    toast.success("Entry deleted");
  };

  const typeButtons: { id: EntryType; icon: React.ReactNode; label: string }[] = [
    { id:"written", icon:<BookOpen size={16}/>, label:"Written" },
    { id:"audio",   icon:<Mic size={16}/>,      label:"Voice Recording" },
    { id:"video",   icon:<Video size={16}/>,    label:"Video Recording" },
    { id:"photo",   icon:<Upload size={16}/>,   label:"Upload Media" },
  ];

  const filterButtons: { id: EntryType | "all"; label: string }[] = [
    { id:"all",     label:"All" },
    { id:"written", label:"📝" },
    { id:"audio",   label:"🎙️" },
    { id:"video",   label:"🎥" },
  ];

  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});

  const writtenCount = entries.filter(e=>e.type==="written").length;
  const audioCount = entries.filter(e=>e.type==="audio").length;
  const videoCount = entries.filter(e=>e.type==="video").length;
  const privateCount = entries.filter(e=>e.private).length;

  const kpis = [
    { label: "Total Entries", value: String(entries.length), sub: `${today.split(",")[0]}, ${today.split(",")[1]}`, icon: <BookOpen size={14} />, dot: ACCENT2 },
    { label: "Voice Recordings", value: String(audioCount), sub: "Audio entries", icon: <Mic size={14} />, dot: ACCENT2 },
    { label: "Video Entries", value: String(videoCount), sub: "Video diary clips", icon: <Video size={14} />, dot: ACCENT2 },
    { label: "Private Entries", value: String(privateCount), sub: "Restricted visibility", icon: <Lock size={14} />, dot: NEG },
  ];

  return (
    <div className="fpd-diary">
      <style dangerouslySetInnerHTML={{ __html: DIARY_CSS }} />
      <div className="fpd-diary-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroDiaryPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Your Private Journal</span>
            <h1>Written, spoken, or filmed — <span className="accent">your thoughts, kept safe.</span></h1>
            <p>A private, encrypted diary for the entries only you can see — until you choose to pass them on.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={openAdd}>
                <BookOpen size={15}/> New Entry
              </button>
              <button className="hbtn ghost" onClick={() => entriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Eye size={15}/> View All Entries
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><BookOpen size={12} /> PERSONAL JOURNAL</div>
            <h1 className="pg-h1">Digital Diary</h1>
            <div className="pg-sub">{today} · {entries.length} entries · Written, audio & video recordings</div>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={15}/> New Entry
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background:`linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search + filter ── */}
        <div className="toolbar">
          <div className="card search">
            <Search size={13} color={MUTED}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search diary entries..."/>
          </div>
          <div className="seg">
            {filterButtons.map(f => (
              <button key={f.id} className={filterType === f.id ? "on" : ""} onClick={() => setFilterType(f.id as any)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bento">
          {/* Entry list */}
          <div className="elist" ref={entriesRef}>
            {filtered.length === 0 && (
              <div className="card empty">
                <BookOpen size={36} className="ei"/>
                <div className="et">No entries found. Start writing your story.</div>
              </div>
            )}
            {filtered.map(entry => {
              const mood = entry.mood ? moodConfig[entry.mood] : null;
              return (
                <div key={entry.id}
                  className={`card ecard ${selected?.id===entry.id ? "sel" : ""}`}
                  onClick={() => setSelected(selected?.id===entry.id ? null : entry)}>
                  {entry.thumbnail && (
                    <div className="ethumb">
                      <img src={entry.thumbnail} alt=""/>
                      <div className="ethumb-overlay">
                        <div className="ethumb-play"><Play size={18} color="#FFFFFF" fill="#FFFFFF"/></div>
                      </div>
                      {entry.duration && <div className="ethumb-dur">{entry.duration}</div>}
                    </div>
                  )}
                  <div className="etop">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                        <span className="edate">{entry.date}</span>
                        <TypeBadge type={entry.type}/>
                        {entry.private && <span className="private-badge">🔒 PRIVATE</span>}
                      </div>
                      <div className="etitle">{entry.title}</div>
                    </div>
                    {mood && (
                      <div className="emood" style={{ background: `${mood.color}1C`, color: mood.color }}>
                        {mood.icon}
                        <span>{mood.label}</span>
                      </div>
                    )}
                  </div>
                  {entry.body && <p className="ebody line-clamp-2">{entry.body}</p>}
                  {entry.type === "audio" && entry.duration && (
                    <div className="eaudio">
                      <button onClick={e => { e.stopPropagation(); setPlayingAudio(playingAudio===entry.id ? null : entry.id); if (playingAudio !== entry.id) toast.success("▶ Playing audio entry — " + entry.duration); }} className="eaudio-btn">
                        {playingAudio===entry.id ? <Pause size={14}/> : <Play size={14}/>}
                      </button>
                      <div className="eaudio-track">
                        <div className="eaudio-fill" style={{ width: playingAudio===entry.id ? "35%" : "0%" }}/>
                      </div>
                      <span className="edate">{entry.duration}</span>
                    </div>
                  )}
                  {entry.tags.length > 0 && (
                    <div className="etags">
                      {entry.tags.map(tag => <span key={tag} className="etag">#{tag}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected detail / stats sidebar */}
          <div className="flex flex-col gap-4">
            {selected ? (
              <div className="card pad" style={{ position: "sticky", top: 16 }}>
                <div className="dhead">
                  <div className="edate">{selected.date}</div>
                  <div className="dacts">
                    <button onClick={() => openEdit(selected)} title="Edit entry"><Edit2 size={13}/></button>
                    <button onClick={() => { handleDelete(selected.id); }} style={{ color: NEG }}><Trash2 size={13}/></button>
                    <button onClick={() => setSelected(null)}><X size={13}/></button>
                  </div>
                </div>
                <div className="dbadges">
                  <TypeBadge type={selected.type}/>
                  {selected.mood && (
                    <span className="emood" style={{ background: `${moodConfig[selected.mood].color}1C`, color: moodConfig[selected.mood].color }}>
                      {moodConfig[selected.mood].icon} {moodConfig[selected.mood].label}
                    </span>
                  )}
                  {selected.private && <span className="private-badge">🔒 Private</span>}
                </div>
                <div className="dtitle">{selected.title}</div>
                {selected.body && <div className="dbody">{selected.body}</div>}
                {selected.type === "audio" && (
                  <div className="daudio">
                    <Mic size={24} color="#FFFFFF" style={{ margin:"0 auto 8px" }}/>
                    <div style={{ color: TEXT, fontSize: 16 }}>Voice Recording · {selected.duration}</div>
                    <button onClick={() => { setPlayingAudio(playingAudio===selected.id ? null : selected.id); toast.success(playingAudio===selected.id ? "⏸ Paused" : "▶ Playing audio — " + selected.duration); }} className="daudio-btn">
                      <Play size={13}/> Play Recording
                    </button>
                  </div>
                )}
                {selected.type === "video" && (
                  <div className="dvideo" onClick={() => toast.success("▶ Video playback started — demo mode")}>
                    {selected.thumbnail
                      ? <img src={selected.thumbnail} alt=""/>
                      : <div className="dvideo-placeholder"><Video size={28} color="#FFFFFF"/></div>
                    }
                    <div className="dvideo-overlay">
                      <div className="dvideo-play"><Play size={20} color="#FFFFFF" fill="#FFFFFF"/></div>
                    </div>
                  </div>
                )}
                {selected.tags.length > 0 && (
                  <div className="etags" style={{ marginTop: 16 }}>
                    {selected.tags.map(t => <span key={t} className="etag">#{t}</span>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="card pad" style={{ textAlign: "center" }}>
                <BookOpen size={28} color="rgba(91,110,225,0.3)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color: MUTED, fontSize: 16, marginBottom: 12 }}>Select an entry to read</div>
                <div className="stats-hd" style={{ textAlign: "left" }}>Your Diary Stats</div>
                <div>
                  {[
                    { label:"Written entries", value: writtenCount },
                    { label:"Voice recordings", value: audioCount },
                    { label:"Video entries", value: videoCount },
                    { label:"Private entries", value: privateCount },
                  ].map(s => (
                    <div key={s.label} className="stat-row"><span>{s.label}</span><span>{s.value}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New entry modal ── */}
      {creating && (
        <div className="backdrop">
          <div className="card modal">
            <div className="modal-head">
              <h3>{editingId != null ? "Edit Entry" : "New Diary Entry"}</h3>
              <button onClick={closeCreateModal}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="type-grid">
                {typeButtons.map(tb => (
                  <button key={tb.id} onClick={() => setNewType(tb.id)} className={`type-btn ${newType===tb.id ? "on" : ""}`}>
                    {tb.icon}
                    <span>{tb.label}</span>
                  </button>
                ))}
              </div>

              <div className="field">
                <label>TITLE</label>
                <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="What's on your mind today?" style={{ fontFamily: "var(--font-display)", fontSize: 19 }}/>
              </div>

              {newType === "written" && (
                <div className="field">
                  <label>YOUR ENTRY</label>
                  <textarea value={form.body} onChange={e => setForm(p=>({...p,body:e.target.value}))} placeholder="Write freely. This is your space…" rows={8}/>
                </div>
              )}

              {newType === "audio" && (
                <div className="record-box">
                  {audioSaved
                    ? <div className="record-done"><div style={{ fontSize: 30, marginBottom: 8 }}>✅</div><div style={{ color: "#D99A6B", fontWeight: 600 }}>Audio recorded successfully</div></div>
                    : <AudioRecorder onSave={(blob, dur) => { setAudioSaved(true); toast.success(`Recorded ${dur} of audio`); }}/>}
                </div>
              )}

              {newType === "video" && (
                <div className="record-box" style={{ padding: 16 }}>
                  {videoDuration
                    ? <div className="record-done"><div style={{ fontSize: 30, marginBottom: 8 }}>✅</div><div style={{ color: "#D99A6B", fontWeight: 600 }}>Video recorded: {videoDuration}</div></div>
                    : <VideoRecorderPanel onSave={dur => { setVideoDuration(dur); toast.success(`Recorded ${dur} of video`); }}/>}
                </div>
              )}

              {newType === "photo" && (
                <div>
                  <input ref={fileRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { toast.success(`"${f.name}" attached to entry`); }
                  }}/>
                  <div onClick={() => fileRef.current?.click()} className="upload-box">
                    <Upload size={28} color="#FFFFFF" style={{ opacity:0.7 }}/>
                    <div style={{ color: MUTED, fontSize: 16 }}>Upload video, photo, or audio file</div>
                    <div style={{ color: FAINT, fontSize: 14 }}>MP4, MOV, JPG, PNG, MP3, WAV</div>
                  </div>
                  <div className="flex justify-center" style={{ marginTop: 12 }}>
                    <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" attached to diary entry`)} size="sm" label="Or Scan Document"/>
                  </div>
                </div>
              )}

              <div className="field">
                <label>HOW ARE YOU FEELING?</label>
                <div className="mood-grid">
                  {(Object.entries(moodConfig) as [Mood, typeof moodConfig[Mood]][]).map(([k, cfg]) => (
                    <button key={k} onClick={() => setForm(p=>({...p,mood:k}))} className="mood-btn"
                      style={{ background: form.mood===k ? `${cfg.color}1C` : "#0F1624", borderColor: form.mood===k ? cfg.color : "transparent", color: cfg.color }}>
                      {cfg.icon}
                      <span style={{ fontSize: 12.5 }}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label>TAGS (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm(p=>({...p,tags:e.target.value}))} placeholder="family, reflection, love"/>
                </div>
                <div className="field">
                  <label>PRIVACY</label>
                  <button onClick={() => setForm(p=>({...p,private:!p.private}))} className="privacy-btn"
                    style={{ background: form.private ? "rgba(208,107,107,0.10)" : "#0F1624", border: `1px solid ${form.private ? "rgba(208,107,107,0.28)" : "rgba(255,255,255,0.09)"}`, color: form.private ? NEG : MUTED }}>
                    {form.private ? <Lock size={14}/> : <Eye size={14}/>}
                    {form.private ? "Private — restricted" : "Shared with legacy contacts"}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="save" onClick={handleSave}><Save size={14}/>{editingId != null ? "Save Changes" : "Save Entry"}</button>
              <button className="btn-sec" onClick={closeCreateModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
