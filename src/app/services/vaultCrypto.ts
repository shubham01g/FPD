/**
 * vaultCrypto — client-side encryption for stored credentials.
 *
 * The Password Manager and Subscription Manager screens have always shown an
 * "AES-256 ENCRYPTED · ZERO-KNOWLEDGE" banner, and `password_vault` calls its
 * column `encrypted_password`, but no encryption existed. This module is what
 * makes those claims true.
 *
 * ── THE GUARANTEE ────────────────────────────────────────────────────────
 * Secrets are encrypted in the browser before they are sent anywhere. The
 * server stores ciphertext it cannot read: the key is derived from a
 * passphrase that is never transmitted and never written to disk. Someone with
 * full database access — including us — sees only ciphertext.
 *
 * The cost of that guarantee is real and must be stated plainly in the UI:
 * **if the passphrase is forgotten, the encrypted data is gone.** There is no
 * reset, because a reset we could perform is a backdoor we could be compelled
 * to use. Recovery has to be the user keeping their passphrase.
 *
 * ── CHOICES ──────────────────────────────────────────────────────────────
 * • AES-GCM 256 — authenticated, so tampering fails loudly instead of
 *   decrypting to garbage.
 * • PBKDF2-HMAC-SHA256 at 600,000 iterations — OWASP's 2023 floor. Argon2id
 *   would be better but is not in the Web Crypto API, and adding a wasm
 *   dependency for it is a bigger decision than this change.
 * • A fresh 12-byte IV per value. Never reuse an IV with the same key: with
 *   GCM that leaks plaintext, so it is generated per encrypt() call and
 *   stored alongside the ciphertext.
 * • The derived key lives in module memory only. A refresh re-locks the
 *   vault. It is deliberately never put in localStorage or sessionStorage,
 *   which would leave it readable on a shared machine.
 */

const ITERATIONS = 600_000;
const KEY_BITS = 256;
const IV_BYTES = 12;
const SALT_BYTES = 16;
const FORMAT = "v1";

/** Known plaintext used to check a passphrase without ever storing it. */
const VERIFIER_PLAINTEXT = "fpd-vault-verifier-v1";

/* The unlocked key. Module-scoped rather than exported so nothing outside
   this file can read the raw key material. */
let sessionKey: CryptoKey | null = null;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A new random salt, created once per user and stored beside their row. */
export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: KEY_BITS },
    false, // non-extractable: the raw bytes cannot be read back out
    ["encrypt", "decrypt"]
  );
}

async function encryptWith(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return `${FORMAT}.${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

async function decryptWith(key: CryptoKey, payload: string): Promise<string> {
  const [version, ivB64, ctB64] = payload.split(".");
  if (version !== FORMAT || !ivB64 || !ctB64) throw new Error("unrecognised ciphertext");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(ivB64) }, key, fromB64(ctB64));
  return dec.decode(plain);
}

/* ── Setup / unlock ────────────────────────────────────────────────────── */

/**
 * First-time setup. Returns the salt and verifier to persist on the user's
 * row; neither reveals anything about the passphrase. Leaves the vault
 * unlocked for this session.
 */
export async function createVault(passphrase: string): Promise<{ salt: string; verifier: string }> {
  const salt = newSalt();
  const key = await deriveKey(passphrase, salt);
  const verifier = await encryptWith(key, VERIFIER_PLAINTEXT);
  sessionKey = key;
  return { salt, verifier };
}

/**
 * Unlock with an existing salt/verifier. Returns false on the wrong
 * passphrase — GCM's auth tag makes that a clean failure, not a guess.
 */
export async function unlockVault(passphrase: string, salt: string, verifier: string): Promise<boolean> {
  const key = await deriveKey(passphrase, salt);
  try {
    if ((await decryptWith(key, verifier)) !== VERIFIER_PLAINTEXT) return false;
  } catch {
    return false;
  }
  sessionKey = key;
  return true;
}

/** Drop the key. Called on sign-out and on explicit lock. */
export function lockVault(): void {
  sessionKey = null;
}

export function isUnlocked(): boolean {
  return sessionKey !== null;
}

/* ── Field helpers ─────────────────────────────────────────────────────── */

/** Encrypt one field. Empty input stays empty rather than becoming ciphertext. */
export async function encryptField(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  if (!sessionKey) throw new Error("Vault is locked");
  return encryptWith(sessionKey, plaintext);
}

/**
 * Decrypt one field for display. Returns a placeholder rather than throwing on
 * damaged data, so one unreadable row cannot blank an entire screen.
 */
export async function decryptField(payload: string | null | undefined): Promise<string> {
  if (!payload) return "";
  if (!sessionKey) return "••••••••";
  // Rows written before this module existed are not ciphertext. Show them
  // as-is rather than failing; they get encrypted on the next save.
  if (!payload.startsWith(`${FORMAT}.`)) return payload;
  try {
    return await decryptWith(sessionKey, payload);
  } catch {
    return "⚠ unreadable";
  }
}
