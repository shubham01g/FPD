// Backs both admin screens that configure payment processors: the Crypto
// Payments screen (CryptoMerchant.tsx) and WL Onboarding Control's Processors
// tab (PartnerOnboardingAdmin.tsx). They share one table,
// crypto_processor_configs, so enabling a processor in one screen shows it
// enabled in the other.
//
// Credentials are stored AES-256-GCM encrypted in config_encrypted (the same
// helper as the enterprise API keys) and are never returned to the browser in
// the clear by GET — only masked, with an explicit POST /reveal for an admin
// who needs the real value back. The POST also means every reveal lands in
// audit_logs, since the auditLog middleware only records mutating methods.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { encryptSecret, decryptSecret } from "../lib/keyCrypto.ts";

const cryptoConfig = new Hono();

// Crypto payment preferences live in admin_settings next to the storage
// thresholds. Allowlisted so a PATCH can't write arbitrary keys.
const SETTING_KEYS = [
  "crypto_default_processor", "crypto_settlement_currency", "crypto_settlement_frequency",
  "crypto_payment_window_minutes", "crypto_min_payment_usd", "crypto_max_payment_usd",
  "crypto_show_to_all_users",
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

interface ProcessorRow {
  id: string;
  name: string;
  enabled: boolean;
  is_default: boolean;
  config_encrypted: string | null;
  updated_at: string;
}

const PROCESSOR_COLUMNS = "id, name, enabled, is_default, config_encrypted, updated_at";

/** A config field counts as a secret (masked on read) by its name. The field
 *  names come from each screen's processor catalog — apiKey, webhookSecret,
 *  apiToken, privateKey and so on — so matching these substrings covers them
 *  without the server needing its own per-processor schema. */
function isSecretField(field: string): boolean {
  const f = field.toLowerCase();
  return f.includes("key") || f.includes("secret") || f.includes("token") || f.includes("password");
}

const MASK_PREFIX = "••••";

function maskValue(value: string): string {
  if (!value) return "";
  return value.length <= 4 ? MASK_PREFIX : `${MASK_PREFIX}${value.slice(-4)}`;
}

/** A value the browser sends back unchanged from a masked GET must not
 *  overwrite the real stored credential. */
function isMasked(value: string): boolean {
  return value.startsWith(MASK_PREFIX);
}

async function readConfig(row: ProcessorRow): Promise<Record<string, string>> {
  if (!row.config_encrypted) return {};
  try {
    const parsed = JSON.parse(await decryptSecret(row.config_encrypted));
    return (parsed && typeof parsed === "object") ? parsed as Record<string, string> : {};
  } catch (err) {
    // A missing or rotated ENTERPRISE_KEY_ENCRYPTION_SECRET must not take the
    // whole screen down — report the processor as configured-but-unreadable
    // and let the admin re-enter credentials.
    console.error(`crypto config decrypt failed for ${row.id}:`, err);
    return {};
  }
}

async function toClient(row: ProcessorRow) {
  const config = await readConfig(row);
  const configuredFields = Object.entries(config).filter(([, v]) => v !== "").map(([k]) => k);
  const masked: Record<string, string> = {};
  for (const [field, value] of Object.entries(config)) {
    masked[field] = isSecretField(field) ? maskValue(value) : value;
  }
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    isDefault: row.is_default,
    config: masked,
    configuredFields,
    hasCredentials: configuredFields.length > 0,
    // True only when a credential is on file but could not be decrypted.
    unreadable: Boolean(row.config_encrypted) && configuredFields.length === 0,
    updatedAt: row.updated_at,
  };
}

// GET /admin/crypto — every processor (credentials masked) + payment preferences
cryptoConfig.get("/", async (c) => {
  const db = adminClient();
  const [{ data: rows, error: rowsErr }, { data: settings, error: settingsErr }] = await Promise.all([
    db.from("crypto_processor_configs").select(PROCESSOR_COLUMNS).order("name"),
    db.from("admin_settings").select("key, value, updated_at").in("key", SETTING_KEYS as unknown as string[]),
  ]);

  if (rowsErr) return c.json({ error: rowsErr.message }, 500);
  if (settingsErr) return c.json({ error: settingsErr.message }, 500);

  const processors = await Promise.all((rows ?? []).map((r) => toClient(r as ProcessorRow)));
  return c.json({ processors, settings: settings ?? [] });
});

