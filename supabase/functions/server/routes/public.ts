// Unauthenticated, read-only endpoints for the customer-facing app (pricing
// page, plan selection, white-label marketing section). No requireAdmin and
// no auditLog here — these are public data, not admin actions.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { readPlatformSection } from "../lib/platformSettings.ts";
import stripeWebhook from "./stripeWebhook.ts";
import { billingStatus } from "../lib/billingConfig.ts";
import { openDeliveredMessage } from "../lib/messageDelivery.ts";
import { safeEqual, sha256Hex } from "../lib/contactLink.ts";
import { EMAIL_CONFIGURED, MAILBOX, claimAlertEmail, noticeEmail, sendEmail } from "../lib/email.ts";

const pub = new Hono();

// GET /public/plans — live subscription plan pricing for the marketing/pricing pages.
// GET /public/white-label — the branding every page renders with. Only
// display fields (no ids of who edited it). WhiteLabelProvider used to read
// /admin/white-label/configs on every page load, so every visitor got a 401.
pub.get("/white-label", async (c) => {
  const { data, error } = await adminClient().from("white_label_configs")
    .select("id, company_name, tagline, primary_color, accent_color, logo_text, domain, support_email, sender_name, features, plan_names, footer_text, terms_url, privacy_url, is_active")
    .order("created_at", { ascending: false }).limit(1);
  if (error) return c.json({ configs: [] });
  return c.json({ configs: data ?? [] });
});

// ── White Glove authorization waiver (migration 051) ───────────────
// The client signs through the link emailed from the Concierge Portal.
async function waiverByToken(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  const { data } = await adminClient().from("wg_waivers")
    .select("id, client_user_id, specialist_name, authorized_scope, status, signed_at, signed_name, token_expires_at, users:client_user_id(full_name)")
    .eq("token_hash", hash).maybeSingle();
  return data;
}

pub.get("/waiver/:token", async (c) => {
  const w = await waiverByToken(c.req.param("token"));
  if (!w) return c.json({ error: "This waiver link isn't valid." }, 404);
  const expired = w.status === "expired" || (w.status === "pending" && (!w.token_expires_at || new Date(w.token_expires_at).getTime() < Date.now()));
  return c.json({
    status: expired ? "expired" : w.status, specialistName: w.specialist_name, scope: w.authorized_scope ?? [],
    clientName: (w.users as { full_name?: string } | null)?.full_name ?? "", signedAt: w.signed_at, signedName: w.signed_name,
  });
});

pub.post("/waiver/:token/sign", async (c) => {
  const w = await waiverByToken(c.req.param("token"));
  if (!w) return c.json({ error: "This waiver link isn't valid." }, 404);
  if (w.status !== "pending") return c.json({ error: w.status === "signed" ? "This waiver is already signed." : "This waiver link is no longer active." }, 409);
  if (!w.token_expires_at || new Date(w.token_expires_at).getTime() < Date.now()) return c.json({ error: "This waiver link has expired. Ask your specialist for a new one." }, 410);
  const body = await c.req.json().catch(() => ({})) as { signedName?: string; agree?: boolean; signature?: string };
  const name = String(body.signedName ?? "").trim();
  if (!body.agree) return c.json({ error: "Please confirm that you agree." }, 400);
  if (name.split(/\s+/).length < 2) return c.json({ error: "Type your full legal name to sign." }, 400);
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const { data, error } = await adminClient().from("wg_waivers").update({
    status: "signed", signed_at: new Date().toISOString(), signed_name: name.slice(0, 200), signer_ip: ip,
    signature_data: typeof body.signature === "string" && body.signature.startsWith("data:image/") ? body.signature.slice(0, 200_000) : name,
    token_hash: null,
  }).eq("id", w.id).eq("status", "pending").select("signed_at").maybeSingle();
  if (error || !data) return c.json({ error: error?.message ?? "Could not record the signature" }, 400);
  return c.json({ signed: true, signedAt: data.signed_at });
});

// GET /public/message/:token — a delivered Message to Loved Ones (050).
pub.get("/message/:token", async (c) => {
  const m = await openDeliveredMessage(c.req.param("token"));
  if (!m) return c.json({ error: "This message link isn't valid." }, 404);
  if (m.expired) return c.json({ error: "This message link has expired.", expired: true }, 410);
  return c.json(m);
});

