/**
 * VitalClone — third-party product embedded in an iframe.
 *
 * NOT the same thing as VaultClone.tsx (that is the Legacy Vault Clone
 * download package). VitalClone is an external application; this page only
 * hosts it.
 *
 * ── CONFIGURATION ────────────────────────────────────────────────────────
 * Set VITALCLONE_URL to the live https:// address VitalClone is served from.
 * Until it is set, the page renders a "not configured" state rather than a
 * broken frame.
 *
 * Two things must be true on the VitalClone server or the frame stays blank
 * no matter what this file does:
 *   1. It must NOT send `X-Frame-Options: DENY|SAMEORIGIN`.
 *   2. Its CSP `frame-ancestors` must allow this app's origin.
 * Both are response headers on their side — unfixable from here. If the frame
 * is blank but the URL loads fine in a normal tab, that is the cause.
 *
 * Auth note: if VitalClone requires a login, its session cookie must be set
 * with `SameSite=None; Secure` to survive being framed cross-site. Otherwise
 * users will see a login screen inside the frame that can never succeed.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Activity, ExternalLink, RefreshCw, Maximize2, Minimize2,
  TriangleAlert, Settings2, ShieldCheck, Loader2,
} from "lucide-react";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/** ← Replace with the real VitalClone URL. Empty string = not configured. */
export const VITALCLONE_URL = "";

/** How long to wait before assuming the frame is being blocked. */
const LOAD_TIMEOUT_MS = 12000;

type FrameState = "loading" | "ready" | "timeout";

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-vital so nothing else in the app is affected. */
const VITAL_CSS = `
.fpd-vital{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-vital *{box-sizing:border-box;}
.fpd-vital-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-vital .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}
.fpd-vital .wrap.wide{max-width:1900px;}

.fpd-vital .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-vital .card.pad{padding:28px;}
.fpd-vital .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-vital .sec-title{display:flex;align-items:center;gap:9px;font-family:var(--font-display);font-size:17.5px;font-weight:600;color:${TEXT};margin-bottom:16px;}
.fpd-vital .sec-title .tick{width:3px;height:13px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* header */
.fpd-vital .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-vital .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-vital .pg-sub{color:${MUTED};font-size:16px;max-width:640px;line-height:1.6;}
.fpd-vital .head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0;}
.fpd-vital .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-vital .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-vital .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s,color .18s;}
.fpd-vital .btn-sec:hover{background:rgba(91,110,225,0.1);color:#6FAE8B;}

/* empty state */
.fpd-vital .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:54px 24px;gap:8px;}
.fpd-vital .empty-ico{width:52px;height:52px;border-radius:18px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
.fpd-vital .empty-title{color:${TEXT};font-size:19px;font-weight:600;}
.fpd-vital .empty-desc{color:${MUTED};font-size:15.5px;max-width:440px;line-height:1.6;}

/* requirement rows */
.fpd-vital .reqs{display:flex;flex-direction:column;gap:10px;}
.fpd-vital .req-row{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-vital .req-ico{width:32px;height:32px;border-radius:99px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-vital .req-title{color:${TEXT};font-size:16px;font-weight:600;margin-bottom:4px;}
.fpd-vital .req-body{color:${MUTED};font-size:15px;line-height:1.7;}
.fpd-vital .req-body code{font-family:var(--font-mono);color:${SOFT};}

/* frame */
.fpd-vital .frame-wrap{position:relative;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0B111D;}
.fpd-vital .frame-overlay{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#0B111D;}
.fpd-vital .frame-overlay .url{font-family:var(--font-mono);font-size:14px;color:${FAINT};opacity:.8;}
.fpd-vital .spin{animation:fpdvitalspin 1s linear infinite;}
@keyframes fpdvitalspin{to{transform:rotate(360deg);}}

/* footer note */
.fpd-vital .note{display:flex;align-items:flex-start;gap:12px;padding:14px 18px;border-radius:18px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);color:${MUTED};font-size:15px;line-height:1.7;}
`;

