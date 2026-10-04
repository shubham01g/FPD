import React, { useState, useRef } from "react";
import {
  Shield, Heart, CheckCircle, Upload, X, FileText,
  AlertTriangle, Lock, ChevronRight, Eye, EyeOff,
  UserCheck, FileCheck, FilePlus, Archive, Clock, Stethoscope, FolderOpen, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { publicApi } from "../services/publicApi";
import { useAdminFetch } from "../hooks/useAdminFetch";

/* The Legacy Claim Portal — the page a legacy contact reaches from the link an
   admin issues in Master Admin → Users → Deceased. No login: the token in the
   URL identifies the one claim it belongs to (routes/public.ts). */

/* ─── Types ───────────────────────────────────────────────────────── */
type Step = "intro" | "identity" | "documents" | "review" | "submitted";

interface DocSlot {
  key: "death_certificate" | "claimant_id" | "will" | "power_of_attorney" | "obituary" | "hospital_records" | "other";
  label: string;
  required: boolean;
  hint: string;
  icon: React.ReactNode;
  accepted: string;
  file: File | null;
}

/* Row shape from GET /public/legacy-claim/:token */
interface ClaimRow {
  claim_ref: string;
  status: string;
  open: boolean;
  token_expires_at: string;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  claimant_relationship: string | null;
  claimant_id_type: string | null;
  requested_access: string;
  death_cert_override: boolean;
  link_message: string | null;
  owner: { full_name: string; plan: string } | null;
  documents: { doc_type: DocSlot["key"]; file_name: string }[];
}

/* What the form reads — pre-filled from the secure link. */
interface ClaimToken {
  claimId: string;
  deceasedName: string;
  deceasedPlan: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  relationship: string;
  idType: string;
  accessRequested: string;
  tokenExpires: string;
  /** Documents already received from an earlier submission (admin asked for more). */
  onFile: Partial<Record<DocSlot["key"], string>>;
  deathCertOverride: boolean;
}

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", foundation: "Foundation", family_archive: "Legacy Archive",
  legacy_pro: "Legacy Pro", legacy_vault: "Legacy Vault",
};

