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
  }

  const { data, error } = await adminClient()
    .from("disaster_recovery_state")
    .upsert(patch)
    .select()
    .single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ state: data });
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
  return c.json({ state: data });
});
