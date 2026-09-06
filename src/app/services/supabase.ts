import { createClient } from "@supabase/supabase-js";

// createClient() throws synchronously if either value is empty, which — since
// this module is imported from almost everywhere (adminApi, every context
// provider, etc.) — took the entire app down to a blank white screen on any
// checkout where VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY aren't set yet (no
// project connected). Falling back to harmless placeholders keeps the app
// rendering; real Supabase calls will simply fail at request time instead,
// which every caller already handles via loading/error states.
const DIRECT_URL    = import.meta.env.VITE_SUPABASE_URL  || "https://placeholder.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Dev-only: with VITE_USE_SUPABASE_PROXY=true, requests go to the Vite dev
// server on the page's own origin, which forwards them to Supabase (see the
// `/sb-api` proxy in vite.config.ts). This is for machines where a browser
// extension or security suite blocks *.supabase.co directly — the symptom is
// every call failing as "Failed to fetch" even though the project is reachable
// outside the browser. Production builds always use DIRECT_URL.
const SUPABASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_SUPABASE_PROXY === "true"
    ? `${window.location.origin}/sb-api`
    : DIRECT_URL;

// True only when both values came from real env vars. On a host that builds from
// git (Vercel), .env is gitignored and never uploaded, so a project without the
// variables set in its dashboard silently ships the placeholders above — every
// request then aims at a domain that does not resolve and surfaces as a bare
// "Failed to fetch". Callers use this to say what is actually wrong instead.
export const isSupabaseConfigured =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── Type helpers ────────────────────────────────────────────

export interface DBUser {
  id: string; email: string; full_name: string; phone?: string;
  plan: "starter"|"essential"|"premium"|"legacy_pro"|"enterprise";
  plan_status: "active"|"paused"|"cancelled"|"past_due";
  stripe_customer_id?: string; stripe_subscription_id?: string;
  is_admin: boolean; email_verified: boolean; two_fa_enabled: boolean;
  created_at: string;
  /* Credential-vault key material (migration 014). Both NULL until the user
     sets a passphrase, which is how the app tells "never set up" from
     "set up, currently locked". Neither can decrypt anything on its own —
     see services/vaultCrypto.ts. */
  vault_salt?: string | null;
  vault_verifier?: string | null;
}

export interface DBDocument {
  id: string; user_id: string; name: string; description?: string;
  category: string; sub_category?: string; folder_id?: string;
  file_path: string; file_size_bytes: number; file_type: string;
  is_encrypted: boolean; status: "pending"|"verified"|"rejected";
  starred: boolean; locked: boolean; tags: string[]; metadata: Record<string,unknown>;
  uploaded_at: string;
}

export interface DBContact {
  id: string; owner_user_id: string; full_name: string; email: string;
  phone?: string; relationship: string;
  contact_type: "legacy"|"guardian"|"emergency"|"pet_emergency";
  verification_status: "not_sent"|"pending"|"verified"|"rejected";
  access_level?: string; access_trigger?: string; notes?: string;
  allowed_folder_ids: string[]; id_document_url?: string; id_type?: string;
  id_verified_at?: string; invite_sent_at?: string; created_at: string;
  /* Storage path in the private record-photos bucket (migration 016).
     Not to be confused with id_document_url, which is the scanned ID. */
  photo_url?: string | null;
}

export interface DBIdVerification {
  id: string; contact_id: string; document_url: string; document_back_url?: string;
  id_type: string; status: "pending"|"approved"|"rejected";
  rejection_reason?: string | null; submitted_at: string; reviewed_at?: string | null;
}

export interface DBStorageUsage {
  user_id: string; billing_period: string; used_bytes: number;
  plan_limit_gb: number; overage_bytes: number; overage_charged: number;
  alert_80_sent: boolean; alert_90_sent: boolean;
  alert_95_sent: boolean; alert_100_sent: boolean;
}