export function VitalClone() {
  const [state, setState] = useState<FrameState>("loading");
  const [fullscreen, setFullscreen] = useState(false);
  const [nonce, setNonce] = useState(0);
  const timer = useRef<number | null>(null);

  const configured = VITALCLONE_URL.trim().length > 0;

  /* A blocked frame never fires onLoad, so fall back to a timeout. */
  useEffect(() => {
    if (!configured) return;
    setState("loading");
    timer.current = window.setTimeout(() => {
      setState(s => (s === "loading" ? "timeout" : s));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [configured, nonce]);

  const onFrameLoad = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setState("ready");
  };

  const reload = () => {
    setNonce(n => n + 1);
  };

  /* ── Not configured: explain rather than render a dead frame ── */
  if (!configured) {
    const reqs = [
      {
        icon: <ExternalLink size={15} />, color: "#6FAE8B", title: "A live https:// URL",
        body: "The running VitalClone web app — not a GitHub repository. An iframe loads a served page, not source code. GitHub also refuses to be framed, so a repo URL can never work here.",
      },
      {
        icon: <ShieldCheck size={15} />, color: "#D99A6B", title: "Permissive framing headers",
        body: <>VitalClone must not send X-Frame-Options: DENY or SAMEORIGIN, and its Content-Security-Policy frame-ancestors must list this app's origin. Both are set on VitalClone's server — this page cannot override them.</>,
      },
      {
        icon: <TriangleAlert size={15} />, color: WARN, title: "Cross-site cookies, if it needs a login",
        body: "A session cookie without SameSite=None; Secure is dropped inside a cross-origin iframe, so users would hit a login screen that can never succeed. Worth testing before launch.",
      },
    ];

    return (
      <div className="fpd-vital">
        <style dangerouslySetInnerHTML={{ __html: VITAL_CSS }} />
        <div className="fpd-vital-grain" />
        <div className="wrap">
          <div className="pg-head">
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow"><Activity size={12} /> External Integration</div>
              <h1 className="pg-h1">Vital Clone</h1>
              <div className="pg-sub">Vital Clone runs as a separate application embedded inside Final Pass Down. The embed is built and ready — it just needs the address Vital Clone is served from.</div>
            </div>
          </div>

          <div className="card pad empty">
            <div className="empty-ico"><Settings2 size={22} /></div>
            <div className="empty-title">Vital Clone URL not configured</div>
            <div className="empty-desc">Set VITALCLONE_URL in src/app/components/VitalClone.tsx to the live https:// address. The page will then render Vital Clone inline, with loading, reload and fullscreen controls already wired.</div>
          </div>

          <div className="card pad">
            <div className="sec-title"><span className="tick" />What the integration needs</div>
            <div className="reqs">
              {reqs.map(r => (
                <div key={r.title} className="req-row">
                  <div className="req-ico" style={{ background: `${r.color}1A`, color: r.color }}>{r.icon}</div>
                  <div>
                    <div className="req-title">{r.title}</div>
                    <div className="req-body">{r.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Configured: render the frame ── */
  const frame = (
    <div className="frame-wrap" style={{ height: fullscreen ? "calc(100vh - 96px)" : 720 }}>
      {state !== "ready" && (
        <div className="frame-overlay">
          {state === "loading" ? (
            <>
              <Loader2 size={26} color="#FFFFFF" className="spin" />
              <div style={{ color: MUTED, fontSize: 16 }}>Loading Vital Clone…</div>
              <div className="url">{VITALCLONE_URL}</div>
            </>
          ) : (
            <div style={{ textAlign: "center", maxWidth: 460, padding: 24 }}>
              <TriangleAlert size={26} color={WARN} style={{ margin: "0 auto 12px" }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: TEXT, marginBottom: 8 }}>
                Vital Clone didn't load
              </div>
              <p style={{ color: MUTED, fontSize: 15.5, lineHeight: 1.75, marginBottom: 16 }}>
                No response after {LOAD_TIMEOUT_MS / 1000} seconds. The most common cause is Vital Clone refusing to be framed
                (<span style={{ fontFamily: "var(--font-mono)" }}>X-Frame-Options</span> or a restrictive <span style={{ fontFamily: "var(--font-mono)" }}>frame-ancestors</span> policy).
                Open it in a new tab to check whether the site itself is up.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button className="btn-sec" onClick={reload}><RefreshCw size={13} /> Retry</button>
                <button className="btn-primary" onClick={() => window.open(VITALCLONE_URL, "_blank", "noopener,noreferrer")}>
                  <ExternalLink size={13} /> Open in new tab
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <iframe
        key={nonce}
        src={VITALCLONE_URL}
        title="Vital Clone"
        onLoad={onFrameLoad}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        allow="clipboard-write; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#0B111D" }}
      />
    </div>
  );

  return (
    <div className="fpd-vital">
      <style dangerouslySetInnerHTML={{ __html: VITAL_CSS }} />
      <div className="fpd-vital-grain" />
      <div className={`wrap${fullscreen ? " wide" : ""}`}>
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><Activity size={12} /> External Integration · Embedded</div>
            <h1 className="pg-h1">Vital Clone</h1>
            <div className="pg-sub">Vital Clone runs inside Final Pass Down as an embedded application. Your session here stays separate from theirs.</div>
          </div>
          <div className="head-actions">
            <button className="btn-sec" onClick={reload}><RefreshCw size={13} /> Reload</button>
            <button className="btn-sec" onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <><Minimize2 size={13} /> Exit Fullscreen</> : <><Maximize2 size={13} /> Fullscreen</>}
            </button>
            <button className="btn-primary" onClick={() => window.open(VITALCLONE_URL, "_blank", "noopener,noreferrer")}>
              <ExternalLink size={13} /> Open in New Tab
            </button>
          </div>
        </div>

        <div style={{ borderRadius: 15 }}>{frame}</div>

        <div className="note">
          <ShieldCheck size={15} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Vital Clone is a third-party service loaded in a sandboxed frame. It cannot read your Final Pass Down vault,
            and anything you enter there is governed by Vital Clone's own privacy policy.
          </div>
        </div>
      </div>
    </div>
  );
}
