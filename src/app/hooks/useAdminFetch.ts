import { useCallback, useEffect, useRef, useState } from "react";

// Shared polling cadence for admin screens that should reflect new signups
// and activity without a manual reload.
export const ADMIN_LIVE_POLL_MS = 15_000;

interface AdminFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Timestamp (ms) of the last successful load, so callers can show "updated Xs ago". */
  updatedAt: number | null;
  refetch: () => void;
}

/**
 * Runs `fetcher` on mount and whenever `deps` change, exposing
 * loading/error/data so admin screens don't each hand-roll it.
 * `deps` should list every value the fetcher closes over (filters, ids, ...).
 *
 * Pass `intervalMs` to also re-poll on a timer, so screens showing live
 * activity (new signups, verification queue, audit log) pick it up without
 * a manual reload. Polling pauses while the tab is backgrounded and resumes
 * (with an immediate refresh) when it's foregrounded again.
 */
export function useAdminFetch<T>(fetcher: () => Promise<T>, deps: unknown[], intervalMs?: number): AdminFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  // Once data has landed once, later refreshes (polling, filter changes,
  // manual refetch) happen silently instead of blanking the screen with a
  // spinner — only the very first load shows "loading".
  const hasLoadedRef = useRef(false);

  const load = useCallback(() => {
    let cancelled = false;
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    fetcher()
      .then((result) => { if (!cancelled) { hasLoadedRef.current = true; setData(result); setUpdatedAt(Date.now()); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong loading this data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => load(), [load, tick]);

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => { if (!document.hidden) setTick((t) => t + 1); }, intervalMs);
    const onVisible = () => { if (!document.hidden) setTick((t) => t + 1); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, loading, error, updatedAt, refetch: () => setTick((t) => t + 1) };
}