export interface DBAffiliate {
  id: string; user_id: string; referral_code: string; referral_url?: string;
  tier: 1|2|3; commission_rate: number; total_referrals: number;
  active_referrals: number; total_earned: number; pending_payout: number;
  status: "active"|"suspended"|"inactive";
}

export interface DBLegacyContinuationFee {
  id: string; user_id: string; paid_by_user_id?: string;
  paid_by_type: "account_owner"|"legacy_contact";
  amount_usd: number; stripe_payment_intent_id?: string;
  status: "pending"|"paid"|"failed"|"refunded";
  activation_period_months: number;
  activated_at?: string; expires_at?: string; paid_at?: string;
}

export interface DBWLEntitlement {
  user_id: string; entitled: boolean; package_id: string | null;
  payment_ref: string | null; granted_at: string | null; granted_by: string | null;
  updated_at: string;
  wl_packages?: { name: string } | null;
}

export interface DBDisasterRecoveryState {
  user_id: string; addon_active: boolean; bypass_granted: boolean;
  bypass_granted_at: string | null; bypass_granted_by: string | null;
  bypass_expires_at: string | null; bypass_reason: string | null;
  updated_at: string;
}

export interface DBStorageSpendCap {
  user_id: string; cap_enabled: boolean; cap_amount_usd: number | null; updated_at: string;
}

export interface DBAdminSetting {
  key: string; value: string; updated_at: string;
}

export interface DBFinalWish {
  id: string; user_id: string; category: string; item: string;
  recipient?: string; notes?: string; created_at: string;
}

export interface DBAllergy {
  id: string; user_id: string; allergen: string;
  severity: "severe"|"moderate"|"mild"; reaction?: string; type?: string; diagnosed?: string;
}

export interface DBMedication {
  id: string; user_id: string; name: string; dose?: string; frequency?: string;
  condition?: string; prescriber?: string; pharmacy?: string; refill_date?: string;
}

export interface DBReminder {
  id: string; user_id: string; title: string; due_date?: string; frequency?: string;
  category?: string; status: "upcoming"|"due_soon"|"overdue"|"completed"; notes?: string;
}

export interface DBMemory {
  id: string; user_id: string; title: string; memory_date?: string;
  type: "photo"|"video"|"note"|"audio"|"message"|"keepsake"|"goal"|"award";
  description?: string; tags: string[];
  recipient?: string; media_url?: string; achieved?: boolean; issuer?: string; child_name?: string;
}

export interface DBFuneralPlan {
  user_id: string; service_type?: string; location?: string; preferred_date?: string; budget?: number | null;
  prearranged: boolean; music: string[]; readings: string[]; flowers?: string; reception?: string;
  obituary_draft?: string; special_requests?: string;
}

export interface DBEmergencyInfo {
  user_id: string; blood_type?: string; height?: string; weight?: string; primary_language?: string;
  code_status?: string; dnr: boolean; organ_donor: boolean; advance_directive: boolean; conditions: string[];
  primary_doctor_name?: string; primary_doctor_specialty?: string; primary_doctor_phone?: string; primary_doctor_address?: string;
  hospital_name?: string; hospital_phone?: string; pharmacy_name?: string; pharmacy_phone?: string;
  insurance_carrier?: string; insurance_policy_number?: string; insurance_group_number?: string; insurance_member_id?: string;
}

export interface DBOccasion {
  id: string; user_id: string; name: string; occasion_date?: string;
  type: "birthday"|"anniversary"|"holiday"; recipient?: string; notes?: string; recurring: boolean;
}

// ── Service functions ───────────────────────────────────────

