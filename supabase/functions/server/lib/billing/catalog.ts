// The catalog lives in the database (subscription_plans, billing_products);
// Stripe is made to match it by syncCatalog(). No price id is hard-coded
// anywhere: test prices are created by a sync in test mode, live prices by a
// sync during cutover.
//
// Stripe prices can't be edited, so a changed amount creates a new price,
// repoints the database and archives the old one. Subscribers keep the price
// they bought; every price carries metadata (fpd_kind, plan_id / slug,
// interval) so an archived price still maps back to its plan.
import { adminClient } from "../supabaseAdmin.ts";
import { isResourceMissing, stripe, stripeMode } from "../stripe.ts";

export type Interval = "month" | "year";

export interface PlanRow {
  id: string; name: string; price_monthly: number; price_annual: number; storage_gb: number;
  overage_rate: number; is_active: boolean; billable: boolean;
  stripe_product_id: string | null; stripe_price_id_monthly: string | null; stripe_price_id_annual: string | null;
  synced_price_monthly_cents: number | null; synced_price_annual_cents: number | null;
}

export interface ProductRow {
  slug: string; name: string; description: string | null; kind: "one_time" | "recurring"; product_group: string;
  interval: Interval | null; amount_cents: number; active: boolean;
  stripe_product_id: string | null; stripe_price_id: string | null; synced_amount_cents: number | null;
}

export const cents = (usd: number | string) => Math.round(Number(usd) * 100);

export class CatalogError extends Error {
  status: 400 | 409;
  constructor(message: string, status: 400 | 409 = 409) { super(message); this.status = status; }
}

/** The Stripe price to sell a plan at. Refuses Starter, inactive plans, and
 *  plans whose price changed since the last catalog sync. */
export async function planPrice(planId: string, interval: Interval): Promise<{ plan: PlanRow; priceId: string; amountCents: number }> {
  const { data: plan } = await adminClient().from("subscription_plans").select("*").eq("id", planId).maybeSingle<PlanRow>();
  if (!plan || !plan.is_active) throw new CatalogError("That plan is not available", 400);
  if (!plan.billable) throw new CatalogError("That plan isn't sold", 400);
  const amountCents = cents(interval === "year" ? plan.price_annual : plan.price_monthly);
  const priceId = interval === "year" ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;
  const synced = interval === "year" ? plan.synced_price_annual_cents : plan.synced_price_monthly_cents;
  if (!priceId || synced !== amountCents) {
    throw new CatalogError("This price is being updated. Please try again in a few minutes.");
  }
  return { plan, priceId, amountCents };
}

export async function productPrice(slug: string): Promise<{ product: ProductRow; priceId: string; amountCents: number }> {
  const { data: product } = await adminClient().from("billing_products").select("*").eq("slug", slug).maybeSingle<ProductRow>();
  if (!product || !product.active) throw new CatalogError("That product is not available", 400);
  if (!product.stripe_price_id || product.synced_amount_cents !== product.amount_cents) {
    throw new CatalogError("This price is being updated. Please try again in a few minutes.");
  }
  return { product, priceId: product.stripe_price_id, amountCents: product.amount_cents };
}

export type CatalogItem =
  | { kind: "plan"; planId: string; interval: Interval }
  | { kind: "product"; slug: string; group: string };

/** What a Stripe price sells: from its metadata (works for archived prices),
 *  falling back to the ids stored in the catalog. */
// deno-lint-ignore no-explicit-any
export async function catalogItemForPrice(price: Record<string, any> | null): Promise<CatalogItem | null> {
  if (!price) return null;
  const md = price.metadata ?? {};
  if (md.fpd_kind === "plan" && md.plan_id && (md.interval === "month" || md.interval === "year")) {
    return { kind: "plan", planId: md.plan_id, interval: md.interval };
  }
  if (md.fpd_kind === "product" && md.slug) {
    return { kind: "product", slug: md.slug, group: md.product_group ?? md.slug };
  }
  const db = adminClient();
  const id = price.id as string;
  const { data: plan } = await db.from("subscription_plans").select("id, stripe_price_id_monthly, stripe_price_id_annual")
    .or(`stripe_price_id_monthly.eq.${id},stripe_price_id_annual.eq.${id}`).maybeSingle();
  if (plan) return { kind: "plan", planId: plan.id, interval: plan.stripe_price_id_annual === id ? "year" : "month" };
  const { data: product } = await db.from("billing_products").select("slug, product_group").eq("stripe_price_id", id).maybeSingle();
  if (product) return { kind: "product", slug: product.slug, group: product.product_group };
  return null;
}

// ── Sync ────────────────────────────────────────────────────────────────

interface SyncLine {
  item: string;            // e.g. "foundation (month)" or "dr_addon_month"
  action: "create" | "reprice" | "ok";
  amountCents: number;
  oldPriceId?: string | null;
  newPriceId?: string;
  error?: string;
}

export interface SyncResult {
  mode: string | null;
  dryRun: boolean;
  would_create: SyncLine[];
  would_reprice: SyncLine[];
  up_to_date: SyncLine[];
  errors: SyncLine[];
}

/** A stored id from the other mode (or deleted in the dashboard) counts as missing. */
/** Is this a price checkout can still use? An archived price counts as
 *  missing, so the next sync replaces it. */
async function priceExists(priceId: string | null): Promise<boolean> {
  if (!priceId) return false;
  try {
    const price = await stripe<{ active?: boolean }>("GET", `/prices/${priceId}`);
    return price.active !== false;
  } catch (err) {
    if (isResourceMissing(err)) return false;
    throw err;
  }
}

