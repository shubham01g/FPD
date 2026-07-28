import React, { useState } from "react";
import { Shield, CheckCircle, XCircle, Clock, Eye, ZoomIn, AlertTriangle, User, Calendar, FileText } from "lucide-react";

const pendingVerifications = [
  {
    id: "VER-2026-0841", contactName: "Linda Torres", userAccount: "James Doe (james.doe@email.com)",
    relationship: "Estate Attorney", idType: "State ID", submittedDate: "Jun 11, 2026",
    status: "pending", idFront: "ID Front Preview", idBack: "ID Back Preview",
    expiryDate: "2029-04-15", dob: "1978-03-22", idNumber: "CA-DL-X84921***",
  },
  {
    id: "VER-2026-0838", contactName: "Thomas Rivera", userAccount: "Maria Lopez (m.lopez@email.com)",
    relationship: "Son", idType: "Passport", submittedDate: "Jun 10, 2026",
    status: "pending", idFront: "Passport Preview", idBack: null,
    expiryDate: "2031-07-20", dob: "1992-11-08", idNumber: "US-PP-498201***",
  },
  {
    id: "VER-2026-0835", contactName: "Grace Nakamura", userAccount: "Kevin Park (k.park@email.com)",
    relationship: "Spouse", idType: "Driver's License", submittedDate: "Jun 9, 2026",
    status: "pending", idFront: "DL Front Preview", idBack: "DL Back Preview",
    expiryDate: "2028-01-30", dob: "1983-06-14", idNumber: "NY-DL-J93842***",
  },
];

const recentlyProcessed = [
  { id: "VER-2026-0829", name: "Sarah Johnson", status: "approved", processedDate: "Jun 8, 2026" },
  { id: "VER-2026-0822", name: "Michael Doe", status: "approved", processedDate: "Jun 5, 2026" },
  { id: "VER-2026-0818", name: "Alan Graves", status: "rejected", processedDate: "Jun 3, 2026", reason: "ID expired" },
];

export function IDVerification() {
  const [selectedVerif, setSelectedVerif] = useState<(typeof pendingVerifications)[0] | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (id: string) => {
    setSelectedVerif(null);
    // In production: API call to approve
  };

  const handleReject = (id: string) => {
    setSelectedVerif(null);
    setRejectionReason("");
  };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
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
          <span style={{ color: "#F6AD55", fontSize: 16 }}>{pendingVerifications.length} Pending Review</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: 3, color: "#F6AD55", icon: <Clock size={16} /> },
          { label: "Approved Today", value: 7, color: "#D99A6B", icon: <CheckCircle size={16} /> },
          { label: "Rejected Today", value: 1, color: "#FC8181", icon: <XCircle size={16} /> },
          { label: "Avg Review Time", value: "4.2h", color: "#FFFFFF", icon: <Shield size={16} /> },
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

      {/* Pending verifications */}
      <div className="space-y-4">
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)" }}>Pending Verifications</h3>
        {pendingVerifications.map((verif) => (
          <div key={verif.id} className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full flex items-center justify-center" style={{ width: 44, height: 44, background: "var(--secondary)", flexShrink: 0 }}>
                  <User size={20} color="var(--gold)" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span style={{ color: "var(--foreground)", fontSize: 20, fontWeight: 500 }}>{verif.contactName}</span>
                    <span className="px-2 py-0.5 rounded" style={{ background: "rgba(246,173,85,0.12)", color: "#F6AD55", fontSize: 14, fontFamily: "var(--font-mono)" }}>PENDING</span>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 16 }}>{verif.relationship} of <strong style={{ color: "var(--foreground)" }}>{verif.userAccount}</strong></div>
                </div>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 15, textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "var(--font-mono)" }}>{verif.id}</div>
                <div>Submitted {verif.submittedDate}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-5">
              <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID TYPE</div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.idType}</div>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>DATE OF BIRTH</div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.dob}</div>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID EXPIRY</div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{verif.expiryDate}</div>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 3 }}>ID NUMBER (MASKED)</div>
                <div style={{ color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)" }}>{verif.idNumber}</div>
              </div>
            </div>

            {/* ID preview areas */}
            <div className="flex gap-4 mt-4">
              <div
                className="flex-1 flex items-center justify-center rounded-2xl border h-28 cursor-pointer transition-all"
                style={{ borderColor: "rgba(91,110,225,0.3)", background: "rgba(91,110,225,0.04)", borderStyle: "dashed" }}
                onClick={() => setSelectedVerif(verif)}
              >
                <div className="text-center">
                  <ZoomIn size={18} color="var(--gold)" style={{ margin: "0 auto 6px" }} />
                  <div style={{ color: "var(--gold)", fontSize: 15 }}>View ID Front</div>
                </div>
              </div>
              {verif.idBack && (
                <div
                  className="flex-1 flex items-center justify-center rounded-2xl border h-28 cursor-pointer"
                  style={{ borderColor: "rgba(91,110,225,0.3)", background: "rgba(91,110,225,0.04)", borderStyle: "dashed" }}
                  onClick={() => setSelectedVerif(verif)}
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
                style={{ background: "rgba(72,187,120,0.15)", color: "#D99A6B", border: "1px solid rgba(72,187,120,0.3)", fontWeight: 600, fontSize: 17.5 }}
              >
                <CheckCircle size={15} /> Approve Verification
              </button>
              <button
                onClick={() => setSelectedVerif(verif)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl"
                style={{ background: "rgba(252,129,129,0.12)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.25)", fontWeight: 600, fontSize: 17.5 }}
              >
                <XCircle size={15} /> Reject
              </button>
              <button
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
        <div className="px-5 py-3 border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--foreground)" }}>Recently Processed</h3>
        </div>
        {recentlyProcessed.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)" }}
          >
            <div>
              <div style={{ color: "var(--foreground)", fontSize: 16 }}>{r.name}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{r.id}</div>
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>{r.processedDate}</div>
            <div className="flex items-center gap-2">
              {r.status === "approved"
                ? <><CheckCircle size={14} color="#FFFFFF" /><span style={{ color: "#D99A6B", fontSize: 16 }}>Approved</span></>
                : <><XCircle size={14} color="#FC8181" /><span style={{ color: "#FC8181", fontSize: 16 }}>Rejected{r.reason ? ` — ${r.reason}` : ""}</span></>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Rejection modal */}
      {selectedVerif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-2xl border p-7" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)", marginBottom: 16 }}>Reject Verification</h3>
            <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginBottom: 16 }}>
              You are rejecting the ID verification for <strong style={{ color: "var(--foreground)" }}>{selectedVerif.contactName}</strong>. Please provide a reason.
            </p>
            <div className="space-y-2 mb-4">
              {["ID image is blurry/unreadable", "ID is expired", "Name does not match records", "Suspected fraudulent document", "Other"].map((reason) => (
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
                className="flex-1 py-3 rounded-2xl font-semibold"
                style={{ background: "rgba(252,129,129,0.15)", color: "#FC8181", border: "1px solid rgba(252,129,129,0.3)", fontSize: 17.5 }}
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setSelectedVerif(null)}
                className="px-5 py-3 rounded-2xl"
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
