import React, { useState } from "react";
import {
  X, Heart, Shield, CheckCircle, AlertTriangle,
  Send, Mail, Phone, Clock, ChevronDown, ChevronUp, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { copyToClipboard } from "../../utils/clipboard";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* Row shape from GET /admin/legacy/contacts/:userId — see routes/legacy.ts */
interface LegacyContact {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  relationship: string;
  verification_status: "not_sent" | "pending" | "verified" | "rejected";
}

/* What POST /admin/legacy/deceased returns for each claim it opened. */
interface IssuedClaim { id: string; claim_ref: string; token: string; claimant_name: string; claimant_email: string; emailed?: boolean; }

/** The portal address a claim token opens. */
export function claimLink(token: string) {
  return `${window.location.origin}/legacy-claim/${token}`;
}

interface Props {
  user: { id: string; name: string; email: string };
  onClose: () => void;
  onConfirm: (userId: string) => void;
}

export function MarkDeceasedModal({ user, onClose, onConfirm }: Props) {
  const { data, loading, error } = useAdminFetch(
    () => adminApi.get<{ contacts: LegacyContact[] }>(`/legacy/contacts/${user.id}`),
    [user.id],
  );
  const contacts = (data?.contacts ?? []).map(c => ({
    id: c.id, name: c.full_name, email: c.email, phone: c.phone ?? "—",
    relationship: c.relationship, idVerified: c.verification_status === "verified",
  }));
  const [step,         setStep]        = useState<"confirm" | "sending" | "done">("confirm");
  const [dod,          setDod]         = useState("");
  // Contacts load after first render, so track what was UNticked — every
  // contact starts selected, as in the design.
  const [deselected,   setDeselected]  = useState<Set<number>>(new Set());
  const selected = new Set(contacts.map((_, i) => i).filter(i => !deselected.has(i)));
  const [issued,       setIssued]      = useState<IssuedClaim[]>([]);
  const [showContacts, setShowContacts] = useState(true);
  const [noteToFamily, setNoteToFamily] = useState("We are sorry for your loss. To access the Legacy Vault, please click the secure link below and submit the required documents. Our team will review your claim within 2–3 business days.");

  function toggleContact(i: number) {
    setDeselected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleSend() {
    setStep("sending");
    try {
      const res = await adminApi.post<{ claims: IssuedClaim[] }>("/legacy/deceased", {
        userId: user.id,
        dateOfDeath: dod,
        contactIds: contacts.filter((_, i) => selected.has(i)).map(c => c.id),
        message: noteToFamily,
      });
      setIssued(res.claims);
      setStep("done");
      onConfirm(user.id);
      const emailed = res.claims.filter(c => c.emailed).length;
      toast.success(emailed === res.claims.length
        ? `Account marked as deceased — claim link${emailed !== 1 ? "s" : ""} emailed to ${emailed} contact${emailed !== 1 ? "s" : ""}`
        : `Account marked as deceased — ${emailed} of ${res.claims.length} claim links emailed; copy the rest below`);
    } catch (err) {
      setStep("confirm");
      toast.error(err instanceof Error ? err.message : "Could not mark the account as deceased");
    }
  }

  /* Each link is emailed by the server. This copies the message with that
     contact's link appended, for a contact whose email didn't go out or who
     should also get it another way. */
  function copyMessage(claim: IssuedClaim) {
    copyToClipboard(`${noteToFamily}\n\n${claimLink(claim.token)}\n\nThis link is unique to you and expires in 30 days. Do not share it.`);
    toast.success(`Message and link for ${claim.claimant_name} copied`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,15,0.78)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background: "#101728", borderRadius: 20, width: "100%", maxWidth: 620,
        maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0,0,0,0.45)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#1A0A0A,#2D1010)", padding: "22px 26px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                background: "rgba(252,129,129,0.15)", border: "2px solid rgba(252,129,129,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Heart size={20} color="#FC8181" />
              </div>
              <div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>
                  Mark Account as Deceased
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>
                  {user.name} · {user.email}
                </div>
              </div>
            </div>
            <button onClick={onClose}
              style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 26, scrollbarWidth: "none" }}>

          {step === "confirm" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Warning */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                borderRadius: 12, background: "rgba(252,129,129,0.06)", border: "1px solid rgba(252,129,129,0.2)" }}>
                <AlertTriangle size={15} color="#FC8181" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.6 }}>
                  This action will <strong style={{ color: "#E8EDF5" }}>freeze the account</strong> and generate a unique secure claim link for each legacy contact, with instructions to submit their documents.
                  The account status will change to <strong style={{ color: "#FC8181" }}>Deceased</strong>. Each selected contact is emailed their secure claim link; you can also copy any link afterwards.
                </div>
              </div>

              {/* Date of death */}
              <div>
                <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                  DATE OF DEATH <span style={{ color: "#FC8181" }}>*</span>
                </label>
                <input type="date" value={dod} onChange={e => setDod(e.target.value)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(91,110,225,0.15)",
                    borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#E8EDF5", outline: "none" }} />
              </div>

              {/* Legacy contacts */}
              <div style={{ borderRadius: 14, border: "1px solid rgba(91,110,225,0.14)", overflow: "hidden" }}>
                <button onClick={() => setShowContacts(!showContacts)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Send size={13} color="#AEB9F5" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>
                      Claim Links Will Be Sent To
                    </span>
                    <span style={{ fontSize: 10, ...MONO, fontWeight: 700, padding: "2px 8px",
                      borderRadius: 99, background: "rgba(91,110,225,0.12)", color: "#AEB9F5" }}>
                      {selected.size} of {contacts.length}
                    </span>
                  </div>
                  {showContacts ? <ChevronUp size={14} color="#8A9AB8" /> : <ChevronDown size={14} color="#8A9AB8" />}
                </button>

                {showContacts && (
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {loading && <div style={{ fontSize: 12, color: "#8A9AB8", textAlign: "center", padding: "8px 0" }}>Loading legacy contacts…</div>}
                    {error && <div style={{ fontSize: 12, color: "#FC8181", textAlign: "center", padding: "8px 0" }}>{error}</div>}
                    {!loading && !error && contacts.length === 0 && (
                      <div style={{ fontSize: 12, color: "#D9A55E", textAlign: "center", padding: "8px 0" }}>
                        This account has no legacy contacts, so there is nobody to send a claim link to.
                      </div>
                    )}
                    {contacts.map((c, i) => (
                      <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                        padding: "12px 14px", borderRadius: 10,
                        background: selected.has(i) ? "rgba(91,110,225,0.04)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selected.has(i) ? "rgba(91,110,225,0.18)" : "rgba(91,110,225,0.08)"}`,
                        transition: "all 0.15s" }}>
                        <div onClick={() => toggleContact(i)}
                          style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                            border: `2px solid ${selected.has(i) ? "#AEB9F5" : "rgba(91,110,225,0.3)"}`,
                            background: selected.has(i) ? "#5B6EE1" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s", cursor: "pointer" }}>
                          {selected.has(i) && <CheckCircle size={11} color="#fff" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{c.name}</span>
                            <span style={{ fontSize: 10, ...MONO, fontWeight: 700, padding: "2px 7px",
                              borderRadius: 99, background: "rgba(91,110,225,0.08)", color: "#A3ADC9" }}>
                              {c.relationship}
                            </span>
                            {c.idVerified
                              ? <span style={{ fontSize: 10, ...MONO, color: "#5FBE91", fontWeight: 700 }}>ID Verified ✓</span>
                              : <span style={{ fontSize: 10, ...MONO, color: "#D9A55E", fontWeight: 700 }}>ID Pending</span>
                            }
                          </div>
                          <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A3ADC9" }}>
                              <Mail size={11} />{c.email}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A3ADC9" }}>
                              <Phone size={11} />{c.phone}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}

                    {contacts.length > 0 && selected.size === 0 && (
                      <div style={{ fontSize: 12, color: "#FC8181", textAlign: "center", padding: "8px 0" }}>
                        Select at least one contact to send the link to
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom message */}
              <div>
                <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>
                  MESSAGE TO INCLUDE IN EMAIL (OPTIONAL)
                </label>
                <textarea value={noteToFamily} onChange={e => setNoteToFamily(e.target.value)} rows={4}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(91,110,225,0.15)",
                    borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#E8EDF5",
                    outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ fontSize: 11, color: "#6B7A99", marginTop: 4 }}>
                  A secure claim link will be appended automatically to the bottom of this message.
                </div>
              </div>

              {/* Email preview */}
              <div style={{ borderRadius: 14, border: "1px solid rgba(91,110,225,0.15)", overflow: "hidden" }}>
                <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderBottom: "1px solid rgba(91,110,225,0.1)" }}>
                  <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO }}>EMAIL PREVIEW</div>
                </div>
                <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontSize: 12, color: "#A3ADC9", marginBottom: 4 }}>
                    <strong style={{ color: "#E8EDF5" }}>Subject:</strong> Legacy Access — {user.name}'s Final Pass Down Account
                  </div>
                  <div style={{ fontSize: 12, color: "#A3ADC9", marginBottom: 8 }}>
                    <strong style={{ color: "#E8EDF5" }}>From:</strong> no-reply@finalpassdown.com
                  </div>
                  <div style={{ borderTop: "1px solid rgba(91,110,225,0.1)", paddingTop: 12, fontSize: 13,
                    color: "#B8C8E0", lineHeight: 1.7 }}>
                    <p style={{ marginBottom: 12 }}>{noteToFamily}</p>
                    <div style={{ display: "inline-block", padding: "10px 20px", borderRadius: 10,
                      background: "#5B6EE1", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      Submit Your Documents →
                    </div>
                    <p style={{ marginTop: 10, fontSize: 11, color: "#8A9AB8" }}>
                      This link is unique to you and expires in 30 days. Do not share it.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "sending" && (
            <div style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
                background: "rgba(91,110,225,0.08)", border: "2px solid rgba(91,110,225,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={28} color="#AEB9F5" style={{ animation: "spin 1.2s linear infinite" }} />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "#E8EDF5", marginBottom: 8 }}>
                Processing...
              </div>
              <div style={{ fontSize: 13, color: "#8A9AB8" }}>
                Freezing account · Generating secure claim links
              </div>
              <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
            </div>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
                background: "rgba(95,190,145,0.1)", border: "2px solid rgba(95,190,145,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={30} color="#5FBE91" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 10 }}>
                Done
              </div>
              <div style={{ fontSize: 14, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 24 }}>
                <strong style={{ color: "#E8EDF5" }}>{user.name}'s account</strong> is now marked as deceased.
                Secure claim links were created for <strong style={{ color: "#E8EDF5" }}>{issued.length}</strong> legacy contact{issued.length !== 1 ? "s" : ""}{issued.every(c => c.emailed) ? " and emailed to each of them." : ". Contacts marked NOT EMAILED need their link copied and sent by hand."}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left",
                background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                {issued.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <CheckCircle size={13} color="#5FBE91" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#E8EDF5" }}>{c.claimant_name}</span>
                    <span style={{ fontSize: 12, color: "#8A9AB8" }}>{c.claimant_email}</span>
                    <span style={{ fontSize: 9, ...MONO, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                      background: c.emailed ? "rgba(95,190,145,0.12)" : "rgba(217,165,94,0.12)", color: c.emailed ? "#5FBE91" : "#D9A55E" }}>
                      {c.emailed ? "EMAILED" : "NOT EMAILED"}
                    </span>
                    <button onClick={() => copyMessage(c)}
                      style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", padding: "5px 10px", borderRadius: 8,
                        background: "rgba(91,110,225,0.12)", border: "1px solid rgba(91,110,225,0.25)", cursor: "pointer",
                        fontSize: 10, ...MONO, fontWeight: 700, color: "#AEB9F5" }}>
                      <Copy size={11} /> COPY MESSAGE + LINK
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#8A9AB8", lineHeight: 1.6 }}>
                Claims will appear in <strong>Master Admin → Legacy Claims</strong> once contacts submit their documents. The links stay available there under Send Claim Link.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(91,110,225,0.1)", padding: "16px 26px", flexShrink: 0 }}>
          {step === "confirm" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose}
                style={{ padding: "12px 22px", borderRadius: 12, background: "#101728",
                  color: "#8A9AB8", border: "1px solid rgba(91,110,225,0.15)", fontSize: 14,
                  fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSend}
                disabled={!dod || selected.size === 0}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: (dod && selected.size > 0) ? "linear-gradient(135deg,#FC8181,#EF4444)" : "rgba(91,110,225,0.08)",
                  color: (dod && selected.size > 0) ? "#fff" : "#8A9AB8", border: "none",
                  boxShadow: (dod && selected.size > 0) ? "0 6px 20px rgba(252,129,129,0.3)" : "none",
                  cursor: (dod && selected.size > 0) ? "pointer" : "default" }}>
                <Shield size={15} />
                Mark as Deceased &amp; Send Claim Links ({selected.size})
              </button>
            </div>
          )}
          {step === "done" && (
            <button onClick={onClose}
              style={{ width: "100%", padding: "13px 24px", borderRadius: 12, background: "rgba(91,110,225,0.08)",
                color: "#AEB9F5", border: "1px solid rgba(91,110,225,0.2)", fontSize: 14,
                fontWeight: 600, cursor: "pointer" }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
