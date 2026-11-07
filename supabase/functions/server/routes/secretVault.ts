// The Secret Vault PIN (migration 049). Mounted at /account/secret-vault
// behind requireUser.
//
//   GET    /status          has a PIN? is this session unlocked? locked out?
//   POST   /pin             set the PIN, or change it ({ pin, currentPin })
//   POST   /unlock          { pin } → unlocks this sign-in session for 15 min
//   POST   /lock            locks it again
//   POST   /forgot/start    emails a 6-digit code to the account's address
//   POST   /forgot/finish   { code, pin } → sets a new PIN (files are kept)
//   GET    /docs            the Secret Vault's documents, with signed links
//   POST   /upload-url      { name } → a signed upload URL under <uid>/secret/
//   POST   /docs            { path, name, fileType } → files the upload
//   DELETE /docs/:id        deletes a document and its file
//
// Secret Vault rows and files are unreadable from the browser (049's
// RESTRICTIVE policies); everything goes through here. Every call needs the
// account's 2FA passed in this session, and everything except status/pin/
// unlock/forgot needs the PIN entered in this session.
import { Hono, type Context, type Next } from "npm:hono";
import bcrypt from "npm:bcryptjs@2.4.3";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { secondFactorState } from "../lib/twoFactorGate.ts";
import { checkEmailOtp, startEmailOtp } from "../lib/emailOtp.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

const secretVault = new Hono();

const BUCKET = "vault-documents";
const UNLOCK_MINUTES = 15;
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;
const LINK_SECONDS = 600;

type PinRow = { user_id: string; pin_hash: string; failed_attempts: number; locked_until: string | null };

function validPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4,8}$/.test(pin);
}

async function getPin(userId: string): Promise<PinRow | null> {
  const { data } = await adminClient().from("secret_vault_pins")
    .select("user_id, pin_hash, failed_attempts, locked_until").eq("user_id", userId).maybeSingle<PinRow>();
  return data ?? null;
}

async function unlockSession(user: AuthedUser): Promise<string | null> {
  if (!user.sessionId) return null;
  const expires = new Date(Date.now() + UNLOCK_MINUTES * 60_000).toISOString();
  await adminClient().from("secret_vault_unlocks")
    .upsert({ session_id: user.sessionId, user_id: user.id, expires_at: expires }, { onConflict: "session_id" });
  return expires;
}

async function unlockedUntil(user: AuthedUser): Promise<string | null> {
  if (!user.sessionId) return null;
  const { data } = await adminClient().from("secret_vault_unlocks")
    .select("expires_at").eq("session_id", user.sessionId).eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString()).maybeSingle<{ expires_at: string }>();
  return data?.expires_at ?? null;
}

async function setPin(userId: string, pin: string) {
  return adminClient().from("secret_vault_pins").upsert({
    user_id: userId, pin_hash: bcrypt.hashSync(pin, 10), failed_attempts: 0, locked_until: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

/** Checks a PIN, counting failures and locking out after MAX_FAILURES. */
async function checkPin(row: PinRow, pin: string): Promise<{ ok: boolean; error?: string; status?: 400 | 423 }> {
  const db = adminClient();
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return { ok: false, error: "Too many wrong PINs. Try again later, or use Forgot PIN.", status: 423 };
  }
  if (bcrypt.compareSync(pin, row.pin_hash)) {
    if (row.failed_attempts) await db.from("secret_vault_pins").update({ failed_attempts: 0, locked_until: null }).eq("user_id", row.user_id);
    return { ok: true };
  }
  const failures = row.failed_attempts + 1;
  const lock = failures >= MAX_FAILURES;
  await db.from("secret_vault_pins").update({
    failed_attempts: lock ? 0 : failures,
    locked_until: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString() : null,
  }).eq("user_id", row.user_id);
  if (lock) return { ok: false, error: `Too many wrong PINs. The Secret Vault is locked for ${LOCKOUT_MINUTES} minutes.`, status: 423 };
  const left = MAX_FAILURES - failures;
  return { ok: false, error: `That PIN isn't right. ${left} attempt${left === 1 ? "" : "s"} left.`, status: 400 };
}

// Every route: the account's own 2FA must have been passed in this session.
secretVault.use("*", async (c, next) => {
  const user = c.get("user" as never) as AuthedUser;
  const token = (c.req.header("Authorization") ?? "").slice(7);
  const mfa = await secondFactorState(user.id, token);
  if (!mfa.passed) return c.json({ error: "Two-step verification required", code: "2fa_required" }, 403);
  await next();
});

secretVault.get("/status", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const row = await getPin(user.id);
  const locked = row?.locked_until && new Date(row.locked_until).getTime() > Date.now() ? row.locked_until : null;
  return c.json({ hasPin: Boolean(row), unlockedUntil: row ? await unlockedUntil(user) : null, lockedUntil: locked });
});

secretVault.post("/pin", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { pin?: unknown; currentPin?: unknown };
  if (!validPin(body.pin)) return c.json({ error: "Use 4 to 8 digits for your PIN." }, 400);
  const row = await getPin(user.id);
  if (row) {
    if (!validPin(body.currentPin)) return c.json({ error: "Enter your current PIN." }, 400);
    const check = await checkPin(row, body.currentPin);
    if (!check.ok) return c.json({ error: check.error }, check.status);
  }
  const { error } = await setPin(user.id, body.pin);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true, unlockedUntil: await unlockSession(user) });
});

