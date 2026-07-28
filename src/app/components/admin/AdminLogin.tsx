import React, { useState } from "react";
import { Shield, Eye, EyeOff, Lock, Crown, AlertCircle } from "lucide-react";
import fpdSquareLogo from "../../../imports/FPD_mark_square.png";

interface AdminLoginProps {
  onLogin: () => void;
  onBackToSite: () => void;
}

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function AdminLogin({ onLogin, onBackToSite }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mfa, setMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your admin credentials."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (email === "admin@finalpassdown.com" && password === "Admin2026!") {
        setMfa(true);
      } else {
        setError("Invalid credentials. Use admin@finalpassdown.com / Admin2026!");
      }
    }, 900);
  };

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (mfaCode === "482910" || mfaCode.length === 6) {
        onLogin();
      } else {
        setError("Invalid verification code. Try 482910 for demo.");
      }
    }, 700);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#030710", fontFamily: "var(--font-body)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg,#0A0F2E 0%,#030710 100%)", borderRight: "1px solid rgba(91,167,214,0.15)" }}>
        {/* Grid */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(91,167,214,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(91,167,214,0.04) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        {/* Orbs */}
        <div style={{ position:"absolute", top:"15%", left:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,167,214,0.1) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(91,110,225,0.07) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <img src={fpdSquareLogo} alt="FPD" style={{ width:40, height:40, borderRadius:10, objectFit:"contain", boxShadow:"0 0 20px rgba(91,167,214,0.3)" }}/>
            <div>
              <div style={{ fontFamily:"var(--font-display)", color:"#6FAE8B", fontSize:14.5, fontWeight:700, letterSpacing:"0.06em" }}>FINAL PASS DOWN</div>
              <div style={{ color:"#34456A", fontSize:10, letterSpacing:"0.15em", ...MONO }}>PLATFORM ADMINISTRATION</div>
            </div>
          </div>
          <Crown size={56} color="#FFFFFF" style={{ marginBottom:24, opacity:0.8 }}/>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(2.2rem,4.5vw,3.4rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:20 }}>
            Admin<br /><span style={{ color:"#6FAE8B" }}>Command Center</span>
          </h1>
          <p style={{ color:"#6B7FA8", fontSize:17, lineHeight:1.8, maxWidth:380 }}>
            Full platform oversight — user management, revenue analytics, ID verification, payout controls, email templates, and white label configuration.
          </p>
        </div>

        <div className="relative space-y-4">
          {[
            { icon:"👥", label:"51,490 active users" },
            { icon:"💰", label:"$112,340 monthly recurring revenue" },
            { icon:"🔐", label:"3 ID verifications pending" },
            { icon:"📧", label:"16 email templates managed" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.15)" }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ color:"#B8C8E0", fontSize:14.5 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src={fpdSquareLogo} alt="FPD" style={{ width:36, height:36, borderRadius:8, objectFit:"contain" }}/>
            <div style={{ fontFamily:"var(--font-display)", color:"#6FAE8B", fontSize:13.5, fontWeight:700, letterSpacing:"0.06em" }}>ADMIN PORTAL</div>
          </div>

          {!mfa ? (
            <>
              <div className="mb-8">
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:31.5, color:"#E8EDF5", marginBottom:8 }}>Administrator Sign In</h2>
                <p style={{ color:"#6B7FA8", fontSize:15.5 }}>This portal is restricted to authorised Final Pass Down administrators.</p>
              </div>

              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
                  <AlertCircle size={15} color="#FC8181"/>
                  <span style={{ color:"#FC8181", fontSize:14.5 }}>{error}</span>
                </div>
              )}

              <div className="mb-3 px-4 py-3 rounded-xl" style={{ background:"rgba(91,167,214,0.08)", border:"1px solid rgba(91,167,214,0.2)" }}>
                <p style={{ color:"#6FAE8B", fontSize:12.5, ...MONO }}>DEMO CREDENTIALS</p>
                <p style={{ color:"#B8C8E0", fontSize:13.5, marginTop:2 }}>admin@finalpassdown.com / Admin2026!</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label style={{ color:"#6B7FA8", fontSize:12.5, ...MONO, display:"block", marginBottom:6 }}>ADMIN EMAIL</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@finalpassdown.com"
                    className="w-full px-4 py-3.5 rounded-xl"
                    style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:15.5, outline:"none" }}/>
                </div>
                <div>
                  <label style={{ color:"#6B7FA8", fontSize:12.5, ...MONO, display:"block", marginBottom:6 }}>PASSWORD</label>
                  <div className="relative">
                    <input type={showPw?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"
                      className="w-full px-4 py-3.5 rounded-xl pr-12"
                      style={{ background:"rgba(91,167,214,0.06)", border:"1px solid rgba(91,167,214,0.25)", color:"#E8EDF5", fontSize:15.5, outline:"none" }}/>
                    <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color:"#6B7FA8" }}>
                      {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-4 rounded-xl font-bold text-sm mt-2"
                  style={{ background: loading ? "rgba(91,167,214,0.2)" : "linear-gradient(135deg,#5BA7D6,#6F9E94)", color: loading ? "#6FAE8B" : "#04080F", fontSize:17, boxShadow: loading ? "none" : "0 0 30px rgba(91,167,214,0.35)", cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Authenticating..." : "Sign In to Admin Portal"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background:"rgba(91,167,214,0.12)", border:"1px solid rgba(91,167,214,0.3)", boxShadow:"0 0 30px rgba(91,167,214,0.15)" }}>
                  <Lock size={28} color="#FFFFFF"/>
                </div>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:27, color:"#E8EDF5", marginBottom:8 }}>Two-Factor Verification</h2>
                <p style={{ color:"#6B7FA8", fontSize:15.5 }}>Enter the 6-digit code from your authenticator app.</p>
                <p style={{ color:"#6FAE8B", fontSize:13.5, marginTop:6, ...MONO }}>Demo: use any 6 digits</p>
              </div>
              {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5" style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
                  <AlertCircle size={15} color="#FC8181"/>
                  <span style={{ color:"#FC8181", fontSize:14.5 }}>{error}</span>
                </div>
              )}
              <form onSubmit={handleMfa}>
                <input type="text" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6}
                  className="w-full px-6 py-5 rounded-xl text-center mb-5"
                  style={{ background:"rgba(91,167,214,0.06)", border:"2px solid rgba(91,167,214,0.3)", color:"#6FAE8B", fontSize:36, outline:"none", letterSpacing:"0.5em", ...MONO }}/>
                <button type="submit" disabled={loading || mfaCode.length < 6} className="w-full py-4 rounded-xl font-bold text-sm"
                  style={{ background: (loading || mfaCode.length < 6) ? "rgba(91,167,214,0.2)" : "linear-gradient(135deg,#5BA7D6,#6F9E94)", color:(loading || mfaCode.length < 6)?"#6FAE8B":"#04080F", fontSize:17, boxShadow:(loading || mfaCode.length < 6)?"none":"0 0 30px rgba(91,167,214,0.35)" }}>
                  {loading ? "Verifying..." : "Verify & Enter Admin Portal"}
                </button>
              </form>
            </>
          )}

          <button onClick={onBackToSite} className="mt-8 w-full text-center text-sm" style={{ color:"#4A5A7A" }}>
            ← Back to finalpassdown.com
          </button>
        </div>
      </div>
    </div>
  );
}
