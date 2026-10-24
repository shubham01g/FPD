// Stripe client for billing (routes/billing.ts, routes/stripeWebhook.ts,
// routes/adminBilling.ts, lib/billing/*). Plain fetch against the REST API
// rather than the SDK: the calls are few, and this keeps the edge bundle small.
//
// Keys come only from the function's secrets (STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET), pasted by the owner in the Supabase dashboard. They
// are never stored in the database, logged, or returned by any route
// (GO_LIVE_CHECKLIST.md, "Secrets and flags").
//
// Every request sends a pinned Stripe-Version. Webhook payloads arrive in
// whatever version the endpoint is set to in the dashboard, which may be newer
// than this code expects, so the webhook re-reads every object through here
// and only ever reads fields of this version (plus the tolerant accessors in
// stripeShapes.ts).

/** The API version every request is made with. Record a change of it in
 *  GO_LIVE_CHECKLIST.md and re-run Phase B. */
export const STRIPE_API_VERSION = "2024-06-20";

export type StripeMode = "test" | "live";

export function stripeSecretKey(): string | null {
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  return key ? key : null;
}

export function stripeWebhookSecret(): string | null {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();
  return secret ? secret : null;
}

/** test or live from the key's prefix (sk_test_ / rk_test_ vs *_live_), null
 *  when no usable key is set. Never reveals the key itself. */
export function stripeMode(): StripeMode | null {
  const key = stripeSecretKey();
  if (!key) return null;
  if (/^(sk|rk)_test_/.test(key)) return "test";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  return null;
}

export function isLivemode(): boolean {
  return stripeMode() === "live";
}

/** A Stripe API error with the fields callers branch on. */
export class StripeError extends Error {
  status: number;
  type: string | null;
  code: string | null;
  param: string | null;
  constructor(status: number, body: { error?: { message?: string; type?: string; code?: string; param?: string } } | null) {
    super(body?.error?.message ?? `Stripe request failed with status ${status}`);
    this.name = "StripeError";
    this.status = status;
    this.type = body?.error?.type ?? null;
    this.code = body?.error?.code ?? null;
    this.param = body?.error?.param ?? null;
  }
}

export function isResourceMissing(err: unknown): boolean {
  return err instanceof StripeError && err.code === "resource_missing";
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

export interface StripeRequestOptions {
  /** Makes a POST safe to repeat: Stripe returns the first result for 24h. */
  idempotencyKey?: string;
  expand?: string[];
}

/**
 * One Stripe API call. Throws StripeError on a Stripe error response, and a
 * plain Error when no key is configured. Retries once on 429/5xx/network
 * failure, but only when repeating can't double an effect (GET, DELETE, or a
 * POST that carries an idempotency key).
 */
export async function stripe<T = Record<string, any>>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, unknown> = {},
  options: StripeRequestOptions = {},
): Promise<T> {
  const key = stripeSecretKey();
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is not set)");

  const all = options.expand?.length ? { ...params, expand: options.expand } : params;
  const query = method === "GET" ? encode(all).toString() : "";
  const url = `https://api.stripe.com/v1${path}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Stripe-Version": STRIPE_API_VERSION,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const body = method === "GET" ? undefined : encode(all).toString();
  const retryable = method !== "POST" || Boolean(options.idempotencyKey);

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method, headers, body });
    } catch (err) {
      if (retryable && attempt === 0) { await new Promise((r) => setTimeout(r, 400)); continue; }
      throw err;
    }
    const json = await res.json().catch(() => null);
    if (res.ok) return json as T;
    if (retryable && attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 600));
      continue;
    }
    throw new StripeError(res.status, json);
  }
}

/** Every page of a list endpoint (bounded, for admin views and setup checks). */
export async function stripeListAll<T = Record<string, any>>(path: string, params: Record<string, unknown> = {}, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await stripe<{ data: T[]; has_more: boolean }>("GET", path, { limit: 100, ...params, starting_after: startingAfter });
    out.push(...res.data);
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = (res.data[res.data.length - 1] as { id: string }).id;
  }
  return out;
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (for signatures and shared secrets). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  return signatures.some((sig) => safeEqual(sig, expected));
}
