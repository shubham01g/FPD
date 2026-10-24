import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { BILLING_CHANGED, notifyBillingChanged } from "../services/billing";
import { quotaReasonFromError, showQuotaRefusal } from "../utils/storageQuota";
import { useAuth } from "./AuthContext";
import {
  db, supabase, tables, type DBUser, type DBDocument, type DBContact, type DBIdVerification,
  type DBFinalWish, type DBAllergy, type DBMedication, type DBReminder, type DBMemory, type DBOccasion,
  type DBFuneralPlan, type DBEmergencyInfo, type DBVaultFolder,
} from "../services/supabase";

/* ─── Types ─────────────────────────────────────────────────────── */
export interface Doc {
  id: string; name: string; category: string; size: number; sizeUnit: "MB"|"GB";
  uploaded: string; type: string; status: "verified"|"pending"|"rejected"; encrypted: boolean;
  /* Raw upload timestamp (ISO). `uploaded` is display text; this is what
     usage-over-time is derived from — see utils/storageBreakdown.ts. */
  uploadedAt: string;
  /* Storage path in the private vault-documents bucket. Needed to actually
     preview/download the file — see rowToDoc. */
  filePath: string;
  /* Which sub-folder (set of documents) inside its folder, by name. */
  subCategory?: string;
  /* Set when the doc lives in a user-created folder (category "custom"). */
  folderId?: string;
}
/* A user-created folder or sub-folder — see DBVaultFolder. */
export interface VaultFolder {
  id: string; name: string; description: string;
  parentId: string | null; parentCategory: string | null;
  color: string; createdAt: string;
}
export interface Contact {
  id: string; type: "legacy"|"guardian"|"emergency"|"pet_emergency";
  name: string; relationship: string; email: string; phone: string;
  verificationStatus: "verified"|"pending"|"not_sent"|"rejected"; accessLevel?: string; notes?: string; avatar: string; photo?: string;
  allowedFolderIds?: string[];
  idVerificationStatus?: "pending"|"approved"|"rejected" | null;
  idRejectionReason?: string | null;
}
export interface FinalWish {
  id: string; category: string; item: string; recipient: string; notes: string;
}
export interface Allergy {
  id: string; allergen: string; severity: "severe"|"moderate"|"mild"; reaction: string; type: string; diagnosed: string;
  documentUrls?: string[];
}
export interface Medication {
  id: string; name: string; dose: string; frequency: string; condition: string; prescriber: string; pharmacy: string; refillDate: string;
  documentUrls?: string[];
}
export interface Reminder {
  id: string; title: string; dueDate: string; frequency: string; category: string; status: "upcoming"|"due_soon"|"overdue"|"completed"; notes: string;
}
export interface Memory {
  id: string; title: string; date: string;
  type: "photo"|"video"|"note"|"audio"|"message"|"keepsake"|"goal"|"award";
  description: string; tags: string[];
  recipient?: string; mediaUrl?: string; achieved?: boolean; issuer?: string; childName?: string;
}
export interface Occasion {
  id: string; name: string; date: string; type: "birthday"|"anniversary"|"holiday"; recipient: string; notes: string; recurring: boolean;
}
export interface FuneralPlan {
  serviceType: string; location: string; preferredDate: string; budget: string; prearranged: boolean;
  music: string[]; readings: string[]; flowers: string; reception: string; obituaryDraft: string; specialRequests: string;
  /* Personal questions (migration 032) */
  disposition: "" | "burial" | "cremation"; religiousBeliefs: string; proposedBurialSite: string;
  prearrangedBurialSite: string; ashesWishes: string; burialCoveredByInsurance: boolean | null;
  attireForMe: string; itemsToTake: string; attireForAttendees: string; pallbearers: string[];
  finalPrayerOrSpeech: string; celebrationLocation: string; finalWords: string;
  gravestoneInscription: string; lifeRegrets: string;
}
export interface EmergencyInfo {
  bloodType: string; height: string; weight: string; primaryLanguage: string; codeStatus: string;
  dnr: boolean; organDonor: boolean; advanceDirective: boolean;
  conditions: string[];
  primaryDoctor: { name: string; specialty: string; phone: string; address: string };
  hospital: { name: string; phone: string };
  pharmacy: { name: string; phone: string };
  insurance: { carrier: string; policyNum: string; groupNum: string; memberId: string };
}
export interface Notification {
  id: string; title: string; message: string; type: "info"|"warning"|"success"|"error"; time: string; read: boolean;
}
export interface UserProfile {
  name: string; email: string; phone: string;
  plan: "starter"|"foundation"|"family_archive"|"legacy_pro"|"legacy_vault";
  storageUsed: number; storageLimit: number; avatar: string;
  /* When the 14-day Starter clock started (migration 026); null if the
     account has never been on Starter. See utils/starterPlan.ts. */
  starterStartedAt: string | null;
  /* Set once an admin marks the account holder deceased (migration 027);
     the portal is frozen from then on. */
  deceasedAt: string | null;
  /** Suspended by an admin (Master Admin → Users). Stored as plan_status "paused". */
  suspended: boolean;
  /** Set by billing: past_due while a failed renewal is retried, cancelled
   *  once a paid plan has ended (the portal then offers Reactivate). */
  planStatus: "active" | "paused" | "cancelled" | "past_due";
  /* Demographics (migration 020) — feed the admin Analytics tab. Blank for
     any account that hasn't filled them in; editable in Account Settings. */
  gender: string; birthdate: string; country: string; referralSource: string;
}

