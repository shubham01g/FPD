/**
 * The second factor, demanded of a session that already exists.
 *
 * The sign-in screens run their own challenge inline because they know what
 * just happened. This covers the other way in: persistSession means a reload
 * restores a session that never passed the gate, so the route guards mount
 * this instead of the portal until it is satisfied.
 *
 * It works out for itself what the account owes, so callers only have to ask.
 */
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { signOut } from "../../services/auth";
import {
  type TwoFAMethod,
  getNativeChallengeState, challengeFactor, verifyChallenge, verifyFactor,
  getTwoFactorState, startEmailCode, checkEmailCode, redeemBackupCode,
} from "../../services/twoFactor";
import { TwoFactorChallengeScreen } from "./TwoFactorChallenge";

interface Pending {
  method: TwoFAMethod;
  factorId?: string;
  challengeId?: string;
  destination?: string | null;
}

export interface TwoFactorGateProps {
  /** Where to send the user if they back out. */
  onCancelled: () => void;
  cancelLabel?: string;
}

export function TwoFactorGate({ onCancelled, cancelLabel }: TwoFactorGateProps) {
  const { authUser, refreshTwoFactor } = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");
  // React 18 StrictMode double-mounts in dev; without this the SMS and email
  // paths would send two codes and invalidate the first.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        const native = await getNativeChallengeState();
        if (cancelled) return;

        if (native.status === "challenge") {
          const challengeId = native.type === "phone" ? await challengeFactor(native.factorId) : undefined;
          if (cancelled) return;
          setPending({
            method: native.type === "totp" ? "authenticator" : "sms",
            factorId: native.factorId,
            challengeId,
          });
          return;
        }

        const state = await getTwoFactorState();
        if (cancelled) return;
        if (state.enabled && state.method === "email_otp" && !state.gateCleared) {
          await startEmailCode();
          if (cancelled) return;
          setPending({ method: "email_otp", destination: authUser?.email ?? null });
          return;
        }

        // Nothing outstanding after all — the context was out of date.
        await refreshTwoFactor();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not start verification.");
      }
    })();

    return () => { cancelled = true; };
  }, [authUser, refreshTwoFactor]);

  const cancel = async () => {
    await signOut();
    onCancelled();
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: "#030710", fontFamily: "var(--font-body)" }}>
        <p style={{ color: "#FC8181", fontSize: 17.5, maxWidth: 420 }}>{error}</p>
        <button onClick={cancel} style={{ color: "#6FAE8B", fontSize: 16 }}>Sign out and try again</button>
      </div>
    );
  }

  if (!pending) {
    return <div className="min-h-screen" style={{ background: "#030710" }} />;
  }

  return (
    <TwoFactorChallengeScreen
      method={pending.method}
      destination={pending.destination}
      cancelLabel={cancelLabel}
      onVerify={async (code) => {
        if (pending.method === "email_otp") {
          await checkEmailCode(code, "login");
        } else if (pending.method === "sms") {
          await verifyChallenge(pending.factorId!, pending.challengeId!, code);
        } else {
          await verifyFactor(pending.factorId!, code);
        }
        await refreshTwoFactor();
      }}
      onResend={pending.method === "authenticator" ? undefined : async () => {
        if (pending.method === "email_otp") await startEmailCode();
        else setPending({ ...pending, challengeId: await challengeFactor(pending.factorId!) });
      }}
      onUseBackupCode={async (code) => {
        await redeemBackupCode(code);
        await refreshTwoFactor();
        toast.warning("Two-step verification has been turned off. Set it up again from Account Settings.");
      }}
      onCancel={cancel}
    />
  );
}
