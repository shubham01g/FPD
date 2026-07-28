/**
 * White Glove Concierge Authorization & Waiver Form
 * — User-facing: sign and submit
 * — Admin-facing: send to user, track status
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Shield, CheckCircle, Edit3, X, Download, AlertCircle,
  Clock, User, Star, FileText, Lock, Eye
} from "lucide-react";
import { toast } from "sonner";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

/* ── In-memory waiver store (demo) ──────────────────────────────── */
export interface WaiverRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  sentAt: string;
  sentBy: string;
  status: "pending" | "signed" | "declined" | "expired";
  signedAt?: string;
  signedName?: string;
  ipAddress?: string;
  specialistName: string;
  specialistScope: string[];
}

export let waiverStore: WaiverRecord[] = [
  {
    id: "WAV-001",
    userId: "WG-001",
    userName: "Dorothy Henderson",
    userEmail: "d.henderson@email.com",
    sentAt: "Jun 15, 2026 · 10:42 AM",
    sentBy: "admin@finalpassdown.com",
    status: "signed",
    signedAt: "Jun 15, 2026 · 2:18 PM",
    signedName: "Dorothy M. Henderson",
    ipAddress: "72.14.192.xxx",
    specialistName: "Marcus Williams",
    specialistScope: ["document_upload", "legacy_contacts", "final_wishes", "vault_organization", "medical_info", "financial_records"],
  },
  {
    id: "WAV-002",
    userId: "WG-002",
    userName: "Walter & Edna Briggs",
    userEmail: "w.briggs@email.com",
    sentAt: "Jun 18, 2026 · 9:15 AM",
    sentBy: "admin@finalpassdown.com",
    status: "pending",
    specialistName: "Patricia Chen",
    specialistScope: ["document_upload", "legacy_contacts", "final_wishes", "vault_organization"],
  },
  {
    id: "WAV-003",
    userId: "WG-003",
    userName: "Margaret Thompson",
    userEmail: "m.thompson@email.com",
    sentAt: "Jun 22, 2026 · 3:00 PM",
    sentBy: "admin@finalpassdown.com",
    status: "pending",
    specialistName: "James Rivera",
    specialistScope: ["document_upload", "legacy_contacts", "final_wishes", "vault_organization", "medical_info"],
  },
];

const SCOPE_LABELS: Record<string, string> = {
  document_upload: "Upload and organize documents in all vault folders",
  legacy_contacts: "Add and configure Legacy and Guardian Contacts on my behalf",
  final_wishes: "Record my Final Wishes, preferences, and estate instructions",
  vault_organization: "Create folders, set labels, and organize my vault structure",
  medical_info: "Enter medical information, allergies, and medication records",
  financial_records: "Enter financial account information, insurance, and asset records",
  digital_diary: "Create diary entries, video messages, and personal notes",
  password_manager: "Add and organize password and account records",
  all_features: "Full access to all Final Pass Down platform features",
};

