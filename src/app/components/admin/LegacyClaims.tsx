import React, { useState, useMemo } from "react";
import {
  FileText, CheckCircle, XCircle, Clock, Eye,
  Search, X, Download, Shield, AlertTriangle, Heart,
  RefreshCw, Flag, Lock, ChevronDown, ChevronUp,
  FileCheck, FilePlus, Archive, UserCheck, Send, Mail, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";
import { copyToClipboard } from "../../utils/clipboard";
import { claimLink } from "./MarkDeceasedModal";

/* ─── Types ───────────────────────────────────────────────────────── */
/* link_sent = a claim link was issued (Mark Deceased) but the contact has not
   submitted yet. The other four are the review states. */
type ClaimStatus = "link_sent" | "pending_review" | "awaiting_docs" | "approved" | "rejected";
type ClaimTab = "documents" | "details" | "access" | "timeline";
type DocType = "death_certificate" | "claimant_id" | "will" | "power_of_attorney" | "obituary" | "hospital_records" | "other";

interface ClaimDoc {
  type: DocType;
  label: string;
  submitted: boolean;
  fileName?: string;
  storedAt?: string;
}

interface TimelineEvent {
  date: string;
  event: string;
  actor: string;
  type?: "system" | "claimant" | "admin" | "warn";
}

interface DeathClaim {
  dbId: string;
  id: string; /* claim reference, e.g. CLM-2026-0044 */
  status: ClaimStatus;
  submittedDate: string;
  token: string;
  linkExpires: string;
  linkMessage: string;

  /* Deceased */
  deceasedName: string;
  deceasedEmail: string;
  deceasedPlan: string;
  deceasedSince: string;
  deceasedLocation: string;
  deceasedDOD: string; /* date of death */

  /* Claimant */
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  claimantRelationship: string;
  claimantIdVerified: boolean;
  requestedAccess: string;

  /* Documents */
  docs: ClaimDoc[];
  deathCertOverride: boolean;

  /* Review */
  adminNotes: string;
  rejectionReason: string;
  timeline: TimelineEvent[];
}

/* Row shape from GET /admin/legacy/claims — see routes/legacy.ts */
interface ClaimRow {
  id: string;
  claim_ref: string;
  status: ClaimStatus;
  token: string;
  token_expires_at: string;
  date_of_death: string | null;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  claimant_relationship: string | null;
  requested_access: string;
  death_cert_override: boolean;
  link_message: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  owner: { id: string; full_name: string; email: string; plan: string; country: string | null; created_at: string } | null;
  contact: { id: string; verification_status: string } | null;
  documents: { id: string; doc_type: DocType; file_name: string; uploaded_at: string }[];
  events: { id: string; event: string; actor: string; type: TimelineEvent["type"]; created_at: string }[];
}

const DOC_SLOTS: { type: DocType; label: string }[] = [
  { type: "death_certificate", label: "Death Certificate" },
  { type: "claimant_id",       label: "Claimant Government ID" },
  { type: "will",              label: "Last Will & Testament" },
  { type: "power_of_attorney", label: "Power of Attorney" },
  { type: "obituary",          label: "Obituary / News Link" },
  { type: "hospital_records",  label: "Hospital Records" },
  { type: "other",             label: "Other Supporting Document" },
];

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", foundation: "Foundation", family_archive: "Legacy Archive",
  legacy_pro: "Legacy Pro", legacy_vault: "Legacy Vault",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtDateTime = (iso: string) =>
  `${fmtDate(iso)} · ${new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

function toClaim(row: ClaimRow): DeathClaim {
  return {
    dbId: row.id,
    id: row.claim_ref,
    status: row.status,
    submittedDate: row.submitted_at ? fmtDate(row.submitted_at) : "Not yet submitted",
    token: row.token,
    linkExpires: fmtDate(row.token_expires_at),
    linkMessage: row.link_message ?? "",
    deceasedName: row.owner?.full_name ?? "Unknown account",
    deceasedEmail: row.owner?.email ?? "—",
    deceasedPlan: row.owner ? (PLAN_LABEL[row.owner.plan] ?? row.owner.plan) : "—",
    deceasedSince: fmtDate(row.owner?.created_at ?? null),
    deceasedLocation: row.owner?.country ?? "—",
    // A DATE column: parse as local noon so the day doesn't shift by timezone.
    deceasedDOD: row.date_of_death ? fmtDate(`${row.date_of_death}T12:00:00`) : "—",
    claimantName: row.claimant_name,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone ?? "—",
    claimantRelationship: row.claimant_relationship ?? "Legacy Contact",
    claimantIdVerified: row.contact?.verification_status === "verified",
    requestedAccess: row.requested_access,
    docs: DOC_SLOTS.map(slot => {
      const doc = row.documents.find(d => d.doc_type === slot.type);
      return { ...slot, submitted: Boolean(doc), fileName: doc?.file_name, storedAt: doc ? fmtDateTime(doc.uploaded_at) : undefined };
    }),
    deathCertOverride: row.death_cert_override,
    adminNotes: row.admin_notes ?? "",
    rejectionReason: row.rejection_reason ?? "",
    timeline: [...row.events]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(e => ({ date: fmtDateTime(e.created_at), event: e.event, actor: e.actor, type: e.type })),
  };
}

const STATUS_MAP: Record<ClaimStatus, { label: string; color: string; bg: string }> = {
  link_sent:      { label: "LINK SENT",         color: "#AEB9F5", bg: "rgba(91,110,225,0.15)"  },
  pending_review: { label: "PENDING REVIEW",    color: "#F6AD55", bg: "rgba(246,173,85,0.12)"  },
  awaiting_docs:  { label: "AWAITING DOCS",     color: "#4A90D9", bg: "rgba(74,144,217,0.12)"  },
  approved:       { label: "APPROVED",          color: "#48BB78", bg: "rgba(72,187,120,0.12)"  },
  rejected:       { label: "REJECTED",          color: "#FC8181", bg: "rgba(252,129,129,0.12)" },
};

const DOC_ICON: Record<ClaimDoc["type"], React.ReactNode> = {
  death_certificate:  <FileText    size={14} />,
  claimant_id:        <UserCheck   size={14} />,
  will:               <FileCheck   size={14} />,
  power_of_attorney:  <FilePlus    size={14} />,
  obituary:           <Archive     size={14} />,
  hospital_records:   <FileText    size={14} />,
  other:              <FilePlus    size={14} />,
};

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function fieldBox(warn = false): React.CSSProperties {
  return {
    background: warn ? "rgba(217,165,94,0.07)" : "rgba(255,255,255,0.06)",
    border: warn ? "1px solid rgba(217,165,94,0.25)" : "none",
    borderRadius: 10, padding: "10px 14px",
  };
}

/* ─── Document visual card ────────────────────────────────────────── */
function DocCard({ doc, onOpen }: { doc: ClaimDoc; onOpen: (type: DocType) => void }) {
  const colors: Record<ClaimDoc["type"], string> = {
    death_certificate: "#1A1A2E",
    claimant_id:       "#1B4332",
    will:              "#1A3A6B",
    power_of_attorney: "#4A1942",
    obituary:          "#2D1B00",
    hospital_records:  "#123A3A",
    other:             "#2A2A3A",
  };
  const bg = colors[doc.type];

  if (!doc.submitted) {
    return (
      <div style={{ borderRadius: 14, border: "2px dashed rgba(91,110,225,0.2)",
        background: "rgba(91,110,225,0.03)", padding: 24, textAlign: "center" }}>
        <div style={{ color: "#8A9AB8", fontSize: 12, marginBottom: 6 }}>Not submitted</div>
        <div style={{ color: "#A3ADC9", fontSize: 13, fontWeight: 600 }}>{doc.label}</div>
      </div>
    );
  }

  return (
    <div onClick={() => onOpen(doc.type)} title="Open document"
      style={{ borderRadius: 14, overflow: "hidden", cursor: "pointer",
      boxShadow: "0 6px 24px rgba(0,0,0,0.14)", border: `2px solid ${bg}40` }}>
      <div style={{ background: `linear-gradient(135deg,${bg},${bg}CC)`, padding: "18px 18px 14px", position: "relative" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 8, ...MONO, letterSpacing: "0.14em" }}>
              FINAL PASS DOWN · SECURE DOCUMENT
            </div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 800, marginTop: 3 }}>
              {doc.label.toUpperCase()}
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={11} color="rgba(255,255,255,0.6)" />
          </div>
        </div>

        {/* body lines */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 7, borderRadius: 3, marginBottom: 5,
            background: `rgba(255,255,255,${i === 0 ? 0.25 : i === 1 ? 0.15 : 0.08})`,
            width: i === 3 ? "55%" : "100%" }} />
        ))}

        {/* stamp */}
        <div style={{ position: "absolute", bottom: 14, right: 14, opacity: 0.18,
          border: "2px solid #fff", borderRadius: 6, padding: "3px 8px",
          color: "#fff", fontSize: 9, ...MONO, fontWeight: 800, letterSpacing: "0.1em" }}>
          STORED
        </div>
        {/* security overlay */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)",
          backgroundSize: "8px 8px" }} />
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO }}>Stored · {doc.storedAt}</div>
        <span style={{ fontSize: 9, ...MONO, color: "#AEB9F5", fontWeight: 700, maxWidth: 140,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.fileName}</span>
      </div>
    </div>
  );
}

/* ─── Claim Review Modal ──────────────────────────────────────────── */
function ClaimModal({ claim, onClose, onApprove, onReject, onRequestDocs, onChanged }: {
  claim: DeathClaim;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onRequestDocs: (id: string) => void;
  onChanged: () => void;
}) {
  const [tab,      setTab]      = useState<ClaimTab>("documents");
  const [notes,    setNotes]    = useState(claim.adminNotes);
  const [rejMode,  setRejMode]  = useState(false);
  const [rejReason, setRejReason] = useState("");

  const st = STATUS_MAP[claim.status];
  const submittedCount = claim.docs.filter(d => d.submitted).length;
  const totalDocs = claim.docs.length;
  const isPending = claim.status === "pending_review" || claim.status === "awaiting_docs";

  /* Files live in a private bucket; the backend hands out 5-minute signed URLs. */
  async function openDocs(only?: DocType) {
    try {
      const { documents } = await adminApi.get<{ documents: { doc_type: DocType; file_name: string; url: string | null }[] }>(`/legacy/claims/${claim.dbId}/documents`);
      const wanted = documents.filter(d => d.url && (!only || d.doc_type === only));
      if (wanted.length === 0) { toast.error("No stored file to open"); return; }
      wanted.forEach(d => window.open(d.url!, "_blank", "noopener"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the documents");
    }
  }

  async function saveNotes() {
    try {
      await adminApi.patch(`/legacy/claims/${claim.dbId}/notes`, { notes });
      toast.success("Notes saved");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save notes");
    }
  }

  async function escalate() {
    try {
      await adminApi.post(`/legacy/claims/${claim.dbId}/escalate`);
      toast.success("Claim flagged for escalation");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not flag the claim");
    }
  }

  const TABS: { id: ClaimTab; label: string }[] = [
    { id: "documents", label: "Documents"     },
    { id: "details",   label: "Claim Details" },
    { id: "access",    label: "Access Grant"  },
    { id: "timeline",  label: "Timeline"      },
  ];

  const REJECT_REASONS = [
    "Claimant not listed as a legacy contact",
    "Death certificate could not be verified",
    "Insufficient legal documentation",
    "Suspected fraudulent claim",
    "Claimant ID verification failed",
    "Other",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,15,0.78)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background: "#101728", borderRadius: 20, width: "100%", maxWidth: 820,
        maxHeight: "93vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0,0,0,0.45)" }}>

        {/* ── Header ── */}
        <div style={{ background: "linear-gradient(135deg,#0B1124,#1A2440)",
          padding: "22px 26px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Heart size={22} color="rgba(255,255,255,0.7)" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#fff", fontWeight: 800 }}>
                    Estate of {claim.deceasedName}
                  </span>
                  <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "3px 9px",
                    borderRadius: 99, background: `${st.bg}`, color: st.color,
                    border: `1px solid ${st.color}30` }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 4 }}>
                  {claim.id} · Claim by {claim.claimantName} · {claim.claimantRelationship} · Submitted {claim.submittedDate}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.08)",
              border: "none", borderRadius: 8, padding: 8, cursor: "pointer", flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          {/* Quick stat strip */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { label: "RELATIONSHIP",  val: claim.claimantRelationship },
              { label: "DATE OF DEATH", val: claim.deceasedDOD },
              { label: "DOCS RECEIVED", val: `${submittedCount} / ${totalDocs}`, color: submittedCount < 2 ? "#F6AD55" : undefined },
              { label: "CLAIMANT ID",   val: claim.claimantIdVerified ? "Pre-Verified ✓" : "Not Verified", color: claim.claimantIdVerified ? "#48BB78" : "#FC8181" },
              { label: "DEATH CERT",    val: claim.deathCertOverride ? "Override Active ⚠" : claim.docs.find(d => d.type === "death_certificate")?.submitted ? "Received ✓" : "Not Received", color: claim.deathCertOverride ? "#D9A55E" : claim.docs.find(d => d.type === "death_certificate")?.submitted ? "#48BB78" : "#FC8181" },
            ].map(f => (
              <div key={f.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "7px 14px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", ...MONO, marginBottom: 3 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: f.color ?? "rgba(255,255,255,0.9)" }}>{f.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(91,110,225,0.1)",
          background: "rgba(255,255,255,0.03)", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "12px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none",
                color: tab === t.id ? "#AEB9F5" : "#8A9AB8",
                borderBottom: tab === t.id ? "2px solid #AEB9F5" : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: 26, scrollbarWidth: "none" }}>

          {/* ══ DOCUMENTS ══ */}
          {tab === "documents" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 14 }}>
                  SUBMITTED DOCUMENTS — {submittedCount} OF {totalDocs} RECEIVED
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {claim.docs.map(doc => <DocCard key={doc.type} doc={doc} onOpen={t => void openDocs(t)} />)}
                </div>
              </div>

              {/* Document checklist */}
              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 10 }}>DOCUMENT VERIFICATION CHECKLIST</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {claim.docs.map(doc => (
                    <div key={doc.type} style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 10,
                      background: doc.submitted ? "rgba(95,190,145,0.05)" : "rgba(91,110,225,0.04)",
                      border: `1px solid ${doc.submitted ? "rgba(95,190,145,0.15)" : "rgba(91,110,225,0.1)"}` }}>
                      <span style={{ color: doc.submitted ? "#5FBE91" : "#8A9AB8" }}>
                        {DOC_ICON[doc.type]}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: "#E8EDF5" }}>{doc.label}</span>
                      {doc.submitted ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>{doc.storedAt}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4,
                            fontSize: 11, ...MONO, color: "#5FBE91", fontWeight: 700 }}>
                            <CheckCircle size={11} /> STORED
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>NOT SUBMITTED</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => void openDocs()} disabled={submittedCount === 0}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
                    borderRadius: 10, background: "rgba(91,110,225,0.08)", color: "#AEB9F5",
                    border: "1px solid rgba(91,110,225,0.15)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Download size={13} /> Download All Documents
                </button>
              </div>
            </div>
          )}

          {/* ══ DETAILS ══ */}
          {tab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>DECEASED ACCOUNT HOLDER</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Full Name",          val: claim.deceasedName     },
                    { label: "Email Address",       val: claim.deceasedEmail    },
                    { label: "Subscription Plan",   val: claim.deceasedPlan     },
                    { label: "Member Since",        val: claim.deceasedSince    },
                    { label: "Location",            val: claim.deceasedLocation },
                    { label: "Date of Death",       val: claim.deceasedDOD,     warn: true },
                  ].map(f => (
                    <div key={f.label} style={fieldBox(f.warn)}>
                      <div style={{ color: "#8A9AB8", fontSize: 10, ...MONO, marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                      <div style={{ color: f.warn ? "#D9A55E" : "#E8EDF5", fontSize: 13, fontWeight: 500 }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>CLAIMANT (LEGACY CONTACT)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Full Name",       val: claim.claimantName         },
                    { label: "Email Address",   val: claim.claimantEmail        },
                    { label: "Phone",           val: claim.claimantPhone        },
                    { label: "Relationship",    val: claim.claimantRelationship },
                    { label: "ID Pre-Verified", val: claim.claimantIdVerified ? "Yes — verified prior to claim" : "No — not pre-verified",
                      warn: !claim.claimantIdVerified },
                    { label: "Access Requested", val: claim.requestedAccess     },
                  ].map(f => (
                    <div key={f.label} style={fieldBox(f.warn)}>
                      <div style={{ color: "#8A9AB8", fontSize: 10, ...MONO, marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                      <div style={{ color: f.warn ? "#D9A55E" : "#E8EDF5", fontSize: 13, fontWeight: 500 }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 8 }}>ADMIN NOTES</div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Add internal notes about this claim..."
                  style={{ background: "rgba(91,110,225,0.04)", border: "1px solid rgba(91,110,225,0.15)",
                    color: "#E8EDF5", fontSize: 13, outline: "none", borderRadius: 10,
                    padding: "10px 14px", width: "100%", resize: "vertical" }} />
                <button onClick={() => void saveNotes()}
                  style={{ marginTop: 8, padding: "8px 16px", borderRadius: 10,
                    background: "rgba(91,110,225,0.08)", color: "#AEB9F5",
                    border: "1px solid rgba(91,110,225,0.15)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Save Notes
                </button>
              </div>
            </div>
          )}

          {/* ══ ACCESS ══ */}
          {tab === "access" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>REQUESTED ACCESS LEVEL</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 18, borderRadius: 14,
                  background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.14)" }}>
                  <Lock size={22} color="#AEB9F5" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "#E8EDF5" }}>{claim.requestedAccess}</div>
                    <div style={{ fontSize: 12, color: "#8A9AB8", marginTop: 5, lineHeight: 1.6 }}>
                      Grants {claim.claimantName} full read and download access to all files, documents, messages, and records stored in {claim.deceasedName}'s Legacy Vault after approval.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>WHAT HAPPENS ON APPROVAL</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "All submitted documents are permanently stored and archived in the secure vault",
                    `The account's $199 Legacy Continuation Fee becomes "Ready to Activate" in the Continuation Vault tab`,
                    `Activating the fee opens ${claim.deceasedName}'s Legacy Vault to verified legacy contacts for the activation window`,
                    `${claim.claimantName} must be told of the outcome by the FPD team — email sending is not connected yet`,
                    "A full audit record of this decision is saved in the claim timeline and the Audit Log",
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "10px 14px", borderRadius: 10, background: "rgba(95,190,145,0.04)",
                      border: "1px solid rgba(95,190,145,0.12)" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: "rgba(95,190,145,0.12)", display: "flex", alignItems: "center",
                        justifyContent: "center", marginTop: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#5FBE91" }}>{i + 1}</span>
                      </div>
                      <span style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 12,
                background: "rgba(217,165,94,0.06)", border: "1px solid rgba(217,165,94,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <AlertTriangle size={14} color="#D9A55E" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#D9A55E" }}>Important</span>
                </div>
                <div style={{ fontSize: 12, color: "#A3ADC9", lineHeight: 1.6 }}>
                  Once account access is granted, this action cannot be undone without a formal legal dispute process.
                  Ensure all documents have been reviewed and the claimant's identity is confirmed before approving.
                </div>
              </div>
            </div>
          )}

          {/* ══ TIMELINE ══ */}
          {tab === "timeline" && (
            <div>
              <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 20 }}>CLAIM AUDIT TRAIL</div>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2,
                  background: "rgba(91,110,225,0.08)", borderRadius: 1 }} />
                {claim.timeline.map((evt, i) => {
                  const isWarn  = evt.type === "warn";
                  const isAdmin = evt.type === "admin";
                  const dotColor = isWarn ? "#D9A55E" : isAdmin ? "#9F7AEA" : "#AEB9F5";
                  return (
                    <div key={i} style={{ display: "flex", gap: 16, paddingBottom: 22, position: "relative" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#101728",
                        border: "2px solid rgba(91,110,225,0.18)", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, zIndex: 1,
                        boxShadow: "0 2px 8px rgba(91,110,225,0.08)" }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: dotColor }} />
                      </div>
                      <div style={{ flex: 1, paddingTop: 5 }}>
                        <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 500, lineHeight: 1.4 }}>{evt.event}</div>
                        <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>{evt.date}</span>
                          <span style={{ fontSize: 11, color: "#8A9AB8" }}>·</span>
                          <span style={{ fontSize: 11, color: "#A3ADC9" }}>{evt.actor}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isPending && (
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%",
                      background: "rgba(246,173,85,0.12)", border: "2px solid rgba(246,173,85,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                      <Clock size={13} color="#F6AD55" />
                    </div>
                    <div style={{ paddingTop: 5 }}>
                      <div style={{ fontSize: 13, color: "#F6AD55", fontWeight: 600 }}>Awaiting admin decision</div>
                      <div style={{ fontSize: 11, color: "#8A9AB8", marginTop: 4 }}>Pending since {claim.submittedDate}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: "1px solid rgba(91,110,225,0.1)", padding: "18px 26px", flexShrink: 0 }}>
          {isPending && !rejMode ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => onApprove(claim.dbId)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 24px",
                  borderRadius: 12, background: "linear-gradient(135deg,#5FBE91,#10B981)",
                  color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(95,190,145,0.3)" }}>
                <Shield size={15} /> Approve & Grant Access
              </button>
              <button onClick={() => setRejMode(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px",
                  borderRadius: 12, background: "rgba(252,129,129,0.12)", color: "#FC8181",
                  border: "1px solid rgba(252,129,129,0.3)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <XCircle size={15} /> Reject Claim
              </button>
              <button onClick={() => onRequestDocs(claim.dbId)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 18px",
                  borderRadius: 12, background: "rgba(91,110,225,0.06)", color: "#8A9AB8",
                  border: "1px solid rgba(91,110,225,0.12)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <RefreshCw size={13} /> Request More Docs
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => void escalate()}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 16px",
                  borderRadius: 12, background: "rgba(217,165,94,0.08)", color: "#D9A55E",
                  border: "1px solid rgba(217,165,94,0.2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Flag size={13} /> Escalate
              </button>
            </div>
          ) : isPending && rejMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#FC8181" }}>Select rejection reason:</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {REJECT_REASONS.map(r => (
                  <button key={r} onClick={() => setRejReason(r)}
                    style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      background: rejReason === r ? "rgba(252,129,129,0.15)" : "rgba(91,110,225,0.04)",
                      color: rejReason === r ? "#FC8181" : "#A3ADC9",
                      border: `1px solid ${rejReason === r ? "rgba(252,129,129,0.4)" : "rgba(91,110,225,0.1)"}` }}>
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => onReject(claim.dbId, rejReason)} disabled={!rejReason}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px",
                    borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: rejReason ? "pointer" : "default",
                    background: rejReason ? "rgba(252,129,129,0.15)" : "rgba(91,110,225,0.04)",
                    color: rejReason ? "#FC8181" : "#8A9AB8",
                    border: `1px solid ${rejReason ? "rgba(252,129,129,0.35)" : "rgba(91,110,225,0.1)"}` }}>
                  <XCircle size={14} /> Confirm Rejection
                </button>
                <button onClick={() => { setRejMode(false); setRejReason(""); }}
                  style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(91,110,225,0.06)",
                    color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.12)", fontSize: 13,
                    fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#8A9AB8" }}>
              {claim.status === "link_sent" ? (
                <>The claim link has been issued. Nothing to review until the claimant submits their documents.</>
              ) : (
                <>This claim has been <strong style={{ color: claim.status === "approved" ? "#48BB78" : "#FC8181" }}>
                  {claim.status}
                </strong>{claim.rejectionReason ? ` — ${claim.rejectionReason}` : ""}. No further action available.</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Send / Resend Claim Link Modal ─────────────────────────────── */
function SendClaimLinkModal({ claim, onClose, onChanged }: { claim: DeathClaim; onClose: () => void; onChanged: () => void }) {
  const [recipientEmail, setRecipientEmail] = useState(claim.claimantEmail);
  const [recipientName,  setRecipientName]  = useState(claim.claimantName);
  const [customMsg,      setCustomMsg]      = useState(claim.linkMessage || "We are sorry for your loss. Please use the secure link below to submit the required documents so we can process your legacy access claim.");
  const [sending,        setSending]        = useState(false);
  const [sent,           setSent]           = useState(false);
  const [token,          setToken]          = useState(claim.token);

  const link = claimLink(token);
  const fullMessage = (url: string) => `${customMsg}\n\n${url}\n\nThis link is unique to you and expires in 30 days.`;

  /* "Send" issues a fresh link (the old one stops working) and the server
     emails it to the recipient. If the email can't go out, the message is
     copied instead so the admin can send it from their own mailbox. */
  async function handleSend() {
    setSending(true);
    try {
      const res = await adminApi.post<{ claim: { token: string }; emailed?: boolean; emailError?: string }>(`/legacy/claims/${claim.dbId}/link`, { email: recipientEmail, message: customMsg });
      setToken(res.claim.token);
      setSent(true);
      if (res.emailed) {
        toast.success(`New claim link emailed to ${recipientEmail}`);
      } else {
        copyToClipboard(fullMessage(claimLink(res.claim.token)));
        toast.warning(`${res.emailError ?? "The email was not sent"} — the message and link were copied for you to send`);
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not issue a new claim link");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    copyToClipboard(link);
    toast.success("Claim link copied to clipboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,15,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background: "#101728", borderRadius: 20, width: "100%", maxWidth: 560,
        boxShadow: "0 28px 80px rgba(0,0,0,0.4)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#0B1124,#1B2B55)", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send size={17} color="rgba(255,255,255,0.8)" />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "var(--font-display)" }}>
                  Send Claim Link
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>
                  {claim.id} · Estate of {claim.deceasedName}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "rgba(255,255,255,0.45)",
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
              padding: 8, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {!sent ? (
            <>
              {/* Recipient */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                    RECIPIENT NAME
                  </label>
                  <input value={recipientName} onChange={e => setRecipientName(e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                      padding: "10px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                    EMAIL ADDRESS <span style={{ color: "#FC8181" }}>*</span>
                  </label>
                  <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                      padding: "10px 14px", fontSize: 13, color: "#E8EDF5", outline: "none" }} />
                </div>
              </div>

              {/* Custom message */}
              <div>
                <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                  MESSAGE (OPTIONAL)
                </label>
                <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={3}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
                    padding: "10px 14px", fontSize: 13, color: "#E8EDF5", outline: "none",
                    resize: "vertical", lineHeight: 1.6 }} />
              </div>

              {/* Generated link preview */}
              <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(91,110,225,0.15)", padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 6 }}>CURRENT SECURE CLAIM LINK</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, color: "#AEB9F5", ...MONO,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {link}
                  </span>
                  <button onClick={copyLink}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                      borderRadius: 8, background: "rgba(91,110,225,0.1)", color: "#AEB9F5",
                      border: "1px solid rgba(91,110,225,0.2)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#6B7A99", marginTop: 6 }}>
                  Expires {claim.linkExpires} · Tied to {claim.id} · Issuing a new link disables this one
                </div>
              </div>

              {/* Email preview */}
              <div style={{ borderRadius: 12, border: "1px solid rgba(91,110,225,0.12)", overflow: "hidden" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: "9px 14px", borderBottom: "1px solid rgba(91,110,225,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO }}>EMAIL PREVIEW</div>
                </div>
                <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 12, color: "#A3ADC9", marginBottom: 4 }}>
                    <strong style={{ color: "#E8EDF5" }}>To:</strong> {recipientName} &lt;{recipientEmail}&gt;
                  </div>
                  <div style={{ fontSize: 12, color: "#A3ADC9", marginBottom: 8 }}>
                    <strong style={{ color: "#E8EDF5" }}>Subject:</strong> Legacy Access — Estate of {claim.deceasedName}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(91,110,225,0.08)", paddingTop: 10, fontSize: 13,
                    color: "#B8C8E0", lineHeight: 1.7 }}>
                    <p style={{ marginBottom: 10 }}>{customMsg}</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px",
                      borderRadius: 9, background: "#5B6EE1", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      <Shield size={13} /> Submit Your Documents
                    </div>
                    <p style={{ marginTop: 8, fontSize: 11, color: "#8A9AB8" }}>
                      This link is unique to you and expires in 30 days.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose}
                  style={{ padding: "12px 20px", borderRadius: 12, background: "#101728", fontSize: 14,
                    color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSend} disabled={!recipientEmail || sending}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: recipientEmail ? "linear-gradient(135deg,#5B6EE1,#7E6BD8)" : "rgba(91,110,225,0.1)",
                    color: recipientEmail ? "#fff" : "#8A9AB8", border: "none",
                    boxShadow: recipientEmail ? "0 6px 18px rgba(91,110,225,0.3)" : "none",
                    cursor: recipientEmail ? "pointer" : "default", opacity: sending ? 0.7 : 1 }}>
                  {sending ? <Clock size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
                  {sending ? "Issuing..." : "Issue New Link & Copy Message"}
                </button>
              </div>
            </>
          ) : (
            /* Sent confirmation */
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
                background: "rgba(95,190,145,0.1)", border: "2px solid rgba(95,190,145,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={26} color="#5FBE91" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#E8EDF5", marginBottom: 8 }}>
                New Claim Link Ready
              </div>
              <div style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 20 }}>
                The message and new link are on your clipboard. Email sending is not connected yet, so paste it into an email to <strong style={{ color: "#E8EDF5" }}>{recipientEmail}</strong> yourself.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={copyLink}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
                    borderRadius: 10, background: "rgba(91,110,225,0.08)", color: "#AEB9F5",
                    border: "1px solid rgba(91,110,225,0.18)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Copy size={13} /> Copy Link
                </button>
                <button onClick={onClose}
                  style={{ padding: "10px 22px", borderRadius: 10, background: "rgba(91,110,225,0.06)",
                    color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.12)", fontSize: 13,
                    fontWeight: 600, cursor: "pointer" }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────── */
