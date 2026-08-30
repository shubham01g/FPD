// Service-role Supabase client for admin backend routes.
// Bypasses RLS — only ever used server-side, never exposed to the frontend.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2.49.8";

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
  }
  return _admin;
}

// Anon-key client, used only to validate a caller's session token via
// auth.getUser(token) — never to read/write tables directly.
export function anonClient(): SupabaseClient {
  if (!_anon) {
    _anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } },
    );
  }
  return _anon;
}