// GET /admin/crypto/payments — the latest recorded payments, for the Payment
// Processors screen's Transactions tab and month-to-date totals.
cryptoConfig.get("/payments", async (c) => {
  const { data, error } = await adminClient()
    .from("payments")
    .select("id, type, amount_usd, currency, status, description, created_at, users:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ payments: data });
});

// PATCH /admin/crypto/processors/:id — credentials, enabled, default
//
// Config merge rules, so a partially filled form can't wipe stored secrets:
//   - a masked value is ignored: the browser is echoing back what GET gave it,
//     not entering a new credential
//   - an empty secret field is ignored for the same reason
//   - an empty non-secret field (a settlement currency, a webhook URL) does
//     clear the stored value, because there is no other way to unset one
cryptoConfig.patch("/processors/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({})) as {
    enabled?: boolean; isDefault?: boolean; config?: Record<string, string>;
  };
  const db = adminClient();

  const { data: existing, error: loadErr } = await db
    .from("crypto_processor_configs")
    .select(PROCESSOR_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (loadErr) return c.json({ error: loadErr.message }, 500);
  if (!existing) return c.json({ error: `Unknown processor: ${id}` }, 404);

  const current = await readConfig(existing as ProcessorRow);
  const merged = { ...current };
  if (body.config && typeof body.config === "object") {
    for (const [field, raw] of Object.entries(body.config)) {
      const value = typeof raw === "string" ? raw : String(raw ?? "");
      if (isMasked(value)) continue;
      if (value === "" && isSecretField(field)) continue;
      merged[field] = value;
    }
  }

  const hasCredentials = Object.values(merged).some((v) => v !== "");
  const willBeEnabled = body.enabled ?? existing.enabled;

  // Enabling a processor with nothing to authenticate against would show a
  // green "connected" badge for a processor that cannot take a payment.
  if (willBeEnabled && !hasCredentials) {
    return c.json({ error: "Add at least one credential before enabling this processor." }, 400);
  }
  if (body.isDefault && !willBeEnabled) {
    return c.json({ error: "Enable this processor before making it the default." }, 400);
  }

  const admin = c.get("admin") as { id: string } | undefined;

  // Clear the previous default first — the partial unique index in migration
  // 025 allows only one row with is_default = true at a time.
  if (body.isDefault) {
    const { error: clearErr } = await db
      .from("crypto_processor_configs")
      .update({ is_default: false })
      .neq("id", id)
      .eq("is_default", true);
    if (clearErr) return c.json({ error: clearErr.message }, 500);
  }

  const patch: Record<string, unknown> = {
    config_encrypted: hasCredentials ? await encryptSecret(JSON.stringify(merged)) : null,
    updated_by: admin?.id,
    updated_at: new Date().toISOString(),
  };
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.isDefault !== undefined) patch.is_default = body.isDefault;
  // A processor that is switched off should not stay the platform default.
  if (body.enabled === false) patch.is_default = false;

  const { data, error } = await db
    .from("crypto_processor_configs")
    .update(patch)
    .eq("id", id)
    .select(PROCESSOR_COLUMNS)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: `Unknown processor: ${id}` }, 404);
  return c.json({ processor: await toClient(data as ProcessorRow) });
});

