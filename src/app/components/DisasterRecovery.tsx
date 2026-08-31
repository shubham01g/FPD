import React, { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldAlert, ShieldOff, Download, AlertTriangle,
  Clock, CheckCircle, FileArchive, Lock, Unlock, RefreshCw,
  Bell, ChevronDown, ChevronUp, HardDrive, Zap, ExternalLink,
  Copy, X, Info, ArrowRight, Package, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import heroDisasterRecoveryPhoto from "../../imports/disasterrecovery_storm_photo.png";
import wildfireDisasterPhoto from "../../imports/disasterrecovery_wildfire_photo.png";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes, wills & account settings) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-dr so nothing else in the app is affected. */
const DR_CSS = `
.fpd-dr{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(217,165,94,0.08),transparent 70%);}
.fpd-dr *{box-sizing:border-box;}
.fpd-dr-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-dr .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* hero banner — full-bleed photo, tinted toward the brand palette via a gradient layered in the JSX backgroundImage */
.fpd-dr .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-dr .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-dr .hbanner:hover .art{transform:scale(1.08);}
.fpd-dr .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.9) 34%,rgba(7,10,18,0.5) 62%,rgba(7,10,18,0.15) 100%);pointer-events:none;}
.fpd-dr .hbanner .hcontent{position:relative;z-index:2;padding:28px 34px;display:flex;flex-direction:column;justify-content:center;max-width:520px;}
.fpd-dr .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-dr .hbanner h1{font-family:var(--font-display);font-size:32px;font-weight:700;line-height:1.16;letter-spacing:-0.02em;margin:0 0 8px;color:${TEXT};}
.fpd-dr .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-dr .hbanner p{color:${SOFT};font-size:16px;line-height:1.6;max-width:420px;margin:0;}
@media (max-width:640px){.fpd-dr .hbanner{min-height:auto;} .fpd-dr .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-dr .hbanner h1{font-size:26px;}}

.fpd-dr .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-dr .card.pad{padding:26px;}
.fpd-dr .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-dr .pg-h1{font-size:28px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-dr .pg-sub{color:${MUTED};font-size:15.5px;max-width:640px;line-height:1.7;}

.fpd-dr .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;font-size:15px;font-weight:700;box-shadow:0 3px 8px -4px rgba(91,110,225,0.3);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-dr .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-dr .btn-primary:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.fpd-dr .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(91,110,225,0.1);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-dr .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-dr .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* demo banner */
.fpd-dr .demo-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:16px 20px;border-radius:18px;background:rgba(91,110,225,0.06);border:1px dashed rgba(91,110,225,0.4);}
.fpd-dr .demo-tag{font-family:var(--font-mono);font-size:13px;font-weight:700;letter-spacing:0.06em;color:#6FAE8B;margin-bottom:4px;}
.fpd-dr .demo-text{color:${MUTED};font-size:14.5px;line-height:1.6;}
.fpd-dr .demo-acts{display:flex;gap:8px;flex-wrap:wrap;}

/* how it works */
.fpd-dr .ggrid{display:grid;grid-template-columns:1fr;gap:0;}
.fpd-dr .gcard{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.fpd-dr .gcard:last-child{border-bottom:none;padding-bottom:0;}
.fpd-dr .gnum{font-family:var(--font-mono);font-size:12px;color:${MUTED};font-weight:700;min-width:26px;padding-top:2px;}
.fpd-dr .gtitle{color:${TEXT};font-size:14.5px;font-weight:600;margin-bottom:3px;}
.fpd-dr .gdesc{color:${MUTED};font-size:14px;line-height:1.6;}

/* pricing cards */
.fpd-dr .pricegrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:400px;}
.fpd-dr .pricecard{padding:16px;border-radius:14px;text-align:center;background:#0F1624;border:1.5px solid rgba(255,255,255,0.08);}
.fpd-dr .pricecard.hi{background:rgba(91,110,225,0.08);border-color:rgba(91,110,225,0.35);}

/* category rows */
.fpd-dr .catrow{display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;cursor:pointer;transition:all .15s;background:#0F1624;border:1px solid rgba(255,255,255,0.06);}
.fpd-dr .catrow.on{background:rgba(91,110,225,0.08);border-color:rgba(91,110,225,0.3);}

/* countdown banner */
.fpd-dr .countdown{border-radius:18px;padding:22px 26px;color:#fff;}
.fpd-dr .countdown .digits{font-family:var(--font-display);font-size:34px;letter-spacing:2px;}

/* modal */
.fpd-dr .backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.8);backdrop-filter:blur(8px);}
.fpd-dr .modal{width:100%;max-width:460px;max-height:92vh;overflow-y:auto;background:#101728;border-radius:22px;border:1px solid rgba(255,255,255,0.08);}
.fpd-dr .modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 22px;background:linear-gradient(135deg,#7E6BD8,${ACCENT});}
.fpd-dr .modal-head-title{color:#fff;font-weight:700;font-size:15px;}
.fpd-dr .modal-head-sub{color:rgba(255,255,255,0.75);font-size:12px;}
.fpd-dr .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-dr .field label{display:block;margin-bottom:5px;font-size:11px;font-weight:600;color:${MUTED};font-family:var(--font-mono);letter-spacing:0.05em;}
.fpd-dr .field input{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1.5px solid rgba(91,110,225,0.3);color:${TEXT};font-size:14px;outline:none;font-family:var(--font-body);}
.fpd-dr .field input:focus{border-color:rgba(91,110,225,0.6);}
.fpd-dr .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
`;

