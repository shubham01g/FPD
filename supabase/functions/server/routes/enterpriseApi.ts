// Backs the Enterprise API admin section (key issuance/revocation + usage).
// Requires enterprise_api_keys / enterprise_api_usage from
// database/migrations/002_admin_backend_gaps.sql.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { encryptSecret, decryptSecret } from "../lib/keyCrypto.ts";

const enterpriseApi = new Hono();

function randomKeySuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// GET /admin/enterprise-api/keys?ownerUserId=&partnerId=
enterpriseApi.get("/keys", async (c) => {
  const { ownerUserId, partnerId } = c.req.query();
  let q = adminClient().from("enterprise_api_keys").select("id, name, key_prefix, scopes, rate_limit_per_min, is_active, last_used_at, created_at, revoked_at, owner_user_id, partner_id").order("created_at", { ascending: false });

  if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
  if (partnerId) q = q.eq("partner_id", partnerId);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ keys: data });
});

// POST /admin/enterprise-api/keys — issues a new key. The raw secret is
// returned once here for immediate copy, and is also stored AES-256-GCM
// encrypted so it can be revealed again later via /keys/:id/reveal — see
// lib/keyCrypto.ts for why that tradeoff was made instead of the more
// common "shown once, never again" pattern.
enterpriseApi.post("/keys", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name, ownerUserId, partnerId, scopes, rateLimitPerMin } = body;

  if (!name || (!ownerUserId && !partnerId)) {
    return c.json({ error: "'name' and one of 'ownerUserId'/'partnerId' are required" }, 400);
  }

  const admin = c.get("admin") as { id: string } | undefined;
  const secret = `fpd_live_${randomKeySuffix()}`;
  const keyHash = await sha256Hex(secret);
  const secretEncrypted = await encryptSecret(secret);
  const keyPrefix = secret.slice(0, 12);

  const { data, error } = await adminClient()
    .from("enterprise_api_keys")
    .insert({
      name,
      owner_user_id: ownerUserId ?? null,
      partner_id: partnerId ?? null,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      secret_encrypted: secretEncrypted,
      scopes: scopes ?? [],
      rate_limit_per_min: rateLimitPerMin ?? 60,
      created_by: admin?.id,
    })
    .select("id, name, key_prefix, scopes, rate_limit_per_min, is_active, created_at")
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ key: data, secret }, 201);
});

// POST /admin/enterprise-api/keys/:id/reveal — decrypts and returns the
// original key again. A POST (not GET) so the auditLog middleware records
// every reveal — this exposes a live secret, so it's worth a paper trail.
enterpriseApi.post("/keys/:id/reveal", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("enterprise_api_keys")
    .select("secret_encrypted")
    .eq("id", id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Key not found" }, 404);
  if (!data.secret_encrypted) {
    return c.json({ error: "This key has no recoverable secret on file and cannot be revealed." }, 404);
  }

  try {
    const secret = await decryptSecret(data.secret_encrypted);
    return c.json({ secret });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to decrypt key" }, 500);
  }
});

// POST /admin/enterprise-api/keys/:id/revoke
enterpriseApi.post("/keys/:id/revoke", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("enterprise_api_keys")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, is_active, revoked_at")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Key not found" }, 404);
  return c.json({ key: data });
});

// GET /admin/enterprise-api/keys/:id/usage
enterpriseApi.get("/keys/:id/usage", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("enterprise_api_usage")
    .select("*")
    .eq("api_key_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ usage: data });
});

export default enterpriseApi;
