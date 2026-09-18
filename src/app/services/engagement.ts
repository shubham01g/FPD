/**
 * Lightweight product-usage telemetry — feeds the MasterAdmin Analytics tab's
 * Feature Adoption Rate and Monthly Engagement panels (migration 021's
 * app_events table). Fire-and-forget: a failed write never surfaces to the
 * user or blocks navigation.
 */
import { supabase } from "./supabase";

const SESSION_KEY = "fpd_session_id";
export const HEARTBEAT_INTERVAL_MS = 60_000;

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-call id, so
    // the event still lands (just as its own single-event "session").
    return crypto.randomUUID();
  }
}

async function logEvent(userId: string, eventType: "page_view" | "heartbeat", path: string) {
  try {
    await supabase.from("app_events").insert({ user_id: userId, session_id: sessionId(), event_type: eventType, path });
  } catch {
    /* best-effort telemetry only */
  }
}

export function trackPageView(userId: string, path: string): void {
  void logEvent(userId, "page_view", path);
}

export function trackHeartbeat(userId: string, path: string): void {
  void logEvent(userId, "heartbeat", path);
}
