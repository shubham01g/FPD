/**
 * VitalClone — the Vital Clone app, inside Final Pass Down.
 *
 * NOT the same thing as VaultClone.tsx (that is the Legacy Vault Clone
 * download package). Vital Clone is a separate application, run by Vital
 * Clone, LLC, with its own accounts, billing and privacy policy.
 *
 * Final Pass Down is a partner in Vital Clone's partner program. Vital Clone
 * runs in a frame on this page, loaded through FPD's partner link, so Vital
 * Clone credits every member to FPD and counts visits (its master admin
 * → Partners). Vital Clone allows only FPD's addresses to frame it
 * (frame-ancestors), opens Stripe in a new tab (Stripe refuses frames), and
 * gets camera and microphone through the frame's `allow` list.
 *
 * Steps:
 *   1. Clickwrap, first time only: FPD shares the member's name and email
 *      with another company, so they agree first. The wording comes from the
 *      server, which also stores it; the server refuses a sign-in without it.
 *   2. Each time the page opens: a 60-second, single-use sign-in token
 *      (services/vitalCloneApi.ts) goes to Vital Clone in the frame address's
 *      fragment. Vital Clone signs the member in, creating their account on
 *      the first visit.
 *   3. If the frame needs a fresh sign-in (session ended), it posts
 *      "vc:reconnect"; only messages from Vital Clone's origin are accepted.
 *
 * "Open in a new tab" is always there as a fallback.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity, ExternalLink, MessageSquare, Mic, Video, ShieldCheck, Loader2, LogIn, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useDemo } from "../context/DemoContext";
import {
  acceptVitalCloneConsent, getVitalCloneStatus, requestVitalCloneEntry, type VitalCloneStatus,
} from "../services/vitalCloneApi";

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
.fpd-vital .btn-primary:disabled{opacity:.55;cursor:not-allowed;}
.fpd-vital .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.25);color:${SOFT};font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);min-height:40px;}
.fpd-vital .btn-ghost:hover{background:rgba(91,110,225,0.16);color:${TEXT};}
.fpd-vital .btn-link{background:none;border:none;padding:6px 2px;color:${MUTED};font-size:14.5px;font-weight:500;cursor:pointer;text-decoration:underline;text-underline-offset:3px;font-family:var(--font-body);}
.fpd-vital .btn-link:hover{color:${SOFT};}
.fpd-vital .signed-as{color:${MUTED};font-size:14.5px;display:flex;align-items:center;gap:7px;min-width:0;}
.fpd-vital .signed-as b{color:${SOFT};font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fpd-vital .spin{animation:fpdvitalspin 1s linear infinite;}
@keyframes fpdvitalspin{to{transform:rotate(360deg);}}

/* clickwrap */
.fpd-vital .consent{padding:30px 34px;display:flex;flex-direction:column;gap:16px;}
.fpd-vital .consent h2{font-family:var(--font-display);font-size:21px;font-weight:600;color:${TEXT};margin:0;}
.fpd-vital .consent p{color:${SOFT};font-size:15.5px;line-height:1.7;margin:0;}
.fpd-vital .consent a{color:${ACCENT2};text-decoration:underline;text-underline-offset:3px;}
.fpd-vital .consent-box{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:14px;background:rgba(91,110,225,0.07);border:1px solid rgba(91,110,225,0.25);cursor:pointer;color:${TEXT};font-size:15.5px;line-height:1.6;}
.fpd-vital .consent-box input{width:20px;height:20px;margin-top:3px;flex-shrink:0;accent-color:${ACCENT};cursor:pointer;}

/* frame */
.fpd-vital.is-frame{height:100%;min-height:0;display:flex;flex-direction:column;}
.fpd-vital .bar{position:relative;z-index:1;display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.06);background:#0E1524;}
.fpd-vital .bar-title{display:flex;align-items:center;gap:8px;color:${TEXT};font-weight:600;font-size:15.5px;}
.fpd-vital .bar-gap{flex:1;}
.fpd-vital .frame-box{position:relative;z-index:1;flex:1;min-height:360px;background:#0B1120;}
.fpd-vital .frame-box iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#0B1120;}
.fpd-vital .frame-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:${MUTED};font-size:15.5px;text-align:center;padding:24px;}

/* footer note / problems */
.fpd-vital .note{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:18px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);color:${MUTED};font-size:15px;line-height:1.7;}
.fpd-vital .problem{padding:26px 30px;display:flex;flex-direction:column;gap:14px;}
.fpd-vital .problem-title{display:flex;align-items:center;gap:9px;color:${TEXT};font-weight:600;font-size:17px;}

