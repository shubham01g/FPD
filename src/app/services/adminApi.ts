/**
 * Thin fetch wrapper for the admin backend built in
 * supabase/functions/server/. Every admin screen should go through this
 * instead of calling fetch() directly, so auth headers, error shapes, and
 * the base URL only live in one place.
 *
 * Requires a signed-in Supabase session (the backend's requireAdmin
 * middleware checks the bearer token + users.is_admin).
 */
import { supabase } from "./supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/server/make-server-b5ad85e0/admin` : null;

export class AdminApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Without a real project URL this would otherwise build a bare relative
  // path — the browser resolves that against the current page origin, Vite's
  // dev server SPA-fallbacks it to index.html with a 200, and the caller
  // would silently treat that HTML page as valid (empty) API data instead of
  // seeing an error. Fail loudly instead.
  if (!FUNCTIONS_BASE) {
    throw new AdminApiError(0, "No Supabase project connected (VITE_SUPABASE_URL is not set)", null);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok || !isJson) {
    const message = (isJson && body && typeof body === "object" && "error" in body)
      ? String((body as { error: unknown }).error)
      : !isJson
        ? `Unexpected non-JSON response (status ${res.status}) — is the backend deployed and reachable?`
        : `Request failed with status ${res.status}`;
    throw new AdminApiError(res.status, message, body);
  }

  return body as T;
}

export const adminApi = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
