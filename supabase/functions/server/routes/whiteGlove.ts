import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "../lib/stripe.ts";
import { billingPaused } from "../lib/billingConfig.ts";
import { CatalogError, productPrice } from "../lib/billing/catalog.ts";
import { findCustomer } from "../lib/billing/customers.ts";

const whiteGlove = new Hono();

// GET /admin/white-glove/clients
whiteGlove.get("/clients", async (c) => {
  const { data, error } = await adminClient()
    .from("wg_clients")
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .order("intake_date", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ clients: data });
});

// POST /admin/white-glove/clients — enrolls an EXISTING user account (there's
// no name/email column on wg_clients; it's keyed to a real users.id).
whiteGlove.post("/clients", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { userId, specialistId, reason, notes, subscriptionWaived } = body;

  if (!userId) return c.json({ error: "userId is required" }, 400);

  const db = adminClient();
  const { data: existing } = await db.from("wg_clients").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return c.json({ error: "This user is already enrolled in White Glove" }, 409);

  const { data, error } = await db
    .from("wg_clients")
    .insert({ user_id: userId, specialist_id: specialistId || null, reason: reason || null, notes: notes || null })
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  await db.from("users").update({ white_glove: true, ...(subscriptionWaived ? { subscription_waived: true } : {}) }).eq("id", userId);

  return c.json({ client: data }, 201);
});

// PATCH /admin/white-glove/clients/:id
whiteGlove.patch("/clients/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "completion_pct", "notes", "specialist_id", "next_session_at"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  if (patch.status === "completed") patch.completed_at = new Date().toISOString();

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient()
    .from("wg_clients")
    .update(patch)
    .eq("id", id)
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Client not found" }, 404);
  return c.json({ client: data });
});

// ── Session billing ─────────────────────────────────────────────────────
// The client's card was saved when they paid the White Glove setup fee
// (with consent to per-session charges). A session is billed in 30-minute
// blocks, rounded up, at the catalog's wg_session_block price, as an invoice
// charged to that card. The webhook marks the row charged or failed.

// GET /admin/white-glove/clients/:id/billing — card on file and session charges.
whiteGlove.get("/clients/:id/billing", async (c) => {
  const db = adminClient();
  const { data: client } = await db.from("wg_clients").select("user_id").eq("id", c.req.param("id")).maybeSingle();
  if (!client?.user_id) return c.json({ error: "Client not found" }, 404);
  const [{ data: card }, { data: sessions }] = await Promise.all([
    db.from("wg_payment_methods").select("card_brand, card_last4, card_expiry, livemode, updated_at").eq("user_id", client.user_id).maybeSingle(),
    db.from("wg_session_billing").select("*").eq("client_user_id", client.user_id).order("started_at", { ascending: false }).limit(50),
  ]);
  return c.json({ card: card && card.livemode === isLivemode() ? card : null, sessions: sessions ?? [] });
});

