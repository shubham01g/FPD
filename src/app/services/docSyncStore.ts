/**
 * Which Digital File Cabinet folder each sidebar section files its
 * attachments into (AttachDocumentField's auto-sync, which creates a real
 * vault_documents row; see DemoContext.linkStoredDoc).
 *
 * This file used to also hold an in-memory list of "synced" documents,
 * seeded with seven sample documents ("Last Will & Testament — James
 * William Doe" and so on) that showed in every account's File Cabinet and
 * vanished on refresh. That list is gone.
 */

/* ── Which File Cabinet folders each section can sync to ─────────── */
// Folder IDs must exactly match the `id` fields in DigitalFileCabinet.tsx cabinets array
export const SECTION_FOLDER_MAP: Record<string, { folderId: string; folderLabel: string }[]> = {
  "insurance-policies": [
    { folderId:"insurance", folderLabel:"Insurance Policies" },
    { folderId:"financial", folderLabel:"Financial Records" },
  ],
  "financial-records": [
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
    { folderId:"digital",        folderLabel:"Digital Assets" },
    { folderId:"legal",          folderLabel:"Legal Documents" },
  ],
  "utilities": [
    { folderId:"utilities",      folderLabel:"Utilities & Services" },
    { folderId:"financial",      folderLabel:"Financial Records" },
  ],
  "pet-records": [
    { folderId:"pets",           folderLabel:"Pet Records" },
    { folderId:"medical",        folderLabel:"Medical Records" },
  ],
  "family-memories": [
    { folderId:"personal",       folderLabel:"Personal Letters & Messages" },
    { folderId:"photos",         folderLabel:"Photo Albums" },
  ],
  "weapons_locker": [
    { folderId:"weapons_locker", folderLabel:"Weapons Locker" },
    { folderId:"legal",          folderLabel:"Legal Documents" },
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
