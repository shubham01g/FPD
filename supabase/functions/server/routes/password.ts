// POST /account/password { current, next } — change the signed-in user's password.
//
// Account Settings used to fake this with a setTimeout. The change is done
// here and not with supabase.auth.updateUser in the browser for two reasons:
//  - the current password is really checked (a stolen session alone can't
//    set a new password), using a throwaway client so the caller's own
//    session is untouched;
//  - an account with 2FA has to have passed it in this session
//    (secondFactorState), as for every other sensitive action.
import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { secondFactorState } from "../lib/twoFactorGate.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

const password = new Hono();

password.post("/", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { current?: string; next?: string };
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");

  if (!current) return c.json({ error: "Enter your current password" }, 400);
  if (next.length < 8) return c.json({ error: "The new password must be at least 8 characters" }, 400);
  if (next === current) return c.json({ error: "The new password must be different from the current one" }, 400);

  const token = (c.req.header("Authorization") ?? "").slice(7);
  const mfa = await secondFactorState(user.id, token);
  if (!mfa.passed) return c.json({ error: "Two-step verification required", code: "2fa_required" }, 403);

  // Check the current password without touching the caller's session.
  const probe = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: wrong } = await probe.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong || !signedIn?.session) return c.json({ error: "Your current password isn't right" }, 400);
  // Don't leave the probe's session alive. scope "local" revokes only that
  // one session; the default ("global") would sign the user out everywhere.
  await adminClient().auth.admin.signOut(signedIn.session.access_token, "local").catch(() => {});

  const { error } = await adminClient().auth.admin.updateUserById(user.id, { password: next });
  if (error) {
    // Supabase's own rules (length, leaked-password check) come back here.
    return c.json({ error: error.message }, 400);
  }
  return c.json({ changed: true });
});

export default password;
