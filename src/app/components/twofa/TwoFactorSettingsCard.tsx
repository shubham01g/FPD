/**
 * Two-step verification for a staff account, as a drop-in card.
 *
 * The admin sign-in has challenged for a TOTP code since Phase 5, but
 * supabase.auth.mfa.enroll() existed nowhere in the app — so the check could
 * never fire and nobody could turn it on. This is the missing half, shared by
 * the admin and concierge portals.
 *
 * Staff get the authenticator only. SMS and email codes are fine for customers,
 * but a staff session reaches other people's records, and both of those
 * channels are recoverable by whoever controls the phone number or inbox.
 *
 * Customers get the full three-method picker in AccountSettings instead.
 */
import React, { useEffect, useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getTwoFactorState, disableTwoFactor, regenerateBackupCodes, type TwoFactorState } from "../../services/twoFactor";
import { TwoFactorEnrollModal } from "./TwoFactorEnrollModal";
import { useAuth } from "../../context/AuthContext";

const CARD: React.CSSProperties = {
  background: "#101728",
  border: "1px solid rgba(91,110,225,0.16)",
  borderRadius: 20,
};
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export interface TwoFactorSettingsCardProps {
  /** Small caps label above the heading, e.g. "YOUR ADMIN ACCOUNT". */
  eyebrow: string;
  /** Why this particular account needs protecting, shown when 2FA is off. */
  rationale: string;
  /** Which portal the code will be asked for, shown when 2FA is on. */
  portalName: string;
  /** Filename for the downloaded backup codes. */
  downloadName: string;
}

export function TwoFactorSettingsCard({
  eyebrow, rationale, portalName, downloadName,
}: TwoFactorSettingsCardProps) {
  const { authUser } = useAuth();
  const [state, setState] = useState<TwoFactorState | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => getTwoFactorState().then(setState).catch(() => setState(null));
  useEffect(() => { load(); }, []);

  const enabled = state?.enabled ?? false;

  async function disable() {
    setBusy(true);
    try {
      await disableTwoFactor();
      await load();
      toast.success("Two-step verification turned off for this account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn it off");
    } finally {
      setBusy(false);
    }
  }

  async function newCodes() {
    setBusy(true);
    try {
      const { backupCodes } = await regenerateBackupCodes();
      await load();
      const body =
        "Final Pass Down — admin backup codes\n" +
        `Generated ${new Date().toLocaleString()}\n\n` + backupCodes.join("\n") + "\n";
      const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("New backup codes downloaded — the old ones no longer work");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate new codes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-5 rounded-2xl" style={CARD}>
      <div className="flex items-start gap-4 flex-wrap">
        <div style={{ color: enabled ? "#6FAE8B" : "#D9A55E", flexShrink: 0, marginTop: 2 }}>
          {state === null ? <Loader2 size={20} className="animate-spin" />
            : enabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={13} color="#6E90C9" />
            <span style={{ color: "#6E90C9", fontSize: 13, ...MONO, letterSpacing: "0.1em" }}>
              {eyebrow}
            </span>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "#E8EDF5", marginBottom: 4 }}>
            {state === null ? "Checking two-step verification…"
              : enabled ? "Two-step verification is on" : "Two-step verification is off"}
          </h3>
          <p style={{ color: "#8A9AB8", fontSize: 15.5, lineHeight: 1.6 }}>
            {enabled
              ? `Signing in to the ${portalName} as ${authUser?.email ?? "this account"} requires a code from your authenticator app.`
              : rationale}
          </p>
          {enabled && state && (
            <p style={{ color: "#8A9AB8", fontSize: 14.5, marginTop: 6 }}>
              <KeyRound size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "-1px" }} />
              {state.backupCodesRemaining} backup {state.backupCodesRemaining === 1 ? "code" : "codes"} left.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap" style={{ flexShrink: 0 }}>
          {enabled ? (
            <>
              <button onClick={newCodes} disabled={busy}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#8A9AB8" }}>
                New backup codes
              </button>
              <button onClick={disable} disabled={busy}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{ background: "rgba(208,107,107,0.12)", border: "1px solid rgba(208,107,107,0.3)", color: "#D06B6B" }}>
                {busy ? "Working…" : "Turn off"}
              </button>
            </>
          ) : (
            <button onClick={() => setEnrolling(true)} disabled={state === null}
              className="px-5 py-2.5 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg,#5B6EE1,#5B6EE1)",
                color: "#F0F4FA",
                boxShadow: "0 0 20px rgba(91,110,225,0.3)",
                opacity: state === null ? 0.5 : 1,
              }}>
              Set up authenticator
            </button>
          )}
        </div>
      </div>

      {enrolling && (
        <TwoFactorEnrollModal
          method="authenticator"
          email={authUser?.email}
          onEnrolled={() => { load(); toast.success("Two-step verification is on for this account"); }}
          onClose={() => setEnrolling(false)}
        />
      )}
    </div>
  );
}
