/**
 * WGVideoSession — Live camera session panel for White Glove specialists.
 * Opens the specialist's real webcam via getUserMedia.
 * Shows client feed placeholder (production: WebRTC peer connection).
 * Includes call controls + live document tools so specialist can
 * work WITH the client while both are on camera.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Monitor,
  Camera, Upload, FileText, Maximize2, Minimize2, X,
  CheckCircle, Folder, Star, Users, Clock, AlertTriangle,
  ChevronRight, RotateCcw, ZoomIn
} from "lucide-react";
import { toast } from "sonner";

const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

/* ── Vault sections specialist can navigate to during call ────────── */
const VAULT_SECTIONS = [
  { id:"will",        icon:"⚖️",  label:"Will & Trusts" },
  { id:"insurance",   icon:"🛡️",  label:"Insurance Policies" },
  { id:"medical",     icon:"🏥",  label:"Medical Info" },
  { id:"financial",   icon:"💰",  label:"Financial Records" },
  { id:"property",    icon:"🏠",  label:"Property Docs" },
  { id:"contacts",    icon:"👥",  label:"Legacy Contacts" },
  { id:"messages",    icon:"💬",  label:"Final Messages" },
  { id:"photos",      icon:"📷",  label:"Memories & Photos" },
  { id:"pets",        icon:"🐾",  label:"Pet Records" },
  { id:"passwords",   icon:"🔑",  label:"Password Manager" },
];

interface WGVideoSessionProps {
  clientName: string;
  clientId: string;
  specialistName: string;
  onEnd?: () => void;
}

type CallMode = "video" | "phone";

