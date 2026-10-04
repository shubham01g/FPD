// Unauthenticated, read-only endpoints for the customer-facing app (pricing
// page, plan selection, white-label marketing section). No requireAdmin and
// no auditLog here — these are public data, not admin actions.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { readPlatformSection } from "../lib/platformSettings.ts";
import { loadStripeConfig, stripeRequest, verifyStripeSignature } from "../lib/stripe.ts";

const pub = new Hono();

// GET /public/plans — live subscription plan pricing for the marketing/pricing pages.
pub.get("/plans", async (c) => {
  const { data, error } = await adminClient()
    .from("subscription_plans")
    .select("id, name, price_monthly, price_annual, storage_gb, max_contacts, overage_rate")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ plans: data });
});

// GET /public/platform — maintenance mode and feature flags from System →
// Settings, for the customer-facing app to enforce (services/platform.ts).
pub.get("/platform", async (c) => {
  const [general, flags, { data: rows }] = await Promise.all([
    readPlatformSection("general"),
    readPlatformSection("flags"),
    adminClient().from("admin_settings").select("key, value")
      .in("key", ["starter_trial_days", "continuation_fee_amount", "continuation_fee_period_months"]),
  ]);
  const setting = (key: string) => rows?.find((r) => r.key === key)?.value ?? "";
  const trialDays = parseInt(setting("starter_trial_days"), 10);
  const feeAmount = Number(setting("continuation_fee_amount"));
  const feeMonths = parseInt(setting("continuation_fee_period_months"), 10);
  return c.json({
    maintenance: general.maintenance === true,
    maintenanceMsg: typeof general.maintenanceMsg === "string" ? general.maintenanceMsg : "",
    flags,
    // Length of the Starter plan (Admin → Subscription Config); 14 until set.
    starterTrialDays: trialDays > 0 ? trialDays : 14,
    // The Legacy Continuation Fee as set on the admin "$199 Legacy Fee" page,
    // so the customer page quotes what checkout will actually charge.
    continuationFee: { amount: feeAmount > 0 ? feeAmount : 199, months: feeMonths > 0 ? feeMonths : 24 },
  });
});

// ── Admin invitations (the /admin/accept page) ──────────────────────────────
// An invite is an admin_accounts row in status "invited" with a one-time
// token (routes/adminAccounts.ts). Accepting it is what makes the person able
// to sign in to the admin portal: requireAdmin needs users.is_admin and an
// active admin_accounts row.

async function loadInvite(id: string, token: string) {
  if (!id || !token) return null;
  const { data } = await adminClient()
    .from("admin_accounts")
    .select("id, name, email, role, status, invite_token, invite_expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.status !== "invited" || !data.invite_token || data.invite_token !== token) return null;
  if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) return null;
  return data;
}

const INVITE_INVALID = "This invitation link is not valid or has expired. Ask an admin to send a new one.";

// GET /public/admin-invite/:id?token=
pub.get("/admin-invite/:id", async (c) => {
  const invite = await loadInvite(c.req.param("id"), c.req.query("token") ?? "");
  if (!invite) return c.json({ error: INVITE_INVALID }, 404);
  const { data: existing } = await adminClient().from("users").select("id").eq("email", invite.email).maybeSingle();
  return c.json({ invite: { name: invite.name, email: invite.email, role: invite.role, hasAccount: Boolean(existing) } });
});

// POST /public/admin-invite/:id/accept { token, password }
// A new person gets a sign-in created with the password they choose. Someone
// who already has an account keeps their own password — the invite only adds
// admin access, it never resets a password.
pub.post("/admin-invite/:id/accept", async (c) => {
  const { token, password } = await c.req.json().catch(() => ({}));
  const invite = await loadInvite(c.req.param("id"), typeof token === "string" ? token : "");
  if (!invite) return c.json({ error: INVITE_INVALID }, 404);

  const db = adminClient();
  let { data: account } = await db.from("users").select("id").eq("email", invite.email).maybeSingle();

  if (!account) {
    if (typeof password !== "string" || password.length < 12) {
      return c.json({ error: "Choose a password of at least 12 characters" }, 400);
    }
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: invite.email, password, email_confirm: true, user_metadata: { full_name: invite.name },
    });
    if (createErr || !created?.user) {
      return c.json({ error: createErr?.message ?? "Could not create the sign-in for this invitation" }, 500);
    }
    // handle_new_user creates the public.users row; make sure it is there.
    await db.from("users").upsert({ id: created.user.id, email: invite.email, full_name: invite.name }, { onConflict: "id", ignoreDuplicates: true });
    account = { id: created.user.id };
  }

  const { error: adminErr } = await db.from("users").update({ is_admin: true }).eq("id", account.id);
  if (adminErr) return c.json({ error: adminErr.message }, 500);

  const { error: acceptErr } = await db
    .from("admin_accounts")
    .update({ status: "active", user_id: account.id, invite_token: null, invite_expires_at: null })
    .eq("id", invite.id);
  if (acceptErr) return c.json({ error: acceptErr.message }, 500);

  return c.json({ accepted: true, email: invite.email });
});