/* ── Waiver document text ────────────────────────────────────────── */
function WaiverText({ waiver }: { waiver: WaiverRecord }) {
  return (
    <div className="space-y-5" style={{ color:"rgba(255,255,255,0.8)", fontSize:16, lineHeight:1.9 }}>
      <div className="text-center pb-4 border-b" style={{ borderColor:"rgba(91,110,225,0.1)" }}>
        <div style={{ ...DISPLAY, fontSize:22.5, color:"#FFFFFF", marginBottom:4 }}>
          White Glove Concierge Service
        </div>
        <div style={{ ...DISPLAY, fontSize:19, color:"#6E90C9" }}>
          Authorization, Consent & Limited Power of Attorney
        </div>
        <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14, ...MONO, marginTop:4 }}>
          Document ID: {waiver.id} · Final Pass Down Inc. · finalpassdown.com
        </div>
      </div>

      <p>
        This White Glove Concierge Authorization Agreement ("Agreement") is entered into between
        <strong> {waiver.userName}</strong> ("Client" or "I") and <strong>Final Pass Down Inc.</strong>
        ("FPD"), effective upon the Client's electronic signature below.
      </p>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>1. DESIGNATED SPECIALIST</div>
        <p>
          I hereby designate <strong>{waiver.specialistName}</strong>, a certified Final Pass Down
          White Glove Specialist ("Specialist"), to access my FPD account and perform the
          authorized actions listed in Section 3 on my behalf. This designation is voluntary,
          revocable at any time, and limited to the scope defined herein.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>2. PURPOSE OF AUTHORIZATION</div>
        <p>
          I understand that I am authorizing the Specialist to perform specific account setup
          and configuration tasks within the Final Pass Down platform on my behalf because I
          have requested assisted onboarding services. This authorization does not grant the
          Specialist ownership of my account, access to my files after service completion,
          or any legal authority outside the FPD platform.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:10 }}>3. AUTHORIZED SCOPE OF ACCESS</div>
        <p style={{ marginBottom:10 }}>I authorize the designated Specialist to perform the following actions:</p>
        <div className="space-y-2">
          {waiver.specialistScope.map(scope => (
            <div key={scope} className="flex items-start gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.1)" }}>
              <CheckCircle size={13} color="#FFFFFF" style={{ marginTop:2, flexShrink:0 }}/>
              <span style={{ fontSize:16 }}>{SCOPE_LABELS[scope] ?? scope}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop:10 }}>
          Any actions beyond this scope require explicit additional written authorization from me.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>4. SESSION RECORDING & AUDIT</div>
        <p>
          I understand and consent that all Specialist actions within my account are logged in
          a tamper-evident audit trail. Session activity, document uploads, and configuration
          changes are permanently recorded with timestamps. I may request a full audit report
          at any time by contacting support@finalpassdown.com.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>5. SECURITY & ZERO-KNOWLEDGE ENCRYPTION</div>
        <p>
          I understand that FPD uses AES-256 zero-knowledge encryption. <strong>The Specialist
          assists with uploading and organizing my documents but cannot read the contents of
          encrypted files.</strong> My master encryption key is never shared with or accessible
          to the Specialist or FPD staff. The Specialist's access is limited to the platform
          interface and terminates automatically upon completion of the White Glove service
          engagement.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>6. VOLUNTARY PROVISION OF INFORMATION</div>
        <p>
          I voluntarily provide documents, records, and personal information to the Specialist
          during our sessions. I represent that I have the legal right to share all information
          provided and that no information I share violates any third-party rights, court orders,
          or applicable law. The Specialist will enter information exactly as I provide it.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>7. LIMITATION OF LIABILITY</div>
        <p>
          Final Pass Down Inc. and its Specialists are not responsible for the accuracy,
          completeness, or legal validity of any documents uploaded, contact information provided,
          or estate instructions recorded at my direction. I retain full responsibility for the
          contents of my Legacy Vault. This service does not constitute legal, financial, or
          medical advice.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>8. REVOCATION</div>
        <p>
          I may revoke this authorization at any time by calling FPD at 1-800-FPD-HELP or
          emailing support@finalpassdown.com. Revocation does not undo actions already completed
          prior to revocation. Upon revocation, the Specialist's access to my account is
          immediately terminated.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>9. ACKNOWLEDGMENT</div>
        <p>
          By signing below, I confirm that: (a) I am the legal account holder or their
          authorized legal representative; (b) I have read and understand this entire Agreement;
          (c) I freely and voluntarily consent to the authorized scope defined above; and
          (d) my electronic signature below constitutes a legally binding signature under the
          Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable
          state law.
        </p>
      </div>
    </div>
  );
}

