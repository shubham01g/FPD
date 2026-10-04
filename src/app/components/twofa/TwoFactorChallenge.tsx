/**
 * The code screen shown between "password accepted" and "you're in".
 *
 * Deliberately dumb: it collects a code and hands it to the caller. Each login
 * surface owns its own verification (native factor vs emailed code) but they
 * all show this, so the user, admin and concierge sign-ins cannot drift apart
 * the way they did before 2FA existed.
 *
 * Palette matches the auth screens (UserLogin/AdminLogin), not the in-portal
 * settings screens.
 */
import React, { useState } from "react";
import { AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import type { TwoFAMethod } from "../../services/twoFactor";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const INPUT: React.CSSProperties = {
  background: "rgba(91,167,214,0.06)",
  border: "1px solid rgba(91,167,214,0.25)",
  color: "#E8EDF5",
  outline: "none",
};

export interface TwoFactorChallengeProps {
  method: TwoFAMethod;
  /** Masked phone or email, shown so the user knows where to look. */
  destination?: string | null;
  /** Throw with a user-facing message to show an error and stay put. */
  onVerify: (code: string) => Promise<void>;
  /** Omit for authenticator — there is nothing to resend. */
  onResend?: () => Promise<void>;
  /** Omit to hide the backup-code escape hatch. */
  onUseBackupCode?: (code: string) => Promise<void>;
  onCancel: () => void;
  cancelLabel?: string;
}

function blurb(method: TwoFAMethod, destination?: string | null): string {
  if (method === "authenticator") return "Enter the 6-digit code from your authenticator app.";
  if (method === "sms") return `We texted a 6-digit code to ${destination || "your phone"}.`;
  return `We emailed a 6-digit code to ${destination || "your inbox"}.`;
}

export function TwoFactorChallenge({
  method, destination, onVerify, onResend, onUseBackupCode, onCancel, cancelLabel,
}: TwoFactorChallengeProps) {
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (useBackup) {
        if (!onUseBackupCode) return;
        await onUseBackupCode(backupCode);
      } else {
        await onVerify(code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!onResend || resending) return;
    setError("");
    setNotice("");
    setResending(true);
    try {
      await onResend();
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new code.");
    } finally {
      setResending(false);
    }
  };

  const ready = useBackup ? backupCode.trim().length >= 6 : code.length === 6;

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck size={20} color="#6FAE8B" />
          <span style={{ color: "#6B7FA8", fontSize: 14, letterSpacing: "0.15em", ...MONO }}>
            TWO-STEP VERIFICATION
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 35.5, color: "#E8EDF5", marginBottom: 8 }}>
          {useBackup ? "Use a backup code" : "Confirm it's you"}
        </h2>
        <p style={{ color: "#6B7FA8", fontSize: 17.5, lineHeight: 1.6 }}>
          {useBackup
            ? "Enter one of the backup codes you saved when you turned on two-step verification."
            : blurb(method, destination)}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ background: "rgba(111,174,139,0.1)", border: "1px solid rgba(111,174,139,0.25)" }}>
          <ShieldCheck size={15} color="#6FAE8B" />
          <span style={{ color: "#6FAE8B", fontSize: 16 }}>{notice}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {useBackup ? (
          <div>
            <label style={{ color: "#6B7FA8", fontSize: 14, ...MONO, display: "block", marginBottom: 6 }}>
              BACKUP CODE
            </label>
            <input
              value={backupCode}
              onChange={e => setBackupCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl"
              style={{ ...INPUT, fontSize: 19, textAlign: "center", letterSpacing: "0.2em", ...MONO }}
            />
          </div>
        ) : (
          <div>
            <label style={{ color: "#6B7FA8", fontSize: 14, ...MONO, display: "block", marginBottom: 6 }}>
              VERIFICATION CODE
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl"
              style={{ ...INPUT, fontSize: 30, textAlign: "center", letterSpacing: "0.3em", ...MONO }}
            />
          </div>
        )}

        <button type="submit" disabled={busy || !ready}
          className="w-full py-4 rounded-xl font-bold mt-2"
          style={{
            background: busy || !ready ? "rgba(91,167,214,0.2)" : "linear-gradient(135deg,#5BA7D6,#6F9E94)",
            color: busy || !ready ? "#6FAE8B" : "#04080F",
            fontSize: 19,
            boxShadow: busy || !ready ? "none" : "0 0 30px rgba(91,167,214,0.35)",
            cursor: busy || !ready ? "not-allowed" : "pointer",
          }}>
          {busy ? "Verifying..." : "Verify"}
        </button>
      </form>

      {onResend && !useBackup && (
        <button onClick={resend} disabled={resending}
          className="w-full mt-5 text-center text-sm"
          style={{ color: "#6FAE8B", cursor: resending ? "default" : "pointer" }}>
          {resending ? "Sending..." : "Didn't get it? Send a new code"}
        </button>
      )}

      {onUseBackupCode && (
        <button
          onClick={() => { setUseBackup(!useBackup); setError(""); setNotice(""); }}
          className="w-full mt-4 text-center text-sm flex items-center justify-center gap-2"
          style={{ color: "#6B7FA8" }}>
          <KeyRound size={13} />
          {useBackup ? "Back to the verification code" : "Lost your device? Use a backup code"}
        </button>
      )}

      <button onClick={onCancel} className="mt-8 w-full text-center text-sm" style={{ color: "#4A5A7A" }}>
        {cancelLabel ?? "← Cancel and sign out"}
      </button>
    </div>
  );
}

/**
 * Same challenge, as a standalone page. Used by the route guards, where there
 * is no surrounding sign-in layout to sit inside.
 */
export function TwoFactorChallengeScreen(props: TwoFactorChallengeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "#030710", fontFamily: "var(--font-body)" }}>
      <TwoFactorChallenge {...props} />
    </div>
  );
}
