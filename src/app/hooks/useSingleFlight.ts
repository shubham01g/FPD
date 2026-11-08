import { useCallback, useRef, useState } from "react";

/**
 * Ignores repeat clicks while a save is still running.
 *
 * Forms across Life Records had no busy guard, so a double click on Save
 * inserted the same record twice (seen live: two identical job_history rows).
 * Wrap a handler with `guard(fn)`; while it runs, further calls are dropped
 * and `busy` is true (use it to disable the button).
 */
export function useSingleFlight() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const guard = useCallback(<A extends unknown[]>(fn: (...args: A) => unknown) => async (...args: A) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await fn(...args);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, guard };
}