secretVault.post("/unlock", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { pin?: unknown };
  const row = await getPin(user.id);
  if (!row) return c.json({ error: "Set a PIN first." }, 400);
  if (!validPin(body.pin)) return c.json({ error: "Enter your 4-8 digit PIN." }, 400);
  const check = await checkPin(row, body.pin);
  if (!check.ok) return c.json({ error: check.error }, check.status);
  return c.json({ ok: true, unlockedUntil: await unlockSession(user) });
});

secretVault.post("/lock", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  if (user.sessionId) await adminClient().from("secret_vault_unlocks").delete().eq("session_id", user.sessionId);
  return c.json({ ok: true });
});

secretVault.post("/forgot/start", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const r = await startEmailOtp(user);
  if (!r.ok) return c.json({ error: r.error }, (r.status ?? 500) as 400);
  return c.json({ sent: true });
});

secretVault.post("/forgot/finish", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { code?: unknown; pin?: unknown };
  if (!validPin(body.pin)) return c.json({ error: "Use 4 to 8 digits for your new PIN." }, 400);
  const r = await checkEmailOtp(user.id, String(body.code ?? ""));
  if (!r.ok) return c.json({ error: r.error }, (r.status ?? 400) as 400);
  const { error } = await setPin(user.id, body.pin);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true, unlockedUntil: await unlockSession(user) });
});

// ── Documents: PIN required from here on ─────────────────────────────
secretVault.use("/docs/*", requireUnlocked);
secretVault.use("/docs", requireUnlocked);
secretVault.use("/upload-url", requireUnlocked);

async function requireUnlocked(c: Context, next: Next) {
  const user = c.get("user" as never) as AuthedUser;
  if (!(await unlockedUntil(user))) return c.json({ error: "Enter your PIN to open the Secret Vault.", code: "pin_required" }, 403);
  await next();
}

secretVault.get("/docs", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const db = adminClient();
  const { data, error } = await db.from("vault_documents")
    .select("id, name, file_path, file_size_bytes, file_type, uploaded_at")
    .eq("user_id", user.id).eq("category", "secret").order("uploaded_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  const docs = await Promise.all((data ?? []).map(async (d) => {
    const store = db.storage.from(BUCKET);
    const [view, dl] = await Promise.all([
      store.createSignedUrl(d.file_path, LINK_SECONDS),
      store.createSignedUrl(d.file_path, LINK_SECONDS, { download: d.name }),
    ]);
    return { ...d, viewUrl: view.data?.signedUrl ?? null, downloadUrl: dl.data?.signedUrl ?? null };
  }));
  return c.json({ docs });
});

secretVault.post("/upload-url", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { name?: unknown };
  const name = String(body.name ?? "").trim();
  if (!name) return c.json({ error: "File name missing" }, 400);
  const safe = name.replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
  const path = `${user.id}/secret/${crypto.randomUUID()}-${safe}`;
  const { data, error } = await adminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return c.json({ error: error?.message ?? "Could not start the upload" }, 500);
  return c.json({ path, token: data.token });
});

secretVault.post("/docs", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const body = await c.req.json().catch(() => ({})) as { path?: unknown; name?: unknown; fileType?: unknown };
  const path = String(body.path ?? "");
  const prefix = `${user.id}/secret/`;
  if (!path.startsWith(prefix) || path.includes("..")) return c.json({ error: "Invalid file path" }, 400);
  const db = adminClient();

  // Record the size Storage measured, not one the browser claims.
  const fileName = path.slice(prefix.length);
  const { data: listed } = await db.storage.from(BUCKET).list(`${user.id}/secret`, { search: fileName, limit: 1 });
  const obj = listed?.find((o) => o.name === fileName);
  if (!obj) return c.json({ error: "The upload didn't arrive. Try again." }, 400);
  const size = Number((obj.metadata as { size?: number } | null)?.size ?? 0);

  const { data, error } = await db.from("vault_documents").insert({
    user_id: user.id, name: String(body.name ?? fileName).slice(0, 200), category: "secret",
    file_path: path, file_size_bytes: size, file_type: String(body.fileType ?? "other"),
    is_encrypted: false, status: "pending", starred: false, locked: true, tags: [], metadata: {},
  }).select("id, name, file_path, file_size_bytes, file_type, uploaded_at").single();
  if (error || !data) {
    // Refused (most often the storage quota): don't keep the file.
    await db.storage.from(BUCKET).remove([path]).catch(() => {});
    return c.json({ error: error?.message ?? "Could not save the document" }, 400);
  }
  return c.json({ doc: data });
});

secretVault.delete("/docs/:id", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const db = adminClient();
  const { data: doc } = await db.from("vault_documents").select("id, file_path")
    .eq("id", c.req.param("id")).eq("user_id", user.id).eq("category", "secret").maybeSingle();
  if (!doc) return c.json({ error: "Document not found" }, 404);
  const { error } = await db.from("vault_documents").delete().eq("id", doc.id);
  if (error) return c.json({ error: error.message }, 500);
  await db.storage.from(BUCKET).remove([doc.file_path]).catch(() => {});
  return c.json({ ok: true });
});

export default secretVault;
