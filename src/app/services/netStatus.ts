/**
 * Network reachability — one source of truth for "can we reach the backend".
 *
 * `navigator.onLine` is not that, despite the name: it reports whether the
 * device has *a* network interface, so a phone on captive-portal wifi and a
 * laptop behind a dead router both report `true` while every request fails.
 * It is trusted here only as a negative signal — `false` genuinely means down.
 *
 * The positive signal is the traffic the app already makes. Every Supabase
 * request runs through the instrumented fetch in `services/supabase.ts` and
 * reports its outcome here. A response that arrives — even a 401 or a 500 —
 * proves the round trip worked; only a *rejected* fetch is a connectivity
 * failure. That distinction matters: counting HTTP errors as "offline" would
 * make an RLS denial look like a dropped connection.
 *
 * An app sitting idle offline makes no requests, so it would never notice the
 * connection returning. A cheap same-origin probe covers that, on a backoff,
 * paused while the tab is hidden so a backgrounded phone is not kept awake.
 */

/* Tiny, always deployed, and the service worker does not intercept it (it is
   neither a navigation nor /assets/*), so a hit here is a real round trip. */
const PROBE_PATH = "/manifest.webmanifest";

/* Where the recovery probe actually knocks. Set by services/supabase.ts. */
let probeTarget: string | null = null;

/**
 * Point the recovery probe at the real backend.
 *
 * Probing our own origin answers the wrong question: a healthy CDN and a dead
 * database look identical to it, so the banner would clear itself the instant
 * the probe succeeded and reappear on the next save — flickering around an
 * outage it never actually detected.
 *
 * `null` keeps the same-origin fallback, which is the right answer when
 * Supabase is not configured at all: that is a deployment problem, not a
 * connectivity one, and calling it "offline" would send someone hunting for
 * wifi that was never the issue.
 */
export function setProbeTarget(url: string | null): void {
  probeTarget = url;
}
const BACKOFF_MS = [2000, 4000, 8000, 15000, 30000];
/* An interface coming back up is not the same as traffic flowing; give the
   stack a moment rather than burning the first probe on a race. */
const SETTLE_MS = 250;

export interface NetState {
  /** False once there is evidence the backend is unreachable. */
  readonly online: boolean;
  /**
   * Increments once per write that never reached the server. The shell watches
   * this to tell the user their save did not land, which is why no individual
   * screen needs offline code of its own.
   */
  readonly failedWrites: number;
}

let state: NetState = { online: true, failedWrites: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<NetState>): void {
  const merged: NetState = { ...state, ...next };
  if (merged.online === state.online && merged.failedWrites === state.failedWrites) return;
  // A fresh object every time: useSyncExternalStore compares snapshots by
  // identity, so mutating in place would render nothing.
  state = merged;
  listeners.forEach((fn) => fn());
}

export function getNetState(): NetState {
  return state;
}

export function subscribeNetStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── Recovery probing ────────────────────────────────────────

let probeTimer: ReturnType<typeof setTimeout> | null = null;
let attempt = 0;

function armProbe(delayMs: number): void {
  if (probeTimer !== null) return; // one in flight is enough
  if (typeof document !== "undefined" && document.hidden) return; // resumed on visibilitychange
  probeTimer = setTimeout(() => {
    probeTimer = null;
    void probe();
  }, delayMs);
}

function nextBackoff(): number {
  const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
  attempt += 1;
  return delay;
}

function cancelProbing(): void {
  if (probeTimer !== null) clearTimeout(probeTimer);
  probeTimer = null;
  attempt = 0;
}

/** Drops any pending probe and tries again promptly, from the top of the backoff. */
function restartProbing(): void {
  cancelProbing();
  if (!state.online) armProbe(SETTLE_MS);
}

async function probe(): Promise<void> {
  if (state.online) return cancelProbing();
  // A conclusive `false` needs no request to confirm it.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    armProbe(nextBackoff());
    return;
  }
  try {
    // `no-store` plus a unique query defeats both the HTTP cache and any
    // intermediary that would answer from disk and fake a recovery.
    // no-cors on the cross-origin target: an opaque response still resolves,
    // which is all the proof required, and it keeps the probe out of CORS.
    await fetch(`${probeTarget ?? PROBE_PATH}?probe=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      mode: probeTarget ? "no-cors" : "same-origin",
    });
    // Any response at all — 200, 404, whatever — proves the round trip.
    reportReachable();
  } catch {
    armProbe(nextBackoff());
  }
}

// ── Reporting (called by the instrumented fetch) ─────────────

/** A request completed. Whatever its status, the network is working. */
export function reportReachable(): void {
  if (state.online) return;
  cancelProbing();
  set({ online: true });
}

/**
 * A request never reached the server.
 *
 * @param wasWrite true when the lost request was a user edit rather than a
 *                 read, which is what earns the user a "that didn't save"
 *                 notice on top of the banner.
 */
export function reportUnreachable(wasWrite: boolean): void {
  set({
    online: false,
    failedWrites: wasWrite ? state.failedWrites + 1 : state.failedWrites,
  });
  armProbe(nextBackoff());
}

/** Wires the browser's own signals. Called once, from main.tsx. */
export function initNetStatus(): void {
  if (typeof window === "undefined") return;

  // `offline` is trustworthy on its own; `online` only means an interface came
  // up, so it triggers a probe rather than declaring victory.
  window.addEventListener("offline", () => reportUnreachable(false));
  window.addEventListener("online", restartProbing);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelProbing(); // nothing to show a hidden tab; stop spending radio
      return;
    }
    // Coming back to a tab that was offline is the moment the user most wants
    // an answer, and the phone has usually just reconnected.
    restartProbing();
  });

  if (navigator.onLine === false) reportUnreachable(false);
}

/**
 * Manual "check again", for the banner's retry button.
 *
 * The backoff already retries on its own; this exists because a user who has
 * just walked back into wifi should not have to wait out a 30s timer, and
 * because a button that visibly reports back is more reassuring than a strip
 * that silently changes its mind.
 *
 * @returns whether the backend was reachable on this attempt
 */
export async function checkConnection(): Promise<boolean> {
  cancelProbing();
  await probe();
  return state.online;
}
