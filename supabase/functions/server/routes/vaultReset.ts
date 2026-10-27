import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import {
  EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, linkOrigin, sendEmail, vaultResetEmail,
} from "../lib/email.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

// Reset a forgotten vault passphrase (client list item 1a; migration 043).
// Mounted at /account/vault behind requireUser, so every call is from a
// signed-in owner about their own vault.
//
//   POST /reset-request        email a one-time link to the account's
//                              REGISTERED address (taken from the session,
//                              never from the request body)
//   GET  /reset/:token         is this link usable by the signed-in user, and
//                              what would a reset erase?
//   POST /reset/:token         spend the link and erase the encrypted fields
//                              (reset_vault_for, one transaction)
//
// Two things are required to reset: the emailed link AND being signed in as
// the account it was sent for. The vault is zero-knowledge, so nothing is
// recovered — the owner gets a fresh "Create your vault passphrase".

const vaultReset = new Hono();

const LINK_MINUTES = 45;
const RESEND_COOLDOWN_SECONDS = 60;

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** j•••@finalpassdown.com — enough to recognise, not to harvest. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}•••@${domain ?? ""}`;
}

/** What a reset would erase, for the warning on the reset page. */
async function counts(userId: string) {
  const db = adminClient();
  const [pw, subs] = await Promise.all([
    db.from("password_vault").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("encrypted_password", ""),
    db.from("subscription_tracker").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("encrypted_password", ""),
  ]);
  return { passwords: pw.count ?? 0, subscriptions: subs.count ?? 0 };
}

type TokenRow = { id: string; user_id: string; expires_at: string; used_at: string | null };

/** Looks a link up and says why it can't be used, if it can't. */
async function inspect(token: string, user: AuthedUser): Promise<{ row: TokenRow | null; problem: string | null }> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { row: null, problem: "invalid" };
  const { data } = await adminClient()
    .from("vault_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle<TokenRow>();
  if (!data) return { row: null, problem: "invalid" };
  if (data.user_id !== user.id) return { row: data, problem: "wrong_account" };
  if (data.used_at) return { row: data, problem: "used" };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { row: data, problem: "expired" };
  return { row: data, problem: null };
}

vaultReset.post("/reset-request", async (c) => {
  const user = c.get("user") as AuthedUser;
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);
  const db = adminClient();

  const { data: last } = await db
    .from("vault_reset_tokens")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();
  if (last && (Date.now() - new Date(last.created_at).getTime()) / 1000 < RESEND_COOLDOWN_SECONDS) {
    return c.json({ error: "A reset link was just sent. Check your email, or try again in a minute." }, 429);
  }

  // Only the newest link works: asking again retires any earlier one.
  const now = new Date();
  await db.from("vault_reset_tokens").update({ used_at: now.toISOString() }).eq("user_id", user.id).is("used_at", null);

  const token = newToken();
  const expires = new Date(now.getTime() + LINK_MINUTES * 60_000);
  const { error } = await db.from("vault_reset_tokens").insert({
    user_id: user.id, token_hash: await sha256Hex(token), expires_at: expires.toISOString(),
  });
  if (error) return c.json({ error: error.message }, 500);

  try {
    await sendEmail({
      to: user.email,
      ...vaultResetEmail({ link: `${linkOrigin(c.req.header("Origin"))}/vault-reset/${token}`, minutes: LINK_MINUTES }),
    });
  } catch (err) {
    console.error("vault reset email failed:", err);
    return c.json({ error: "The reset email could not be sent. Try again in a few minutes." }, 502);
  }

  return c.json({ emailed: true, to: maskEmail(user.email), minutes: LINK_MINUTES });
});

vaultReset.get("/reset/:token", async (c) => {
  const user = c.get("user") as AuthedUser;
  const { problem } = await inspect(c.req.param("token"), user);
  if (problem) return c.json({ ok: false, problem });
  return c.json({ ok: true, email: maskEmail(user.email), ...(await counts(user.id)) });
});

vaultReset.post("/reset/:token", async (c) => {
  const user = c.get("user") as AuthedUser;
  const { row, problem } = await inspect(c.req.param("token"), user);
  if (problem || !row) return c.json({ ok: false, problem: problem ?? "invalid" }, 400);
  const db = adminClient();

  // Spend the link first, and only if nobody else just did — a double click
  // can't run the wipe twice.
  const { data: spent } = await db
    .from("vault_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!spent?.length) return c.json({ ok: false, problem: "used" }, 400);

  const { data: changed, error } = await db.rpc("reset_vault_for", { p_user: user.id });
  if (error) {
    console.error("reset_vault_for failed:", error);
    return c.json({ error: "The vault could not be reset. Request a new link and try again." }, 500);
  }
  return c.json({ ok: true, changed });
});

export default vaultReset;