/* Fallback only; the real allowances are read from subscription_plans. */
const PLAN_STORAGE_GB: Record<UserProfile["plan"], number> = {
  starter: 1, foundation: 50, family_archive: 250, legacy_pro: 500, legacy_vault: 1024,
};

const EMPTY_USER: UserProfile = {
  name: "", email: "", phone: "", plan: "foundation", storageUsed: 0, storageLimit: 50, avatar: "",
  starterStartedAt: null, deceasedAt: null, suspended: false, planStatus: "active",
  gender: "", birthdate: "", country: "", referralSource: "",
};

const EMPTY_FUNERAL_PLAN: FuneralPlan = {
  serviceType: "", location: "", preferredDate: "", budget: "", prearranged: false,
  music: [], readings: [], flowers: "", reception: "", obituaryDraft: "", specialRequests: "",
  disposition: "", religiousBeliefs: "", proposedBurialSite: "", prearrangedBurialSite: "", ashesWishes: "",
  burialCoveredByInsurance: null, attireForMe: "", itemsToTake: "", attireForAttendees: "", pallbearers: [],
  finalPrayerOrSpeech: "", celebrationLocation: "", finalWords: "", gravestoneInscription: "", lifeRegrets: "",
};

const EMPTY_EMERGENCY_INFO: EmergencyInfo = {
  bloodType: "", height: "", weight: "", primaryLanguage: "", codeStatus: "",
  dnr: false, organDonor: false, advanceDirective: false, conditions: [],
  primaryDoctor: { name: "", specialty: "", phone: "", address: "" },
  hospital: { name: "", phone: "" },
  pharmacy: { name: "", phone: "" },
  insurance: { carrier: "", policyNum: "", groupNum: "", memberId: "" },
};

