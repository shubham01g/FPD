import React, { useState } from "react";
import { Crown, Eye, EyeOff, Lock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import fpdFullLogo from "../../../imports/FPD_full_logo.png";
import { publicApi } from "../../services/publicApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { ROLE_PRESETS, type AdminRole } from "./AdminRoles";

/* The page an invited admin opens from their invite link (/admin/accept?id=…&token=…).
   No login: the one-time token identifies the invite (routes/public.ts).
   Accepting creates their sign-in — or, for someone who already has an
   account, adds admin access to it — and activates the admin account. */

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const MIN_PASSWORD = 12;

interface Invite { name: string; email: string; role: string; hasAccount: boolean }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#070A12", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <img src={fpdFullLogo} alt="Final Pass Down" style={{ height: 54, objectFit: "contain", borderRadius: 8 }}/>
        </div>
        <div style={{ background: "#101728", borderRadius: 20, padding: "30px 28px", border: "1px solid rgba(91,110,225,0.18)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminInviteAccept({ id, token, onSignIn }: { id: string; token: string; onSignIn: () => void }) {
  const { data, loading, error } = useAdminFetch(
    () => publicApi.get<{ invite: Invite }>(`/admin-invite/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`),
    [id, token],
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [accepted, setAccepted] = useState(false);

  if (loading) {
    return <Shell><div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", color: "#A3ADC9", fontSize: 15 }}>
      <Loader2 size={18} className="animate-spin"/> Opening your invitation…
    </div></Shell>;
  }

  if (error || !data) {
    return <Shell>
      <div style={{ textAlign: "center" }}>
        <AlertTriangle size={28} color="#D9A55E" style={{ margin: "0 auto 14px" }}/>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#E8EDF5", fontWeight: 800, marginBottom: 10 }}>This invitation can't be opened</h1>
        <p style={{ fontSize: 14, color: "#A3ADC9", lineHeight: 1.7 }}>{error ?? "Ask an admin to send a new invitation."}</p>
      </div>
    </Shell>;
  }

  const invite = data.invite;
  const roleLabel = ROLE_PRESETS[invite.role as AdminRole]?.label ?? invite.role.replace(/_/g, " ");

  if (accepted) {
    return <Shell>
      <div style={{ textAlign: "center" }}>
        <CheckCircle size={30} color="#5FBE91" style={{ margin: "0 auto 14px" }}/>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "#E8EDF5", fontWeight: 800, marginBottom: 10 }}>You're in</h1>
        <p style={{ fontSize: 14, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 22 }}>
          Your admin access as <strong style={{ color: "#E8EDF5" }}>{roleLabel}</strong> is active. Sign in with <strong style={{ color: "#E8EDF5" }}>{invite.email}</strong> and {invite.hasAccount ? "your existing password" : "the password you just chose"}.
        </p>
        <button onClick={onSignIn}
          style={{ width: "100%", padding: "13px 20px", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer",
            background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none" }}>
          Go to admin sign-in
        </button>
      </div>
    </Shell>;
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!invite.hasAccount) {
      if (password.length < MIN_PASSWORD) { setFormError(`Choose a password of at least ${MIN_PASSWORD} characters.`); return; }
      if (password !== confirm) { setFormError("The two passwords do not match."); return; }
    }
    setSubmitting(true);
    try {
      await publicApi.post(`/admin-invite/${encodeURIComponent(id)}/accept`, { token, password: invite.hasAccount ? undefined : password });
      setAccepted(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "The invitation could not be accepted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const input: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(91,110,225,0.2)", borderRadius: 12,
    padding: "12px 42px 12px 14px", fontSize: 15, color: "#E8EDF5", outline: "none",
  };

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Crown size={14} color="#AEB9F5"/>
        <span style={{ fontSize: 12, color: "#AEB9F5", ...MONO, letterSpacing: "0.1em" }}>ADMIN PORTAL INVITATION</span>
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "#E8EDF5", fontWeight: 800, marginBottom: 8 }}>Welcome, {invite.name.split(" ")[0]}</h1>
      <p style={{ fontSize: 14, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 20 }}>
        You've been invited to the Final Pass Down admin portal as <strong style={{ color: "#E8EDF5" }}>{roleLabel}</strong>.
      </p>

      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "#8A9AB8", ...MONO, marginBottom: 3 }}>SIGN-IN EMAIL</div>
        <div style={{ fontSize: 14, color: "#E8EDF5" }}>{invite.email}</div>
      </div>

      <form onSubmit={handleAccept}>
        {invite.hasAccount ? (
          <p style={{ fontSize: 13, color: "#A3ADC9", lineHeight: 1.7, marginBottom: 18 }}>
            This email already has a Final Pass Down account. Accepting adds admin access to it — your password stays the same.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            {([["CHOOSE A PASSWORD", password, setPassword], ["CONFIRM PASSWORD", confirm, setConfirm]] as [string, string, (v: string) => void][]).map(([label, value, set]) => (
              <div key={label}>
                <label style={{ fontSize: 10, color: "#8A9AB8", ...MONO, display: "block", marginBottom: 6 }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} value={value} onChange={e => set(e.target.value)}
                    autoComplete="new-password" style={input}/>
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8A9AB8", padding: 2 }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: "#8A9AB8" }}>At least {MIN_PASSWORD} characters.</div>
          </div>
        )}

        {formError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, marginBottom: 14,
            background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)", color: "#FC8181", fontSize: 13 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0 }}/> {formError}
          </div>
        )}

        <button type="submit" disabled={submitting}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            background: "linear-gradient(135deg,#5B6EE1,#7E6BD8)", color: "#fff", border: "none" }}>
          {submitting ? <Loader2 size={15} className="animate-spin"/> : <Lock size={15}/>}
          {submitting ? "Accepting…" : invite.hasAccount ? "Accept invitation" : "Accept invitation & set password"}
        </button>
      </form>
    </Shell>
  );
}
