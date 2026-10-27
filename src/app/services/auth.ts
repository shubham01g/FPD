import { storedReferral } from "../utils/referral";
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

export interface SignUpDemographics {
  gender?: string;
  birthdate?: string;
  country?: string;
  deviceType?: string;
  referralSource?: string;
}

export async function signUpWithPassword(email: string, password: string, fullName: string, demographics?: SignUpDemographics) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        gender: demographics?.gender || undefined,
        birthdate: demographics?.birthdate || undefined,
        country: demographics?.country || undefined,
        device_type: demographics?.deviceType || undefined,
        referral_source: demographics?.referralSource || undefined,
        // The affiliate whose link brought them here (migration 041).
        referral_code: storedReferral() ?? undefined,
      },
    },
  });
}

export async function signInWithPassword(email: string, password: string) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.signInWithPassword({ email, password });
}

/* Changing the sign-in email (client item 13). Supabase emails a
   confirmation link and only switches the address once it is clicked
   (with "Secure email change" on, both the old and the new address get a
   link). Migration 045 then copies the new address onto public.users. */
export async function requestEmailChange(newEmail: string) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.updateUser({ email: newEmail });
}

export async function signOut() {
  return supabase.auth.signOut();
}
