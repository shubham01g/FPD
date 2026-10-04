import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { useDemo } from "../context/DemoContext";
import { checkUploadAllowed, DEFAULT_SPENDING_CAP, PLAN_OVERAGE_RATE } from "../utils/spendingProtection";

/**
 * The signed-in user's spending protection cap and whether it currently
 * blocks uploads.
 *
 * The cap round-trips to storage_spend_caps rather than localStorage, so the
 * limit applies wherever the account is signed in. Until the row loads (or
 * for an account that has never saved one) the default $25 cap is in force.
 *
 * @param overageRate $/GB for the user's plan when the caller has the live
 *                    plan list; otherwise the per-plan fallback is used.
 */
export function useSpendingProtection(overageRate?: number) {
  const { authUser } = useAuth();
  const { user } = useDemo();
  const [capEnabled, setCapEnabled] = useState(true);
  const [capAmount, setCapAmount] = useState<number>(DEFAULT_SPENDING_CAP);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    void db.getStorageSpendCap(authUser.id).then(({ data }) => {
      if (cancelled || !data) return;
      setCapEnabled(data.cap_enabled);
      if (data.cap_amount_usd !== null) setCapAmount(Number(data.cap_amount_usd));
    });
    return () => { cancelled = true; };
  }, [authUser]);

  const rate = overageRate ?? PLAN_OVERAGE_RATE[user.plan] ?? 0;
  const check = useMemo(
    () => checkUploadAllowed(user.storageUsed, user.storageLimit || 1, rate, capEnabled ? capAmount : null),
    [user.storageUsed, user.storageLimit, rate, capEnabled, capAmount],
  );

  const save = useCallback(async () => {
    if (!authUser) return { error: new Error("Not signed in") };
    const { error } = await db.saveStorageSpendCap(authUser.id, capEnabled, capEnabled ? capAmount : null);
    return { error };
  }, [authUser, capEnabled, capAmount]);

  return { check, overageRate: rate, capEnabled, capAmount, setCapEnabled, setCapAmount, save };
}
