// Jobs called by the database's scheduler, not by people (mounted at
// /internal). Each request must carry x-cron-secret = CRON_SECRET; the
// pg_cron job in database/cron/billing_rollover.template.sql sends it from
// Supabase Vault.
import { Hono } from "npm:hono";
import type { Context, Next } from "npm:hono";
import { safeEqual, stripeMode } from "../lib/stripe.ts";
import { billingPaused } from "../lib/billingConfig.ts";
import { runRollover } from "../lib/billing/usage.ts";

const internal = new Hono();

async function requireCronSecret(c: Context, next: Next) {
  const expected = Deno.env.get("CRON_SECRET")?.trim();
  const sent = c.req.header("x-cron-secret")?.trim() ?? "";
  if (!expected || !safeEqual(sent, expected)) return c.json({ error: "Forbidden" }, 403);
  await next();
}

internal.use("*", requireCronSecret);

// POST /internal/billing/rollover — hourly: close ended usage periods and bill
// the overage that monthly renewals won't carry. Skipped while billing is
// paused (cutover, rollback); the next run catches up.
internal.post("/billing/rollover", async (c) => {
  if (!stripeMode()) return c.json({ skipped: "Stripe is not configured" });
  if (billingPaused()) return c.json({ skipped: "Billing is paused" });
  try {
    return c.json(await runRollover());
  } catch (err) {
    console.error("rollover failed:", err);
    return c.json({ error: err instanceof Error ? err.message : "Rollover failed" }, 500);
  }
});

export default internal;
