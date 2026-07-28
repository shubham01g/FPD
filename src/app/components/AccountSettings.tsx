import React, { useState, useRef } from "react";
import {
  User, Mail, Phone, Camera, Lock, Shield, CheckCircle,
  Eye, EyeOff, MessageSquare, Key, Bell, Save, AlertCircle,
  Smartphone, FileText, Zap, X
} from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

type TwoFAMethod = "sms" | "email_otp" | "authenticator";
type SettingsTab = "profile" | "security" | "encryption" | "notifications";

const TAB_ICONS: Record<SettingsTab, React.ReactNode> = {
  profile:      <User size={14}/>,
  security:     <Shield size={14}/>,
  encryption:   <Lock size={14}/>,
  notifications:<Bell size={14}/>,
};

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-acct so nothing else in the app is affected. */
const ACCT_CSS = `
.fpd-acct{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-acct *{box-sizing:border-box;}
.fpd-acct-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-acct .wrap{max-width:900px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-acct .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-acct .card.pad{padding:28px;}
.fpd-acct .sec-title{font-size:19px;font-weight:600;color:${TEXT};font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-acct .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-acct .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-acct .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-acct .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}
.fpd-acct .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-acct .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-acct .btn-primary:disabled{opacity:.65;cursor:default;transform:none;}
.fpd-acct .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:#6FAE8B;font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-acct .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-acct .btn-ghost:disabled{opacity:.6;cursor:default;}
.fpd-acct .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-acct .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-acct .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-acct .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* KPI ledger */
.fpd-acct .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:22px;}
.fpd-acct .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.08);position:relative;text-align:left;overflow:hidden;}
.fpd-acct .kcell:first-child{border-left:none;}
.fpd-acct .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-acct .kcell .klbl{font-size:12px;font-weight:600;color:${MUTED};}
.fpd-acct .kcell .kico{width:27px;height:27px;border-radius:16px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-acct .kcell .kval{font-family:var(--font-display);font-size:27.5px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-acct .kcell .ksub{font-size:14.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-acct .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:760px){.fpd-acct .kstrip{grid-template-columns:1fr 1fr;}.fpd-acct .kcell:nth-child(3){border-left:none;}.fpd-acct .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}}

/* fields */
.fpd-acct .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-acct .field input,.fpd-acct .field select,.fpd-acct .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-acct .field input::placeholder,.fpd-acct .field textarea::placeholder{color:${FAINT};}
.fpd-acct .field input:focus,.fpd-acct .field select:focus,.fpd-acct .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-acct .icon-field{position:relative;}
.fpd-acct .icon-field .ic{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:${MUTED};display:flex;pointer-events:none;}
.fpd-acct .icon-field input{padding-left:40px;}
.fpd-acct .pw-toggle{position:absolute;right:13px;top:50%;transform:translateY(-50%);background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-acct .pwbar-track{height:6px;border-radius:99px;background:#0F1624;overflow:hidden;}
.fpd-acct .pwbar-fill{height:100%;border-radius:99px;transition:width .2s;}

/* avatar */
.fpd-acct .avatar-row{display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.fpd-acct .avatar-circle{width:88px;height:88px;border-radius:50%;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:3px solid rgba(91,110,225,0.24);position:relative;}
.fpd-acct .avatar-circle img{width:100%;height:100%;object-fit:cover;}
.fpd-acct .avatar-init{font-family:var(--font-display);font-size:40.5px;font-weight:700;color:#6FAE8B;}
.fpd-acct .avatar-cam{position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;border:2px solid #0A0F1A;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px -2px rgba(91,110,225,0.65);}
.fpd-acct .avatar-name{color:${TEXT};font-size:19px;font-weight:600;}
.fpd-acct .avatar-email{color:${MUTED};font-size:15px;margin-top:2px;}

/* banners */
.fpd-acct .banner{display:flex;align-items:flex-start;gap:14px;padding:16px 18px;border-radius:16px;}
.fpd-acct .banner.pos{background:rgba(95,190,145,0.06);border:1px solid rgba(95,190,145,0.26);}
.fpd-acct .banner.warn{background:rgba(217,165,94,0.06);border:1px solid rgba(217,165,94,0.26);}
.fpd-acct .banner .bicon{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fpd-acct .banner .btitle{font-size:17.5px;font-weight:700;margin-bottom:3px;}
.fpd-acct .banner .btext{color:${MUTED};font-size:15.5px;line-height:1.7;margin:0;}

/* 2FA method cards */
.fpd-acct .mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.fpd-acct .mcard{padding:18px;border-radius:18px;position:relative;display:flex;flex-direction:column;background:#0F1624;border:2px solid rgba(255,255,255,0.08);transition:border-color .18s;}
.fpd-acct .mcard.active{background:rgba(91,110,225,0.05);}
.fpd-acct .mcard .mtag-active{position:absolute;top:-11px;left:16px;padding:2px 9px;border-radius:99px;font-family:var(--font-mono);font-size:12px;font-weight:700;color:#fff;}
.fpd-acct .mcard .micon{margin-bottom:10px;}
.fpd-acct .mcard .mlabel{color:${TEXT};font-size:16px;font-weight:700;margin-bottom:4px;}
.fpd-acct .mcard .mdesc{color:${MUTED};font-size:15px;line-height:1.6;flex:1;}
.fpd-acct .mcard .mtagline{font-family:var(--font-mono);font-size:12.5px;font-weight:700;margin-top:8px;}
.fpd-acct .mcard .mbtn{margin-top:12px;padding:9px;border-radius:18px;font-size:15px;font-weight:700;border:none;cursor:pointer;font-family:var(--font-body);transition:filter .18s;}
.fpd-acct .mcard .mbtn:hover{filter:brightness(1.1);}
@media (max-width:760px){.fpd-acct .mgrid{grid-template-columns:1fr;}}

.fpd-acct .active-note{display:flex;align-items:center;gap:9px;padding:11px 15px;border-radius:16px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.22);color:#D99A6B;font-size:15px;}
.fpd-acct .active-note strong{font-weight:700;}

/* steps (encryption how-it-works) */
.fpd-acct .steps{display:flex;flex-direction:column;gap:10px;}
.fpd-acct .step{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-acct .step .snum{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:15px;font-weight:700;flex-shrink:0;}
.fpd-acct .step .stitle{color:${TEXT};font-size:16px;font-weight:600;margin-bottom:4px;}
.fpd-acct .step .sdesc{color:${MUTED};font-size:15px;line-height:1.7;}

/* encryption stat trio */
.fpd-acct .stat3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.fpd-acct .stat3 .scell{padding:16px;text-align:center;}
.fpd-acct .stat3 .sval{font-family:var(--font-display);font-size:19px;font-weight:700;}
.fpd-acct .stat3 .slbl{color:${TEXT};font-size:14px;font-weight:500;margin-top:4px;}
.fpd-acct .stat3 .ssub{color:${MUTED};font-size:12.5px;margin-top:2px;}
@media (max-width:700px){.fpd-acct .stat3{grid-template-columns:1fr;}}

/* encrypted file chips */
.fpd-acct .filetag{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:18px;background:rgba(95,190,145,0.07);border:1px solid rgba(95,190,145,0.22);color:${TEXT};font-size:15px;}
.fpd-acct .filetag .fbadge{padding:2px 6px;border-radius:5px;font-family:var(--font-mono);font-size:12px;font-weight:700;background:rgba(95,190,145,0.16);color:#D99A6B;}

/* notification rows */
.fpd-acct .nrow{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);gap:16px;}
.fpd-acct .nrow:last-of-type{border-bottom:none;}
.fpd-acct .nlabel{color:${TEXT};font-size:16px;font-weight:500;}
.fpd-acct .nsub{color:${MUTED};font-size:14.5px;margin-top:2px;}

/* toggle switch */
.fpd-acct .toggle{position:relative;width:44px;height:24px;border-radius:99px;flex-shrink:0;border:1px solid;cursor:pointer;transition:background .18s,border-color .18s;padding:0;}
.fpd-acct .toggle .thumb{position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#0A0F1A;transition:left .18s;}

/* modal */
.fpd-acct .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-acct .modal{width:100%;max-width:400px;}
.fpd-acct .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-acct .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-acct .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-acct .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-acct .modal-body p{margin:0;}
.fpd-acct .code-input{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};outline:none;font-family:var(--font-mono);text-align:center;font-size:30px;letter-spacing:0.3em;transition:border-color .18s,box-shadow .18s;}
.fpd-acct .code-input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-acct .demo-note{color:${MUTED};font-size:14px;text-align:center;margin-top:8px;}
.fpd-acct .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-acct .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-acct .modal-foot .save:hover{filter:brightness(1.08);}
.fpd-acct .modal-foot .save:disabled{opacity:.7;cursor:default;}
`;

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
    <div className="backdrop">
      <div className="card modal">
        <div className="modal-head">
          <h3>Verify Your Identity</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.7 }}>
            A 6-digit verification code was sent via {destination}. Enter it below to confirm.
          </p>
          <div className="field">
            <label>VERIFICATION CODE</label>
            <input
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
              placeholder="000000" maxLength={6}
              className="code-input"
              autoFocus/>
            <div className="demo-note">Demo: any 6 digits will work</div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="save" onClick={verify} disabled={verifying}>
            {verifying ? "Verifying…" : "Confirm Code"}
          </button>
          <button className="btn-sec" onClick={onClose}>Cancel</button>
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

  const methodColor = { sms:POS, email_otp:ACCENT, authenticator:ACCENT2 }[twoFAMethod];

  // ── KPI ledger (pure display, derived from existing state) ──
  const profileFieldsFilled = [name, email, phone].filter(v => v.trim().length > 0).length;
  const notifEnabledCount = [notifEmail, notifSMS, notifPush, notifStorageAlerts, notifContactUpdates, notifMarketing].filter(Boolean).length;
  const kpis = [
    { label:"Profile", value:`${profileFieldsFilled}/3`, sub:"Fields complete", icon:<User size={14}/>, dot: profileFieldsFilled === 3 ? POS : ACCENT2 },
    { label:"Two-Factor Auth", value: twoFAEnabled ? "Active" : "Off", sub: twoFAEnabled ? (twoFAMethod === "sms" ? "Via SMS" : twoFAMethod === "email_otp" ? "Via Email OTP" : "Via Authenticator") : "Not enabled", icon:<Shield size={14}/>, dot: twoFAEnabled ? POS : WARN },
    { label:"Encryption", value:"AES-256", sub:"Always on", icon:<Lock size={14}/>, dot:POS },
    { label:"Notifications", value:`${notifEnabledCount}/6`, sub:"Channels enabled", icon:<Bell size={14}/>, dot:ACCENT2 },
  ];

  return (
    <div className="fpd-acct">
      <style dangerouslySetInnerHTML={{ __html: ACCT_CSS }} />
      <div className="fpd-acct-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Shield size={12} /> Account &amp; Security</div>
            <h1 className="pg-h1">Account Settings</h1>
            <div className="pg-sub">Manage your profile, security, encryption, and notification preferences.</div>
          </div>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div className="seg">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {TAB_ICONS[t.id]}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Avatar */}
            <div className="card pad">
              <h3 className="sec-title">Profile Photo</h3>
              <div className="avatar-row">
                <div className="avatar-circle">
                  {avatar
                    ? <img src={avatar} alt="Profile" />
                    : <span className="avatar-init">{user.avatar}</span>
                  }
                  <button className="avatar-cam" onClick={() => photoRef.current?.click()}>
                    <Camera size={13}/>
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                </div>
                <div>
                  <div className="avatar-name">{user.name}</div>
                  <div className="avatar-email">{user.email}</div>
                  <button onClick={() => photoRef.current?.click()} className="btn-ghost" style={{ marginTop: 12 }}>
                    <Camera size={12}/> Change Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Profile fields */}
            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 className="sec-title">Personal Information</h3>
              {[
                { label:"FULL NAME",     value:name,  set:setName,  ph:"Your full name",     icon:<User size={14}/>,  type:"text" },
                { label:"EMAIL ADDRESS", value:email, set:setEmail, ph:"your@email.com",      icon:<Mail size={14}/>,  type:"email" },
                { label:"PHONE NUMBER",  value:phone, set:setPhone, ph:"+1 (555) 000-0000",   icon:<Phone size={14}/>, type:"tel" },
              ].map(f => (
                <div key={f.label} className="field">
                  <label>{f.label}</label>
                  <div className="icon-field">
                    <span className="ic">{f.icon}</span>
                    <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                  </div>
                </div>
              ))}
              <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ width: "fit-content" }}>
                <Save size={14}/>{saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* 2FA status banner */}
            <div className={`banner ${twoFAEnabled ? "pos" : "warn"}`}>
              {twoFAEnabled
                ? <CheckCircle size={20} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }}/>
                : <AlertCircle size={20} color={WARN} style={{ flexShrink: 0, marginTop: 1 }}/>
              }
              <div>
                <div className="btitle" style={{ color: twoFAEnabled ? "#D99A6B" : WARN }}>
                  {twoFAEnabled ? `Two-Factor Authentication Active — ${twoFAMethod === "sms" ? "SMS" : twoFAMethod === "email_otp" ? "Email OTP" : "Authenticator App"}` : "Two-Factor Authentication Not Enabled"}
                </div>
                <p className="btext">
                  {twoFAEnabled
                    ? "Your account is protected with an extra verification step on every login."
                    : "Add an extra layer of security to your account. Choose SMS or Email OTP — each login will require a verification code."}
                </p>
              </div>
            </div>

            {/* 2FA method selection */}
            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h3 className="sec-title" style={{ marginBottom: 0 }}>Two-Factor Authentication (2FA)</h3>

              <div className="mgrid">
                {[
                  {
                    id:"sms" as TwoFAMethod,
                    icon:<Smartphone size={22}/>,
                    color:"#D99A6B",
                    label:"SMS Text Message",
                    desc:"A 6-digit code is sent to your mobile phone number via text message on each login.",
                    tag:"Most convenient",
                  },
                  {
                    id:"email_otp" as TwoFAMethod,
                    icon:<Mail size={22}/>,
                    color:"#6E90C9",
                    label:"Email OTP",
                    desc:"A one-time password is sent to your registered email address on each login.",
                    tag:"Recommended",
                  },
                  {
                    id:"authenticator" as TwoFAMethod,
                    icon:<Key size={22}/>,
                    color:"#6FAE8B",
                    label:"Authenticator App",
                    desc:"Use Google Authenticator or Authy to generate time-based codes without internet.",
                    tag:"Most secure",
                  },
                ].map(m => {
                  const isActive = twoFAEnabled && twoFAMethod === m.id;
                  return (
                    <div key={m.id} className={`mcard${isActive ? " active" : ""}`}
                      style={{ borderColor: isActive ? m.color : undefined }}>
                      {isActive && (
                        <div className="mtag-active" style={{ background: m.color }}>ACTIVE</div>
                      )}
                      <div className="micon" style={{ color: m.color }}>{m.icon}</div>
                      <div className="mlabel">{m.label}</div>
                      <div className="mdesc">{m.desc}</div>
                      <div className="mtagline" style={{ color: m.color }}>{m.tag}</div>
                      <button
                        onClick={() => isActive ? disable2FA() : enable2FA(m.id)}
                        className="mbtn"
                        style={{ background:isActive?`${m.color}18`:m.color,
                          color:isActive?m.color:"#fff",
                          border:isActive?`1px solid ${m.color}40`:"none" }}>
                        {isActive ? "Disable" : "Enable"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {twoFAEnabled && (
                <div className="active-note">
                  <Shield size={13} color="#FFFFFF"/>
                  <span>
                    2FA is active via <strong>{twoFAMethod === "sms" ? "SMS to " + user.phone : twoFAMethod === "email_otp" ? "Email to " + user.email : "Authenticator App"}</strong>. Every login requires a verification code.
                  </span>
                </div>
              )}
            </div>

            {/* Change password */}
            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 className="sec-title" style={{ marginBottom: 0 }}>Change Password</h3>
              {[
                { label:"CURRENT PASSWORD", value:currentPw, set:setCurrentPw, show:showCurrentPw, toggle:() => setShowCurrentPw(!showCurrentPw) },
                { label:"NEW PASSWORD",     value:newPw,     set:setNewPw,     show:showNewPw,     toggle:() => setShowNewPw(!showNewPw) },
                { label:"CONFIRM NEW PASSWORD", value:confirmPw, set:setConfirmPw, show:showNewPw, toggle:() => setShowNewPw(!showNewPw) },
              ].map(f => (
                <div key={f.label} className="field">
                  <label>{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <input type={f.show?"text":"password"} value={f.value} onChange={e => f.set(e.target.value)}
                      placeholder="••••••••••" style={{ paddingRight: 44 }}/>
                    <button type="button" onClick={f.toggle} className="pw-toggle">
                      {f.show ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
              ))}
              {newPw && (
                <div className="pwbar-track">
                  <div className="pwbar-fill"
                    style={{ width:`${Math.min(newPw.length * 8, 100)}%`,
                      background: newPw.length < 8 ? NEG : newPw.length < 12 ? WARN : POS }}/>
                </div>
              )}
              <button onClick={changePassword} disabled={changingPw} className="btn-ghost" style={{ width: "fit-content" }}>
                <Lock size={14}/>{changingPw ? "Updating…" : "Update Password"}
              </button>
            </div>
          </div>
        )}

        {/* ── Encryption tab ── */}
        {tab === "encryption" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Active encryption banner */}
            <div className="banner pos" style={{ border: "2px solid rgba(95,190,145,0.3)" }}>
              <div className="bicon" style={{ background: "rgba(95,190,145,0.12)" }}>
                <Lock size={22} color="#FFFFFF"/>
              </div>
              <div>
                <div className="btitle" style={{ color: "#D99A6B" }}>
                  AES-256 Encryption Active — Always On
                </div>
                <p className="btext">
                  Every file you upload is encrypted with AES-256-GCM <strong style={{ color: TEXT }}>before it leaves your device</strong>. Every file you download is decrypted <strong style={{ color: TEXT }}>only on your device</strong>. No one — not FPD staff, not servers, not anyone — can read your files without your encryption key.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="card pad">
              <h3 className="sec-title">How Your Files Are Protected</h3>
              <div className="steps">
                {[
                  {
                    step:"1", color:"#6E90C9",
                    title:"Upload — Encrypted Before Sending",
                    desc:"When you upload a file, it is encrypted with AES-256-GCM in your browser before any data is transmitted. The encrypted file travels to FPD servers. The unencrypted original never leaves your device.",
                  },
                  {
                    step:"2", color:"#6FAE8B",
                    title:"Storage — Encrypted at Rest",
                    desc:"Your files are stored on FPD's Supabase infrastructure in encrypted form only. FPD servers store ciphertext — unreadable without your personal encryption key. Even a complete server breach exposes nothing readable.",
                  },
                  {
                    step:"3", color:"#D99A6B",
                    title:"Download — Decrypted Only on Your Device",
                    desc:"When you or an authorized legacy contact downloads a file, the encrypted ciphertext is sent from the server. Decryption happens locally in the browser using your key. The decrypted file exists only on your device, never on FPD servers.",
                  },
                  {
                    step:"4", color:WARN,
                    title:"Zero-Knowledge Architecture",
                    desc:"Your encryption key is derived from your master password using PBKDF2 (100,000 iterations, SHA-256). This key is never transmitted to FPD. We mathematically cannot read your files — not even if we wanted to.",
                  },
                ].map(s => (
                  <div key={s.step} className="step">
                    <div className="snum" style={{ background: `${s.color}22`, color: s.color }}>
                      {s.step}
                    </div>
                    <div>
                      <div className="stitle">{s.title}</div>
                      <div className="sdesc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Encryption stats */}
            <div className="stat3">
              {[
                { label:"Encryption Standard", value:"AES-256-GCM", color:"#6E90C9", sub:"Military-grade" },
                { label:"Key Derivation",       value:"PBKDF2",      color:"#6FAE8B", sub:"100,000 iterations" },
                { label:"Architecture",         value:"Zero-Knowledge", color:"#D99A6B", sub:"FPD cannot read your data" },
              ].map(s => (
                <div key={s.label} className="card scell">
                  <div className="sval" style={{ color: s.color }}>{s.value}</div>
                  <div className="slbl">{s.label}</div>
                  <div className="ssub">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Encrypted badge shown on all files */}
            <div className="card pad">
              <div className="eyebrow" style={{ marginBottom: 10 }}>ENCRYPTION STATUS ON ALL YOUR FILES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Last Will & Testament.pdf","Life Insurance — MetLife.pdf","Video Message to Family.mp4","Crypto Wallet Backup.txt","Bank Account Summary.pdf"].map(f => (
                  <div key={f} className="filetag">
                    <Lock size={10} color="#FFFFFF"/>
                    <span>{f}</span>
                    <span className="fbadge">ENCRYPTED</span>
                  </div>
                ))}
              </div>
              <div style={{ color: MUTED, fontSize: 14, marginTop: 10 }}>
                All {/* will use actual count in production */} 14 files in your vault are encrypted. This cannot be disabled.
              </div>
            </div>
          </div>
        )}

        {/* ── Notifications tab ── */}
        {tab === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="card pad">
              <h3 className="sec-title">Notification Preferences</h3>
              {[
                { label:"Email Notifications",        sub:"Receive important updates to your email address",       value:notifEmail,          set:setNotifEmail },
                { label:"SMS Notifications",          sub:"Receive alerts via text message to your phone number",  value:notifSMS,            set:setNotifSMS },
                { label:"Push Notifications",         sub:"In-app and device push notifications",                  value:notifPush,           set:setNotifPush },
                { label:"Storage Alerts",             sub:"Alerts when storage reaches 80%, 90%, and 95%",         value:notifStorageAlerts,  set:setNotifStorage },
                { label:"Contact Updates",            sub:"When legacy contacts verify their ID or access changes", value:notifContactUpdates, set:setNotifContact },
                { label:"Marketing & Product Updates",sub:"News about new features and FPD announcements",         value:notifMarketing,      set:setNotifMarketing },
              ].map(n => (
                <div key={n.label} className="nrow">
                  <div>
                    <div className="nlabel">{n.label}</div>
                    <div className="nsub">{n.sub}</div>
                  </div>
                  <button onClick={() => { n.set(!n.value); toast.success(`${n.label} ${!n.value?"enabled":"disabled"}`); }}
                    className="toggle"
                    style={{ background:n.value?"rgba(91,110,225,0.85)":"rgba(255,255,255,0.06)", borderColor:n.value?ACCENT:"rgba(255,255,255,0.14)" }}>
                    <div className="thumb" style={{ left:n.value?24:4 }}/>
                  </button>
                </div>
              ))}
              <button onClick={() => toast.success("Notification preferences saved")}
                className="btn-primary" style={{ marginTop: 6, width: "fit-content" }}>
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
    </div>
  );
}