export const db = {
  // Users
  async getUser(id: string) {
    return supabase.from("users").select("*").eq("id", id).single<DBUser>();
  },
  async updateUser(id: string, data: Partial<DBUser>) {
    return supabase.from("users").update(data).eq("id", id);
  },

  // Documents
  async listDocuments(userId: string, category?: string) {
    let q = supabase.from("vault_documents").select("*").eq("user_id", userId).order("uploaded_at", { ascending: false });
    if (category) q = q.eq("category", category);
    return q.returns<DBDocument[]>();
  },
  async uploadDocument(doc: Omit<DBDocument,"id"|"uploaded_at">) {
    return supabase.from("vault_documents").insert(doc).select().single<DBDocument>();
  },
  async deleteDocument(id: string) {
    return supabase.from("vault_documents").delete().eq("id", id);
  },

  // Contacts
  async listContacts(ownerId: string) {
    return supabase.from("contacts").select("*").eq("owner_user_id", ownerId).returns<DBContact[]>();
  },
  async addContact(contact: Omit<DBContact,"id"|"created_at">) {
    return supabase.from("contacts").insert(contact).select().single<DBContact>();
  },
  async updateContact(id: string, updates: Partial<Omit<DBContact,"id"|"owner_user_id"|"created_at">>) {
    return supabase.from("contacts").update(updates).eq("id", id).select().single<DBContact>();
  },
  async updateGuardianFolderAccess(contactId: string, folderIds: string[]) {
    return supabase.from("contacts").update({ allowed_folder_ids: folderIds }).eq("id", contactId);
  },
  async sendContactInvite(id: string) {
    return supabase.from("contacts").update({ verification_status: "pending", invite_sent_at: new Date().toISOString() }).eq("id", id);
  },

  // ID verification
  async listIdVerificationsForOwner(ownerId: string) {
    return supabase.from("id_verifications")
      .select("*, contacts!inner(owner_user_id)")
      .eq("contacts.owner_user_id", ownerId)
      .order("submitted_at", { ascending: false })
      .returns<DBIdVerification[]>();
  },
  async uploadIdDocument(ownerId: string, contactId: string, file: File) {
    const path = `${ownerId}/${contactId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("id-verifications").upload(path, file);
    if (error) throw error;
    return path;
  },
  async submitIdVerification(contactId: string, documentPath: string, idType: string) {
    const { data, error } = await supabase.from("id_verifications")
      .insert({ contact_id: contactId, document_url: documentPath, id_type: idType, status: "pending" })
      .select().single<DBIdVerification>();
    if (error) throw error;
    await supabase.from("contacts").update({ id_document_url: documentPath, id_type: idType }).eq("id", contactId);
    return data;
  },

  // Storage usage
  async getStorageUsage(userId: string, period: string) {
    return supabase.from("storage_usage").select("*").eq("user_id", userId).eq("billing_period", period).single<DBStorageUsage>();
  },

  // Affiliates
  async getAffiliate(userId: string) {
    return supabase.from("affiliates").select("*").eq("user_id", userId).single<DBAffiliate>();
  },
  async listAffiliateReferrals(affiliateId: string) {
    return supabase.from("affiliate_referrals").select("*").eq("affiliate_id", affiliateId);
  },

  // Admin settings
  async getAdminSetting(key: string) {
    return supabase.from("admin_settings").select("value").eq("key", key).single<{value:string}>();
  },
  async setAdminSetting(key: string, value: string) {
    return supabase.from("admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
  },

  // Legacy continuation fee
  async getContinuationFee(userId: string) {
    return supabase.from("legacy_continuation_fees")
      .select("*").eq("user_id", userId).eq("status","paid").single<DBLegacyContinuationFee>();
  },
  async recordContinuationFee(fee: Partial<DBLegacyContinuationFee>) {
    return supabase.from("legacy_continuation_fees").insert(fee).select().single<DBLegacyContinuationFee>();
  },
  async activateContinuationFee(feeId: string) {
    const now = new Date();
    // Get the admin-configured period
    const { data: setting } = await db.getAdminSetting("continuation_fee_period_months");
    const months = parseInt(setting?.value ?? "24");
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + months);
    return supabase.from("legacy_continuation_fees").update({
      activated_at: now.toISOString(), expires_at: expires.toISOString()
    }).eq("id", feeId);
  },

  // Notifications
  async listNotifications(userId: string) {
    return supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  },
  async markNotificationRead(id: string) {
    return supabase.from("notifications").update({ read: true }).eq("id", id);
  },
  async markAllNotificationsRead(userId: string) {
    return supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  },

  // Audit logs
  async logAction(entry: { actor_id?: string; actor_email: string; action: string; target_type?: string; target_id?: string; severity?: string; metadata?: Record<string,unknown> }) {
    return supabase.from("audit_logs").insert({ ...entry, severity: entry.severity ?? "info" });
  },

  // Final wishes
  async listFinalWishes(userId: string) {
    return supabase.from("final_wishes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBFinalWish[]>();
  },
  async addFinalWish(w: Omit<DBFinalWish,"id"|"created_at">) {
    return supabase.from("final_wishes").insert(w).select().single<DBFinalWish>();
  },
  async updateFinalWish(id: string, w: Partial<Omit<DBFinalWish,"id"|"user_id"|"created_at">>) {
    return supabase.from("final_wishes").update(w).eq("id", id).select().single<DBFinalWish>();
  },
  async deleteFinalWish(id: string) {
    return supabase.from("final_wishes").delete().eq("id", id);
  },

  // Allergies
  async listAllergies(userId: string) {
    return supabase.from("allergies").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBAllergy[]>();
  },
  async addAllergy(a: Omit<DBAllergy,"id">) {
    return supabase.from("allergies").insert(a).select().single<DBAllergy>();
  },
  async updateAllergy(id: string, a: Partial<Omit<DBAllergy,"id"|"user_id">>) {
    return supabase.from("allergies").update(a).eq("id", id).select().single<DBAllergy>();
  },
  async deleteAllergy(id: string) {
    return supabase.from("allergies").delete().eq("id", id);
  },

  // Medications
  async listMedications(userId: string) {
    return supabase.from("medications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBMedication[]>();
  },
  async addMedication(m: Omit<DBMedication,"id">) {
    return supabase.from("medications").insert(m).select().single<DBMedication>();
  },
  async updateMedication(id: string, m: Partial<Omit<DBMedication,"id"|"user_id">>) {
    return supabase.from("medications").update(m).eq("id", id).select().single<DBMedication>();
  },
  async deleteMedication(id: string) {
    return supabase.from("medications").delete().eq("id", id);
  },

  // Reminders
  async listReminders(userId: string) {
    return supabase.from("reminders").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBReminder[]>();
  },
  async addReminder(r: Omit<DBReminder,"id">) {
    return supabase.from("reminders").insert(r).select().single<DBReminder>();
  },
  async updateReminder(id: string, r: Partial<Omit<DBReminder,"id"|"user_id">>) {
    return supabase.from("reminders").update(r).eq("id", id).select().single<DBReminder>();
  },
  async deleteReminder(id: string) {
    return supabase.from("reminders").delete().eq("id", id);
  },

  // Memories
  async listMemories(userId: string) {
    return supabase.from("memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBMemory[]>();
  },
  async addMemory(m: Omit<DBMemory,"id">) {
    return supabase.from("memories").insert(m).select().single<DBMemory>();
  },
  async updateMemory(id: string, m: Partial<Omit<DBMemory,"id"|"user_id">>) {
    return supabase.from("memories").update(m).eq("id", id).select().single<DBMemory>();
  },
  async deleteMemory(id: string) {
    return supabase.from("memories").delete().eq("id", id);
  },

  // Funeral plan (one row per user)
  async getFuneralPlan(userId: string) {
    return supabase.from("funeral_plans").select("*").eq("user_id", userId).maybeSingle<DBFuneralPlan>();
  },
  async saveFuneralPlan(userId: string, data: Partial<Omit<DBFuneralPlan,"user_id">>) {
    return supabase.from("funeral_plans").upsert({ user_id: userId, ...data }).select().single<DBFuneralPlan>();
  },

  // Medical emergency info (one row per user)
  async getEmergencyInfo(userId: string) {
    return supabase.from("medical_emergency_info").select("*").eq("user_id", userId).maybeSingle<DBEmergencyInfo>();
  },
  async saveEmergencyInfo(userId: string, data: Partial<Omit<DBEmergencyInfo,"user_id">>) {
    return supabase.from("medical_emergency_info").upsert({ user_id: userId, ...data }).select().single<DBEmergencyInfo>();
  },

  // Occasions
  async listOccasions(userId: string) {
    return supabase.from("occasions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).returns<DBOccasion[]>();
  },
  async addOccasion(o: Omit<DBOccasion,"id">) {
    return supabase.from("occasions").insert(o).select().single<DBOccasion>();
  },

  // Entitlement state — read-only for the owner. Both tables grant owner SELECT
  // and no user write policy, so a client write silently affects nothing; the
  // admin backend's service role is the only writer. maybeSingle() because a
  // user who has never been granted anything simply has no row.
  async getWLEntitlement(userId: string) {
    return supabase.from("wl_entitlements")
      .select("*, wl_packages(name)")
      .eq("user_id", userId)
      .maybeSingle<DBWLEntitlement>();
  },
  // Unlike the two tables above this one IS user-editable — it is a
  // self-imposed spend limit, not a paywall gate — so it keeps a FOR ALL
  // policy and the client may write it directly.
  async getStorageSpendCap(userId: string) {
    return supabase.from("storage_spend_caps").select("*")
      .eq("user_id", userId).maybeSingle<DBStorageSpendCap>();
  },
  async saveStorageSpendCap(userId: string, capEnabled: boolean, capAmountUsd: number | null) {
    return supabase.from("storage_spend_caps")
      .upsert({ user_id: userId, cap_enabled: capEnabled, cap_amount_usd: capAmountUsd, updated_at: new Date().toISOString() })
      .select().single<DBStorageSpendCap>();
  },

  async getDisasterRecoveryState(userId: string) {
    return supabase.from("disaster_recovery_state")
      .select("*").eq("user_id", userId)
      .maybeSingle<DBDisasterRecoveryState>();
  },

  // Storage
  async uploadVaultFile(userId: string, file: File) {
    const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("vault-documents").upload(path, file);
    if (error) throw error;
    return path;
  },

  /* Record photos (migration 016). Everything picked through PhotoPicker
     lands here: places, trips, warranties, pets, contacts, assets, IDs.

     The bucket is private, so what goes into the database is the storage
     PATH, never a URL — see signRecordPhotos for reading it back. The
     caller passes the already-shrunk WebP blob from utils/imageInput,
     which is why there is no File and no name to preserve. */
  async uploadRecordPhoto(userId: string, blob: Blob) {
    const ext = blob.type === "image/webp" ? "webp" : (blob.type.split("/")[1] || "bin");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("record-photos")
      .upload(path, blob, { contentType: blob.type || "image/webp" });
    if (error) throw error;
    return path;
  },

  /* Batch-sign record photo paths. A grid of 30 cards is one request
     rather than 30, which is the whole reason this takes an array.
     Returns a path -> URL map; paths that fail to sign are simply absent
     so the caller renders its placeholder instead of a broken image. */
  async signRecordPhotos(paths: string[], expiresInSeconds = 3600) {
    if (!paths.length) return {} as Record<string, string>;
    const { data, error } = await supabase.storage
      .from("record-photos")
      .createSignedUrls(paths, expiresInSeconds);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
    }
    return map;
  },

  // Realtime subscriptions
  subscribeToNotifications(userId: string, callback: (n: unknown) => void) {
    return supabase.channel(`notifications:${userId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications", filter:`user_id=eq.${userId}` }, (payload) => callback(payload.new))
      .subscribe();
  },
  subscribeToStorageUsage(userId: string, callback: (u: unknown) => void) {
    return supabase.channel(`storage:${userId}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"storage_usage", filter:`user_id=eq.${userId}` }, (payload) => callback(payload.new))
      .subscribe();
  },
};

// ── Owner-scoped CRUD ───────────────────────────────────────
//
// The 24 tables below are all the same shape: rows belong to one user, RLS
// restricts them with `auth.uid() = <owner column>`, and the UI needs exactly
// list/add/update/remove. Hand-writing ~100 near-identical methods on `db`
// buys nothing, so they share one factory. The older bespoke `db.*` methods
// stay as they are — several of them do more than plain CRUD (joins, storage
// uploads, derived expiry), which is why they were written out by hand.
//
// `ownerColumn` exists because family_friends and contact_groups key off
// owner_user_id while everything else uses user_id.

export interface OwnerScopedRow { id: string; [key: string]: unknown }

function ownerTable<T extends OwnerScopedRow>(table: string, ownerColumn: "user_id" | "owner_user_id" = "user_id") {
  return {
    table,
    ownerColumn,
    list(userId: string) {
      return supabase.from(table).select("*")
        .eq(ownerColumn, userId)
        .order("created_at", { ascending: false })
        .returns<T[]>();
    },
    add(userId: string, row: Partial<Omit<T, "id">>) {
      return supabase.from(table)
        .insert({ ...row, [ownerColumn]: userId })
        .select().single<T>();
    },
    // Bulk insert for importers (contacts from a phone or CSV). One round
    // trip rather than N, and one all-or-nothing failure to report.
    addMany(userId: string, rows: Partial<Omit<T, "id">>[]) {
      return supabase.from(table)
        .insert(rows.map(row => ({ ...row, [ownerColumn]: userId })))
        .select().returns<T[]>();
    },
    // The owner column is deliberately not patchable — RLS would reject a
    // handover anyway, and silently dropping it here makes that explicit.
    update(id: string, patch: Partial<Omit<T, "id" | "user_id" | "owner_user_id">>) {
      return supabase.from(table).update(patch).eq("id", id).select().single<T>();
    },
    remove(id: string) {
      return supabase.from(table).delete().eq("id", id);
    },
  };
}

export const tables = {
  passwordVault:      ownerTable("password_vault"),
  diaryEntries:       ownerTable("diary_entries"),
  subscriptionTracker: ownerTable("subscription_tracker"),
  vaultFolders:       ownerTable("vault_folders"),
  contactGroups:      ownerTable("contact_groups", "owner_user_id"),
  familyFriends:      ownerTable("family_friends", "owner_user_id"),

  petRecords:         ownerTable("pet_records"),
  daycareRecords:     ownerTable("daycare_records"),
  kidsActivities:     ownerTable("kids_activities"),

  warranties:         ownerTable("warranties"),
  idKeeperRecords:    ownerTable("id_keeper_records"),
  jobHistory:         ownerTable("job_history"),
  travelTrips:        ownerTable("travel_trips"),
  utilities:          ownerTable("utilities"),
  willsTrusts:        ownerTable("wills_trusts"),
  favoritePlaces:     ownerTable("favorite_places"),
  messagesToLovedOnes: ownerTable("messages_to_loved_ones"),

  vehicles:           ownerTable("vehicles"),
  realEstate:         ownerTable("real_estate"),
  digitalAssets:      ownerTable("digital_assets"),
  weapons:            ownerTable("weapons"),
  weaponsLocker:      ownerTable("weapons_locker"),
  collectibles:       ownerTable("collectibles"),

  // Created in migration 009 — these two screens had no table at all.
  receipts:           ownerTable("receipts"),
  financialRecords:   ownerTable("financial_records"),
};