// POST /admin/white-glove/clients/:id/charge-session
//   { sessionKey (uuid, one per session), startedAt, endedAt, sessionType, notes? }
// Charging the same sessionKey twice returns the first charge.
whiteGlove.post("/clients/:id/charge-session", async (c) => {
  if (!stripeMode()) return c.json({ error: "Stripe is not configured" }, 503);
  if (billingPaused()) return c.json({ error: "Billing is being updated. Please try again in a few minutes." }, 503);
  const body = await c.req.json().catch(() => ({}));
  const sessionKey = String(body.sessionKey ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sessionKey)) return c.json({ error: "sessionKey must be a UUID" }, 400);
  const started = new Date(body.startedAt);
  const ended = new Date(body.endedAt);
  if (isNaN(started.getTime()) || isNaN(ended.getTime()) || ended <= started) return c.json({ error: "Enter a valid start and end time" }, 400);
  const sessionType = ["phone", "video", "in_person"].includes(body.sessionType) ? body.sessionType : "video";

  const db = adminClient();
  const { data: existing } = await db.from("wg_session_billing").select("*").eq("session_key", sessionKey).maybeSingle();
  if (existing) return c.json({ session: existing, duplicate: true });

  const { data: client } = await db.from("wg_clients").select("user_id, specialist_id").eq("id", c.req.param("id")).maybeSingle();
  if (!client?.user_id) return c.json({ error: "Client not found" }, 404);
  const { data: card } = await db.from("wg_payment_methods").select("*").eq("user_id", client.user_id).maybeSingle();
  if (!card?.stripe_payment_method || card.livemode !== isLivemode()) {
    return c.json({ error: "This client has no card on file. They need to complete White Glove setup first." }, 409);
  }

  let block;
  try {
    block = await productPrice("wg_session_block");
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Session price unavailable" }, err instanceof CatalogError ? err.status : 500);
  }
  const minutes = Math.max(1, Math.ceil((ended.getTime() - started.getTime()) / 60000));
  const blocks = Math.max(1, Math.ceil(minutes / 30));
  const admin = c.get("admin" as never) as { email?: string } | undefined;

  const { data: row, error: insertErr } = await db.from("wg_session_billing").insert({
    session_key: sessionKey, client_user_id: client.user_id, specialist_id: client.specialist_id ?? null,
    session_type: sessionType, started_at: started.toISOString(), ended_at: ended.toISOString(),
    duration_minutes: minutes, blocks_charged: blocks, amount_charged: (blocks * block.amountCents) / 100,
    rate_per_block: block.amountCents / 100, card_last4: card.card_last4, card_brand: card.card_brand,
    status: "pending", specialist_notes: body.notes ?? null, livemode: isLivemode(), charged_by: admin?.email ?? null,
  }).select().single();
  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: again } = await db.from("wg_session_billing").select("*").eq("session_key", sessionKey).maybeSingle();
      return c.json({ session: again, duplicate: true });
    }
    return c.json({ error: insertErr.message }, 500);
  }

  try {
    const customer = card.stripe_customer_id ?? await findCustomer(client.user_id);
    const invoice = await stripe<Record<string, any>>("POST", "/invoices", {
      customer,
      collection_method: "charge_automatically",
      auto_advance: true,
      pending_invoice_items_behavior: "exclude",
      default_payment_method: card.stripe_payment_method,
      description: "White Glove session",
      metadata: { purpose: "wg_session", userId: client.user_id, sessionBillingId: row.id },
    }, { idempotencyKey: `wg-invoice:${sessionKey}` });
    await stripe("POST", "/invoiceitems", {
      customer, invoice: invoice.id, price: block.priceId, quantity: blocks,
      description: `White Glove ${sessionType.replace("_", " ")} session, ${minutes} min (${blocks} × 30 min)`,
      metadata: { purpose: "wg_session", sessionBillingId: row.id },
    }, { idempotencyKey: `wg-item:${sessionKey}` });
    await db.from("wg_session_billing").update({ stripe_invoice_id: invoice.id }).eq("id", row.id);
    await stripe("POST", `/invoices/${invoice.id}/finalize`, { auto_advance: true }, { idempotencyKey: `wg-finalize:${sessionKey}` });
    // A decline is reported by invoice.payment_failed (row → failed, admin emailed).
    const paid = await stripe<Record<string, any>>("POST", `/invoices/${invoice.id}/pay`, { off_session: true },
      { idempotencyKey: `wg-pay:${sessionKey}` }).catch((err) => ({ status: "payment_failed", message: err instanceof Error ? err.message : String(err) }));
    const { data: fresh } = await db.from("wg_session_billing").select("*").eq("id", row.id).maybeSingle();
    return c.json({ session: fresh ?? row, invoiceStatus: paid.status, message: (paid as { message?: string }).message ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from("wg_session_billing").update({ status: "failed", failure_message: message }).eq("id", row.id);
    return c.json({ error: message }, 502);
  }
});

export default whiteGlove;
