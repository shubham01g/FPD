/**
 * Attachment fields for Add/Edit modals: upload a file or scan one, and get
 * back the Storage PATH in the private `vault-documents` bucket.
 *
 *  - AttachDocumentField   one document  (value: path | null)
 *  - AttachDocumentsList   several       (value: path[])
 *
 * The file is uploaded the moment it is picked (after the storage-quota
 * check) and also filed in the Digital File Cabinet as a linked
 * vault_documents row, so deleting it from the cabinet never removes a file
 * a record still uses. Uploading on pick keeps the props plain strings, as
 * PhotoPicker does; a file attached in a modal that is then cancelled stays
 * in the bucket unreferenced, which beats losing the attachment of a record
 * that was only being edited.
 */
import React, { useRef, useState } from "react";
import { Upload, CheckCircle, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { ScanButton, cabinetFolder } from "./DocumentScanner";
import { useDemo } from "../context/DemoContext";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { openStoredFile } from "../services/storedFiles";
import { checkUpload, showQuotaRefusal } from "../utils/storageQuota";

/**
 * Recover something human-readable from a stored value.
 *
 * uploadVaultFile writes "{uid}/{uuid}-{original name}", so the name is
 * carried in the path itself and needs no extra column. Values saved
 * before this widget uploaded anything are bare filenames with no
 * prefix; those are returned untouched, which keeps old rows readable.
 */
export function attachmentDisplayName(value: string | null | undefined): string {
  if (!value) return "";
  const m = value.match(
    /^[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  );
  return m ? m[1] : value;
}

const fileTypeOf = (file: File) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? "pdf"
    : file.type.startsWith("image/") ? "image" : "doc";

/**
 * Upload one file and file it in the cabinet. Resolves to the Storage path,
 * or null after telling the user why it failed.
 */
export function useAttachUpload(folder: string | undefined, sectionLabel: string) {
  const { authUser } = useAuth();
  const { linkStoredDoc } = useDemo();
  const [busy, setBusy] = useState(false);

  async function store(file: File): Promise<string | null> {
    if (!authUser) { toast.error("Please sign in again before attaching a document."); return null; }
    setBusy(true);
    try {
      const quota = await checkUpload(file.size);
      if (quota && !quota.allowed) { showQuotaRefusal(quota.reason); return null; }
      const path = await db.uploadVaultFile(authUser.id, file);
      try {
        await linkStoredDoc({
          path, name: file.name, sizeBytes: file.size, fileType: fileTypeOf(file),
          category: cabinetFolder(folder), sourceSection: sectionLabel,
        });
      } catch {
        // The attachment itself is saved; only the cabinet copy failed.
        toast.message(`"${file.name}" is attached, but couldn't also be filed in the File Cabinet.`);
      }
      return path;
    } catch (err) {
      toast.error(`Could not attach "${file.name}": ${(err as Error).message}`);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { store, busy };
}

const LABEL_STYLE: React.CSSProperties = { color:"var(--muted-foreground)", fontSize:12.5, display:"block", marginBottom:6, fontFamily:"var(--font-mono)" };
const HINT_STYLE: React.CSSProperties = { color:"var(--muted-foreground)", fontSize:14, marginTop:5, lineHeight:1.5 };
const HINT = "Upload or scan the actual document — it is also filed in the File Cabinet.";

function PickButtons({ busy, accept, folder, onFile }: { busy: boolean; accept: string; folder?: string; onFile: (f: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
        style={{ border:"1px dashed rgba(91,110,225,0.3)", background:"rgba(91,110,225,0.03)", color:"var(--primary)", opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
        <Upload size={13}/> {busy ? "Uploading…" : "Upload File"}
      </button>
      {/* The scanner hands back the File; this field stores it like a picked one. */}
      <ScanButton folder={folder} onUpload={doc => onFile(doc.file)} size="sm" label="Scan"/>
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        e.target.value = ""; // let the same file be re-picked after an error
        if (file) onFile(file);
      }}/>
    </div>
  );
}

function AttachedChip({ value, onRemove }: { value: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.25)" }}>
      <button type="button" className="flex items-center gap-2" onClick={() => void openStoredFile(value, attachmentDisplayName(value))}
        style={{ background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}>
        <CheckCircle size={14} color="#FFFFFF"/>
        <span style={{ color:"var(--foreground)", fontSize:16 }}>{attachmentDisplayName(value)}</span>
      </button>
      <button type="button" title="Remove from this record" onClick={onRemove} style={{ color:"#FC8181" }}><X size={13}/></button>
    </div>
  );
}

interface AttachDocumentFieldProps {
  /** Storage path, or a legacy bare filename, or null. */
  value: string | null;
  onChange: (path: string | null) => void;
  folder?: string;          // File Cabinet folder id (e.g. "financial", "medical")
  sectionId?: string;       // kept for callers; filing now follows `folder`
  sectionLabel?: string;    // Human label for the source section
  label?: string;
  accept?: string;
}

export function AttachDocumentField({
  value, onChange, folder = "personal", sectionLabel = "Platform",
  label = "Attach Document (optional)", accept = ".pdf,.doc,.docx,image/*",
}: AttachDocumentFieldProps) {
  const { store, busy } = useAttachUpload(folder, sectionLabel);
  async function onFile(file: File) {
    const path = await store(file);
    if (path) { onChange(path); toast.success(`"${file.name}" attached`); }
  }
  return (
    <div>
      <label style={LABEL_STYLE}>{label.toUpperCase()}</label>
      {value
        ? <AttachedChip value={value} onRemove={() => onChange(null)}/>
        : <PickButtons busy={busy} accept={accept} folder={folder} onFile={f => void onFile(f)}/>}
      {!value && <p style={HINT_STYLE}>{HINT}</p>}
    </div>
  );
}

interface AttachDocumentsListProps {
  value: string[];
  onChange: (paths: string[]) => void;
  folder?: string;
  sectionLabel?: string;
  label?: string;
  accept?: string;
}

/** Several documents on one record (document_urls TEXT[] columns). */
export function AttachDocumentsList({
  value, onChange, folder = "personal", sectionLabel = "Platform",
  label = "Attach Documents (optional)", accept = ".pdf,.doc,.docx,image/*",
}: AttachDocumentsListProps) {
  const { store, busy } = useAttachUpload(folder, sectionLabel);
  async function onFile(file: File) {
    const path = await store(file);
    if (path) { onChange([...value.filter(v => v !== path), path]); toast.success(`"${file.name}" attached`); }
  }
  return (
    <div>
      <label style={LABEL_STYLE}>{label.toUpperCase()}</label>
      {value.length > 0 && (
        <div className="flex flex-col gap-2" style={{ marginBottom: 8 }}>
          {value.map(v => <AttachedChip key={v} value={v} onRemove={() => onChange(value.filter(x => x !== v))}/>)}
        </div>
      )}
      <PickButtons busy={busy} accept={accept} folder={folder} onFile={f => void onFile(f)}/>
      {value.length === 0 && <p style={HINT_STYLE}>{HINT}</p>}
    </div>
  );
}

/** Read-only chips that open stored files, for record cards. */
export function AttachmentChips({ paths }: { paths: string[] | null | undefined }) {
  if (!paths?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
      {paths.map(p => (
        <button key={p} type="button" onClick={() => void openStoredFile(p, attachmentDisplayName(p))}
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background:"rgba(91,110,225,0.1)", color:"#6E90C9", fontSize:13, border:"none", cursor:"pointer" }}>
          <FileText size={12}/> {attachmentDisplayName(p)}
        </button>
      ))}
    </div>
  );
}
