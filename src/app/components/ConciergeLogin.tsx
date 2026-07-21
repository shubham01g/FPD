import React, { useState } from "react";
import { Eye, EyeOff, Star, AlertCircle, Shield, Lock } from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_mark_square.png";
import { authenticateConcierge, type ConciergeEmployee } from "../services/conciergeStaff";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };

interface ConciergeLoginProps {
  onLogin: (employee: ConciergeEmployee) => void;
  onBackToSite: () => void;
}

export function ConciergeLogin({ onLogin, onBackToSite }: ConciergeLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please enter your credentials."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const emp = authenticateConcierge(email, password);
      if (emp) {
        onLogin(emp);
      } else {
        setError("Invalid credentials or access suspended. Contact your administrator.");
      }
    }, 800);
  }

  return (
    <div className="min-h-screen flex" style={{ background:"#04080F", fontFamily:"var(--font-body)" }}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden"
        style={{ background:"linear-gradient(145deg,#0A0F2E 0%,#030710 100%)", borderRight:"1px solid rgba(110,139,255,0.12)" }}>
        {/* Grid */}
        <div className="absolute inset-0" style={{ backgroundImage:"linear-gradient(rgba(110,139,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(110,139,255,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" }}/>
        {/* Orbs */}
        <div style={{ position:"absolute", top:"15%", left:"5%", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(247,147,26,0.08) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"10%", right:"0%", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(110,139,255,0.08) 0%,transparent 70%)", pointerEvents:"none" }}/>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <img src={fpdSquareLogo} alt="FPD" style={{ width:40, height:40, borderRadius:10, objectFit:"contain", boxShadow:"0 0 20px rgba(110,139,255,0.25)" }}/>
            <div>
              <div style={{ ...DISPLAY, color:"#B8C6F5", fontSize:12, fontWeight:700, letterSpacing:"0.06em" }}>FINAL PASS DOWN</div>
              <div style={{ color:"#34456A", fontSize:9, letterSpacing:"0.15em", ...MONO }}>CONCIERGE STAFF PORTAL</div>
            </div>
          </div>

          <Star size={52} color="#F7931A" fill="rgba(247,147,26,0.2)" style={{ marginBottom:24, opacity:0.9 }}/>
          <h1 style={{ ...DISPLAY, fontSize:"clamp(1.8rem,3.5vw,2.6rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:16 }}>
            White Glove<br /><span style={{ color:"#B8C6F5" }}>Concierge Portal</span>
          </h1>
          <p style={{ color:"#6B7FA8", fontSize:14, lineHeight:1.8, maxWidth:340 }}>
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
              style={{ background:"rgba(110,139,255,0.05)", border:"1px solid rgba(110,139,255,0.12)" }}>
              <span style={{ fontSize:16 }}>{item.icon}</span>
              <span style={{ color:"#B8C8E0", fontSize:12 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src={fpdSquareLogo} alt="FPD" style={{ width:36, height:36, borderRadius:8, objectFit:"contain" }}/>
            <div style={{ ...DISPLAY, color:"#B8C6F5", fontSize:12, fontWeight:700, letterSpacing:"0.06em" }}>CONCIERGE PORTAL</div>
          </div>

          <div className="mb-8">
            <h2 style={{ ...DISPLAY, fontSize:26, color:"#E8EDF5", marginBottom:8 }}>Staff Sign In</h2>
            <p style={{ color:"#6B7FA8", fontSize:14 }}>Sign in with the credentials provided by your Final Pass Down administrator.</p>
          </div>

          {/* Demo hint */}
          <div className="mb-5 px-4 py-3 rounded-xl" style={{ background:"rgba(247,147,26,0.08)", border:"1px solid rgba(247,147,26,0.2)" }}>
            <p style={{ color:"#F7931A", fontSize:11, ...MONO }}>DEMO STAFF CREDENTIALS</p>
            <p style={{ color:"#B8C8E0", fontSize:12, marginTop:3 }}>marcus.williams@finalpassdown.com</p>
            <p style={{ color:"#B8C8E0", fontSize:12 }}>patricia.chen@finalpassdown.com</p>
            <p style={{ color:"#B8C8E0", fontSize:12 }}>james.rivera@finalpassdown.com</p>
            <p style={{ color:"#6B7FA8", fontSize:11, marginTop:3 }}>All passwords: Concierge2026!</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
              style={{ background:"rgba(252,129,129,0.1)", border:"1px solid rgba(252,129,129,0.25)" }}>
              <AlertCircle size={14} color="#FC8181"/>
              <span style={{ color:"#FC8181", fontSize:13 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color:"#6B7FA8", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>STAFF EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="yourname@finalpassdown.com"
                className="w-full px-4 py-3.5 rounded-xl"
                style={{ background:"rgba(110,139,255,0.06)", border:"1px solid rgba(110,139,255,0.25)", color:"#E8EDF5", fontSize:14, outline:"none" }}/>
            </div>
            <div>
              <label style={{ color:"#6B7FA8", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>PASSWORD</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full px-4 py-3.5 rounded-xl pr-12"
                  style={{ background:"rgba(110,139,255,0.06)", border:"1px solid rgba(110,139,255,0.25)", color:"#E8EDF5", fontSize:14, outline:"none" }}/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color:"#6B7FA8" }}>
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base mt-2"
              style={{ background:"linear-gradient(135deg,#6E8BFF,#B8C6F5)", color:"#04080F",
                boxShadow:"0 0 28px rgba(110,139,255,0.4)", opacity:loading ? 0.7 : 1 }}>
              {loading ? "Signing in…" : "Sign In to Concierge Portal"}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6">
            <Lock size={11} color="#4A5A7A"/>
            <span style={{ color:"#4A5A7A", fontSize:11 }}>Restricted access · All sessions are logged</span>
          </div>

          <div className="text-center mt-4">
            <button onClick={onBackToSite} style={{ color:"#4A5A7A", fontSize:12 }}>
              ← Back to finalpassdown.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
