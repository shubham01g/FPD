import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "../lib/stripe.ts";
import { billingPaused } from "../lib/billingConfig.ts";
import { CatalogError, productPrice } from "../lib/billing/catalog.ts";
import { findCustomer } from "../lib/billing/customers.ts";
import { chargeWgSession } from "../lib/wgBilling.ts";
import { liveSubscriptionRow } from "../lib/billing/planChange.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

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

  // "Waive subscription fee" is a real comped plan (the same comp_<id> row
  // Admin → User billing → Comp makes), so it needs the same permission.
  // Checked before anything is written.
  let compPlan: string | null = null;
  if (subscriptionWaived) {
    const admin = c.get("admin" as never) as AdminUser;
    const canComp = admin.permissions === null || admin.role === "super_admin"
      || Boolean(admin.permissions.find((p) => p.module === "subscription")?.canEdit);
    if (!canComp) {
      return c.json({ error: "Waiving the subscription comps a plan, which needs Subscription edit access. Enrol without the waiver, or ask an admin who has it." }, 403);
    }
    const live = await liveSubscriptionRow(userId, "plan");
    if (live && !live.id.startsWith("comp_")) {
      return c.json({ error: "This account pays for a plan. Use Refund & end in User billing before waiving it." }, 409);
    }
    const { data: u } = await db.from("users").select("plan").eq("id", userId).maybeSingle();
    const { data: plan } = await db.from("subscription_plans").select("id, billable, is_active").eq("id", u?.plan ?? "").maybeSingle();
    compPlan = plan?.billable && plan.is_active ? plan.id : "foundation";
  }

  const { data, error } = await db
    .from("wg_clients")
    .insert({ user_id: userId, specialist_id: specialistId || null, reason: reason || null, notes: notes || null })
    .select("*, users(full_name, email, phone, plan, subscription_waived), concierge_employees(id, name), wg_sessions(*)")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  const { error: flagError } = await db.from("users")
    .update({ white_glove: true, ...(compPlan ? { subscription_waived: true, waive_reason: "White Glove enrolment" } : {}) })
    .eq("id", userId);
  if (flagError) return c.json({ error: `Enrolled, but the account flag failed: ${flagError.message}` }, 500);

  if (compPlan) {
    const admin = c.get("admin" as never) as AdminUser;
    const { error: compError } = await db.rpc("provision_subscription", { p: {
      id: `comp_${userId}`, user_id: userId, product_line: "plan", plan_id: compPlan, status: "active",
      canceled_at: null, ended_at: null, comp_reason: "White Glove enrolment", comp_granted_by: admin.email,
    } });
    if (compError) return c.json({ error: `Enrolled, but the plan waiver failed: ${compError.message}` }, 500);
  }

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
// GET /admin/white-glove/waivers — every authorization waiver (migration 051).
// Waivers are sent by the specialist from the Concierge Portal and signed by
// the client at /waiver/:token; this is the read-only admin view.
whiteGlove.get("/waivers", async (c) => {
  const { data, error } = await adminClient().from("wg_waivers")
    .select("id, status, sent_at, signed_at, signed_name, signer_ip, specialist_name, authorized_scope, expires_at, users:client_user_id(full_name, email)")
    .order("sent_at", { ascending: false }).limit(500);
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ waivers: data ?? [] });
});

whiteGlove.post("/clients/:id/charge-session", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const admin = c.get("admin" as never) as { email?: string } | undefined;
  const r = await chargeWgSession({
    wgClientId: c.req.param("id"), sessionKey: body.sessionKey, startedAt: body.startedAt, endedAt: body.endedAt,
    sessionType: body.sessionType, notes: body.notes ?? null, chargedBy: admin?.email ?? null,
  });
  return c.json(r.body, r.status as 200);
});

export default whiteGlove;
