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
import { SERVER_BASE } from "./serverBase";
import { clearAdminAuthed, isAdminAuthed } from "./authSession";

const FUNCTIONS_BASE = SERVER_BASE ? `${SERVER_BASE}/admin` : null;

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

/* The backend answers 401 only when the bearer token is missing or expired.
   Inside the admin portal that means the Supabase session behind it is gone,
   so send the admin back to sign in instead of leaving every screen showing
   an auth error. Callers outside the portal (concierge, white-label context)
   are left alone. */
function expireAdminSession() {
  if (!isAdminAuthed() || !window.location.pathname.startsWith("/admin")) return;
  clearAdminAuthed();
  void supabase.auth.signOut().finally(() => window.location.assign("/admin/login?expired=1"));
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

  if (res.status === 401) expireAdminSession();

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
