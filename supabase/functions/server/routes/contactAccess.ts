// The Access Portal — what a Legacy or Guardian Contact sees of the accounts
// that named them (migration 046). Mounted at /account/access behind
// requireUser: the caller is the CONTACT, signed in with their own login.
//
//   GET  /invite/:token        can the signed-in user accept this invite?
//   POST /invite/:token        accept it: link the contact row to this login
//   GET  /owners               every account that named this login, and
//                              whether access is open yet
//   GET  /:ownerId/sections    the sections and document folders open to them
//   GET  /:ownerId/section/:key   that section's rows, read-only
//   GET  /:ownerId/documents   the documents open to them
//   GET  /:ownerId/documents/:docId/url[?download=1]   a short-lived signed URL
//
// Every data call re-checks the grant with the service role:
//   guardian  contact verified; only the folders in allowed_folder_ids
//             (lib/accessSections.ts maps folders to sections); view only,
//             never a download link
//   legacy    an approved claim on this contact AND a paid continuation fee
//             that an admin activated and that has not expired; everything
//
// Nothing here writes owner data. Encrypted vault fields come back as
// "encrypted" markers — the passphrase never leaves the owner's browser.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";
import { sha256Hex } from "../lib/contactLink.ts";
import { formatRow, ownerColumn, sectionsFor, type PortalRow } from "../lib/accessSections.ts";

const access = new Hono();

const VIEW_URL_SECONDS = 300;

type DB = ReturnType<typeof adminClient>;
type Kind = "legacy" | "guardian";
type Status = "active" | "awaiting_verification" | "awaiting_claim" | "awaiting_activation" | "expired" | "rejected";

interface Grant {
  contactId: string;
  ownerId: string;
  ownerName: string;
  kind: Kind;
  status: Status;
  folders: string[];
  expiresAt: string | null;
}

interface ContactRow {
  id: string; owner_user_id: string; contact_type: Kind; verification_status: string;
  allowed_folder_ids: string[] | null; owner: { full_name: string | null; email: string } | null;
}

/** Every grant this login holds, with its current status. */
async function grantsFor(db: DB, userId: string): Promise<Grant[]> {
  const { data: rows, error } = await db.from("contacts")
    .select("id, owner_user_id, contact_type, verification_status, allowed_folder_ids, owner:owner_user_id(full_name, email)")
    .eq("contact_user_id", userId)
    .in("contact_type", ["legacy", "guardian"])
    .returns<ContactRow[]>();
  if (error) throw error;
  const contacts = (rows ?? []).filter((r) => r.owner_user_id !== userId);
  if (!contacts.length) return [];

  const legacyIds = contacts.filter((r) => r.contact_type === "legacy").map((r) => r.id);
  const legacyOwners = [...new Set(contacts.filter((r) => r.contact_type === "legacy").map((r) => r.owner_user_id))];
  const [claims, fees] = await Promise.all([
    legacyIds.length
      ? db.from("legacy_claims").select("contact_id, status").in("contact_id", legacyIds)
      : Promise.resolve({ data: [] as { contact_id: string; status: string }[] }),
    legacyOwners.length
      ? db.from("legacy_continuation_fees").select("user_id, status, activated_at, expires_at")
        .in("user_id", legacyOwners).eq("status", "paid").not("activated_at", "is", null)
        .order("activated_at", { ascending: false })
      : Promise.resolve({ data: [] as { user_id: string; expires_at: string | null }[] }),
  ]);

  const now = Date.now();
  return contacts.map((r) => {
    const base = {
      contactId: r.id, ownerId: r.owner_user_id, kind: r.contact_type,
      ownerName: r.owner?.full_name || r.owner?.email || "A Final Pass Down member",
      folders: r.allowed_folder_ids ?? [], expiresAt: null as string | null,
    };
    if (r.contact_type === "guardian") {
      const status: Status = r.verification_status === "verified" ? "active"
        : r.verification_status === "rejected" ? "rejected" : "awaiting_verification";
      return { ...base, status };
    }
    const mine = (claims.data ?? []).filter((c) => c.contact_id === r.id);
    if (!mine.some((c) => c.status === "approved")) return { ...base, folders: [], status: "awaiting_claim" as Status };
    const fee = (fees.data ?? []).find((f) => f.user_id === r.owner_user_id);
    if (!fee) return { ...base, folders: [], status: "awaiting_activation" as Status };
    const expired = fee.expires_at !== null && new Date(fee.expires_at).getTime() <= now;
    return { ...base, folders: [], expiresAt: fee.expires_at, status: (expired ? "expired" : "active") as Status };
  });
}

