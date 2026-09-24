import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { signInWithPassword, signOut } from "../services/auth";
import {
  type TwoFAMethod,
  getNativeChallengeState, challengeFactor, verifyChallenge, verifyFactor,
  getLocalTwoFactorSettings, getTwoFactorState, startEmailCode, checkEmailCode, redeemBackupCode,
} from "../services/twoFactor";
import { TwoFactorChallenge } from "./twofa/TwoFactorChallenge";
import { useAuth } from "../context/AuthContext";

interface UserLoginProps {
  onLogin: () => void;
  onGoSignup: () => void;
  onBackToSite: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/** What the account still owes before the session counts as signed in. */
interface Challenge {
  method: TwoFAMethod;
  factorId?: string;
  challengeId?: string;
  destination?: string | null;
}

export function UserLogin({ onLogin, onGoSignup, onBackToSite }: UserLoginProps) {
  const { refreshTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);

    const { error: signInError } = await signInWithPassword(email, password);
    if (signInError) { setLoading(false); setError(signInError.message); return; }

    // The password only got us to aal1. Everything below decides whether this
    // account owes a second factor before it counts as signed in.
    try {
      const native = await getNativeChallengeState();

      if (native.status === "orphaned") {
        await signOut();
        setLoading(false);
        setError("Two-step verification is required on this account but no method is set up. Contact support to reset it.");
        return;
      }

      if (native.status === "challenge") {
        // A phone factor only sends its SMS when the challenge opens, so that
        // has to happen before the code box appears.
        const challengeId = native.type === "phone" ? await challengeFactor(native.factorId) : undefined;
        setLoading(false);
        setChallenge({
          method: native.type === "totp" ? "authenticator" : "sms",
          factorId: native.factorId,
          challengeId,
          destination: null,
        });
        return;
      }

      // No native factor outstanding. Email OTP has no aal2 to check, so ask
      // the server whether this session has cleared its gate.
      const settings = await getLocalTwoFactorSettings();
      if (settings.enabled && settings.method === "email_otp"
          && !(await getTwoFactorState()).gateCleared) {
        await startEmailCode();
        setLoading(false);
        setChallenge({ method: "email_otp", destination: email });
        return;
      }
    } catch (err) {
      // Never let a failure here fall through to a signed-in dashboard.
      await signOut();
      setLoading(false);
      setError(err instanceof Error ? err.message : "Could not complete sign-in. Try again.");
      return;
    }

    setLoading(false);
    onLogin();
  };

  const verifyChallengeCode = async (code: string) => {
    if (!challenge) return;
    if (challenge.method === "email_otp") {
      await checkEmailCode(code, "login");
    } else if (challenge.method === "sms") {
      await verifyChallenge(challenge.factorId!, challenge.challengeId!, code);
    } else {
      await verifyFactor(challenge.factorId!, code);
    }
    // Clearing an email OTP writes a server-side record rather than changing
    // the session, so the context has to be told to look again.
    await refreshTwoFactor();
    onLogin();
  };

  const resendChallengeCode = async () => {
    if (!challenge) return;
    if (challenge.method === "email_otp") {
      await startEmailCode();
    } else if (challenge.method === "sms") {
      setChallenge({ ...challenge, challengeId: await challengeFactor(challenge.factorId!) });
    }
  };

  const useBackupCode = async (code: string) => {
    await redeemBackupCode(code);
    // Redeeming tears the factor down, so the account is now unprotected.
    await refreshTwoFactor();
    toast.warning("Two-step verification has been turned off. Set it up again from Account Settings.");
    onLogin();
  };

  const cancelChallenge = async () => {
    await signOut();
    setChallenge(null);
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#030710", fontFamily: "var(--font-body)" }}>
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg,#0A0F2E 0%,#030710 100%)", borderRight: "1px solid rgba(91,167,214,0.15)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(91,167,214,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(91,167,214,0.04) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        <div style={{ position:"absolute", top:"15%", left:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,167,214,0.1) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,110,225,0.07) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div className="relative">
          <div className="mb-16">
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:64, width:97, flexShrink:0, borderRadius:12, objectFit:"contain", boxShadow:"0 0 20px rgba(91,167,214,0.3)", display:"block", marginBottom:10 }}/>
            <div style={{ color:"#34456A", fontSize:11, letterSpacing:"0.15em", ...MONO }}>YOUR DIGITAL LEGACY VAULT</div>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(2.5rem,5vw,3.8rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:20 }}>
            Welcome<br /><span style={{ color:"#6FAE8B" }}>Back</span>
          </h1>
          <p style={{ color:"#6B7FA8", fontSize:19, lineHeight:1.8, maxWidth:380 }}>
            Sign in to access your documents, contacts, and everything you've entrusted to Final Pass Down.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {challenge ? (
          <TwoFactorChallenge
            method={challenge.method}
            destination={challenge.destination}
            onVerify={verifyChallengeCode}
            onResend={challenge.method === "authenticator" ? undefined : resendChallengeCode}
            onUseBackupCode={useBackupCode}
            onCancel={cancelChallenge}
          />
        ) : (
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:48, width:73, flexShrink:0, borderRadius:9, objectFit:"contain", display:"block", marginBottom:6 }}/>
          </div>

          <div className="mb-8">
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:35.5, color:"#E8EDF5", marginBottom:8 }}>Sign In</h2>
            <p style={{ color:"#6B7FA8", fontSize:17.5 }}>Access your Final Pass Down account.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <AlertCircle size={15} color="#FC8181"/>
              <span style={{ color:"#FC8181", fontSize:16 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color:"#6B7FA8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>EMAIL</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"
                className="w-full px-4 py-3.5 rounded-xl"
                style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:17.5, outline:"none" }}/>
            </div>
            <div>
              <label style={{ color:"#6B7FA8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>PASSWORD</label>
              <div className="relative">
                <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"
                  className="w-full px-4 py-3.5 rounded-xl pr-12"
                  style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:17.5, outline:"none" }}/>
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color:"#6B7FA8" }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold text-sm mt-2"
              style={{ background: loading ? "rgba(91,167,214,0.2)" : "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: loading ? "#6FAE8B" : "#04080F", fontSize:19, boxShadow: loading ? "none" : "0 0 30px rgba(91,167,214,0.35)", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button onClick={onGoSignup} className="w-full mt-5 text-center text-sm" style={{ color:"#6FAE8B" }}>
            Don't have an account? <span style={{ textDecoration:"underline" }}>Create one</span>
          </button>

          <button onClick={onBackToSite} className="mt-8 w-full text-center text-sm" style={{ color:"#4A5A7A" }}>
            ← Back to finalpassdown.com
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
