import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import {
  db, supabase, type DBDocument, type DBContact, type DBIdVerification,
  type DBFinalWish, type DBAllergy, type DBMedication, type DBReminder, type DBMemory, type DBOccasion,
} from "../services/supabase";

/* ─── Types ─────────────────────────────────────────────────────── */
export interface Doc {
  id: string; name: string; category: string; size: number; sizeUnit: "MB"|"GB";
  uploaded: string; type: string; status: "verified"|"pending"|"rejected"; encrypted: boolean;
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
}
export interface Medication {
  id: string; name: string; dose: string; frequency: string; condition: string; prescriber: string; pharmacy: string; refillDate: string;
}
export interface Reminder {
  id: string; title: string; dueDate: string; frequency: string; category: string; status: "upcoming"|"due_soon"|"overdue"|"completed"; notes: string;
}
export interface Memory {
  id: string; title: string; date: string; type: "photo"|"video"|"note"; description: string; tags: string[];
}
export interface Occasion {
  id: string; name: string; date: string; type: "birthday"|"anniversary"|"holiday"; recipient: string; notes: string; recurring: boolean;
}
export interface Notification {
  id: string; title: string; message: string; type: "info"|"warning"|"success"|"error"; time: string; read: boolean;
}
export interface UserProfile {
  name: string; email: string; phone: string;
  plan: "starter"|"foundation"|"family_archive"|"legacy_pro"|"legacy_vault";
  storageUsed: number; storageLimit: number; avatar: string;
}

const PLAN_STORAGE_GB: Record<UserProfile["plan"], number> = {
  starter: 1, foundation: 50, family_archive: 250, legacy_pro: 500, legacy_vault: 1024,
};

