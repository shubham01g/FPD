import { AuthError } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

// Without env vars the client points at a placeholder domain, so every auth call
// dies in fetch() with an opaque "Failed to fetch" that tells nobody what to do.
// Fail fast with the actual cause and keep the { data, error } shape callers expect.
const NOT_CONFIGURED_MESSAGE =
  "This site is not connected to Supabase. Set VITE_SUPABASE_URL and " +
  "VITE_SUPABASE_ANON_KEY in the hosting project's environment variables and redeploy.";

function notConfigured() {
  return {
    data: { user: null, session: null },
    error: new AuthError(NOT_CONFIGURED_MESSAGE, 500, "supabase_not_configured"),
  };
}

export async function signUpWithPassword(email: string, password: string, fullName: string) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
