import React, { useState } from "react";
import {
  Copy, CheckCircle, Download, Users, FileText, Heart,
  Stethoscope, Wallet, Car, Camera, Lock, AlertTriangle,
  X, Shield, BookOpen, Key, PawPrint
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { toast } from "sonner";

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

interface VaultCloneProps {
  onClose: () => void;
  mode: "clone" | "export" | "template";
}

// Everything included in the full account download
const ALL_CONTENTS = [
  { icon:<FileText size={13}/>,    color:"#6E90C9", label:"All Documents",         count:"14 files", desc:"All 18 folder categories" },
  { icon:<Heart size={13}/>,       color:"#FC8181", label:"Final Wishes",          count:"5 records",  desc:"Wills, bequests, instructions" },
  { icon:<Stethoscope size={13}/>, color:"#D99A6B", label:"Medical Info",          count:"8 records",  desc:"Allergies, medications, directives" },
  { icon:<Wallet size={13}/>,      color:"#F6AD55", label:"Financial Records",     count:"12 records", desc:"Insurance, investments, real estate" },
  { icon:<Car size={13}/>,         color:"#6FAE8B",   label:"Personal Assets",       count:"6 records",  desc:"Vehicles, utilities, digital assets" },
  { icon:<Camera size={13}/>,      color:"#6E90C9", label:"Memories & Media",      count:"24 items",   desc:"Photos, videos, written memories" },
  { icon:<BookOpen size={13}/>,    color:"#ED8936", label:"Digital Diary",         count:"12 entries", desc:"Audio, video, and text entries" },
  { icon:<Key size={13}/>,         color:"#D68FA8", label:"Password Manager",      count:"18 entries", desc:"All saved credentials" },
  { icon:<Users size={13}/>,       color:"#68D391", label:"Contacts & Designations",count:"6 contacts",desc:"Legacy, guardian, emergency contacts" },
  { icon:<PawPrint size={13}/>,    color:"#F6AD55", label:"Pet Records",           count:"5 records",  desc:"Vet records, instructions" },
  { icon:<Lock size={13}/>,        color:"#FC8181", label:"Secret Vault",          count:"3 items",    desc:"Most sensitive items (opt-in)" },
];

/* All styling scoped under .fpd-vclone so nothing else in the app is affected. */
const VCLONE_CSS = `
.fpd-vclone{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,12,0.86);backdrop-filter:blur(8px);}
.fpd-vclone *{box-sizing:border-box;}
.fpd-vclone .modal{width:100%;max-width:560px;position:relative;overflow:hidden;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.34);border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 30px 80px rgba(0,0,0,0.6);}
.fpd-vclone .close-btn{position:absolute;top:20px;right:20px;z-index:10;color:${MUTED};background:none;border:none;cursor:pointer;display:flex;}
.fpd-vclone .modal-head{padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,0.34);display:flex;align-items:center;gap:12px;}
.fpd-vclone .head-ico{width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.16);color:#FFFFFF;}
.fpd-vclone .head-title{font-family:var(--font-display);font-size:18px;color:${TEXT};}
.fpd-vclone .head-sub{color:${MUTED};font-size:12px;margin-top:2px;}
.fpd-vclone .modal-body{padding:24px 28px;overflow-y:auto;max-height:75vh;display:flex;flex-direction:column;gap:18px;}

.fpd-vclone .panel{border-radius:16px;padding:20px;}
.fpd-vclone .panel-locked{text-align:center;background:rgba(208,107,107,0.10);border:2px solid rgba(208,107,107,0.3);}
.fpd-vclone .panel-locked .lock-title{color:${NEG};font-size:16px;font-family:var(--font-display);margin:12px 0 8px;}
.fpd-vclone .panel-locked p{color:${MUTED};font-size:13px;line-height:1.7;}
.fpd-vclone .cond-row{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:9px;background:rgba(208,107,107,0.10);}
.fpd-vclone .cond-row span{color:${MUTED};font-size:12px;}
.fpd-vclone .panel-info{background:rgba(91,110,225,0.07);border:1px solid rgba(91,110,225,0.18);}
.fpd-vclone .panel-info-lbl{color:#6FAE8B;font-size:12px;font-weight:700;font-family:var(--font-mono);margin-bottom:8px;}
.fpd-vclone .panel-info p{color:${MUTED};font-size:13px;line-height:1.7;}
.fpd-vclone .preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;}
.fpd-vclone .preview-chip{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:9px;background:rgba(255,255,255,0.03);}
.fpd-vclone .preview-chip span{color:${MUTED};font-size:11px;}
.fpd-vclone .btn-close{width:100%;padding:13px;border-radius:12px;font-size:13px;font-weight:600;background:rgba(91,110,225,0.10);color:#6FAE8B;border:1px solid rgba(91,110,225,0.24);cursor:pointer;font-family:var(--font-body);}

.fpd-vclone .panel-unlocked{display:flex;align-items:flex-start;gap:12px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.28);}
.fpd-vclone .panel-unlocked-title{color:#D99A6B;font-size:13px;font-weight:600;margin-bottom:3px;}
.fpd-vclone .panel-unlocked p{color:${MUTED};font-size:12px;line-height:1.6;}

.fpd-vclone .contents-lbl{color:${MUTED};font-size:11px;font-family:var(--font-mono);margin-bottom:10px;}
.fpd-vclone .content-row{display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.34);}
.fpd-vclone .content-row + .content-row{margin-top:6px;}
.fpd-vclone .content-label{color:${SOFT};font-size:12px;font-weight:500;}
.fpd-vclone .content-desc{color:${MUTED};font-size:11px;margin-left:6px;}
.fpd-vclone .content-count{color:inherit;font-size:10px;font-family:var(--font-mono);flex-shrink:0;}

.fpd-vclone .secret-toggle{display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px;border-radius:12px;background:rgba(208,107,107,0.07);border:1px solid rgba(208,107,107,0.2);}
.fpd-vclone .secret-toggle .st-title{color:${TEXT};font-size:13px;}
.fpd-vclone .secret-toggle .st-sub{color:${NEG};font-size:11px;margin-top:2px;}

.fpd-vclone .btn-primary{width:100%;padding:15px;border-radius:13px;font-weight:700;font-size:14.5px;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);box-shadow:0 8px 26px -8px rgba(91,110,225,0.55);font-family:var(--font-body);}

.fpd-vclone .summary-panel{background:rgba(91,110,225,0.07);border:1px solid rgba(91,110,225,0.18);}
.fpd-vclone .summary-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.34);}
.fpd-vclone .summary-row span:first-child{color:${MUTED};font-size:12px;}
.fpd-vclone .summary-row span:last-child{color:${SOFT};font-size:12px;}
.fpd-vclone .btn-back{flex:1;padding:13px;border-radius:12px;font-size:13px;background:rgba(91,110,225,0.08);color:#6FAE8B;border:1px solid rgba(91,110,225,0.22);cursor:pointer;font-family:var(--font-body);}

.fpd-vclone .center{text-align:center;padding:24px 0;display:flex;flex-direction:column;gap:18px;align-items:center;}
.fpd-vclone .icon-circle{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;}
.fpd-vclone .status-title{font-family:var(--font-display);font-size:18px;color:${TEXT};margin-bottom:6px;}
.fpd-vclone .status-sub{color:${MUTED};font-size:13px;}
.fpd-vclone .progress-track{height:8px;border-radius:99px;background:rgba(91,110,225,0.14);max-width:320px;width:100%;margin:0 auto;}
.fpd-vclone .progress-fill{height:8px;border-radius:99px;background:linear-gradient(90deg,#5B6EE1,#5B6EE1);box-shadow:0 0 12px rgba(91,110,225,0.5);transition:width .3s;}
.fpd-vclone .progress-pct{color:#6FAE8B;font-size:14px;font-family:var(--font-mono);}

.fpd-vclone .ref-box{padding:14px 16px;border-radius:12px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.24);width:100%;}
.fpd-vclone .ref-lbl{color:#D99A6B;font-size:10px;font-family:var(--font-mono);margin-bottom:4px;}
.fpd-vclone .ref-val{color:#D99A6B;font-family:var(--font-mono);font-size:15px;font-weight:700;}
.fpd-vclone .important-box{padding:16px;border-radius:14px;text-align:left;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.24);width:100%;}
.fpd-vclone .important-lbl{color:${WARN};font-size:11px;font-weight:700;font-family:var(--font-mono);margin-bottom:6px;}
.fpd-vclone .important-box p{color:${MUTED};font-size:12px;line-height:1.7;}
.fpd-vclone .btn-row{display:flex;gap:10px;width:100%;}
.fpd-vclone .btn-save{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:12px;font-weight:700;font-size:13px;color:#fff;border:none;cursor:pointer;background:linear-gradient(135deg,#5B6EE1,#5B6EE1);box-shadow:0 8px 20px -8px rgba(91,110,225,0.5);font-family:var(--font-body);}
`;

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
    <div className="fpd-vclone fpd-fade-in-up">
      <style dangerouslySetInnerHTML={{ __html: VCLONE_CSS }} />
      <div className="modal glow-surface">
        <button onClick={onClose} className="close-btn"><X size={16}/></button>

        <div className="modal-head">
          <div className="head-ico"><Copy size={18}/></div>
          <div>
            <div className="head-title">Legacy Vault Clone</div>
            <div className="head-sub">Complete download of all account data for verified legacy contacts</div>
          </div>
        </div>

        <div className="modal-body">

          {/* ── Locked state ── */}
          {!isUnlocked && step === "overview" && (
            <>
              <div className="panel panel-locked">
                <AlertTriangle size={32} color={NEG} style={{ margin:"0 auto" }}/>
                <div className="lock-title">Legacy Vault Clone Locked</div>
                <p>Downloads are locked until <strong style={{ color: TEXT }}>both</strong> conditions are met:</p>
                <div className="flex flex-col gap-2" style={{ marginTop: 14, textAlign: "left" }}>
                  {[
                    { label:"Legacy Continuation Fee paid ($199)", done:false },
                    { label:"Death certificate submitted and verified by FPD admin", done:false },
                  ].map(c => (
                    <div key={c.label} className="cond-row">
                      <X size={12} color={NEG} style={{ flexShrink:0 }}/>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel panel-info">
                <div className="panel-info-lbl">WHAT GETS UNLOCKED</div>
                <p>Once both conditions are met, legacy contacts can click this button to download a complete, encrypted package of <strong style={{ color: TEXT }}>everything</strong> in this account — {totalItems}+ items across all 30+ life categories.</p>
                <div className="preview-grid">
                  {ALL_CONTENTS.slice(0,8).map(item => (
                    <div key={item.label} className="preview-chip">
                      <span style={{ color:item.color }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={onClose} className="btn-close">Close</button>
            </>
          )}

          {/* ── Unlocked: Overview ── */}
          {isUnlocked && step === "overview" && (
            <>
              <div className="panel panel-unlocked">
                <Shield size={16} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
                <div>
                  <div className="panel-unlocked-title">Legacy Vault Clone Unlocked</div>
                  <p>Legacy Continuation Fee paid and confirmation of passing verified by FPD administrators. This download contains <strong style={{ color: TEXT }}>everything</strong> in the account — {totalItems}+ items across all categories.</p>
                </div>
              </div>

              <div>
                <div className="contents-lbl">COMPLETE ACCOUNT CONTENTS</div>
                <div>
                  {ALL_CONTENTS.filter(c => c.label !== "Secret Vault" || includeSecretVault).map(item => (
                    <div key={item.label} className="content-row">
                      <span style={{ color:item.color, flexShrink:0 }}>{item.icon}</span>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <span className="content-label">{item.label}</span>
                        <span className="content-desc">{item.desc}</span>
                      </div>
                      <span className="content-count" style={{ color: item.color }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="secret-toggle">
                <input type="checkbox" checked={includeSecretVault}
                  onChange={e => setIncludeSecretVault(e.target.checked)}
                  style={{ accentColor: NEG, width:15, height:15, marginTop:2, flexShrink:0 }}/>
                <div>
                  <div className="st-title">Include Secret Vault (3 items)</div>
                  <div className="st-sub">Contains seed phrases, safe combinations, and ultra-sensitive items. Handle with extreme care.</div>
                </div>
              </label>

              <button onClick={() => setStep("confirm")} className="btn-primary">
                <Download size={16} style={{ display:"inline", marginRight:8 }}/>
                Download Complete Legacy Package
              </button>
            </>
          )}

          {/* ── Confirm ── */}
          {isUnlocked && step === "confirm" && (
            <>
              <div className="panel" style={{ background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.24)" }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
                  <AlertTriangle size={16} color={WARN}/>
                  <span style={{ color: WARN, fontSize: 13, fontWeight: 700 }}>Confirm Complete Download</span>
                </div>
                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7 }}>
                  You are about to download a complete encrypted package of this account. This includes{" "}
                  <strong style={{ color: TEXT }}>all documents, records, memories, diary entries, financial information, medical records, and personal data</strong>{" "}
                  that was saved to this Final Pass Down account. {includeSecretVault && <strong style={{ color: NEG }}>Secret Vault items are included.</strong>}
                </p>
              </div>

              <div className="panel summary-panel">
                <div className="contents-lbl">DOWNLOAD SUMMARY</div>
                {[
                  ["Total Items",      `${totalItems}+ records`],
                  ["Categories",       "30+ life categories"],
                  ["Encrypted",        "AES-256 — decryption key separate"],
                  ["Format",           "Encrypted ZIP package"],
                  ["Download ID",      `Will be generated on confirm`],
                ].map(([k, v]) => (
                  <div key={k} className="summary-row"><span>{k}</span><span>{v}</span></div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("overview")} className="btn-back">← Back</button>
                <button onClick={startDownload} className="btn-primary" style={{ flex: 1 }}>Confirm & Download</button>
              </div>
            </>
          )}

          {/* ── Downloading ── */}
          {step === "downloading" && (
            <div className="center">
              <div className="icon-circle" style={{ background: "rgba(91,110,225,0.16)", border: "1px solid rgba(91,110,225,0.3)" }}>
                <Download size={28} color="#FFFFFF" style={{ animation:"bounce 1s infinite" }}/>
              </div>
              <div>
                <div className="status-title">Preparing Your Legacy Package</div>
                <div className="status-sub">Encrypting and packaging all account data...</div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width:`${progress}%` }}/>
              </div>
              <div className="progress-pct">{Math.round(progress)}%</div>
              <div style={{ color: MUTED, fontSize: 11 }}>
                {progress < 30 ? "Gathering documents and records..." :
                 progress < 60 ? "Packaging memories and media..." :
                 progress < 85 ? "Encrypting complete package..." :
                 "Finalizing download..."}
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <div className="center">
              <div className="icon-circle" style={{ background: "rgba(95,190,145,0.14)", border: "1px solid rgba(95,190,145,0.3)", boxShadow: "0 0 30px rgba(95,190,145,0.15)" }}>
                <CheckCircle size={30} color="#FFFFFF"/>
              </div>
              <div>
                <div className="status-title">Legacy Package Ready</div>
                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7 }}>The complete account package has been prepared. This encrypted file contains everything saved to this Final Pass Down account.</p>
              </div>

              <div className="ref-box">
                <div className="ref-lbl">DOWNLOAD REFERENCE ID</div>
                <div className="ref-val">{downloadId}</div>
              </div>

              <div className="important-box">
                <div className="important-lbl">IMPORTANT</div>
                <p>Keep this encrypted file and its decryption key secure. The package contains all of the account holder's personal, financial, and sensitive information. Share only with verified legacy contacts.</p>
              </div>

              <div className="btn-row">
                <button onClick={() => toast.success("Legacy package download started (demo)")} className="btn-save">
                  <Download size={14}/> Save to Device
                </button>
                <button onClick={onClose} className="btn-back" style={{ flex: 1 }}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