/** The one open grant for this owner, preferring Legacy over Guardian. */
async function openGrant(db: DB, userId: string, ownerId: string): Promise<Grant | null> {
  const open = (await grantsFor(db, userId)).filter((g) => g.ownerId === ownerId && g.status === "active");
  return open.find((g) => g.kind === "legacy") ?? open[0] ?? null;
}

/** The owner's File Cabinet folders, for naming custom folders and for
 *  following a granted folder down into its subfolders. */
async function ownerFolders(db: DB, ownerId: string) {
  const { data } = await db.from("vault_folders").select("id, name, parent_id, parent_category").eq("user_id", ownerId);
  return (data ?? []) as { id: string; name: string; parent_id: string | null; parent_category: string | null }[];
}

/** Folder ids (built-in category ids and vault_folders ids) a Guardian may open. */
function expandFolders(granted: string[], folders: { id: string; parent_id: string | null; parent_category: string | null }[]): Set<string> {
  const open = new Set(granted);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (open.has(f.id)) continue;
      if ((f.parent_category && open.has(f.parent_category)) || (f.parent_id && open.has(f.parent_id))) {
        open.add(f.id);
        grew = true;
      }
    }
  }
  return open;
}

interface DocRow {
  id: string; name: string; description: string | null; category: string; folder_id: string | null;
  file_path: string; file_type: string; file_size_bytes: number; uploaded_at: string;
}

async function documentsFor(db: DB, grant: Grant): Promise<DocRow[]> {
  const { data, error } = await db.from("vault_documents")
    .select("id, name, description, category, folder_id, file_path, file_type, file_size_bytes, uploaded_at")
    .eq("user_id", grant.ownerId)
    .order("uploaded_at", { ascending: false })
    .returns<DocRow[]>();
  if (error) throw error;
  // The PIN-locked Secret Vault is the owner's alone: it is never shared with
  // a Legacy or Guardian contact (owner decision, 2026-11-10). Both the
  // category and the "<uid>/secret/" storage path count, as in
  // is_secret_vault_path() (migration 049).
  const shareable = (data ?? []).filter((d) => d.category !== "secret" && d.file_path.split("/")[1] !== "secret");
  if (grant.kind === "legacy") return shareable;
  const open = expandFolders(grant.folders, await ownerFolders(db, grant.ownerId));
  return shareable.filter((d) => open.has(d.category) || (d.folder_id !== null && open.has(d.folder_id)));
}

const notOpen = (c: { json: (b: unknown, s: number) => Response }) =>
  c.json({ error: "You don't have access to this account, or it isn't open yet." }, 403);

// ── Invite acceptance ───────────────────────────────────────────────────

type InviteProblem = "invalid" | "expired" | "own_account" | "linked_other";

async function inspectInvite(db: DB, token: string, user: AuthedUser) {
  if (!/^[0-9a-f]{64}$/.test(token)) return { row: null, problem: "invalid" as InviteProblem };
  const { data } = await db.from("contacts")
    .select("id, full_name, contact_type, owner_user_id, contact_user_id, invite_token_expires_at, owner:owner_user_id(full_name, email)")
    .eq("invite_token_hash", await sha256Hex(token))
    .in("contact_type", ["legacy", "guardian"])
    .maybeSingle<{
      id: string; full_name: string; contact_type: Kind; owner_user_id: string; contact_user_id: string | null;
      invite_token_expires_at: string | null; owner: { full_name: string | null; email: string } | null;
    }>();
  if (!data) return { row: null, problem: "invalid" as InviteProblem };
  if (data.owner_user_id === user.id) return { row: data, problem: "own_account" as InviteProblem };
  if (data.contact_user_id && data.contact_user_id !== user.id) return { row: data, problem: "linked_other" as InviteProblem };
  if (data.invite_token_expires_at && new Date(data.invite_token_expires_at).getTime() <= Date.now()) {
    return { row: data, problem: "expired" as InviteProblem };
  }
  return { row: data, problem: null };
}

access.get("/invite/:token", async (c) => {
  const user = c.get("user") as AuthedUser;
  const { row, problem } = await inspectInvite(adminClient(), c.req.param("token"), user);
  if (problem || !row) return c.json({ ok: false, problem: problem ?? "invalid" });
  return c.json({
    ok: true,
    kind: row.contact_type,
    contactName: row.full_name,
    ownerName: row.owner?.full_name || row.owner?.email || "A Final Pass Down member",
    alreadyAccepted: row.contact_user_id === user.id,
  });
});

