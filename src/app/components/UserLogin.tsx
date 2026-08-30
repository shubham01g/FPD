import React, { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import fpdFullLogo from "../../imports/FPD_full_logo.png";
import { signInWithPassword } from "../services/auth";

interface UserLoginProps {
  onLogin: () => void;
  onGoSignup: () => void;
  onBackToSite: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function UserLogin({ onLogin, onGoSignup, onBackToSite }: UserLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);

    const { error: signInError } = await signInWithPassword(email, password);
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    onLogin();
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
      </div>
    </div>
  );
}
