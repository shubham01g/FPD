import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * White Label entitlement — the paywall for the White Label Studio.
 *
 * The Studio (brand name, logo, colours, custom domain) stays completely
 * hidden until a partner package has been PAID FOR. Nothing here unlocks on
 * "package selected" — only on a confirmed payment reference.
 *
 * ⚠️ SERVER ENFORCEMENT REQUIRED BEFORE LAUNCH
 * This is a client-side gate. It hides UI, it does not secure anything — a
 * determined user can flip localStorage in devtools. Before taking real money,
 * `activate()` must be driven by a webhook-confirmed payment on your backend,
 * and every White Label write (config save, publish, domain provisioning) must
 * re-check entitlement server-side. Treat `isEntitled` as a UX hint only.
 */

export type WLEntitlementStatus = "none" | "active";

export interface WLEntitlement {
  status:      WLEntitlementStatus;
  packageId:   string | null;
  packageName: string | null;
  purchasedAt: string | null;   // ISO date
  paymentRef:  string | null;   // processor transaction id
}

export const NO_ENTITLEMENT: WLEntitlement = {
  status: "none", packageId: null, packageName: null, purchasedAt: null, paymentRef: null,
};

const STORAGE_KEY = "fpd_wl_entitlement";

/** Demo persistence. Replace with a GET /v1/wl/entitlement call server-side. */
function load(): WLEntitlement {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return NO_ENTITLEMENT;
    const parsed = JSON.parse(raw) as WLEntitlement;
    // A record without a payment reference is not a valid entitlement.
    if (parsed?.status === "active" && parsed?.paymentRef) return parsed;
    return NO_ENTITLEMENT;
  } catch {
    return NO_ENTITLEMENT;
  }
}

interface WLEntitlementCtx {
  entitlement: WLEntitlement;
  /** True only after a confirmed payment. Gate all White Label UI on this. */
  isEntitled: boolean;
  /** Call ONLY from a successful payment callback. */
  activate: (p: { packageId: string; packageName: string; paymentRef: string }) => void;
  /** Refund / chargeback / cancellation — re-locks the Studio. */
  revoke: () => void;
}

const Ctx = createContext<WLEntitlementCtx | null>(null);

export function WLEntitlementProvider({ children }: { children: React.ReactNode }) {
  const [entitlement, setEntitlement] = useState<WLEntitlement>(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement)); } catch { /* quota / private mode */ }
  }, [entitlement]);

  const activate: WLEntitlementCtx["activate"] = ({ packageId, packageName, paymentRef }) => {
    if (!paymentRef) return; // no payment reference → no unlock
    setEntitlement({
      status: "active",
      packageId,
      packageName,
      purchasedAt: new Date().toISOString(),
      paymentRef,
    });
  };

  const revoke = () => setEntitlement(NO_ENTITLEMENT);

  return (
    <Ctx.Provider value={{ entitlement, isEntitled: entitlement.status === "active", activate, revoke }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWLEntitlement() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWLEntitlement must be inside WLEntitlementProvider");
  return ctx;
}
