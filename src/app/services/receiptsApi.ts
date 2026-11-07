/** "Email to CPA" — supabase/functions/server/routes/receipts.ts. */
import { supabase } from "./supabase";
import { SERVER_BASE } from "./serverBase";

export async function emailReceiptPackage(body: {
  email: string; year: number; month: number; section: "personal" | "business";
  includeCSV: boolean; includeImages: boolean;
}): Promise<{ sent: true; count: number; images: number }> {
  if (!SERVER_BASE) throw new Error("No Supabase project connected (VITE_SUPABASE_URL is not set)");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Sign in again.");
  const res = await fetch(`${SERVER_BASE}/account/receipts/email-package`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null) as { error?: string } | null;
  if (!res.ok) throw new Error(json?.error ?? `Couldn't send the package (status ${res.status}).`);
  return json as { sent: true; count: number; images: number };
}
