import React, { useState, useRef } from "react";
import {
  User, Mail, Phone, Camera, Lock, Shield, CheckCircle,
  Eye, EyeOff, MessageSquare, Key, Bell, Save, AlertCircle,
  Smartphone, FileText, Zap, X
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";

const CARD: React.CSSProperties = { background:"#16161F", border:"1px solid rgba(108,92,231,0.1)", boxShadow:"0 2px 12px rgba(108,92,231,0.06)", borderRadius:16 };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };
const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", color:"#FFFFFF", fontSize:14, outline:"none", borderRadius:12, padding:"10px 14px", width:"100%" };

type TwoFAMethod = "sms" | "email_otp" | "authenticator";
type SettingsTab = "profile" | "security" | "encryption" | "notifications";

const TAB_ICONS: Record<SettingsTab, React.ReactNode> = {
  profile:      <User size={14}/>,
  security:     <Shield size={14}/>,
  encryption:   <Lock size={14}/>,
  notifications:<Bell size={14}/>,
};

/* ── OTP verification modal ─────────────────────────────────────── */
function OTPModal({ method, contact, onVerify, onClose }: {
  method: TwoFAMethod; contact: string; onVerify: () => void; onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  function verify() {
    if (code.length < 6) { toast.error("Please enter the 6-digit code"); return; }
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onVerify();
    }, 900);
  }

  const destination = method === "sms" ? `SMS to ${contact}` :
                      method === "email_otp" ? `email to ${contact}` : "your authenticator app";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-sm rounded-2xl p-7" style={CARD}>
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily:"var(--font-display)", fontSize:17, color:"#FFFFFF" }}>Verify Your Identity</h3>
          <button onClick={onClose} style={{ color:"rgba(255,255,255,0.65)" }}><X size={16}/></button>
        </div>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7, marginBottom:20 }}>
          A 6-digit verification code was sent via {destination}. Enter it below to confirm.
        </p>
        <div style={{ marginBottom:16 }}>
          <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>VERIFICATION CODE</label>
          <input
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="000000" maxLength={6}
            style={{ ...INPUT, textAlign:"center", fontSize:24, letterSpacing:"0.3em", fontFamily:"var(--font-mono)" }}
            autoFocus/>
          <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, textAlign:"center", marginTop:6 }}>
            Demo: any 6 digits will work
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={verify} disabled={verifying}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", opacity:verifying?0.7:1 }}>
            {verifying ? "Verifying…" : "Confirm Code"}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl text-sm"
            style={{ background:"rgba(108,92,231,0.06)", color:"rgba(255,255,255,0.7)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export function AccountSettings() {
  const { user, updateUser } = useDemo();
  const photoRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<SettingsTab>("profile");

  // Profile state
  const [name, setName]     = useState(user.name);
  const [email, setEmail]   = useState(user.email);
  const [phone, setPhone]   = useState(user.phone);
  const [avatar, setAvatar] = useState<string | null>(null); // data URL for photo
  const [saving, setSaving] = useState(false);

  // Security / 2FA state
  const [twoFAEnabled, setTwoFAEnabled]       = useState(false);
  const [twoFAMethod, setTwoFAMethod]         = useState<TwoFAMethod>("email_otp");
  const [showOTPModal, setShowOTPModal]        = useState(false);
  const [pendingMethod, setPendingMethod]      = useState<TwoFAMethod>("email_otp");
  const [showCurrentPw, setShowCurrentPw]     = useState(false);
  const [showNewPw, setShowNewPw]             = useState(false);
  const [currentPw, setCurrentPw]             = useState("");
  const [newPw, setNewPw]                     = useState("");
  const [confirmPw, setConfirmPw]             = useState("");
  const [changingPw, setChangingPw]           = useState(false);

  // Notification state
  const [notifEmail, setNotifEmail]           = useState(true);
  const [notifSMS, setNotifSMS]               = useState(false);
  const [notifPush, setNotifPush]             = useState(true);
  const [notifStorageAlerts, setNotifStorage] = useState(true);
  const [notifContactUpdates, setNotifContact]= useState(true);
  const [notifMarketing, setNotifMarketing]   = useState(false);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { toast.error("Photo must be under 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setAvatar(ev.target?.result as string);
      toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    setSaving(true);
    await updateUser({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setSaving(false);
  }

  function enable2FA(method: TwoFAMethod) {
    setPendingMethod(method);
    setShowOTPModal(true);
  }

  function on2FAVerified() {
    setShowOTPModal(false);
    setTwoFAEnabled(true);
    setTwoFAMethod(pendingMethod);
    const label = pendingMethod === "sms" ? "SMS" : pendingMethod === "email_otp" ? "Email OTP" : "Authenticator App";
    toast.success(`2FA enabled via ${label}`);
  }

  function disable2FA() {
    setTwoFAEnabled(false);
    toast.success("Two-factor authentication disabled");
  }

  function changePassword() {
    if (!currentPw) { toast.error("Enter your current password"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("New passwords don't match"); return; }
    setChangingPw(true);
    setTimeout(() => {
      setChangingPw(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password updated successfully");
    }, 1000);
  }

  const TABS: { id: SettingsTab; label: string }[] = [
    { id:"profile",       label:"Profile" },
    { id:"security",      label:"Security & 2FA" },
    { id:"encryption",    label:"Encryption" },
    { id:"notifications", label:"Notifications" },
  ];

  const methodColor = { sms:"#48BB78", email_otp:"#6C5CE7", authenticator:"#9F7AEA" }[twoFAMethod];

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:800 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#FFFFFF", marginBottom:4 }}>Account Settings</h1>
        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13 }}>Manage your profile, security, encryption, and notification preferences.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"rgba(22,22,31,0.9)", border:"1px solid rgba(108,92,231,0.1)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background:tab===t.id?"#6C5CE7":"transparent", color:tab===t.id?"#fff":"rgba(255,255,255,0.7)" }}>
            {TAB_ICONS[t.id]}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <div className="space-y-5">
          {/* Avatar */}
          <div className="p-6 rounded-2xl" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF", marginBottom:16 }}>Profile Photo</div>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                  style={{ width:88, height:88, background:"rgba(108,92,231,0.1)", border:"3px solid rgba(108,92,231,0.2)" }}>
                  {avatar
                    ? <img src={avatar} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontFamily:"var(--font-display)", fontSize:32, color:"#6C5CE7", fontWeight:700 }}>
                        {user.avatar}
                      </span>
                  }
                </div>
                <button onClick={() => photoRef.current?.click()}
                  className="absolute bottom-0 right-0 flex items-center justify-center rounded-full"
                  style={{ width:28, height:28, background:"#6C5CE7", color:"#fff", border:"2px solid #fff", boxShadow:"0 2px 8px rgba(108,92,231,0.4)" }}>
                  <Camera size={13}/>
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
              </div>
              <div>
                <div style={{ color:"#FFFFFF", fontSize:15, fontWeight:600 }}>{user.name}</div>
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:12, marginTop:2 }}>{user.email}</div>
                <button onClick={() => photoRef.current?.click()}
                  className="flex items-center gap-1.5 mt-3 text-xs px-4 py-2 rounded-xl font-semibold"
                  style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7", border:"1px solid rgba(108,92,231,0.2)" }}>
                  <Camera size={12}/> Change Photo
                </button>
              </div>
            </div>
          </div>

          {/* Profile fields */}
          <div className="p-6 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>Personal Information</div>
            {[
              { label:"FULL NAME",     value:name,  set:setName,  ph:"Your full name",     icon:<User size={14}/>,  type:"text" },
              { label:"EMAIL ADDRESS", value:email, set:setEmail, ph:"your@email.com",      icon:<Mail size={14}/>,  type:"email" },
              { label:"PHONE NUMBER",  value:phone, set:setPhone, ph:"+1 (555) 000-0000",   icon:<Phone size={14}/>, type:"tel" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.65)" }}>{f.icon}</div>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                    style={{ ...INPUT, paddingLeft:40 }}/>
                </div>
              </div>
            ))}
            <button onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF", boxShadow:"0 0 20px rgba(108,92,231,0.3)", opacity:saving?0.7:1 }}>
              <Save size={14}/>{saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ── Security tab ── */}
      {tab === "security" && (
        <div className="space-y-5">

          {/* 2FA status banner */}
          <div className="p-5 rounded-2xl flex items-start gap-4"
            style={{ background:twoFAEnabled?"rgba(72,187,120,0.06)":"rgba(246,173,85,0.06)", border:`1px solid ${twoFAEnabled?"rgba(72,187,120,0.25)":"rgba(246,173,85,0.25)"}` }}>
            {twoFAEnabled
              ? <CheckCircle size={20} color="#48BB78" style={{ flexShrink:0, marginTop:1 }}/>
              : <AlertCircle size={20} color="#F6AD55" style={{ flexShrink:0, marginTop:1 }}/>
            }
            <div>
              <div style={{ color:twoFAEnabled?"#48BB78":"#F6AD55", fontSize:14, fontWeight:700, marginBottom:3 }}>
                {twoFAEnabled ? `Two-Factor Authentication Active — ${twoFAMethod === "sms" ? "SMS" : twoFAMethod === "email_otp" ? "Email OTP" : "Authenticator App"}` : "Two-Factor Authentication Not Enabled"}
              </div>
              <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.7 }}>
                {twoFAEnabled
                  ? "Your account is protected with an extra verification step on every login."
                  : "Add an extra layer of security to your account. Choose SMS or Email OTP — each login will require a verification code."}
              </div>
            </div>
          </div>

          {/* 2FA method selection */}
          <div className="p-6 rounded-2xl space-y-5" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>Two-Factor Authentication (2FA)</div>

            <div className="grid md:grid-cols-3 gap-3">
              {[
                {
                  id:"sms" as TwoFAMethod,
                  icon:<Smartphone size={22}/>,
                  color:"#48BB78",
                  label:"SMS Text Message",
                  desc:"A 6-digit code is sent to your mobile phone number via text message on each login.",
                  tag:"Most convenient",
                },
                {
                  id:"email_otp" as TwoFAMethod,
                  icon:<Mail size={22}/>,
                  color:"#6C5CE7",
                  label:"Email OTP",
                  desc:"A one-time password is sent to your registered email address on each login.",
                  tag:"Recommended",
                },
                {
                  id:"authenticator" as TwoFAMethod,
                  icon:<Key size={22}/>,
                  color:"#9F7AEA",
                  label:"Authenticator App",
                  desc:"Use Google Authenticator or Authy to generate time-based codes without internet.",
                  tag:"Most secure",
                },
              ].map(m => {
                const isActive = twoFAEnabled && twoFAMethod === m.id;
                return (
                  <div key={m.id} className="rounded-2xl p-5 flex flex-col relative"
                    style={{ background:isActive?`${m.color}08`:"#1C1C28", border:`2px solid ${isActive?m.color:"rgba(108,92,231,0.1)"}`, boxShadow:isActive?`0 0 20px ${m.color}15`:"none" }}>
                    {isActive && (
                      <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background:m.color, color:"#fff", ...MONO }}>ACTIVE</div>
                    )}
                    <div style={{ color:m.color, marginBottom:10 }}>{m.icon}</div>
                    <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:700, marginBottom:4 }}>{m.label}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.6, flex:1 }}>{m.desc}</div>
                    <div style={{ color:m.color, fontSize:10, fontWeight:700, ...MONO, marginTop:8 }}>{m.tag}</div>
                    <button
                      onClick={() => isActive ? disable2FA() : enable2FA(m.id)}
                      className="mt-3 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background:isActive?`${m.color}10`:`linear-gradient(135deg,${m.color},${m.color}CC)`,
                        color:isActive?m.color:"#fff",
                        border:isActive?`1px solid ${m.color}30`:"none" }}>
                      {isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                );
              })}
            </div>

            {twoFAEnabled && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background:"rgba(72,187,120,0.06)", border:"1px solid rgba(72,187,120,0.2)" }}>
                <Shield size={13} color="#48BB78"/>
                <span style={{ color:"#48BB78", fontSize:12 }}>
                  2FA is active via <strong>{twoFAMethod === "sms" ? "SMS to " + user.phone : twoFAMethod === "email_otp" ? "Email to " + user.email : "Authenticator App"}</strong>. Every login requires a verification code.
                </span>
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="p-6 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>Change Password</div>
            {[
              { label:"CURRENT PASSWORD", value:currentPw, set:setCurrentPw, show:showCurrentPw, toggle:() => setShowCurrentPw(!showCurrentPw) },
              { label:"NEW PASSWORD",     value:newPw,     set:setNewPw,     show:showNewPw,     toggle:() => setShowNewPw(!showNewPw) },
              { label:"CONFIRM NEW PASSWORD", value:confirmPw, set:setConfirmPw, show:showNewPw, toggle:() => setShowNewPw(!showNewPw) },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color:"rgba(255,255,255,0.7)", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
                <div className="relative">
                  <input type={f.show?"text":"password"} value={f.value} onChange={e => f.set(e.target.value)}
                    placeholder="••••••••••" style={{ ...INPUT, paddingRight:44 }}/>
                  <button type="button" onClick={f.toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"rgba(255,255,255,0.65)" }}>
                    {f.show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            ))}
            {newPw && (
              <div className="h-1.5 rounded-full" style={{ background:"#1C1C28" }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width:`${Math.min(newPw.length * 8, 100)}%`,
                    background: newPw.length < 8 ? "#FC8181" : newPw.length < 12 ? "#F6AD55" : "#48BB78" }}/>
              </div>
            )}
            <button onClick={changePassword} disabled={changingPw}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
              style={{ background:"rgba(108,92,231,0.08)", color:"#6C5CE7", border:"1px solid rgba(108,92,231,0.2)", opacity:changingPw?0.7:1 }}>
              <Lock size={14}/>{changingPw ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      )}

      {/* ── Encryption tab ── */}
      {tab === "encryption" && (
        <div className="space-y-5">
          {/* Active encryption banner */}
          <div className="p-5 rounded-2xl flex items-start gap-4"
            style={{ background:"rgba(72,187,120,0.06)", border:"2px solid rgba(72,187,120,0.3)" }}>
            <div className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width:48, height:48, background:"rgba(72,187,120,0.12)" }}>
              <Lock size={22} color="#48BB78"/>
            </div>
            <div>
              <div style={{ color:"#48BB78", fontSize:15, fontWeight:700, marginBottom:4 }}>
                AES-256 Encryption Active — Always On
              </div>
              <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, lineHeight:1.7 }}>
                Every file you upload is encrypted with AES-256-GCM <strong style={{ color:"#FFFFFF" }}>before it leaves your device</strong>. Every file you download is decrypted <strong style={{ color:"#FFFFFF" }}>only on your device</strong>. No one — not FPD staff, not servers, not anyone — can read your files without your encryption key.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="p-6 rounded-2xl space-y-4" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>How Your Files Are Protected</div>
            <div className="space-y-3">
              {[
                {
                  step:"1", color:"#6C5CE7",
                  title:"Upload — Encrypted Before Sending",
                  desc:"When you upload a file, it is encrypted with AES-256-GCM in your browser before any data is transmitted. The encrypted file travels to FPD servers. The unencrypted original never leaves your device.",
                },
                {
                  step:"2", color:"#9F7AEA",
                  title:"Storage — Encrypted at Rest",
                  desc:"Your files are stored on FPD's Supabase infrastructure in encrypted form only. FPD servers store ciphertext — unreadable without your personal encryption key. Even a complete server breach exposes nothing readable.",
                },
                {
                  step:"3", color:"#48BB78",
                  title:"Download — Decrypted Only on Your Device",
                  desc:"When you or an authorized legacy contact downloads a file, the encrypted ciphertext is sent from the server. Decryption happens locally in the browser using your key. The decrypted file exists only on your device, never on FPD servers.",
                },
                {
                  step:"4", color:"#F7931A",
                  title:"Zero-Knowledge Architecture",
                  desc:"Your encryption key is derived from your master password using PBKDF2 (100,000 iterations, SHA-256). This key is never transmitted to FPD. We mathematically cannot read your files — not even if we wanted to.",
                },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background:"rgba(108,92,231,0.03)", border:"1px solid rgba(108,92,231,0.08)" }}>
                  <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                    style={{ width:32, height:32, background:`${s.color}15`, color:s.color, fontFamily:"var(--font-mono)", fontSize:13 }}>
                    {s.step}
                  </div>
                  <div>
                    <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:600, marginBottom:4 }}>{s.title}</div>
                    <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, lineHeight:1.7 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Encryption stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:"Encryption Standard", value:"AES-256-GCM", color:"#6C5CE7", sub:"Military-grade" },
              { label:"Key Derivation",       value:"PBKDF2",      color:"#9F7AEA", sub:"100,000 iterations" },
              { label:"Architecture",         value:"Zero-Knowledge", color:"#48BB78", sub:"FPD cannot read your data" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl text-center" style={CARD}>
                <div style={{ color:s.color, fontSize:15, fontWeight:700, fontFamily:"var(--font-display)" }}>{s.value}</div>
                <div style={{ color:"#FFFFFF", fontSize:11, fontWeight:500, marginTop:4 }}>{s.label}</div>
                <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10, marginTop:2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Encrypted badge shown on all files */}
          <div className="p-5 rounded-2xl" style={{ background:"rgba(108,92,231,0.04)", border:"1px solid rgba(108,92,231,0.12)" }}>
            <div style={{ color:"#6C5CE7", fontSize:12, fontWeight:700, ...MONO, marginBottom:8 }}>ENCRYPTION STATUS ON ALL YOUR FILES</div>
            <div className="flex flex-wrap gap-2">
              {["Last Will & Testament.pdf","Life Insurance — MetLife.pdf","Video Message to Family.mp4","Crypto Wallet Backup.txt","Bank Account Summary.pdf"].map(f => (
                <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
                  <Lock size={10} color="#48BB78"/>
                  <span style={{ color:"#FFFFFF", fontSize:12 }}>{f}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ background:"rgba(72,187,120,0.15)", color:"#48BB78", ...MONO }}>ENCRYPTED</span>
                </div>
              ))}
            </div>
            <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:10 }}>
              All {/* will use actual count in production */} 14 files in your vault are encrypted. This cannot be disabled.
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications tab ── */}
      {tab === "notifications" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl space-y-5" style={CARD}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"#FFFFFF" }}>Notification Preferences</div>
            {[
              { label:"Email Notifications",        sub:"Receive important updates to your email address",       value:notifEmail,          set:setNotifEmail },
              { label:"SMS Notifications",          sub:"Receive alerts via text message to your phone number",  value:notifSMS,            set:setNotifSMS },
              { label:"Push Notifications",         sub:"In-app and device push notifications",                  value:notifPush,           set:setNotifPush },
              { label:"Storage Alerts",             sub:"Alerts when storage reaches 80%, 90%, and 95%",         value:notifStorageAlerts,  set:setNotifStorage },
              { label:"Contact Updates",            sub:"When legacy contacts verify their ID or access changes", value:notifContactUpdates, set:setNotifContact },
              { label:"Marketing & Product Updates",sub:"News about new features and FPD announcements",         value:notifMarketing,      set:setNotifMarketing },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-3 border-b"
                style={{ borderColor:"rgba(108,92,231,0.07)" }}>
                <div>
                  <div style={{ color:"#FFFFFF", fontSize:13, fontWeight:500 }}>{n.label}</div>
                  <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11, marginTop:2 }}>{n.sub}</div>
                </div>
                <button onClick={() => { n.set(!n.value); toast.success(`${n.label} ${!n.value?"enabled":"disabled"}`); }}
                  className="relative rounded-full transition-all flex-shrink-0"
                  style={{ width:44, height:24, background:n.value?"#6C5CE7":"rgba(108,92,231,0.15)", border:`1px solid ${n.value?"#6C5CE7":"rgba(108,92,231,0.25)"}`, boxShadow:n.value?"0 0 12px rgba(108,92,231,0.3)":"none" }}>
                  <div className="absolute top-1 rounded-full transition-all"
                    style={{ width:16, height:16, background:"#16161F", left:n.value?24:4 }}/>
                </button>
              </div>
            ))}
            <button onClick={() => toast.success("Notification preferences saved")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#FFFFFF" }}>
              <Save size={14}/> Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* OTP verification modal */}
      {showOTPModal && (
        <OTPModal
          method={pendingMethod}
          contact={pendingMethod === "sms" ? user.phone : user.email}
          onVerify={on2FAVerified}
          onClose={() => setShowOTPModal(false)}
        />
      )}
    </div>
  );
}
