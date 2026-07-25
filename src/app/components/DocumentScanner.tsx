/**
 * DocumentScanner
 * ──────────────
 * Reusable modal: opens camera → user captures frame → applies "scan" filter
 * (grayscale + contrast + brightness → looks like a scanned document) →
 * returns image blob for upload. Works on phone and desktop.
 *
 * Usage:
 *   <DocumentScanner
 *     open={show}
 *     onClose={() => setShow(false)}
 *     onUpload={(file, previewUrl) => handleUpload(file)}
 *     folder="legal"
 *   />
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera, X, RotateCcw, CheckCircle, Upload, ZoomIn, ZoomOut,
  SwitchCamera, Sun, Contrast, FileText, AlertCircle, Scan
} from "lucide-react";
import { toast } from "sonner";

export interface ScannedDocument {
  file: File;
  previewUrl: string;
  name: string;
}

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onUpload: (doc: ScannedDocument) => void;
  folder?: string;
  defaultName?: string;
}

type ScanMode = "color" | "grayscale" | "blackwhite" | "document";

const SCAN_FILTERS: Record<ScanMode, { label: string; css: string; desc: string }> = {
  color:      { label:"Color",      css:"none",                                            desc:"Original colors" },
  grayscale:  { label:"Grayscale",  css:"grayscale(100%) contrast(1.1) brightness(1.05)", desc:"Standard scan" },
  blackwhite: { label:"B&W",        css:"grayscale(100%) contrast(1.8) brightness(1.1)",  desc:"High contrast" },
  document:   { label:"Document",   css:"grayscale(100%) contrast(1.4) brightness(1.15) saturate(0)", desc:"Best for text" },
};

export function DocumentScanner({ open, onClose, onUpload, folder, defaultName }: DocumentScannerProps) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"camera"|"preview"|"naming">("camera");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>("document");
  const [docName, setDocName] = useState(defaultName ?? "");
  const [docFolder, setDocFolder] = useState(folder ?? "legal");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user"|"environment">("environment");
  const [uploading, setUploading] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const FOLDERS = [
    { id:"legal",    label:"Legal Documents",   emoji:"⚖️" },
    { id:"financial",label:"Financial Records", emoji:"💰" },
    { id:"medical",  label:"Medical Records",   emoji:"🏥" },
    { id:"taxes",    label:"Tax Records",       emoji:"📋" },
    { id:"property", label:"Property",          emoji:"🏠" },
    { id:"insurance",label:"Insurance",         emoji:"🛡️" },
    { id:"personal", label:"Personal Letters",  emoji:"💌" },
    { id:"other",    label:"Other Documents",   emoji:"📁" },
  ];

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width:{ ideal:1920 }, height:{ ideal:1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser settings, or use the file upload option below."
        : "Camera not available on this device. Use file upload instead.";
      setCameraError(msg);
    }
  }, [facing]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (open && phase === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, phase, facing, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      setPhase("camera");
      setCapturedUrl(null);
      setCapturedBlob(null);
      setScanMode("document");
      setDocName(defaultName ?? "");
    }
  }, [open, defaultName]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedUrl(url);
      setCapturedBlob(blob);
      stopCamera();
      setPhase("preview");
    }, "image/jpeg", 0.92);
  }

  function applyFilter(mode: ScanMode) {
    setScanMode(mode);
    const canvas = canvasRef.current;
    if (!canvas || !capturedUrl) return;
    const img = new Image();
    img.src = capturedUrl;
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.filter = SCAN_FILTERS[mode].css;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      canvas.toBlob(blob => {
        if (!blob) return;
        const newUrl = URL.createObjectURL(blob);
        setCapturedUrl(newUrl);
        setCapturedBlob(blob);
      }, "image/jpeg", 0.92);
    };
  }

  function retake() {
    setCapturedUrl(null);
    setCapturedBlob(null);
    setPhase("camera");
    startCamera();
  }

  function confirm() {
    if (!docName.trim()) {
      toast.error("Please give the document a name");
      return;
    }
    if (!capturedBlob) { toast.error("No image captured"); return; }
    setUploading(true);
    setTimeout(() => {
      const fileName = `${docName.trim().replace(/[^a-z0-9]/gi,"_")}_${Date.now()}.jpg`;
      const file = new File([capturedBlob], fileName, { type:"image/jpeg" });
      const url = capturedUrl!;
      setUploading(false);
      onUpload({ file, previewUrl:url, name:docName.trim() });
      toast.success(`"${docName}" scanned and uploaded to ${FOLDERS.find(f=>f.id===docFolder)?.label ?? docFolder}`);
      onClose();
    }, 800);
  }

  // File upload fallback
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCapturedUrl(url);
    setCapturedBlob(file);
    stopCamera();
    setPhase("preview");
    setDocName(file.name.replace(/\.[^.]+$/, "").replace(/_/g," "));
  }

  if (!open) return null;

  const CARD: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(91,110,225,0.1)", borderRadius:16 };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)" }}>

      <div className="w-full max-w-2xl mx-4 rounded-3xl overflow-hidden flex flex-col"
        style={{ background:"#0A0F1E", border:"1px solid rgba(91,110,225,0.2)", maxHeight:"96vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor:"rgba(91,110,225,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background:"rgba(91,110,225,0.15)" }}>
              <Scan size={18} color="#FFFFFF"/>
            </div>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:15, fontWeight:600 }}>Document Scanner</div>
              <div style={{ color:"#4A5A7A", fontSize:11, fontFamily:"var(--font-mono)" }}>
                {phase === "camera" ? "Position document in frame" : phase === "preview" ? "Adjust scan settings" : "Name & upload document"}
              </div>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }}
            style={{ color:"#4A5A7A" }} className="p-1 rounded-lg hover:bg-white/5">
            <X size={18}/>
          </button>
        </div>

        {/* Camera phase */}
        {phase === "camera" && (
          <div className="flex flex-col" style={{ flex:1, minHeight:0 }}>
            <div className="relative flex-1 bg-black" style={{ minHeight:280 }}>
              {cameraError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                  <AlertCircle size={40} color="#FC8181"/>
                  <div style={{ color:"#FC8181", fontSize:14, lineHeight:1.7 }}>{cameraError}</div>
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm"
                    style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
                    <Upload size={15}/> Upload Photo Instead
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect}/>
                </div>
              ) : (
                <>
                  <video ref={videoRef} playsInline muted autoPlay
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  {/* Scan frame overlay */}
                  <div className="absolute inset-6 pointer-events-none"
                    style={{ border:"2px solid rgba(91,110,225,0.7)", borderRadius:8, boxShadow:"0 0 0 4000px rgba(0,0,0,0.35)" }}>
                    {/* Corner marks */}
                    {[["top-0 left-0","border-t-2 border-l-2"],["top-0 right-0","border-t-2 border-r-2"],["bottom-0 left-0","border-b-2 border-l-2"],["bottom-0 right-0","border-b-2 border-r-2"]].map(([pos,border],i) => (
                      <div key={i} className={`absolute ${pos} w-6 h-6 ${border} border-blue-400`}
                        style={{ borderColor:"#5B6EE1" }}/>
                    ))}
                    {/* Scan line animation */}
                    <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(91,110,225,0.8),transparent)", animation:"scanLine 2s linear infinite", top:"50%" }}/>
                  </div>
                  {/* Flash overlay */}
                  {flashActive && <div className="absolute inset-0" style={{ background:"rgba(255,255,255,0.8)" }}/>}
                  {/* Guide text */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="px-4 py-2 rounded-full text-xs" style={{ background:"rgba(0,0,0,0.6)", color:"rgba(255,255,255,0.7)" }}>
                      Keep document flat and well-lit
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Camera controls */}
            {!cameraError && (
              <div className="flex items-center justify-between px-6 py-4" style={{ background:"#060D1A" }}>
                <button onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-1"
                  style={{ color:"#4A5A7A" }}>
                  <Upload size={20}/>
                  <span style={{ fontSize:9, fontFamily:"var(--font-mono)" }}>UPLOAD</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect}/>

                {/* Shutter */}
                <button onClick={capture}
                  className="flex items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{ width:68, height:68, background:"#fff", boxShadow:"0 0 0 4px rgba(255,255,255,0.2)" }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:"#5B6EE1" }}/>
                </button>

                <button onClick={() => setFacing(f => f === "user" ? "environment" : "user")}
                  className="flex flex-col items-center gap-1"
                  style={{ color:"#4A5A7A" }}>
                  <SwitchCamera size={20}/>
                  <span style={{ fontSize:9, fontFamily:"var(--font-mono)" }}>FLIP</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview phase */}
        {phase === "preview" && capturedUrl && (
          <div className="flex flex-col" style={{ flex:1, minHeight:0, overflowY:"auto" }}>
            {/* Preview image */}
            <div className="relative flex-1 bg-black flex items-center justify-center" style={{ minHeight:240 }}>
              <img src={capturedUrl} alt="Scanned document"
                style={{ maxHeight:340, maxWidth:"100%", objectFit:"contain", filter:SCAN_FILTERS[scanMode].css }}/>
            </div>

            {/* Scan mode picker */}
            <div className="px-5 py-4 border-t" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <div style={{ color:"#4A5A7A", fontSize:10, fontFamily:"var(--font-mono)", marginBottom:8 }}>SCAN MODE</div>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(SCAN_FILTERS) as [ScanMode, typeof SCAN_FILTERS[ScanMode]][]).map(([id, cfg]) => (
                  <button key={id} onClick={() => applyFilter(id)}
                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all"
                    style={{ background:scanMode===id?"rgba(91,110,225,0.25)":"rgba(255,255,255,0.04)",
                      border:`1px solid ${scanMode===id?"#5B6EE1":"rgba(255,255,255,0.08)"}` }}>
                    <span style={{ fontSize:10, fontWeight:700, color:scanMode===id?"#6FAE8B":"#4A5A7A" }}>{cfg.label}</span>
                    <span style={{ fontSize:8, color:"#2A3A5A", textAlign:"center", lineHeight:1.3 }}>{cfg.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document name + folder */}
            <div className="px-5 py-4 space-y-3 border-t" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <div>
                <label style={{ color:"#4A5A7A", fontSize:10, fontFamily:"var(--font-mono)", display:"block", marginBottom:6 }}>DOCUMENT NAME *</label>
                <input value={docName} onChange={e => setDocName(e.target.value)}
                  placeholder="e.g. Last Will and Testament"
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(91,110,225,0.3)", color:"#E8EDF5", fontSize:14, outline:"none" }}/>
              </div>
              <div>
                <label style={{ color:"#4A5A7A", fontSize:10, fontFamily:"var(--font-mono)", display:"block", marginBottom:6 }}>SAVE TO FOLDER</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FOLDERS.map(f => (
                    <button key={f.id} onClick={() => setDocFolder(f.id)}
                      className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all"
                      style={{ background:docFolder===f.id?"rgba(91,110,225,0.2)":"rgba(255,255,255,0.04)",
                        border:`1px solid ${docFolder===f.id?"rgba(91,110,225,0.5)":"rgba(255,255,255,0.06)"}` }}>
                      <span style={{ fontSize:14 }}>{f.emoji}</span>
                      <span style={{ fontSize:8, color:docFolder===f.id?"#6FAE8B":"#4A5A7A", lineHeight:1.2 }}>{f.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
              <button onClick={retake}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm"
                style={{ background:"rgba(255,255,255,0.06)", color:"#8A9AB8", border:"1px solid rgba(255,255,255,0.08)" }}>
                <RotateCcw size={14}/> Retake
              </button>
              <button onClick={confirm} disabled={uploading || !docName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA",
                  boxShadow:"0 0 24px rgba(91,110,225,0.4)", opacity:uploading||!docName.trim()?0.6:1 }}>
                {uploading ? (
                  <><RotateCcw size={15} style={{ animation:"spin 1s linear infinite" }}/> Uploading…</>
                ) : (
                  <><CheckCircle size={15}/> Upload to Vault</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display:"none" }}/>

      {/* Scan line animation */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; opacity: 1; }
          45%  { top: 90%; opacity: 1; }
          50%  { opacity: 0; }
          51%  { top: 10%; opacity: 0; }
          55%  { opacity: 1; }
          100% { top: 90%; opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Scan button — drop-in anywhere ──────────────────────────────── */
export function ScanButton({
  onUpload, folder, size = "md", label = "Scan Document",
}: {
  onUpload: (doc: ScannedDocument) => void;
  folder?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  const styles: Record<string, React.CSSProperties> = {
    sm: { padding:"6px 12px", fontSize:11, borderRadius:10, gap:5 },
    md: { padding:"8px 16px", fontSize:13, borderRadius:12, gap:7 },
    lg: { padding:"12px 24px", fontSize:15, borderRadius:14, gap:9 },
  };
  const iconSize = { sm:12, md:14, lg:17 }[size];

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center font-semibold transition-all hover:scale-105"
        style={{ ...styles[size], background:"rgba(91,110,225,0.08)", color:"#6E90C9", border:"1px solid rgba(91,110,225,0.2)" }}>
        <Camera size={iconSize}/> {label}
      </button>
      <DocumentScanner
        open={open}
        onClose={() => setOpen(false)}
        onUpload={doc => { onUpload(doc); setOpen(false); }}
        folder={folder}
      />
    </>
  );
}
