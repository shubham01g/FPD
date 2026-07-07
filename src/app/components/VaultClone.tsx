import React, { useState } from "react";
import {
  Copy, CheckCircle, Download, Users, FileText, Heart,
  Stethoscope, Wallet, Car, Camera, Lock, AlertTriangle,
  X, Shield, BookOpen, Key, PawPrint, Star
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { toast } from "sonner";

const GLASS: React.CSSProperties = {
  background: "rgba(8,15,26,0.95)",
  border: "1px solid rgba(108,92,231,0.2)",
  backdropFilter: "blur(16px)",
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface VaultCloneProps {
  onClose: () => void;
  mode: "clone" | "export" | "template";
}

// Everything included in the full account download
const ALL_CONTENTS = [
  { icon:<FileText size={13}/>,    color:"#6C5CE7", label:"All Documents",         count:"14 files", desc:"All 18 folder categories" },
  { icon:<Heart size={13}/>,       color:"#FC8181", label:"Final Wishes",          count:"5 records",  desc:"Wills, bequests, instructions" },
  { icon:<Stethoscope size={13}/>, color:"#48BB78", label:"Medical Info",          count:"8 records",  desc:"Allergies, medications, directives" },
  { icon:<Wallet size={13}/>,      color:"#F6AD55", label:"Financial Records",     count:"12 records", desc:"Insurance, investments, real estate" },
  { icon:<Car size={13}/>,         color:"#9F7AEA", label:"Personal Assets",       count:"6 records",  desc:"Vehicles, utilities, digital assets" },
  { icon:<Camera size={13}/>,      color:"#8B7CF6", label:"Memories & Media",      count:"24 items",   desc:"Photos, videos, written memories" },
  { icon:<BookOpen size={13}/>,    color:"#ED8936", label:"Digital Diary",         count:"12 entries", desc:"Audio, video, and text entries" },
  { icon:<Key size={13}/>,         color:"#38B2AC", label:"Password Manager",      count:"18 entries", desc:"All saved credentials" },
  { icon:<Users size={13}/>,       color:"#68D391", label:"Contacts & Designations",count:"6 contacts",desc:"Legacy, guardian, emergency contacts" },
  { icon:<PawPrint size={13}/>,    color:"#F6AD55", label:"Pet Records",           count:"5 records",  desc:"Vet records, instructions" },
  { icon:<Lock size={13}/>,        color:"#FC8181", label:"Secret Vault",          count:"3 items",    desc:"Most sensitive items (opt-in)" },
];

export function VaultClone({ onClose, mode }: VaultCloneProps) {
  const { continuationFeePaid } = useDemo();
  const [step, setStep] = useState<"overview"|"confirm"|"downloading"|"done">("overview");
  const [includeSecretVault, setIncludeSecretVault] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadId, setDownloadId] = useState("");

  // In real app, also check deathCertificateVerified from backend
  // For demo: fee paid = unlocked
  const isUnlocked = continuationFeePaid;

  const startDownload = () => {
    setStep("downloading");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 3;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setDownloadId(`LVC-${Date.now().toString(36).toUpperCase()}`);
        setTimeout(() => setStep("done"), 500);
      }
      setProgress(Math.min(p, 100));
    }, 180);
  };

  const totalItems = ALL_CONTENTS.reduce((s, c) => {
    const n = parseInt(c.count.replace(/\D/g,""));
    return s + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.88)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-xl rounded-2xl relative overflow-hidden" style={GLASS}>
        <button onClick={onClose} className="absolute top-5 right-5 z-10" style={{ color:"rgba(255,255,255,0.7)" }}><X size={16}/></button>

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b" style={{ borderColor:"rgba(108,92,231,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:"rgba(108,92,231,0.15)", color:"#A29BFE" }}>
              <Copy size={18}/>
            </div>
            <div>
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#E8EDF5" }}>Legacy Vault Clone</h2>
              <p style={{ color:"rgba(255,255,255,0.55)", fontSize:12, marginTop:2 }}>
                Complete download of all account data for verified legacy contacts
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6 overflow-y-auto" style={{ maxHeight:"75vh" }}>

          {/* ── Locked state ── */}
          {!isUnlocked && step === "overview" && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl text-center"
                style={{ background:"rgba(229,62,62,0.08)", border:"2px solid rgba(229,62,62,0.25)" }}>
                <AlertTriangle size={32} color="#FC8181" style={{ margin:"0 auto 12px" }}/>
                <div style={{ color:"#FC8181", fontSize:16, fontFamily:"var(--font-display)", marginBottom:8 }}>
                  Legacy Vault Clone Locked
                </div>
                <p style={{ color:"rgba(255,255,255,0.65)", fontSize:13, lineHeight:1.7 }}>
                  Downloads are locked until <strong style={{ color:"#E8EDF5" }}>both</strong> conditions are met:
                </p>
                <div className="flex flex-col gap-2 mt-4 text-left">
                  {[
                    { label:"Legacy Continuation Fee paid ($199)", done:false },
                    { label:"Death certificate submitted and verified by FPD admin", done:false },
                  ].map(c => (
                    <div key={c.label} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background:"rgba(229,62,62,0.08)" }}>
                      <X size={12} color="#FC8181" style={{ flexShrink:0 }}/>
                      <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl space-y-3" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.15)" }}>
                <div style={{ color:"#A29BFE", fontSize:12, fontWeight:700, ...MONO }}>WHAT GETS UNLOCKED</div>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:13, lineHeight:1.7 }}>
                  Once both conditions are met, legacy contacts can click this button to download a complete, encrypted package of <strong style={{ color:"#E8EDF5" }}>everything</strong> in this account — {totalItems}+ items across all 30+ life categories.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ALL_CONTENTS.slice(0,8).map(item => (
                    <div key={item.label} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background:"rgba(255,255,255,0.03)" }}>
                      <span style={{ color:item.color }}>{item.icon}</span>
                      <span style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background:"rgba(108,92,231,0.1)", color:"#A29BFE", border:"1px solid rgba(108,92,231,0.2)" }}>
                Close
              </button>
            </div>
          )}

          {/* ── Unlocked: Overview ── */}
          {isUnlocked && step === "overview" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl flex items-start gap-3"
                style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.25)" }}>
                <Shield size={16} color="#48BB78" style={{ marginTop:1, flexShrink:0 }}/>
                <div>
                  <div style={{ color:"#48BB78", fontSize:13, fontWeight:600, marginBottom:2 }}>
                    Legacy Vault Clone Unlocked
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, lineHeight:1.6 }}>
                    Legacy Continuation Fee paid and confirmation of passing verified by FPD administrators. This download contains <strong style={{ color:"#E8EDF5" }}>everything</strong> in the account — {totalItems}+ items across all categories.
                  </div>
                </div>
              </div>

              <div>
                <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11, ...MONO, marginBottom:10 }}>COMPLETE ACCOUNT CONTENTS</div>
                <div className="space-y-1.5">
                  {ALL_CONTENTS.filter(c => c.label !== "Secret Vault" || includeSecretVault).map(item => (
                    <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ color:item.color, flexShrink:0 }}>{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:500 }}>{item.label}</span>
                        <span style={{ color:"rgba(255,255,255,0.55)", fontSize:11, marginLeft:6 }}>{item.desc}</span>
                      </div>
                      <span style={{ color:item.color, fontSize:10, ...MONO, flexShrink:0 }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl"
                style={{ background:"rgba(252,129,129,0.06)", border:"1px solid rgba(252,129,129,0.15)" }}>
                <input type="checkbox" checked={includeSecretVault}
                  onChange={e => setIncludeSecretVault(e.target.checked)}
                  style={{ accentColor:"#FC8181", width:15, height:15, marginTop:2, flexShrink:0 }}/>
                <div>
                  <div style={{ color:"#E8EDF5", fontSize:13 }}>Include Secret Vault (3 items)</div>
                  <div style={{ color:"#FC8181", fontSize:11, marginTop:2 }}>
                    Contains seed phrases, safe combinations, and ultra-sensitive items. Handle with extreme care.
                  </div>
                </div>
              </label>

              <button onClick={() => setStep("confirm")}
                className="w-full py-4 rounded-xl font-bold text-base"
                style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", boxShadow:"0 0 28px rgba(108,92,231,0.45)" }}>
                <Download size={16} style={{ display:"inline", marginRight:8 }}/>
                Download Complete Legacy Package
              </button>
            </div>
          )}

          {/* ── Confirm ── */}
          {isUnlocked && step === "confirm" && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} color="#F6AD55"/>
                  <span style={{ color:"#F6AD55", fontSize:13, fontWeight:700 }}>Confirm Complete Download</span>
                </div>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:13, lineHeight:1.7 }}>
                  You are about to download a complete encrypted package of this account. This includes{" "}
                  <strong style={{ color:"#E8EDF5" }}>all documents, records, memories, diary entries, financial information, medical records, and personal data</strong>{" "}
                  that was saved to this Final Pass Down account. {includeSecretVault && <strong style={{ color:"#FC8181" }}>Secret Vault items are included.</strong>}
                </p>
              </div>

              <div className="p-4 rounded-2xl" style={{ background:"rgba(108,92,231,0.06)", border:"1px solid rgba(108,92,231,0.15)" }}>
                <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11, ...MONO, marginBottom:8 }}>DOWNLOAD SUMMARY</div>
                {[
                  ["Total Items",      `${totalItems}+ records`],
                  ["Categories",       "30+ life categories"],
                  ["Encrypted",        "AES-256 — decryption key separate"],
                  ["Format",           "Encrypted ZIP package"],
                  ["Download ID",      `Will be generated on confirm`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b"
                    style={{ borderColor:"rgba(108,92,231,0.08)" }}>
                    <span style={{ color:"rgba(255,255,255,0.55)", fontSize:12 }}>{k}</span>
                    <span style={{ color:"rgba(255,255,255,0.8)", fontSize:12 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("overview")}
                  className="flex-1 py-3 rounded-xl text-sm"
                  style={{ background:"rgba(108,92,231,0.06)", color:"#A29BFE", border:"1px solid rgba(108,92,231,0.2)" }}>
                  ← Back
                </button>
                <button onClick={startDownload}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", boxShadow:"0 0 20px rgba(108,92,231,0.4)" }}>
                  Confirm & Download
                </button>
              </div>
            </div>
          )}

          {/* ── Downloading ── */}
          {step === "downloading" && (
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background:"rgba(108,92,231,0.15)", border:"1px solid rgba(108,92,231,0.3)" }}>
                <Download size={28} color="#6C5CE7" style={{ animation:"bounce 1s infinite" }}/>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#E8EDF5", marginBottom:6 }}>
                  Preparing Your Legacy Package
                </div>
                <div style={{ color:"rgba(255,255,255,0.55)", fontSize:13 }}>
                  Encrypting and packaging all account data...
                </div>
              </div>
              <div className="h-2 rounded-full mx-auto" style={{ background:"rgba(108,92,231,0.15)", maxWidth:320 }}>
                <div className="h-2 rounded-full transition-all duration-300"
                  style={{ width:`${progress}%`, background:"linear-gradient(90deg,#6C5CE7,#8B7CF6)", boxShadow:"0 0 12px rgba(108,92,231,0.5)" }}/>
              </div>
              <div style={{ color:"#6C5CE7", fontSize:14, ...MONO }}>{Math.round(progress)}%</div>
              <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11 }}>
                {progress < 30 ? "Gathering documents and records..." :
                 progress < 60 ? "Packaging memories and media..." :
                 progress < 85 ? "Encrypting complete package..." :
                 "Finalizing download..."}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background:"rgba(72,187,120,0.12)", border:"1px solid rgba(72,187,120,0.3)", boxShadow:"0 0 30px rgba(72,187,120,0.15)" }}>
                <CheckCircle size={30} color="#48BB78"/>
              </div>
              <div>
                <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"#E8EDF5", marginBottom:6 }}>
                  Legacy Package Ready
                </div>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:13, lineHeight:1.7 }}>
                  The complete account package has been prepared. This encrypted file contains everything saved to this Final Pass Down account.
                </p>
              </div>

              <div className="px-4 py-3 rounded-xl" style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
                <div style={{ color:"#48BB78", fontSize:10, ...MONO, marginBottom:3 }}>DOWNLOAD REFERENCE ID</div>
                <div style={{ color:"#48BB78", fontFamily:"var(--font-mono)", fontSize:15, fontWeight:700 }}>{downloadId}</div>
              </div>

              <div className="p-4 rounded-2xl text-left space-y-2"
                style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.18)" }}>
                <div style={{ color:"#F6AD55", fontSize:11, fontWeight:700, ...MONO }}>IMPORTANT</div>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:12, lineHeight:1.7 }}>
                  Keep this encrypted file and its decryption key secure. The package contains all of the account holder's personal, financial, and sensitive information. Share only with verified legacy contacts.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => toast.success("Legacy package download started (demo)")}
                  className="flex items-center gap-2 flex-1 justify-center py-3.5 rounded-xl text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", boxShadow:"0 0 20px rgba(108,92,231,0.35)" }}>
                  <Download size={14}/> Save to Device
                </button>
                <button onClick={onClose} className="flex-1 py-3.5 rounded-xl text-sm"
                  style={{ background:"rgba(108,92,231,0.08)", color:"#A29BFE", border:"1px solid rgba(108,92,231,0.2)" }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
