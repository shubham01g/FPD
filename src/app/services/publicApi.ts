/**
 * Fetch wrapper for the unauthenticated, read-only endpoints in
 * supabase/functions/server/routes/public.ts (pricing, WL packages) — the
 * data customer-facing pages (landing page, storage upgrade screen, WL
 * onboarding) need without an admin session. See adminApi.ts for the
 * admin-authenticated counterpart.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/public` : null;

export class PublicApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "PublicApiError";
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  // See adminApi.ts's request() for why a missing project URL and a
  // non-JSON 200 (Vite's SPA fallback serving index.html) both need to throw
  // instead of being read as valid empty data.
  if (!FUNCTIONS_BASE) {
    throw new PublicApiError(0, "No Supabase project connected (VITE_SUPABASE_URL is not set)");
  }

  const res = await fetch(`${FUNCTIONS_BASE}${path}`);
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok || !isJson) {
    const message = (isJson && body && typeof body === "object" && "error" in body)
      ? String(body.error)
      : !isJson
        ? `Unexpected non-JSON response (status ${res.status})`
        : `Request failed with status ${res.status}`;
    throw new PublicApiError(res.status, message);
  }
  return body as T;
}

export const publicApi = {
  get: <T>(path: string) => request<T>(path),
};
