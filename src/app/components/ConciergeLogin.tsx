import React, { useState } from "react";
import { Eye, EyeOff, Star, AlertCircle, Shield, Lock } from "lucide-react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { supabase } from "../services/supabase";
import { signOut } from "../services/auth";
import { getMyConciergeProfile, touchConciergeLogin, type ConciergeEmployee } from "../services/conciergeStaff";
import {
  type TwoFAMethod,
  getNativeChallengeState, challengeFactor, verifyChallenge, verifyFactor,
  getLocalTwoFactorSettings, getTwoFactorState, startEmailCode, checkEmailCode, redeemBackupCode,
} from "../services/twoFactor";
import { TwoFactorChallenge } from "./twofa/TwoFactorChallenge";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

interface ConciergeLoginProps {
  onLogin: (employee: ConciergeEmployee) => void;
  onBackToSite: () => void;
}

/** What the staff account still owes before the session counts as signed in. */
interface Challenge {
  method: TwoFAMethod;
  factorId?: string;
  challengeId?: string;
  destination?: string | null;
}

export function ConciergeLogin({ onLogin, onBackToSite }: ConciergeLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kept aside while the second factor is answered, so it is not handed to the
  // portal until the sign-in is actually complete.
  const [employee, setEmployee] = useState<ConciergeEmployee | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  async function finish(emp: ConciergeEmployee) {
    await touchConciergeLogin(emp.id).catch(() => {});
    onLogin(emp);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setLoading(false);
      setError("Invalid credentials. Contact your administrator.");
      return;
    }

    try {
      // Being a valid Supabase user is not enough — this portal is only for
      // staff on the concierge roster. RLS means a customer session reads null.
      const emp = await getMyConciergeProfile();
      if (!emp || emp.status === "suspended") {
        await signOut();
        setLoading(false);
        setError("This account does not have concierge access, or it has been suspended.");
        return;
      }
      setEmployee(emp);

      const native = await getNativeChallengeState();
      if (native.status === "orphaned") {
        await signOut();
        setLoading(false);
        setError("Two-step verification is required on this account but no method is set up. Contact your administrator.");
        return;
      }
      if (native.status === "challenge") {
        const challengeId = native.type === "phone" ? await challengeFactor(native.factorId) : undefined;
        setLoading(false);
        setChallenge({
          method: native.type === "totp" ? "authenticator" : "sms",
          factorId: native.factorId,
          challengeId,
        });
        return;
      }

      const settings = await getLocalTwoFactorSettings();
      if (settings.enabled && settings.method === "email_otp"
          && !(await getTwoFactorState()).gateCleared) {
        await startEmailCode();
        setLoading(false);
        setChallenge({ method: "email_otp", destination: email });
        return;
      }

      setLoading(false);
      await finish(emp);
    } catch (err) {
      await signOut();
      setLoading(false);
      setEmployee(null);
      setError(err instanceof Error ? err.message : "Could not complete sign-in. Try again.");
    }
  }

  const verifyChallengeCode = async (code: string) => {
    if (!challenge || !employee) return;
    if (challenge.method === "email_otp") await checkEmailCode(code, "login");
    else if (challenge.method === "sms") await verifyChallenge(challenge.factorId!, challenge.challengeId!, code);
    else await verifyFactor(challenge.factorId!, code);
    await finish(employee);
  };

  const resendChallengeCode = async () => {
    if (!challenge) return;
    if (challenge.method === "email_otp") await startEmailCode();
    else if (challenge.method === "sms") {
      setChallenge({ ...challenge, challengeId: await challengeFactor(challenge.factorId!) });
    }
  };

  const useBackupCode = async (code: string) => {
    if (!employee) return;
    await redeemBackupCode(code);
    await finish(employee);
  };

  const cancelChallenge = async () => {
    await signOut();
    setChallenge(null);
    setEmployee(null);
    setPassword("");
    setError("");
  };

  return (
    <div className="min-h-screen flex" style={{ background:"#04080F", fontFamily:"var(--font-body)" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden"
        style={{ background:"linear-gradient(145deg,#0A0F2E 0%,#030710 100%)", borderRight:"1px solid rgba(91,167,214,0.12)" }}>
        {/* Grid */}
        <div className="absolute inset-0" style={{ backgroundImage:"linear-gradient(rgba(91,167,214,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(91,167,214,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" }}/>
        {/* Orbs */}
        <div style={{ position:"absolute", top:"15%", left:"5%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(247,147,26,0.08) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"10%", right:"0%", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,167,214,0.08) 0%,transparent 70%)", pointerEvents:"none" }}/>

        <div className="relative">
          <div className="mb-16">
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:64, width:97, flexShrink:0, borderRadius:12, objectFit:"contain", boxShadow:"0 0 20px rgba(91,167,214,0.25)", display:"block", marginBottom:10 }}/>
            <div style={{ color:"#34456A", fontSize:11, letterSpacing:"0.15em", ...MONO }}>CONCIERGE STAFF PORTAL</div>
          </div>

          <Star size={52} color="#F7931A" fill="rgba(247,147,26,0.2)" style={{ marginBottom:24, opacity:0.9 }}/>
          <h1 style={{ ...DISPLAY, fontSize:"clamp(2.2rem,4.4vw,3.2rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:16 }}>
            White Glove<br /><span style={{ color:"#D68FA8" }}>Concierge Portal</span>
          </h1>
          <p style={{ color:"#6B7FA8", fontSize:17.5, lineHeight:1.8, maxWidth:340 }}>
            This portal is exclusively for authorized Final Pass Down White Glove Concierge staff. You can only access the clients assigned to you by your administrator.
          </p>
        </div>

        <div className="relative space-y-3">
          {[
            { icon:"⭐", label:"Restricted to assigned clients only" },
            { icon:"🔒", label:"All actions are logged and audited" },
            { icon:"📋", label:"Session notes, scheduling, and waivers" },
            { icon:"📁", label:"Document upload on behalf of clients" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background:"rgba(91,167,214,0.05)", border:"1px solid rgba(91,167,214,0.12)" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ color:"#B8C8E0", fontSize:15 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
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
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way" style={{ height:48, width:73, flexShrink:0, borderRadius:9, objectFit:"contain", display:"block", marginBottom:6 }}/>
            <div style={{ ...DISPLAY, color:"#D68FA8", fontSize:15, fontWeight:700, letterSpacing:"0.06em" }}>CONCIERGE PORTAL</div>
          </div>

          <div className="mb-8">
            <h2 style={{ ...DISPLAY, fontSize:32.5, color:"#E8EDF5", marginBottom:8 }}>Staff Sign In</h2>
            <p style={{ color:"#6B7FA8", fontSize:17.5 }}>Sign in with the credentials provided by your Final Pass Down administrator.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
              style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <AlertCircle size={14} color="#FC8181"/>
              <span style={{ color:"#FC8181", fontSize:16 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color:"#6B7FA8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>STAFF EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="yourname@finalpassdown.com"
                className="w-full px-4 py-3.5 rounded-xl"
                style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:17.5, outline:"none" }}/>
            </div>
            <div>
              <label style={{ color:"#6B7FA8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>PASSWORD</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3.5 rounded-xl pr-12"
                  style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:17.5, outline:"none" }}/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color:"#6B7FA8" }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base mt-2"
              style={{ background:"linear-gradient(135deg,#5BA7D6,#6F9E94)", color:"#04080F",
                boxShadow:"0 0 28px rgba(91,167,214,0.4)", opacity:loading ? 0.7 : 1 }}>
              {loading ? "Signing in…" : "Sign In to Concierge Portal"}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6">
            <Lock size={11} color="#4A5A7A"/>
            <span style={{ color:"#4A5A7A", fontSize:14 }}>Restricted access · All sessions are logged</span>
          </div>

          <div className="text-center mt-4">
            <button onClick={onBackToSite} style={{ color:"#4A5A7A", fontSize:15 }}>
              ← Back to finalpassdown.com
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
