import React, { useEffect, useRef, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNetStatus } from "../hooks/useNetStatus";
import { checkConnection } from "../services/netStatus";

/**
 * The shell's connectivity strip, plus the notice that a save was lost.
 *
 * Before this existed the app went quietly wrong offline: the service worker
 * served the cached shell, React booted, and then every Supabase call failed
 * into each screen's own empty state — so a user on a plane saw a working app
 * full of blank pages and had no way to know why.
 *
 * Both signals are centralised here on purpose. Because every request runs
 * through the instrumented fetch in services/supabase.ts, one component in the
 * shell covers all 35+ feature screens, and none of them need offline code.
 */

const AMBER = "#F6AD55";
const AMBER_DIM = "rgba(246,173,85,0.12)";
const AMBER_EDGE = "rgba(246,173,85,0.28)";

const BANNER_CSS = `
.fpd-offline{
  display:flex; align-items:center; gap:10px;
  padding:9px 22px;
  padding-left:max(22px, env(safe-area-inset-left));
  padding-right:max(22px, env(safe-area-inset-right));
  background:${AMBER_DIM};
  border-bottom:1px solid ${AMBER_EDGE};
  flex-shrink:0;
}
.fpd-offline .fpd-offline-icon{color:${AMBER}; flex-shrink:0;}
.fpd-offline .fpd-offline-text{min-width:0; font-size:14.5px; line-height:1.45;}
.fpd-offline .fpd-offline-title{color:#F3D9B8; font-weight:600;}
.fpd-offline .fpd-offline-detail{color:#C4A987;}
.fpd-offline .fpd-offline-retry{
  margin-left:auto; flex-shrink:0;
  display:flex; align-items:center; gap:6px;
  height:30px; padding:0 11px; border-radius:8px;
  background:rgba(246,173,85,0.10); border:1px solid ${AMBER_EDGE};
  color:${AMBER}; font-size:14px; font-weight:600; white-space:nowrap;
}
.fpd-offline .fpd-offline-retry:disabled{opacity:0.6;}
.fpd-offline .fpd-spin{animation:fpd-offline-spin 0.9s linear infinite;}
@keyframes fpd-offline-spin{to{transform:rotate(360deg);}}

/* 640: the detail sentence is the first thing to go — the title and the retry
   button carry the message on their own. 430/640 are the portal's tiers. */
@media (max-width:640px){
  .fpd-offline{padding:8px 14px; gap:8px;}
  .fpd-offline .fpd-offline-detail{display:none;}
  .fpd-offline .fpd-offline-text{font-size:14px;}
  .fpd-offline .fpd-offline-retry{height:36px; padding:0 12px;}
}
@media (max-width:430px){
  .fpd-offline .fpd-offline-retry span{display:none;}
  .fpd-offline .fpd-offline-retry{padding:0 10px; width:36px; justify-content:center;}
}
@media (prefers-reduced-motion:reduce){
  .fpd-offline .fpd-spin{animation:none;}
}
`;

/**
 * One toast per burst of lost writes. The fixed id is what does the collapsing:
 * a form saving five rows at once is one problem, not five notifications.
 */
function toastLostWrite() {
  toast.error("That didn’t save — you’re offline.", {
    id: "fpd-offline-write",
    description: "Your change is still on screen but has not reached the vault. Try again once the connection is back.",
    duration: 8000,
  });
}

export function OfflineBanner() {
  const { online, failedWrites } = useNetStatus();
  const [checking, setChecking] = useState(false);
  // Only increments matter; the count at mount is history, not news.
  const seenWrites = useRef(failedWrites);

  useEffect(() => {
    if (failedWrites === seenWrites.current) return;
    seenWrites.current = failedWrites;
    // A fixed id collapses a burst — a form saving five rows at once is one
    // problem, not five toasts.
    toastLostWrite();
  }, [failedWrites]);

  if (online) return null;

  const retry = async () => {
    setChecking(true);
    try {
      await checkConnection();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fpd-offline" role="status" aria-live="polite">
      <style>{BANNER_CSS}</style>
      <CloudOff size={16} className="fpd-offline-icon" />
      <div className="fpd-offline-text">
        <span className="fpd-offline-title">You’re offline.</span>{" "}
        <span className="fpd-offline-detail">
          You can read what’s already loaded, but changes won’t be saved until the connection is back.
        </span>
      </div>
      <button className="fpd-offline-retry" onClick={retry} disabled={checking} title="Check the connection again">
        <RefreshCw size={13} className={checking ? "fpd-spin" : undefined} />
        <span>{checking ? "Checking…" : "Check again"}</span>
      </button>
    </div>
  );
}
