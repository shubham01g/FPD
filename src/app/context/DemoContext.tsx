import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────────────── */
export interface Doc {
  id: string; name: string; category: string; size: number; sizeUnit: "MB"|"GB";
  uploaded: string; type: string; status: "verified"|"pending"; encrypted: boolean;
}
export interface Contact {
  id: string; type: "legacy"|"guardian"|"emergency"|"pet_emergency";
  name: string; relationship: string; email: string; phone: string;
  verificationStatus: "verified"|"pending"|"not_sent"; accessLevel?: string; notes?: string; avatar: string;
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
export interface InsurancePolicy {
  id: string; type: string; carrier: string; policyNum: string; coverage: string; premium: string; beneficiary: string; agent: string; status: "active"|"expired";
}
export interface Vehicle {
  id: string; year: number; make: string; model: string; color: string; vin: string; plate: string; value: string; notes: string;
}
export interface Notification {
  id: string; title: string; message: string; type: "info"|"warning"|"success"|"error"; time: string; read: boolean;
}
export interface UserProfile {
  name: string; email: string; phone: string; plan: "foundation"|"family_archive"|"legacy_pro";
  storageUsed: number; storageLimit: number; avatar: string;
}

/* ─── Initial data ──────────────────────────────────────────────── */
const initDocs: Doc[] = [
  { id:"DOC-001", name:"Last Will & Testament", category:"legal", size:2.4, sizeUnit:"MB", uploaded:"Jun 8, 2026", type:"pdf", status:"verified", encrypted:true },
  { id:"DOC-002", name:"Living Trust Agreement", category:"legal", size:1.8, sizeUnit:"MB", uploaded:"May 20, 2026", type:"pdf", status:"verified", encrypted:true },
  { id:"DOC-003", name:"Life Insurance — MetLife", category:"financial", size:1.1, sizeUnit:"MB", uploaded:"May 22, 2026", type:"pdf", status:"verified", encrypted:true },
  { id:"DOC-004", name:"Bank Account Summary", category:"financial", size:0.4, sizeUnit:"MB", uploaded:"May 15, 2026", type:"pdf", status:"pending", encrypted:true },
  { id:"DOC-005", name:"Investment Portfolio Report", category:"financial", size:3.2, sizeUnit:"MB", uploaded:"Apr 30, 2026", type:"pdf", status:"verified", encrypted:true },
  { id:"DOC-006", name:"Video Message to Family", category:"personal", size:284.0, sizeUnit:"MB", uploaded:"Apr 10, 2026", type:"video", status:"verified", encrypted:true },
  { id:"DOC-007", name:"Crypto Wallet Backup", category:"digital", size:0.1, sizeUnit:"MB", uploaded:"Jun 1, 2026", type:"txt", status:"verified", encrypted:true },
];

const initContacts: Contact[] = [
  { id:"CON-001", type:"legacy", name:"Sarah Johnson", relationship:"Spouse", email:"sarah.j@email.com", phone:"(916) 555-0234", verificationStatus:"verified", accessLevel:"Full vault access upon death confirmed by executor", avatar:"SJ" },
  { id:"CON-002", type:"legacy", name:"Michael Doe", relationship:"Son", email:"m.doe@email.com", phone:"(415) 555-0871", verificationStatus:"verified", accessLevel:"Full vault access upon death", avatar:"MD" },
  { id:"CON-003", type:"legacy", name:"Linda Torres, Esq.", relationship:"Estate Attorney", email:"ltorres@lawfirm.com", phone:"(916) 555-0482", verificationStatus:"pending", accessLevel:"Legal documents only — immediate", avatar:"LT" },
  { id:"CON-004", type:"guardian", name:"Emily Doe", relationship:"Daughter", email:"e.doe@email.com", phone:"(916) 555-0392", verificationStatus:"verified", accessLevel:"View Only — 4 folders assigned", avatar:"ED" },
  { id:"CON-007", type:"guardian", name:"Robert Doe", relationship:"Brother", email:"r.doe@email.com", phone:"(530) 555-0157", verificationStatus:"pending", accessLevel:"View Only — 2 folders assigned", avatar:"RD" },
  { id:"CON-005", type:"emergency", name:"Dr. Karen Fields", relationship:"Primary Physician", email:"kfields@sacmedical.com", phone:"(916) 555-0182", verificationStatus:"verified", notes:"Has full medical history on file", avatar:"KF" },
  { id:"CON-008", type:"emergency", name:"Frank Delgado", relationship:"Next-Door Neighbor", email:"fdelgado@email.com", phone:"(916) 555-0311", verificationStatus:"verified", notes:"Has a spare house key and the alarm code", avatar:"FD" },
  { id:"CON-006", type:"pet_emergency", name:"Emily Doe", relationship:"Daughter", email:"e.doe@email.com", phone:"(916) 555-0392", verificationStatus:"verified", notes:"Agreed to take Biscuit permanently", avatar:"ED" },
];

const initWishes: FinalWish[] = [
  { id:"FW-001", category:"Personal Property", item:"1967 Ford Mustang (Red)", recipient:"Michael Doe (Son)", notes:"Keep it in the family. Never sell it." },
  { id:"FW-002", category:"Sentimental Items", item:"Grandfather's pocket watch", recipient:"Emily Doe (Daughter)", notes:"Has been in the family since 1892." },
  { id:"FW-003", category:"Financial", item:"Savings account at First National", recipient:"Sarah Johnson (Spouse)", notes:"Primary beneficiary already designated." },
  { id:"FW-004", category:"Personal Property", item:"Book collection (600+ volumes)", recipient:"Local Public Library", notes:"Donate the entire collection." },
];

const initAllergies: Allergy[] = [
  { id:"ALL-001", allergen:"Penicillin", severity:"severe", reaction:"Anaphylaxis — requires EpiPen", type:"medication", diagnosed:"2008" },
  { id:"ALL-002", allergen:"Bee Stings", severity:"severe", reaction:"Anaphylaxis, throat swelling", type:"environmental", diagnosed:"2001" },
  { id:"ALL-003", allergen:"Shellfish", severity:"moderate", reaction:"Hives, gastrointestinal distress", type:"food", diagnosed:"2015" },
];

const initMeds: Medication[] = [
  { id:"MED-001", name:"Metformin", dose:"1000mg", frequency:"Twice daily with meals", condition:"Type 2 Diabetes", prescriber:"Dr. Karen Fields", pharmacy:"CVS Pharmacy #4821", refillDate:"Jul 1, 2026" },
  { id:"MED-002", name:"Lisinopril", dose:"10mg", frequency:"Once daily in morning", condition:"Hypertension", prescriber:"Dr. Karen Fields", pharmacy:"CVS Pharmacy #4821", refillDate:"Jul 15, 2026" },
];

const initReminders: Reminder[] = [
  { id:"REM-001", title:"Review and update Will", dueDate:"Sep 15, 2026", frequency:"Annual", category:"Legal", status:"upcoming", notes:"Review with Linda Torres after major life changes" },
  { id:"REM-002", title:"Update beneficiaries on all accounts", dueDate:"Jul 1, 2026", frequency:"Annual", category:"Financial", status:"due_soon", notes:"Fidelity 401k and Vanguard IRA" },
  { id:"REM-003", title:"Update Legacy Vault documents", dueDate:"Jun 30, 2026", frequency:"Quarterly", category:"Legacy", status:"overdue", notes:"Add 2025 tax return, update insurance policy" },
];

const initMemories: Memory[] = [
  { id:"MEM-001", title:"Family Christmas 2024", date:"Dec 25, 2024", type:"photo", description:"Last Christmas at the Sacramento house. All four kids were home.", tags:["family","christmas"] },
  { id:"MEM-002", title:"Michael's Wedding Day", date:"Jun 12, 2022", type:"photo", description:"Michael married Amanda Torres in Napa Valley.", tags:["michael","wedding"] },
  { id:"MEM-003", title:"Big Sur Camping Trip", date:"Aug 8, 2023", type:"video", description:"Three-day camping trip with the grandkids. Tyler caught his first fish.", tags:["outdoors","grandkids"] },
];

const initOccasions: Occasion[] = [
  { id:"OCC-001", name:"Sarah's Birthday", date:"Aug 14", type:"birthday", recipient:"Sarah Johnson (Spouse)", notes:"Dark chocolate cake, peonies", recurring:true },
  { id:"OCC-002", name:"Our Wedding Anniversary", date:"May 28", type:"anniversary", recipient:"Sarah Johnson (Spouse)", notes:"36 years — dinner at Mario's", recurring:true },
  { id:"OCC-003", name:"Michael's Birthday", date:"Mar 5", type:"birthday", recipient:"Michael Doe (Son)", notes:"", recurring:true },
];

const initNotifications: Notification[] = [
  { id:"NTF-001", title:"Storage at 80%", message:"You have used 80% of your 25 GB storage allowance.", type:"warning", time:"3 days ago", read:false },
  { id:"NTF-002", title:"Contact Verified", message:"Sarah Johnson has been verified as your Legacy Contact.", type:"success", time:"1 week ago", read:false },
  { id:"NTF-003", title:"Referral Commission", message:"You earned $49.99 from a Legacy Archive referral.", type:"success", time:"1 week ago", read:true },
  { id:"NTF-004", title:"Reminder Due", message:"\"Update Legacy Vault\" reminder is overdue.", type:"warning", time:"2 days ago", read:false },
  { id:"NTF-005", title:"Login from new device", message:"New login detected from Chrome on Windows.", type:"info", time:"4 days ago", read:true },
];

const initUser: UserProfile = {
  name:"James Doe", email:"james.doe@email.com", phone:"+1 (916) 555-0182",
  plan:"family_archive", storageUsed:16.9, storageLimit:25, avatar:"JD",
};

/* ─── Context ───────────────────────────────────────────────────── */
interface DemoCtx {
  user: UserProfile;
  continuationFeePaid: boolean;
  setContinuationFeePaid: (paid: boolean) => void;
  docs: Doc[];
  contacts: Contact[];
  wishes: FinalWish[];
  allergies: Allergy[];
  medications: Medication[];
  reminders: Reminder[];
  memories: Memory[];
  occasions: Occasion[];
  notifications: Notification[];
  // User
  updateUser: (data: Partial<UserProfile>) => Promise<void>;
  // Docs
  addDoc: (doc: Omit<Doc,"id"|"uploaded">) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  // Contacts
  addContact: (c: Omit<Contact,"id">) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContactStatus: (id: string, status: Contact["verificationStatus"]) => void;
  // Final Wishes
  addWish: (w: Omit<FinalWish,"id">) => Promise<void>;
  removeWish: (id: string) => Promise<void>;
  // Medical
  addAllergy: (a: Omit<Allergy,"id">) => Promise<void>;
  removeAllergy: (id: string) => Promise<void>;
  addMedication: (m: Omit<Medication,"id">) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  // Reminders
  addReminder: (r: Omit<Reminder,"id">) => Promise<void>;
  completeReminder: (id: string) => void;
  removeReminder: (id: string) => void;
  // Memories
  addMemory: (m: Omit<Memory,"id">) => Promise<void>;
  removeMemory: (id: string) => Promise<void>;
  // Occasions
  addOccasion: (o: Omit<Occasion,"id">) => Promise<void>;
  // Notifications
  markNotifRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const DemoContext = createContext<DemoCtx | null>(null);

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase(); }
function delay(ms = 600) { return new Promise(r => setTimeout(r, ms + Math.random() * 200)); }

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(initUser);
  const [docs, setDocs] = useState<Doc[]>(initDocs);
  const [contacts, setContacts] = useState<Contact[]>(initContacts);
  const [wishes, setWishes] = useState<FinalWish[]>(initWishes);
  const [allergies, setAllergies] = useState<Allergy[]>(initAllergies);
  const [medications, setMeds] = useState<Medication[]>(initMeds);
  const [reminders, setReminders] = useState<Reminder[]>(initReminders);
  const [memories, setMemories] = useState<Memory[]>(initMemories);
  const [occasions, setOccasions] = useState<Occasion[]>(initOccasions);
  const [notifications, setNotifs] = useState<Notification[]>(initNotifications);
  const [continuationFeePaid, setContinuationFeePaid] = useState(false);

