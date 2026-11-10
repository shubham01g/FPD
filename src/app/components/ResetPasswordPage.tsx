/**
 * /reset-password — where the "Forgot password?" email lands.
 *
 * Supabase puts a recovery session in the URL hash; supabase-js picks it up
 * on load (detectSessionInUrl). The user then chooses a new password here.
 *
 * Supabase refuses a password change on an account with an authenticator or
 * SMS factor until the session reaches aal2, so that challenge is run first
 * with the same component the sign-in screen uses. An email-code account
 * needs nothing extra: the reset link itself proved the mailbox, and the
 * dashboard's own gate still asks for the code afterwards.
 */
import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { supabase } from "../services/supabase";
import { getNativeChallengeState, challengeFactor, verifyChallenge, verifyFactor } from "../services/twoFactor";
import { TwoFactorChallenge } from "./twofa/TwoFactorChallenge";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const INPUT: React.CSSProperties = {
  background: "rgba(91,167,214,0.06)", border: "1px solid rgba(91,167,214,0.25)",
  color: "#E8EDF5", fontSize: 17.5, outline: "none",
};

type Stage =
  | { kind: "checking" }
  | { kind: "invalid"; reason: string }
  | { kind: "challenge"; type: "totp" | "phone"; factorId: string; challengeId?: string }
  | { kind: "form" }
  | { kind: "done" };

/** The error Supabase appends to the URL when a link is expired or used. */
function linkError(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, "") || window.location.search);
  const code = params.get("error_code");
  if (!code && !params.get("error")) return null;
  if (code === "otp_expired") return "This reset link has expired or was already used. Ask for a new one.";
  return params.get("error_description")?.replace(/\+/g, " ") ?? "This reset link can't be used. Ask for a new one.";
}

/** True when this session was opened by a password-recovery link in the last
 *  hour. Supabase records how a session was signed in in the access token's
 *  "amr" claim; a recovery link adds { method: "recovery" }. Without this
 *  check anyone already signed in (an unlocked laptop, a borrowed phone) could
 *  open /reset-password and set a new password without the current one. */
function isRecoverySession(accessToken: string): boolean {
  try {
    const part = accessToken.split(".")[1];
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { amr?: { method?: string; timestamp?: number }[] };
    const now = Date.now() / 1000;
    return (payload.amr ?? []).some((a) => a.method === "recovery" && typeof a.timestamp === "number" && now - a.timestamp < 3600);
  } catch {
    return false;
  }
}

export function ResetPasswordPage({ onDone, onBackToLogin }: { onDone: () => void; onBackToLogin: () => void }) {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const bad = linkError();
    if (bad) { setStage({ kind: "invalid", reason: bad }); return; }

    let settled = false;
    const decide = async () => {
      if (settled) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      settled = true;
      if (!isRecoverySession(data.session.access_token)) {
        setStage({ kind: "invalid", reason: "Open the reset link from your email to choose a new password. To change it while signed in, use Account & Profile → Change password." });
        return;
      }
      // Fail closed: if two-step status can't be read, never show the
      // new-password form (that would skip an enrolled second factor).
      let native: Awaited<ReturnType<typeof getNativeChallengeState>>;
      try { native = await getNativeChallengeState(); }
      catch {
        setStage({ kind: "invalid", reason: "We couldn't confirm your two-step verification. Check your connection and open the reset link again." });
        return;
      }
      if (native.status === "challenge") {
        let challengeId: string | undefined;
        try {
          challengeId = native.type === "phone" ? await challengeFactor(native.factorId) : undefined;
        } catch {
          setStage({ kind: "invalid", reason: "We couldn't send your verification code. Check your connection and open the reset link again." });
          return;
        }
        setStage({ kind: "challenge", type: native.type, factorId: native.factorId, challengeId });
      } else {
        setStage({ kind: "form" });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") decide();
    });
    decide();
    // No session after a few seconds means the link was opened without its
    // token (copied wrongly, or opened on another device after use).
    const timer = setTimeout(() => {
      if (!settled) setStage({ kind: "invalid", reason: "This reset link is incomplete or has already been used. Ask for a new one." });
    }, 6000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pw.length < 8) { setError("Use at least 8 characters."); return; }
    if (pw !== confirm) { setError("The two passwords don't match."); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    // Remove the token from the address bar and history.
    window.history.replaceState(null, "", "/reset-password");
    setStage({ kind: "done" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "#030710", fontFamily: "var(--font-body)" }}>
      <div className="w-full max-w-md">
        <img src={fpdFullLogo} alt="Final Pass Down" style={{ height: 48, width: 73, objectFit: "contain", borderRadius: 9, marginBottom: 24 }}/>

        {stage.kind === "checking" && <p style={{ color: "#6B7FA8", fontSize: 17.5 }}>Checking your reset link…</p>}

        {stage.kind === "invalid" && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "#E8EDF5", marginBottom: 10 }}>Link can't be used</h2>
            <p style={{ color: "#6B7FA8", fontSize: 17.5, marginBottom: 24 }}>{stage.reason}</p>
            <button onClick={onBackToLogin} className="w-full py-4 rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: "#04080F", fontSize: 18 }}>
              Back to sign in
            </button>
          </>
        )}

        {stage.kind === "challenge" && (
          <TwoFactorChallenge
            method={stage.type === "totp" ? "authenticator" : "sms"}
            destination={null}
            onVerify={async (code) => {
              if (stage.challengeId) await verifyChallenge(stage.factorId, stage.challengeId, code);
              else await verifyFactor(stage.factorId, code);
              setStage({ kind: "form" });
            }}
            onResend={stage.type === "phone" ? async () => {
              setStage({ ...stage, challengeId: await challengeFactor(stage.factorId) });
            } : undefined}
            onCancel={async () => { await supabase.auth.signOut({ scope: "local" }); onBackToLogin(); }}
          />
        )}

        {stage.kind === "form" && (
          <>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "#E8EDF5", marginBottom: 8 }}>Choose a new password</h2>
            <p style={{ color: "#6B7FA8", fontSize: 17.5, marginBottom: 22 }}>At least 8 characters. You'll use it the next time you sign in.</p>
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
                <AlertCircle size={15} color="#FC8181"/><span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
              </div>
            )}
            <form onSubmit={save} className="space-y-4">
              <div>
                <label style={{ color: "#6B7FA8", fontSize: 14, ...MONO, display: "block", marginBottom: 6 }}>NEW PASSWORD</label>
                <div className="relative">
                  <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password"
                    className="w-full px-4 py-3.5 rounded-xl pr-12" style={INPUT}/>
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#6B7FA8" }}
                    aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ color: "#6B7FA8", fontSize: 14, ...MONO, display: "block", marginBottom: 6 }}>CONFIRM NEW PASSWORD</label>
                <input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
                  className="w-full px-4 py-3.5 rounded-xl" style={INPUT}/>
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 rounded-xl font-bold mt-2"
                style={{ background: saving ? "rgba(91,167,214,0.2)" : "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: saving ? "#6FAE8B" : "#04080F", fontSize: 18, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Save new password"}
              </button>
            </form>
          </>
        )}

        {stage.kind === "done" && (
          <>
            <div className="flex items-center gap-3 mb-4"><CheckCircle size={22} color="#48BB78"/>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "#E8EDF5" }}>Password changed</h2></div>
            <p style={{ color: "#6B7FA8", fontSize: 17.5, marginBottom: 24 }}>You're signed in with your new password.</p>
            <button onClick={onDone} className="w-full py-4 rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: "#04080F", fontSize: 18 }}>
              Go to my vault
            </button>
          </>
        )}
      </div>
    </div>
  );
}