pub.get("/plans", async (c) => {
  const { data, error } = await adminClient()
    .from("subscription_plans")
    .select("id, name, price_monthly, price_annual, storage_gb, max_contacts, overage_rate, billable")
    .eq("is_active", true)
    .order("price_monthly", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ plans: data });
});

// GET /public/billing/status — proves which Stripe mode the backend is in
// (and whether checkout is paused) without revealing any key. The cutover
// steps in GO_LIVE_CHECKLIST.md check livemode and billingPaused here.
pub.get("/billing/status", (c) => c.json(billingStatus()));

// GET /public/platform — maintenance mode and feature flags from System →
// Settings, for the customer-facing app to enforce (services/platform.ts).
pub.get("/platform", async (c) => {
  const [general, flags, { data: rows }, { data: products }] = await Promise.all([
    readPlatformSection("general"),
    readPlatformSection("flags"),
    adminClient().from("admin_settings").select("key, value")
      .in("key", ["starter_trial_days", "continuation_fee_amount", "continuation_fee_period_months"]),
    adminClient().from("billing_products").select("slug, amount_cents")
      .in("slug", ["wg_setup", "wg_session_block", "partner_setup", "dr_addon_month", "dr_addon_year"]),
  ]);
  // Prices as checkout charges them (Admin → Subscription Config), so the
  // landing page, help bot and add-on pages never quote a stale number.
  const cents = (slug: string) => {
    const v = products?.find((p: { slug: string }) => p.slug === slug)?.amount_cents;
    return typeof v === "number" ? v / 100 : null;
  };
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
    prices: {
      whiteGloveSetup: cents("wg_setup"), whiteGloveSession: cents("wg_session_block"),
      partnerSetup: cents("partner_setup"), drMonthly: cents("dr_addon_month"), drYearly: cents("dr_addon_year"),
    },
    // System → Settings → General: shown on the Contact page.
    support: {
      email: typeof general.supportEmail === "string" ? general.supportEmail : "",
      phone: typeof general.supportPhone === "string" ? general.supportPhone : "",
    },
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
    .select("id, name, email, role, status, invite_token_hash, invite_expires_at")
    .eq("id", id)
    .maybeSingle();
  // Only the hash is stored (054); compare in constant time.
  if (!data || data.status !== "invited" || !data.invite_token_hash) return null;
  if (!safeEqual(await sha256Hex(token), data.invite_token_hash)) return null;
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
    .update({ status: "active", user_id: account.id, invite_token: null, invite_token_hash: null, invite_expires_at: null })
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
// POST /public/wl-sales — a White Label enquiry from someone who isn't
// signed in. It is only a request: nothing is paid here (paid setups come
// from Stripe Checkout, routes/billing.ts wl_setup, migration 053). It used
// to record total_paid = the setup fee without any payment, and numbered
// rows count+1, which collided under concurrent submissions.
// POST /public/contact { category, name, email, phone?, subject, message, website? }
// The Contact Us form. Emails the department's mailbox (the sender's address
// is the reply-to) and keeps a copy in contact_messages (migration 055).
// The department is chosen from a fixed list here — the browser never picks
// an address. `website` is a honeypot: real people leave it empty.
const CONTACT_DEPARTMENTS: Record<string, string> = {
  "General": "contact@finalpassdown.com", "Information": "info@finalpassdown.com",
  "Support": MAILBOX.support, "Technical Support": "techsupport@finalpassdown.com",
  "Sales": "sales@finalpassdown.com", "Partnerships": "partnerships@finalpassdown.com",
  "Affiliates": "affiliates@finalpassdown.com", "Legacy Claims": MAILBOX.claims, "Verification": MAILBOX.verify,
};
pub.post("/contact", async (c) => {
  const b = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  if (str(b.website, 200)) return c.json({ sent: true });   // honeypot: pretend, store nothing
  const category = CONTACT_DEPARTMENTS[str(b.category, 40)] ? str(b.category, 40) : "General";
  const name = str(b.name, 120), email = str(b.email, 200).toLowerCase(), phone = str(b.phone, 40);
  const subject = str(b.subject, 200), message = str(b.message, 5000);
  if (!name || !subject || !message) return c.json({ error: "Please fill in your name, a subject and a message." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: "Enter a valid email address." }, 400);
  if (!EMAIL_CONFIGURED) return c.json({ error: "Messages can't be sent right now. Please email us directly." }, 503);

  const db = adminClient();
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count: byEmail }, { count: byIp }] = await Promise.all([
    db.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", hourAgo),
    ip ? db.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_address", ip).gte("created_at", hourAgo)
       : Promise.resolve({ count: 0 }),
  ]);
  if ((byEmail ?? 0) >= 3 || (byIp ?? 0) >= 5) {
    return c.json({ error: "You've sent several messages in the last hour. Please wait a little before sending another." }, 429);
  }

  const to = CONTACT_DEPARTMENTS[category];
  const { data: row, error } = await db.from("contact_messages")
    .insert({ category, name, email, phone: phone || null, subject, message, ip_address: ip, sent_to: to })
    .select("id").single();
  if (error) return c.json({ error: "Could not send your message. Please try again." }, 500);

  try {
    await sendEmail({
      to,
      ...noticeEmail({
        name: "team",
        heading: `Contact form (${category}): ${subject}`,
        paragraphs: [message, `From: ${name} <${email}>${phone ? ` · ${phone}` : ""}`, `Reference: ${row.id}`],
        replyTo: email,
        category: "contact-form",
      }),
    });
    await db.from("contact_messages").update({ delivered_at: new Date().toISOString() }).eq("id", row.id);
  } catch (err) {
    console.error("contact form email failed:", err);
    return c.json({ error: "Your message was saved but the email could not be sent. Please also email us directly." }, 502);
  }
  return c.json({ sent: true });
});

