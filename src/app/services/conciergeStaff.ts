/**
 * Concierge Portal staff.
 *
 * Sign-in is real Supabase Auth now: `POST /admin/concierge` creates an
 * auth.users row (with account_type=concierge so the signup trigger keeps them
 * out of public.users) and the concierge_employees row points at it. The old
 * in-memory `conciergeEmployees` array and its plaintext `authenticateConcierge`
 * are gone — sign-in goes through supabase.auth like every other portal, and
 * the roster row is read back under RLS that only exposes the caller's own.
 *
 * Still unwired: `assignedClientIds`. wg_clients.specialist_id exists but the
 * portal's client list has never been fed from it, and that is a data-wiring
 * job rather than an auth one.
 */
import { supabase } from "./supabase";

export type StaffRole = "junior_concierge" | "senior_concierge" | "lead_concierge";
export type StaffStatus = "active" | "invited" | "suspended";

export interface ConciergeEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  assignedClientIds: string[];
  invitedAt: string;
  lastLogin?: string;
  avatar: string;
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  junior_concierge: "Junior Concierge",
  senior_concierge: "Senior Concierge",
  lead_concierge:   "Lead Concierge",
};

export const ROLE_COLORS: Record<StaffRole, string> = {
  junior_concierge: "#5BA7D6",
  senior_concierge: "#5BA7D6",
  lead_concierge:   "#F7931A",
};

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatLogin(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

interface Row {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  invited_at: string;
  last_login_at: string | null;
}

function fromRow(row: Row): ConciergeEmployee {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
    status: row.status,
    assignedClientIds: [],
    invitedAt: row.invited_at,
    lastLogin: formatLogin(row.last_login_at),
    avatar: initials(row.name),
  };
}

const COLUMNS = "id, name, email, phone, role, status, invited_at, last_login_at";

/**
 * The staff row belonging to the signed-in session, or null if this account is
 * not concierge staff. RLS restricts the read to the caller's own row, so a
 * customer session simply sees nothing.
 */
export async function getMyConciergeProfile(): Promise<ConciergeEmployee | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("concierge_employees")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return fromRow(data as Row);
}

/**
 * Stamps last_login_at and promotes an accepted invite to active. The RLS
 * policy pins the resulting status to 'active' and refuses suspended rows, so
 * this cannot be used to un-suspend an account. Best-effort — a failure here
 * must not block sign-in.
 */
export async function touchConciergeLogin(employeeId: string): Promise<void> {
  await supabase
    .from("concierge_employees")
    .update({ last_login_at: new Date().toISOString(), status: "active" })
    .eq("id", employeeId);
}