// POST /admin/crypto/processors/:id/test — a real call to the processor with
// the stored credentials. Only processors with a cheap read-only endpoint are
// checked; the rest say so instead of pretending.
cryptoConfig.post("/processors/:id/test", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("crypto_processor_configs")
    .select(PROCESSOR_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: `Unknown processor: ${id}` }, 404);

  const config = await readConfig(data as ProcessorRow);
  const fail = (message: string) => c.json({ ok: false, message });

  try {
    if (id === "stripe") {
      if (!config.secretKey) return fail("No secret key saved");
      const res = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${config.secretKey}` } });
      const body = await res.json().catch(() => null);
      if (!res.ok) return fail(body?.error?.message ?? `Stripe rejected the key (status ${res.status})`);
      return c.json({ ok: true, message: `Stripe accepted the key (${body?.livemode ? "live" : "test"} mode)` });
    }

    if (id === "paypal") {
      if (!config.clientId || !config.clientSecret) return fail("Client ID and client secret are both needed");
      const host = config.mode === "test" ? "api-m.sandbox.paypal.com" : "api-m.paypal.com";
      const res = await fetch(`https://${host}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
      });
      if (!res.ok) return fail(`PayPal rejected the credentials (status ${res.status}) on ${config.mode === "test" ? "sandbox" : "live"}`);
      return c.json({ ok: true, message: `PayPal accepted the credentials (${config.mode === "test" ? "sandbox" : "live"})` });
    }

    if (id === "square") {
      if (!config.accessToken) return fail("No access token saved");
      const host = config.mode === "test" ? "connect.squareupsandbox.com" : "connect.squareup.com";
      const res = await fetch(`https://${host}/v2/locations`, { headers: { Authorization: `Bearer ${config.accessToken}` } });
      if (!res.ok) return fail(`Square rejected the token (status ${res.status})`);
      return c.json({ ok: true, message: "Square accepted the access token" });
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : "The processor could not be reached");
  }

  return fail("No automatic connection check is available for this processor");
});

// POST /admin/crypto/processors { name, config } — add a processor that is not
// in the built-in catalog. Its credentials are stored exactly like the others.
cryptoConfig.post("/processors", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { name?: string; config?: Record<string, string> };
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Processor name is required" }, 400);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!slug) return c.json({ error: "Processor name must contain letters or numbers" }, 400);
  const id = `custom_${slug}`;

  const config: Record<string, string> = {};
  for (const [field, value] of Object.entries(body.config ?? {})) {
    if (field.trim()) config[field.trim()] = String(value ?? "");
  }
  const hasCredentials = Object.values(config).some((v) => v !== "");
  const admin = c.get("admin") as { id: string } | undefined;

  const { data, error } = await adminClient()
    .from("crypto_processor_configs")
    .insert({
      id, name, enabled: hasCredentials, is_default: false,
      config_encrypted: hasCredentials ? await encryptSecret(JSON.stringify(config)) : null,
      updated_by: admin?.id, updated_at: new Date().toISOString(),
    })
    .select(PROCESSOR_COLUMNS)
    .maybeSingle();

  if (error) return c.json({ error: error.code === "23505" ? `A processor named "${name}" already exists` : error.message }, error.code === "23505" ? 409 : 500);
  return c.json({ processor: await toClient(data as ProcessorRow) }, 201);
});

// POST /admin/crypto/processors/:id/reveal — decrypted credentials.
// POST rather than GET so every reveal is written to audit_logs.
cryptoConfig.post("/processors/:id/reveal", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("crypto_processor_configs")
    .select(PROCESSOR_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: `Unknown processor: ${id}` }, 404);
  if (!data.config_encrypted) return c.json({ config: {} });

  try {
    const config = JSON.parse(await decryptSecret(data.config_encrypted));
    return c.json({ config });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Failed to decrypt credentials" }, 500);
  }
});

// PATCH /admin/crypto/settings/:key — one crypto payment preference
cryptoConfig.patch("/settings/:key", async (c) => {
  const key = c.req.param("key");
  if (!SETTING_KEYS.includes(key as SettingKey)) {
    return c.json({ error: `Unknown setting key: ${key}` }, 400);
  }
  const { value } = await c.req.json().catch(() => ({ value: undefined }));
  if (typeof value !== "string") return c.json({ error: "'value' must be a string" }, 400);

  const admin = c.get("admin") as { id: string } | undefined;
  const { data, error } = await adminClient()
    .from("admin_settings")
    .upsert({ key, value, updated_by: admin?.id, updated_at: new Date().toISOString() })
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ setting: data });
});

export default cryptoConfig;
