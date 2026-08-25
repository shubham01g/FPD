import React, { createContext, useContext, useEffect, useState } from "react";
import { adminApi } from "../services/adminApi";

export interface WhiteLabelConfig {
  enabled: boolean;
  companyName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoText: string;
  domain: string;
  supportEmail: string;
  senderName: string;
  features: {
    vault: boolean;
    finalWishes: boolean;
    medicalInfo: boolean;
    financialRecords: boolean;
    personalAssets: boolean;
    familyMemories: boolean;
    contacts: boolean;
    affiliate: boolean;
    partnership: boolean;
    videoMessages: boolean;
    secretVault: boolean;
  };
  planNames: { starter: string; essential: string; premium: string; legacyPro: string; enterprise: string };
  footerText: string;
  termsUrl: string;
  privacyUrl: string;
}

interface WhiteLabelCtx {
  config: WhiteLabelConfig;
  update: (patch: Partial<WhiteLabelConfig>) => void;
  updateFeature: (key: keyof WhiteLabelConfig["features"], val: boolean) => void;
  updatePlanName: (key: keyof WhiteLabelConfig["planNames"], val: string) => void;
  reset: () => void;
  publish: () => Promise<void>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** true once `config` has been edited since the last successful publish() */
  dirty: boolean;
}

export const defaultConfig: WhiteLabelConfig = {
  enabled: false,
  companyName: "Final Pass Down",
  tagline: "My Life · My Wishes · My Way",
  primaryColor: "#5B6EE1",
  accentColor: "#5B6EE1",
  logoText: "FPD",
  domain: "app.finalpassdown.com",
  supportEmail: "support@finalpassdown.com",
  senderName: "Final Pass Down",
  features: {
    vault: true, finalWishes: true, medicalInfo: true, financialRecords: true,
    personalAssets: true, familyMemories: true, contacts: true,
    affiliate: true, partnership: true, videoMessages: true, secretVault: true,
  },
  planNames: { starter: "Starter", essential: "Essential", premium: "Premium", legacyPro: "Legacy Pro", enterprise: "Enterprise" },
  footerText: "© 2026 Final Pass Down Inc. All rights reserved.",
  termsUrl: "https://finalpassdown.com/terms",
  privacyUrl: "https://finalpassdown.com/privacy",
};

interface DBWhiteLabelConfig {
  id: string;
  company_name: string;
  tagline: string | null;
  primary_color: string;
  accent_color: string;
  logo_text: string | null;
  domain: string | null;
  support_email: string | null;
  sender_name: string | null;
  features: Partial<WhiteLabelConfig["features"]>;
  plan_names: Partial<WhiteLabelConfig["planNames"]>;
  footer_text: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  is_active: boolean;
}

function fromDB(row: DBWhiteLabelConfig): WhiteLabelConfig {
  return {
    enabled: row.is_active,
    companyName: row.company_name,
    tagline: row.tagline ?? defaultConfig.tagline,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    logoText: row.logo_text ?? defaultConfig.logoText,
    domain: row.domain ?? defaultConfig.domain,
    supportEmail: row.support_email ?? defaultConfig.supportEmail,
    senderName: row.sender_name ?? defaultConfig.senderName,
    features: { ...defaultConfig.features, ...row.features },
    planNames: { ...defaultConfig.planNames, ...row.plan_names },
    footerText: row.footer_text ?? defaultConfig.footerText,
    termsUrl: row.terms_url ?? defaultConfig.termsUrl,
    privacyUrl: row.privacy_url ?? defaultConfig.privacyUrl,
  };
}

function toDB(config: WhiteLabelConfig) {
  return {
    organization: "default",
    company_name: config.companyName,
    tagline: config.tagline,
    primary_color: config.primaryColor,
    accent_color: config.accentColor,
    logo_text: config.logoText,
    domain: config.domain,
    support_email: config.supportEmail,
    sender_name: config.senderName,
    features: config.features,
    plan_names: config.planNames,
    footer_text: config.footerText,
    terms_url: config.termsUrl,
    privacy_url: config.privacyUrl,
    is_active: config.enabled,
  };
}

const WhiteLabelContext = createContext<WhiteLabelCtx | null>(null);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);
  const [savedConfig, setSavedConfig] = useState<WhiteLabelConfig>(defaultConfig);
  const [configId, setConfigId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.get<{ configs: DBWhiteLabelConfig[] }>("/white-label/configs")
      .then((res) => {
        if (cancelled) return;
        const row = res.configs?.[0];
        if (row) {
          const loaded = fromDB(row);
          setConfig(loaded);
          setSavedConfig(loaded);
          setConfigId(row.id);
        }
        // No row yet (fresh/unconnected project) — keep the built-in defaultConfig as a draft.
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load white label config"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (patch: Partial<WhiteLabelConfig>) =>
    setConfig(c => ({ ...c, ...patch }));

  const updateFeature = (key: keyof WhiteLabelConfig["features"], val: boolean) =>
    setConfig(c => ({ ...c, features: { ...c.features, [key]: val } }));

  const updatePlanName = (key: keyof WhiteLabelConfig["planNames"], val: string) =>
    setConfig(c => ({ ...c, planNames: { ...c.planNames, [key]: val } }));

  const reset = () => setConfig(savedConfig);

  const publish = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = toDB(config);
      const res = configId
        ? await adminApi.patch<{ config: DBWhiteLabelConfig }>(`/white-label/configs/${configId}`, body)
        : await adminApi.post<{ config: DBWhiteLabelConfig }>("/white-label/configs", body);
      const loaded = fromDB(res.config);
      setConfig(loaded);
      setSavedConfig(loaded);
      setConfigId(res.config.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish white label config");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const dirty = JSON.stringify(config) !== JSON.stringify(savedConfig);

  return (
    <WhiteLabelContext.Provider value={{ config, update, updateFeature, updatePlanName, reset, publish, loading, saving, error, dirty }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const ctx = useContext(WhiteLabelContext);
  if (!ctx) throw new Error("useWhiteLabel must be inside WhiteLabelProvider");
  return ctx;
}