// GET /public/wl-packages — live White Label package tiers for the marketing
// section and the partner onboarding wizard.
pub.get("/wl-packages", async (c) => {
  const { data, error } = await adminClient()
    .from("wl_packages")
    .select("*")
    .eq("active", true)
    .order("flat_monthly", { ascending: true, nullsFirst: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ packages: data });
});

// POST /public/wl-sales — a prospective partner submits the onboarding
// wizard. No admin session exists at this point, so this writes through the
// service-role client directly rather than requireAdmin's /admin/* routes.
pub.post("/wl-sales", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { org, contact, email, packageId, subdomain, processor } = body;

  if (!org?.trim() || !contact?.trim() || !email?.trim() || !packageId) {
    return c.json({ error: "'org', 'contact', 'email' and 'packageId' are required" }, 400);
  }

  const db = adminClient();
  const { data: pkg } = await db.from("wl_packages").select("setup_fee").eq("id", packageId).maybeSingle();
  if (!pkg) return c.json({ error: "Unknown package" }, 400);

  const { count } = await db.from("wl_sales").select("id", { count: "exact", head: true });
  const id = `WL-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data, error } = await db
    .from("wl_sales")
    .insert({
      id, org, contact, email, package_id: packageId, subdomain: subdomain || null, processor: processor || null,
      total_paid: Number(pkg.setup_fee) || 0,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ sale: data }, 201);
});

// ── Stripe webhook ───────────────────────────────────────────────────────
// POST /public/stripe/webhook — the only place a card payment changes
// anything. Stripe calls it; the Stripe-Signature header is verified against
// the webhook secret saved under Payment Processors, so an unsigned or forged
// request is rejected before any row is touched. Handlers are idempotent
// (Stripe retries), keyed on the invoice / payment-intent id.
interface StripeEvent { type: string; data: { object: Record<string, any> } }

pub.post("/stripe/webhook", async (c) => {
  const config = await loadStripeConfig();
  if (!config?.webhookSecret) return c.json({ error: "Stripe webhook is not configured" }, 503);

  const raw = await c.req.text();
  if (!(await verifyStripeSignature(raw, c.req.header("stripe-signature"), config.webhookSecret))) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  const event = JSON.parse(raw) as StripeEvent;
  const obj = event.data.object;
  const db = adminClient();

  /** Records a payment once; a retry of the same event is a no-op. */
  async function recordPayment(row: {
    user_id: string; type: string; amount: number; description: string;
    intent?: string | null; invoice?: string | null;
  }) {
    const key = row.intent ? ["stripe_payment_intent", row.intent] : row.invoice ? ["stripe_invoice_id", row.invoice] : null;
    if (key) {
      const { data: existing } = await db.from("payments").select("id").eq(key[0], key[1]).limit(1);
      if (existing?.length) return;
    }
    await db.from("payments").insert({
      user_id: row.user_id, type: row.type, amount_usd: row.amount, status: "succeeded",
      description: row.description, stripe_payment_intent: row.intent ?? null, stripe_invoice_id: row.invoice ?? null,
      paid_at: new Date().toISOString(),
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const userId = obj.metadata?.user_id as string | undefined;
      if (!userId || obj.payment_status === "unpaid") break;
      const amount = Number(obj.amount_total ?? 0) / 100;

      if (obj.metadata?.kind === "plan") {
        const { data: before } = await db.from("users").select("stripe_subscription_id").eq("id", userId).maybeSingle();
        await db.from("users").update({
          plan: obj.metadata.plan_id, plan_status: "active",
          stripe_customer_id: obj.customer ?? null, stripe_subscription_id: obj.subscription ?? null,
        }).eq("id", userId);
        // Changing plan starts a new subscription; stop billing the old one.
        if (before?.stripe_subscription_id && before.stripe_subscription_id !== obj.subscription) {
          await stripeRequest(config.secretKey, "DELETE", `/subscriptions/${before.stripe_subscription_id}`).catch((err) =>
            console.error("could not cancel previous subscription:", err));
        }
        await recordPayment({ user_id: userId, type: "upgrade", amount, description: `Plan: ${obj.metadata.plan_id}`, invoice: obj.invoice });
      }

      if (obj.metadata?.kind === "continuation_fee") {
        const intent = obj.payment_intent as string | null;
        const { data: existing } = await db.from("legacy_continuation_fees").select("id").eq("stripe_payment_intent_id", intent).limit(1);
        if (!existing?.length) {
          const { data: months } = await db.from("admin_settings").select("value").eq("key", "continuation_fee_period_months").maybeSingle();
          await db.from("legacy_continuation_fees").insert({
            user_id: userId, paid_by_user_id: userId, paid_by_type: "account_owner", amount_usd: amount,
            stripe_payment_intent_id: intent, status: "paid", paid_at: new Date().toISOString(),
            activation_period_months: parseInt(months?.value ?? "24", 10),
          });
        }
        if (obj.customer) await db.from("users").update({ stripe_customer_id: obj.customer }).eq("id", userId);
        await recordPayment({ user_id: userId, type: "continuation_fee", amount, description: "Legacy Continuation Fee", intent });
      }
      break;
    }

    // Renewals. The first invoice of a subscription is already recorded by
    // checkout.session.completed above.
    case "invoice.paid": {
      if (obj.billing_reason !== "subscription_cycle") break;
      const { data: account } = await db.from("users").select("id").eq("stripe_customer_id", obj.customer).maybeSingle();
      if (!account) break;
      await db.from("users").update({ plan_status: "active" }).eq("id", account.id);
      await recordPayment({ user_id: account.id, type: "subscription", amount: Number(obj.amount_paid ?? 0) / 100, description: "Subscription renewal", invoice: obj.id });
      break;
    }

    case "invoice.payment_failed": {
      await db.from("users").update({ plan_status: "past_due" }).eq("stripe_customer_id", obj.customer);
      break;
    }

    case "customer.subscription.deleted": {
      // Only when it is the account's CURRENT subscription — the old one that
      // a plan change cancels must not mark the account cancelled.
      await db.from("users").update({ plan_status: "cancelled" }).eq("stripe_subscription_id", obj.id);
      break;
    }
  }

  return c.json({ received: true });
});

// ── Legacy Claim Portal (migration 027) ─────────────────────────────────
// A legacy contact opens the link an admin issued from Mark Deceased. There
// is no login: the unguessable token in the URL is the credential, it expires,
// and it only ever exposes the one claim it belongs to.

const CLAIM_DOC_TYPES = ["death_certificate", "claimant_id", "will", "power_of_attorney", "obituary", "hospital_records", "other"] as const;
const CLAIM_MAX_FILE_BYTES = 15 * 1024 * 1024;
// The portal accepts a submission while the link is fresh, or again after an
// admin asks for more documents.
const CLAIM_OPEN_STATUSES = ["link_sent", "awaiting_docs"];

async function claimByToken(token: string) {
  return adminClient()
    .from("legacy_claims")
    .select(
      "id, claim_ref, status, token_expires_at, claimant_name, claimant_email, claimant_phone, claimant_relationship, " +
      "claimant_id_type, requested_access, death_cert_override, link_message, " +
      "owner:owner_user_id(full_name, plan), documents:legacy_claim_documents(doc_type, file_name)",
    )
    .eq("token", token)
    .maybeSingle();
}

// GET /public/legacy-claim/:token — what the portal pre-fills.
pub.get("/legacy-claim/:token", async (c) => {
  const { data: claim, error } = await claimByToken(c.req.param("token"));
  if (error) return c.json({ error: error.message }, 500);
  if (!claim) return c.json({ error: "This claim link is not valid. Please contact Final Pass Down for a new one." }, 404);
  if (new Date(claim.token_expires_at).getTime() < Date.now()) {
    return c.json({ error: "This claim link has expired. Please contact Final Pass Down for a new one." }, 410);
  }

  return c.json({ claim: { ...claim, open: CLAIM_OPEN_STATUSES.includes(claim.status) } });
});

// POST /public/legacy-claim/:token — multipart form: fullName, email, phone,
// idType, deathCertOverride, plus one file field per document type.
pub.post("/legacy-claim/:token", async (c) => {
  const { data: claim, error } = await claimByToken(c.req.param("token"));
  if (error) return c.json({ error: error.message }, 500);
  if (!claim) return c.json({ error: "This claim link is not valid." }, 404);
  if (new Date(claim.token_expires_at).getTime() < Date.now()) return c.json({ error: "This claim link has expired." }, 410);
  if (!CLAIM_OPEN_STATUSES.includes(claim.status)) {
    return c.json({ error: "This claim has already been submitted and is with the review team." }, 409);
  }

  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json({ error: "Expected a multipart form submission" }, 400);

  const fullName = String(form.get("fullName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const idType = String(form.get("idType") ?? "").trim();
  const idLast4 = String(form.get("idLast4") ?? "").trim().slice(0, 4);
  const override = form.get("deathCertOverride") === "true";
  if (!fullName || !email || !phone || !idType) {
    return c.json({ error: "Full name, email, phone and ID type are required" }, 400);
  }

  const files: { type: typeof CLAIM_DOC_TYPES[number]; file: File }[] = [];
  for (const type of CLAIM_DOC_TYPES) {
    const value = form.get(type);
    if (value instanceof File && value.size > 0) {
      if (value.size > CLAIM_MAX_FILE_BYTES) return c.json({ error: `${value.name} is larger than 15 MB` }, 400);
      files.push({ type, file: value });
    }
  }

  // Required documents count what is already on file from an earlier
  // submission, so answering a "request docs" doesn't mean re-uploading everything.
  const onFile = new Set<string>((claim.documents ?? []).map((d: { doc_type: string }) => d.doc_type));
  const has = (type: string) => onFile.has(type) || files.some((f) => f.type === type);
  if (!has("claimant_id")) return c.json({ error: "Your government ID is required" }, 400);
  if (!has("death_certificate") && !override) {
    return c.json({ error: "Upload the death certificate, or confirm you do not have it yet" }, 400);
  }

  const db = adminClient();
  const bucket = db.storage.from("legacy-claims");
  for (const { type, file } of files) {
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${claim.id}/${type}-${Date.now()}.${ext}`;
    const { error: upErr } = await bucket.upload(path, file, { contentType: file.type || undefined });
    if (upErr) return c.json({ error: `Could not store ${file.name}: ${upErr.message}` }, 500);

    const { error: docErr } = await db
      .from("legacy_claim_documents")
      .upsert(
        { claim_id: claim.id, doc_type: type, file_path: path, file_name: file.name, uploaded_at: new Date().toISOString() },
        { onConflict: "claim_id,doc_type" },
      );
    if (docErr) return c.json({ error: docErr.message }, 500);
  }

  const resubmission = claim.status === "awaiting_docs";
  const { error: updErr } = await db
    .from("legacy_claims")
    .update({
      status: "pending_review",
      claimant_name: fullName, claimant_email: email, claimant_phone: phone, claimant_id_type: idType, claimant_id_last4: idLast4 || null,
      death_cert_override: override && !has("death_certificate"),
      submitted_at: new Date().toISOString(),
    })
    .eq("id", claim.id);
  if (updErr) return c.json({ error: updErr.message }, 500);

  const events = [
    {
      claim_id: claim.id, actor: fullName, type: "claimant",
      event: resubmission
        ? `Additional documents submitted by claimant (${files.length} file${files.length === 1 ? "" : "s"})`
        : `Death claim submitted by claimant (${files.length} document${files.length === 1 ? "" : "s"})`,
    },
    ...(override && !has("death_certificate")
      ? [{ claim_id: claim.id, actor: fullName, type: "warn", event: "Death certificate override — claimant does not have the certificate yet" }]
      : []),
    { claim_id: claim.id, actor: "System", type: "system", event: "Claim assigned to admin review queue" },
  ];
  await db.from("legacy_claim_events").insert(events);

  return c.json({ claim: { claim_ref: claim.claim_ref, documents: onFile.size + files.filter((f) => !onFile.has(f.type)).length } }, 201);
});

export default pub;