pub.post("/wl-sales", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { org, contact, email, packageId, subdomain, orgType, phone, website, why } = body;
  const opt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  if (!org?.trim() || !contact?.trim() || !email?.trim() || !packageId) {
    return c.json({ error: "'org', 'contact', 'email' and 'packageId' are required" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return c.json({ error: "Enter a valid email" }, 400);

  const db = adminClient();
  const { data: pkg } = await db.from("wl_packages").select("id").eq("id", packageId).maybeSingle();
  if (!pkg) return c.json({ error: "Unknown package" }, 400);

  // At most 3 enquiries per address per day.
  const { count } = await db.from("wl_sales").select("id", { count: "exact", head: true })
    .eq("email", String(email).trim().toLowerCase()).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 3) return c.json({ error: "We already have your request. Our team will be in touch." }, 429);

  const { data, error } = await db.from("wl_sales").insert({
    id: `WL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    org: String(org).trim().slice(0, 200), contact: String(contact).trim().slice(0, 200), email: String(email).trim().toLowerCase(),
    package_id: packageId, subdomain: subdomain ? String(subdomain).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60) : null,
    processor: null, total_paid: 0, status: "pending",
    org_type: opt(orgType, 40), contact_phone: opt(phone, 40), website: opt(website, 200), application_notes: opt(why, 2000),
  }).select().single();
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ sale: data }, 201);
});

// ── Stripe webhook ───────────────────────────────────────────────────────
// POST /public/stripe/webhook — see routes/stripeWebhook.ts.
pub.route("/stripe", stripeWebhook);

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
      "contact_id, secret_attempts, secret_verified_at, secret_locked_at, " +
      "owner:owner_user_id(full_name, plan), documents:legacy_claim_documents(doc_type, file_name)",
    )
    .eq("token", token)
    .maybeSingle();
}

// The owner's Preset Security Word / Security Question for this claimant
// (migration 047). Hashes never leave the database; this only says what to ask.
const SECRET_MAX_ATTEMPTS = 5;
async function claimSecurity(claim: { contact_id: string | null; secret_attempts: number; secret_verified_at: string | null; secret_locked_at: string | null }) {
  let word = false;
  let question: string | null = null;
  if (claim.contact_id) {
    const { data } = await adminClient()
      .from("contact_secrets")
      .select("methods, word_hash, question, answer_hash")
      .eq("contact_id", claim.contact_id)
      .maybeSingle();
    word = Boolean(data?.word_hash && data.methods?.includes("security_word"));
    question = data?.answer_hash && data.methods?.includes("security_qa") ? data.question : null;
  }
  const required = word || question !== null;
  return {
    required, word, question,
    passed: !required || Boolean(claim.secret_verified_at),
    locked: Boolean(claim.secret_locked_at),
    attemptsLeft: Math.max(0, SECRET_MAX_ATTEMPTS - claim.secret_attempts),
  };
}

// GET /public/legacy-claim/:token — what the portal pre-fills.
pub.get("/legacy-claim/:token", async (c) => {
  const { data: claim, error } = await claimByToken(c.req.param("token"));
  if (error) return c.json({ error: error.message }, 500);
  if (!claim) return c.json({ error: "This claim link is not valid. Please contact Final Pass Down for a new one." }, 404);
  if (new Date(claim.token_expires_at).getTime() < Date.now()) {
    return c.json({ error: "This claim link has expired. Please contact Final Pass Down for a new one." }, 410);
  }

  const { contact_id: _c, secret_attempts: _a, secret_verified_at: _v, secret_locked_at: _l, ...rest } = claim;
  return c.json({ claim: { ...rest, open: CLAIM_OPEN_STATUSES.includes(claim.status), security: await claimSecurity(claim) } });
});

// POST /public/legacy-claim/:token/verify { word, answer } — the claimant's
// answer to the owner's security word/question. Five wrong answers lock the
// claim until an admin issues a new link.
pub.post("/legacy-claim/:token/verify", async (c) => {
  const { data: claim, error } = await claimByToken(c.req.param("token"));
  if (error) return c.json({ error: error.message }, 500);
  if (!claim) return c.json({ error: "This claim link is not valid." }, 404);
  if (new Date(claim.token_expires_at).getTime() < Date.now()) return c.json({ error: "This claim link has expired." }, 410);
  if (!CLAIM_OPEN_STATUSES.includes(claim.status)) {
    return c.json({ error: "This claim has already been submitted and is with the review team." }, 409);
  }

  const { word, answer } = await c.req.json().catch(() => ({}));
  const db = adminClient();
  const { data: rows, error: rpcErr } = await db.rpc("check_claim_secret", {
    p_claim_id: claim.id, p_word: typeof word === "string" ? word : "", p_answer: typeof answer === "string" ? answer : "",
  });
  if (rpcErr) return c.json({ error: rpcErr.message }, 500);
  const result = (rows as { ok: boolean; attempts: number; locked: boolean }[] | null)?.[0];
  if (!result) return c.json({ error: "The security check could not be run. Please try again." }, 500);
  const attemptsLeft = Math.max(0, SECRET_MAX_ATTEMPTS - result.attempts);

  // Only the transition is logged: a repeat call on a passed or locked claim
  // returns the same answer without another event or email.
  if (result.ok && !claim.secret_verified_at) {
    await db.from("legacy_claim_events").insert({
      claim_id: claim.id, actor: claim.claimant_name, type: "claimant", event: "Claimant passed the owner's security word/question check",
    });
  } else if (!result.ok && !claim.secret_locked_at) {
    await db.from("legacy_claim_events").insert({
      claim_id: claim.id, actor: "System", type: "warn",
      event: result.locked
        ? `Security check locked after ${SECRET_MAX_ATTEMPTS} wrong answers — issue a new link to let the claimant try again`
        : `Wrong answer to the security check (${result.attempts} of ${SECRET_MAX_ATTEMPTS})`,
    });
    if (result.locked && EMAIL_CONFIGURED) {
      const owner = claim.owner as { full_name?: string } | null;
      await sendEmail({
        to: MAILBOX.claims,
        ...claimAlertEmail({
          title: `Claim ${claim.claim_ref} locked after failed security check`,
          lines: [
            `${claim.claimant_name} (${claim.claimant_email}) answered the security word/question wrong ${SECRET_MAX_ATTEMPTS} times on the claim for ${owner?.full_name ?? "an account holder"}'s account.`,
            "The claim portal is now locked for this link. Contact the claimant through a trusted channel before issuing a new link from Master Admin → Legacy Claims.",
          ],
        }),
      }).catch((err) => console.error("claim lock alert email failed:", err));
    }
  }

  return c.json({ ok: result.ok, locked: result.locked, attemptsLeft });
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
  const security = await claimSecurity(claim);
  if (security.locked) return c.json({ error: `This claim is locked. Please email ${MAILBOX.claims}.` }, 423);
  if (!security.passed) return c.json({ error: "Please answer the security check before submitting." }, 403);

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
    return c.json({ error: "Upload the end-of-life / incapacitation documents, or confirm you do not have them yet" }, 400);
  }

  const db = adminClient();
  const bucket = db.storage.from("legacy-claims");
  for (const { type, file } of files) {
    // Only a short alphanumeric extension from the claimant's filename is kept.
    const rawExt = file.name.includes(".") ? (file.name.split(".").pop() ?? "").toLowerCase() : "";
    const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : "bin";
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