function toClaimToken(row: ClaimRow): ClaimToken {
  return {
    claimId: row.claim_ref,
    deceasedName: row.owner?.full_name ?? "the account holder",
    deceasedPlan: row.owner ? (PLAN_LABEL[row.owner.plan] ?? row.owner.plan) : "—",
    claimantName: row.claimant_name,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone ?? "",
    relationship: row.claimant_relationship ?? "Legacy Contact",
    idType: row.claimant_id_type ?? "Driver's License",
    accessRequested: row.requested_access,
    tokenExpires: new Date(row.token_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    onFile: Object.fromEntries(row.documents.map(d => [d.doc_type, d.file_name])),
    deathCertOverride: row.death_cert_override,
  };
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ─── Helpers ─────────────────────────────────────────────────────── */
function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["intro", "identity", "documents", "review", "submitted"];
  const idx = steps.indexOf(step);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {steps.slice(0, 4).map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ width: i < idx ? 24 : i === idx ? 24 : 10, height: 6, borderRadius: 3,
            transition: "all 0.3s",
            background: i < idx ? "#5FBE91" : i === idx ? "#5B6EE1" : "rgba(91,110,225,0.18)" }} />
          {i < 3 && <div style={{ width: 12, height: 1, background: "rgba(91,110,225,0.15)" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepLabel({ step }: { step: Step }) {
  const map: Record<Step, string> = {
    intro: "Step 1 of 4 — Welcome",
    identity: "Step 2 of 4 — Your Identity",
    documents: "Step 3 of 4 — Upload Documents",
    review: "Step 4 of 4 — Review & Submit",
    submitted: "Submitted",
  };
  return <span style={{ fontSize: 12, color: "#8A9AB8", ...MONO }}>{map[step]}</span>;
}

/* ─── Upload drop zone ─────────────────────────────────────────────── */
function UploadZone({ slot, onChange }: { slot: DocSlot; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  }

  return (
    <div style={{ borderRadius: 14, border: `2px dashed ${slot.file ? "rgba(95,190,145,0.4)" : dragging ? "#AEB9F5" : "rgba(91,110,225,0.22)"}`,
      background: slot.file ? "rgba(95,190,145,0.04)" : dragging ? "rgba(91,110,225,0.06)" : "rgba(255,255,255,0.03)",
      transition: "all 0.2s", overflow: "hidden" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}>
      <input ref={ref} type="file" accept={slot.accepted} style={{ display: "none" }}
        onChange={e => onChange(e.target.files?.[0] ?? null)} />

      {slot.file ? (
        /* Uploaded state */
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(95,190,145,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircle size={18} color="#5FBE91" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {slot.file.name}
            </div>
            <div style={{ fontSize: 11, color: "#8A9AB8", marginTop: 2 }}>
              {(slot.file.size / 1024).toFixed(0)} KB · Uploaded
            </div>
          </div>
          <button onClick={() => onChange(null)}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(252,129,129,0.08)",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0 }}>
            <X size={13} color="#FC8181" />
          </button>
        </div>
      ) : (
        /* Empty state */
        <button onClick={() => ref.current?.click()}
          style={{ width: "100%", padding: "20px 18px", background: "transparent",
            border: "none", cursor: "pointer", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(91,110,225,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <Upload size={18} color="#AEB9F5" />
          </div>
          <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, marginBottom: 4 }}>
            Click to upload or drag & drop
          </div>
          <div style={{ fontSize: 11, color: "#8A9AB8" }}>{slot.hint}</div>
          <div style={{ fontSize: 10, color: "#6B7A99", marginTop: 4, ...MONO }}>
            {slot.accepted.replace(/,/g, " · ").toUpperCase()}
          </div>
        </button>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
/* Shown under an empty upload slot whose document was received earlier. */
function OnFileNote({ name }: { name: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#5FBE91" }}>
      <CheckCircle size={12} /> Already received: {name}. Upload again only to replace it.
    </div>
  );
}

/* Full-page message for a link that can't be used (bad, expired, already in review). */
function PortalNotice({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#070A12", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 460, textAlign: "center", background: "#101728", borderRadius: 20, padding: "36px 28px",
        border: "1px solid rgba(91,110,225,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#E8EDF5", fontWeight: 800, marginBottom: 10 }}>{title}</h1>
        <p style={{ fontSize: 14, color: "#A3ADC9", lineHeight: 1.7 }}>{body}</p>
      </div>
    </div>
  );
}

export function LegacyClaimSubmit({ token }: { token: string }) {
  const { data, loading, error } = useAdminFetch(
    () => publicApi.get<{ claim: ClaimRow }>(`/legacy-claim/${encodeURIComponent(token)}`),
    [token],
  );

  if (loading) {
    return <PortalNotice icon={<Loader2 size={28} color="#AEB9F5" className="animate-spin" />} title="Opening your secure claim link" body="One moment…" />;
  }
  if (error || !data) {
    return <PortalNotice icon={<AlertTriangle size={28} color="#D9A55E" />} title="This link can't be opened" body={error ?? "Please contact Final Pass Down for a new claim link."} />;
  }
  if (!data.claim.open) {
    const approved = data.claim.status === "approved";
    const rejected = data.claim.status === "rejected";
    return (
      <PortalNotice
        icon={<CheckCircle size={28} color={rejected ? "#FC8181" : "#5FBE91"} />}
        title={approved ? "This claim has been approved" : rejected ? "This claim was not approved" : "Your claim is with the review team"}
        body={`Claim ${data.claim.claim_ref}. ${approved || rejected
          ? "The Final Pass Down team will be in touch with you about next steps."
          : "Your documents have been received. The Final Pass Down team will contact you once the review is complete."}`}
      />
    );
  }
  return <ClaimForm t={toClaimToken(data.claim)} token={token} />;
}

function ClaimForm({ t, token }: { t: ClaimToken; token: string }) {
  const [step,   setStep]   = useState<Step>("intro");
  const [agreed, setAgreed] = useState(false);
  const [showId, setShowId] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Identity fields */
  const [fullName,  setFullName]  = useState(t.claimantName);
  const [email,     setEmail]     = useState(t.claimantEmail);
  const [phone,     setPhone]     = useState(t.claimantPhone);
  const [idType,    setIdType]    = useState(t.idType);
  const [idNumber,  setIdNumber]  = useState("");

  /* Document slots */
  const [docs, setDocs] = useState<DocSlot[]>([
    { key: "death_certificate", label: "Death Certificate",      required: true,  icon: <FileText size={15} />,       accepted: ".pdf,.jpg,.jpeg,.png",       hint: "Official certified copy — PDF or clear photo",                file: null },
    { key: "claimant_id",       label: "Your Government ID",     required: true,  icon: <UserCheck size={15} />,      accepted: ".pdf,.jpg,.jpeg,.png",       hint: "Passport, driver's license, or state ID",                     file: null },
    { key: "will",              label: "Last Will & Testament",  required: false, icon: <FileCheck size={15} />,      accepted: ".pdf,.jpg,.jpeg,.png",       hint: "Notarized copy preferred",                                    file: null },
    { key: "power_of_attorney", label: "Power of Attorney",      required: false, icon: <FilePlus size={15} />,       accepted: ".pdf,.jpg,.jpeg,.png",       hint: "If applicable to your role",                                  file: null },
    { key: "obituary",          label: "Obituary or News Link",  required: false, icon: <Archive size={15} />,        accepted: ".pdf,.txt,.jpg,.png",        hint: "Newspaper, funeral home, or online obituary",                 file: null },
    { key: "hospital_records",  label: "Hospital Records",       required: false, icon: <Stethoscope size={15} />,    accepted: ".pdf,.jpg,.jpeg,.png",       hint: "Discharge summary, cause of death records, or medical docs",  file: null },
    { key: "other",             label: "Other Supporting Document", required: false, icon: <FolderOpen size={15} />, accepted: ".pdf,.jpg,.jpeg,.png,.docx,.txt", hint: "Any other document supporting your claim",               file: null },
  ]);

  function setDocFile(key: DocSlot["key"], file: File | null) {
    setDocs(prev => prev.map(d => d.key === key ? { ...d, file } : d));
  }

  const [deathCertOverride, setDeathCertOverride] = useState(t.deathCertOverride);

  /* A document counts if it is attached now or already on file from an
     earlier submission (the admin asked for more and re-opened the link). */
  const has = (key: DocSlot["key"]) => docs.find(d => d.key === key)?.file != null || Boolean(t.onFile[key]);

  /* Death cert is satisfied if uploaded OR override is checked */
  const deathCertOk = has("death_certificate") || deathCertOverride;
  const requiredDocsOk = deathCertOk && docs.filter(d => d.required && d.key !== "death_certificate").every(d => has(d.key));
  const submittedCount = docs.filter(d => has(d.key)).length;

  async function handleSubmit() {
    setSubmitting(true);
    const form = new FormData();
    form.set("fullName", fullName);
    form.set("email", email);
    form.set("phone", phone);
    form.set("idType", idType);
    form.set("idLast4", idNumber);
    form.set("deathCertOverride", String(deathCertOverride));
    docs.forEach(d => { if (d.file) form.set(d.key, d.file); });
    try {
      await publicApi.upload(`/legacy-claim/${encodeURIComponent(token)}`, form);
      setStep("submitted");
      toast.success("Claim submitted — the FPD team will review within 2–3 business days");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ─── Shared shell ── */
  return (
    <div style={{ minHeight: "100vh", background: "#070A12",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px 60px" }}>

      {/* Top bar */}
      <div style={{ width: "100%", maxWidth: 680, display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#5B6EE1",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E8EDF5" }}>Final Pass Down</div>
            <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, letterSpacing: "0.08em" }}>SECURE CLAIM PORTAL</div>
          </div>
        </div>
        {step !== "submitted" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <ProgressDots step={step} />
            <StepLabel step={step} />
          </div>
        )}
      </div>

      {/* Token badge */}
      {step !== "submitted" && (
        <div style={{ width: "100%", maxWidth: 680, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 12,
          background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.14)" }}>
          <Lock size={13} color="#AEB9F5" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, color: "#A3ADC9" }}>
            Secure claim link · <span style={{ ...MONO, color: "#AEB9F5" }}>{t.claimId}</span>
            <span style={{ color: "#8A9AB8" }}> · Expires {t.tokenExpires}</span>
          </div>
          <span style={{ fontSize: 10, ...MONO, color: "#5FBE91", fontWeight: 700 }}>🔒 ENCRYPTED</span>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 680 }}>

        {/* ══ INTRO ══ */}
        {step === "intro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Compassionate header */}
            <div style={{ background: "#101728", borderRadius: 20, padding: "32px 32px 28px",
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 4px 24px rgba(91,110,225,0.07)",
              textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 18px",
                background: "rgba(252,129,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Heart size={28} color="#FC8181" />
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "#E8EDF5",
                fontWeight: 800, marginBottom: 10 }}>
                Legacy Access Claim
              </h1>
              <p style={{ fontSize: 15, color: "#A3ADC9", lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
                We're sorry for your loss. This secure form lets you submit the documents
                needed to access <strong style={{ color: "#E8EDF5" }}>{t.deceasedName}'s</strong> Legacy Vault on Final Pass Down.
              </p>
            </div>

            {/* Pre-filled info */}
            <div style={{ background: "#101728", borderRadius: 20, padding: 24,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 2px 12px rgba(91,110,225,0.05)" }}>
              <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 14 }}>CLAIM DETAILS — PRE-FILLED FROM YOUR INVITATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "ACCOUNT HOLDER",      val: t.deceasedName    },
                  { label: "ACCOUNT PLAN",         val: t.deceasedPlan    },
                  { label: "YOUR NAME",            val: t.claimantName    },
                  { label: "YOUR EMAIL",           val: t.claimantEmail   },
                  { label: "YOUR RELATIONSHIP",    val: t.relationship    },
                  { label: "ACCESS REQUESTED",     val: t.accessRequested },
                ].map(f => (
                  <div key={f.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What you'll need */}
            <div style={{ background: "#101728", borderRadius: 20, padding: 24,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 2px 12px rgba(91,110,225,0.05)" }}>
              <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 14 }}>DOCUMENTS YOU'LL NEED</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: <FileText size={14} />,       label: "Death Certificate",           req: true,  note: "Official certified copy from the county or state"              },
                  { icon: <UserCheck size={14} />,      label: "Your Government ID",          req: true,  note: "Passport, driver's license, or state-issued ID"                },
                  { icon: <FileCheck size={14} />,      label: "Last Will & Testament",       req: false, note: "Notarized copy if you have one"                                },
                  { icon: <FilePlus size={14} />,       label: "Power of Attorney",           req: false, note: "If applicable to your role"                                    },
                  { icon: <Archive size={14} />,        label: "Obituary",                    req: false, note: "Newspaper, funeral home listing, or news article"              },
                  { icon: <Stethoscope size={14} />,    label: "Hospital Records",            req: false, note: "Discharge summary, cause of death, or supporting medical docs" },
                  { icon: <FolderOpen size={14} />,     label: "Other Supporting Document",   req: false, note: "Any additional document relevant to your claim"                },
                ].map(d => (
                  <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 10,
                    background: d.req ? "rgba(91,110,225,0.04)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${d.req ? "rgba(91,110,225,0.12)" : "rgba(91,110,225,0.07)"}` }}>
                    <span style={{ color: d.req ? "#AEB9F5" : "#8A9AB8", flexShrink: 0 }}>{d.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{d.label}</div>
                      <div style={{ fontSize: 11, color: "#8A9AB8", marginTop: 2 }}>{d.note}</div>
                    </div>
                    <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "2px 8px",
                      borderRadius: 99,
                      background: d.req ? "rgba(91,110,225,0.1)" : "rgba(91,110,225,0.04)",
                      color: d.req ? "#AEB9F5" : "#8A9AB8" }}>
                      {d.req ? "REQUIRED" : "OPTIONAL"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Agreement */}
            <div style={{ background: "#101728", borderRadius: 20, padding: 22,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 2px 12px rgba(91,110,225,0.05)" }}>
              <label style={{ display: "flex", gap: 12, cursor: "pointer" }}>
                <div onClick={() => setAgreed(!agreed)}
                  style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${agreed ? "#AEB9F5" : "rgba(91,110,225,0.3)"}`,
                    background: agreed ? "#5B6EE1" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", cursor: "pointer" }}>
                  {agreed && <CheckCircle size={12} color="#fff" />}
                </div>
                <span style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.6 }}>
                  I confirm I am <strong style={{ color: "#E8EDF5" }}>{t.claimantName}</strong> and I have
                  legal standing to claim access to this account. I understand that submitting
                  false documents is a violation of Final Pass Down's terms and may be subject to legal action.
                </span>
              </label>
            </div>

            <button onClick={() => setStep("identity")} disabled={!agreed}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "16px 24px", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: agreed ? "pointer" : "default",
                background: agreed ? "linear-gradient(135deg,#5B6EE1,#7E6BD8)" : "rgba(91,110,225,0.15)",
                color: agreed ? "#fff" : "#8A9AB8", border: "none",
                boxShadow: agreed ? "0 6px 20px rgba(91,110,225,0.3)" : "none",
                transition: "all 0.2s" }}>
              Begin Claim Submission <ChevronRight size={17} />
            </button>
          </div>
        )}

        {/* ══ IDENTITY ══ */}
        {step === "identity" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#101728", borderRadius: 20, padding: 28,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 4px 24px rgba(91,110,225,0.07)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5",
                fontWeight: 800, marginBottom: 6 }}>
                Confirm Your Identity
              </h2>
              <p style={{ fontSize: 13, color: "#8A9AB8", marginBottom: 24 }}>
                Some fields are pre-filled from your invitation. Please review and complete the rest.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                      FULL LEGAL NAME <span style={{ color: "#FC8181" }}>*</span>
                    </label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                        padding: "11px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                      EMAIL ADDRESS <span style={{ color: "#FC8181" }}>*</span>
                    </label>
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                        padding: "11px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                    PHONE NUMBER <span style={{ color: "#FC8181" }}>*</span>
                  </label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                      padding: "11px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                </div>

                {/* ID info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                      ID TYPE <span style={{ color: "#FC8181" }}>*</span>
                    </label>
                    <select value={idType} onChange={e => setIdType(e.target.value)} className="fpd-select-dark"
                      style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                        padding: "11px 14px", fontSize: 13, color: "#E8EDF5", outline: "none", appearance: "none" }}>
                      <option>Passport</option>
                      <option>{"Driver's License"}</option>
                      <option>State ID</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                      ID NUMBER (LAST 4 DIGITS) <span style={{ color: "#FC8181" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input value={idNumber} onChange={e => setIdNumber(e.target.value)}
                        maxLength={4}
                        type={showId ? "text" : "password"}
                        placeholder="••••"
                        style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                          padding: "11px 40px 11px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                      <button onClick={() => setShowId(!showId)} type="button"
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer", color: "#8A9AB8", padding: 2 }}>
                        {showId ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Relationship (pre-filled, read-only) */}
                <div>
                  <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                    RELATIONSHIP TO ACCOUNT HOLDER
                  </label>
                  <div style={{ background: "rgba(91,110,225,0.04)", borderRadius: 10,
                    padding: "11px 14px", fontSize: 13, color: "#A3ADC9",
                    border: "1px solid rgba(91,110,225,0.1)" }}>
                    {t.relationship} <span style={{ color: "#6B7A99", fontSize: 11 }}>(set by account holder)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("intro")}
                style={{ padding: "14px 22px", borderRadius: 14, background: "#101728",
                  color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", fontSize: 14,
                  fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={() => setStep("documents")}
                disabled={!fullName || !email || !phone || !idNumber}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 24px", borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: (fullName && email && phone && idNumber) ? "linear-gradient(135deg,#5B6EE1,#7E6BD8)" : "rgba(91,110,225,0.15)",
                  color: (fullName && email && phone && idNumber) ? "#fff" : "#8A9AB8",
                  border: "none", cursor: (fullName && email && phone && idNumber) ? "pointer" : "default",
                  boxShadow: (fullName && email && phone && idNumber) ? "0 6px 20px rgba(91,110,225,0.3)" : "none" }}>
                Continue to Documents <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ══ DOCUMENTS ══ */}
        {step === "documents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#101728", borderRadius: 20, padding: 28,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 4px 24px rgba(91,110,225,0.07)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5",
                fontWeight: 800, marginBottom: 6 }}>
                Upload Documents
              </h2>
              <p style={{ fontSize: 13, color: "#8A9AB8", marginBottom: 6 }}>
                Required documents are marked. Optional docs strengthen your claim.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24,
                padding: "9px 14px", borderRadius: 10,
                background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.12)" }}>
                <Lock size={12} color="#AEB9F5" />
                <span style={{ fontSize: 12, color: "#A3ADC9" }}>
                  All files are encrypted in transit and stored securely. Only FPD admins can access them.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {docs.map(doc => (
                  <div key={doc.key}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: doc.required ? "#AEB9F5" : "#8A9AB8" }}>{doc.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>{doc.label}</span>
                      <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "2px 8px",
                        borderRadius: 99,
                        background: doc.required ? "rgba(91,110,225,0.1)" : "rgba(91,110,225,0.04)",
                        color: doc.required ? "#AEB9F5" : "#8A9AB8" }}>
                        {doc.required ? "REQUIRED" : "OPTIONAL"}
                      </span>
                      {doc.key === "death_certificate" && deathCertOverride && (
                        <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "2px 9px",
                          borderRadius: 99, background: "rgba(217,165,94,0.1)", color: "#D9A55E" }}>
                          OVERRIDE ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Death cert override option */}
                    {doc.key === "death_certificate" && (
                      <div style={{ marginBottom: 10 }}>
                        <UploadZone slot={doc} onChange={f => { setDocFile(doc.key, f); if (f) setDeathCertOverride(false); }} />
                        {!doc.file && t.onFile[doc.key] && <OnFileNote name={t.onFile[doc.key]!} />}

                        {!doc.file && !t.onFile[doc.key] && (
                          <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 12,
                            background: deathCertOverride ? "rgba(217,165,94,0.07)" : "rgba(91,110,225,0.03)",
                            border: `1px solid ${deathCertOverride ? "rgba(217,165,94,0.25)" : "rgba(91,110,225,0.12)"}` }}>
                            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                              <div onClick={() => setDeathCertOverride(!deathCertOverride)}
                                style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                                  border: `2px solid ${deathCertOverride ? "#D9A55E" : "rgba(91,110,225,0.3)"}`,
                                  background: deathCertOverride ? "#D9A55E" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s", cursor: "pointer" }}>
                                {deathCertOverride && <CheckCircle size={11} color="#fff" />}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: deathCertOverride ? "#D9A55E" : "#E8EDF5", marginBottom: 3 }}>
                                  I don't have the death certificate yet
                                </div>
                                <div style={{ fontSize: 12, color: "#A3ADC9", lineHeight: 1.6 }}>
                                  Death certificates can take weeks to arrive. Check this box to submit your claim now —
                                  FPD may grant temporary access at admin discretion. <strong style={{ color: "#D9A55E" }}>You must send the official certificate once received.</strong>
                                  Failure to submit within 30 days may result in access suspension.
                                </div>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {doc.key !== "death_certificate" && (
                      <>
                        <UploadZone slot={doc} onChange={f => setDocFile(doc.key, f)} />
                        {!doc.file && t.onFile[doc.key] && <OnFileNote name={t.onFile[doc.key]!} />}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!requiredDocsOk && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                borderRadius: 12, background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.2)" }}>
                <AlertTriangle size={14} color="#D9A55E" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#D9A55E" }}>
                  Please upload your Government ID and either the Death Certificate or check the override option.
                </span>
              </div>
            )}

            {deathCertOverride && requiredDocsOk && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px",
                borderRadius: 12, background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.25)" }}>
                <AlertTriangle size={14} color="#D9A55E" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: "#D9A55E", lineHeight: 1.5 }}>
                  <strong>Override selected.</strong> Your claim will be submitted without the death certificate.
                  Admin will review and may grant temporary access. You must send the official death certificate within 30 days.
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("identity")}
                style={{ padding: "14px 22px", borderRadius: 14, background: "#101728",
                  color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", fontSize: 14,
                  fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={() => setStep("review")} disabled={!requiredDocsOk}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 24px", borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: requiredDocsOk ? "linear-gradient(135deg,#5B6EE1,#7E6BD8)" : "rgba(91,110,225,0.15)",
                  color: requiredDocsOk ? "#fff" : "#8A9AB8", border: "none",
                  cursor: requiredDocsOk ? "pointer" : "default",
                  boxShadow: requiredDocsOk ? "0 6px 20px rgba(91,110,225,0.3)" : "none" }}>
                Review Submission ({submittedCount} doc{submittedCount !== 1 ? "s" : ""}) <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ══ REVIEW ══ */}
        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#101728", borderRadius: 20, padding: 28,
              border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 4px 24px rgba(91,110,225,0.07)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5",
                fontWeight: 800, marginBottom: 20 }}>
                Review & Submit
              </h2>

              {/* Claimant summary */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 10 }}>YOUR INFORMATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Full Name",   val: fullName },
                    { label: "Email",       val: email    },
                    { label: "Phone",       val: phone    },
                    { label: "ID Type",     val: idType   },
                    { label: "Relationship", val: t.relationship },
                    { label: "Access Level", val: t.accessRequested },
                  ].map(f => (
                    <div key={f.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents summary */}
              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 10 }}>DOCUMENTS TO BE SUBMITTED</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {docs.map(doc => {
                    const included = doc.file?.name ?? t.onFile[doc.key];
                    const isOverridden = doc.key === "death_certificate" && !included && deathCertOverride;
                    return (
                      <div key={doc.key} style={{ display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", borderRadius: 10,
                        background: included ? "rgba(95,190,145,0.05)" : isOverridden ? "rgba(217,165,94,0.06)" : "rgba(91,110,225,0.03)",
                        border: `1px solid ${included ? "rgba(95,190,145,0.15)" : isOverridden ? "rgba(217,165,94,0.2)" : "rgba(91,110,225,0.08)"}` }}>
                        <span style={{ color: included ? "#5FBE91" : isOverridden ? "#D9A55E" : "#8A9AB8" }}>{doc.icon}</span>
                        <span style={{ flex: 1, fontSize: 13, color: "#E8EDF5" }}>{doc.label}</span>
                        {included ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: "#8A9AB8", maxWidth: 140,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {included}
                            </span>
                            <CheckCircle size={13} color="#5FBE91" />
                          </div>
                        ) : isOverridden ? (
                          <span style={{ fontSize: 10, color: "#D9A55E", fontWeight: 700, ...MONO }}>
                            OVERRIDE — SEND WITHIN 30 DAYS
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>
                            {doc.required ? "⚠ MISSING" : "NOT INCLUDED"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div style={{ background: "rgba(91,110,225,0.04)", borderRadius: 16, padding: 20,
              border: "1px solid rgba(91,110,225,0.12)" }}>
              <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>WHAT HAPPENS NEXT</div>
              {[
                "Your documents are encrypted and sent to the FPD admin team",
                "A reviewer will verify your identity and documents within 2–3 business days",
                "You'll receive an email update at " + email + " with the outcome",
                "If approved, you'll receive a secure access link to the Legacy Vault",
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    background: "rgba(91,110,225,0.1)", display: "flex", alignItems: "center",
                    justifyContent: "center", marginTop: 1 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#AEB9F5" }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("documents")}
                style={{ padding: "14px 22px", borderRadius: 14, background: "#101728",
                  color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", fontSize: 14,
                  fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "16px 24px", borderRadius: 14, fontSize: 15, fontWeight: 700,
                  background: "linear-gradient(135deg,#5FBE91,#10B981)",
                  color: "#fff", border: "none", cursor: submitting ? "default" : "pointer",
                  boxShadow: "0 6px 20px rgba(95,190,145,0.3)", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? (
                  <>
                    <Clock size={15} style={{ animation: "spin 1s linear infinite" }} />
                    Encrypting & Submitting...
                  </>
                ) : (
                  <><Shield size={15} /> Submit Claim Securely</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ══ SUBMITTED ══ */}
        {step === "submitted" && (
          <div style={{ background: "#101728", borderRadius: 24, padding: "48px 32px",
            border: "1px solid rgba(95,190,145,0.2)", boxShadow: "0 8px 40px rgba(95,190,145,0.12)",
            textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 24px",
              background: "rgba(95,190,145,0.1)", border: "3px solid rgba(95,190,145,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={32} color="#5FBE91" />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#E8EDF5",
              fontWeight: 800, marginBottom: 10 }}>
              Claim Submitted
            </h2>
            <p style={{ fontSize: 15, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
              Your documents have been received and are now in the FPD admin review queue.
              The FPD team will contact you at <strong style={{ color: "#E8EDF5" }}>{email}</strong> within 2–3 business days.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32,
              background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 18, textAlign: "left" }}>
              {[
                { label: "Claim ID",       val: t.claimId,     mono: true  },
                { label: "Submitted",      val: "Just now",    mono: false },
                { label: "Docs Received",  val: `${submittedCount} document${submittedCount !== 1 ? "s" : ""}`, mono: false },
                { label: "Next Steps",     val: "A reviewer will verify your identity and documents", mono: false },
              ].map(f => (
                <div key={f.label} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span style={{ width: 100, fontSize: 10, color: "#8A9AB8", ...MONO, flexShrink: 0 }}>
                    {f.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 500, ...(f.mono ? MONO : {}) }}>
                    {f.val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step !== "submitted" && (
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#6B7A99", lineHeight: 1.6 }}>
            🔒 256-bit SSL encrypted · Documents stored in secure vault
          </div>
          <div style={{ fontSize: 11, color: "#5A6A88", marginTop: 4 }}>
            finalpassdown.com · Privacy Policy · Terms of Service
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
