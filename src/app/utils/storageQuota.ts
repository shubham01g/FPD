/* Upload limits are decided by the database (migration 040): the plan's
   allowance, the overage limit, and whether overage is blocked after a
   declined payment. The app asks first (storage_upload_check) so it can say
   what to do; the insert trigger refuses anything that slips past, with an
   error starting "STORAGE_QUOTA:<reason>". */
import { toast } from "sonner";
import { supabase } from "../services/supabase";

export type QuotaReason = "ok" | "limit_reached" | "cap_reached" | "overage_blocked";

export interface QuotaCheck {
  allowed: boolean;
  reason: QuotaReason;
  enforced: boolean;
  currentBytes: number;
  includedBytes: number;
  capCents: number;
  projectedOverageCents: number;
}

/** null when the check itself can't run; the database still enforces. */
export async function checkUpload(bytes: number): Promise<QuotaCheck | null> {
  const { data, error } = await supabase.rpc("storage_upload_check", { p_bytes: Math.max(0, Math.round(bytes)) });
  if (error || !data) return null;
  return data as QuotaCheck;
}

const COPY: Record<Exclude<QuotaReason, "ok">, { title: string; body: string; action: string }> = {
  limit_reached: {
    title: "Your plan's storage is full",
    body: "This plan doesn't include extra storage. Upgrade for more room, or free up space.",
    action: "See plans",
  },
  cap_reached: {
    title: "Overage limit reached",
    body: "This upload would take storage overage past your monthly limit. Raise your limit (nothing extra is charged for what was paused), or free up space.",
    action: "Raise my limit",
  },
  overage_blocked: {
    title: "Overage payment needed",
    body: "Your last storage overage payment failed, so uploads are limited to your plan's storage until it's paid.",
    action: "Pay or update card",
  },
};

/** The reason inside a database error, if it was a quota refusal. */
export function quotaReasonFromError(err: unknown): QuotaReason | null {
  const message = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  const m = message.match(/STORAGE_QUOTA:(\w+)/);
  return m && m[1] in COPY ? (m[1] as QuotaReason) : null;
}

/** Explains a refusal, with a button to Usage & Billing. */
export function showQuotaRefusal(reason: QuotaReason) {
  if (reason === "ok") return;
  const c = COPY[reason];
  toast.error(c.title, {
    description: c.body,
    duration: 9000,
    action: { label: c.action, onClick: () => window.location.assign("/dashboard?page=storage-usage") },
  });
}