/* ─── Mappers: DB rows (canonical) <-> frontend shapes ─────────────── */
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "?";
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins===1?"":"s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs===1?"":"s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days===1?"":"s"} ago`;
  return formatDate(iso);
}

/* Bytes a document counts for (from its rounded display size). */
function docBytes(d: Doc): number {
  return d.size * (d.sizeUnit === "GB" ? 1024 ** 3 : 1024 ** 2);
}

function rowToDoc(row: DBDocument): Doc {
  const mb = row.file_size_bytes / (1024 * 1024);
  const useGb = mb >= 1024;
  return {
    id: row.id, name: row.name, category: row.category,
    size: Number((useGb ? mb / 1024 : mb).toFixed(1)), sizeUnit: useGb ? "GB" : "MB",
    uploaded: formatDate(row.uploaded_at), uploadedAt: row.uploaded_at, type: row.file_type,
    status: row.status, encrypted: row.is_encrypted, filePath: row.file_path,
    subCategory: row.sub_category ?? undefined, folderId: row.folder_id ?? undefined,
  };
}

function rowToFolder(row: DBVaultFolder): VaultFolder {
  return {
    id: row.id, name: row.name, description: row.description ?? "",
    parentId: row.parent_id ?? null, parentCategory: row.parent_category ?? null,
    color: row.color ?? "#5B6EE1", createdAt: row.created_at,
  };
}

function rowToContact(row: DBContact, latestIdv?: DBIdVerification): Contact {
  return {
    id: row.id, type: row.contact_type, name: row.full_name, relationship: row.relationship,
    email: row.email, phone: row.phone ?? "", verificationStatus: row.verification_status,
    accessLevel: row.access_level, notes: row.notes, avatar: initials(row.full_name),
    photo: row.photo_url ?? undefined,
    allowedFolderIds: row.allowed_folder_ids ?? [],
    idVerificationStatus: latestIdv?.status ?? null,
    idRejectionReason: latestIdv?.rejection_reason ?? null,
  };
}

interface DBNotificationRow { id: string; title: string; message: string; type: Notification["type"]; read: boolean; created_at: string; }

const rowToWish = (r: DBFinalWish): FinalWish => ({ id: r.id, category: r.category, item: r.item, recipient: r.recipient ?? "", notes: r.notes ?? "" });
const rowToAllergy = (r: DBAllergy): Allergy => ({ id: r.id, allergen: r.allergen, severity: r.severity, reaction: r.reaction ?? "", type: r.type ?? "", diagnosed: r.diagnosed ?? "", documentUrls: r.document_urls ?? [] });
const rowToMed = (r: DBMedication): Medication => ({ id: r.id, name: r.name, dose: r.dose ?? "", frequency: r.frequency ?? "", condition: r.condition ?? "", prescriber: r.prescriber ?? "", pharmacy: r.pharmacy ?? "", refillDate: r.refill_date ?? "", documentUrls: r.document_urls ?? [] });
const rowToReminder = (r: DBReminder): Reminder => ({ id: r.id, title: r.title, dueDate: r.due_date ?? "", frequency: r.frequency ?? "", category: r.category ?? "", status: r.status, notes: r.notes ?? "" });
const rowToMemory = (r: DBMemory): Memory => ({
  id: r.id, title: r.title, date: r.memory_date ?? "", type: r.type, description: r.description ?? "", tags: r.tags ?? [],
  recipient: r.recipient ?? undefined, mediaUrl: r.media_url ?? undefined, achieved: r.achieved ?? undefined,
  issuer: r.issuer ?? undefined, childName: r.child_name ?? undefined,
});
const rowToOccasion = (r: DBOccasion): Occasion => ({ id: r.id, name: r.name, date: r.occasion_date ?? "", type: r.type, recipient: r.recipient ?? "", notes: r.notes ?? "", recurring: r.recurring });
const rowToNotif = (r: DBNotificationRow): Notification => ({ id: r.id, title: r.title, message: r.message, type: r.type, time: timeAgo(r.created_at), read: r.read });
const rowToFuneralPlan = (r: DBFuneralPlan): FuneralPlan => ({
  serviceType: r.service_type ?? "", location: r.location ?? "", preferredDate: r.preferred_date ?? "",
  budget: r.budget != null ? String(r.budget) : "", prearranged: r.prearranged,
  music: r.music ?? [], readings: r.readings ?? [], flowers: r.flowers ?? "", reception: r.reception ?? "",
  obituaryDraft: r.obituary_draft ?? "", specialRequests: r.special_requests ?? "",
  disposition: r.disposition ?? "", religiousBeliefs: r.religious_beliefs ?? "", proposedBurialSite: r.proposed_burial_site ?? "",
  prearrangedBurialSite: r.prearranged_burial_site ?? "", ashesWishes: r.ashes_wishes ?? "",
  burialCoveredByInsurance: r.burial_covered_by_insurance ?? null, attireForMe: r.attire_for_me ?? "",
  itemsToTake: r.items_to_take ?? "", attireForAttendees: r.attire_for_attendees ?? "", pallbearers: r.pallbearers ?? [],
  finalPrayerOrSpeech: r.final_prayer_or_speech ?? "", celebrationLocation: r.celebration_location ?? "",
  finalWords: r.final_words ?? "", gravestoneInscription: r.gravestone_inscription ?? "", lifeRegrets: r.life_regrets ?? "",
});
const rowToEmergencyInfo = (r: DBEmergencyInfo): EmergencyInfo => ({
  bloodType: r.blood_type ?? "", height: r.height ?? "", weight: r.weight ?? "", primaryLanguage: r.primary_language ?? "",
  codeStatus: r.code_status ?? "", dnr: r.dnr, organDonor: r.organ_donor, advanceDirective: r.advance_directive,
  conditions: r.conditions ?? [],
  primaryDoctor: { name: r.primary_doctor_name ?? "", specialty: r.primary_doctor_specialty ?? "", phone: r.primary_doctor_phone ?? "", address: r.primary_doctor_address ?? "" },
  hospital: { name: r.hospital_name ?? "", phone: r.hospital_phone ?? "" },
  pharmacy: { name: r.pharmacy_name ?? "", phone: r.pharmacy_phone ?? "" },
  insurance: { carrier: r.insurance_carrier ?? "", policyNum: r.insurance_policy_number ?? "", groupNum: r.insurance_group_number ?? "", memberId: r.insurance_member_id ?? "" },
});

/* ─── Context ───────────────────────────────────────────────────── */
interface DemoCtx {
  user: UserProfile;
  continuationFeePaid: boolean;
  setContinuationFeePaid: (paid: boolean) => void;
  deathVerified: boolean;
  deathVerifiedDoc: string | null;
  submitDeathRecord: (docName: string) => void;
  docs: Doc[];
  folders: VaultFolder[];
  contacts: Contact[];
  wishes: FinalWish[];
  allergies: Allergy[];
  medications: Medication[];
  reminders: Reminder[];
  memories: Memory[];
  occasions: Occasion[];
  notifications: Notification[];
  funeralPlan: FuneralPlan;
  emergencyInfo: EmergencyInfo;
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  /** Re-reads the account's plan and billing status (after a purchase, a
   *  plan change or a cancellation). Plans only change through billing. */
  refreshUser: () => Promise<void>;
  addDoc: (doc: Omit<Doc,"id"|"uploaded"|"uploadedAt"|"filePath">, file?: File) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  addFolder: (f: { name: string; description?: string; parentId?: string | null; parentCategory?: string | null; color?: string }) => Promise<VaultFolder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  /** Refuses (resolves false) while any document is still filed in the folder or its sub-folders. */
  deleteFolder: (id: string) => Promise<boolean>;
  /* One-shot handoff so another page (Folders & Reminders) can open the File
     Cabinet straight onto a folder. The cabinet consumes and clears it. */
  pendingFolderId: string | null;
  setPendingFolderId: (id: string | null) => void;
  addContact: (c: Omit<Contact,"id">, opts?: { invite?: boolean }) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContact: (id: string, updates: Partial<Omit<Contact,"id">>) => Promise<void>;
  sendVerificationInvite: (id: string) => Promise<void>;
  submitIdVerification: (contactId: string, file: File, idType: string) => Promise<void>;
  updateGuardianFolders: (id: string, folderIds: string[]) => Promise<void>;
  addWish: (w: Omit<FinalWish,"id">) => Promise<void>;
  updateWish: (id: string, w: Omit<FinalWish,"id">) => Promise<void>;
  removeWish: (id: string) => Promise<void>;
  addAllergy: (a: Omit<Allergy,"id">) => Promise<void>;
  removeAllergy: (id: string) => Promise<void>;
  updateAllergy: (id: string, a: Omit<Allergy,"id">) => Promise<void>;
  addMedication: (m: Omit<Medication,"id">) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  updateMedication: (id: string, m: Omit<Medication,"id">) => Promise<void>;
  addReminder: (r: Omit<Reminder,"id">) => Promise<void>;
  completeReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  addMemory: (m: Omit<Memory,"id">) => Promise<void>;
  updateMemory: (id: string, m: Partial<Omit<Memory,"id">>) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  addOccasion: (o: Omit<Occasion,"id">) => Promise<void>;
  saveFuneralPlan: (data: FuneralPlan) => Promise<void>;
  saveEmergencyInfo: (data: EmergencyInfo) => Promise<void>;
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const DemoContext = createContext<DemoCtx | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();
  const uid = authUser?.id ?? null;

  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [wishes, setWishes] = useState<FinalWish[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMeds] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [notifications, setNotifs] = useState<Notification[]>([]);
  const [funeralPlan, setFuneralPlan] = useState<FuneralPlan>(EMPTY_FUNERAL_PLAN);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo>(EMPTY_EMERGENCY_INFO);
  const [continuationFeePaid, setContinuationFeePaid] = useState(false);
  const [deathVerifiedDoc, setDeathVerifiedDoc] = useState<string | null>(null);
  /* Storage allowance per plan, from subscription_plans. */
  const planGb = useRef<Record<string, number>>({ ...PLAN_STORAGE_GB });

  /* Load everything for the signed-in user, and keep notifications live. */
  useEffect(() => {
    if (!uid) {
      setUser(EMPTY_USER); setDocs([]); setFolders([]); setContacts([]); setWishes([]); setAllergies([]);
      setMeds([]); setReminders([]); setMemories([]); setOccasions([]); setNotifs([]);
      setFuneralPlan(EMPTY_FUNERAL_PLAN); setEmergencyInfo(EMPTY_EMERGENCY_INFO);
      return;
    }

    let cancelled = false;
    (async () => {
      const [
        userRes, docsRes, contactsRes, idvRes, wishesRes, allergiesRes,
        medsRes, remindersRes, memoriesRes, occasionsRes, notifsRes,
        feeRes, funeralPlanRes, emergencyInfoRes, foldersRes, plansRes,
      ] = await Promise.all([
        db.getUser(uid),
        db.listDocuments(uid),
        db.listContacts(uid),
        db.listIdVerificationsForOwner(uid),
        db.listFinalWishes(uid),
        db.listAllergies(uid),
        db.listMedications(uid),
        db.listReminders(uid),
        db.listMemories(uid),
        db.listOccasions(uid),
        db.listNotifications(uid),
        db.getContinuationFee(uid),
        db.getFuneralPlan(uid),
        db.getEmergencyInfo(uid),
        tables.vaultFolders.list(uid),
        supabase.from("subscription_plans").select("id, storage_gb"),
      ]);
      if (cancelled) return;
      for (const p of (plansRes.data ?? []) as { id: string; storage_gb: number }[]) planGb.current[p.id] = p.storage_gb;

      if (userRes.data) {
        const used = (docsRes.data ?? []).reduce((sum, d) => sum + d.file_size_bytes, 0) / (1024 ** 3);
        setUser({
          name: userRes.data.full_name, email: userRes.data.email, phone: userRes.data.phone ?? "",
          plan: userRes.data.plan, storageUsed: Number(used.toFixed(2)), storageLimit: planGb.current[userRes.data.plan] ?? PLAN_STORAGE_GB[userRes.data.plan],
          avatar: initials(userRes.data.full_name),
          starterStartedAt: userRes.data.starter_started_at ?? null,
          deceasedAt: userRes.data.deceased_at ?? null,
          suspended: userRes.data.plan_status === "paused",
          planStatus: userRes.data.plan_status,
          gender: userRes.data.gender ?? "", birthdate: userRes.data.birthdate ?? "",
          country: userRes.data.country ?? "", referralSource: userRes.data.referral_source ?? "",
        });
      }
      setDocs((docsRes.data ?? []).map(rowToDoc));
      // Oldest first so folders keep the order they were created in.
      setFolders((foldersRes.data ?? []).map(rowToFolder).reverse());
      // idvRes is ordered submitted_at desc, so the first match per contact_id is the latest.
      const latestIdvByContact = new Map<string, DBIdVerification>();
      for (const v of idvRes.data ?? []) if (!latestIdvByContact.has(v.contact_id)) latestIdvByContact.set(v.contact_id, v);
      setContacts((contactsRes.data ?? []).map(row => rowToContact(row, latestIdvByContact.get(row.id))));
      setWishes((wishesRes.data ?? []).map(rowToWish));
      setAllergies((allergiesRes.data ?? []).map(rowToAllergy));
      setMeds((medsRes.data ?? []).map(rowToMed));
      setReminders((remindersRes.data ?? []).map(rowToReminder));
      setMemories((memoriesRes.data ?? []).map(rowToMemory));
      setOccasions((occasionsRes.data ?? []).map(rowToOccasion));
      setNotifs(((notifsRes.data ?? []) as DBNotificationRow[]).map(rowToNotif));
      setContinuationFeePaid(!!feeRes.data);
      setFuneralPlan(funeralPlanRes.data ? rowToFuneralPlan(funeralPlanRes.data) : EMPTY_FUNERAL_PLAN);
      setEmergencyInfo(emergencyInfoRes.data ? rowToEmergencyInfo(emergencyInfoRes.data) : EMPTY_EMERGENCY_INFO);
    })();

    const channel = db.subscribeToNotifications(uid, () => {
      db.listNotifications(uid).then(res => {
        if (!cancelled) setNotifs(((res.data ?? []) as DBNotificationRow[]).map(rowToNotif));
      });
    });

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [uid]);

  const submitDeathRecord = useCallback((docName: string) => {
    setDeathVerifiedDoc(docName);
    toast.success(`"${docName}" accepted — confirmation of passing verified`);
  }, []);

  /* User */
  const updateUser = useCallback(async (data: Partial<UserProfile>) => {
    if (!uid) return;
    const tid = toast.loading("Saving profile...");
    const { error } = await db.updateUser(uid, {
      full_name: data.name, phone: data.phone,
      gender: (data.gender as DBUser["gender"]) || null,
      birthdate: data.birthdate || null,
      country: data.country || null,
      referral_source: data.referralSource || null,
    });
    if (error) { toast.error("Could not save profile", { id: tid }); return; }
    setUser(u => ({ ...u, ...data, plan: u.plan }));
    toast.success("Profile updated", { id: tid });
  }, [uid]);

  /* Plans change only through billing (Stripe Checkout, plan changes, the
     webhook), so after any of those the account row is simply re-read. */
  const refreshUser = useCallback(async () => {
    if (!uid) return;
    const { data } = await db.getUser(uid);
    if (!data) return;
    setUser(u => ({
      ...u, plan: data.plan, planStatus: data.plan_status, suspended: data.plan_status === "paused",
      storageLimit: planGb.current[data.plan] ?? PLAN_STORAGE_GB[data.plan],
      starterStartedAt: data.starter_started_at ?? null,
    }));
  }, [uid]);

  useEffect(() => {
    const on = () => void refreshUser();
    window.addEventListener(BILLING_CHANGED, on);
    return () => window.removeEventListener(BILLING_CHANGED, on);
  }, [refreshUser]);

  /* Docs */
  const addDoc = useCallback(async (doc: Omit<Doc,"id"|"uploaded"|"uploadedAt"|"filePath">, file?: File) => {
    if (!uid) return;
    const tid = toast.loading("Uploading document...");
    let uploadedPath: string | null = null;
    try {
      if (file) uploadedPath = await db.uploadVaultFile(uid, file);
      const filePath = uploadedPath ?? `${uid}/manual-${Date.now()}-${doc.name}`;
      const fileSizeBytes = file ? file.size : Math.round(doc.size * (doc.sizeUnit === "GB" ? 1024 ** 3 : 1024 ** 2));
      const { data, error } = await db.uploadDocument({
        user_id: uid, name: doc.name, category: doc.category, file_path: filePath,
        sub_category: doc.subCategory, folder_id: doc.folderId,
        file_size_bytes: fileSizeBytes, file_type: doc.type, is_encrypted: doc.encrypted,
        status: doc.status === "rejected" ? "pending" : doc.status, starred: false, locked: false, tags: [], metadata: {},
      });
      if (error || !data) throw error;
      setDocs(d => [rowToDoc(data), ...d]);
      // The database measured the stored file; count what it recorded.
      setUser(u => ({ ...u, storageUsed: Number((u.storageUsed + data.file_size_bytes / 1024 ** 3).toFixed(2)) }));
      notifyBillingChanged();
      toast.success("Document uploaded & encrypted", { id: tid });
    } catch (err) {
      // The row was refused, so don't leave the stored file behind.
      if (uploadedPath) await db.removeVaultFile(uploadedPath).catch(() => undefined);
      const reason = quotaReasonFromError(err);
      if (reason) { toast.dismiss(tid); showQuotaRefusal(reason); }
      else toast.error("Could not upload document", { id: tid });
    }
  }, [uid]);

  const deleteDoc = useCallback(async (id: string) => {
    const tid = toast.loading("Deleting document...");
    const doc = docs.find(x => x.id === id);
    const { error } = await db.deleteDocument(id);
    if (error) { toast.error("Could not delete document", { id: tid }); return; }
    // The stored file goes too — storage you've deleted shouldn't count.
    if (doc?.filePath && !doc.filePath.includes("/manual-")) await db.removeVaultFile(doc.filePath).catch(() => undefined);
    setDocs(d => d.filter(x => x.id !== id));
    if (doc) setUser(u => ({ ...u, storageUsed: Math.max(0, Number((u.storageUsed - docBytes(doc) / 1024 ** 3).toFixed(2))) }));
    notifyBillingChanged();
    toast.success("Document permanently deleted", { id: tid });
  }, [docs]);

  /* Folders */
  const addFolder = useCallback(async (f: { name: string; description?: string; parentId?: string | null; parentCategory?: string | null; color?: string }) => {
    if (!uid) return null;
    const name = f.name.trim();
    const { data, error } = await tables.vaultFolders.add(uid, {
      name, description: f.description?.trim() || null,
      parent_id: f.parentId ?? null, parent_category: f.parentCategory ?? null,
      ...(f.color ? { color: f.color } : {}),
    });
    if (error || !data) {
      // 23505 = the unique (place, name) index from migration 033.
      toast.error(error?.code === "23505" ? `A folder named "${name}" already exists here` : "Could not create folder");
      return null;
    }
    const folder = rowToFolder(data);
    setFolders(prev => [...prev, folder]);
    toast.success(`"${name}" created`);
    return folder;
  }, [uid]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const old = folders.find(x => x.id === id);
    const trimmed = name.trim();
    if (!old || !trimmed || trimmed === old.name) return;
    const { data, error } = await tables.vaultFolders.update(id, { name: trimmed });
    if (error || !data) {
      toast.error(error?.code === "23505" ? `A folder named "${trimmed}" already exists here` : "Could not rename folder");
      return;
    }
    setFolders(prev => prev.map(x => x.id === id ? rowToFolder(data) : x));
    // Docs in a sub-folder reference it by name, so carry them over.
    if (old.parentId || old.parentCategory) {
      const moved = docs.filter(d => d.subCategory === old.name &&
        (old.parentId ? d.folderId === old.parentId : d.category === old.parentCategory && !d.folderId));
      if (moved.length) {
        const { error: docErr } = await supabase.from("vault_documents")
          .update({ sub_category: trimmed }).in("id", moved.map(d => d.id));
        if (docErr) { toast.error("Folder renamed, but its documents could not be moved"); return; }
        const ids = new Set(moved.map(d => d.id));
        setDocs(prev => prev.map(d => ids.has(d.id) ? { ...d, subCategory: trimmed } : d));
      }
    }
    toast.success(`Renamed to "${trimmed}"`);
  }, [folders, docs]);

  const deleteFolder = useCallback(async (id: string) => {
    const f = folders.find(x => x.id === id);
    if (!f) return false;
    const childIds = new Set(folders.filter(x => x.parentId === id).map(x => x.id));
    const inUse = docs.some(d =>
      d.folderId === id || (d.folderId && childIds.has(d.folderId)) ||
      (f.parentId && d.folderId === f.parentId && d.subCategory === f.name) ||
      (f.parentCategory && !d.folderId && d.category === f.parentCategory && d.subCategory === f.name));
    if (inUse) { toast.error(`"${f.name}" still has documents — move or delete them first`); return false; }
    const { error } = await tables.vaultFolders.remove(id);
    if (error) { toast.error("Could not delete folder"); return false; }
    // parent_id cascades in the database; mirror that here.
    setFolders(prev => prev.filter(x => x.id !== id && x.parentId !== id));
    toast.success(`"${f.name}" deleted`);
    return true;
  }, [folders, docs]);

  /* Contacts */
  const addContact = useCallback(async (c: Omit<Contact,"id">, opts?: { invite?: boolean }) => {
    if (!uid) return;
    const tid = toast.loading("Adding contact...");
    const { data, error } = await db.addContact({
      owner_user_id: uid, full_name: c.name, email: c.email, phone: c.phone, relationship: c.relationship,
      contact_type: c.type, verification_status: c.verificationStatus, access_level: c.accessLevel,
      notes: c.notes, allowed_folder_ids: c.allowedFolderIds ?? [], photo_url: c.photo ?? null,
    });
    if (error || !data) { toast.error("Could not add contact", { id: tid }); return; }
    setContacts(prev => [rowToContact(data), ...prev]);
    // Only Legacy and Guardian Contacts are emailed, and never on a bulk
    // import — that would mail a whole address book in one click.
    const invitable = c.type === "legacy" || c.type === "guardian";
    if (!invitable || opts?.invite === false || !c.email) { toast.success("Contact added", { id: tid }); return; }
    const sent = await db.sendContactInvite(data.id);
    if (sent.error) toast.error(`Contact added, but the invite email was not sent: ${sent.error}`, { id: tid });
    else {
      setContacts(prev => prev.map(x => x.id === data.id ? { ...x, verificationStatus: sent.verificationStatus ?? x.verificationStatus } : x));
      toast.success(`Invite emailed to ${c.email}`, { id: tid });
    }
  }, [uid]);

  const removeContact = useCallback(async (id: string) => {
    const tid = toast.loading("Removing contact...");
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) { toast.error("Could not remove contact", { id: tid }); return; }
    setContacts(c => c.filter(x => x.id !== id));
    toast.success("Contact removed", { id: tid });
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<Omit<Contact,"id">>) => {
    const tid = toast.loading("Saving contact...");
    const { data, error } = await db.updateContact(id, {
      full_name: updates.name, email: updates.email, phone: updates.phone, relationship: updates.relationship,
      access_level: updates.accessLevel, notes: updates.notes,
      // Only sent when the edit actually touched the photo — spreading an
      // undefined would blank the column on every other kind of save.
      ...(updates.photo === undefined ? {} : { photo_url: updates.photo ?? null }),
    });
    if (error || !data) { toast.error("Could not save contact", { id: tid }); return; }
    // Merge only the edited fields — rowToContact would also reset idVerificationStatus/
    // idRejectionReason to null since `data` here has no joined id_verifications row.
    setContacts(c => c.map(x => x.id === id ? {
      ...x, name: data.full_name, email: data.email, phone: data.phone ?? "", relationship: data.relationship,
      accessLevel: data.access_level, notes: data.notes, avatar: initials(data.full_name),
      photo: data.photo_url ?? undefined,
    } : x));
    toast.success("Contact updated", { id: tid });
  }, []);

  const sendVerificationInvite = useCallback(async (id: string) => {
    const tid = toast.loading("Sending verification invite...");
    const { error, verificationStatus } = await db.sendContactInvite(id);
    if (error) { toast.error(`Invite not sent: ${error}`, { id: tid }); return; }
    setContacts(c => c.map(x => x.id === id ? { ...x, verificationStatus: verificationStatus ?? x.verificationStatus } : x));
    toast.success("Invite email sent", { id: tid });
  }, []);

  const submitIdVerification = useCallback(async (contactId: string, file: File, idType: string) => {
    if (!uid) return;
    const tid = toast.loading("Uploading ID document...");
    try {
      const path = await db.uploadIdDocument(uid, contactId, file);
      await db.submitIdVerification(contactId, path, idType);
      setContacts(c => c.map(x => x.id === contactId ? { ...x, idVerificationStatus: "pending", idRejectionReason: null } : x));
      toast.success("ID submitted — pending compliance review (1–2 days)", { id: tid });
    } catch {
      toast.error("Could not submit ID document", { id: tid });
    }
  }, [uid]);

  const updateGuardianFolders = useCallback(async (id: string, folderIds: string[]) => {
    const tid = toast.loading("Updating folder access...");
    const { error } = await db.updateGuardianFolderAccess(id, folderIds);
    if (error) { toast.error("Could not update folder access", { id: tid }); return; }
    setContacts(c => c.map(x => x.id === id ? { ...x, allowedFolderIds: folderIds } : x));
    toast.success("Folder access updated", { id: tid });
  }, []);

  /* Final Wishes */
  const addWish = useCallback(async (w: Omit<FinalWish,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving final wish...");
    const { data, error } = await db.addFinalWish({ user_id: uid, category: w.category, item: w.item, recipient: w.recipient, notes: w.notes });
    if (error || !data) { toast.error("Could not save wish", { id: tid }); return; }
    setWishes(prev => [rowToWish(data), ...prev]);
    toast.success("Final wish saved to vault", { id: tid });
  }, [uid]);

  const updateWish = useCallback(async (id: string, w: Omit<FinalWish,"id">) => {
    const { data, error } = await db.updateFinalWish(id, { category: w.category, item: w.item, recipient: w.recipient, notes: w.notes });
    if (error || !data) { toast.error("Could not update wish"); return; }
    setWishes(prev => prev.map(x => x.id === id ? rowToWish(data) : x));
    toast.success("Wish updated");
  }, []);

  const removeWish = useCallback(async (id: string) => {
    const { error } = await db.deleteFinalWish(id);
    if (error) { toast.error("Could not remove wish"); return; }
    setWishes(w => w.filter(x => x.id !== id));
    toast.success("Final wish removed");
  }, []);

  /* Medical */
  const addAllergy = useCallback(async (a: Omit<Allergy,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving allergy...");
    const { data, error } = await db.addAllergy({ user_id: uid, allergen: a.allergen, severity: a.severity, reaction: a.reaction, type: a.type, diagnosed: a.diagnosed, document_urls: a.documentUrls ?? [] });
    if (error || !data) { toast.error("Could not save allergy", { id: tid }); return; }
    setAllergies(prev => [rowToAllergy(data), ...prev]);
    toast.success("Allergy record saved", { id: tid });
  }, [uid]);

  const removeAllergy = useCallback(async (id: string) => {
    const { error } = await db.deleteAllergy(id);
    if (error) { toast.error("Could not remove allergy"); return; }
    setAllergies(a => a.filter(x => x.id !== id));
    toast.success("Allergy removed");
  }, []);

  const updateAllergy = useCallback(async (id: string, a: Omit<Allergy,"id">) => {
    const { data, error } = await db.updateAllergy(id, {
      allergen: a.allergen, severity: a.severity, reaction: a.reaction,
      type: a.type, diagnosed: a.diagnosed, document_urls: a.documentUrls ?? [],
    });
    if (error || !data) { toast.error("Could not update allergy"); return; }
    setAllergies(prev => prev.map(x => x.id === id ? rowToAllergy(data) : x));
  }, []);

  const addMedication = useCallback(async (m: Omit<Medication,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving medication...");
    const { data, error } = await db.addMedication({ user_id: uid, name: m.name, dose: m.dose, frequency: m.frequency, condition: m.condition, prescriber: m.prescriber, pharmacy: m.pharmacy, refill_date: m.refillDate, document_urls: m.documentUrls ?? [] });
    if (error || !data) { toast.error("Could not save medication", { id: tid }); return; }
    setMeds(prev => [rowToMed(data), ...prev]);
    toast.success("Medication record saved", { id: tid });
  }, [uid]);

  const removeMedication = useCallback(async (id: string) => {
    const { error } = await db.deleteMedication(id);
    if (error) { toast.error("Could not remove medication"); return; }
    setMeds(m => m.filter(x => x.id !== id));
    toast.success("Medication removed");
  }, []);

  const updateMedication = useCallback(async (id: string, m: Omit<Medication,"id">) => {
    const { data, error } = await db.updateMedication(id, { name: m.name, dose: m.dose, frequency: m.frequency, condition: m.condition, prescriber: m.prescriber, pharmacy: m.pharmacy, refill_date: m.refillDate, document_urls: m.documentUrls ?? [] });
    if (error || !data) { toast.error("Could not update medication"); return; }
    setMeds(prev => prev.map(x => x.id === id ? rowToMed(data) : x));
  }, []);

  /* Reminders */
  const addReminder = useCallback(async (r: Omit<Reminder,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Creating reminder...");
    const { data, error } = await db.addReminder({ user_id: uid, title: r.title, due_date: r.dueDate, frequency: r.frequency, category: r.category, status: r.status, notes: r.notes });
    if (error || !data) { toast.error("Could not create reminder", { id: tid }); return; }
    setReminders(prev => [rowToReminder(data), ...prev]);
    toast.success("Reminder created", { id: tid });
  }, [uid]);

  const completeReminder = useCallback((id: string) => {
    db.updateReminder(id, { status: "completed" });
    setReminders(r => r.map(x => x.id === id ? { ...x, status:"completed" } : x));
    toast.success("Reminder marked complete");
  }, []);

  const removeReminder = useCallback((id: string) => {
    db.deleteReminder(id);
    setReminders(r => r.filter(x => x.id !== id));
    toast.success("Reminder deleted");
  }, []);

  /* Memories */
  const addMemory = useCallback(async (m: Omit<Memory,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving memory...");
    const { data, error } = await db.addMemory({
      user_id: uid, title: m.title, memory_date: m.date, type: m.type, description: m.description, tags: m.tags,
      recipient: m.recipient, media_url: m.mediaUrl, achieved: m.achieved, issuer: m.issuer, child_name: m.childName,
    });
    if (error || !data) { toast.error("Could not save memory", { id: tid }); return; }
    setMemories(prev => [rowToMemory(data), ...prev]);
    toast.success("Memory saved to vault", { id: tid });
  }, [uid]);

  const updateMemory = useCallback(async (id: string, m: Partial<Omit<Memory,"id">>) => {
    const { data, error } = await db.updateMemory(id, {
      title: m.title, memory_date: m.date, type: m.type, description: m.description, tags: m.tags,
      recipient: m.recipient, media_url: m.mediaUrl, achieved: m.achieved, issuer: m.issuer, child_name: m.childName,
    });
    if (error || !data) { toast.error("Could not update memory"); return; }
    setMemories(prev => prev.map(x => x.id === id ? rowToMemory(data) : x));
  }, []);

  const removeMemory = useCallback(async (id: string) => {
    const { error } = await db.deleteMemory(id);
    if (error) { toast.error("Could not remove memory"); return; }
    setMemories(m => m.filter(x => x.id !== id));
    toast.success("Memory removed");
  }, []);

  /* Occasions */
  const addOccasion = useCallback(async (o: Omit<Occasion,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving occasion...");
    const { data, error } = await db.addOccasion({ user_id: uid, name: o.name, occasion_date: o.date, type: o.type, recipient: o.recipient, notes: o.notes, recurring: o.recurring });
    if (error || !data) { toast.error("Could not save occasion", { id: tid }); return; }
    setOccasions(prev => [rowToOccasion(data), ...prev]);
    toast.success("Occasion saved", { id: tid });
  }, [uid]);

  /* Funeral plan (one row per user) */
  const saveFuneralPlan = useCallback(async (data: FuneralPlan) => {
    if (!uid) return;
    const tid = toast.loading("Saving funeral plan...");
    const { data: row, error } = await db.saveFuneralPlan(uid, {
      service_type: data.serviceType, location: data.location, preferred_date: data.preferredDate,
      budget: data.budget ? Number(data.budget) : null, prearranged: data.prearranged,
      music: data.music, readings: data.readings, flowers: data.flowers, reception: data.reception,
      obituary_draft: data.obituaryDraft, special_requests: data.specialRequests,
      disposition: data.disposition || null, religious_beliefs: data.religiousBeliefs,
      proposed_burial_site: data.proposedBurialSite, prearranged_burial_site: data.prearrangedBurialSite,
      ashes_wishes: data.ashesWishes, burial_covered_by_insurance: data.burialCoveredByInsurance,
      attire_for_me: data.attireForMe, items_to_take: data.itemsToTake, attire_for_attendees: data.attireForAttendees,
      pallbearers: data.pallbearers, final_prayer_or_speech: data.finalPrayerOrSpeech,
      celebration_location: data.celebrationLocation, final_words: data.finalWords,
      gravestone_inscription: data.gravestoneInscription, life_regrets: data.lifeRegrets,
    });
    if (error || !row) { toast.error("Could not save funeral plan", { id: tid }); return; }
    setFuneralPlan(rowToFuneralPlan(row));
    toast.success("Funeral plan saved", { id: tid });
  }, [uid]);

  /* Medical emergency info (one row per user) */
  const saveEmergencyInfo = useCallback(async (data: EmergencyInfo) => {
    if (!uid) return;
    const tid = toast.loading("Saving emergency information...");
    const { data: row, error } = await db.saveEmergencyInfo(uid, {
      blood_type: data.bloodType, height: data.height, weight: data.weight, primary_language: data.primaryLanguage,
      code_status: data.codeStatus, dnr: data.dnr, organ_donor: data.organDonor, advance_directive: data.advanceDirective,
      conditions: data.conditions,
      primary_doctor_name: data.primaryDoctor.name, primary_doctor_specialty: data.primaryDoctor.specialty,
      primary_doctor_phone: data.primaryDoctor.phone, primary_doctor_address: data.primaryDoctor.address,
      hospital_name: data.hospital.name, hospital_phone: data.hospital.phone,
      pharmacy_name: data.pharmacy.name, pharmacy_phone: data.pharmacy.phone,
      insurance_carrier: data.insurance.carrier, insurance_policy_number: data.insurance.policyNum,
      insurance_group_number: data.insurance.groupNum, insurance_member_id: data.insurance.memberId,
    });
    if (error || !row) { toast.error("Could not save emergency information", { id: tid }); return; }
    setEmergencyInfo(rowToEmergencyInfo(row));
    toast.success("Emergency information updated", { id: tid });
  }, [uid]);

  /* Notifications */
  const markNotifRead = useCallback((id: string) => {
    db.markNotificationRead(id);
    setNotifs(n => n.map(x => x.id === id ? { ...x, read:true } : x));
  }, []);
  const markAllRead = useCallback(() => {
    if (uid) db.markAllNotificationsRead(uid);
    setNotifs(n => n.map(x => ({ ...x, read:true })));
  }, [uid]);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DemoContext.Provider value={{
      user, docs, folders, contacts, wishes, allergies, medications, reminders, memories, occasions, notifications,
      funeralPlan, emergencyInfo,
      updateUser, refreshUser, addDoc, deleteDoc, addFolder, renameFolder, deleteFolder, pendingFolderId, setPendingFolderId, addContact, removeContact, updateContact,
      sendVerificationInvite, submitIdVerification, updateGuardianFolders,
      addWish, updateWish, removeWish, addAllergy, removeAllergy, updateAllergy, addMedication, removeMedication, updateMedication,
      addReminder, completeReminder, removeReminder, addMemory, updateMemory, removeMemory, addOccasion,
      saveFuneralPlan, saveEmergencyInfo,
      markNotifRead, markAllRead, unreadCount,
      continuationFeePaid, setContinuationFeePaid,
      deathVerified: deathVerifiedDoc !== null, deathVerifiedDoc, submitDeathRecord,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