export function LegacyClaims() {
  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ claims: ClaimRow[] }>("/legacy/claims"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const claims = useMemo(() => (data?.claims ?? []).map(toClaim), [data]);
  // Hold ids, not claim objects, so an open window follows the refreshed data.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendLinkId, setSendLinkId] = useState<string | null>(null);
  const selected = claims.find(c => c.dbId === selectedId) ?? null;
  const sendLink = claims.find(c => c.dbId === sendLinkId) ?? null;
  const setSelected = (c: DeathClaim | null) => setSelectedId(c?.dbId ?? null);
  const setSendLink = (c: DeathClaim | null) => setSendLinkId(c?.dbId ?? null);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<"all" | ClaimStatus>("all");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return claims.filter(c =>
      (filter === "all" || c.status === filter) &&
      (!q || [c.deceasedName, c.claimantName, c.claimantEmail, c.id, c.claimantRelationship]
        .some(s => s.toLowerCase().includes(q)))
    );
  }, [claims, search, filter]);

  async function act(path: string, body: unknown, done: (res: { emailed?: boolean }) => void) {
    try {
      const res = await adminApi.post<{ emailed?: boolean }>(path, body);
      setSelected(null);
      done(res);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That action could not be completed");
    }
  }

  function handleApprove(id: string) {
    void act(`/legacy/claims/${id}/approve`, undefined,
      () => toast.success("Claim approved — the $199 fee is now ready to activate"));
  }

  function handleReject(id: string, reason: string) {
    void act(`/legacy/claims/${id}/reject`, { reason },
      () => toast.error("Claim rejected — let the claimant know"));
  }

  function handleRequestDocs(id: string) {
    void act(`/legacy/claims/${id}/request-docs`, undefined,
      (res) => toast.info(res.emailed
        ? "Additional documents requested — the claimant has been emailed their link"
        : "Additional documents requested — the claim link is open again; let the claimant know"));
  }

  const pending   = claims.filter(c => c.status === "pending_review").length;
  const awaiting  = claims.filter(c => c.status === "awaiting_docs").length;
  const approved  = claims.filter(c => c.status === "approved").length;
  const rejected  = claims.filter(c => c.status === "rejected").length;

  const FILTERS: { val: "all" | ClaimStatus; label: string }[] = [
    { val: "all",            label: "All Claims"      },
    { val: "link_sent",      label: "Link Sent"       },
    { val: "pending_review", label: "Pending Review"  },
    { val: "awaiting_docs",  label: "Awaiting Docs"   },
    { val: "approved",       label: "Approved"        },
    { val: "rejected",       label: "Rejected"        },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        {[
          { label: "Pending Review",    val: pending,  color: "#F6AD55", icon: <Clock size={15} />        },
          { label: "Awaiting Docs",     val: awaiting, color: "#4A90D9", icon: <FileText size={15} />     },
          { label: "Approved",          val: approved, color: "#48BB78", icon: <CheckCircle size={15} />  },
          { label: "Rejected",          val: rejected, color: "#FC8181", icon: <XCircle size={15} />      },
        ].map(s => (
          <div key={s.label} style={{ background: "#101728", borderRadius: 16, padding: 20,
            border: "1px solid rgba(91,110,225,0.1)", boxShadow: "0 2px 10px rgba(91,110,225,0.05)" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${s.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: s.color, marginBottom: 10 }}>
              {s.icon}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: s.color }}>{s.val}</div>
            <div style={{ color: "#A3ADC9", fontSize: 12, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 18px",
        borderRadius: 14, background: "rgba(91,110,225,0.05)", border: "1px solid rgba(91,110,225,0.15)" }}>
        <Shield size={16} color="#AEB9F5" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.6 }}>
          <strong style={{ color: "#E8EDF5" }}>How it works:</strong> When an account holder passes away,
          their legacy contacts submit a death certificate, their government ID, and any legal documents (will, power of attorney).
          Admin reviews and stores all documents here, then approves to grant account access to the claimant.
        </div>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
        padding: 16, borderRadius: 16, background: "#101728",
        border: "1px solid rgba(91,110,225,0.1)" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={13} color="#8A9AB8"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, claim ID..."
            style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#E8EDF5", fontSize: 13,
              outline: "none", borderRadius: 10, padding: "9px 36px 9px 34px", width: "100%" }} />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "#8A9AB8", padding: 2 }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              style={{ padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: filter === f.val ? "rgba(91,110,225,0.12)" : "transparent",
                color: filter === f.val ? "#AEB9F5" : "#8A9AB8",
                border: `1px solid ${filter === f.val ? "rgba(91,110,225,0.25)" : "rgba(91,110,225,0.1)"}` }}>
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "#8A9AB8", ...MONO, flexShrink: 0 }}>
          {filtered.length} claim{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
          background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)", color: "#FC8181", fontSize: 14 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Claims list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#8A9AB8", fontSize: 14 }}>Loading claims…</div>
      ) : claims.length === 0 && !error ? (
        <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16,
          background: "#101728", border: "1px dashed rgba(91,110,225,0.2)" }}>
          <Heart size={28} color="#8A9AB8" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#A3ADC9" }}>No legacy claims yet</div>
          <div style={{ fontSize: 13, color: "#8A9AB8", marginTop: 6 }}>
            A claim is opened when an account is marked deceased from the Users tab.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 16,
          background: "#101728", border: "1px dashed rgba(91,110,225,0.2)" }}>
          <Search size={28} color="#8A9AB8" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#A3ADC9" }}>No claims match your filters</div>
          <button onClick={() => { setSearch(""); setFilter("all"); }}
            style={{ marginTop: 12, fontSize: 12, color: "#AEB9F5", background: "none",
              border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Clear filters
          </button>
        </div>
      ) : filtered.map(claim => {
        const st = STATUS_MAP[claim.status];
        const isOpen = expanded === claim.dbId;
        const submittedDocs = claim.docs.filter(d => d.submitted).length;
        const isPending = claim.status === "pending_review" || claim.status === "awaiting_docs";

        return (
          <div key={claim.dbId} style={{ background: "#101728", borderRadius: 18,
            border: `1px solid ${isPending ? "rgba(91,110,225,0.15)" : "rgba(91,110,225,0.08)"}`,
            boxShadow: isPending ? "0 4px 20px rgba(91,110,225,0.08)" : "0 2px 8px rgba(91,110,225,0.04)" }}>

            {/* Card header */}
            <div style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: isPending ? "rgba(91,110,225,0.08)" : "rgba(91,110,225,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Heart size={19} color={isPending ? "#AEB9F5" : "#8A9AB8"} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5" }}>
                        Estate of {claim.deceasedName}
                      </span>
                      <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "3px 9px",
                        borderRadius: 99, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ color: "#A3ADC9", fontSize: 13, marginTop: 3 }}>
                      Claimed by <strong style={{ color: "#E8EDF5" }}>{claim.claimantName}</strong>
                      <span style={{ color: "#8A9AB8" }}> · {claim.claimantRelationship} · {claim.claimantEmail}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: "#8A9AB8", ...MONO }}>{claim.id}</div>
                  <div style={{ fontSize: 12, color: "#8A9AB8", marginTop: 2 }}>Submitted {claim.submittedDate}</div>
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginTop: 16 }}>
                {[
                  { label: "DATE OF DEATH",  val: claim.deceasedDOD },
                  { label: "PLAN",           val: claim.deceasedPlan },
                  { label: "DOCS RECEIVED",  val: `${submittedDocs} / ${claim.docs.length}`,
                    color: submittedDocs < 2 ? "#D9A55E" : undefined },
                  { label: "ID VERIFIED",    val: claim.claimantIdVerified ? "Yes ✓" : "No ✗",
                    color: claim.claimantIdVerified ? "#5FBE91" : "#FC8181" },
                  { label: "DEATH CERT",
                    val: claim.deathCertOverride ? "Override ⚠" : claim.docs.find(d => d.type === "death_certificate")?.submitted ? "Received ✓" : "Missing ✗",
                    color: claim.deathCertOverride ? "#D9A55E" : claim.docs.find(d => d.type === "death_certificate")?.submitted ? "#5FBE91" : "#FC8181" },
                ].map(f => (
                  <div key={f.label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ color: "#8A9AB8", fontSize: 10, ...MONO, marginBottom: 3 }}>{f.label}</div>
                    <div style={{ color: f.color ?? "#E8EDF5", fontSize: 13, fontWeight: 500 }}>{f.val}</div>
                  </div>
                ))}
              </div>

              {/* Override banner */}
              {claim.deathCertOverride && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(217,165,94,0.07)", border: "1px solid rgba(217,165,94,0.22)" }}>
                  <AlertTriangle size={13} color="#D9A55E" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#D9A55E" }}>
                    <strong>Death certificate override active</strong> — claimant indicated the certificate has not yet arrived.
                    Official death certificate must be submitted within 30 days of access being granted.
                  </span>
                </div>
              )}

              {/* Doc pills */}
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {claim.docs.map(doc => (
                  <div key={doc.type} style={{ display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 11px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: doc.submitted ? "rgba(95,190,145,0.08)" : "rgba(91,110,225,0.05)",
                    color: doc.submitted ? "#5FBE91" : "#8A9AB8",
                    border: `1px solid ${doc.submitted ? "rgba(95,190,145,0.2)" : "rgba(91,110,225,0.1)"}` }}>
                    {doc.submitted ? <CheckCircle size={10} /> : <Clock size={10} />}
                    {doc.label}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={() => setSelected(claim)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
                    borderRadius: 12, background: "rgba(91,110,225,0.08)", color: "#AEB9F5",
                    border: "1px solid rgba(91,110,225,0.2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Eye size={13} /> Review Full Claim
                </button>
                {claim.status !== "approved" && claim.status !== "rejected" && (
                <button onClick={() => setSendLink(claim)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
                    borderRadius: 12, background: "rgba(91,110,225,0.06)", color: "#AEB9F5",
                    border: "1px solid rgba(91,110,225,0.15)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Send size={13} /> Send Claim Link
                </button>
                )}
                {isPending && (
                  <>
                    <button onClick={() => handleApprove(claim.dbId)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
                        borderRadius: 12, background: "rgba(72,187,120,0.12)", color: "#48BB78",
                        border: "1px solid rgba(72,187,120,0.25)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      <Shield size={13} /> Approve & Grant Access
                    </button>
                    <button onClick={() => handleRequestDocs(claim.dbId)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px",
                        borderRadius: 12, background: "rgba(74,144,217,0.1)", color: "#4A90D9",
                        border: "1px solid rgba(74,144,217,0.2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      <FilePlus size={13} /> Request Docs
                    </button>
                  </>
                )}
                <button onClick={() => setExpanded(isOpen ? null : claim.dbId)}
                  style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto",
                    padding: "9px 14px", borderRadius: 12, background: "transparent", color: "#8A9AB8",
                    border: "1px solid rgba(91,110,225,0.1)", fontSize: 12, cursor: "pointer" }}>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {isOpen ? "Less" : "More"}
                </button>
              </div>
            </div>

            {/* Expanded doc list */}
            {isOpen && (
              <div style={{ borderTop: "1px solid rgba(91,110,225,0.08)", padding: "16px 22px",
                background: "rgba(255,255,255,0.03)", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
                <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 12 }}>SUBMITTED DOCUMENTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {claim.docs.map(doc => (
                    <div key={doc.type} style={{ display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 10,
                      background: doc.submitted ? "rgba(95,190,145,0.04)" : "rgba(91,110,225,0.04)",
                      border: `1px solid ${doc.submitted ? "rgba(95,190,145,0.12)" : "rgba(91,110,225,0.08)"}` }}>
                      <span style={{ color: doc.submitted ? "#5FBE91" : "#8A9AB8" }}>{DOC_ICON[doc.type]}</span>
                      <span style={{ flex: 1, fontSize: 13, color: "#E8EDF5" }}>{doc.label}</span>
                      {doc.submitted ? (
                        <>
                          <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>{doc.storedAt}</span>
                          <span style={{ fontSize: 11, color: "#5FBE91", fontWeight: 700, ...MONO }}>✓ STORED</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: "#8A9AB8", ...MONO }}>NOT SUBMITTED</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {selected && (
        <ClaimModal
          claim={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestDocs={handleRequestDocs}
          onChanged={refetch}
        />
      )}
      {sendLink && (
        <SendClaimLinkModal
          claim={sendLink}
          onClose={() => setSendLink(null)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}
