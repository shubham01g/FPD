/**
 * Concierge Staff Service
 * Shared in-memory store accessed by both the Master Admin
 * (to manage employees) and the Concierge Portal (to authenticate them).
 * In production, replace with real API calls.
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
  junior_concierge: "#4A90D9",
  senior_concierge: "#9F7AEA",
  lead_concierge:   "#F7931A",
};

/* ── Seed data ──────────────────────────────────────────────────── */
export let conciergeEmployees: ConciergeEmployee[] = [
  {
    id: "EMP-001",
    name: "Marcus Williams",
    email: "marcus.williams@finalpassdown.com",
    phone: "(916) 555-0291",
    role: "senior_concierge",
    status: "active",
    assignedClientIds: ["WG-001"],
    invitedAt: "Jun 10, 2026",
    lastLogin: "Jun 26, 2026 · 9:14 AM",
    inviteToken: "TOKEN_MARCUS_001",
    password: "Concierge2026!",
    avatar: "MW",
  },
  {
    id: "EMP-002",
    name: "Patricia Chen",
    email: "patricia.chen@finalpassdown.com",
    phone: "(415) 555-0841",
    role: "senior_concierge",
    status: "active",
    assignedClientIds: ["WG-002"],
    invitedAt: "Jun 12, 2026",
    lastLogin: "Jun 25, 2026 · 3:42 PM",
    inviteToken: "TOKEN_PATRICIA_002",
    password: "Concierge2026!",
    avatar: "PC",
  },
  {
    id: "EMP-003",
    name: "James Rivera",
    email: "james.rivera@finalpassdown.com",
    phone: "(213) 555-0182",
    role: "junior_concierge",
    status: "active",
    assignedClientIds: ["WG-003"],
    invitedAt: "Jun 18, 2026",
    lastLogin: "Jun 24, 2026 · 11:05 AM",
    inviteToken: "TOKEN_JAMES_003",
    password: "Concierge2026!",
    avatar: "JR",
  },
  {
    id: "EMP-004",
    name: "Destiny Monroe",
    email: "d.monroe@finalpassdown.com",
    phone: "(404) 555-0491",
    role: "junior_concierge",
    status: "invited",
    assignedClientIds: [],
    invitedAt: "Jun 25, 2026",
    inviteToken: "TOKEN_DESTINY_004",
    password: "Welcome2026!",
    avatar: "DM",
  },
];

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