/* ── Signature pad (mouse/touch draw) ────────────────────────────── */
function SignaturePad({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x:(e.touches[0].clientX - rect.left)*scaleX, y:(e.touches[0].clientY - rect.top)*scaleY };
    }
    return { x:((e as React.MouseEvent).clientX - rect.left)*scaleX, y:((e as React.MouseEvent).clientY - rect.top)*scaleY };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    drawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignature(true);
  }

  function stop() {
    drawing.current = false;
    if (hasSignature && canvasRef.current) {
      onSign(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSign("");
  }

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden" style={{ border:"2px solid rgba(91,110,225,0.25)", background:"#0F1A33", touchAction:"none" }}>
        <canvas ref={canvasRef} width={560} height={120} style={{ width:"100%", height:120, display:"block", cursor:"crosshair" }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span style={{ color:"rgba(126,147,176,0.3)", fontSize:16, ...MONO }}>Draw your signature here</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span style={{ color:"rgba(255,255,255,0.65)", fontSize:14 }}>Draw with mouse, finger, or stylus</span>
        {hasSignature && (
          <button onClick={clear} className="flex items-center gap-1 text-xs" style={{ color:"#FC8181" }}>
            <X size={11}/> Clear
          </button>
        )}
      </div>
    </div>
  );
}

/* ── User-facing waiver signing page ─────────────────────────────── */
export function WaiverSignPage({ waiverId, onBack }: { waiverId?: string; onBack?: () => void }) {
  const waiver = waiverStore.find(w => w.id === (waiverId ?? "WAV-002"))
    ?? waiverStore[1]; // default to first pending for demo

  const [step, setStep] = useState<"read"|"sign"|"done">("read");
  const [scrolled, setScrolled] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [drawnSig, setDrawnSig] = useState("");
  const [sigMode, setSigMode] = useState<"type"|"draw">("type");
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const readRef = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = readRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 60) setScrolled(true);
  }

  function submit() {
    const sig = sigMode === "type" ? typedName : drawnSig;
    if (!sig.trim()) { toast.error("Please provide your signature"); return; }
    if (!checked1 || !checked2 || !checked3) { toast.error("Please check all acknowledgment boxes"); return; }
    if (sigMode === "type" && typedName.trim().toLowerCase() !== waiver.userName.toLowerCase().split(" ").slice(0,2).join(" ").toLowerCase()
      && typedName.trim().split(" ").length < 2) {
      toast.error("Please type your full legal name to sign"); return;
    }
    setSubmitting(true);
    setTimeout(() => {
      // Update demo store
      const idx = waiverStore.findIndex(w => w.id === waiver.id);
      if (idx >= 0) {
        waiverStore[idx] = { ...waiverStore[idx], status:"signed", signedAt:new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+" · "+new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}), signedName:typedName || "Signed via drawn signature", ipAddress:"72.14.xxx.xxx" };
      }
      setSubmitting(false);
      setStep("done");
    }, 1200);
  }

  if (waiver.status === "signed" || step === "done") {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <div className="rounded-full p-6 mx-auto mb-6 w-fit" style={{ background:"rgba(72,187,120,0.1)", border:"2px solid rgba(72,187,120,0.3)" }}>
          <CheckCircle size={52} color="#FFFFFF"/>
        </div>
        <h2 style={{ ...DISPLAY, fontSize:32.5, color:"#FFFFFF", marginBottom:8 }}>Waiver Signed Successfully</h2>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:17.5, lineHeight:1.8, marginBottom:24 }}>
          Your White Glove Concierge Authorization has been recorded. {waiver.specialistName} can now begin setting up your Final Pass Down vault. You'll receive a call to schedule your first session.
        </p>
        <div className="p-4 rounded-2xl mb-6 text-left space-y-2" style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
          {[
            ["Document ID", waiver.id],
            ["Signed", waiverStore.find(w=>w.id===waiver.id)?.signedAt ?? waiver.signedAt ?? "Just now"],
            ["Signed by", waiverStore.find(w=>w.id===waiver.id)?.signedName ?? typedName],
            ["Specialist", waiver.specialistName],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color:"rgba(255,255,255,0.65)", fontSize:15, ...MONO }}>{k}</span>
              <span style={{ color:"#FFFFFF", fontSize:15, fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
        {onBack && (
          <button onClick={onBack} className="px-6 py-3 rounded-2xl font-bold text-sm"
            style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
            ← Back to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 rounded-2xl"
        style={{ background:"rgba(91,110,225,0.04)", border:"1px solid rgba(91,110,225,0.15)" }}>
        <div className="rounded-2xl p-3 flex-shrink-0" style={{ background:"rgba(91,110,225,0.08)" }}>
          <FileText size={22} color="#FFFFFF"/>
        </div>
        <div>
          <div style={{ ...DISPLAY, fontSize:22.5, color:"#FFFFFF" }}>White Glove Concierge Authorization</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:15, marginTop:2 }}>
            Sent by FPD Admin · {waiver.sentAt} · Specialist: {waiver.specialistName}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full flex-shrink-0"
          style={{ background:"rgba(246,173,85,0.12)", border:"1px solid rgba(246,173,85,0.3)" }}>
          <Clock size={11} color="#F6AD55"/>
          <span style={{ color:"#F6AD55", fontSize:12.5, fontWeight:700, ...MONO }}>AWAITING SIGNATURE</span>
        </div>
      </div>

      {/* Step tracker */}
      <div className="flex items-center gap-3">
        {[["read","1. Read Agreement"],["sign","2. Sign & Confirm"],["done","3. Complete"]].map(([id,label],i) => (
          <React.Fragment key={id}>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center rounded-full text-xs font-bold"
                style={{ width:22, height:22, background:step===id?"#5B6EE1":i<["read","sign","done"].indexOf(step)?"#48BB78":"rgba(91,110,225,0.1)", color:step===id||i<["read","sign","done"].indexOf(step)?"#fff":"#8A9AB8" }}>
                {i<["read","sign","done"].indexOf(step) ? <CheckCircle size={12}/> : i+1}
              </div>
              <span style={{ fontSize:14, color:step===id?"#FFFFFF":"rgba(255,255,255,0.65)", fontWeight:step===id?600:400 }}>{label}</span>
            </div>
            {i<2 && <div style={{ flex:1, height:1, background:"rgba(91,110,225,0.1)" }}/>}
          </React.Fragment>
        ))}
      </div>

      {/* Read step */}
      {step === "read" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye size={14} color="rgba(255,255,255,0.65)"/>
            <span style={{ color:"rgba(255,255,255,0.65)", fontSize:15 }}>Please read the entire agreement before signing.</span>
          </div>
          <div ref={readRef} onScroll={onScroll}
            className="rounded-2xl p-6 overflow-y-auto"
            style={{ background:"#101728", border:"1px solid rgba(91,110,225,0.12)", maxHeight:500, boxShadow:"inset 0 -20px 20px -10px rgba(91,110,225,0.04)" }}>
            <WaiverText waiver={waiver}/>
          </div>
          {!scrolled && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2 rounded-2xl"
              style={{ background:"rgba(246,173,85,0.08)", border:"1px solid rgba(246,173,85,0.2)" }}>
              <AlertCircle size={13} color="#F6AD55"/>
              <span style={{ color:"#F6AD55", fontSize:15 }}>Please scroll to the bottom to read the full agreement</span>
            </div>
          )}
          <button onClick={() => { if (!scrolled) { setScrolled(true); } setStep("sign"); }}
            className="w-full mt-4 py-4 rounded-2xl font-bold text-base"
            style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#FFFFFF", boxShadow:"0 0 24px rgba(91,110,225,0.3)" }}>
            I Have Read the Agreement — Continue to Sign →
          </button>
        </div>
      )}

      {/* Sign step */}
      {step === "sign" && (
        <div className="space-y-5">
          {/* Signature mode toggle */}
          <div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, marginBottom:8 }}>SIGNATURE METHOD</div>
            <div className="flex gap-2 p-1 rounded-2xl w-fit" style={{ background:"rgba(91,110,225,0.06)" }}>
              {[["type","Type Name"],["draw","Draw Signature"]].map(([id,label]) => (
                <button key={id} onClick={() => setSigMode(id as "type"|"draw")}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background:sigMode===id?"#5B6EE1":"transparent", color:sigMode===id?"#fff":"rgba(255,255,255,0.7)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sigMode === "type" ? (
            <div>
              <label style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>TYPE YOUR FULL LEGAL NAME TO SIGN</label>
              <input value={typedName} onChange={e => setTypedName(e.target.value)}
                placeholder={waiver.userName}
                className="w-full px-4 py-4 rounded-2xl text-lg"
                style={{ background:"#0F1A33", border:"2px solid rgba(91,110,225,0.25)", color:"#FFFFFF", outline:"none", fontFamily:"Georgia, serif", fontStyle:"italic", fontSize:25 }}/>
              {typedName && (
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14, marginTop:4 }}>
                  Signature: <em style={{ fontFamily:"Georgia, serif", color:"#FFFFFF" }}>{typedName}</em>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>DRAW YOUR SIGNATURE</label>
              <SignaturePad onSign={setDrawnSig}/>
            </div>
          )}

          {/* Acknowledgment checkboxes */}
          <div className="space-y-3 p-4 rounded-2xl" style={{ background:"rgba(91,110,225,0.03)", border:"1px solid rgba(91,110,225,0.1)" }}>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12.5, ...MONO, marginBottom:6 }}>ACKNOWLEDGMENTS</div>
            {[
              [checked1, setChecked1, `I am ${waiver.userName} or their legally authorized representative, and I have the authority to sign this agreement.`],
              [checked2, setChecked2, `I have read and understand the full White Glove Concierge Authorization agreement, including the scope of access granted to ${waiver.specialistName}.`],
              [checked3, setChecked3, "I understand this authorization is revocable at any time and that all Specialist actions are logged in a permanent audit trail."],
            ].map(([checked, setChecked, label], i) => (
              <div key={i} className="flex items-start gap-3">
                <button onClick={() => (setChecked as React.Dispatch<React.SetStateAction<boolean>>)(!checked)}
                  className="flex items-center justify-center rounded-xl flex-shrink-0 mt-0.5 transition-all"
                  style={{ width:20, height:20, background:checked?"#5B6EE1":"#101728", border:`2px solid ${checked?"#5B6EE1":"rgba(91,110,225,0.3)"}` }}>
                  {checked && <CheckCircle size={12} color="#fff"/>}
                </button>
                <span style={{ color:"rgba(255,255,255,0.8)", fontSize:15, lineHeight:1.6 }}>{label as string}</span>
              </div>
            ))}
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-2xl"
            style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
            <Lock size={13} color="#FFFFFF" style={{ marginTop:1, flexShrink:0 }}/>
            <p style={{ color:"#D99A6B", fontSize:14, lineHeight:1.6 }}>
              Your signature is encrypted and time-stamped. This document is legally binding under the E-SIGN Act.
              IP address and device fingerprint are recorded with your signature.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("read")} className="px-5 py-3 rounded-2xl text-sm"
              style={{ background:"rgba(91,110,225,0.06)", color:"rgba(255,255,255,0.7)" }}>← Back</button>
            <button onClick={submit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#FFFFFF",
                boxShadow:"0 0 24px rgba(91,110,225,0.35)", opacity:submitting?0.7:1 }}>
              <Shield size={16}/>{submitting ? "Recording Signature…" : "Sign & Authorize White Glove Service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Admin: send + track waivers ─────────────────────────────────── */
export function WaiverManager() {
  const [waivers, setWaivers] = useState<WaiverRecord[]>([...waiverStore]);
  const [showSend, setShowSend] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({ name:"", email:"", specialist:"Marcus Williams", scope: ["document_upload","legacy_contacts","final_wishes","vault_organization"] });
  const [sending, setSending] = useState(false);

  const statusColor: Record<string,string> = { pending:"#F6AD55", signed:"#48BB78", declined:"#FC8181", expired:"#8A9AB8" };
  const statusBg: Record<string,string> = { pending:"rgba(246,173,85,0.12)", signed:"rgba(72,187,120,0.12)", declined:"rgba(252,129,129,0.12)", expired:"rgba(107,114,128,0.12)" };

  function sendWaiver() {
    if (!sendForm.name.trim() || !sendForm.email.trim()) { toast.error("Name and email required"); return; }
    setSending(true);
    setTimeout(() => {
      const newW: WaiverRecord = {
        id: `WAV-${String(Date.now()).slice(-3)}`,
        userId: `WG-NEW`,
        userName: sendForm.name,
        userEmail: sendForm.email,
        sentAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) + " · " + new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}),
        sentBy: "admin@finalpassdown.com",
        status: "pending",
        specialistName: sendForm.specialist,
        specialistScope: sendForm.scope,
      };
      waiverStore = [newW, ...waiverStore];
      setWaivers([...waiverStore]);
      toast.success(`Waiver sent to ${sendForm.email}`);
      setSendForm({ name:"", email:"", specialist:"Marcus Williams", scope:["document_upload","legacy_contacts","final_wishes","vault_organization"] });
      setSending(false);
      setShowSend(false);
    }, 900);
  }

  if (previewId) {
    return (
      <div>
        <button onClick={() => setPreviewId(null)} className="flex items-center gap-2 mb-4 text-sm"
          style={{ color:"#6E90C9" }}>
          ← Back to Waivers
        </button>
        <WaiverSignPage waiverId={previewId} onBack={() => setPreviewId(null)}/>
      </div>
    );
  }

  const CARD: React.CSSProperties = { background:"#101728", border:"1px solid rgba(91,110,225,0.1)", boxShadow:"0 2px 12px rgba(91,110,225,0.06)", borderRadius:22 };
  const INPUT: React.CSSProperties = { background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.2)", color:"#FFFFFF", fontSize:16, outline:"none", borderRadius:10, padding:"8px 12px", width:"100%" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div style={{ color:"#6FAE8B", fontSize:14, ...MONO, letterSpacing:"0.1em", marginBottom:4 }}>WHITE GLOVE · WAIVER MANAGEMENT</div>
          <h2 style={{ ...DISPLAY, fontSize:25, color:"#FFFFFF" }}>Concierge Authorization Waivers</h2>
        </div>
        <button onClick={() => setShowSend(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm"
          style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", boxShadow:"0 0 16px rgba(91,167,214,0.3)" }}>
          <Star size={14}/> Send Waiver
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label:"Total Sent",    value:waivers.length,                           color:"#6E90C9" },
          { label:"Signed",        value:waivers.filter(w=>w.status==="signed").length, color:"#D99A6B" },
          { label:"Pending",       value:waivers.filter(w=>w.status==="pending").length, color:"#F6AD55" },
          { label:"Sign Rate",     value:`${Math.round(waivers.filter(w=>w.status==="signed").length/Math.max(waivers.length,1)*100)}%`, color:"#6FAE8B" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl" style={CARD}>
            <div style={{ ...DISPLAY, fontSize:30, color:s.color }}>{s.value}</div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:15, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Waiver table */}
      <div className="rounded-2xl overflow-hidden" style={{ border:"1px solid rgba(91,110,225,0.1)" }}>
        <div className="px-5 py-3 border-b" style={{ background:"#141B2E", borderColor:"rgba(91,110,225,0.1)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto auto", gap:16, alignItems:"center" }}>
            {["ID","Client","Specialist","Sent","Status","Actions"].map(h => (
              <div key={h} style={{ color:"rgba(255,255,255,0.7)", fontSize:12.5, ...MONO }}>{h.toUpperCase()}</div>
            ))}
          </div>
        </div>
        {waivers.map((w, i) => (
          <div key={w.id} className="px-5 py-4 border-b"
            style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto auto auto", gap:16, alignItems:"center",
              background:i%2===0?"#101728":"#0F1A33", borderColor:"rgba(91,110,225,0.06)" }}>
            <span style={{ color:"#6E90C9", fontSize:12.5, ...MONO }}>{w.id}</span>
            <div>
              <div style={{ color:"#FFFFFF", fontSize:16, fontWeight:500 }}>{w.userName}</div>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:14 }}>{w.userEmail}</div>
            </div>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:15 }}>{w.specialistName}</span>
            <div>
              <div style={{ color:"rgba(255,255,255,0.7)", fontSize:14 }}>{w.sentAt.split(" · ")[0]}</div>
              {w.signedAt && <div style={{ color:"#D99A6B", fontSize:12.5 }}>Signed: {w.signedAt.split(" · ")[0]}</div>}
            </div>
            <span className="px-2 py-1 rounded text-xs font-bold"
              style={{ background:statusBg[w.status], color:statusColor[w.status], ...MONO, width:"fit-content" }}>
              {w.status.toUpperCase()}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPreviewId(w.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
                <Eye size={11}/> {w.status === "pending" ? "Preview" : "View"}
              </button>
              {w.status === "pending" && (
                <button onClick={() => { toast.success(`Reminder sent to ${w.userEmail}`); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:"rgba(246,173,85,0.1)", color:"#F6AD55" }}>
                  Remind
                </button>
              )}
              {w.status === "signed" && (
                <button onClick={() => toast.success("Signed waiver PDF downloaded (demo)")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:"rgba(72,187,120,0.1)", color:"#D99A6B" }}>
                  <Download size={11}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Send modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...CARD, maxHeight:"90vh", overflowY:"auto" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10"
              style={{ borderColor:"rgba(91,110,225,0.08)" }}>
              <div className="flex items-center gap-2">
                <Star size={16} color="#FFFFFF"/>
                <span style={{ ...DISPLAY, fontSize:20, color:"#FFFFFF" }}>Send Waiver to Client</span>
              </div>
              <button onClick={() => setShowSend(false)} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
            </div>
            <div className="p-6 space-y-4">
              {[["CLIENT FULL NAME *","name","Dorothy Henderson"],["CLIENT EMAIL *","email","client@email.com"]].map(([lbl,key,ph]) => (
                <div key={key}>
                  <label style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>{lbl}</label>
                  <input value={(sendForm as any)[key]} placeholder={ph}
                    onChange={e => setSendForm(p=>({...p,[key]:e.target.value}))} style={INPUT}/>
                </div>
              ))}
              <div>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, display:"block", marginBottom:5 }}>ASSIGNED SPECIALIST</label>
                <select value={sendForm.specialist} onChange={e => setSendForm(p=>({...p,specialist:e.target.value}))} style={INPUT}>
                  {["Marcus Williams","Patricia Chen","James Rivera"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:14, ...MONO, display:"block", marginBottom:8 }}>AUTHORIZED SCOPE</label>
                <div className="space-y-2">
                  {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3">
                      <button onClick={() => setSendForm(p => ({
                        ...p,
                        scope: p.scope.includes(key) ? p.scope.filter(s=>s!==key) : [...p.scope, key]
                      }))} className="flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ width:18, height:18, background:sendForm.scope.includes(key)?"#5B6EE1":"#101728", border:`2px solid ${sendForm.scope.includes(key)?"#5B6EE1":"rgba(91,110,225,0.3)"}` }}>
                        {sendForm.scope.includes(key) && <CheckCircle size={10} color="#fff"/>}
                      </button>
                      <span style={{ color:"rgba(255,255,255,0.8)", fontSize:15 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={sendWaiver} disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
                  style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F", opacity:sending?0.7:1 }}>
                  <Star size={14}/>{sending ? "Sending…" : "Send Waiver via Email"}
                </button>
                <button onClick={() => setShowSend(false)} className="px-5 py-3 rounded-2xl text-sm"
                  style={{ background:"rgba(91,110,225,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
