import React, { useState, useRef, useEffect } from "react";
import { ScanButton } from "./DocumentScanner";
import {
  BookOpen, Mic, Video, Upload, Plus, Play, Pause, Square,
  Trash2, Edit2, X, Save, Tag, Lock, Heart, Sun, Cloud,
  CloudRain, Smile, Meh, Frown, ChevronLeft, ChevronRight,
  Search, Calendar, Filter, Download, Eye, EyeOff, MicOff
} from "lucide-react";
import { toast } from "sonner";

const CARD: React.CSSProperties = {
  background: "#101728",
  border: "1px solid rgba(58,91,217,0.1)",
  boxShadow: "0 2px 12px rgba(58,91,217,0.06)",
  borderRadius: 16,
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

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

const moodConfig: Record<Mood, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  great:     { icon: <Sun size={16}/>,      label: "Great",     color: "#F6AD55", bg: "#FFFBEB" },
  good:      { icon: <Smile size={16}/>,    label: "Good",      color: "#48BB78", bg: "#F0FFF4" },
  okay:      { icon: <Meh size={16}/>,      label: "Okay",      color: "#4A90D9", bg: "#EBF8FF" },
  sad:       { icon: <Cloud size={16}/>,    label: "Sad",       color: "#6E8BFF", bg: "#0C1322" },
  difficult: { icon: <CloudRain size={16}/>,label: "Difficult", color: "#FC8181", bg: "#FFF5F5" },
};

const sampleEntries: DiaryEntry[] = [
  {
    id:"d1", date:"Jun 12, 2026", title:"Thinking about legacy and what matters",
    body:`Today I had a long conversation with Sarah about what we want our kids to remember about us. Not the house, not the money — just who we were as people. I want them to know I was present, that I laughed at dinner, that I cried at movies and wasn't ashamed of it.\n\nI've been working on Final Pass Down lately which has me thinking a lot about what we leave behind. Not just documents and accounts, but the feeling of being loved.`,
    type:"written", mood:"good", tags:["reflection","family","legacy"], private:false,
  },
  {
    id:"d2", date:"Jun 8, 2026", title:"Audio message for my 70th birthday",
    body:"Recorded a voice message for my family to hear on my 70th birthday — wherever I am.",
    type:"audio", mood:"great", tags:["birthday","family","audio"], private:false, duration:"4:23",
  },
  {
    id:"d3", date:"Jun 1, 2026", title:"Video diary — Big Sur memories",
    body:"Recorded myself talking about our Big Sur trip and what it meant to me. The grandkids were there.",
    type:"video", mood:"great", tags:["memories","camping","outdoors"], private:false, duration:"8:41",
    thumbnail:"https://images.unsplash.com/photo-1507272854533-a279b57229bb?w=300&h=200&fit=crop&auto=format",
  },
  {
    id:"d4", date:"May 28, 2026", title:"Private thoughts — for Sarah only",
    body:"Private entry. Only visible to Sarah after I'm gone.",
    type:"written", mood:"okay", tags:["private","sarah"], private:true,
  },
  {
    id:"d5", date:"May 15, 2026", title:"The day Michael got married — my words",
    body:`I remember standing in the back of that Napa vineyard watching my son become a husband. Amanda looked beautiful. Michael was shaking — I could see his hands from twenty feet away.\n\nI didn't cry when he walked down the aisle. I cried when Amanda's mother gave her blessing. Because I thought: someday someone will say words like that about Emily. About all of them.\n\nI am so proud of the man he became.`,
    type:"written", mood:"great", tags:["michael","wedding","family","love"], private:false,
  },
  {
    id:"d6", date:"Apr 10, 2026", title:"Voice memo — advice for the grandkids",
    body:"15-minute audio recording with life advice for Tyler, Lily and Jack.",
    type:"audio", mood:"good", tags:["grandkids","advice","legacy"], private:false, duration:"15:02",
  },
];

