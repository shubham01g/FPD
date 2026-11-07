import { storedReferral } from "../utils/referral";
import { AuthError } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import { SERVER_BASE } from "./serverBase";

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

/* Forgotten password. Supabase emails a link that opens /reset-password
   with a recovery session; ResetPasswordPage then sets the new password.
   The redirect URL must be listed under Supabase → Authentication → URL
   Configuration → Redirect URLs. */
export async function requestPasswordReset(email: string) {
  if (!isSupabaseConfigured) return notConfigured();
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/* Change the password from Account Settings. Done on the server
   (routes/password.ts), which checks the current password without replacing
   this session and requires the account's 2FA to have been passed. */
export async function changePassword(current: string, next: string): Promise<void> {
  if (!SERVER_BASE) throw new Error("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  const res = await fetch(`${SERVER_BASE}/account/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ current, next }),
  });
  const body = await res.json().catch(() => null) as { error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? `Couldn't change the password (status ${res.status}).`);
}

export async function signOut() {
  return supabase.auth.signOut();
}
