// POST /account/receipts/email-package — "Email to CPA" on the Receipts page.
//
//   { email, year, month (1-12), section ("personal"|"business"),
//     includeCSV, includeImages }
//
// Sends that month's receipts to the address given: a CSV attachment and
// signed links (7 days) to the receipt images. The screen used to wait 1.2 s
// and say "Package Sent!" without sending anything.
//
// At most 5 packages per account per hour (counted in audit_logs), so the
// route can't be used to send mail in bulk.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, receiptPackageEmail, sendEmail } from "../lib/email.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

const receipts = new Hono();

const LINK_DAYS = 7;
const MAX_PER_HOUR = 5;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

receipts.post("/email-package", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);
  const body = await c.req.json().catch(() => ({})) as {
    email?: string; year?: number; month?: number; section?: string; includeCSV?: boolean; includeImages?: boolean;
  };
  const to = String(body.email ?? "").trim();
  const year = Number(body.year);
  const month = Number(body.month);
  const section = body.section === "business" ? "business" : "personal";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return c.json({ error: "Enter a valid email address" }, 400);
  if (!Number.isInteger(year) || year < 1900 || year > 3000 || !Number.isInteger(month) || month < 1 || month > 12) {
    return c.json({ error: "Invalid month" }, 400);
  }
  const includeCSV = body.includeCSV !== false;
  const includeImages = body.includeImages !== false;
  if (!includeCSV && !includeImages) return c.json({ error: "Choose the CSV, the images, or both" }, 400);

  const db = adminClient();
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("audit_logs").select("id", { count: "exact", head: true })
    .eq("actor_id", user.id).eq("action", "receipts.email_package").gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_PER_HOUR) return c.json({ error: "You've sent several packages in the last hour. Try again later." }, 429);

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const { data: rows, error } = await db.from("receipts")
    .select("merchant, amount, receipt_date, category, tax_year, tax_deductible, image_url")
    .eq("user_id", user.id).eq("section", section).gte("receipt_date", start).lt("receipt_date", end)
    .order("receipt_date");
  if (error) return c.json({ error: error.message }, 500);
  if (!rows?.length) return c.json({ error: "There are no receipts in that month to send." }, 400);

  const { data: owner } = await db.from("users").select("full_name").eq("id", user.id).maybeSingle();
  const period = `${MONTHS[month - 1]} ${year}`;
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const images: { label: string; url: string }[] = [];
  if (includeImages) {
    for (const r of rows) {
      const path = String(r.image_url ?? "");
      // Only stored paths; old rows may hold dead blob: URLs.
      if (!path || /^(blob:|data:|https?:)/.test(path) || !path.startsWith(`${user.id}/`)) continue;
      const { data } = await db.storage.from("vault-documents").createSignedUrl(path, LINK_DAYS * 86_400);
      if (data?.signedUrl) images.push({ label: `${r.receipt_date} · ${r.merchant} · $${Number(r.amount).toFixed(2)}`, url: data.signedUrl });
    }
  }

  const attachments = includeCSV ? [{
    filename: `receipts-${section}-${year}-${String(month).padStart(2, "0")}.csv`,
    type: "text/csv",
    content: b64([
      "Date,Merchant,Amount,Category,Tax year,Tax deductible",
      ...rows.map((r) => [r.receipt_date, r.merchant, Number(r.amount).toFixed(2), r.category, r.tax_year, r.tax_deductible ? "yes" : "no"].map(csvCell).join(",")),
    ].join("\r\n")),
  }] : undefined;

  try {
    await sendEmail({
      to,
      ...receiptPackageEmail({
        ownerName: owner?.full_name ?? "", ownerEmail: user.email, period, count: rows.length,
        total: `$${total.toFixed(2)}`, images, linkDays: LINK_DAYS, csvAttached: includeCSV,
      }),
      attachments,
    });
  } catch (err) {
    console.error("receipt package email failed:", err);
    return c.json({ error: "The email could not be sent. Try again in a few minutes." }, 502);
  }

  await db.from("audit_logs").insert({
    actor_id: user.id, actor_email: user.email, action: "receipts.email_package",
    target_type: "receipts", target_id: `${year}-${month}`, severity: "info",
    metadata: { to, count: rows.length, images: images.length, csv: includeCSV },
  });

  return c.json({ sent: true, count: rows.length, images: images.length });
});

export default receipts;