const TAGS_PALETTE = ["#3A5BD9","#48BB78","#6E8BFF","#F6AD55","#FC8181","#38B2AC","#ED8936","#E53E3E"];

function TypeBadge({ type, color }: { type: EntryType; color?: string }) {
  const c = color ?? "#3A5BD9";
  const configs: Record<EntryType, { icon: React.ReactNode; label: string }> = {
    written: { icon: <BookOpen size={11}/>, label: "Written" },
    audio:   { icon: <Mic size={11}/>,      label: "Audio" },
    video:   { icon: <Video size={11}/>,    label: "Video" },
    photo:   { icon: <Eye size={11}/>,      label: "Photo" },
  };
  const cfg = configs[type];
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background:`${c}14`, color:c, ...MONO, fontSize:10 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function AudioRecorder({ onSave }: { onSave: (blob: Blob, duration: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type:"audio/webm" });
        const mins = Math.floor(seconds/60);
        const secs = seconds % 60;
        onSave(blob, `${mins}:${secs.toString().padStart(2,"0")}`);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      intervalRef.current = setInterval(() => setSeconds(s => s+1), 1000);
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
    <div className="flex flex-col items-center gap-5 py-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: recording ? "rgba(229,62,62,0.1)" : "rgba(58,91,217,0.1)", border: `3px solid ${recording?"#E53E3E":"#3A5BD9"}`, transition:"all 0.3s" }}>
          {recording
            ? <Square size={28} color="#E53E3E" fill="#E53E3E"/>
            : <Mic size={28} color="#3A5BD9"/>}
        </div>
        {recording && (
          <div className="absolute inset-0 rounded-full animate-ping" style={{ background:"rgba(229,62,62,0.15)" }}/>
        )}
      </div>
      <div style={{ fontFamily:"var(--font-mono)", fontSize:24, color:"#FFFFFF", fontWeight:700 }}>
        {`${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`}
      </div>
      <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>
        {recording ? "Recording… tap to stop" : "Tap to start recording"}
      </div>
      <button onClick={recording ? stop : start}
        className="px-8 py-3 rounded-2xl font-semibold text-sm"
        style={{ background: recording ? "linear-gradient(135deg,#E53E3E,#FC8181)" : "linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:`0 4px 16px ${recording?"rgba(229,62,62,0.35)":"rgba(58,91,217,0.35)"}` }}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
    </div>
  );
}

function VideoRecorderPanel({ onSave }: { onSave: (duration: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setPreview(true);
    } catch { toast.error("Camera/microphone access denied."); }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunks.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = e => chunks.current.push(e.data);
    mr.onstop = () => {
      const mins = Math.floor(seconds/60), secs = seconds % 60;
      onSave(`${mins}:${secs.toString().padStart(2,"0")}`);
      stopAll();
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
    intervalRef.current = setInterval(() => setSeconds(s => s+1), 1000);
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
      <div className="flex flex-col items-center gap-5 py-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background:"rgba(58,91,217,0.1)", border:"3px solid #3A5BD9" }}>
          <Video size={28} color="#3A5BD9"/>
        </div>
        <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Start your camera to record a video diary entry</div>
        <button onClick={startPreview} className="px-8 py-3 rounded-2xl font-semibold text-sm"
          style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 4px 16px rgba(58,91,217,0.35)" }}>
          Open Camera
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full rounded-2xl overflow-hidden" style={{ background:"#000", maxHeight:280 }}>
        <video ref={videoRef} muted className="w-full" style={{ maxHeight:280, objectFit:"cover" }}/>
        {recording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full" style={{ background:"rgba(229,62,62,0.9)" }}>
            <div className="w-2 h-2 rounded-full bg-white"/>
            <span style={{ color:"#fff", fontSize:11, ...MONO }}>{`${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`}</span>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {!recording
          ? <button onClick={startRecording} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"#E53E3E", color:"#fff" }}><div className="w-3 h-3 rounded-full bg-white"/>Record</button>
          : <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm" style={{ background:"#374669", color:"#fff" }}><Square size={13} fill="white"/>Stop</button>
        }
        <button onClick={stopAll} className="px-6 py-2.5 rounded-xl text-sm" style={{ background:"#070A12", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
      </div>
    </div>
  );
}

export function DigitalDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>(sampleEntries);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<EntryType | "all">("all");
  const [selected, setSelected] = useState<DiaryEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState<EntryType>("written");
  const [form, setForm] = useState({ title:"", body:"", mood:"good" as Mood, tags:"", private:false });
  const [audioSaved, setAudioSaved] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = entries.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || (e.body??"").toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.includes(search.toLowerCase()));
    const matchType = filterType === "all" || e.type === filterType;
    return matchSearch && matchType;
  });

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Please add a title"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const entry: DiaryEntry = {
      id: `d-${Date.now()}`, date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
      title: form.title, body: form.body || undefined, type: newType,
      mood: form.mood, tags, private: form.private,
      duration: newType === "audio" && audioSaved ? "recorded" : newType === "video" && videoDuration ? videoDuration : undefined,
    };
    setEntries(prev => [entry, ...prev]);
    setCreating(false);
    setForm({ title:"", body:"", mood:"good", tags:"", private:false });
    setAudioSaved(false); setVideoDuration(null);
    toast.success("Diary entry saved securely 🔒");
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Entry deleted");
  };

  const typeButtons: { id: EntryType; icon: React.ReactNode; label: string }[] = [
    { id:"written", icon:<BookOpen size={16}/>, label:"Written" },
    { id:"audio",   icon:<Mic size={16}/>,      label:"Voice Recording" },
    { id:"video",   icon:<Video size={16}/>,    label:"Video Recording" },
    { id:"photo",   icon:<Upload size={16}/>,   label:"Upload Media" },
  ];

  const today = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});

  return (
    <div style={{ background:"#070A12", minHeight:"100%", padding:24 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }} className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4 }}>Digital Diary</h1>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>{today} · {entries.length} entries · Written, audio & video recordings</p>
          </div>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 4px 12px rgba(58,91,217,0.3)" }}>
            <Plus size={15}/> New Entry
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-1 min-w-48 glow-surface" style={CARD}>
            <Search size={13} color="rgba(255,255,255,0.65)"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search diary entries..."
              style={{ background:"transparent", border:"none", outline:"none", color:"#FFFFFF", fontSize:13, width:"100%" }}/>
          </div>
          <div className="flex gap-1 p-1 rounded-xl glow-surface" style={CARD}>
            {[{id:"all",label:"All"},{id:"written",label:"📝"},{id:"audio",label:"🎙️"},{id:"video",label:"🎥"}].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id as any)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{ background:filterType===f.id?"#3A5BD9":"transparent", color:filterType===f.id?"#fff":"rgba(255,255,255,0.7)", fontWeight:filterType===f.id?600:400 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Entry list */}
          <div className="lg:col-span-2 space-y-3">
            {filtered.length === 0 && (
              <div className="py-16 text-center rounded-2xl glow-surface" style={CARD}>
                <BookOpen size={36} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"rgba(255,255,255,0.65)" }}>No entries found. Start writing your story.</div>
              </div>
            )}
            {filtered.map(entry => {
              const mood = entry.mood ? moodConfig[entry.mood] : null;
              return (
                <div key={entry.id}
                  className="p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md"
                  style={{ ...CARD, borderColor:selected?.id===entry.id?"#3A5BD9":"rgba(58,91,217,0.1)", borderWidth:selected?.id===entry.id?2:1 }}
                  onClick={() => setSelected(selected?.id===entry.id ? null : entry)}>
                  {/* thumbnail for video */}
                  {entry.thumbnail && (
                    <div style={{ borderRadius:10, overflow:"hidden", marginBottom:12, height:120, position:"relative" }}>
                      <img src={entry.thumbnail} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.3)" }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background:"rgba(22,22,31,0.9)" }}>
                          <Play size={18} color="#FFFFFF" fill="#FFFFFF"/>
                        </div>
                      </div>
                      {entry.duration && <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded" style={{ background:"rgba(0,0,0,0.7)", color:"#fff", fontSize:11, ...MONO }}>{entry.duration}</div>}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO }}>{entry.date}</span>
                        <TypeBadge type={entry.type}/>
                        {entry.private && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"rgba(229,62,62,0.1)", color:"#E53E3E", fontSize:9, ...MONO }}>🔒 PRIVATE</span>}
                      </div>
                      <div style={{ color:"#FFFFFF", fontSize:15, fontWeight:600 }}>{entry.title}</div>
                    </div>
                    {mood && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-xl flex-shrink-0" style={{ background:mood.bg, color:mood.color }}>
                        {mood.icon}
                        <span style={{ fontSize:11, fontWeight:500 }}>{mood.label}</span>
                      </div>
                    )}
                  </div>
                  {entry.body && (
                    <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7 }} className="line-clamp-2">{entry.body}</p>
                  )}
                  {entry.type === "audio" && entry.duration && (
                    <div className="flex items-center gap-3 mt-3 px-4 py-3 rounded-xl" style={{ background:"rgba(58,91,217,0.06)" }}>
                      <button onClick={e => { e.stopPropagation(); setPlayingAudio(playingAudio===entry.id ? null : entry.id); if (playingAudio !== entry.id) toast.success("▶ Playing audio entry — " + entry.duration); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:"#3A5BD9", color:"#fff" }}>
                        {playingAudio===entry.id ? <Pause size={14}/> : <Play size={14}/>}
                      </button>
                      <div style={{ flex:1 }}>
                        <div className="h-1 rounded-full" style={{ background:"rgba(58,91,217,0.2)" }}>
                          <div className="h-1 rounded-full" style={{ width:playingAudio===entry.id?"35%":"0%", background:"#3A5BD9", transition:"width 0.3s" }}/>
                        </div>
                      </div>
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO }}>{entry.duration}</span>
                    </div>
                  )}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#141B2E", color:"#8AA0FF" }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected detail / calendar sidebar */}
          <div className="space-y-4">
            {selected ? (
              <div className="rounded-2xl p-5 sticky top-4 glow-surface" style={CARD}>
                <div className="flex items-center justify-between mb-4">
                  <div style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO }}>{selected.date}</div>
                  <div className="flex gap-1">
                    <button onClick={() => {
                      const newTitle = prompt("Edit entry title:", selected.title);
                      if (newTitle && newTitle.trim()) {
                        setEntries(prev => prev.map(e => e.id === selected.id ? { ...e, title: newTitle.trim() } : e));
                        setSelected(s => s ? { ...s, title: newTitle.trim() } : s);
                        toast.success("Entry updated");
                      }
                    }} style={{ color:"rgba(255,255,255,0.65)", padding:4 }}><Edit2 size={13}/></button>
                    <button onClick={() => { handleDelete(selected.id); }} style={{ color:"#FC8181", padding:4 }}><Trash2 size={13}/></button>
                    <button onClick={() => setSelected(null)} style={{ color:"rgba(255,255,255,0.65)", padding:4 }}><X size={13}/></button>
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-4 flex-wrap">
                  <TypeBadge type={selected.type}/>
                  {selected.mood && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ background:moodConfig[selected.mood].bg, color:moodConfig[selected.mood].color }}>
                      {moodConfig[selected.mood].icon} {moodConfig[selected.mood].label}
                    </span>
                  )}
                  {selected.private && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:"rgba(229,62,62,0.1)", color:"#E53E3E" }}>🔒 Private</span>}
                </div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF", marginBottom:12, fontWeight:600 }}>{selected.title}</div>
                {selected.body && (
                  <div style={{ color:"rgba(255,255,255,0.8)", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{selected.body}</div>
                )}
                {selected.type === "audio" && (
                  <div className="mt-4 px-4 py-4 rounded-xl text-center" style={{ background:"rgba(58,91,217,0.06)", border:"1px solid rgba(58,91,217,0.15)" }}>
                    <Mic size={24} color="#3A5BD9" style={{ margin:"0 auto 8px" }}/>
                    <div style={{ color:"#FFFFFF", fontSize:13 }}>Voice Recording · {selected.duration}</div>
                    <button onClick={() => { setPlayingAudio(playingAudio===selected.id ? null : selected.id); toast.success(playingAudio===selected.id ? "⏸ Paused" : "▶ Playing audio — " + selected.duration); }} className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm" style={{ background:"#3A5BD9", color:"#fff" }}>
                      <Play size={13}/> Play Recording
                    </button>
                  </div>
                )}
                {selected.type === "video" && (
                  <div className="mt-4 rounded-xl overflow-hidden relative" style={{ cursor:"pointer" }} onClick={() => toast.success("▶ Video playback started — demo mode")}>
                    {selected.thumbnail
                      ? <img src={selected.thumbnail} alt="" style={{ width:"100%", height:140, objectFit:"cover" }}/>
                      : <div className="h-32 flex items-center justify-center" style={{ background:"rgba(58,91,217,0.08)" }}><Video size={28} color="#3A5BD9"/></div>
                    }
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.25)" }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background:"rgba(22,22,31,0.9)" }}>
                        <Play size={20} color="#FFFFFF" fill="#FFFFFF"/>
                      </div>
                    </div>
                  </div>
                )}
                {selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {selected.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background:"#141B2E", color:"#8AA0FF" }}>#{t}</span>)}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-6 text-center glow-surface" style={CARD}>
                <BookOpen size={28} color="rgba(58,91,217,0.2)" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:13, marginBottom:12 }}>Select an entry to read</div>
                <div className="space-y-2">
                  <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600 }}>Your Diary Stats</div>
                  {[
                    { label:"Written entries", value:entries.filter(e=>e.type==="written").length },
                    { label:"Voice recordings", value:entries.filter(e=>e.type==="audio").length },
                    { label:"Video entries", value:entries.filter(e=>e.type==="video").length },
                    { label:"Private entries", value:entries.filter(e=>e.private).length },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between px-3 py-2 rounded-lg" style={{ background:"#0F1A33" }}>
                      <span style={{ color:"rgba(255,255,255,0.7)", fontSize:12 }}>{s.label}</span>
                      <span style={{ color:"#8AA0FF", fontSize:12, fontWeight:600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW ENTRY MODAL */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.4)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden glow-surface" style={CARD}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor:"rgba(58,91,217,0.08)" }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#FFFFFF" }}>New Diary Entry</h3>
              <button onClick={() => setCreating(false)} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight:"80vh" }}>
              {/* Entry type selector */}
              <div className="grid grid-cols-4 gap-2">
                {typeButtons.map(tb => (
                  <button key={tb.id} onClick={() => setNewType(tb.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-sm"
                    style={{ background:newType===tb.id?"rgba(58,91,217,0.12)":"#0F1A33", border:`2px solid ${newType===tb.id?"#3A5BD9":"transparent"}`, color:newType===tb.id?"#3A5BD9":"rgba(255,255,255,0.7)" }}>
                    {tb.icon}
                    <span style={{ fontSize:11 }}>{tb.label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>TITLE</label>
                <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="What's on your mind today?"
                  className="w-full px-4 py-3 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:15, outline:"none", fontFamily:"var(--font-display)" }}/>
              </div>

              {/* Written body */}
              {newType === "written" && (
                <div>
                  <label style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>YOUR ENTRY</label>
                  <textarea value={form.body} onChange={e => setForm(p=>({...p,body:e.target.value}))} placeholder="Write freely. This is your space…" rows={8}
                    className="w-full px-4 py-3 rounded-xl resize-none" style={{ background:"#0F1A33", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:14, outline:"none", lineHeight:1.8 }}/>
                </div>
              )}

              {/* Audio recorder */}
              {newType === "audio" && (
                <div className="rounded-2xl" style={{ background:"#0F1A33", border:"1px solid rgba(58,91,217,0.12)" }}>
                  {audioSaved
                    ? <div className="py-6 text-center"><div className="text-2xl mb-2">✅</div><div style={{ color:"#48BB78", fontWeight:600 }}>Audio recorded successfully</div></div>
                    : <AudioRecorder onSave={(blob, dur) => { setAudioSaved(true); toast.success(`Recorded ${dur} of audio`); }}/>}
                </div>
              )}

              {/* Video recorder */}
              {newType === "video" && (
                <div className="rounded-2xl p-4 glow-surface" style={{ background:"#0F1A33", border:"1px solid rgba(58,91,217,0.12)" }}>
                  {videoDuration
                    ? <div className="py-6 text-center"><div className="text-2xl mb-2">✅</div><div style={{ color:"#48BB78", fontWeight:600 }}>Video recorded: {videoDuration}</div></div>
                    : <VideoRecorderPanel onSave={dur => { setVideoDuration(dur); toast.success(`Recorded ${dur} of video`); }}/>}
                </div>
              )}

              {/* Upload */}
              {newType === "photo" && (
                <div>
                  <input ref={fileRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { toast.success(`"${f.name}" attached to entry`); }
                  }}/>
                  <div onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer"
                    style={{ borderColor:"rgba(58,91,217,0.25)", background:"#0F1A33" }}>
                    <Upload size={28} color="#3A5BD9" style={{ opacity:0.6 }}/>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Upload video, photo, or audio file</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>MP4, MOV, JPG, PNG, MP3, WAV</div>
                  </div>
                  <div className="flex justify-center mt-3">
                    <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" attached to diary entry`)} size="sm" label="Or Scan Document"/>
                  </div>
                </div>
              )}

              {/* Mood */}
              <div>
                <label style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>HOW ARE YOU FEELING?</label>
                <div className="flex gap-2">
                  {(Object.entries(moodConfig) as [Mood, typeof moodConfig[Mood]][]).map(([k, cfg]) => (
                    <button key={k} onClick={() => setForm(p=>({...p,mood:k}))}
                      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                      style={{ background:form.mood===k?cfg.bg:"#0F1A33", border:`2px solid ${form.mood===k?cfg.color:"transparent"}`, color:cfg.color }}>
                      {cfg.icon}
                      <span style={{ fontSize:10 }}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags + Privacy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>TAGS (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm(p=>({...p,tags:e.target.value}))} placeholder="family, reflection, love"
                    className="w-full px-4 py-2.5 rounded-xl" style={{ background:"#0F1A33", border:"1px solid rgba(58,91,217,0.12)", color:"#FFFFFF", fontSize:13, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:"rgba(255,255,255,0.65)", fontSize:11, ...MONO, display:"block", marginBottom:4 }}>PRIVACY</label>
                  <button onClick={() => setForm(p=>({...p,private:!p.private}))}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                    style={{ background:form.private?"rgba(229,62,62,0.08)":"#0F1A33", border:`1px solid ${form.private?"rgba(229,62,62,0.25)":"rgba(58,91,217,0.12)"}`, color:form.private?"#E53E3E":"rgba(255,255,255,0.7)" }}>
                    {form.private ? <Lock size={14}/> : <Eye size={14}/>}
                    {form.private ? "Private — restricted" : "Shared with legacy contacts"}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-semibold text-sm"
                  style={{ background:"linear-gradient(135deg,#3A5BD9,#5B7BF5)", color:"#fff", boxShadow:"0 4px 12px rgba(58,91,217,0.3)" }}>
                  <Save size={14} style={{ display:"inline", marginRight:6 }}/>Save Entry
                </button>
                <button onClick={() => setCreating(false)} className="px-6 py-3 rounded-xl text-sm" style={{ background:"#070A12", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
