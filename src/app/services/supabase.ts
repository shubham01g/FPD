import { createClient } from "@supabase/supabase-js";

// createClient() throws synchronously if either value is empty, which — since
// this module is imported from almost everywhere (adminApi, every context
// provider, etc.) — took the entire app down to a blank white screen on any
// checkout where VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY aren't set yet (no
// project connected). Falling back to harmless placeholders keeps the app
// rendering; real Supabase calls will simply fail at request time instead,
// which every caller already handles via loading/error states.
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://placeholder.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

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
  id_verified_at?: string; created_at: string;
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

export interface DBAdminSetting {
  key: string; value: string; updated_at: string;
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
  async updateContactVerification(id: string, status: DBContact["verification_status"]) {
    return supabase.from("contacts").update({ verification_status: status }).eq("id", id);
  },
  async updateGuardianFolderAccess(contactId: string, folderIds: string[]) {
    return supabase.from("contacts").update({ allowed_folder_ids: folderIds }).eq("id", contactId);
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

  // Audit logs
  async logAction(entry: { actor_id?: string; actor_email: string; action: string; target_type?: string; target_id?: string; severity?: string; metadata?: Record<string,unknown> }) {
    return supabase.from("audit_logs").insert({ ...entry, severity: entry.severity ?? "info" });
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
