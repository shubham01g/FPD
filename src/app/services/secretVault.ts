/**
 * Secret Vault PIN — the app side of supabase/functions/server/routes/
 * secretVault.ts (migration 049). Secret Vault rows and files can't be read
 * from the browser directly any more; every call goes through the server,
 * which checks the PIN for this sign-in session.
 */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

const BASE = SERVER_BASE ? `${SERVER_BASE}/account/secret-vault` : null;

export class SecretVaultError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number) { super(message); }
}

async function request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<T> {
  if (!BASE) throw new SecretVaultError("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new SecretVaultError("Your session has expired. Sign in again.");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null) as ({ error?: string; code?: string } & T) | null;
  if (!res.ok || !json) {
    throw new SecretVaultError(json?.error ?? `Request failed (status ${res.status}) — is the server function deployed?`, json?.code, res.status);
  }
  return json;
}

export interface SecretStatus { hasPin: boolean; unlockedUntil: string | null; lockedUntil: string | null }
export interface SecretDoc {
  id: string; name: string; file_path: string; file_size_bytes: number; file_type: string; uploaded_at: string;
  viewUrl: string | null; downloadUrl: string | null;
}

export const secretVault = {
  status: () => request<SecretStatus>("/status", "GET"),
  setPin: (pin: string, currentPin?: string) => request<{ unlockedUntil: string | null }>("/pin", "POST", { pin, currentPin }),
  unlock: (pin: string) => request<{ unlockedUntil: string | null }>("/unlock", "POST", { pin }),
  lock: () => request<{ ok: true }>("/lock", "POST"),
  forgotStart: () => request<{ sent: true }>("/forgot/start", "POST"),
  forgotFinish: (code: string, pin: string) => request<{ unlockedUntil: string | null }>("/forgot/finish", "POST", { code, pin }),
  list: () => request<{ docs: SecretDoc[] }>("/docs", "GET"),
  remove: (id: string) => request<{ ok: true }>(`/docs/${encodeURIComponent(id)}`, "DELETE"),

  /** Uploads straight to Storage with a one-time signed URL, then files it. */
  async upload(file: File): Promise<SecretDoc> {
    const { path, token } = await request<{ path: string; token: string }>("/upload-url", "POST", { name: file.name });
    const { error } = await supabase.storage.from("vault-documents").uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw new SecretVaultError(`Upload failed: ${error.message}`);
    const fileType = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video"
      : file.type.includes("pdf") ? "pdf" : "other";
    const { doc } = await request<{ doc: SecretDoc }>("/docs", "POST", { path, name: file.name, fileType });
    return doc;
  },
};
