// Backs ContinuationFeeAdmin.tsx — the log of $199 Legacy Continuation Fee
// payments/activations, distinct from pricing.ts (plan pricing config).
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { EMAIL_CONFIGURED, accessLiveEmail, linkOrigin, sendEmail } from "../lib/email.ts";
import { contactAcceptPath, issueContactLink } from "../lib/contactLink.ts";

const subscriptions = new Hono();

// GET /admin/subscriptions?status=
subscriptions.get("/", async (c) => {
  const status = c.req.query("status");
  let q = adminClient()
    .from("legacy_continuation_fees")
    .select("*, users:user_id(email, full_name, plan)")
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);

  // A paid fee is "ready to activate" once a legacy claim on that account has
  // been approved (Master Admin → Legacy Claims).
  const { data: approved, error: claimErr } = await adminClient()
    .from("legacy_claims")
    .select("owner_user_id, death_cert_override")
    .eq("status", "approved");
  if (claimErr) return c.json({ error: claimErr.message }, 500);
  // owner → whether their approved claim still lacks the death certificate
  const approvedOwners = new Map((approved ?? []).map((r) => [r.owner_user_id, Boolean(r.death_cert_override)]));

  return c.json({
    fees: (data ?? []).map((f) => ({
      ...f,
      claim_approved: approvedOwners.has(f.user_id),
      death_cert_override: approvedOwners.get(f.user_id) ?? false,
    })),
  });
});

// POST /admin/subscriptions/:id/activate
// Marks a paid continuation fee as activated (user has passed) and computes
// expires_at from the admin-configured continuation_fee_period_months setting.
subscriptions.post("/:id/activate", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const { data: fee, error: feeErr } = await db.from("legacy_continuation_fees").select("*").eq("id", id).maybeSingle();
  if (feeErr) return c.json({ error: feeErr.message }, 500);
  if (!fee) return c.json({ error: "Fee record not found" }, 404);
  if (fee.status !== "paid") return c.json({ error: "Fee must be paid before it can be activated" }, 400);

  // The admin screen only offers Activate once a claim is approved; the
  // server holds the same line, because activation opens the Access Portal.
  const { data: claims, error: claimErr } = await db
    .from("legacy_claims")
    .select("contact_id, claimant_name, claimant_email")
    .eq("owner_user_id", fee.user_id)
    .eq("status", "approved");
  if (claimErr) return c.json({ error: claimErr.message }, 500);
  if (!claims?.length) return c.json({ error: "A legacy claim on this account must be approved before activation" }, 400);

  const { data: setting } = await db.from("admin_settings").select("value").eq("key", "continuation_fee_period_months").maybeSingle();
  const months = parseInt(setting?.value ?? "24", 10);
  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const { data, error } = await db
    .from("legacy_continuation_fees")
    .update({ activated_at: activatedAt.toISOString(), expires_at: expiresAt.toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  const mail = await emailAccessLive(db, c.req.header("origin"), fee.user_id, claims, expiresAt);
  return c.json({ fee: data, ...mail });
});

/** Tells each approved claimant the Legacy Vault is open. A contact already
 *  linked to a sign-in gets the portal link; anyone else gets a fresh accept
 *  link. Never throws — a failed send must not undo the activation. */
async function emailAccessLive(
  db: ReturnType<typeof adminClient>, origin: string | undefined, ownerId: string,
  claims: { contact_id: string | null; claimant_name: string; claimant_email: string }[], expiresAt: Date,
): Promise<{ emailed: number; emailErrors: string[] }> {
  const errors: string[] = [];
  if (!EMAIL_CONFIGURED) return { emailed: 0, emailErrors: ["Email sending is not set up"] };
  const { data: owner } = await db.from("users").select("full_name, email").eq("id", ownerId).maybeSingle();
  const ownerName = owner?.full_name || owner?.email || "the account holder";
  const base = linkOrigin(origin);
  const until = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  let emailed = 0;

  for (const claim of claims) {
    if (!claim.contact_id || !claim.claimant_email) { errors.push(`${claim.claimant_name}: no contact to link`); continue; }
    try {
      const { data: contact } = await db.from("contacts").select("contact_user_id").eq("id", claim.contact_id).maybeSingle();
      const needsAccept = !contact?.contact_user_id;
      const link = needsAccept ? `${base}${contactAcceptPath(await issueContactLink(db, claim.contact_id))}` : `${base}/access`;
      await sendEmail({
        to: claim.claimant_email,
        ...accessLiveEmail({ contactName: claim.claimant_name, ownerName, link, needsAccept, until }),
      });
      emailed++;
    } catch (err) {
      console.error("access live email failed:", err);
      errors.push(`${claim.claimant_name}: the email could not be sent`);
    }
  }
  return { emailed, emailErrors: errors };
}

export default subscriptions;
