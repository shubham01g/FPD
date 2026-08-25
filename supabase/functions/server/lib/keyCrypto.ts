// AES-256-GCM encrypt/decrypt for storing enterprise API key secrets so they
// can be revealed again later (as opposed to the usual "show once" pattern —
// the tradeoff here is explicit: it lets an admin retrieve a lost key without
// revoking it, at the cost of the raw secret being recoverable from the
// database if it were ever compromised, since a stored encryption key can
// reverse it. Only ever call this from admin-authenticated routes.
let _cryptoKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_cryptoKey) return _cryptoKey;
  const secret = Deno.env.get("ENTERPRISE_KEY_ENCRYPTION_SECRET");
  if (!secret) {
    throw new Error("ENTERPRISE_KEY_ENCRYPTION_SECRET is not configured (set via `supabase secrets set`)");
  }
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  _cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  return _cryptoKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext)));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return toBase64(combined);
}

export async function decryptSecret(stored: string): Promise<string> {
  const key = await getKey();
  const combined = fromBase64(stored);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}
