import React, { useState } from "react";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";

interface Props {
  user: { id: string; name: string; email: string };
  onClose: () => void;
  onDeleted: (userId: string) => void;
}

/* DELETE /admin/users/:id — see routes/users.ts. The server re-checks the
   typed email, so this is not the only guard. */
export function DeleteUserModal({ user, onClose, onDeleted }: Props) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await adminApi.del<{ cancelledSubscriptions: number }>(
        `/users/${user.id}?confirmEmail=${encodeURIComponent(typed.trim())}`,
      );
      toast.success(res.cancelledSubscriptions
        ? `${user.email} deleted — ${res.cancelledSubscriptions} subscription${res.cancelledSubscriptions !== 1 ? "s" : ""} cancelled in Stripe`
        : `${user.email} deleted`);
      onDeleted(user.id);
      onClose();
    } catch (err) {
      setDeleting(false);
      toast.error(err instanceof Error ? err.message : "Could not delete the account");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,15,0.78)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget && !deleting) onClose(); }}>
      <div style={{ background: "#101728", borderRadius: 20, width: "100%", maxWidth: 480,
        boxShadow: "0 28px 80px rgba(0,0,0,0.45)", overflow: "hidden" }}>

        <div style={{ background: "linear-gradient(135deg,#1A0A0A,#2D1010)", padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Trash2 size={18} color="#FC8181" />
            <div>
              <div style={{ color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: "var(--font-display)" }}>Delete Account</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>{user.name} · {user.email}</div>
            </div>
          </div>
          <button onClick={onClose} disabled={deleting}
            style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 12,
            background: "rgba(252,129,129,0.06)", border: "1px solid rgba(252,129,129,0.2)" }}>
            <AlertTriangle size={15} color="#FC8181" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.6 }}>
              This <strong style={{ color: "#E8EDF5" }}>permanently deletes</strong> the login, the profile, every record,
              contact and uploaded file. Any paid subscription is cancelled in Stripe with no refund (use the Billing tab first
              if one is owed). This cannot be undone.
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "#8A9AB8", fontFamily: "var(--font-mono)", display: "block", marginBottom: 6 }}>
              TYPE <span style={{ color: "#E8EDF5" }}>{user.email}</span> TO CONFIRM
            </label>
            <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus disabled={deleting}
              onKeyDown={e => { if (e.key === "Enter" && matches && !deleting) handleDelete(); }}
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(91,110,225,0.15)",
                borderRadius: 10, padding: "11px 14px", fontSize: 14, color: "#E8EDF5", outline: "none" }} />
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(91,110,225,0.1)", padding: "16px 24px", display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={deleting}
            style={{ padding: "12px 22px", borderRadius: 12, background: "#101728", color: "#8A9AB8",
              border: "1px solid rgba(91,110,225,0.15)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={!matches || deleting}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "none",
              background: matches ? "linear-gradient(135deg,#FC8181,#EF4444)" : "rgba(91,110,225,0.08)",
              color: matches ? "#fff" : "#8A9AB8", cursor: matches && !deleting ? "pointer" : "default" }}>
            <Trash2 size={15} /> {deleting ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
