/**
 * docSyncStore — shared bridge between sidebar sections and the Digital File Cabinet.
 * When a user clicks "Sync to File Cabinet" in any section, the document lands here.
 * The File Cabinet subscribes and renders synced docs alongside native uploads.
 */

export interface SyncedDoc {
  id: string;
  name: string;
  sourceSection: string;    // "Financial Records"
  sourceSectionId: string;  // "financial-records"
  targetFolder: string;     // "Insurance Policies"
  targetFolderId: string;   // "insurance"
  syncedAt: string;
  size: string;
  type: string;
}

/* ── Seed — pre-synced examples so the cabinet isn't empty ──────── */
let _docs: SyncedDoc[] = [
  { id:"SYNC-001", name:"MetLife Life Insurance Policy ML-88291-CA", sourceSection:"Financial Records", sourceSectionId:"financial-records", targetFolder:"Insurance Policies", targetFolderId:"insurance", syncedAt:"Jun 15, 2026", size:"1.2 MB", type:"PDF" },
  { id:"SYNC-002", name:"State Farm Homeowner's Policy SF-44821-CA", sourceSection:"Financial Records", sourceSectionId:"financial-records", targetFolder:"Insurance Policies", targetFolderId:"insurance", syncedAt:"Jun 15, 2026", size:"0.9 MB", type:"PDF" },
  { id:"SYNC-003", name:"2025 Federal Tax Return 1040", sourceSection:"Financial Records", sourceSectionId:"financial-records", targetFolder:"Tax Records", targetFolderId:"taxes", syncedAt:"Jun 20, 2026", size:"2.1 MB", type:"PDF" },
  { id:"SYNC-004", name:"1842 Oak Ridge Dr — Property Deed", sourceSection:"Financial Records", sourceSectionId:"financial-records", targetFolder:"Property & Real Estate", targetFolderId:"property", syncedAt:"Jun 18, 2026", size:"0.4 MB", type:"PDF" },
  { id:"SYNC-005", name:"Last Will & Testament — James William Doe", sourceSection:"Wills and Living Trusts", sourceSectionId:"wills-trusts", targetFolder:"Legal Documents", targetFolderId:"legal", syncedAt:"Jun 10, 2026", size:"0.8 MB", type:"PDF" },
  { id:"SYNC-006", name:"Blue Shield Health Insurance Card 2026", sourceSection:"Medical Info", sourceSectionId:"medical-info", targetFolder:"Medical Records", targetFolderId:"medical", syncedAt:"Jun 12, 2026", size:"0.1 MB", type:"Image" },
  { id:"SYNC-007", name:"Toyota Camry Title — VIN 4T1BZ1HK8MU024891", sourceSection:"Personal Assets", sourceSectionId:"personal-assets", targetFolder:"Vehicles", targetFolderId:"vehicles", syncedAt:"Jun 14, 2026", size:"0.3 MB", type:"PDF" },
];

/* ── Pub/sub ─────────────────────────────────────────────────────── */
type Listener = (docs: SyncedDoc[]) => void;
const _listeners = new Set<Listener>();
function notify() { _listeners.forEach(fn => fn([..._docs])); }

export function subscribeToSyncedDocs(fn: Listener): () => void {
  _listeners.add(fn);
  fn([..._docs]);
  return () => _listeners.delete(fn);
}

export function getSyncedDocsForFolder(folderId: string): SyncedDoc[] {
  return _docs.filter(d => d.targetFolderId === folderId);
}

export function syncDocToFileCabinet(doc: Omit<SyncedDoc,"id"|"syncedAt">): SyncedDoc {
  const synced: SyncedDoc = {
    ...doc,
    id: `SYNC-${Date.now().toString(36).toUpperCase()}`,
    syncedAt: new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }),
  };
  _docs = [synced, ..._docs];
  notify();
  return synced;
}

export function removeSyncedDoc(id: string): void {
  _docs = _docs.filter(d => d.id !== id);
  notify();
}

/* ── Which File Cabinet folders each section can sync to ─────────── */
// Folder IDs must exactly match the `id` fields in DigitalFileCabinet.tsx cabinets array
export const SECTION_FOLDER_MAP: Record<string, { folderId: string; folderLabel: string }[]> = {
  "financial-records": [
    { folderId:"insurance", folderLabel:"Insurance Policies" },
    { folderId:"financial", folderLabel:"Financial Records" },
    { folderId:"property",  folderLabel:"Property & Real Estate" },
    { folderId:"taxes",     folderLabel:"Tax Records" },
    { folderId:"legal",     folderLabel:"Legal Documents" },
  ],
  "medical-info": [
    { folderId:"medical",   folderLabel:"Medical Records" },
    { folderId:"insurance", folderLabel:"Insurance Policies" },
  ],
  "personal-assets": [
    { folderId:"vehicles",       folderLabel:"Vehicles" },
    { folderId:"property",       folderLabel:"Property & Real Estate" },
    { folderId:"utilities",      folderLabel:"Utilities & Services" },
    { folderId:"digital",        folderLabel:"Digital Assets" },
    { folderId:"legal",          folderLabel:"Legal Documents" },
  ],
  "weapons_locker": [
    { folderId:"weapons_locker", folderLabel:"Weapons Locker" },
    { folderId:"legal",          folderLabel:"Legal Documents" },
  ],
  "collectibles": [
    { folderId:"personal",       folderLabel:"Personal Letters & Messages" },
    { folderId:"photos",         folderLabel:"Photo Albums" },
    { folderId:"financial",      folderLabel:"Financial Records" },
  ],
  "wills-trusts": [
    { folderId:"legal",     folderLabel:"Legal Documents" },
  ],
  "job-history": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"financial", folderLabel:"Financial Records" },
    { folderId:"taxes",     folderLabel:"Tax Records" },
  ],
  "id-keeper": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"legal",     folderLabel:"Legal Documents" },
  ],
  "kids-activities": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"medical",   folderLabel:"Medical Records" },
  ],
  "daycare-info": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"medical",   folderLabel:"Medical Records" },
  ],
  "travel-planner": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"photos",    folderLabel:"Photo Albums" },
    { folderId:"legal",     folderLabel:"Legal Documents" },
  ],
  "final-wishes": [
    { folderId:"legal",     folderLabel:"Legal Documents" },
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
  ],
  "warranties": [
    { folderId:"warranties", folderLabel:"Warranties" },
    { folderId:"financial",  folderLabel:"Financial Records" },
  ],
  "collectibles": [
    { folderId:"personal",  folderLabel:"Personal Letters & Messages" },
    { folderId:"photos",    folderLabel:"Photo Albums" },
    { folderId:"financial", folderLabel:"Financial Records" },
  ],
};
