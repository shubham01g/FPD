// Jobs called by the database's scheduler, not by people (mounted at
// /internal). Each request must carry x-cron-secret = CRON_SECRET; the
// pg_cron job in database/cron/billing_rollover.template.sql sends it from
// Supabase Vault.
import { Hono } from "npm:hono";
import type { Context, Next } from "npm:hono";
import { safeEqual, stripeMode } from "../lib/stripe.ts";
import { billingPaused } from "../lib/billingConfig.ts";
import { runRollover } from "../lib/billing/usage.ts";
import { runMessageDelivery } from "../lib/messageDelivery.ts";
import { runScheduledCampaigns } from "../lib/campaigns.ts";

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

// POST /internal/messages/deliver — hourly (the messages-delivery cron):
// email Messages to Loved Ones that are due (migration 050) and send admin
// announcements whose scheduled time has passed (migration 054). Each job
// runs even if the other fails.
internal.post("/messages/deliver", async (c) => {
  const out: Record<string, unknown> = {};
  let failed = false;
  try { out.messages = await runMessageDelivery(); }
  catch (err) { failed = true; console.error("message delivery failed:", err); out.messagesError = err instanceof Error ? err.message : "Delivery failed"; }
  try { out.campaigns = await runScheduledCampaigns(); }
  catch (err) { failed = true; console.error("scheduled campaigns failed:", err); out.campaignsError = err instanceof Error ? err.message : "Campaigns failed"; }
  return c.json(out, failed ? 500 : 200);
});

export default internal;
