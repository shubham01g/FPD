// Settings → Danger Zone (mounted under /admin/settings/danger, so it already
// requires the admin_team module; every action here is also super-admin only).
//
//   POST /inactive/preview  { days }         accounts with no sign-in for N days
//   POST /test/preview      { pattern }      accounts whose email matches a pattern
//   POST /delete            { ids, confirm } permanently delete chosen accounts
//   POST /rotate-key        { confirm }      re-encrypt stored secrets with
//                                            ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT
//
// Deletion goes through lib/deleteUser.ts (same rules as Delete User: never
// admins, never accounts with payout history, never yourself). Previews never
// change anything; the delete needs the admin to type DELETE. The audit-log
// middleware records every POST.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { deleteUserCompletely } from "../lib/deleteUser.ts";
import { reencryptSecret } from "../lib/keyCrypto.ts";

const danger = new Hono();

const isSuperAdmin = (a: AdminUser) => a.permissions === null || a.role === "super_admin";

danger.use("*", async (c, next) => {
  if (!isSuperAdmin(c.get("admin") as AdminUser)) {
    return c.json({ error: "Only a super admin can use the Danger Zone." }, 403);
  }
  await next();
});

interface Candidate {
  id: string; email: string; full_name: string | null; plan: string;
  created_at: string; last_sign_in_at: string | null;
}

/** Every member account (never admins) with its last sign-in and whether it is protected. */
async function memberAccounts(): Promise<(Candidate & { protectedReason: string | null })[]> {
  const db = adminClient();
  const [{ data: users, error }, { data: paid }, { data: payouts }] = await Promise.all([
    db.from("users").select("id, email, full_name, plan, created_at, is_admin"),
    db.from("subscriptions").select("user_id, id").in("status", ["active", "trialing", "past_due", "unpaid"]),
    db.from("payouts").select("recipient_user_id"),
  ]);
  if (error) throw new Error(error.message);
  const paying = new Set((paid ?? []).filter((s: { id: string }) => !s.id.startsWith("comp_")).map((s: { user_id: string }) => s.user_id));
  const withPayouts = new Set((payouts ?? []).map((p: { recipient_user_id: string }) => p.recipient_user_id));

  const lastSignIn = new Map<string, string | null>();
  for (let page = 1; page <= 50; page++) {
    const { data, error: authErr } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (authErr) throw new Error(authErr.message);
    for (const u of data.users) lastSignIn.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < 1000) break;
  }

  return (users ?? [])
    .filter((u: { is_admin: boolean }) => !u.is_admin)
    .map((u: { id: string; email: string; full_name: string | null; plan: string; created_at: string }) => ({
      id: u.id, email: u.email, full_name: u.full_name, plan: u.plan, created_at: u.created_at,
      last_sign_in_at: lastSignIn.get(u.id) ?? null,
      protectedReason: withPayouts.has(u.id) ? "has payout records" : paying.has(u.id) ? "has a paid subscription" : null,
    }));
}

danger.post("/inactive/preview", async (c) => {
  const { days } = await c.req.json().catch(() => ({}));
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 30) return c.json({ error: "Choose at least 30 days of inactivity." }, 400);
  const cutoff = Date.now() - n * 86_400_000;
  try {
    const accounts = (await memberAccounts()).filter((a) => {
      const last = a.last_sign_in_at ? Date.parse(a.last_sign_in_at) : Date.parse(a.created_at);
      return last < cutoff;
    });
    return c.json({ accounts, days: n });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not list accounts" }, 500);
  }
});

danger.post("/test/preview", async (c) => {
  const { pattern } = await c.req.json().catch(() => ({}));
  const p = typeof pattern === "string" ? pattern.trim().toLowerCase() : "";
  // Something like "%@mailinator.com" or "test+%@gmail.com" — never a bare wildcard.
  if (!p.includes("@") || p.replace(/[%*]/g, "").length < 5) {
    return c.json({ error: "Enter an email pattern with a domain, e.g. %@mailinator.com" }, 400);
  }
  const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*") + "$");
  try {
    const accounts = (await memberAccounts()).filter((a) => re.test(String(a.email).toLowerCase()));
    return c.json({ accounts });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not list accounts" }, 500);
  }
});

danger.post("/delete", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const { ids, confirm } = await c.req.json().catch(() => ({}));
  if (confirm !== "DELETE") return c.json({ error: "Type DELETE to confirm." }, 400);
  if (!Array.isArray(ids) || ids.length === 0) return c.json({ error: "Choose at least one account." }, 400);
  if (ids.length > 200) return c.json({ error: "Delete at most 200 accounts at a time." }, 400);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids.map(String)) {
    const r = await deleteUserCompletely(id, admin.id);
    results.push(r.ok ? { id, ok: true } : { id, ok: false, error: r.error });
  }
  return c.json({ deleted: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok), results });
});

danger.post("/rotate-key", async (c) => {
  const { confirm } = await c.req.json().catch(() => ({}));
  if (confirm !== "ROTATE") return c.json({ error: "Type ROTATE to confirm." }, 400);
  const current = Deno.env.get("ENTERPRISE_KEY_ENCRYPTION_SECRET");
  const next = Deno.env.get("ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT");
  if (!current) return c.json({ error: "ENTERPRISE_KEY_ENCRYPTION_SECRET is not set, so there is nothing to rotate." }, 409);
  if (!next || next === current) {
    return c.json({ error: "Set a new secret first: npx supabase secrets set ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT=<new value>, redeploy, then rotate." }, 409);
  }

  const db = adminClient();
  const [{ data: processors, error: pErr }, { data: keys, error: kErr }] = await Promise.all([
    db.from("crypto_processor_configs").select("id, config_encrypted").not("config_encrypted", "is", null),
    db.from("enterprise_api_keys").select("id, secret_encrypted").not("secret_encrypted", "is", null),
  ]);
  if (pErr || kErr) return c.json({ error: (pErr ?? kErr)!.message }, 500);

  // Re-encrypt everything in memory first; if a value can't be read with
  // either secret, nothing is written. A value already readable with the new
  // secret (an earlier run that stopped part-way) is left as it is.
  const rotateOne = async (stored: string): Promise<string> => {
    try { return await reencryptSecret(stored, current, next); }
    catch {
      await reencryptSecret(stored, next, next);   // throws if unreadable with the new secret too
      return stored;
    }
  };
  try {
    const p = await Promise.all((processors ?? []).map(async (r: { id: string; config_encrypted: string }) =>
      ({ id: r.id, config_encrypted: await rotateOne(r.config_encrypted) })));
    const k = await Promise.all((keys ?? []).map(async (r: { id: string; secret_encrypted: string }) =>
      ({ id: r.id, secret_encrypted: await rotateOne(r.secret_encrypted) })));
    for (const r of p) {
      const { error } = await db.from("crypto_processor_configs").update({ config_encrypted: r.config_encrypted }).eq("id", r.id);
      if (error) throw new Error(error.message);
    }
    for (const r of k) {
      const { error } = await db.from("enterprise_api_keys").update({ secret_encrypted: r.secret_encrypted }).eq("id", r.id);
      if (error) throw new Error(error.message);
    }
    return c.json({
      rotated: { processors: p.length, apiKeys: k.length },
      next: "Now set ENTERPRISE_KEY_ENCRYPTION_SECRET to the new value, delete ENTERPRISE_KEY_ENCRYPTION_SECRET_NEXT, and redeploy the server.",
    });
  } catch (err) {
    return c.json({ error: `Rotation stopped: ${err instanceof Error ? err.message : err}. Run it again; rows already moved to the new secret are skipped.` }, 500);
  }
});

export default danger;
