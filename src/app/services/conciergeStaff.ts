/**
 * Concierge Staff Service — ConciergePortal login only now.
 *
 * The Master Admin side (ConciergeStaffAdmin.tsx) no longer uses this store:
 * it invites/manages real employees via /admin/concierge (see
 * supabase/functions/server/routes/concierge.ts), which bcrypt-hashes
 * passwords server-side and never exposes the hash to the browser.
 *
 * This file's `conciergeEmployees` array and `authenticateConcierge()` are
 * what's left of the Concierge Portal's own login — it still checks a
 * plaintext in-memory password and has no way to see employees the admin
 * really invited. The portal itself isn't wired to concierge_employees yet;
 * that's unfinished follow-up work, not something this pass touched.
 */

export type StaffRole = "junior_concierge" | "senior_concierge" | "lead_concierge";
export type StaffStatus = "active" | "invited" | "suspended";

export interface ConciergeEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  assignedClientIds: string[];   // WG client IDs this employee manages
  invitedAt: string;
  lastLogin?: string;
  inviteToken: string;           // unique token for initial login link
  password: string;              // demo: plain text; production: bcrypt hash
  avatar: string;                // initials
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

/* ── Staff list ─────────────────────────────────────────────────── */
/* Starts empty — no seeded employees or shared demo passwords. The
   concierge_employees table isn't wired yet, so staff invited here are
   in-memory only and lost on refresh. */
export let conciergeEmployees: ConciergeEmployee[] = [];

/* ── Auth ────────────────────────────────────────────────────────── */
export function authenticateConcierge(
  email: string,
  password: string
): ConciergeEmployee | null {
  const emp = conciergeEmployees.find(
    e => e.email.toLowerCase() === email.toLowerCase() && e.password === password
  );
  if (!emp || emp.status === "suspended") return null;
  // Update last login
  conciergeEmployees = conciergeEmployees.map(e =>
    e.id === emp.id
      ? { ...e, status: "active", lastLogin: new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) + " · " + new Date().toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" }) }
      : e
  );
  return emp;
}

/* ── CRUD ────────────────────────────────────────────────────────── */
export function inviteEmployee(
  data: Omit<ConciergeEmployee, "id" | "inviteToken" | "avatar" | "lastLogin">
): ConciergeEmployee {
  const emp: ConciergeEmployee = {
    ...data,
    id: `EMP-${String(Date.now()).slice(-3)}`,
    inviteToken: `TOKEN_${data.name.toUpperCase().replace(/\s+/g,"_")}_${Date.now().toString(36).toUpperCase()}`,
    avatar: data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
  };
  conciergeEmployees = [emp, ...conciergeEmployees];
  return emp;
}

export function updateEmployee(id: string, changes: Partial<ConciergeEmployee>): void {
  conciergeEmployees = conciergeEmployees.map(e => e.id === id ? { ...e, ...changes } : e);
}

export function revokeEmployee(id: string): void {
  conciergeEmployees = conciergeEmployees.map(e =>
    e.id === id ? { ...e, status: "suspended" } : e
  );
}

export function getEmployee(id: string): ConciergeEmployee | undefined {
  return conciergeEmployees.find(e => e.id === id);
}
