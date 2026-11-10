// The link that ties a contact row to the contact's own Final Pass Down login
// (migration 046). Sent in the Legacy/Guardian invite and, for a legacy
// contact who never accepted it, again in the "access is live" email.
//
// Only a SHA-256 of the token is stored. Issuing a new link replaces the old
// hash, so only the newest emailed link works.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2.49.8";

export const CONTACT_LINK_DAYS = 30;

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare, for token hashes. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Stores a fresh link on the contact and returns the raw token for the email. */
export async function issueContactLink(db: SupabaseClient, contactId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
  const expires = new Date(Date.now() + CONTACT_LINK_DAYS * 86_400_000);
  const { error } = await db.from("contacts")
    .update({ invite_token_hash: await sha256Hex(token), invite_token_expires_at: expires.toISOString() })
    .eq("id", contactId);
  if (error) throw error;
  return token;
}

export function contactAcceptPath(token: string): string {
  return `/contact-accept/${token}`;
}
