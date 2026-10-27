import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notifyBillingChanged } from "../services/billing";

/* Stripe sends the buyer back to /dashboard?page=…&payment=success (or
   =cancelled). The purchase takes effect when the signed webhook arrives,
   usually within seconds, so for half a minute the app keeps re-reading the
   account. `confirming` lets the portal show "Confirming your payment…"
   instead of a plan wall the webhook is about to lift. */
const POLL_AT_MS = [0, 2000, 4000, 7000, 11000, 16000, 23000, 30000];

// Handled once per page load (StrictMode runs effects twice in development).
let handled = false;

export function usePaymentReturn(): { confirming: boolean } {
  const [outcome] = useState(() => new URLSearchParams(window.location.search).get("payment"));
  const [confirming, setConfirming] = useState(outcome === "success");

  useEffect(() => {
    if (!outcome || handled) return;
    handled = true;
    // Drop the payment params so a reload doesn't repeat this; keep ?page.
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("session_id");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    if (outcome === "cancelled") {
      toast.info("Checkout cancelled. Nothing was charged.");
      return;
    }
    if (outcome !== "success") return;
    toast.success("Payment received. Thank you!");
    // Not cleared on unmount: they only ask screens to re-read billing.
    POLL_AT_MS.forEach(ms => setTimeout(notifyBillingChanged, ms));
    setTimeout(() => setConfirming(false), POLL_AT_MS[POLL_AT_MS.length - 1] + 1000);
  }, [outcome]);

  return { confirming };
}