const EMPTY_USER: UserProfile = {
  name: "", email: "", phone: "", plan: "foundation", storageUsed: 0, storageLimit: 50, avatar: "",
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

function rowToDoc(row: DBDocument): Doc {
  const mb = row.file_size_bytes / (1024 * 1024);
  const useGb = mb >= 1024;
  return {
    id: row.id, name: row.name, category: row.category,
    size: Number((useGb ? mb / 1024 : mb).toFixed(1)), sizeUnit: useGb ? "GB" : "MB",
    uploaded: formatDate(row.uploaded_at), type: row.file_type,
    status: row.status, encrypted: row.is_encrypted,
  };
}

function rowToContact(row: DBContact, latestIdv?: DBIdVerification): Contact {
  return {
    id: row.id, type: row.contact_type, name: row.full_name, relationship: row.relationship,
    email: row.email, phone: row.phone ?? "", verificationStatus: row.verification_status,
    accessLevel: row.access_level, notes: row.notes, avatar: initials(row.full_name),
    allowedFolderIds: row.allowed_folder_ids ?? [],
    idVerificationStatus: latestIdv?.status ?? null,
    idRejectionReason: latestIdv?.rejection_reason ?? null,
  };
}

interface DBNotificationRow { id: string; title: string; message: string; type: Notification["type"]; read: boolean; created_at: string; }

const rowToWish = (r: DBFinalWish): FinalWish => ({ id: r.id, category: r.category, item: r.item, recipient: r.recipient ?? "", notes: r.notes ?? "" });
const rowToAllergy = (r: DBAllergy): Allergy => ({ id: r.id, allergen: r.allergen, severity: r.severity, reaction: r.reaction ?? "", type: r.type ?? "", diagnosed: r.diagnosed ?? "" });
const rowToMed = (r: DBMedication): Medication => ({ id: r.id, name: r.name, dose: r.dose ?? "", frequency: r.frequency ?? "", condition: r.condition ?? "", prescriber: r.prescriber ?? "", pharmacy: r.pharmacy ?? "", refillDate: r.refill_date ?? "" });
const rowToReminder = (r: DBReminder): Reminder => ({ id: r.id, title: r.title, dueDate: r.due_date ?? "", frequency: r.frequency ?? "", category: r.category ?? "", status: r.status, notes: r.notes ?? "" });
const rowToMemory = (r: DBMemory): Memory => ({ id: r.id, title: r.title, date: r.memory_date ?? "", type: r.type, description: r.description ?? "", tags: r.tags ?? [] });
const rowToOccasion = (r: DBOccasion): Occasion => ({ id: r.id, name: r.name, date: r.occasion_date ?? "", type: r.type, recipient: r.recipient ?? "", notes: r.notes ?? "", recurring: r.recurring });
const rowToNotif = (r: DBNotificationRow): Notification => ({ id: r.id, title: r.title, message: r.message, type: r.type, time: timeAgo(r.created_at), read: r.read });

/* ─── Context ───────────────────────────────────────────────────── */
interface DemoCtx {
  user: UserProfile;
  continuationFeePaid: boolean;
  setContinuationFeePaid: (paid: boolean) => void;
  deathVerified: boolean;
  deathVerifiedDoc: string | null;
  submitDeathRecord: (docName: string) => void;
  docs: Doc[];
  contacts: Contact[];
  wishes: FinalWish[];
  allergies: Allergy[];
  medications: Medication[];
  reminders: Reminder[];
  memories: Memory[];
  occasions: Occasion[];
  notifications: Notification[];
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  addDoc: (doc: Omit<Doc,"id"|"uploaded">, file?: File) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  addContact: (c: Omit<Contact,"id">) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  sendVerificationInvite: (id: string) => Promise<void>;
  submitIdVerification: (contactId: string, file: File, idType: string) => Promise<void>;
  updateGuardianFolders: (id: string, folderIds: string[]) => Promise<void>;
  addWish: (w: Omit<FinalWish,"id">) => Promise<void>;
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
  removeMemory: (id: string) => Promise<void>;
  addOccasion: (o: Omit<Occasion,"id">) => Promise<void>;
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [wishes, setWishes] = useState<FinalWish[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [medications, setMeds] = useState<Medication[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [notifications, setNotifs] = useState<Notification[]>([]);
  const [continuationFeePaid, setContinuationFeePaid] = useState(false);
  const [deathVerifiedDoc, setDeathVerifiedDoc] = useState<string | null>(null);

  /* Load everything for the signed-in user, and keep notifications live. */
  useEffect(() => {
    if (!uid) {
      setUser(EMPTY_USER); setDocs([]); setContacts([]); setWishes([]); setAllergies([]);
      setMeds([]); setReminders([]); setMemories([]); setOccasions([]); setNotifs([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const [
        userRes, docsRes, contactsRes, idvRes, wishesRes, allergiesRes,
        medsRes, remindersRes, memoriesRes, occasionsRes, notifsRes,
        feeRes,
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
      ]);
      if (cancelled) return;

      if (userRes.data) {
        const used = (docsRes.data ?? []).reduce((sum, d) => sum + d.file_size_bytes, 0) / (1024 ** 3);
        setUser({
          name: userRes.data.full_name, email: userRes.data.email, phone: userRes.data.phone ?? "",
          plan: userRes.data.plan, storageUsed: Number(used.toFixed(2)), storageLimit: PLAN_STORAGE_GB[userRes.data.plan],
          avatar: initials(userRes.data.full_name),
        });
      }
      setDocs((docsRes.data ?? []).map(rowToDoc));
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
      full_name: data.name, phone: data.phone, plan: data.plan,
    });
    if (error) { toast.error("Could not save profile", { id: tid }); return; }
    setUser(u => ({ ...u, ...data, storageLimit: data.plan ? PLAN_STORAGE_GB[data.plan] : u.storageLimit }));
    toast.success("Profile updated", { id: tid });
  }, [uid]);

  /* Docs */
  const addDoc = useCallback(async (doc: Omit<Doc,"id"|"uploaded">, file?: File) => {
    if (!uid) return;
    const tid = toast.loading("Uploading document...");
    try {
      const filePath = file ? await db.uploadVaultFile(uid, file) : `${uid}/manual-${Date.now()}-${doc.name}`;
      const fileSizeBytes = file ? file.size : Math.round(doc.size * (doc.sizeUnit === "GB" ? 1024 ** 3 : 1024 ** 2));
      const { data, error } = await db.uploadDocument({
        user_id: uid, name: doc.name, category: doc.category, file_path: filePath,
        file_size_bytes: fileSizeBytes, file_type: doc.type, is_encrypted: doc.encrypted,
        status: doc.status === "rejected" ? "pending" : doc.status, starred: false, locked: false, tags: [], metadata: {},
      });
      if (error || !data) throw error;
      setDocs(d => [rowToDoc(data), ...d]);
      toast.success("Document uploaded & encrypted", { id: tid });
    } catch {
      toast.error("Could not upload document", { id: tid });
    }
  }, [uid]);

  const deleteDoc = useCallback(async (id: string) => {
    const tid = toast.loading("Deleting document...");
    const { error } = await db.deleteDocument(id);
    if (error) { toast.error("Could not delete document", { id: tid }); return; }
    setDocs(d => d.filter(x => x.id !== id));
    toast.success("Document permanently deleted", { id: tid });
  }, []);

  /* Contacts */
  const addContact = useCallback(async (c: Omit<Contact,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Adding contact...");
    const { data, error } = await db.addContact({
      owner_user_id: uid, full_name: c.name, email: c.email, phone: c.phone, relationship: c.relationship,
      contact_type: c.type, verification_status: c.verificationStatus, access_level: c.accessLevel,
      notes: c.notes, allowed_folder_ids: c.allowedFolderIds ?? [],
    });
    if (error || !data) { toast.error("Could not add contact", { id: tid }); return; }
    setContacts(prev => [rowToContact(data), ...prev]);
    toast.success(`Verification invite sent to ${c.email}`, { id: tid });
  }, [uid]);

  const removeContact = useCallback(async (id: string) => {
    const tid = toast.loading("Removing contact...");
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) { toast.error("Could not remove contact", { id: tid }); return; }
    setContacts(c => c.filter(x => x.id !== id));
    toast.success("Contact removed", { id: tid });
  }, []);

  const sendVerificationInvite = useCallback(async (id: string) => {
    const tid = toast.loading("Sending verification invite...");
    const { error } = await db.sendContactInvite(id);
    if (error) { toast.error("Could not send invite", { id: tid }); return; }
    setContacts(c => c.map(x => x.id === id ? { ...x, verificationStatus: "pending" } : x));
    toast.success("Verification invite sent", { id: tid });
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
    const { data, error } = await db.addAllergy({ user_id: uid, allergen: a.allergen, severity: a.severity, reaction: a.reaction, type: a.type, diagnosed: a.diagnosed });
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
    const { data, error } = await db.updateAllergy(id, a);
    if (error || !data) { toast.error("Could not update allergy"); return; }
    setAllergies(prev => prev.map(x => x.id === id ? rowToAllergy(data) : x));
  }, []);

  const addMedication = useCallback(async (m: Omit<Medication,"id">) => {
    if (!uid) return;
    const tid = toast.loading("Saving medication...");
    const { data, error } = await db.addMedication({ user_id: uid, name: m.name, dose: m.dose, frequency: m.frequency, condition: m.condition, prescriber: m.prescriber, pharmacy: m.pharmacy, refill_date: m.refillDate });
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
    const { data, error } = await db.updateMedication(id, { name: m.name, dose: m.dose, frequency: m.frequency, condition: m.condition, prescriber: m.prescriber, pharmacy: m.pharmacy, refill_date: m.refillDate });
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
    const { data, error } = await db.addMemory({ user_id: uid, title: m.title, memory_date: m.date, type: m.type, description: m.description, tags: m.tags });
    if (error || !data) { toast.error("Could not save memory", { id: tid }); return; }
    setMemories(prev => [rowToMemory(data), ...prev]);
    toast.success("Memory saved to vault", { id: tid });
  }, [uid]);

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
      user, docs, contacts, wishes, allergies, medications, reminders, memories, occasions, notifications,
      updateUser, addDoc, deleteDoc, addContact, removeContact,
      sendVerificationInvite, submitIdVerification, updateGuardianFolders,
      addWish, removeWish, addAllergy, removeAllergy, updateAllergy, addMedication, removeMedication, updateMedication,
      addReminder, completeReminder, removeReminder, addMemory, removeMemory, addOccasion,
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