access.post("/invite/:token", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();
  const { row, problem } = await inspectInvite(db, c.req.param("token"), user);
  if (problem || !row) return c.json({ ok: false, problem: problem ?? "invalid" }, 400);

  // Spend the link, and only if nobody else linked the row in the meantime.
  const { data: linked, error } = await db.from("contacts")
    .update({ contact_user_id: user.id, accepted_at: new Date().toISOString(), invite_token_hash: null, invite_token_expires_at: null })
    .eq("id", row.id)
    .or(`contact_user_id.is.null,contact_user_id.eq.${user.id}`)
    .select("id");
  if (error) return c.json({ error: error.message }, 500);
  if (!linked?.length) return c.json({ ok: false, problem: "linked_other" }, 400);
  return c.json({ ok: true });
});

// ── Portal ──────────────────────────────────────────────────────────────

access.get("/owners", async (c) => {
  const user = c.get("user") as AuthedUser;
  try {
    const grants = await grantsFor(adminClient(), user.id);
    return c.json({ owners: grants.map(({ contactId: _c, folders: _f, ...g }) => g) });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

access.get("/:ownerId/sections", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();
  const grant = await openGrant(db, user.id, c.req.param("ownerId"));
  if (!grant) return notOpen(c);

  const sections = sectionsFor(grant.kind, grant.folders).map((s) => ({ key: s.key, label: s.label }));
  return c.json({
    owner: { id: grant.ownerId, name: grant.ownerName },
    kind: grant.kind,
    expiresAt: grant.expiresAt,
    canDownload: grant.kind === "legacy",
    sections,
  });
});

access.get("/:ownerId/section/:key", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();
  const grant = await openGrant(db, user.id, c.req.param("ownerId"));
  if (!grant) return notOpen(c);
  const spec = sectionsFor(grant.kind, grant.folders).find((s) => s.key === c.req.param("key"));
  if (!spec) return notOpen(c);

  const groups: { label: string; rows: PortalRow[] }[] = [];
  for (const t of spec.tables) {
    let q = db.from(t.table).select("*").eq(ownerColumn(t.table), grant.ownerId);
    if (t.only) q = q.in(t.only.column, t.only.values);
    const { data, error } = await q;
    // A table this deployment doesn't have yet is skipped, not fatal.
    if (error) { console.error(`access: ${t.table}`, error.message); continue; }
    const rows = ((data ?? []) as Record<string, unknown>[])
      .filter((r) => !t.hide?.(r))
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .map((r) => formatRow(r, grant.ownerId, t.label));
    if (rows.length) groups.push({ label: t.label, rows });
  }

  // One signing request for every photo in the section.
  const paths = [...new Set(groups.flatMap((g) => g.rows.flatMap((r) => r.photoPaths)))];
  const photos: Record<string, string> = {};
  if (paths.length) {
    const { data } = await db.storage.from("record-photos").createSignedUrls(paths, VIEW_URL_SECONDS * 12);
    for (const s of data ?? []) if (s.path && s.signedUrl) photos[s.path] = s.signedUrl;
  }

  return c.json({
    section: { key: spec.key, label: spec.label },
    groups: groups.map((g) => ({
      label: g.label,
      rows: g.rows.map(({ photoPaths, ...r }) => ({ ...r, photos: photoPaths.map((p) => photos[p]).filter(Boolean) })),
    })),
  });
});

access.get("/:ownerId/documents", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();
  const grant = await openGrant(db, user.id, c.req.param("ownerId"));
  if (!grant) return notOpen(c);
  const [docs, folders] = await Promise.all([documentsFor(db, grant), ownerFolders(db, grant.ownerId)]);
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  return c.json({
    documents: docs.map((d) => ({
      id: d.id, name: d.name, description: d.description, fileType: d.file_type,
      sizeBytes: d.file_size_bytes, uploadedAt: d.uploaded_at,
      folder: (d.folder_id && folderName.get(d.folder_id)) || d.category,
    })),
  });
});

access.get("/:ownerId/documents/:docId/url", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();
  const grant = await openGrant(db, user.id, c.req.param("ownerId"));
  if (!grant) return notOpen(c);
  const doc = (await documentsFor(db, grant)).find((d) => d.id === c.req.param("docId"));
  if (!doc) return notOpen(c);

  // Guardians are view-only: never a Content-Disposition: attachment link.
  const download = c.req.query("download") === "1" && grant.kind === "legacy";
  const { data, error } = await db.storage.from("vault-documents")
    .createSignedUrl(doc.file_path, VIEW_URL_SECONDS, download ? { download: doc.name } : undefined);
  if (error || !data) return c.json({ error: "The document could not be opened." }, 500);
  return c.json({ url: data.signedUrl, expiresIn: VIEW_URL_SECONDS });
});

export default access;
