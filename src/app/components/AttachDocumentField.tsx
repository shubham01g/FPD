/**
 * AttachDocumentField — reusable compact doc attach widget for Add modals.
 * Combines file upload + camera scan in one line.
 * Shows a green confirmation when a file is attached.
 */
import React, { useRef } from "react";
import { Upload, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { syncDocToFileCabinet, SECTION_FOLDER_MAP } from "../services/docSyncStore";

interface AttachDocumentFieldProps {
  value: string | null;
  onChange: (filename: string | null) => void;
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file.name);
    autoSync(file.name);
    toast.success(`"${file.name}" attached & saved to File Cabinet`);
    e.target.value = "";
  }

  return (
    <div>
      <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:6, fontFamily:"var(--font-mono)" }}>
        {label.toUpperCase()}
      </label>

      {value ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background:"rgba(72,187,120,0.07)", border:"1px solid rgba(72,187,120,0.25)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={14} color="#48BB78"/>
            <span style={{ color:"var(--foreground)", fontSize:13 }}>{value}</span>
          </div>
          <button onClick={() => onChange(null)} style={{ color:"#FC8181" }}><X size={13}/></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
            style={{ border:"1px dashed rgba(58,91,217,0.3)", background:"rgba(58,91,217,0.03)", color:"var(--primary)" }}>
            <Upload size={13}/> Upload File
          </button>
          <ScanButton
            folder={folder}
            onUpload={doc => { onChange(doc.name); autoSync(doc.name); toast.success(`"${doc.name}" scanned & saved to File Cabinet`); }}
            size="sm"
            label="Scan"
          />
          <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={handleFile}/>
        </div>
      )}

      {!value && (
        <p style={{ color:"var(--muted-foreground)", fontSize:11, marginTop:5, lineHeight:1.5 }}>
          Upload or scan the actual document — automatically saved to the File Cabinet alongside this record.
        </p>
      )}
    </div>
  );
}
