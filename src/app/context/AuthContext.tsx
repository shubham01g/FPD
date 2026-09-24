import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { getNativeChallengeState, getLocalTwoFactorSettings, getTwoFactorState } from "../services/twoFactor";

interface AuthCtx {
  session: Session | null;
  authUser: User | null;
  loading: boolean;
  /**
   * True when a valid session exists but has not satisfied the account's second
   * factor. The sign-in screens handle their own challenge inline; this exists
   * for the *restored* session case — persistSession means a reload hands back
   * a session that never passed the gate, and without this the route guards
   * would wave it straight through.
   */
  twoFactorPending: boolean;
  /**
   * Re-checks the second factor. Clearing an email OTP does not change the
   * Supabase session, so nothing fires onAuthStateChange — the sign-in screen
   * calls this itself once the code is accepted.
   */
  refreshTwoFactor: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

/**
 * Whether this session still owes a second factor.
 *
 * Native factors (authenticator, SMS) are answered by Supabase's own assurance
 * level. Email OTP has no factor type in Supabase, so the server keeps the
 * record instead and reports it as gateCleared.
 */
async function resolveTwoFactorPending(): Promise<boolean> {
  const native = await getNativeChallengeState();
  if (native.status === "challenge") return true;

  // An orphaned account (aal2 required, nothing enrolled) cannot be challenged
  // at all. Blocking would strand the user on a screen with no way forward, so
  // let them through to a working app and leave the reset to an admin.
  if (native.status === "orphaned") return false;

  // Read the switch from the table first; only email OTP needs the edge
  // function, and only to ask whether this session already cleared its gate.
  const settings = await getLocalTwoFactorSettings();
  if (!settings.enabled || settings.method !== "email_otp") return false;

  const state = await getTwoFactorState();
  return !state.gateCleared;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [twoFactorPending, setTwoFactorPending] = useState(false);

  const refreshTwoFactor = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setTwoFactorPending(false); return; }
    try {
      setTwoFactorPending(await resolveTwoFactorPending());
    } catch {
      // A failed check must not lock anyone out of their own vault; the
      // sign-in screens still challenge on the way in.
      setTwoFactorPending(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // `loading` deliberately covers the 2FA check as well as the session fetch.
    // Resolving it early would let a route guard render the dashboard for one
    // frame before the gate is known.
    async function settle(next: Session | null) {
      if (cancelled) return;
      setSession(next);
      if (!next) {
        setTwoFactorPending(false);
        setLoading(false);
        return;
      }
      try {
        const pending = await resolveTwoFactorPending();
        if (!cancelled) setTwoFactorPending(pending);
      } catch {
        if (!cancelled) setTwoFactorPending(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => settle(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      settle(next);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, authUser: session?.user ?? null, loading, twoFactorPending, refreshTwoFactor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
