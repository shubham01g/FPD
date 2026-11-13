/**
 * VitalClone — launcher for the Vital Clone app, with one-click sign-in.
 *
 * NOT the same thing as VaultClone.tsx (that is the Legacy Vault Clone
 * download package). Vital Clone is a separate application with its own
 * accounts, billing and privacy policy.
 *
 * Why a launcher and not an iframe: Vital Clone refuses to be framed
 * (X-Frame-Options: DENY, frame-ancestors 'none'), Stripe Checkout refuses to
 * load inside a frame, and Vital Clone Live needs camera and microphone access
 * that does not survive being nested. A new tab keeps every feature working.
 *
 * Sign-in: "Open Vital Clone" asks our server for a 60-second, single-use
 * token (services/vitalCloneApi.ts) and opens Vital Clone's /sso page with it,
 * which signs the member in there — creating their Vital Clone account on the
 * first visit.
 *
 * The address lives in services/vitalCloneApi.ts (VITE_VITALCLONE_URL).
 */
import React, { useState } from "react";
import { toast } from "sonner";
import {
  Activity, ExternalLink, MessageSquare, Mic, Video, ShieldCheck, Loader2, LogIn,
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import { VITALCLONE_URL, vitalCloneSignInUrl } from "../services/vitalCloneApi";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-vital so nothing else in the app is affected. */
const VITAL_CSS = `
.fpd-vital{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-vital *{box-sizing:border-box;}
.fpd-vital-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-vital .wrap{max-width:1040px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-vital .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-vital .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-vital .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-vital .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}

/* hero */
.fpd-vital .hero{padding:34px;display:flex;flex-direction:column;gap:26px;overflow:hidden;position:relative;}
.fpd-vital .hero::before{content:"";position:absolute;right:-120px;top:-120px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(126,107,216,0.22),transparent 70%);pointer-events:none;}
.fpd-vital .hero-title{font-family:var(--font-display);font-size:24px;font-weight:600;color:${TEXT};letter-spacing:-0.01em;max-width:560px;line-height:1.3;}
.fpd-vital .hero-body{color:${MUTED};font-size:16px;line-height:1.7;max-width:600px;margin-top:8px;}

.fpd-vital .feats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
.fpd-vital .feat{padding:16px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;gap:8px;}
.fpd-vital .feat-ico{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.12);color:${ACCENT2};}
.fpd-vital .feat-title{color:${TEXT};font-size:15.5px;font-weight:600;}
.fpd-vital .feat-body{color:${MUTED};font-size:14.5px;line-height:1.6;}

.fpd-vital .cta-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.fpd-vital .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:13px 22px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;font-size:16px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);min-height:44px;}
.fpd-vital .btn-primary:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px);}
.fpd-vital .btn-primary:disabled{opacity:.7;cursor:progress;}
.fpd-vital .btn-link{background:none;border:none;padding:6px 2px;color:${MUTED};font-size:14.5px;font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:var(--font-body);}
.fpd-vital .btn-link:hover{color:${SOFT};}
.fpd-vital .signed-as{color:${MUTED};font-size:14.5px;display:flex;align-items:center;gap:7px;}
.fpd-vital .signed-as b{color:${SOFT};font-weight:600;}
.fpd-vital .spin{animation:fpdvitalspin 1s linear infinite;}
@keyframes fpdvitalspin{to{transform:rotate(360deg);}}

/* footer note */
.fpd-vital .note{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:18px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);color:${MUTED};font-size:15px;line-height:1.7;}

@media (max-width:720px){
  .fpd-vital .wrap{padding:18px 16px 32px;}
  .fpd-vital .hero{padding:24px 20px;}
  .fpd-vital .feats{grid-template-columns:1fr;}
  .fpd-vital .cta-row .btn-primary{width:100%;}
}
`;

const FEATURES = [
  { icon: <MessageSquare size={16} />, title: "Text", body: "Your family can message your clone and hear your stories in your words." },
  { icon: <Mic size={16} />, title: "Voice", body: "Trained on your own recordings, so it sounds like you." },
  { icon: <Video size={16} />, title: "Face to face", body: "Vital Clone Live lets them talk to you on a video call." },
];

/** Opens a URL in a tab opened earlier (pop-up safe), or in this tab if that was blocked. */
function sendTab(tab: Window | null, url: string) {
  if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
}

export function VitalClone() {
  const { user } = useDemo();
  const [opening, setOpening] = useState(false);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    // Open the tab first (synchronously) so pop-up blockers allow it.
    const tab = window.open("", "_blank");
    try {
      sendTab(tab, await vitalCloneSignInUrl());
    } catch (err) {
      tab?.close();
      toast.error((err as Error).message, {
        action: { label: "Open anyway", onClick: () => openWithoutSignIn() },
      });
    } finally {
      setOpening(false);
    }
  };

  const openWithoutSignIn = () => {
    window.open(`${VITALCLONE_URL}/signin`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fpd-vital">
      <style dangerouslySetInnerHTML={{ __html: VITAL_CSS }} />
      <div className="fpd-vital-grain" />
      <div className="wrap">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow"><Activity size={12} /> Partner App</div>
          <h1 className="pg-h1">Vital Clone</h1>
          <div className="pg-sub">Create your living legacy: an AI clone your family can talk to.</div>
        </div>

        <div className="card hero">
          <div>
            <div className="hero-title">Preserve your voice, stories and wisdom.</div>
            <div className="hero-body">
              Vital Clone turns your recordings and memories into a clone your loved ones can talk to for years to come.
              Your Final Pass Down account signs you straight in, so there's no extra password to remember.
            </div>
          </div>

          <div className="feats">
            {FEATURES.map(f => (
              <div key={f.title} className="feat">
                <div className="feat-ico">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-body">{f.body}</div>
              </div>
            ))}
          </div>

          <div className="cta-row">
            <button className="btn-primary" onClick={open} disabled={opening}>
              {opening
                ? <><Loader2 size={16} className="spin" /> Opening…</>
                : <><ExternalLink size={16} /> Open Vital Clone</>}
            </button>
            {user.email && (
              <div className="signed-as"><LogIn size={14} /> Signs you in as <b>{user.email}</b></div>
            )}
          </div>
          <div style={{ marginTop: -14 }}>
            <button className="btn-link" onClick={openWithoutSignIn}>Use a different Vital Clone account</button>
          </div>
        </div>

        <div className="note">
          <ShieldCheck size={15} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Vital Clone opens in a new tab and is a separate service. It can't see your Final Pass Down vault, and its
            own plans and privacy policy apply to anything you create there. The first time you open it, a Vital Clone
            account is created with your email; if you already have one, you're signed in to it.
          </div>
        </div>
      </div>
    </div>
  );
}
