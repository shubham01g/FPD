// Permanently removing a member account — shared by the admin Delete User
// action and the Settings → Danger Zone bulk tools.
//
// Cancels any paid Stripe subscription (no refund), deletes the user's files,
// clears "who did this" stamps that would block the delete, then removes the
// auth user and the profile (owned tables cascade from users). Admin accounts
// and accounts with payout history are refused.
import { adminClient } from "./supabaseAdmin.ts";
import { stripe, stripeMode } from "./stripe.ts";

export type DeleteResult =
  | { ok: true; cancelledSubscriptions: number }
  | { ok: false; error: string; status: number };

// Columns that point at a user without ON DELETE CASCADE/SET NULL — mostly
// "who did this" stamps (reviewer, granter, actor). They would block the
// delete, so they are cleared first; the record itself stays.
export const USER_STAMPS: [table: string, column: string][] = [
  ["legacy_continuation_fees", "paid_by_user_id"], ["admin_settings", "updated_by"], ["contacts", "id_verified_by"],
  ["partners", "user_id"], ["audit_logs", "actor_id"], ["id_verifications", "reviewed_by"],
  ["concierge_employees", "invited_by"], ["wg_waivers", "sent_by"], ["crypto_transactions", "user_id"],
  ["push_notifications", "sent_by"], ["crypto_processor_configs", "updated_by"], ["email_templates", "updated_by"],
  ["enterprise_api_keys", "created_by"], ["admin_accounts", "invited_by"], ["admin_accounts", "user_id"],
  ["wl_entitlements", "granted_by"], ["disaster_recovery_state", "bypass_granted_by"], ["legacy_claims", "reviewed_by"],
];

// Every object under a storage prefix, folders included (id-verifications
// nests owner/contact/file).
export async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const store = adminClient().storage.from(bucket);
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await store.list(prefix, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) paths.push(...await listAll(bucket, path));
      else paths.push(path);
    }
    if (data.length < 1000) break;
  }
  return paths;
}


/** Deletes the account `id`. `actorId` (the acting admin) can never delete itself. */
export async function deleteUserCompletely(id: string, actorId: string): Promise<DeleteResult> {
  const db = adminClient();
  const { data: target } = await db.from("users").select("id, email, is_admin").eq("id", id).maybeSingle();
  if (!target) return { ok: false, error: "User not found", status: 404 };
  if (id === actorId) return { ok: false, error: "You cannot delete your own account.", status: 400 };
  if (target.is_admin) return { ok: false, error: "This is an admin account. Remove its admin access first.", status: 409 };

  const { count: payoutCount } = await db.from("payouts").select("id", { count: "exact", head: true }).eq("recipient_user_id", id);
  if (payoutCount) return { ok: false, error: "This account has payout records, which must be kept. It cannot be deleted; suspend it instead.", status: 409 };

  const { data: liveSubs } = await db.from("subscriptions").select("id")
    .eq("user_id", id).in("status", ["active", "trialing", "past_due", "incomplete", "unpaid"]);
  const paidSubs = (liveSubs ?? []).filter((s) => !s.id.startsWith("comp_"));
  if (paidSubs.length && !stripeMode()) {
    return { ok: false, error: "This account has a paid subscription and Stripe is not configured, so it cannot be cancelled.", status: 503 };
  }
  try {
    for (const sub of paidSubs) {
      await stripe("DELETE", `/subscriptions/${sub.id}`, { prorate: false, invoice_now: false }).catch((err) => {
        if (!(err instanceof Error && /canceled|No such subscription/i.test(err.message))) throw err;
      });
    }
  } catch (err) {
    return { ok: false, error: `Could not cancel the Stripe subscription: ${err instanceof Error ? err.message : err}`, status: 502 };
  }

  // Files: user-owned buckets are keyed by user id; legacy-claims by claim id.
  const { data: claims } = await db.from("legacy_claims").select("id").eq("owner_user_id", id);
  const prefixes: [string, string][] = [
    ["vault-documents", id], ["record-photos", id], ["id-verifications", id],
    ...(claims ?? []).map((cl): [string, string] => ["legacy-claims", cl.id]),
  ];
  for (const [bucket, prefix] of prefixes) {
    const paths = await listAll(bucket, prefix);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) return { ok: false, error: `Could not delete files in ${bucket}: ${error.message}`, status: 500 };
    }
  }

  for (const [table, column] of USER_STAMPS) {
    const { error } = await db.from(table).update({ [column]: null }).eq(column, id);
    if (error) return { ok: false, error: `Could not clear ${table}.${column}: ${error.message}`, status: 500 };
  }

  // Auth first: if the profile delete then failed, a profile with no login is
  // harmless, whereas a login with no profile is not.
  const { error: authError } = await db.auth.admin.deleteUser(id);
  if (authError && !/not found/i.test(authError.message)) return { ok: false, error: authError.message, status: 500 };

  const { error } = await db.from("users").delete().eq("id", id);
  if (error) return { ok: false, error: error.message, status: 500 };
  return { ok: true, cancelledSubscriptions: paidSubs.length };
}
