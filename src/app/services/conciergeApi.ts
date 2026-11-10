/**
 * Concierge Portal data — supabase/functions/server/routes/conciergePortal.ts
 * (migration 051). Replaces the in-memory wgClientStore / waiverStore /
 * submissionStore the portal used to run on.
 */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

const BASE = SERVER_BASE ? `${SERVER_BASE}/concierge` : null;

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  if (!BASE) throw new Error("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null) as ({ error?: string } & T) | null;
  if (!res.ok || !json) throw new Error(json?.error ?? `Request failed (status ${res.status}) — is the server function deployed?`);
  return json;
}

export type SessionType = "phone" | "video" | "in_person";
export interface WgSession {
  id: string; client_id: string; session_type: SessionType; status: "scheduled" | "completed" | "cancelled" | "no_show";
  scheduled_at: string; duration_minutes: number | null; notes: string | null; meeting_url: string | null;
}
export interface WgWaiver { id: string; status: "pending" | "signed" | "declined" | "expired"; sent_at: string; signed_at: string | null; signed_name: string | null; token_expires_at: string | null }
export interface WgClientRow {
  id: string; user_id: string; status: "intake" | "active" | "completed" | "paused"; reason: string | null; notes: string | null;
  completion_pct: number; intake_date: string; completed_at: string | null; next_session_at: string | null;
  users: { full_name: string | null; email: string; phone: string | null } | null;
  wg_sessions: WgSession[];
  waiver: WgWaiver | null;
  card: { card_brand: string | null; card_last4: string | null } | null;
}

export interface ClientDocument { id: string; name: string; category: string; file_type: string | null; uploaded_at: string; url: string | null }

export const conciergeApi = {
  clients: () => request<{ clients: WgClientRow[] }>("/clients", "GET"),
  updateClient: (id: string, patch: { notes?: string; completionPct?: number; status?: string }) =>
    request<{ client: WgClientRow }>(`/clients/${id}`, "PATCH", patch),
  schedule: (id: string, s: { type: SessionType; scheduledAt: string; durationMinutes: number; meetingUrl?: string; notes?: string }) =>
    request<{ session: WgSession; emailed: boolean }>(`/clients/${id}/sessions`, "POST", s),
  updateSession: (id: string, patch: { scheduledAt?: string; status?: "cancelled" | "no_show"; meetingUrl?: string }) =>
    request<{ session: WgSession; emailed: boolean }>(`/sessions/${id}`, "PATCH", patch),
  complete: (id: string, b: { startedAt: string; endedAt: string; notes?: string; charge: boolean }) =>
    request<{ session: WgSession; billing: { invoiceStatus?: string; message?: string | null; duplicate?: boolean; session?: { amount_charged?: number } } | null }>(`/sessions/${id}/complete`, "POST", b),
  email: (id: string, subject: string, message: string) => request<{ sent: true }>(`/clients/${id}/email`, "POST", { subject, message }),
  sendWaiver: (id: string) => request<{ waiver: WgWaiver }>(`/clients/${id}/waiver`, "POST"),
  /** What the client sent from the White Glove page (waiver must be signed). */
  clientDocuments: (id: string) => request<{ documents: ClientDocument[] }>(`/clients/${id}/documents`, "GET"),

  /** Uploads a file into the client's vault (their waiver must be signed). */
  async uploadDocument(id: string, file: File, category: string) {
    const { path, token } = await request<{ path: string; token: string }>(`/clients/${id}/upload-url`, "POST", { name: file.name });
    const { error } = await supabase.storage.from("vault-documents").uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const fileType = file.type.startsWith("image") ? "image" : file.type.includes("pdf") ? "pdf" : file.type.startsWith("video") ? "video" : "other";
    return request<{ doc: { id: string; name: string } }>(`/clients/${id}/documents`, "POST", { path, name: file.name, category, fileType });
  },
};