/* ── types ───────────────────────────────────────────────────────── */
type BypassState = "locked" | "active" | "expired";
type ExportPhase = "idle" | "generating" | "ready";

interface BypassSession {
  activatedAt: number; // timestamp ms
  expiresAt: number;
  activatedBy: string;
  reason: string;
  downloadLimit: number; // GB
}

interface FileCategory {
  id: string;
  label: string;
  icon: string;
  sizeGB: number;
  count: number;
  selected: boolean;
}

/* ── server-authoritative bypass state ───────────────────────────── */
// The add-on flag and the 48-hour emergency window used to live in
// localStorage, which meant a user could unlock the vault export from
// devtools. Both now come from disaster_recovery_state, which grants the owner
// SELECT and has no user write policy — only the service-role admin backend
// (routes/entitlements.ts) can open or revoke a window.

const DEFAULT_DOWNLOAD_LIMIT_GB = 100;

function useBypassState() {
  const { authUser } = useAuth();
  const [session, setSession] = useState<BypassSession | null>(null);
  const [addonActive, setAddonActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authUser) { setSession(null); setAddonActive(false); setLoading(false); return; }

    const { data, error } = await db.getDisasterRecoveryState(authUser.id);
    // No row is the normal "never purchased the add-on" case. On a real error
    // we stay locked — failing closed is the only safe default for a gate that
    // releases the whole vault.
    if (error || !data) { setSession(null); setAddonActive(false); setLoading(false); return; }

    setAddonActive(data.addon_active);
    setSession(
      data.bypass_granted && data.bypass_expires_at
        ? {
            activatedAt: data.bypass_granted_at ? Date.parse(data.bypass_granted_at) : Date.now(),
            expiresAt: Date.parse(data.bypass_expires_at),
            activatedBy: "Master Admin",
            reason: data.bypass_reason ?? "Emergency Access Request",
            downloadLimit: DEFAULT_DOWNLOAD_LIMIT_GB,
          }
        : null,
    );
    setLoading(false);
  }, [authUser]);

  // Re-read so an admin-granted window appears without a reload. Slower than
  // the old 1.5s localStorage poll because this is a network round trip.
  useEffect(() => {
    void load();
    const id = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const bypassState: BypassState =
    !session ? "locked"
    : Date.now() < session.expiresAt ? "active"
    : "expired";

  return { session, bypassState, addonActive, loading, refresh: load };
}

/* ── countdown hook ──────────────────────────────────────────────── */
function useCountdown(expiresAt: number | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, expiresAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const pct = expiresAt
    ? ((expiresAt - Date.now()) / (48 * 3_600_000)) * 100
    : 0;
  return { h, m, s, remaining, pct: Math.max(0, Math.min(100, pct)) };
}

/* ── initial file categories ─────────────────────────────────────── */
const INIT_CATEGORIES: FileCategory[] = [
  { id:"docs",     label:"Legal Documents",   icon:"⚖️",  sizeGB:2.1,  count:47,  selected:true },
  { id:"medical",  label:"Medical Records",   icon:"🏥",  sizeGB:3.8,  count:112, selected:true },
  { id:"finance",  label:"Financial Records", icon:"💰",  sizeGB:1.2,  count:88,  selected:true },
  { id:"assets",   label:"Personal Assets",   icon:"🏠",  sizeGB:4.4,  count:63,  selected:true },
  { id:"media",    label:"Family Memories",   icon:"📷",  sizeGB:38.6, count:924, selected:true },
  { id:"diary",    label:"Digital Diary",     icon:"📖",  sizeGB:1.8,  count:203, selected:false },
  { id:"contacts", label:"Contacts & Wishes", icon:"❤️",  sizeGB:0.3,  count:29,  selected:true },
  { id:"passwords",label:"Password Manager",  icon:"🔐",  sizeGB:0.1,  count:156, selected:false },
];

/* ── inline purchase modal ─────────────────────────────────────────── */
function DRPurchaseModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [billing, setBilling] = useState<"monthly"|"annual">("annual");
  const [step, setStep] = useState<"select"|"pay"|"done"|"bypass">("select");
  const [cardNum, setCardNum]   = useState("4242424242424242");
  const [cardName, setCardName] = useState("James Doe");
  const [expiry, setExpiry]     = useState("12/28");
  const [cvv, setCvv]           = useState("424");
  const [loading, setLoading]   = useState(false);

  // The add-on becomes active when the processor's webhook records the payment
  // against disaster_recovery_state. The client cannot set that flag — it has
  // SELECT on the row and nothing more — so all this does is re-read once the
  // simulated charge settles.
  const handlePay = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    setLoading(false);
    onSuccess();
    setStep("done");
  };

  return (
    <div className="backdrop">
      <div className="modal">
        <div className="modal-head">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} color="#fff"/>
            <div>
              <div className="modal-head-title">Disaster Recovery Protection</div>
              <div className="modal-head-sub">Platform Add-On</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:8, padding:6, cursor:"pointer", color:"#fff" }}><X size={16}/></button>
        </div>

        <div className="demo-banner" style={{ borderRadius:0, border:"none", borderBottom:"1px dashed rgba(91,110,225,0.25)" }}>
          <div className="demo-text" style={{ padding:"2px 0" }}>
            {step==="select" && "Choose a billing period, then continue to the pre-filled payment form."}
            {step==="pay"    && "Card is pre-filled with Stripe test credentials. Click Pay to complete instantly."}
            {step==="done"   && "Add-on purchased. A Master Admin opens the emergency window on request."}
            {step==="bypass" && "Bypass activated — close to see your Emergency Recovery Dashboard unlock."}
          </div>
        </div>

        <div className="modal-body">
          {step === "select" && (<>
            <div className="row2">
              {(["monthly","annual"] as const).map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding:"14px 12px", borderRadius:12, cursor:"pointer", textAlign:"center",
                  border:`2px solid ${billing===b ? ACCENT : "rgba(255,255,255,0.1)"}`,
                  background: billing===b ? "rgba(91,110,225,0.1)" : "#0F1624" }}>
                  <div style={{ fontSize:11, color:MUTED, ...MONO, marginBottom:4 }}>{b.toUpperCase()}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:billing===b ? ACCENT2 : TEXT }}>
                    ${b==="annual"?"3.99":"4.99"}<span style={{ fontSize:12, fontWeight:400, color:MUTED }}>/mo</span>
                  </div>
                  {b==="annual" && <div style={{ fontSize:11, color:POS, marginTop:3 }}>Save 20% · $47.88/yr</div>}
                </button>
              ))}
            </div>
            <div style={{ background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.2)",
              borderRadius:12, padding:"14px 16px" }}>
              {["48-hour emergency bypass window","100 GB bulk vault export","AES-256 encrypted archive",
                "Secure 15-min download link","Full audit trail"].map(item => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <CheckCircle size={12} color={ACCENT2}/>
                  <span style={{ fontSize:13, color:SOFT }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("pay")} className="btn-primary" style={{ width:"100%", justifyContent:"center" }}>
              Continue to Payment →
            </button>
          </>)}

          {step === "pay" && (<>
            <div style={{ background:"#0F1624", borderRadius:10, padding:"11px 14px", fontSize:13, color:SOFT }}>
              <strong style={{ color:TEXT }}>Disaster Recovery Protection</strong> · {billing==="annual" ? "$47.88/yr ($3.99/mo)" : "$4.99/month"}
            </div>
            <div style={{ background:"rgba(91,110,225,0.08)", border:"1px dashed rgba(91,110,225,0.3)",
              borderRadius:8, padding:"8px 12px", fontSize:12, color:ACCENT2 }}>
              🎮 Pre-filled with Stripe test card — just click Pay
            </div>
            <div className="space-y-3">
              <div className="field">
                <label>CARD NUMBER</label>
                <div style={{ position:"relative" }}>
                  <input value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g,"").slice(0,16))}
                    style={{ paddingLeft:36, ...MONO }}/>
                  <CreditCard size={14} color={ACCENT2} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
                </div>
              </div>
              <div className="field">
                <label>CARDHOLDER NAME</label>
                <input value={cardName} onChange={e => setCardName(e.target.value)}/>
              </div>
              <div className="row2">
                <div className="field">
                  <label>EXPIRY</label>
                  <input value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} style={MONO}/>
                </div>
                <div className="field">
                  <label>CVV</label>
                  <input value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,"").slice(0,4))}
                    type="password" style={MONO}/>
                </div>
              </div>
            </div>
            <div style={{ fontSize:11, color:MUTED, textAlign:"center" }}>🔒 Secured by Stripe · PCI DSS Level 1</div>
            <div className="flex gap-3">
              <button onClick={() => setStep("select")} className="btn-sec" style={{ flex:1, justifyContent:"center" }}>Back</button>
              <button onClick={handlePay} disabled={loading} className="btn-primary" style={{ flex:2, justifyContent:"center" }}>
                {loading ? "Processing…" : `Pay $${billing==="annual"?"47.88":"4.99"} →`}
              </button>
            </div>
          </>)}

          {step === "done" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div style={{ width:60, height:60, borderRadius:"50%",
                background:"rgba(95,190,145,0.12)", border:`2px solid rgba(95,190,145,0.3)`,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <CheckCircle size={26} color={POS}/>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:18, color:TEXT, marginBottom:4 }}>
                  Add-On Purchased! ✓
                </div>
                <p style={{ fontSize:13, color:MUTED, lineHeight:1.6 }}>
                  Disaster Recovery Protection is being activated on your account.<br/>
                  A Master Admin opens the emergency window when you request it.
                </p>
              </div>

              <div style={{ width:"100%", background:"rgba(91,110,225,0.07)",
                border:"1px dashed rgba(91,110,225,0.4)", borderRadius:12, padding:"16px" }}>
                <div style={{ fontSize:11, ...MONO, color:"#6FAE8B", fontWeight:700, marginBottom:6 }}>
                  NEXT — REQUEST YOUR EMERGENCY WINDOW
                </div>
                <p style={{ fontSize:12, color:SOFT, lineHeight:1.6 }}>
                  Contact FPD support to open your 48-hour window. A Master Admin authenticates
                  via MFA and enters a reason code, and this page unlocks on its own once the
                  grant is recorded — it is never something your browser can switch on.
                </p>
              </div>

              <button onClick={onClose} style={{ fontSize:13, color:MUTED, background:"transparent",
                border:"none", cursor:"pointer", textDecoration:"underline" }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function DisasterRecovery() {
  const { session, bypassState, addonActive, refresh: refreshBypass } = useBypassState();
  const countdown = useCountdown(session?.expiresAt ?? null);
  const [showPurchase, setShowPurchase] = useState(false);

  const [categories, setCategories] = useState<FileCategory[]>(INIT_CATEGORIES);
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadLink, setDownloadLink] = useState("");
  const [linkExpiry, setLinkExpiry] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [notifBanner, setNotifBanner] = useState(bypassState === "active");

  const linkCountdown = useCountdown(linkExpiry);
  const selectedCats = categories.filter(c => c.selected);
  const totalGB = selectedCats.reduce((s, c) => s + c.sizeGB, 0);
  const totalFiles = selectedCats.reduce((s, c) => s + c.count, 0);

  useEffect(() => {
    if (bypassState === "active") setNotifBanner(true);
  }, [bypassState]);

  const toggleCat = (id: string) =>
    setCategories(cs => cs.map(c => c.id === id ? { ...c, selected: !c.selected } : c));

  const startExport = useCallback(() => {
    if (bypassState !== "active" || selectedCats.length === 0) return;
    setExportPhase("generating");
    setProgress(0);
    const phases = [12, 28, 44, 61, 78, 91, 100];
    const delays  = [400, 900, 1500, 2200, 3000, 3800, 4400];
    phases.forEach((pct, i) => {
      setTimeout(() => setProgress(pct), delays[i]);
    });
    setTimeout(() => {
      const link = `https://secure.finalpassdown.com/dr/download/${Math.random().toString(36).slice(2,10).toUpperCase()}`;
      setDownloadLink(link);
      setLinkExpiry(Date.now() + 15 * 60 * 1000);
      setExportPhase("ready");
      toast.success("Archive ready — download within 15 minutes");
    }, 4800);
  }, [bypassState, selectedCats]);

  const copyLink = () => {
    navigator.clipboard.writeText(downloadLink).catch(() => {});
    toast.success("Secure link copied to clipboard");
  };

  const resetExport = () => {
    setExportPhase("idle");
    setProgress(0);
    setDownloadLink("");
    setLinkExpiry(null);
  };

  /* ── LOCKED STATE ───────────────────────────────────────────────── */
  if (bypassState === "locked") {
    return (<div className="fpd-dr">
      <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
      <div className="fpd-dr-grain" />
      <div className="wrap">
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.4), rgba(91,167,214,0.18)), url(${heroDisasterRecoveryPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Emergency Protection</span>
            <h1>When disaster strikes, <span className="accent">your vault stays reachable.</span></h1>
            <p>Disaster Recovery Protection gives you emergency bulk-export access to your entire vault during a crisis — data loss, account compromise, or urgent estate needs.</p>
          </div>
        </div>

        <div>
          <div className="eyebrow"><ShieldOff size={12}/> Disaster Recovery Protection</div>
          <h1 className="pg-h1">Emergency Recovery</h1>
          <div className="pg-sub">
            Your Emergency Recovery Protocol is currently inactive. Contact a Master Admin
            to activate a 48-hour bypass window when needed.
          </div>
        </div>

        <div className="demo-banner">
          <div>
            <div className="demo-tag">🎮 DEMO MODE — FULL FLOW GUIDE</div>
            <div className="demo-text">
              <strong>Step 1:</strong> Click <em>"Add Disaster Recovery"</em> below to purchase the add-on (pre-filled Stripe test card).<br/>
              <strong>Step 2:</strong> A Master Admin grants the 48-hour window from Admin → Disaster Recovery.<br/>
              <strong>Step 3:</strong> This page unlocks on its own — select file categories and generate a bulk archive.
            </div>
          </div>
          <div className="demo-acts">
            <button onClick={() => setShowPurchase(true)} className="btn-ghost">1. Add Add-On →</button>
            <button onClick={() => {
              void refreshBypass();
              toast.info("Checked for an active bypass — a Master Admin grants the window from the admin console.");
            }} className="btn-sec" style={{ color:ACCENT2 }}>
              <RefreshCw size={14}/> Check for Bypass Grant
            </button>
          </div>
        </div>

        <div className="card pad flex flex-col items-center text-center gap-5">
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "2px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Lock size={28} color={MUTED} />
          </div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:TEXT, marginBottom:6 }}>
              Emergency Bypass Not Active
            </div>
            <p style={{ color:MUTED, fontSize:14, maxWidth:380 }}>
              Contact a Master Admin to request activation when you need it.
            </p>
          </div>

          <div className="pricegrid">
            {[
              { label:"MONTHLY", price:"$4.99", sub:"/month", note:null, highlight:false },
              { label:"ANNUAL", price:"$3.99", sub:"/month", note:"Save 20% · $47.88/yr", highlight:true },
            ].map(opt => (
              <div key={opt.label} className={`pricecard ${opt.highlight ? "hi" : ""}`}>
                <div style={{ fontSize:10, ...MONO, color:MUTED, marginBottom:6 }}>{opt.label}</div>
                <div style={{ fontSize:26, fontWeight:800, color: opt.highlight ? ACCENT2 : TEXT }}>
                  {opt.price}
                </div>
                <div style={{ fontSize:12, color:MUTED }}>{opt.sub}</div>
                {opt.note && <div style={{ fontSize:11, color:POS, marginTop:4 }}>{opt.note}</div>}
              </div>
            ))}
          </div>

          {!addonActive ? (
            <button onClick={() => setShowPurchase(true)} className="btn-primary">
              <ShieldAlert size={18}/>
              Add Disaster Recovery — $4.99/mo
              <ArrowRight size={16}/>
            </button>
          ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
              borderRadius:10, background:"rgba(95,190,145,0.1)", border:"1px solid rgba(95,190,145,0.3)" }}>
              <CheckCircle size={14} color={POS}/>
              <span style={{ fontSize:13, fontWeight:600, color:POS }}>
                Add-On Active — Waiting for admin to activate bypass
              </span>
            </div>
          )}

          <div style={{ width:"100%", maxWidth:440, textAlign:"left" }}>
            {[
              { icon:"📦", label:"Bulk export up to 100 GB of your vault" },
              { icon:"⚡", label:"Instant archive generation — one click" },
              { icon:"🔐", label:"Encrypted, time-limited secure download link" },
              { icon:"⏱️", label:"Active for 48 hours from admin approval" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span style={{ fontSize:18 }}>{item.icon}</span>
                <span style={{ fontSize:14, color:SOFT }}>{item.label}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setShowInfo(v => !v)}
            className="flex items-center gap-1.5 text-sm" style={{ color:MUTED, background:"none", border:"none", cursor:"pointer" }}>
            <Info size={13} />
            {showInfo ? "Hide" : "Learn more about"} the Bypass Protocol
            {showInfo ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          {showInfo && (
            <div style={{ background:"#0F1624", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:12, padding:"16px 20px", width:"100%", maxWidth:440, textAlign:"left" }}>
              <p style={{ fontSize:13, color:SOFT, lineHeight:1.7 }}>
                The Emergency Bypass Protocol is a security-controlled feature that temporarily
                lifts normal download restrictions on your vault. It requires Master Admin
                authorization, MFA verification, and a documented reason. The window lasts
                exactly 48 hours and cannot be extended. All bypass activity is logged and
                audited. Contact <strong style={{ color:TEXT }}>support@finalpassdown.com</strong> to request access.
              </p>
            </div>
          )}
        </div>

        <div className="card pad">
          <div style={{ fontSize:12.5, fontWeight:700, color:SOFT, marginBottom:12, ...MONO, letterSpacing:"0.08em" }}>
            HOW IT WORKS
          </div>
          <div className="ggrid">
            {[
              { title:"Request Access", desc:"Call or email FPD support. Describe your emergency — account compromise, natural disaster, or urgent estate access." },
              { title:"Admin Verification", desc:"A Master Admin authenticates via MFA, enters a reason code, and activates your 48-hour bypass window." },
              { title:"You're Notified", desc:"You receive an email and in-app notification immediately. The Emergency Recovery dashboard becomes active." },
              { title:"Bulk Export", desc:"Select which sections to include, generate your encrypted archive, and download via a secure 15-minute link." },
            ].map((item, i) => (
              <div key={i} className="gcard">
                <div className="gnum">{String(i+1).padStart(2,"0")}</div>
                <div>
                  <div className="gtitle">{item.title}</div>
                  <div className="gdesc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hbanner" style={{ minHeight: 200 }}>
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.55), rgba(76,63,168,0.4)), url(${wildfireDisasterPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Why It Matters</span>
            <h1 style={{ fontSize: 26 }}>Disasters don't send <span className="accent">a warning.</span></h1>
            <p>Wildfires, storms, and outages can take your devices — and your records — in minutes. Your bypass window, encrypted export, and audit trail are ready the moment you need them, not after.</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:14 }}>
              {["48-HR WINDOW","100 GB EXPORT","AES-256 SECURE"].map(chip => (
                <span key={chip} style={{
                  ...MONO, fontSize:11, fontWeight:700, letterSpacing:"0.06em", color:"#fff",
                  background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.22)",
                  borderRadius:99, padding:"5px 12px",
                }}>{chip}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showPurchase && (
        <DRPurchaseModal
          onClose={() => setShowPurchase(false)}
          onSuccess={() => { void refreshBypass(); }}
        />
      )}
    </div>);
  }

  /* ── EXPIRED STATE ──────────────────────────────────────────────── */
  if (bypassState === "expired") {
    return (
      <div className="fpd-dr">
        <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
        <div className="fpd-dr-grain" />
        <div className="wrap">
          <div className="eyebrow"><ShieldOff size={12} color={NEG}/> Emergency Recovery · Session Expired</div>
          <div className="card pad flex flex-col items-center text-center gap-4">
            <div style={{
              width:72, height:72, borderRadius:"50%",
              background:"rgba(208,107,107,0.1)", border:`2px solid rgba(208,107,107,0.25)`,
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              <Clock size={28} color={NEG} />
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:TEXT, marginBottom:6 }}>
                Bypass Window Expired
              </div>
              <p style={{ color:MUTED, fontSize:14, maxWidth:380 }}>
                Your 48-hour Emergency Recovery window has ended. Contact a Master Admin to
                request a new bypass session if you still need access.
              </p>
            </div>
            {session && (
              <div style={{ fontSize:12, color:MUTED, ...MONO }}>
                Session was active · Reason: {session.reason} · Granted by: {session.activatedBy}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── ACTIVE STATE ───────────────────────────────────────────────── */
  const urgentRed = countdown.h < 4;

  return (
    <div className="fpd-dr">
      <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
      <div className="fpd-dr-grain" />
      <div className="wrap">

        {notifBanner && (
          <div style={{
            background: "rgba(126,107,216,0.08)", border: "1px solid rgba(126,107,216,0.3)",
            borderRadius: 14, padding:"12px 18px", color:TEXT,
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div className="flex items-center gap-3">
              <Bell size={15} color="#B9AEEC" />
              <span style={{ fontSize:14, fontWeight:700 }}>
                Emergency Recovery Protocol activated on your account
              </span>
              {session && (
                <span style={{ fontSize:13, color:MUTED }}>
                  · Reason: {session.reason}
                </span>
              )}
            </div>
            <button onClick={() => setNotifBanner(false)} style={{ background:"none", border:"none", cursor:"pointer" }}>
              <X size={16} color={MUTED} />
            </button>
          </div>
        )}

        <div>
          <div className="eyebrow" style={{ color:ACCENT2 }}>
            <ShieldAlert size={12} color={ACCENT2} /> Disaster Recovery Protection · Bypass Active
          </div>
          <h1 className="pg-h1">Emergency Recovery Dashboard</h1>
          <div className="pg-sub">
            Your vault is temporarily unlocked for bulk export. Act promptly — this window closes automatically.
          </div>
        </div>

        <div className="countdown" style={{
          background: "#101728",
          border: "1px solid rgba(126,107,216,0.25)",
          borderLeft: "3px solid #7E6BD8",
        }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6, fontSize:11, ...MONO,
                letterSpacing:"0.1em", marginBottom:8, fontWeight:700,
                ...(urgentRed
                  ? { color:"#FF9C9C", background:"rgba(214,69,69,0.14)", padding:"4px 10px", borderRadius:99 }
                  : { color:"#B9AEEC" }),
              }}>
                {urgentRed ? "⚠ BYPASS EXPIRES SOON" : "⏱ BYPASS PROTOCOL ACTIVE"}
              </div>
              <div className="digits" style={{ color:TEXT }}>
                {String(countdown.h).padStart(2,"0")}
                <span style={{ opacity:0.5, margin:"0 4px" }}>:</span>
                {String(countdown.m).padStart(2,"0")}
                <span style={{ opacity:0.5, margin:"0 4px" }}>:</span>
                {String(countdown.s).padStart(2,"0")}
              </div>
              <div style={{ fontSize:12, color:MUTED, marginTop:4 }}>
                hours remaining · Expires {new Date(session!.expiresAt).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:12, color:MUTED, ...MONO }}>Activated by</div>
              <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{session!.activatedBy}</div>
              <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>Reason: {session!.reason}</div>
            </div>
          </div>
          <div style={{ height:4, borderRadius:2, background:"rgba(126,110,225,0.15)", marginTop:16, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg,#7E6BD8,#5B6EE1)",
              width:`${countdown.pct}%`, transition:"width 1s linear" }} />
          </div>
        </div>

        {exportPhase === "idle" && (
          <>
            <div className="card pad">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:TEXT }}>Select Data to Export</div>
                  <div style={{ fontSize:13, color:MUTED, marginTop:2 }}>
                    {totalFiles.toLocaleString()} files · {totalGB.toFixed(1)} GB selected · 100 GB limit per export
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCategories(cs => cs.map(c => ({ ...c, selected:true })))} className="btn-sec" style={{ color:ACCENT2, borderColor:"rgba(91,110,225,0.3)" }}>All</button>
                  <button onClick={() => setCategories(cs => cs.map(c => ({ ...c, selected:false })))} className="btn-sec">None</button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {categories.map(cat => (
                  <label key={cat.id} className={`catrow ${cat.selected ? "on" : ""}`}>
                    <input type="checkbox" checked={cat.selected} onChange={() => toggleCat(cat.id)}
                      style={{ width:16, height:16, accentColor:ACCENT }} />
                    <span style={{ fontSize:20 }}>{cat.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:TEXT }}>{cat.label}</div>
                      <div style={{ fontSize:12, color:MUTED }}>{cat.count.toLocaleString()} items · {cat.sizeGB.toFixed(1)} GB</div>
                    </div>
                    <div style={{ fontSize:12, color:cat.selected ? POS : FAINT, fontWeight:600, ...MONO }}>
                      {cat.selected ? "✓ INCLUDED" : "EXCLUDED"}
                    </div>
                  </label>
                ))}
              </div>

              {totalGB > 100 && (
                <div style={{ marginTop:14, display:"flex", alignItems:"center", gap:8, color:NEG, fontSize:13, fontWeight:600 }}>
                  <AlertTriangle size={14} />
                  Archive exceeds 100 GB limit. Please deselect some categories.
                </div>
              )}
            </div>

            <button onClick={startExport} disabled={selectedCats.length === 0 || totalGB > 100} className="btn-primary" style={{ width:"100%", padding:"16px 24px", fontSize:16, justifyContent:"center" }}>
              <Package size={20} />
              Generate Secure Archive — {totalFiles.toLocaleString()} files · {totalGB.toFixed(1)} GB
              <ArrowRight size={18} />
            </button>

            <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 16px",
              background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.25)", borderRadius:10 }}>
              <Info size={14} color={ACCENT2} style={{ marginTop:1, flexShrink:0 }} />
              <p style={{ fontSize:12, color:SOFT, lineHeight:1.6 }}>
                All exports are encrypted with AES-256. The secure download link expires after
                15 minutes and can only be used once. Download activity is logged and audited.
                Do not share your download link.
              </p>
            </div>
          </>
        )}

        {exportPhase === "generating" && (
          <div className="card pad flex flex-col items-center gap-6" style={{ padding:40 }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(91,110,225,0.12)",
              border:"2px solid rgba(91,110,225,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FileArchive size={36} color={ACCENT} style={{ animation:"fpd-dr-spin 2s linear infinite" }} />
            </div>
            <style>{`@keyframes fpd-dr-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:TEXT, marginBottom:6 }}>
                Generating Your Archive
              </div>
              <div style={{ fontSize:13, color:SOFT }}>
                {progress < 30  ? "Scanning vault contents…"
                : progress < 50 ? `Indexing ${totalFiles.toLocaleString()} files…`
                : progress < 65 ? "Compressing documents…"
                : progress < 80 ? "Encrypting archive (AES-256)…"
                : progress < 95 ? "Packaging media files…"
                : "Finalising and generating secure link…"}
              </div>
            </div>

            <div style={{ width:"100%", maxWidth:440 }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize:12, color:MUTED, ...MONO }}>{progress}% complete</span>
                <span style={{ fontSize:12, color:MUTED, ...MONO }}>~{totalGB.toFixed(1)} GB</span>
              </div>
              <div style={{ height:10, borderRadius:5, background:"rgba(91,110,225,0.15)", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:5, background:`linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                  width:`${progress}%`, transition:"width 0.6s ease", boxShadow:"0 0 8px rgba(91,110,225,0.5)" }} />
              </div>
            </div>

            <div style={{ fontSize:12, color:MUTED, ...MONO }}>
              Do not close this page · Archive encrypted in transit
            </div>
          </div>
        )}

        {exportPhase === "ready" && (
          <div className="card pad flex flex-col items-center gap-6" style={{ padding:32 }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(95,190,145,0.12)",
              border:"2px solid rgba(95,190,145,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <CheckCircle size={36} color={POS} />
            </div>

            <div style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:22, color:TEXT, marginBottom:6 }}>
                Archive Ready
              </div>
              <p style={{ fontSize:14, color:SOFT, maxWidth:380 }}>
                Your encrypted archive has been generated. Your secure download link is active
                for the next 15 minutes.
              </p>
            </div>

            {linkExpiry && (
              <div style={{
                display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:8,
                background: linkCountdown.remaining < 120_000 ? "rgba(208,107,107,0.12)" : "rgba(91,110,225,0.12)",
                border: `1px solid ${linkCountdown.remaining < 120_000 ? "rgba(208,107,107,0.3)" : "rgba(91,110,225,0.3)"}`,
              }}>
                <Clock size={14} color={linkCountdown.remaining < 120_000 ? NEG : ACCENT2} />
                <span style={{ fontSize:13, fontWeight:700, ...MONO, color: linkCountdown.remaining < 120_000 ? NEG : ACCENT2 }}>
                  Link expires in {String(linkCountdown.m).padStart(2,"0")}:{String(linkCountdown.s).padStart(2,"0")}
                </span>
              </div>
            )}

            <div className="flex gap-6 flex-wrap justify-center">
              {[
                { label:"Files", value:totalFiles.toLocaleString() },
                { label:"Archive Size", value:`${totalGB.toFixed(1)} GB` },
                { label:"Encrypted", value:"AES-256" },
                { label:"Categories", value:selectedCats.length },
              ].map((item, i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:TEXT, ...MONO }}>{item.value}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ width:"100%", maxWidth:500 }}>
              <div style={{ display:"flex", alignItems:"center", border:"1.5px solid rgba(91,110,225,0.3)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ flex:1, padding:"10px 14px", fontSize:12, color:SOFT, ...MONO,
                  background:"#0F1624", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {downloadLink}
                </div>
                <button onClick={copyLink} style={{ padding:"10px 14px", background:"rgba(91,110,225,0.12)",
                  border:"none", borderLeft:"1px solid rgba(91,110,225,0.3)", cursor:"pointer", color:ACCENT2,
                  display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>
                  <Copy size={13} /> Copy
                </button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <a href="#" onClick={e => { e.preventDefault(); toast.success("Download started — save your archive securely"); }}
                className="btn-primary" style={{ background:"linear-gradient(135deg,#5FBE91,#3F8F68)", color:"#fff", textDecoration:"none" }}>
                <Download size={18} />
                Download Encrypted Archive
                <ExternalLink size={14} style={{ opacity:0.7 }} />
              </a>
              <button onClick={resetExport} className="btn-ghost">
                <RefreshCw size={15} />
                New Export
              </button>
            </div>

            <div style={{ fontSize:12, color:MUTED, textAlign:"center", lineHeight:1.7 }}>
              This link is single-use and expires in 15 minutes.<br/>
              Do not share it. All download activity is logged and audited.
            </div>
          </div>
        )}

        <div className="card pad">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={14} color={ACCENT} />
              <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>Vault Storage Overview</span>
            </div>
            <span style={{ fontSize:12, color:MUTED, ...MONO }}>52.3 GB / 250 GB used</span>
          </div>
          <div style={{ height:8, borderRadius:4, background:"rgba(91,110,225,0.15)", overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${ACCENT},${ACCENT2})`, width:"20.9%" }} />
          </div>
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { label:"Media", pct:"73.8%", color:ACCENT2 },
              { label:"Medical", pct:"7.3%",  color:POS },
              { label:"Assets",  pct:"8.4%",  color:ACCENT },
              { label:"Other",   pct:"10.5%", color:MUTED },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div style={{ width:8, height:8, borderRadius:"50%", background:item.color }} />
                <span style={{ fontSize:11, color:MUTED }}>{item.label} {item.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px",
          background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.2)", borderRadius:8, fontSize:12, color:SOFT }}>
          <Zap size={13} color={ACCENT2} />
          <span>
            <strong style={{ color:TEXT }}>Bypass Protocol Active.</strong> This elevated access window will automatically
            close after the timer expires. All activity during this session is logged.
          </span>
        </div>
      </div>
    </div>
  );
}
