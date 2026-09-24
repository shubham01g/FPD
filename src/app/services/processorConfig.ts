/**
 * Payment processor configuration — shared by the Crypto Payments screen
 * (CryptoMerchant.tsx) and WL Onboarding Control's Processors tab
 * (PartnerOnboardingAdmin.tsx, via wlPackages.ts).
 *
 * Backed by crypto_processor_configs + the crypto_* keys in admin_settings
 * through /admin/crypto — see supabase/functions/server/routes/cryptoConfig.ts.
 *
 * Credentials come back masked. Sending a masked value back is a no-op
 * server-side, so a form can be saved after editing only one field without
 * blanking the others. `revealProcessor` fetches the real values, and is
 * written to the audit log each time.
 */
import { adminApi } from "./adminApi";

export interface ProcessorConfig {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  /** Secret fields are masked; non-secret fields are returned as stored. */
  config: Record<string, string>;
  configuredFields: string[];
  hasCredentials: boolean;
  /** Credentials exist but could not be decrypted (encryption secret missing or rotated). */
  unreadable: boolean;
  updatedAt: string;
}

export interface CryptoSettings {
  defaultProcessor: string;
  settlementCurrency: string;
  settlementFrequency: string;
  paymentWindowMinutes: string;
  minPaymentUsd: string;
  maxPaymentUsd: string;
  showToAllUsers: boolean;
}

interface SettingRow { key: string; value: string; updated_at: string }

/** admin_settings key <-> CryptoSettings field. Also drives saveCryptoSettings. */
const SETTING_FIELDS: { key: string; field: keyof CryptoSettings }[] = [
  { key: "crypto_default_processor",      field: "defaultProcessor" },
  { key: "crypto_settlement_currency",    field: "settlementCurrency" },
  { key: "crypto_settlement_frequency",   field: "settlementFrequency" },
  { key: "crypto_payment_window_minutes", field: "paymentWindowMinutes" },
  { key: "crypto_min_payment_usd",        field: "minPaymentUsd" },
  { key: "crypto_max_payment_usd",        field: "maxPaymentUsd" },
  { key: "crypto_show_to_all_users",      field: "showToAllUsers" },
];

export const DEFAULT_CRYPTO_SETTINGS: CryptoSettings = {
  defaultProcessor: "coinbase",
  settlementCurrency: "USD",
  settlementFrequency: "Daily",
  paymentWindowMinutes: "30",
  minPaymentUsd: "4.99",
  maxPaymentUsd: "9999.00",
  showToAllUsers: false,
};

function settingsFromRows(rows: SettingRow[]): CryptoSettings {
  const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const out = { ...DEFAULT_CRYPTO_SETTINGS };
  for (const { key, field } of SETTING_FIELDS) {
    const raw = byKey[key];
    if (raw === undefined) continue;
    if (field === "showToAllUsers") out.showToAllUsers = raw === "true";
    else (out[field] as string) = raw;
  }
  return out;
}

export async function getProcessorConfigs(): Promise<{ processors: ProcessorConfig[]; settings: CryptoSettings }> {
  const res = await adminApi.get<{ processors: ProcessorConfig[]; settings: SettingRow[] }>("/crypto");
  return { processors: res.processors, settings: settingsFromRows(res.settings) };
}

export async function patchProcessor(
  id: string,
  patch: { enabled?: boolean; isDefault?: boolean; config?: Record<string, string> },
): Promise<ProcessorConfig> {
  const res = await adminApi.patch<{ processor: ProcessorConfig }>(`/crypto/processors/${id}`, patch);
  return res.processor;
}

/** Decrypted credentials for one processor. Audit-logged server-side. */
export async function revealProcessor(id: string): Promise<Record<string, string>> {
  const res = await adminApi.post<{ config: Record<string, string> }>(`/crypto/processors/${id}/reveal`);
  return res.config ?? {};
}

export async function saveCryptoSettings(settings: CryptoSettings): Promise<void> {
  await Promise.all(SETTING_FIELDS.map(({ key, field }) => {
    const value = field === "showToAllUsers" ? String(settings.showToAllUsers) : String(settings[field]);
    return adminApi.patch(`/crypto/settings/${key}`, { value });
  }));
}
