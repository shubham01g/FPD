/**
 * Vault passphrase reset by emailed link — the app side of
 * supabase/functions/server/routes/vaultReset.ts (migration 043).
 *
 * Same request shape as services/twoFactor.ts (fresh token per call, non-JSON
 * treated as failure), pointed at /account/vault behind requireUser. A link
 * that can't be used comes back as `{ ok: false, problem }` rather than an
 * exception, so the reset page can say exactly why.
 */
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/account/vault`
  : null;

export type ResetProblem = "invalid" | "wrong_account" | "used" | "expired";

export type ResetCheck =
  | { ok: true; email: string; passwords: number; subscriptions: number }
  | { ok: false; problem: ResetProblem };

async function request<T>(path: string, method: "GET" | "POST"): Promise<T> {
  if (!FUNCTIONS_BASE) throw new Error("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;
  if (body && typeof body === "object" && "problem" in body) return body as T;
  if (!res.ok || !isJson) {
    throw new Error(body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : `Request failed (status ${res.status}) — is the server function deployed?`);
  }
  return body as T;
}

/** Emails a one-time link to the account's registered address. */
export function requestVaultReset() {
  return request<{ emailed: true; to: string; minutes: number }>("/reset-request", "POST");
}

export function checkVaultReset(token: string) {
  return request<ResetCheck>(`/reset/${encodeURIComponent(token)}`, "GET");
}

export function confirmVaultReset(token: string) {
  return request<{ ok: true; changed: number } | { ok: false; problem: ResetProblem }>(`/reset/${encodeURIComponent(token)}`, "POST");
}
