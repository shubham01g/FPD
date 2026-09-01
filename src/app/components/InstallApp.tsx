import React, { useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { canPrompt, isIOS, isStandalone, promptInstall, subscribeInstall } from "../pwa";

/**
 * "Install app" control — adds Final Pass Down to the home screen (mobile) or
 * the dock / Start menu (desktop).
 *
 * Renders nothing at all when there is nothing useful to offer: already
 * installed, the browser has not signalled installability, or the user has
 * dismissed it before. iOS gets a short instruction popover instead of a
 * button that would do nothing, because Safari has no programmatic install.
 */

const BORDER = "1px solid rgba(91,110,225,0.18)";
const DISMISS_KEY = "fpd.install-dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false; // private mode / storage disabled — just show it
  }
}

export function InstallApp() {
  const [available, setAvailable] = useState(canPrompt());
  const [standalone, setStandalone] = useState(isStandalone());
  const [dismissed, setDismissed] = useState(wasDismissed());
  const [iosHelp, setIosHelp] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const ios = isIOS();

  useEffect(
    () =>
      subscribeInstall(() => {
        setAvailable(canPrompt());
        setStandalone(isStandalone());
      }),
    []
  );

  // Installing on desktop can leave the tab open; keep the button honest.
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!iosHelp) return;
    const onClick = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setIosHelp(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [iosHelp]);

  if (standalone || dismissed) return null;
  if (!available && !ios) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* nothing to persist to; hiding for this session is enough */
    }
    setDismissed(true);
  };

  const onClick = async () => {
    if (ios) {
      setIosHelp((o) => !o);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setStandalone(true);
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={onClick}
        title="Install Final Pass Down as an app"
        aria-label="Install Final Pass Down as an app"
        // fpd-install: the shell grows this to a 44px touch target on phones
        // (see SHELL_CSS in Layout.tsx). Height is set there, not here, so the
        // media query is not outranked by an inline value.
        className="fpd-install flex items-center gap-1.5 rounded-lg"
        style={{
          padding: "0 10px",
          background: "rgba(91,110,225,0.1)",
          border: BORDER,
          color: "#6FAE8B",
          fontSize: 14.5,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,110,225,0.2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(91,110,225,0.1)")}
      >
        <Download size={16} />
        <span className="hidden lg:inline">Install app</span>
      </button>

      {iosHelp && (
        <div
          className="absolute rounded-xl"
          style={{
            // Tracks the button, which grows to 44px on phones.
            top: "calc(100% + 8px)",
            right: 0,
            width: "min(268px, calc(100vw - 24px))",
            zIndex: 60,
            background: "#0D1421",
            border: BORDER,
            boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
            padding: 14,
          }}
        >
          <div className="flex items-start justify-between gap-2" style={{ marginBottom: 10 }}>
            <div style={{ color: "#EFF2F9", fontSize: 15, fontWeight: 600 }}>Add to Home Screen</div>
            <button onClick={() => setIosHelp(false)} style={{ color: "#A3ADC9" }} title="Close">
              <X size={14} />
            </button>
          </div>
          <p style={{ color: "#A3ADC9", fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>
            iOS installs apps by hand — Safari has no install button to press for you.
          </p>
          <div className="flex items-center gap-2" style={{ color: "#BCC5DA", fontSize: 14, marginBottom: 6 }}>
            <Share size={14} color="#6FAE8B" /> Tap Share in the browser bar
          </div>
          <div className="flex items-center gap-2" style={{ color: "#BCC5DA", fontSize: 14 }}>
            <SquarePlus size={14} color="#6FAE8B" /> Choose “Add to Home Screen”
          </div>
          <button
            onClick={dismiss}
            style={{ marginTop: 12, color: "#929CBC", fontSize: 13.5, textDecoration: "underline" }}
          >
            Don’t show this again
          </button>
        </div>
      )}
    </div>
  );
}
