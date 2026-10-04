// Minimal Stripe client for the checkout routes (routes/billing.ts) and the
// webhook (routes/public.ts). Plain fetch against the REST API rather than
// the SDK: the calls needed are few, and this keeps the edge bundle small.
//
// Credentials are whatever an admin saved under Developer → Payment
// Processors → Stripe — nothing is read from the environment. Checkout is
// therefore "on" exactly when Stripe is connected there and is the active
// processor.
import { adminClient } from "./supabaseAdmin.ts";
import { decryptSecret } from "./keyCrypto.ts";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
}

/** null when Stripe isn't the connected, active processor (or has no secret key). */
export async function loadStripeConfig(): Promise<StripeConfig | null> {
  const { data } = await adminClient()
    .from("crypto_processor_configs")
    .select("enabled, is_default, config_encrypted")
    .eq("id", "stripe")
    .maybeSingle();
  if (!data?.enabled || !data.is_default || !data.config_encrypted) return null;

  try {
    const config = JSON.parse(await decryptSecret(data.config_encrypted)) as Record<string, string>;
    if (!config.secretKey) return null;
    return {
      secretKey: config.secretKey,
      webhookSecret: config.webhookSecret ?? "",
      testMode: config.mode === "test" || config.secretKey.startsWith("sk_test_"),
    };
  } catch (err) {
    console.error("stripe config decrypt failed:", err);
    return null;
  }
}

/** Flattens nested params into Stripe's form encoding: a[b][0][c]=v. */
function encode(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") encode(value as Record<string, unknown>, name, out);
    else out.append(name, String(value));
  }
  return out;
}

export async function stripeRequest<T = Record<string, unknown>>(
  secretKey: string, method: "GET" | "POST" | "DELETE", path: string, params?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params && method !== "GET" ? encode(params) : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Stripe request failed with status ${res.status}`);
  }
  return body as T;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifies a Stripe-Signature header (scheme v1, HMAC-SHA256 over
 *  "<timestamp>.<raw body>") and rejects events older than five minutes. */
export async function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts.t;
  const signatures = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));

  // Constant-time comparison.
  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}
