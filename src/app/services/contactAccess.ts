/**
 * Access Portal — the app side of supabase/functions/server/routes/
 * contactAccess.ts (migration 046). The signed-in user here is a Legacy or
 * Guardian CONTACT reading what another account shared with them.
 *
 * Same request shape as services/vaultReset.ts: fresh token per call, an
 * unusable invite comes back as `{ ok: false, problem }` rather than throwing.
 */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

const FUNCTIONS_BASE = SERVER_BASE ? `${SERVER_BASE}/account/access` : null;

export type InviteProblem = "invalid" | "expired" | "own_account" | "linked_other";
export type InviteCheck =
  | { ok: true; kind: "legacy" | "guardian"; contactName: string; ownerName: string; alreadyAccepted: boolean }
  | { ok: false; problem: InviteProblem };

export type GrantStatus = "active" | "awaiting_verification" | "awaiting_claim" | "awaiting_activation" | "expired" | "rejected";
export interface SharedOwner {
  ownerId: string; ownerName: string; kind: "legacy" | "guardian"; status: GrantStatus; expiresAt: string | null;
  /** Legacy only: the owner's continuation fee is paid (it may still await activation). */
  feePaid?: boolean;
}

export interface OwnerSections {
  owner: { id: string; name: string };
  kind: "legacy" | "guardian";
  expiresAt: string | null;
  canDownload: boolean;
  sections: { key: string; label: string }[];
}

export interface PortalField { label: string; value: string | null; encrypted?: boolean }
export interface PortalRow { id: string; title: string; fields: PortalField[]; photos: string[] }
export interface SectionData {
  section: { key: string; label: string };
  groups: { label: string; rows: PortalRow[] }[];
}

export interface PortalDocument {
  id: string; name: string; description: string | null; fileType: string;
  sizeBytes: number; uploadedAt: string; folder: string;
}

async function request<T>(path: string, method: "GET" | "POST" = "GET"): Promise<T> {
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

export function checkContactInvite(token: string) {
  return request<InviteCheck>(`/invite/${encodeURIComponent(token)}`);
}

export function acceptContactInvite(token: string) {
  return request<{ ok: true } | { ok: false; problem: InviteProblem }>(`/invite/${encodeURIComponent(token)}`, "POST");
}

/** A legacy contact pays the owner's continuation fee: returns the Stripe Checkout URL. */
export async function startContactFeeCheckout(ownerId: string) {
  return (await request<{ url: string }>(`/${encodeURIComponent(ownerId)}/checkout-fee`, "POST")).url;
}

export async function listSharedOwners() {
  return (await request<{ owners: SharedOwner[] }>("/owners")).owners;
}

export function getOwnerSections(ownerId: string) {
  return request<OwnerSections>(`/${encodeURIComponent(ownerId)}/sections`);
}

export function getSection(ownerId: string, key: string) {
  return request<SectionData>(`/${encodeURIComponent(ownerId)}/section/${encodeURIComponent(key)}`);
}

export async function listOwnerDocuments(ownerId: string) {
  return (await request<{ documents: PortalDocument[] }>(`/${encodeURIComponent(ownerId)}/documents`)).documents;
}

/** A 5-minute signed URL. `download` is honoured for Legacy Contacts only. */
export async function documentUrl(ownerId: string, docId: string, download = false) {
  const q = download ? "?download=1" : "";
  return (await request<{ url: string }>(`/${encodeURIComponent(ownerId)}/documents/${encodeURIComponent(docId)}/url${q}`)).url;
}

export interface OwnerExport {
  owner: { id: string; name: string };
  exportedAt: string;
  sections: SectionData[];
  documents: { id: string; name: string; folder: string; sizeBytes: number; url: string | null }[];
}

/** Legacy Contacts with active access only: everything, for the archive. */
export function getOwnerExport(ownerId: string) {
  return request<OwnerExport>(`/${encodeURIComponent(ownerId)}/export`);
}
