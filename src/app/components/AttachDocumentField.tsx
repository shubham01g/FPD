/**
 * AttachDocumentField — reusable compact doc attach widget for Add modals.
 * Combines file upload + camera scan in one line.
 * Shows a green confirmation when a file is attached.
 *
 * The chosen file is uploaded to the private `vault-documents` bucket
 * immediately and what comes back through onChange is the Storage PATH.
 * Previously this passed `file.name` and dropped the file itself, so a
 * record could claim an attachment that had never been stored anywhere
 * — and at six of its nine call sites the name was discarded too.
 *
 * Uploading on pick rather than on submit keeps the prop a plain string,
 * exactly as PhotoPicker does, so call sites stay simple. The same
 * trade-off applies: a file attached in a modal the user then cancels
 * stays in the bucket unreferenced, which is much better than deleting
 * the attachment of a record merely being edited.
 */
import React, { useRef, useState } from "react";
import { Upload, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { syncDocToFileCabinet, SECTION_FOLDER_MAP } from "../services/docSyncStore";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

/**
 * Recover something human-readable from a stored value.
 *
 * uploadVaultFile writes "{uid}/{uuid}-{original name}", so the name is
 * carried in the path itself and needs no extra column. Values saved
 * before this widget uploaded anything are bare filenames with no
 * prefix; those are returned untouched, which is what keeps existing
 * Warranties/Utilities/PersonalAssets rows readable.
 */
export function attachmentDisplayName(value: string | null | undefined): string {
  if (!value) return "";
  const m = value.match(
    /^[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  );
  return m ? m[1] : value;
}

interface AttachDocumentFieldProps {
  /** Storage path, or a legacy bare filename, or null. */
  value: string | null;
  onChange: (path: string | null) => void;
  folder?: string;          // File Cabinet folder id (e.g. "financial", "medical")
  sectionId?: string;       // docSyncStore section key for auto-sync
  sectionLabel?: string;    // Human label for the source section
  label?: string;
  accept?: string;
}

export function AttachDocumentField({
  value,
  onChange,
  folder = "legal",
  sectionId,
  sectionLabel = "Platform",
  label = "Attach Document (optional)",
  accept = ".pdf,.doc,.docx,image/*",
}: AttachDocumentFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { authUser } = useAuth();
  const [busy, setBusy] = useState(false);

  function autoSync(filename: string) {
    if (!sectionId) return;
    const folders = SECTION_FOLDER_MAP[sectionId];
    if (!folders?.length) return;
    // Auto-sync to the first (most relevant) folder for this section
    const { folderId, folderLabel } = folders[0];
    syncDocToFileCabinet({
      name: filename,
      sourceSection: sectionLabel,
      sourceSectionId: sectionId,
      targetFolder: folderLabel,
      targetFolderId: folderId,
      size: "—",
      type: filename.endsWith(".pdf") ? "PDF" : "Document",
    });
  }

  /* Shared by the upload button and the scanner, which also hands over a
     real File — so a scanned page is stored just like a picked one. */
  async function storeFile(file: File) {
    if (!authUser) { toast.error("Please sign in again before attaching a document."); return; }
    setBusy(true);
    try {
      const path = await db.uploadVaultFile(authUser.id, file);
      onChange(path);
      autoSync(file.name);
      toast.success(`"${file.name}" attached`);
    } catch (err) {
      toast.error(`Could not attach "${file.name}": ${(err as Error).message}`);
    }
    setBusy(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    void storeFile(file);
  }

  return (
    <div>
      <label style={{ color:"var(--muted-foreground)", fontSize:12.5, display:"block", marginBottom:6, fontFamily:"var(--font-mono)" }}>
        {label.toUpperCase()}
      </label>

      {value ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.25)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} color="#FFFFFF"/>
            <span style={{ color:"var(--foreground)", fontSize:16 }}>{attachmentDisplayName(value)}</span>
          </div>
          <button onClick={() => onChange(null)} style={{ color:"#FC8181" }}><X size={13}/></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
            style={{ border:"1px dashed rgba(91,110,225,0.3)", background:"rgba(91,110,225,0.03)", color:"var(--primary)", opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
            <Upload size={13}/> {busy ? "Uploading…" : "Upload File"}
          </button>
          <ScanButton
            folder={folder}
            onUpload={doc => { void storeFile(doc.file); }}
            size="sm"
            label="Scan"
          />
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile}/>
        </div>
      )}

      {!value && (
        <p style={{ color:"var(--muted-foreground)", fontSize:14, marginTop:5, lineHeight:1.5 }}>
          Upload or scan the actual document — automatically saved to the File Cabinet alongside this record.
        </p>
      )}
    </div>
  );
}
