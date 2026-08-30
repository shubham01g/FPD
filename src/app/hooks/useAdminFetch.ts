import { useCallback, useEffect, useState } from "react";

interface AdminFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Runs `fetcher` on mount and whenever `deps` change, exposing
 * loading/error/data so admin screens don't each hand-roll it.
 * `deps` should list every value the fetcher closes over (filters, ids, ...).
 */
export function useAdminFetch<T>(fetcher: () => Promise<T>, deps: unknown[]): AdminFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong loading this data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => load(), [load, tick]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}