@media (max-width:720px){
  .fpd-vital .wrap{padding:18px 16px 32px;}
  .fpd-vital .hero,.fpd-vital .consent,.fpd-vital .problem{padding:24px 20px;}
  .fpd-vital .feats{grid-template-columns:1fr;}
  .fpd-vital .cta-row .btn-primary{width:100%;}
  .fpd-vital .bar{padding:8px 12px;}
  .fpd-vital .bar .signed-as{display:none;}
  .fpd-vital .frame-box{min-height:360px;}
}
`;

const FEATURES = [
  { icon: <MessageSquare size={16} />, title: "Text", body: "Your family can message your clone and hear your stories in your words." },
  { icon: <Mic size={16} />, title: "Voice", body: "Trained on your own recordings, so it sounds like you." },
  { icon: <Video size={16} />, title: "Face to face", body: "Vital Clone Live lets them talk to you on a video call." },
];

/* What Vital Clone needs from the frame: Vital Clone Live (camera, mic,
   screen share), autoplaying replies, copy buttons and full screen. */
const FRAME_ALLOW = "camera; microphone; display-capture; autoplay; clipboard-write; fullscreen";

/* A frame that keeps asking to reconnect (e.g. a refused account) must not
   loop: at most this many fresh sign-ins per minute from messages. */
const MAX_RECONNECTS_PER_MINUTE = 3;

type Phase =
  | { kind: "loading" }
  | { kind: "problem"; message: string; code?: string }
  | { kind: "consent" }
  | { kind: "frame" };

/** Opens a URL in a tab opened earlier (pop-up safe), or in this tab if that was blocked. */
function sendTab(tab: Window | null, url: string) {
  if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
}

export function VitalClone() {
  const { user } = useDemo();
  const [status, setStatus] = useState<VitalCloneStatus | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [opening, setOpening] = useState(false);
  const reconnects = useRef<number[]>([]);
  const minting = useRef(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);

  /* Fill exactly the visible part of the page's scroll area. Banners above
     this page (Starter countdown, past due) would otherwise push the bottom
     of Vital Clone out of view behind a second scrollbar. */
  useEffect(() => {
    if (phase.kind !== "frame") return;
    const root = rootRef.current;
    const main = root?.closest("main");
    if (!root || !main) return;
    const fit = () => {
      const top = root.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      setFitHeight(Math.max(main.clientHeight - top, 480));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(main);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [phase.kind]);

  /* A fresh sign-in into the frame. */
  const loadFrame = useCallback(async () => {
    if (minting.current) return;
    minting.current = true;
    setFrameLoaded(false);
    setFrameSrc(null);
    try {
      const { url } = await requestVitalCloneEntry(true);
      setFrameSrc(url);
      setFrameKey(k => k + 1);
      setPhase({ kind: "frame" });
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === "consent_required") setPhase({ kind: "consent" });
      else setPhase({ kind: "problem", message: e.message, code: e.code });
    } finally {
      minting.current = false;
    }
  }, []);

  /* First load: the clickwrap and the address, then the frame. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getVitalCloneStatus();
        if (cancelled) return;
        setStatus(s);
        if (!s.enabled) setPhase({ kind: "problem", message: "Vital Clone is turned off right now.", code: "disabled" });
        else if (!s.consented) setPhase({ kind: "consent" });
        else void loadFrame();
      } catch (err) {
        if (!cancelled) setPhase({ kind: "problem", message: (err as Error).message, code: (err as { code?: string }).code });
      }
    })();
    return () => { cancelled = true; };
  }, [loadFrame]);

  /* The frame asks for a fresh sign-in. Only Vital Clone's own origin counts. */
  useEffect(() => {
    if (!status) return;
    const onMessage = (event: MessageEvent) => {
      // From Vital Clone's origin AND from our own frame, nothing else.
      if (event.origin !== status.origin || event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { source?: unknown; type?: unknown } | null;
      if (!data || data.source !== "vitalclone" || data.type !== "vc:reconnect") return;
      const now = Date.now();
      reconnects.current = reconnects.current.filter(t => now - t < 60_000);
      if (reconnects.current.length >= MAX_RECONNECTS_PER_MINUTE) {
        setPhase({ kind: "problem", message: "Vital Clone couldn't sign you in automatically. Open it in a new tab to sign in there." });
        return;
      }
      reconnects.current.push(now);
      void loadFrame();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [status, loadFrame]);

  const accept = async () => {
    if (!status || !agreed || saving) return;
    setSaving(true);
    try {
      await acceptVitalCloneConsent(status.consent.version);
      setStatus({ ...status, consented: true });
      await loadFrame();
    } catch (err) {
      const e = err as Error & { code?: string };
      toast.error(e.message);
      if (e.code === "consent_outdated") window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  /* Fallback: the same sign-in, in a new tab (still through the partner link). */
  const openInNewTab = async () => {
    if (opening) return;
    setOpening(true);
    // Open the tab first (synchronously) so pop-up blockers allow it.
    const tab = window.open("", "_blank");
    try {
      const { url } = await requestVitalCloneEntry(false);
      sendTab(tab, url);
    } catch (err) {
      tab?.close();
      const e = err as Error & { code?: string };
      if (e.code === "consent_required") setPhase({ kind: "consent" });
      else toast.error(e.message, { action: { label: "Open anyway", onClick: () => openWithoutSignIn() } });
    } finally {
      setOpening(false);
    }
  };

  const openWithoutSignIn = () => {
    const origin = status?.origin ?? "https://vital-clone.vercel.app";
    window.open(`${origin}/signin`, "_blank", "noopener,noreferrer");
  };

  /* ── The framed app ── */
  if (phase.kind === "frame") {
    return (
      <div className="fpd-vital is-frame" ref={rootRef} style={fitHeight ? { height: fitHeight } : undefined}>
        <style dangerouslySetInnerHTML={{ __html: VITAL_CSS }} />
        <div className="bar">
          <div className="bar-title"><Activity size={15} color={ACCENT2} /> Vital Clone</div>
          {user.email && <div className="signed-as"><LogIn size={14} /> Signed in as <b>{user.email}</b></div>}
          <div className="bar-gap" />
          <button className="btn-ghost" onClick={() => void loadFrame()} title="Sign in again and reload Vital Clone">
            <RefreshCw size={14} /> Reload
          </button>
          <button className="btn-ghost" onClick={() => void openInNewTab()} disabled={opening}>
            {opening ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />} Open in new tab
          </button>
        </div>
        <div className="frame-box">
          {frameSrc && (
            <iframe
              ref={frameRef}
              key={frameKey}
              src={frameSrc}
              title="Vital Clone"
              allow={FRAME_ALLOW}
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setFrameLoaded(true)}
            />
          )}
          {!frameLoaded && (
            <div className="frame-cover">
              <Loader2 size={26} className="spin" color={ACCENT2} />
              Signing you in to Vital Clone…
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Intro, clickwrap, or a problem ── */
  const consent = status?.consent;
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
              It opens right here, and your Final Pass Down account signs you straight in.
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
        </div>

        {phase.kind === "loading" && (
          <div className="card problem" aria-busy="true">
            <div className="signed-as"><Loader2 size={16} className="spin" /> Loading Vital Clone…</div>
          </div>
        )}

        {phase.kind === "consent" && consent && (
          <div className="card consent">
            <h2>{consent.title}</h2>
            {consent.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            <p>
              Read Vital Clone's{" "}
              <a href={consent.termsUrl} target="_blank" rel="noopener noreferrer">Terms of Service</a> and{" "}
              <a href={consent.privacyUrl} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </p>
            <label className="consent-box">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <span>{consent.checkbox}</span>
            </label>
            <div className="cta-row">
              <button className="btn-primary" onClick={() => void accept()} disabled={!agreed || saving}>
                {saving ? <><Loader2 size={16} className="spin" /> Opening…</> : <>Agree and open Vital Clone</>}
              </button>
              {user.email && <div className="signed-as"><LogIn size={14} /> Signs you in as <b>{user.email}</b></div>}
            </div>
          </div>
        )}

        {phase.kind === "problem" && (
          <div className="card problem" role="alert">
            <div className="problem-title"><AlertTriangle size={18} color="#D9A55E" /> Vital Clone can't open here right now</div>
            <div className="hero-body" style={{ marginTop: 0 }}>{phase.message}</div>
            {phase.code !== "disabled" && (
              <div className="cta-row">
                <button className="btn-ghost" onClick={() => window.location.reload()}><RefreshCw size={14} /> Try again</button>
                {status?.consented && (
                  <button className="btn-ghost" onClick={() => void openInNewTab()} disabled={opening}>
                    <ExternalLink size={14} /> Open in new tab
                  </button>
                )}
                <button className="btn-link" onClick={openWithoutSignIn}>Sign in to Vital Clone directly</button>
              </div>
            )}
          </div>
        )}

        <div className="note">
          <ShieldCheck size={15} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Vital Clone is a separate service run by Vital Clone, LLC. It can't see your Final Pass Down vault, and its own
            plans and privacy policy apply to anything you create there. The first time you open it, a Vital Clone account
            is created with your email; if you already have one, you're signed in to it. Payments open in a new tab.
          </div>
        </div>
      </div>
    </div>
  );
}
