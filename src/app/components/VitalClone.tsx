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
import { Page, PageHeader, Card, CardTitle, EmptyState, GhostButton, PrimaryButton, MONO } from "./ui/PageShell";

/** ← Replace with the real VitalClone URL. Empty string = not configured. */
export const VITALCLONE_URL = "";

/** How long to wait before assuming the frame is being blocked. */
const LOAD_TIMEOUT_MS = 12000;

type FrameState = "loading" | "ready" | "timeout";

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
    return (
      <Page>
        <PageHeader
          eyebrow="EXTERNAL INTEGRATION"
          icon={<Activity size={13} />}
          title="VitalClone"
          description="VitalClone runs as a separate application embedded inside Final Pass Down. The embed is built and ready — it just needs the address VitalClone is served from."
        />

        <EmptyState
          icon={<Settings2 size={22} />}
          title="VitalClone URL not configured"
          description="Set VITALCLONE_URL in src/app/components/VitalClone.tsx to the live https:// address. The page will then render VitalClone inline, with loading, reload and fullscreen controls already wired."
        />

        <Card padding={20}>
          <CardTitle>What the integration needs</CardTitle>
          <div className="space-y-3">
            {[
              {
                icon: <ExternalLink size={15} />, color: "#3A5BD9", title: "A live https:// URL",
                body: "The running VitalClone web app — not a GitHub repository. An iframe loads a served page, not source code. GitHub also refuses to be framed, so a repo URL can never work here.",
              },
              {
                icon: <ShieldCheck size={15} />, color: "#48BB78", title: "Permissive framing headers",
                body: "VitalClone must not send X-Frame-Options: DENY or SAMEORIGIN, and its Content-Security-Policy frame-ancestors must list this app's origin. Both are set on VitalClone's server — this page cannot override them.",
              },
              {
                icon: <TriangleAlert size={15} />, color: "#F6AD55", title: "Cross-site cookies, if it needs a login",
                body: "A session cookie without SameSite=None; Secure is dropped inside a cross-origin iframe, so users would hit a login screen that can never succeed. Worth testing before launch.",
              },
            ].map(r => (
              <div key={r.title} className="flex items-start gap-3 px-4 py-3.5 rounded-xl" style={{ background: "#141B2E", border: `1px solid ${r.color}22` }}>
                <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 32, height: 32, background: `${r.color}1A`, color: r.color }}>
                  {r.icon}
                </div>
                <div>
                  <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.7 }}>{r.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Page>
    );
  }

  /* ── Configured: render the frame ── */
  const frame = (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "#0B1120",
        height: fullscreen ? "calc(100vh - 96px)" : 720,
      }}
    >
      {state !== "ready" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "#0B1120", zIndex: 2 }}
        >
          {state === "loading" ? (
            <>
              <Loader2 size={26} color="#5B7BF5" className="animate-spin" />
              <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Loading VitalClone…</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11, ...MONO, opacity: 0.7 }}>{VITALCLONE_URL}</div>
            </>
          ) : (
            <div style={{ textAlign: "center", maxWidth: 460, padding: 24 }}>
              <TriangleAlert size={26} color="#F6AD55" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 8 }}>
                VitalClone didn't load
              </div>
              <p style={{ color: "var(--muted-foreground)", fontSize: 12.5, lineHeight: 1.75, marginBottom: 16 }}>
                No response after {LOAD_TIMEOUT_MS / 1000} seconds. The most common cause is VitalClone refusing to be framed
                (<span style={{ ...MONO }}>X-Frame-Options</span> or a restrictive <span style={{ ...MONO }}>frame-ancestors</span> policy).
                Open it in a new tab to check whether the site itself is up.
              </p>
              <div className="flex items-center justify-center gap-2">
                <GhostButton onClick={reload}><RefreshCw size={13} /> Retry</GhostButton>
                <PrimaryButton onClick={() => window.open(VITALCLONE_URL, "_blank", "noopener,noreferrer")}>
                  <ExternalLink size={13} /> Open in new tab
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      )}

      <iframe
        key={nonce}
        src={VITALCLONE_URL}
        title="VitalClone"
        onLoad={onFrameLoad}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        allow="clipboard-write; fullscreen"
        style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#0B1120" }}
      />
    </div>
  );

  return (
    <Page width={fullscreen ? 2000 : 1240}>
      <PageHeader
        eyebrow="EXTERNAL INTEGRATION · EMBEDDED"
        icon={<Activity size={13} />}
        title="VitalClone"
        description="VitalClone runs inside Final Pass Down as an embedded application. Your session here stays separate from theirs."
        actions={
          <>
            <GhostButton onClick={reload}><RefreshCw size={13} /> Reload</GhostButton>
            <GhostButton onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <><Minimize2 size={13} /> Exit Fullscreen</> : <><Maximize2 size={13} /> Fullscreen</>}
            </GhostButton>
            <PrimaryButton onClick={() => window.open(VITALCLONE_URL, "_blank", "noopener,noreferrer")}>
              <ExternalLink size={13} /> Open in New Tab
            </PrimaryButton>
          </>
        }
      />
      {frame}
      <div className="flex items-start gap-3 px-5 py-3.5 rounded-2xl" style={{ background: "rgba(58,91,217,0.03)", border: "1px solid rgba(58,91,217,0.1)" }}>
        <ShieldCheck size={15} color="#5B7BF5" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.7 }}>
          VitalClone is a third-party service loaded in a sandboxed frame. It cannot read your Final Pass Down vault,
          and anything you enter there is governed by VitalClone's own privacy policy.
        </div>
      </div>
    </Page>
  );
}
