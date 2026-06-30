import React, { useState, useRef, useEffect } from "react";
import { FolderOpen, ChevronDown, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { syncDocToFileCabinet, SECTION_FOLDER_MAP } from "../services/docSyncStore";

interface Props {
  docName: string;
  sectionId: string;
  sectionLabel: string;
  size?: string;
  type?: string;
}

export function SyncToFileCabinet({ docName, sectionId, sectionLabel, size="—", type="PDF" }: Props) {
  const [open, setOpen] = useState(false);
  const [synced, setSynced] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top:number; left:number }>({ top:0, left:0 });

  const folders = SECTION_FOLDER_MAP[sectionId] ?? [
    { folderId:"legal",   folderLabel:"Legal Documents" },
    { folderId:"personal",folderLabel:"Personal Letters & Messages" },
  ];

  // Position dropdown relative to button using getBoundingClientRect so it escapes overflow:hidden parents
  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleSync(folderId: string, folderLabel: string) {
    syncDocToFileCabinet({ name:docName, sourceSection:sectionLabel, sourceSectionId:sectionId, targetFolder:folderLabel, targetFolderId:folderId, size, type });
    setSynced(folderLabel);
    setOpen(false);
    toast.success(`"${docName.slice(0,40)}${docName.length>40?"…":""}" synced → ${folderLabel}`, { icon:"📁" });
  }

  if (synced) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold"
        style={{ background:"rgba(72,187,120,0.1)", color:"#48BB78", border:"1px solid rgba(72,187,120,0.2)" }}>
        <CheckCircle size={10}/> Synced → {synced}
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={openDropdown}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
        style={{ background:"rgba(32,64,192,0.07)", color:"var(--primary)", border:"1px solid rgba(32,64,192,0.18)" }}>
        <FolderOpen size={11}/>
        Sync to File Cabinet
        <ChevronDown size={10} style={{ transform:open?"rotate(180deg)":"none", transition:"transform 0.15s" }}/>
      </button>

      {open && (
        <div
          style={{
            position:"fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            minWidth: 220,
            background:"var(--card)",
            border:"1px solid var(--border)",
            borderRadius:12,
            boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
            overflow:"hidden",
          }}>
          <div className="px-3 py-2 border-b" style={{ borderColor:"var(--border)", background:"rgba(32,64,192,0.03)" }}>
            <div style={{ color:"var(--muted-foreground)", fontSize:9, fontFamily:"var(--font-mono)", letterSpacing:"0.08em" }}>SAVE TO FOLDER</div>
            <div style={{ color:"var(--foreground)", fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200 }}>
              {docName.length > 36 ? docName.slice(0,36)+"…" : docName}
            </div>
          </div>
          <div className="py-1">
            {folders.map(f => (
              <button key={f.folderId} onClick={() => handleSync(f.folderId, f.folderLabel)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-all"
                style={{ color:"var(--foreground)", background:"transparent" }}
                onMouseEnter={e => (e.currentTarget.style.background="rgba(32,64,192,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                <FolderOpen size={13} color="var(--primary)"/>
                <span style={{ fontSize:12 }}>{f.folderLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
