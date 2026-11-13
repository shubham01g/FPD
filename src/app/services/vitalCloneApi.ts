/**
 * One-click sign-in into Vital Clone — supabase/functions/server/routes/vitalCloneHandoff.ts.
 *
 * Vital Clone is a separate app with its own accounts. The server mints a
 * 60-second, single-use token for the signed-in member; Vital Clone's /sso
 * page exchanges it for a session there.
 */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

/** Where Vital Clone is served. Override per environment with VITE_VITALCLONE_URL. */
const envUrl = import.meta.env.VITE_VITALCLONE_URL;
export const VITALCLONE_URL: string = (
  typeof envUrl === "string" && /^https:\/\/[^\s]+$/.test(envUrl.trim()) ? envUrl.trim() : "https://vital-clone.vercel.app"
).replace(/\/+$/, "");

export class HandoffError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

/** Asks the server for a handoff token and returns the Vital Clone URL that consumes it. */
export async function vitalCloneSignInUrl(): Promise<string> {
  if (!SERVER_BASE) throw new HandoffError("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new HandoffError("Your session has expired. Sign in again.");
  const res = await fetch(`${SERVER_BASE}/account/vital-clone/handoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: "{}",
  });
  const json = await res.json().catch(() => null) as { token?: string; error?: string; code?: string } | null;
  if (!res.ok || !json?.token) {
    throw new HandoffError(json?.error ?? `Couldn't sign you in to Vital Clone (status ${res.status}).`, json?.code);
  }
  // Fragment, not query string: it never reaches a server log or a Referer header.
  return `${VITALCLONE_URL}/sso#fpd_token=${encodeURIComponent(json.token)}`;
}