export function WGVideoSession({ clientName, clientId, specialistName, onEnd }: WGVideoSessionProps) {
  /* ── call state ──────────────────────────────────────────────────── */
  const [callState, setCallState] = useState<"idle"|"connecting"|"live"|"ended">("idle");
  const [callMode, setCallMode] = useState<CallMode | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [docsUploaded, setDocsUploaded] = useState<string[]>([]);
  const [clientConnected, setClientConnected] = useState(false);
  const [showTools, setShowTools] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── start session (video or phone) ─────────────────────────────── */
  const startSession = useCallback(async (mode: CallMode) => {
    setCallMode(mode);
    setCallState("connecting");
    setCameraError(null);

    if (mode === "video") {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
        setCallState("live");
        setTimeout(() => {
          setClientConnected(true);
          toast.success(`${clientName} has joined the video call`);
        }, 2500);
      } catch (err: any) {
        setCameraError(err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permission in your browser and try again."
          : "Camera not available. Check that your camera is connected and not in use by another app.");
        setCallMode(null);
        setCallState("idle");
        return;
      }
    } else {
      // Phone call — no camera needed, simulate connecting
      setTimeout(() => {
        setCallState("live");
        setClientConnected(true);
        toast.success(`Phone call connected with ${clientName}`);
      }, 1500);
    }

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, [clientName]);

  /* ── stop camera ─────────────────────────────────────────────────── */
  const endCall = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setCallState("ended");
    setClientConnected(false);
    const mins = Math.ceil(elapsed / 60);
    const blocks = Math.ceil(mins / 30);
    toast.success(`Session ended · ${formatTime(elapsed)} · $${blocks * 25} billed`);
    onEnd?.();
  }, [stream, elapsed, onEnd]);

  /* ── toggle camera on/off mid-call ──────────────────────────────── */
  function toggleCam() {
    stream?.getVideoTracks().forEach(t => { t.enabled = !camOn; });
    setCamOn(v => !v);
    toast(camOn ? "Camera off" : "Camera on");
  }

  function toggleMic() {
    stream?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(v => !v);
    toast(micOn ? "Mic muted" : "Mic unmuted");
  }

  /* ── timer display ───────────────────────────────────────────────── */
  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }

  const blocks = Math.ceil(Math.max(1, Math.ceil(elapsed / 60)) / 30);
  const charge = blocks * 25;

  /* ── clean up on unmount ─────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stream]);

  /* ── re-attach stream to video element after mount ───────────────── */
  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream, minimized]);

  /* ── IDLE — choose call type ─────────────────────────────────────── */
  if (callState === "idle") {
    return (
      <div className="rounded-2xl p-5 space-y-4"
        style={{ background:"rgba(159,122,234,0.04)", border:"1px dashed rgba(159,122,234,0.25)" }}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl"
            style={{ width:44, height:44, background:"rgba(159,122,234,0.12)" }}>
            <Phone size={20} color="#9F7AEA"/>
          </div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#0D1428" }}>
              Start a Session with {clientName}
            </div>
            <div style={{ color:"#8A9AB8", fontSize:11 }}>
              Choose how you'd like to connect — billing timer starts automatically
            </div>
          </div>
        </div>

        {cameraError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background:"rgba(252,129,129,0.08)", border:"1px solid rgba(252,129,129,0.2)" }}>
            <AlertTriangle size={13} color="#FC8181" style={{ marginTop:1, flexShrink:0 }}/>
            <span style={{ color:"#FC8181", fontSize:12, lineHeight:1.5 }}>{cameraError}</span>
          </div>
        )}

        {/* Two options */}
        <div className="grid grid-cols-2 gap-3">

          {/* Video call option */}
          <button onClick={() => startSession("video")}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl text-left transition-all group"
            style={{ background:"rgba(159,122,234,0.06)", border:"2px solid rgba(159,122,234,0.25)" }}>
            <div className="flex items-center justify-center rounded-2xl"
              style={{ width:52, height:52, background:"rgba(159,122,234,0.15)", border:"1px solid rgba(159,122,234,0.3)" }}>
              <Video size={22} color="#9F7AEA"/>
            </div>
            <div className="text-center">
              <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"#0D1428", fontWeight:700 }}>
                Video Call
              </div>
              <div style={{ color:"#8A9AB8", fontSize:10, marginTop:3, lineHeight:1.5 }}>
                See each other on camera while uploading documents together
              </div>
            </div>
            <div className="w-full space-y-1">
              {["Live camera for both parties","Screen share available","Upload docs while on camera"].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs" style={{ color:"#9F7AEA" }}>
                  <CheckCircle size={9}/> {f}
                </div>
              ))}
            </div>
            <div className="w-full py-2 rounded-xl text-xs font-bold text-center"
              style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F" }}>
              Start Video Call
            </div>
          </button>

          {/* Phone call option */}
          <button onClick={() => startSession("phone")}
            className="flex flex-col items-center gap-3 p-4 rounded-2xl text-left transition-all group"
            style={{ background:"rgba(74,144,217,0.06)", border:"2px solid rgba(74,144,217,0.25)" }}>
            <div className="flex items-center justify-center rounded-2xl"
              style={{ width:52, height:52, background:"rgba(74,144,217,0.15)", border:"1px solid rgba(74,144,217,0.3)" }}>
              <Phone size={22} color="#4A90D9"/>
            </div>
            <div className="text-center">
              <div style={{ fontFamily:"var(--font-display)", fontSize:13, color:"#0D1428", fontWeight:700 }}>
                Phone Call
              </div>
              <div style={{ color:"#8A9AB8", fontSize:10, marginTop:3, lineHeight:1.5 }}>
                Traditional phone call while you handle everything on their behalf
              </div>
            </div>
            <div className="w-full space-y-1">
              {["No camera required","Client stays on their phone","You upload docs on their behalf"].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-xs" style={{ color:"#4A90D9" }}>
                  <CheckCircle size={9}/> {f}
                </div>
              ))}
            </div>
            <div className="w-full py-2 rounded-xl text-xs font-bold text-center"
              style={{ background:"linear-gradient(135deg,#4A90D9,#6BAEE8)", color:"#fff" }}>
              Start Phone Call
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background:"rgba(32,64,192,0.04)", border:"1px solid rgba(32,64,192,0.08)" }}>
          <Clock size={11} color="#8A9AB8"/>
          <span style={{ color:"#8A9AB8", fontSize:11 }}>
            Billing starts when the session begins · $25 per 30-minute block · charged to card on file
          </span>
        </div>
      </div>
    );
  }

  /* ── CONNECTING ──────────────────────────────────────────────────── */
  if (callState === "connecting") {
    const isVideo = callMode === "video";
    return (
      <div className="rounded-2xl p-8 flex flex-col items-center gap-4"
        style={{ background:"#0D1428", border:`1px solid ${isVideo?"rgba(159,122,234,0.3)":"rgba(74,144,217,0.3)"}` }}>
        <div className="flex items-center justify-center rounded-full"
          style={{ width:60, height:60, background:isVideo?"rgba(159,122,234,0.15)":"rgba(74,144,217,0.15)", border:`2px solid ${isVideo?"rgba(159,122,234,0.4)":"rgba(74,144,217,0.4)"}` }}>
          {isVideo ? <Video size={24} color="#9F7AEA"/> : <Phone size={24} color="#4A90D9"/>}
        </div>
        <div style={{ color:"#E8EDF5", fontFamily:"var(--font-display)", fontSize:16 }}>
          {isVideo ? "Starting video call…" : "Connecting phone call…"}
        </div>
        <div style={{ color:"#5A6A88", fontSize:12, textAlign:"center" }}>
          {isVideo
            ? `Requesting camera · connecting to ${clientName}`
            : `Dialing ${clientName} · please have them pick up`}
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background:isVideo?"#9F7AEA":"#4A90D9", animation:`pulse 1.2s ease-in-out ${i*0.3}s infinite alternate`, opacity:0.6 }}/>
          ))}
        </div>
      </div>
    );
  }

  /* ── ENDED ───────────────────────────────────────────────────────── */
  if (callState === "ended") {
    return (
      <div className="rounded-2xl p-5 space-y-3"
        style={{ background:"rgba(72,187,120,0.05)", border:"1px solid rgba(72,187,120,0.2)" }}>
        <div className="flex items-center gap-3">
          <CheckCircle size={20} color="#48BB78"/>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:14, color:"#0D1428" }}>
              {callMode === "video" ? "Video Session" : "Phone Call"} Complete
            </div>
            <div style={{ color:"#5A6A88", fontSize:12 }}>Duration: {formatTime(elapsed)} · ${charge} billed to card on file</div>
          </div>
        </div>
        {docsUploaded.length > 0 && (
          <div>
            <div style={{ color:"#8A9AB8", fontSize:10, ...MONO, marginBottom:4 }}>UPLOADED THIS SESSION</div>
            <div className="space-y-1">
              {docsUploaded.map(d => (
                <div key={d} className="flex items-center gap-2 text-xs" style={{ color:"#5A6A88" }}>
                  <CheckCircle size={10} color="#48BB78"/>{d}
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => { setCallState("idle"); setElapsed(0); setDocsUploaded([]); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background:"rgba(159,122,234,0.1)", color:"#9F7AEA" }}>
          <Video size={13}/> Start New Session
        </button>
      </div>
    );
  }

  /* ── LIVE — full session panel ───────────────────────────────────── */
  const isVideo = callMode === "video";
  const accentColor = isVideo ? "#9F7AEA" : "#4A90D9";

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background:"#0D1428", border:`1px solid ${isVideo?"rgba(159,122,234,0.3)":"rgba(74,144,217,0.3)"}`, boxShadow:"0 8px 32px rgba(7,13,26,0.4)" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background:"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background:"rgba(252,129,129,0.15)", border:"1px solid rgba(252,129,129,0.35)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#FC8181", animation:"pulse 1s ease-in-out infinite" }}/>
            <span style={{ color:"#FC8181", fontSize:10, fontWeight:700, ...MONO }}>
              {isVideo ? "VIDEO" : "PHONE"}
            </span>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-1.5" style={{ color:"#E8EDF5" }}>
            <Clock size={12} color="#9F7AEA"/>
            <span style={{ fontSize:14, fontWeight:700, ...MONO }}>{formatTime(elapsed)}</span>
          </div>
          {/* Billing */}
          <div className="px-2 py-0.5 rounded text-xs" style={{ background:"rgba(159,122,234,0.15)", color:"#C4B5FD", ...MONO }}>
            ${charge} · {blocks} block{blocks !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTools(t => !t)}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background:showTools?"rgba(159,122,234,0.2)":"rgba(255,255,255,0.06)", color:showTools?"#C4B5FD":"#8A9AB8" }}>
            <Folder size={11} style={{ display:"inline", marginRight:4 }}/>Tools
          </button>
          <button onClick={() => setMinimized(m => !m)} style={{ color:"#8A9AB8" }}>
            {minimized ? <Maximize2 size={14}/> : <Minimize2 size={14}/>}
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="flex" style={{ minHeight:320 }}>

          {/* ── Session feed area ───────────────────────────────────── */}
          <div className="flex-1 relative" style={{ minWidth:0 }}>

            {isVideo ? (
              /* VIDEO MODE — camera feeds */
              <div className="relative w-full" style={{ height:280, background:"#111827" }}>
                {/* Client feed */}
                {clientConnected ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ background:"linear-gradient(135deg,#1a1f36,#0f1626)" }}>
                    <div className="flex items-center justify-center rounded-full font-bold"
                      style={{ width:72, height:72, background:"rgba(159,122,234,0.2)", color:"#C4B5FD", fontSize:28, fontFamily:"var(--font-display)" }}>
                      {clientName.split(" ").map(w=>w[0]).join("").slice(0,2)}
                    </div>
                    <div style={{ color:"#E8EDF5", fontSize:14, fontFamily:"var(--font-display)" }}>{clientName}</div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                      style={{ background:"rgba(72,187,120,0.12)", border:"1px solid rgba(72,187,120,0.25)" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background:"#48BB78" }}/>
                      <span style={{ color:"#48BB78", fontSize:11 }}>Connected · camera on</span>
                    </div>
                    <div style={{ color:"#5A6A88", fontSize:11 }}>Client video feed · WebRTC in production</div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background:"#0f1626" }}>
                    <Users size={32} color="#374151"/>
                    <div style={{ color:"#5A6A88", fontSize:13 }}>Waiting for {clientName} to join…</div>
                    <div style={{ color:"#374151", fontSize:11 }}>Client received a video join link</div>
                    <div className="flex gap-1.5 mt-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full"
                          style={{ background:"#4B5563", animation:`pulse 1.2s ease-in-out ${i*0.4}s infinite alternate` }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs"
                  style={{ background:"rgba(0,0,0,0.6)", color:"#E8EDF5", ...MONO }}>{clientName}</div>

                {/* Specialist PiP */}
                <div className="absolute bottom-4 right-4 rounded-xl overflow-hidden"
                  style={{ width:120, height:90, border:"2px solid rgba(159,122,234,0.5)", boxShadow:"0 4px 16px rgba(0,0,0,0.5)" }}>
                  {camOn ? (
                    <video ref={localVideoRef} autoPlay muted playsInline
                      style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)" }}/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background:"#1f2937" }}>
                      <VideoOff size={20} color="#6B7280"/>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded"
                    style={{ background:"rgba(0,0,0,0.7)", color:"#E8EDF5", fontSize:9, ...MONO }}>You</div>
                </div>
              </div>

            ) : (
              /* PHONE MODE — audio-only panel */
              <div className="flex flex-col items-center justify-center gap-4 py-10"
                style={{ background:"linear-gradient(135deg,#0d1a2b,#0f1626)", minHeight:200 }}>
                {/* Animated call ring */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute rounded-full" style={{ width:100, height:100, border:"2px solid rgba(74,144,217,0.15)", animation:"pulse 2s ease-in-out infinite" }}/>
                  <div className="absolute rounded-full" style={{ width:80, height:80, border:"2px solid rgba(74,144,217,0.25)", animation:"pulse 2s ease-in-out 0.5s infinite" }}/>
                  <div className="flex items-center justify-center rounded-full font-bold"
                    style={{ width:64, height:64, background:"rgba(74,144,217,0.2)", color:"#6BAEE8", fontSize:22, fontFamily:"var(--font-display)", border:"2px solid rgba(74,144,217,0.4)", position:"relative" }}>
                    {clientName.split(" ").map(w=>w[0]).join("").slice(0,2)}
                  </div>
                </div>
                <div style={{ color:"#E8EDF5", fontFamily:"var(--font-display)", fontSize:16 }}>{clientName}</div>
                {clientConnected ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                    style={{ background:"rgba(72,187,120,0.12)", border:"1px solid rgba(72,187,120,0.25)" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background:"#48BB78", animation:"pulse 1s ease-in-out infinite" }}/>
                    <span style={{ color:"#48BB78", fontSize:12, fontWeight:600 }}>On the line · audio only</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2" style={{ color:"#5A6A88", fontSize:12 }}>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full"
                          style={{ background:"#4A90D9", animation:`pulse 1.2s ease-in-out ${i*0.4}s infinite alternate` }}/>
                      ))}
                    </div>
                    Dialing {clientName}…
                  </div>
                )}
                <div style={{ color:"#374151", fontSize:11, textAlign:"center" }}>
                  You are uploading documents on their behalf during this call
                </div>
              </div>
            )}
          </div>

          {/* ── Document tools panel ─────────────────────────────────── */}
          {showTools && (
            <div className="flex-shrink-0 border-l overflow-y-auto"
              style={{ width:220, borderColor:"rgba(255,255,255,0.07)", background:"rgba(255,255,255,0.02)" }}>
              <div className="p-3 space-y-3">

                {/* Quick upload */}
                <div>
                  <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:6 }}>UPLOAD DURING CALL</div>
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background:"rgba(159,122,234,0.15)", color:"#C4B5FD", border:"1px dashed rgba(159,122,234,0.4)" }}>
                    <Upload size={12}/> Upload Document
                    <input type="file" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      toast.success(`"${file.name}" saved to ${clientName}'s vault`);
                      setDocsUploaded(prev => [...prev, file.name]);
                      setActiveSection(null);
                    }}/>
                  </label>
                </div>

                {/* Vault section picker */}
                <div>
                  <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:6 }}>SAVE TO VAULT SECTION</div>
                  <div className="space-y-1">
                    {VAULT_SECTIONS.map(sec => (
                      <button key={sec.id}
                        onClick={() => {
                          setActiveSection(sec.id);
                          toast.success(`Now filing into: ${sec.label}`);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-all"
                        style={{
                          background: activeSection===sec.id ? "rgba(159,122,234,0.2)" : "rgba(255,255,255,0.03)",
                          color: activeSection===sec.id ? "#C4B5FD" : "#9CA3AF",
                          border: `1px solid ${activeSection===sec.id ? "rgba(159,122,234,0.4)" : "transparent"}`,
                        }}>
                        <span style={{ fontSize:14 }}>{sec.icon}</span>
                        <span style={{ flex:1 }}>{sec.label}</span>
                        {activeSection===sec.id && <ChevronRight size={10} color="#9F7AEA"/>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uploaded this session */}
                {docsUploaded.length > 0 && (
                  <div>
                    <div style={{ color:"#8A9AB8", fontSize:9, ...MONO, marginBottom:6 }}>
                      UPLOADED ({docsUploaded.length})
                    </div>
                    <div className="space-y-1">
                      {docsUploaded.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color:"#48BB78" }}>
                          <CheckCircle size={9}/>{d.length > 20 ? d.slice(0,18)+"…" : d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Call controls ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-4"
        style={{ background:"rgba(0,0,0,0.3)", borderTop:"1px solid rgba(255,255,255,0.06)" }}>

        {/* Mic */}
        <button onClick={toggleMic}
          className="flex items-center justify-center rounded-full transition-all"
          style={{ width:44, height:44, background:micOn?"rgba(255,255,255,0.1)":"rgba(252,129,129,0.2)", border:`1px solid ${micOn?"rgba(255,255,255,0.15)":"rgba(252,129,129,0.4)"}`, color:micOn?"#E8EDF5":"#FC8181" }}>
          {micOn ? <Mic size={18}/> : <MicOff size={18}/>}
        </button>

        {/* Camera — only in video mode */}
        {isVideo && (
          <button onClick={toggleCam}
            className="flex items-center justify-center rounded-full transition-all"
            style={{ width:44, height:44, background:camOn?"rgba(255,255,255,0.1)":"rgba(252,129,129,0.2)", border:`1px solid ${camOn?"rgba(255,255,255,0.15)":"rgba(252,129,129,0.4)"}`, color:camOn?"#E8EDF5":"#FC8181" }}>
            {camOn ? <Video size={18}/> : <VideoOff size={18}/>}
          </button>
        )}

        {/* Share screen — video mode only */}
        {isVideo && (
          <button onClick={() => toast.success("Screen sharing — available in production via WebRTC getDisplayMedia")}
            className="flex items-center justify-center rounded-full"
            style={{ width:44, height:44, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#9CA3AF" }}>
            <Monitor size={18}/>
          </button>
        )}

        {/* Invite / notify client */}
        <button onClick={() => toast.success(`${isVideo ? "Video join link" : "Call reminder"} sent to ${clientName} via SMS`)}
          className="flex items-center justify-center rounded-full"
          style={{ width:44, height:44, background:`rgba(${isVideo?"159,122,234":"74,144,217"},0.15)`, border:`1px solid rgba(${isVideo?"159,122,234":"74,144,217"},0.35)`, color:isVideo?"#C4B5FD":"#6BAEE8" }}>
          <Users size={18}/>
        </button>

        {/* End call */}
        <button onClick={endCall}
          className="flex items-center justify-center rounded-full"
          style={{ width:52, height:52, background:"#DC2626", border:"1px solid rgba(220,38,38,0.5)", color:"#fff", boxShadow:"0 0 16px rgba(220,38,38,0.4)" }}>
          <PhoneOff size={20}/>
        </button>
      </div>
    </div>
  );
}
