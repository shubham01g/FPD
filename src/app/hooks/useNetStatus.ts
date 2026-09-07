import { useSyncExternalStore } from "react";
import { getNetState, subscribeNetStatus, type NetState } from "../services/netStatus";

/**
 * Live backend reachability, from the store in services/netStatus.
 *
 * useSyncExternalStore rather than useState + an effect: the store is written
 * from outside React (the instrumented fetch in services/supabase.ts, which
 * fires during a save, not during a render), and this is the primitive that
 * subscribes to exactly that without tearing.
 */
export function useNetStatus(): NetState {
  return useSyncExternalStore(subscribeNetStatus, getNetState, getNetState);
}

/** The common case: just "are we online". */
export function useOnline(): boolean {
  return useNetStatus().online;
}
