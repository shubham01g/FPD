import React, { useMemo, useState } from "react";
import { Shield, CheckCircle, XCircle, Clock, Eye, ZoomIn, User, Loader2, AlertCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";

interface VerificationContact {
  id: string;
  full_name: string;
  email: string;
  relationship: string;
  contact_type: string;
  owner: { full_name: string; email: string } | null;
}

interface VerificationRecord {
  id: string;
  contact_id: string;
  document_url: string;
  document_back_url: string | null;
  id_type: string;
  id_number_masked: string | null;
  date_of_birth: string | null;
  expiry_date: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  contacts: VerificationContact | null;
}

type RecordTab = "identity" | "documents" | "account" | "risk" | "timeline";
const RECORD_TABS: { id: RecordTab; label: string }[] = [
  { id: "identity",  label: "Identity"  },
  { id: "documents", label: "Documents" },
  { id: "account",   label: "Account"   },
  { id: "risk",      label: "Risk"      },
  { id: "timeline",  label: "Timeline"  },
];

const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const REJECTION_REASONS = ["ID image is blurry/unreadable", "ID is expired", "Name does not match records", "Suspected fraudulent document", "Other"];

export function IDVerification() {
  const [selectedVerif, setSelectedVerif] = useState<VerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Separate from `selectedVerif` (which drives the reject-reason modal) —
  // this drives the record/image detail view opened by "View ID Front/Back"
  // and "View Full Record".
  const [viewingVerif, setViewingVerif] = useState<VerificationRecord | null>(null);
  const [viewingUrls, setViewingUrls] = useState<{ front: string | null; back: string | null } | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);
  const [recordTab, setRecordTab] = useState<RecordTab>("identity");
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "approved" | "rejected">("all");

  async function openDetail(verif: VerificationRecord) {
    setViewingVerif(verif);
    setRecordTab("identity");
    setViewingUrls(null);
    setViewingLoading(true);
    try {
      const urls = await adminApi.get<{ front: string | null; back: string | null }>(`/verification/${verif.id}/documents`);
      setViewingUrls(urls);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load ID images");
    } finally {
      setViewingLoading(false);
    }
  }

  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ verifications: VerificationRecord[] }>("/verification?status=all"),
    [],
    ADMIN_LIVE_POLL_MS,
  );

  const all = data?.verifications ?? [];
  const matches = (v: VerificationRecord) => {
    const q = search.trim().toLowerCase();
    return !q || [v.contacts?.full_name, v.contacts?.email, v.contacts?.owner?.full_name, v.contacts?.owner?.email, v.id, v.id_type]
      .some((x) => (x ?? "").toLowerCase().includes(q));
  };
  const allPending = useMemo(() => all.filter((v) => v.status === "pending"), [all]);
  const pendingVerifications = allPending.filter(matches);
  const recentlyProcessed = all
    .filter((v) => v.status !== "pending" && (historyFilter === "all" || v.status === historyFilter))
    .filter(matches)
    .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""))
    .slice(0, 50);

  const stats = useMemo(() => {
    const approvedToday = all.filter((v) => v.status === "approved").length;
    const rejectedToday = all.filter((v) => v.status === "rejected").length;
    const durations = all
      .filter((v) => v.reviewed_at)
      .map((v) => (new Date(v.reviewed_at!).getTime() - new Date(v.submitted_at).getTime()) / 36e5);
    const avgHours = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return {
      pending: allPending.length,
      approvedToday,
      rejectedToday,
      avgReviewTime: avgHours === null ? "—" : `${avgHours.toFixed(1)}h`,
    };
  }, [all, allPending.length]);

  async function handleApprove(id: string) {
    setSubmitting(true);
    try {
      await adminApi.post(`/verification/${id}/approve`);
      toast.success("Verification approved");
      setSelectedVerif(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve verification");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(id: string) {
    setSubmitting(true);
    try {
      await adminApi.post(`/verification/${id}/reject`, { reason: rejectionReason || undefined });
      toast.success("Verification rejected");
      setSelectedVerif(null);
      setRejectionReason("");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject verification");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} color="var(--gold)" />
            <span style={{ color: "var(--gold)", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · COMPLIANCE</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Legacy Contact ID Verification</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>Review government-issued IDs submitted by legacy contacts. Identities must be confirmed before access is granted.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "rgba(246,173,85,0.1)", border: "1px solid rgba(246,173,85,0.3)" }}>
          <Clock size={14} color="#F6AD55" />
          <span style={{ color: "#F6AD55", fontSize: 16 }}>{stats.pending} Pending Review</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-foreground)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading verification queue…
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending Review", value: stats.pending, color: "#F6AD55", icon: <Clock size={16} /> },
              { label: "Approved", value: stats.approvedToday, color: "#D99A6B", icon: <CheckCircle size={16} /> },
              { label: "Rejected", value: stats.rejectedToday, color: "#FC8181", icon: <XCircle size={16} /> },
              { label: "Avg Review Time", value: stats.avgReviewTime, color: "#FFFFFF", icon: <Shield size={16} /> },
            ].map((stat) => (
              <div key={stat.label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="rounded-xl p-2 mb-3" style={{ background: `${stat.color}15`, color: stat.color, width: "fit-content" }}>
                  {stat.icon}
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: stat.color }}>{stat.value}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 15, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <Search size={15} color="var(--muted-foreground)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by contact, account holder, email, or ID type..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16 }} />
            {search && <button onClick={() => setSearch("")} style={{ color: "var(--muted-foreground)" }}><X size={14} /></button>}
            <span style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{pendingVerifications.length} pending</span>
          </div>

          {/* Pending verifications */}
          <div className="space-y-4">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)" }}>Pending Verifications</h3>
            {pendingVerifications.length === 0 && (
              <div className="p-6 rounded-2xl border text-center" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                {allPending.length === 0 ? "Nothing waiting on review." : "No pending verification matches your search."}
              </div>
            )}
            {pendingVerifications.map((verif) => (
              <div key={verif.id} className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full flex items-center justify-center" style={{ width: 44, height: 44, background: "var(--secondary)", flexShrink: 0 }}>
                      <User size={20} color="var(--gold)" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span style={{ color: "var(--foreground)", fontSize: 20, fontWeight: 500 }}>{verif.contacts?.full_name ?? "Unknown contact"}</span>
                        <span className="px-2 py-0.5 rounded" style={{ background: "rgba(246,173,85,0.12)", color: "#F6AD55", fontSize: 14, fontFamily: "var(--font-mono)" }}>PENDING</span>
                      </div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 16 }}>
                        {verif.contacts?.relationship ?? "Contact"} of{" "}
                        <strong style={{ color: "var(--foreground)" }}>
                          {verif.contacts?.owner ? `${verif.contacts.owner.full_name} (${verif.contacts.owner.email})` : "—"}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 15, textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)" }}>{verif.id}</div>
                    <div>Submitted {new Date(verif.submitted_at).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 mt-5">
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID TYPE</div>
                    <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.id_type}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>DATE OF BIRTH</div>
                    <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.date_of_birth ?? "—"}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID EXPIRY</div>
                    <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.expiry_date ?? "—"}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID NUMBER (MASKED)</div>
                    <div style={{ color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)" }}>{verif.id_number_masked ?? "—"}</div>
                  </div>
                </div>

                {/* ID preview areas */}
                <div className="flex gap-4 mt-4">
                  <div
                    className="flex-1 flex items-center justify-center rounded-2xl border h-28 cursor-pointer transition-all"
                    style={{ borderColor: "rgba(91,110,225,0.3)", background: "rgba(91,110,225,0.04)", borderStyle: "dashed" }}
                    onClick={() => openDetail(verif)}
                  >
                    <div className="text-center">
                      <ZoomIn size={18} color="var(--gold)" style={{ margin: "0 auto 6px" }} />
                      <div style={{ color: "var(--gold)", fontSize: 15 }}>View ID Front</div>
                    </div>
                  </div>
                  {verif.document_back_url && (
                    <div
                      className="flex-1 flex items-center justify-center rounded-2xl border h-28 cursor-pointer"
                      style={{ borderColor: "rgba(91,110,225,0.3)", background: "rgba(91,110,225,0.04)", borderStyle: "dashed" }}
                      onClick={() => openDetail(verif)}
                    >
                      <div className="text-center">
                        <ZoomIn size={18} color="var(--gold)" style={{ margin: "0 auto 6px" }} />
                        <div style={{ color: "var(--gold)", fontSize: 15 }}>View ID Back</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(verif.id)}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl disabled:opacity-50"
                    style={{ background: "rgba(72,187,120,0.15)", color: "#D99A6B", border: "1px solid rgba(72,187,120,0.3)", fontWeight: 600, fontSize: 17.5 }}
                  >
                    <CheckCircle size={15} /> Approve Verification
                  </button>
                  <button
                    onClick={() => setSelectedVerif(verif)}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl disabled:opacity-50"
                    style={{ background: "rgba(252,129,129,0.12)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.25)", fontWeight: 600, fontSize: 17.5 }}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                  <button
                    onClick={() => openDetail(verif)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)", fontSize: 17.5 }}
                  >
                    <Eye size={15} /> View Full Record
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recently processed */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--foreground)" }}>Recently Processed</h3>
              <div className="flex gap-2">
                {([["all", "All"], ["approved", "Approved"], ["rejected", "Rejected"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setHistoryFilter(val)} className="px-3 py-1 rounded-xl"
                    style={{ fontSize: 14, fontWeight: 600, background: historyFilter === val ? "rgba(91,110,225,0.18)" : "transparent",
                      color: historyFilter === val ? "#AEB9F5" : "var(--muted-foreground)", border: "1px solid rgba(91,110,225,0.2)" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {recentlyProcessed.length === 0 && (
              <div className="px-5 py-6 text-center" style={{ color: "var(--muted-foreground)" }}>Nothing processed yet.</div>
            )}
            {recentlyProcessed.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-5 py-3 border-b cursor-pointer"
                style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)" }}
                onClick={() => openDetail(r)}
              >
                <div>
                  <div style={{ color: "var(--foreground)", fontSize: 16 }}>{r.contacts?.full_name ?? "Unknown"}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{r.id}</div>
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}</div>
                <div className="flex items-center gap-2">
                  {r.status === "approved"
                    ? <><CheckCircle size={14} color="#FFFFFF" /><span style={{ color: "#D99A6B", fontSize: 16 }}>Approved</span></>
                    : <><XCircle size={14} color="#FC8181" /><span style={{ color: "#FC8181", fontSize: 16 }}>Rejected{r.rejection_reason ? ` — ${r.rejection_reason}` : ""}</span></>
                  }
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Record detail / ID image viewer */}
      {viewingVerif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-2xl rounded-2xl border p-7 max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)" }}>
                  {viewingVerif.contacts?.full_name ?? "Unknown contact"}
                </h3>
                <div style={{ color: "var(--muted-foreground)", fontSize: 15, fontFamily: "var(--font-mono)" }}>{viewingVerif.id}</div>
              </div>
              <button onClick={() => setViewingVerif(null)} style={{ color: "var(--muted-foreground)" }}>✕</button>
            </div>

            <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
              {RECORD_TABS.map((t) => (
                <button key={t.id} onClick={() => setRecordTab(t.id)} className="px-4 py-2.5"
                  style={{ fontSize: 15, fontWeight: 600, color: recordTab === t.id ? "#AEB9F5" : "var(--muted-foreground)",
                    borderBottom: recordTab === t.id ? "2px solid #AEB9F5" : "2px solid transparent" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {(() => {
              const v = viewingVerif;
              const expired = v.expiry_date ? new Date(v.expiry_date) < new Date() : null;
              const priorRejections = all.filter((o) => o.contact_id === v.contact_id && o.id !== v.id && o.status === "rejected").length;
              const grid = (rows: [string, string][]) => (
                <div className="grid md:grid-cols-2 gap-3">
                  {rows.map(([label, value]) => (
                    <div key={label} className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>{label}</div>
                      <div style={{ color: "var(--foreground)", fontSize: 16 }}>{value}</div>
                    </div>
                  ))}
                </div>
              );

              if (recordTab === "identity") return grid([
                ["LEGAL FULL NAME", v.contacts?.full_name ?? "—"],
                ["EMAIL ADDRESS", v.contacts?.email ?? "—"],
                ["DATE OF BIRTH", v.date_of_birth ?? "—"],
                ["DOCUMENT TYPE", v.id_type],
                ["ID NUMBER (MASKED)", v.id_number_masked ?? "—"],
                ["EXPIRY DATE", v.expiry_date ?? "—"],
                ["SUBMITTED", fmtWhen(v.submitted_at)],
                ["VERIFICATION ID", v.id],
              ]);

              if (recordTab === "documents") return (
                <div className="grid gap-3" style={{ gridTemplateColumns: v.document_back_url ? "1fr 1fr" : "1fr" }}>
                  {[["Front", viewingUrls?.front], ...(v.document_back_url ? [["Back", viewingUrls?.back]] : [])].map(([label, url]) => (
                    <div key={label} className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="px-3 py-2" style={{ background: "var(--muted)", color: "var(--muted-foreground)", fontSize: 14 }}>{label}</div>
                      <div className="flex items-center justify-center" style={{ minHeight: 220, background: "rgba(0,0,0,0.2)" }}>
                        {viewingLoading ? (
                          <Loader2 size={22} className="animate-spin" color="var(--muted-foreground)" />
                        ) : url ? (
                          <img src={url as string} alt={`ID ${label}`} style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain" }} />
                        ) : (
                          <span style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Preview unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );

              if (recordTab === "account") return grid([
                ["ACCOUNT HOLDER", v.contacts?.owner?.full_name ?? "—"],
                ["ACCOUNT EMAIL", v.contacts?.owner?.email ?? "—"],
                ["RELATIONSHIP TO CONTACT", v.contacts?.relationship ?? "—"],
                ["CONTACT TYPE", v.contacts?.contact_type ?? "—"],
              ]);

              if (recordTab === "risk") return (
                <div className="space-y-2">
                  {([
                    ["Document not expired", expired === null ? null : !expired],
                    ["No prior rejected submissions for this contact", priorRejections === 0],
                    ["Back of ID provided", Boolean(v.document_back_url)],
                  ] as [string, boolean | null][]).map(([label, ok]) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                      {ok === null ? <Clock size={15} color="#8A9AB8" /> : ok ? <CheckCircle size={15} color="#6FAE8B" /> : <XCircle size={15} color="#FC8181" />}
                      <span style={{ color: "var(--foreground)", fontSize: 16 }}>{label}</span>
                      {ok === null && <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>no expiry date on file</span>}
                    </div>
                  ))}
                  <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.6, paddingTop: 6 }}>
                    Only checks that can be made from stored data are shown. No risk score, device, IP or image-tampering analysis is collected.
                  </p>
                </div>
              );

              return (
                <div className="space-y-3">
                  {([
                    [fmtWhen(v.submitted_at), "ID submitted for verification", v.contacts?.full_name ?? "Contact"],
                    ...(v.reviewed_at ? [[fmtWhen(v.reviewed_at), v.status === "approved" ? "Verification approved" : `Verification rejected${v.rejection_reason ? ` — ${v.rejection_reason}` : ""}`, "Admin"]] : []),
                  ] as [string, string, string][]).map(([when, event, actor]) => (
                    <div key={when + event} className="flex gap-3">
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#AEB9F5", marginTop: 7, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: "var(--foreground)", fontSize: 16 }}>{event}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{when} · {actor}</div>
                      </div>
                    </div>
                  ))}
                  {v.status === "pending" && (
                    <div className="flex gap-3">
                      <Clock size={13} color="#F6AD55" style={{ marginTop: 5 }} />
                      <div style={{ color: "#F6AD55", fontSize: 16 }}>Awaiting admin decision</div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center gap-3 mt-5">
              {viewingVerif.status === "pending" && (<>
              <button
                onClick={() => handleApprove(viewingVerif.id)}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl disabled:opacity-50"
                style={{ background: "rgba(72,187,120,0.15)", color: "#D99A6B", border: "1px solid rgba(72,187,120,0.3)", fontWeight: 600, fontSize: 17.5 }}
              >
                <CheckCircle size={15} /> Approve
              </button>
              <button
                onClick={() => { setSelectedVerif(viewingVerif); setViewingVerif(null); }}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl disabled:opacity-50"
                style={{ background: "rgba(252,129,129,0.12)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.25)", fontWeight: 600, fontSize: 17.5 }}
              >
                <XCircle size={15} /> Reject
              </button>
              </>)}
              <button
                onClick={() => setViewingVerif(null)}
                className="px-5 py-2.5 rounded-2xl"
                style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 17.5 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection modal */}
      {selectedVerif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl border p-7" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)", marginBottom: 16 }}>Reject Verification</h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginBottom: 16 }}>
              You are rejecting the ID verification for <strong style={{ color: "var(--foreground)" }}>{selectedVerif.contacts?.full_name ?? "this contact"}</strong>. Please provide a reason.
            </p>
            <div className="space-y-2 mb-4">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className="w-full text-left px-4 py-3 rounded-xl border transition-all"
                  style={{
                    background: rejectionReason === reason ? "rgba(252,129,129,0.1)" : "rgba(255,255,255,0.08)",
                    borderColor: rejectionReason === reason ? "rgba(252,129,129,0.4)" : "var(--border)",
                    color: rejectionReason === reason ? "#FC8181" : "var(--foreground)",
                    fontSize: 16,
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleReject(selectedVerif.id)}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl font-semibold disabled:opacity-50"
                style={{ background: "rgba(252,129,129,0.15)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.3)", fontSize: 17.5 }}
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => { setSelectedVerif(null); setRejectionReason(""); }}
                disabled={submitting}
                className="px-5 py-3 rounded-2xl disabled:opacity-50"
                style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 17.5 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
