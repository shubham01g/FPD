import React, { createContext, useContext, useState } from "react";

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
}

export const defaultConfig: WhiteLabelConfig = {
  enabled: false,
  companyName: "Final Pass Down",
  tagline: "My Life · My Wishes · My Way",
  primaryColor: "#3A5BD9",
  accentColor: "#5B7BF5",
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

const WhiteLabelContext = createContext<WhiteLabelCtx | null>(null);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<WhiteLabelConfig>(defaultConfig);

  const update = (patch: Partial<WhiteLabelConfig>) =>
    setConfig(c => ({ ...c, ...patch }));

  const updateFeature = (key: keyof WhiteLabelConfig["features"], val: boolean) =>
    setConfig(c => ({ ...c, features: { ...c.features, [key]: val } }));

  const updatePlanName = (key: keyof WhiteLabelConfig["planNames"], val: string) =>
    setConfig(c => ({ ...c, planNames: { ...c.planNames, [key]: val } }));

  const reset = () => setConfig(defaultConfig);

  return (
    <WhiteLabelContext.Provider value={{ config, update, updateFeature, updatePlanName, reset }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  const ctx = useContext(WhiteLabelContext);
  if (!ctx) throw new Error("useWhiteLabel must be inside WhiteLabelProvider");
  return ctx;
}
