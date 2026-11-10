// Backs WLEntitlementContext.tsx (White Label Studio paywall) and
// DisasterRecovery.tsx (48-hour emergency vault bypass).
//
// Both pieces of state used to live in localStorage, so a user could unlock a
// paid add-on from devtools. wl_entitlements and disaster_recovery_state grant
// owner SELECT only and carry no user write policy, so these service-role
// routes are the sole way either flag can be set. The client reads its own row
// directly and treats it as read-only.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { EMAIL_CONFIGURED, MAILBOX, noticeEmail, sendEmail } from "../lib/email.ts";
import { defaultOrigin } from "../lib/origins.ts";

const BYPASS_WINDOW_MS = 48 * 60 * 60 * 1000;

/* ── White Label entitlement ─────────────────────────────────────── */

export const wlEntitlements = new Hono();

// GET /admin/wl-entitlements/:userId
wlEntitlements.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const { data, error } = await adminClient()
    .from("wl_entitlements")
    .select("*, wl_packages(name)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ entitlement: data });
});

// PUT /admin/wl-entitlements/:userId — grant. Mirrors the rule the client has
// always enforced locally: no confirmed payment reference, no unlock.
wlEntitlements.put("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const body = await c.req.json().catch(() => ({}));
  if (!body.package_id || !body.payment_ref) {
    return c.json({ error: "'package_id' and 'payment_ref' are required to grant an entitlement" }, 400);
  }

  const admin = c.get("admin") as { id?: string } | undefined;
  const { data, error } = await adminClient()
    .from("wl_entitlements")
    .upsert({
      user_id: userId,
      entitled: true,
      package_id: body.package_id,
      payment_ref: body.payment_ref,
      granted_at: new Date().toISOString(),
      granted_by: admin?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ entitlement: data });
});

// DELETE /admin/wl-entitlements/:userId — refund / chargeback / cancellation.
// The row is kept (not deleted) so the grant history stays auditable.
wlEntitlements.delete("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const { data, error } = await adminClient()
    .from("wl_entitlements")
    .update({ entitled: false, payment_ref: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "No entitlement row for that user" }, 404);
  return c.json({ entitlement: data });
});

/* ── Disaster recovery add-on + bypass window ────────────────────── */

export const drState = new Hono();

/* Tells the account holder their emergency access changed. Returns whether
   the email really went out, so the admin screen can say so honestly. */
async function notifyHolder(userId: string, granted: boolean, expiresAt?: string): Promise<boolean> {
  if (!EMAIL_CONFIGURED) return false;
  const { data: u } = await adminClient().from("users").select("email, full_name").eq("id", userId).maybeSingle();
  if (!u?.email) return false;
  try {
    await sendEmail({
      to: u.email,
      ...noticeEmail({
        name: u.full_name ?? "",
        heading: granted ? "Emergency vault access opened" : "Emergency vault access closed",
        paragraphs: granted
          ? [`A Final Pass Down administrator opened a temporary emergency access window on your vault${expiresAt ? `, open until ${new Date(expiresAt).toUTCString()}` : ""}.`,
             "During this window you can download a full copy of your vault from Disaster Protection, even without the add-on.",
             "If you did not ask for this, reply to this email straight away."]
          : ["The temporary emergency access window on your vault has been closed by a Final Pass Down administrator."],
        button: granted ? { href: `${defaultOrigin()}/dashboard`, label: "Open my vault" } : null,
        replyTo: MAILBOX.support,
        category: "disaster-recovery",
      }),
    });
    return true;
  } catch (err) {
    console.error("disaster-recovery: notify failed", err);
    return false;
  }
}

// GET /admin/disaster-recovery — every row with an add-on or a bypass, so
// the admin screen shows real state after a reload.
drState.get("/", async (c) => {
  const { data, error } = await adminClient()
    .from("disaster_recovery_state")
    .select("*")
    .or("bypass_granted.eq.true,addon_active.eq.true");
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ states: data ?? [] });
});

// GET /admin/disaster-recovery/:userId
drState.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const { data, error } = await adminClient()
    .from("disaster_recovery_state")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ state: data });
});

// PUT /admin/disaster-recovery/:userId — set add-on and/or open a bypass
// window. `bypass_minutes` lets an admin issue something shorter than the 48h
// default; omitting it uses the full window.
drState.put("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const body = await c.req.json().catch(() => ({}));
  const admin = c.get("admin") as { id?: string } | undefined;
  const now = new Date();

  const patch: Record<string, unknown> = {
    user_id: userId,
    updated_at: now.toISOString(),
  };

  if ("addon_active" in body) patch.addon_active = Boolean(body.addon_active);

  if (body.grant_bypass) {
    if (!body.reason) {
      return c.json({ error: "'reason' is required when granting a bypass" }, 400);
    }
    const minutes = Number(body.bypass_minutes);
    const windowMs = Number.isFinite(minutes) && minutes > 0
      ? Math.min(minutes * 60_000, BYPASS_WINDOW_MS)
      : BYPASS_WINDOW_MS;

    patch.bypass_granted = true;
    patch.bypass_granted_at = now.toISOString();
    patch.bypass_granted_by = admin?.id ?? null;
    patch.bypass_expires_at = new Date(now.getTime() + windowMs).toISOString();
    patch.bypass_reason = body.reason;
    if (typeof body.notes === "string") patch.bypass_notes = body.notes.trim().slice(0, 2000) || null;
  }

  const { data, error } = await adminClient()
    .from("disaster_recovery_state")
    .upsert(patch)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  const notified = body.grant_bypass ? await notifyHolder(userId, true, data.bypass_expires_at) : false;
  return c.json({ state: data, notified });
});

// DELETE /admin/disaster-recovery/:userId — revoke an active bypass window
// immediately. The add-on itself (a paid subscription) is left untouched.
drState.delete("/:userId", async (c) => {
  const userId = c.req.param("userId");
  const { data, error } = await adminClient()
    .from("disaster_recovery_state")
    .update({
      bypass_granted: false,
      bypass_expires_at: null,
      bypass_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "No disaster recovery row for that user" }, 404);
  return c.json({ state: data, notified: await notifyHolder(userId, false) });
});
