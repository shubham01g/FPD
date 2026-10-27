import { useCallback, useEffect, useState } from "react";
import { billing, BILLING_CHANGED, type BillingSummary } from "../services/billing";

/* The signed-in account's billing state (GET /account/billing/summary),
   refetched whenever something fires notifyBillingChanged(). */
export function useBillingSummary() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSummary(await billing.summary());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const on = () => void refresh();
    window.addEventListener(BILLING_CHANGED, on);
    return () => window.removeEventListener(BILLING_CHANGED, on);
  }, [refresh]);

  return { summary, error, loading, refresh };
}
