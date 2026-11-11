/**
 * White Glove Concierge Authorization & Waiver
 * — Public: the client signs at /waiver/:token (WaiverPublicPage)
 * — Admin: every waiver, read-only (WaiverManager)
 * Sending happens in the Concierge Portal (migration 051). This file used to
 * keep waivers in an in-memory array that was empty on every load.
 */
import React, { useState, useRef, useEffect } from "react";
import { Shield, CheckCircle, Edit3, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { FPD_EMAIL } from "../utils/fpdEmails";
import { publicApi } from "../services/publicApi";
import { adminApi } from "../services/adminApi";
import { useAdminFetch } from "../hooks/useAdminFetch";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

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
          at any time by contacting {FPD_EMAIL.support}.
        </p>
      </div>

      <div>
        <div style={{ color:"#FFFFFF", fontSize:17.5, fontWeight:700, marginBottom:8 }}>5. SECURITY & ENCRYPTION</div>
        <p>
          I understand that FPD stores my files encrypted at rest (AES-256) and that my saved
          passwords are encrypted on my device with my vault passphrase. <strong>The Specialist
          assists with uploading and organizing my documents and sees only what I show or upload
          during a session.</strong> My vault passphrase is never shared with or accessible
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
          emailing {FPD_EMAIL.support}. Revocation does not undo actions already completed
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

/* ── Public waiver signing page: /waiver/:token (migration 051) ─────
   The specialist emails this link from the Concierge Portal. The client
   reads the authorization, types their full legal name (and may draw a
   signature), and signs. GET/POST /public/waiver/:token. */
interface PublicWaiver {
  status: "pending" | "signed" | "declined" | "expired";
  specialistName: string; scope: string[]; clientName: string;
  signedAt: string | null; signedName: string | null;
}

export function WaiverPublicPage({ token }: { token: string }) {
  const [w, setW] = useState<PublicWaiver | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [drawn, setDrawn] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    publicApi.get<PublicWaiver>(`/waiver/${encodeURIComponent(token)}`)
      .then(setW)
      // Only a 4xx means the link itself is bad; a network or server error
      // used to tell the client their (valid) link was invalid.
      .catch((err: { status?: number }) => setProblem(
        err?.status && err.status >= 400 && err.status < 500
          ? "This waiver link isn't valid. Ask your White Glove specialist for a new one."
          : "We couldn't load your waiver just now. Check your connection and reload this page."));
  }, [token]);

  const sign = async () => {
    if (typedName.trim().split(/\s+/).length < 2) { toast.error("Type your full legal name to sign"); return; }
    if (!agree) { toast.error("Please confirm that you agree"); return; }
    setBusy(true);
    try {
      const r = await publicApi.post<{ signedAt: string }>(`/waiver/${encodeURIComponent(token)}/sign`, { signedName: typedName.trim(), agree, signature: drawn || undefined });
      setW(prev => prev ? { ...prev, status: "signed", signedAt: r.signedAt, signedName: typedName.trim() } : prev);
      toast.success("Signed — thank you");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign");
    }
    setBusy(false);
  };

  const record: WaiverRecord | null = w ? {
    id: token.slice(0, 8).toUpperCase(), userId: "", userName: w.clientName, userEmail: "", sentAt: "", sentBy: w.specialistName,
    status: w.status, signedAt: w.signedAt ?? undefined, signedName: w.signedName ?? undefined,
    specialistName: w.specialistName, specialistScope: w.scope,
  } : null;

  return (
    <div style={{ minHeight: "100%", background: "#070A12", padding: "32px 16px", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {problem && <p style={{ color: "#A3ADC9", fontSize: 17 }}>{problem}</p>}
        {!problem && !w && <p style={{ color: "#A3ADC9" }}>Loading…</p>}
        {w && record && (
          <div className="rounded-2xl p-6" style={{ background: "#101728", border: "1px solid rgba(255,255,255,0.08)" }}>
            <WaiverText waiver={record}/>
            {w.status === "signed" ? (
              <div className="flex items-center gap-2 mt-6" style={{ color: "#48BB78", fontSize: 16 }}>
                <CheckCircle size={18}/> Signed by {w.signedName}{w.signedAt ? ` on ${new Date(w.signedAt).toLocaleString("en-US")}` : ""}. You can close this page.
              </div>
            ) : w.status !== "pending" ? (
              <div className="flex items-center gap-2 mt-6" style={{ color: "#F6AD55", fontSize: 16 }}>
                <Clock size={18}/> This link has expired. Ask {w.specialistName} to send a new one.
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                <div>
                  <div style={{ color: "#8A9AB8", fontSize: 13, ...MONO, marginBottom: 6 }}>TYPE YOUR FULL LEGAL NAME</div>
                  <input value={typedName} onChange={e => setTypedName(e.target.value)} placeholder={w.clientName || "First Last"}
                    style={{ width: "100%", background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 17 }}/>
                </div>
                <div>
                  <div style={{ color: "#8A9AB8", fontSize: 13, ...MONO, marginBottom: 6 }}>SIGNATURE (OPTIONAL)</div>
                  <SignaturePad onSign={setDrawn}/>
                </div>
                <label className="flex items-start gap-2" style={{ color: "#E8EDF5", fontSize: 15 }}>
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 4 }}/>
                  I have read this authorization and agree to it. I can withdraw it at any time by contacting {FPD_EMAIL.support}.
                </label>
                <button onClick={sign} disabled={busy} className="w-full py-3 rounded-xl font-bold"
                  style={{ background: "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: "#04080F", opacity: busy ? 0.6 : 1 }}>
                  <Edit3 size={15} style={{ display: "inline", marginRight: 6 }}/>{busy ? "Signing…" : "Sign Authorization"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Admin: every waiver, read-only (GET /admin/white-glove/waivers) ──
   Specialists send waivers from the Concierge Portal; clients sign at
   /waiver/:token. */
interface AdminWaiver {
  id: string; status: string; sent_at: string; signed_at: string | null; signed_name: string | null;
  signer_ip: string | null; specialist_name: string; expires_at: string;
  users: { full_name: string | null; email: string } | null;
}

export function WaiverManager() {
  const { data, loading, error } = useAdminFetch(() => adminApi.get<{ waivers: AdminWaiver[] }>("/white-glove/waivers"), []);
  const statusColor: Record<string, string> = { pending: "#F6AD55", signed: "#48BB78", declined: "#FC8181", expired: "#8A9AB8" };
  const waivers = data?.waivers ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(91,167,214,0.04)", border: "1px solid rgba(91,167,214,0.15)" }}>
        <Shield size={14} color="#FFFFFF" style={{ marginTop: 2 }}/>
        <p style={{ color: "#8A9AB8", fontSize: 15, lineHeight: 1.7 }}>
          The assigned specialist emails the waiver from the Concierge Portal; the client signs it from that link. Uploads to a client's vault unlock once it is signed.
        </p>
      </div>
      {loading && <div style={{ color: "#8A9AB8" }}>Loading…</div>}
      {error && <div style={{ color: "#FC8181" }}>{error}</div>}
      {!loading && !error && waivers.length === 0 && <div style={{ color: "#8A9AB8" }}>No waivers have been sent yet.</div>}
      {waivers.map(w => (
        <div key={w.id} className="p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap" style={{ background: "#101728", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ color: "#E8EDF5", fontSize: 16, fontWeight: 600 }}>{w.users?.full_name || w.users?.email}</div>
            <div style={{ color: "#8A9AB8", fontSize: 13.5 }}>
              Sent {new Date(w.sent_at).toLocaleDateString("en-US")} by {w.specialist_name}
              {w.signed_at ? ` · signed ${new Date(w.signed_at).toLocaleString("en-US")} as "${w.signed_name}"${w.signer_ip ? ` from ${w.signer_ip}` : ""}` : ""}
            </div>
          </div>
          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: `${statusColor[w.status] ?? "#8A9AB8"}20`, color: statusColor[w.status] ?? "#8A9AB8", ...MONO }}>
            {w.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
