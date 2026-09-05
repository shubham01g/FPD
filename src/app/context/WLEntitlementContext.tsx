import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { db } from "../services/supabase";
import { useAuth } from "./AuthContext";

/**
 * White Label entitlement — the paywall for the White Label Studio.
 *
 * The Studio (brand name, logo, colours, custom domain) stays hidden until a
 * partner package has been PAID FOR. Nothing unlocks on "package selected" —
 * only on a payment the server has confirmed.
 *
 * This used to be a localStorage record, which meant the paywall could be
 * lifted from devtools. It now reads `wl_entitlements`, which grants the owner
 * SELECT and carries no user write policy at all: the only writer is the
 * service-role admin backend (routes/entitlements.ts), driven by a confirmed
 * payment. There is deliberately no client-side `activate()` any more.
 *
 * `isEntitled` remains a UX hint — every White Label *write* (config save,
 * publish, domain provisioning) must still re-check entitlement server-side.
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

interface WLEntitlementCtx {
  entitlement: WLEntitlement;
  /** True only after a payment the server confirmed. Gate White Label UI on this. */
  isEntitled: boolean;
  /** False once the first fetch settles — gate on this to avoid flashing the paywall. */
  loading: boolean;
  /** Re-read after a purchase completes or an admin changes the grant. */
  refresh: () => Promise<void>;
}

const Ctx = createContext<WLEntitlementCtx | null>(null);

export function WLEntitlementProvider({ children }: { children: React.ReactNode }) {
  const { authUser, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState<WLEntitlement>(NO_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authUser) { setEntitlement(NO_ENTITLEMENT); setLoading(false); return; }

    const { data, error } = await db.getWLEntitlement(authUser.id);
    // A missing row is the normal "never purchased" case, not a failure. On a
    // real error we stay locked: failing closed is the only safe default for a
    // paywall.
    if (error || !data) { setEntitlement(NO_ENTITLEMENT); setLoading(false); return; }

    // Same rule the local version enforced, now against a value only the
    // service role can write: no payment reference, no unlock.
    setEntitlement(
      data.entitled && data.payment_ref
        ? {
            status: "active",
            packageId: data.package_id,
            packageName: data.wl_packages?.name ?? null,
            purchasedAt: data.granted_at,
            paymentRef: data.payment_ref,
          }
        : NO_ENTITLEMENT,
    );
    setLoading(false);
  }, [authUser]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void refresh();
  }, [authLoading, refresh]);

  return (
    <Ctx.Provider value={{ entitlement, isEntitled: entitlement.status === "active", loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWLEntitlement() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWLEntitlement must be inside WLEntitlementProvider");
  return ctx;
}