  /* User */
  const updateUser = useCallback(async (data: Partial<UserProfile>) => {
    const tid = toast.loading("Saving profile...");
    await delay();
    setUser(u => ({ ...u, ...data }));
    toast.success("Profile updated", { id: tid });
  }, []);

  /* Docs */
  const addDoc = useCallback(async (doc: Omit<Doc,"id"|"uploaded">) => {
    const tid = toast.loading("Uploading document...");
    await delay(900);
    const newDoc: Doc = { ...doc, id:`DOC-${uid()}`, uploaded: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) };
    setDocs(d => [newDoc, ...d]);
    setUser(u => ({ ...u, storageUsed: Math.min(u.storageUsed + doc.size/1024, u.storageLimit) }));
    toast.success("Document uploaded & encrypted", { id: tid });
  }, []);

  const deleteDoc = useCallback(async (id: string) => {
    const tid = toast.loading("Deleting document...");
    await delay(400);
    setDocs(d => d.filter(x => x.id !== id));
    toast.success("Document permanently deleted", { id: tid });
  }, []);

  /* Contacts */
  const addContact = useCallback(async (c: Omit<Contact,"id">) => {
    const tid = toast.loading("Adding contact...");
    await delay();
    setContacts(prev => [{ ...c, id:`CON-${uid()}` }, ...prev]);
    toast.success(`Verification invite sent to ${c.email}`, { id: tid });
  }, []);

  const removeContact = useCallback(async (id: string) => {
    const tid = toast.loading("Removing contact...");
    await delay(400);
    setContacts(c => c.filter(x => x.id !== id));
    toast.success("Contact removed", { id: tid });
  }, []);

  const updateContactStatus = useCallback((id: string, status: Contact["verificationStatus"]) => {
    setContacts(c => c.map(x => x.id === id ? { ...x, verificationStatus: status } : x));
    toast.success(status === "verified" ? "Contact verified successfully" : "Contact status updated");
  }, []);

  /* Final Wishes */
  const addWish = useCallback(async (w: Omit<FinalWish,"id">) => {
    const tid = toast.loading("Saving final wish...");
    await delay();
    setWishes(prev => [{ ...w, id:`FW-${uid()}` }, ...prev]);
    toast.success("Final wish saved to vault", { id: tid });
  }, []);

  const removeWish = useCallback(async (id: string) => {
    await delay(300);
    setWishes(w => w.filter(x => x.id !== id));
    toast.success("Final wish removed");
  }, []);

  /* Medical */
  const addAllergy = useCallback(async (a: Omit<Allergy,"id">) => {
    const tid = toast.loading("Saving allergy...");
    await delay();
    setAllergies(prev => [{ ...a, id:`ALL-${uid()}` }, ...prev]);
    toast.success("Allergy record saved", { id: tid });
  }, []);

  const removeAllergy = useCallback(async (id: string) => {
    await delay(300);
    setAllergies(a => a.filter(x => x.id !== id));
    toast.success("Allergy removed");
  }, []);

  const addMedication = useCallback(async (m: Omit<Medication,"id">) => {
    const tid = toast.loading("Saving medication...");
    await delay();
    setMeds(prev => [{ ...m, id:`MED-${uid()}` }, ...prev]);
    toast.success("Medication record saved", { id: tid });
  }, []);

  const removeMedication = useCallback(async (id: string) => {
    await delay(300);
    setMeds(m => m.filter(x => x.id !== id));
    toast.success("Medication removed");
  }, []);

  /* Reminders */
  const addReminder = useCallback(async (r: Omit<Reminder,"id">) => {
    const tid = toast.loading("Creating reminder...");
    await delay();
    setReminders(prev => [{ ...r, id:`REM-${uid()}` }, ...prev]);
    toast.success("Reminder created", { id: tid });
  }, []);

  const completeReminder = useCallback((id: string) => {
    setReminders(r => r.map(x => x.id === id ? { ...x, status:"completed" } : x));
    toast.success("Reminder marked complete");
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders(r => r.filter(x => x.id !== id));
    toast.success("Reminder deleted");
  }, []);

  /* Memories */
  const addMemory = useCallback(async (m: Omit<Memory,"id">) => {
    const tid = toast.loading("Saving memory...");
    await delay();
    setMemories(prev => [{ ...m, id:`MEM-${uid()}` }, ...prev]);
    toast.success("Memory saved to vault", { id: tid });
  }, []);

  const removeMemory = useCallback(async (id: string) => {
    await delay(300);
    setMemories(m => m.filter(x => x.id !== id));
    toast.success("Memory removed");
  }, []);

  /* Occasions */
  const addOccasion = useCallback(async (o: Omit<Occasion,"id">) => {
    const tid = toast.loading("Saving occasion...");
    await delay();
    setOccasions(prev => [{ ...o, id:`OCC-${uid()}` }, ...prev]);
    toast.success("Occasion saved", { id: tid });
  }, []);

  /* Notifications */
  const markNotifRead = useCallback((id: string) => setNotifs(n => n.map(x => x.id === id ? { ...x, read:true } : x)), []);
  const markAllRead = useCallback(() => setNotifs(n => n.map(x => ({ ...x, read:true }))), []);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <DemoContext.Provider value={{
      user, docs, contacts, wishes, allergies, medications, reminders, memories, occasions, notifications,
      updateUser, addDoc, deleteDoc, addContact, removeContact, updateContactStatus,
      addWish, removeWish, addAllergy, removeAllergy, addMedication, removeMedication,
      addReminder, completeReminder, removeReminder, addMemory, removeMemory, addOccasion,
      markNotifRead, markAllRead, unreadCount,
      continuationFeePaid, setContinuationFeePaid,
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
