/**
 * PWA plumbing: service-worker registration + the install prompt.
 *
 * `beforeinstallprompt` fires once, early, and often before React has mounted.
 * If nothing calls preventDefault() on it the browser handles it itself and the
 * event is gone. So it is captured here at startup into a module-level slot,
 * and <InstallApp/> subscribes to that slot instead of listening on its own.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** True once the app is running from the home screen / dock rather than a tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates display-mode and reports this instead.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS never fires `beforeinstallprompt`; installing there is a manual gesture. */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ claims to be a Mac; the touch points give it away.
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}

export function canPrompt(): boolean {
  return deferred !== null;
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Shows the browser's own install dialog. Resolves true if the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event is single-use whatever the outcome.
  deferred = null;
  notify();
  return outcome === "accepted";
}

export function initInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/**
 * Fires when a newer service worker has installed and is ready to take over.
 * The worker calls skipWaiting()/clients.claim(), so the swap happens whether
 * or not anyone reloads — this just makes it visible instead of silent, so a
 * user mid-form is told rather than surprised.
 */
export function onUpdateReady(fn: () => void): void {
  updateHandler = fn;
}

let updateHandler: (() => void) | null = null;

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!import.meta.env.PROD) {
    // A worker left behind by a production build on this origin (a `vite preview`
    // on localhost, usually) would keep serving cached assets over the dev
    // server and make edits look like they did nothing. Clear it out.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    // Registration failing is never worth breaking the app over — the site
    // simply stays a normal, uninstallable website.
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            // `controller` is null on the very first install — that is a fresh
            // visit, not an update, and must not raise a "new version" notice.
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              updateHandler?.();
            }
          });
        });
      })
      .catch(() => {});
  });
}
