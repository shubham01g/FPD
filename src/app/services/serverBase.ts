/* Where the app's edge function lives. Production runs the "server" function.
   While Stripe billing is being proven in test mode, a branch build points at
   its "server-billing" copy (same code, deployed under a second name) with
   VITE_SERVER_FUNCTION=server-billing — see GO_LIVE_CHECKLIST.md. null when no
   Supabase project is connected. */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const requested = import.meta.env.VITE_SERVER_FUNCTION;

export const SERVER_FUNCTION: string =
  typeof requested === "string" && /^[a-z0-9-]+$/.test(requested) ? requested : "server";

export const SERVER_BASE: string | null = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/${SERVER_FUNCTION}/make-server-b5ad85e0`
  : null;