async function productExists(productId: string | null): Promise<boolean> {
  if (!productId) return false;
  try {
    await stripe("GET", `/products/${productId}`);
    return true;
  } catch (err) {
    if (isResourceMissing(err)) return false;
    throw err;
  }
}

async function ensureProduct(existing: string | null, key: string, name: string, metadata: Record<string, string>): Promise<string> {
  if (await productExists(existing)) return existing!;
  const product = await stripe<{ id: string }>("POST", "/products", { name, metadata },
    { idempotencyKey: `product:${stripeMode()}:${key}` });
  return product.id;
}

// The idempotency key names the price being replaced: a crashed sync that is
// run again gets the same new price, but changing a price and changing it back
// within Stripe's 24-hour window still creates a fresh one (keyed on the amount
// alone, Stripe would hand back the original price, already archived).
async function createPrice(product: string, amountCents: number, interval: Interval | null, lookupKey: string, metadata: Record<string, string>, replacing: string | null): Promise<string> {
  const price = await stripe<{ id: string }>("POST", "/prices", {
    product,
    currency: "usd",
    unit_amount: amountCents,
    recurring: interval ? { interval } : undefined,
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata,
  }, { idempotencyKey: `price:${stripeMode()}:${lookupKey}:${amountCents}:${replacing ?? "first"}` });
  return price.id;
}

async function archivePrice(priceId: string | null) {
  if (!priceId) return;
  await stripe("POST", `/prices/${priceId}`, { active: false }).catch((err) => {
    if (!isResourceMissing(err)) throw err;
  });
}

/**
 * Makes Stripe's prices match the database. dryRun lists what would be
 * created or repriced without touching anything. Inactive plans and products
 * are skipped, so retired or test-only items never get live prices.
 */
export async function syncCatalog(dryRun: boolean): Promise<SyncResult> {
  const db = adminClient();
  const result: SyncResult = { mode: stripeMode(), dryRun, would_create: [], would_reprice: [], up_to_date: [], errors: [] };
  const record = (line: SyncLine) => {
    if (line.error) result.errors.push(line);
    else if (line.action === "create") result.would_create.push(line);
    else if (line.action === "reprice") result.would_reprice.push(line);
    else result.up_to_date.push(line);
  };

  const [{ data: plans }, { data: products }] = await Promise.all([
    db.from("subscription_plans").select("*").eq("is_active", true).eq("billable", true).order("price_monthly"),
    db.from("billing_products").select("*").eq("active", true).order("sort_order"),
  ]);

  for (const plan of (plans ?? []) as PlanRow[]) {
    let productId = plan.stripe_product_id;
    for (const interval of ["month", "year"] as Interval[]) {
      const amountCents = cents(interval === "year" ? plan.price_annual : plan.price_monthly);
      const oldPriceId = interval === "year" ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;
      const synced = interval === "year" ? plan.synced_price_annual_cents : plan.synced_price_monthly_cents;
      const line: SyncLine = { item: `${plan.id} (${interval})`, action: "ok", amountCents, oldPriceId };
      try {
        const exists = await priceExists(oldPriceId);
        line.action = !exists ? "create" : synced !== amountCents ? "reprice" : "ok";
        if (!dryRun && line.action !== "ok") {
          productId = await ensureProduct(productId, `plan:${plan.id}`, `Final Pass Down — ${plan.name}`, { fpd_kind: "plan", plan_id: plan.id });
          line.newPriceId = await createPrice(productId, amountCents, interval, `fpd_plan_${plan.id}_${interval}`,
            { fpd_kind: "plan", plan_id: plan.id, interval }, oldPriceId);
          const patch = interval === "year"
            ? { stripe_product_id: productId, stripe_price_id_annual: line.newPriceId, synced_price_annual_cents: amountCents }
            : { stripe_product_id: productId, stripe_price_id_monthly: line.newPriceId, synced_price_monthly_cents: amountCents };
          const { error } = await db.from("subscription_plans").update(patch).eq("id", plan.id);
          if (error) throw new Error(error.message);
          if (exists && oldPriceId) await archivePrice(oldPriceId);
        }
      } catch (err) {
        line.error = err instanceof Error ? err.message : String(err);
      }
      record(line);
    }
  }

  for (const product of (products ?? []) as ProductRow[]) {
    const line: SyncLine = { item: product.slug, action: "ok", amountCents: product.amount_cents, oldPriceId: product.stripe_price_id };
    try {
      const exists = await priceExists(product.stripe_price_id);
      line.action = !exists ? "create" : product.synced_amount_cents !== product.amount_cents ? "reprice" : "ok";
      if (!dryRun && line.action !== "ok") {
        const productId = await ensureProduct(product.stripe_product_id, `product:${product.slug}`, `Final Pass Down — ${product.name}`,
          { fpd_kind: "product", slug: product.slug, product_group: product.product_group });
        line.newPriceId = await createPrice(productId, product.amount_cents, product.interval, `fpd_${product.slug}`,
          { fpd_kind: "product", slug: product.slug, product_group: product.product_group, ...(product.interval ? { interval: product.interval } : {}) },
          product.stripe_price_id);
        const { error } = await db.from("billing_products").update({
          stripe_product_id: productId, stripe_price_id: line.newPriceId, synced_amount_cents: product.amount_cents, updated_at: new Date().toISOString(),
        }).eq("slug", product.slug);
        if (error) throw new Error(error.message);
        if (exists && product.stripe_price_id) await archivePrice(product.stripe_price_id);
      }
    } catch (err) {
      line.error = err instanceof Error ? err.message : String(err);
    }
    record(line);
  }

  return result;
}
