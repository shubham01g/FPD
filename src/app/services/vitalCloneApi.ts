/**
 * Vital Clone inside Final Pass Down — supabase/functions/server/routes/vitalCloneHandoff.ts.
 *
 * Vital Clone is a separate app with its own accounts. FPD is a partner in its
 * partner program, so Vital Clone is loaded through FPD's partner link (an
 * admin saves it in System → Settings → Feature Flags), and the sign-in token
 * carries FPD's partner slug. The server decides the address; the page never
 * builds it from anything else.
 *
 *   getVitalCloneStatus()      the clickwrap, whether it's accepted, the address
 *   acceptVitalCloneConsent()  records acceptance of the wording shown
 *   requestVitalCloneEntry()   a 60-second, single-use sign-in, as a URL
 */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

export interface VitalCloneConsent {
  version: string;
  title: string;
  paragraphs: string[];
  checkbox: string;
  termsUrl: string;
  privacyUrl: string;
}

export interface VitalCloneStatus {
  enabled: boolean;
  consented: boolean;
  consent: VitalCloneConsent;
  /** https://host of Vital Clone; messages from the frame must come from here. */
  origin: string;
  /** FPD's partner link, or Vital Clone's /sso page when none is saved. */
  entryUrl: string;
  partnerLinked: boolean;
}

export class HandoffError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SERVER_BASE) throw new HandoffError("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new HandoffError("Your session has expired. Sign in again.", "signed_out");
  const res = await fetch(`${SERVER_BASE}/account/vital-clone${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
  });
  const json = await res.json().catch(() => null) as (T & { error?: string; code?: string }) | null;
  if (!res.ok || !json) {
    throw new HandoffError(json?.error ?? `Vital Clone isn't available right now (status ${res.status}).`, json?.code);
  }
  return json;
}

export function getVitalCloneStatus(): Promise<VitalCloneStatus> {
  return call<VitalCloneStatus>("/status");
}

export function acceptVitalCloneConsent(version: string): Promise<{ consented: true; version: string }> {
  return call("/consent", { method: "POST", body: JSON.stringify({ version }) });
}

/**
 * Mints a sign-in and returns the address that uses it: FPD's partner link
 * (which counts the visit for FPD) with the token in the fragment, which never
 * reaches a server log or a Referer header. `embed` marks it as loaded inside
 * this page, so Vital Clone opens payments in a new tab.
 */
export async function requestVitalCloneEntry(embed: boolean): Promise<{ url: string; origin: string }> {
  const json = await call<{ token?: string; origin: string; entryUrl: string }>("/handoff", { method: "POST", body: "{}" });
  if (!json.token) throw new HandoffError("Couldn't sign you in to Vital Clone.");
  return {
    url: `${json.entryUrl}${embed ? "?embed=1" : ""}#fpd_token=${encodeURIComponent(json.token)}`,
    origin: json.origin,
  };
}
