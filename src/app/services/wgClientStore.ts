/**
 * Shared White Glove Client Store
 * Single source of truth used by both WhiteGloveAdmin and ConciergePortal.
 * When admin adds or updates a client, the concierge portal reflects it immediately.
 */

export type ClientStatus = "intake" | "active" | "completed" | "paused";

export interface WGSession {
  id: string;
  date: string;
  time: string;
  type: "phone" | "video" | "in_person";
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
  duration: string;
}

export interface WGClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  plan: string;
  specialist: string;       // employee id or name key ("marcus"|"patricia"|"james")
  subscriptionWaived: boolean;
  reason: string;
  status: ClientStatus;
  intakeDate: string;
  completionPct: number;
  nextSession?: string;
  notes: string;
  sessions: WGSession[];
}

/* ── Seed data (shared) ──────────────────────────────────────────── */
let _clients: WGClient[] = [
  {
    id: "WG-001", name: "Dorothy Henderson", email: "d.henderson@email.com",
    phone: "(916) 555-0291", age: 82, plan: "Premium", specialist: "marcus",
    subscriptionWaived: true, reason: "82 years old, not tech-savvy. Daughter set up account.",
    status: "active", intakeDate: "Jun 15, 2026", completionPct: 65,
    nextSession: "Jun 28, 2026 · 2:00 PM",
    notes: "Very receptive. Prefers phone calls. Has will + insurance ready.",
    sessions: [
      { id:"S-001", date:"Jun 15, 2026", time:"10:00 AM", type:"phone",  notes:"Intake call. Explained vault structure.", status:"completed", duration:"42 min" },
      { id:"S-002", date:"Jun 20, 2026", time:"11:00 AM", type:"phone",  notes:"Uploaded will + insurance policy. Added 2 legacy contacts.", status:"completed", duration:"58 min" },
      { id:"S-003", date:"Jun 28, 2026", time:"2:00 PM",  type:"video",  notes:"", status:"scheduled", duration:"—" },
    ],
  },
  {
    id: "WG-002", name: "Walter & Edna Briggs", email: "w.briggs@email.com",
    phone: "(404) 555-0841", age: 76, plan: "Legacy Pro", specialist: "patricia",
    subscriptionWaived: false, reason: "Referred by estate attorney. Both need help navigating the platform.",
    status: "active", intakeDate: "Jun 18, 2026", completionPct: 30,
    nextSession: "Jun 27, 2026 · 3:30 PM",
    notes: "Two users, both attend sessions. Video preferred.",
    sessions: [
      { id:"S-004", date:"Jun 18, 2026", time:"3:00 PM", type:"video", notes:"Intro session. Showed dashboard and explained legacy contacts.", status:"completed", duration:"35 min" },
      { id:"S-005", date:"Jun 27, 2026", time:"3:30 PM", type:"video", notes:"", status:"scheduled", duration:"—" },
    ],
  },
  {
    id: "WG-003", name: "Margaret Thompson", email: "m.thompson@email.com",
    phone: "(213) 555-0192", age: 71, plan: "Essential", specialist: "james",
    subscriptionWaived: true, reason: "Lives alone. Upcoming medical procedure — urgent timeline.",
    status: "intake", intakeDate: "Jun 22, 2026", completionPct: 5,
    nextSession: "Jun 26, 2026 · 1:00 PM",
    notes: "Prioritize: will, medical directives, emergency contacts.",
    sessions: [
      { id:"S-006", date:"Jun 26, 2026", time:"1:00 PM", type:"phone", notes:"", status:"scheduled", duration:"—" },
    ],
  },
];

/* ── Pub/sub ─────────────────────────────────────────────────────── */
type Listener = (clients: WGClient[]) => void;
const _listeners = new Set<Listener>();

function notify() {
  _listeners.forEach(fn => fn([..._clients]));
}

export function subscribeToClients(fn: Listener): () => void {
  _listeners.add(fn);
  fn([..._clients]);
  return () => _listeners.delete(fn);
}

/* ── CRUD ────────────────────────────────────────────────────────── */
export function getAllClients(): WGClient[] {
  return [..._clients];
}

export function getClientsBySpecialist(specialistKey: string): WGClient[] {
  return _clients.filter(c => c.specialist === specialistKey);
}

export function addClient(data: Omit<WGClient, "id" | "sessions" | "completionPct" | "intakeDate" | "status">): WGClient {
  const client: WGClient = {
    ...data,
    id: `WG-${String(Date.now()).slice(-4)}`,
    status: "intake",
    intakeDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    completionPct: 0,
    sessions: [],
  };
  _clients = [client, ..._clients];
  notify();
  return client;
}

export function updateClient(id: string, changes: Partial<WGClient>): void {
  _clients = _clients.map(c => c.id === id ? { ...c, ...changes } : c);
  notify();
}

export function removeClient(id: string): void {
  _clients = _clients.filter(c => c.id !== id);
  notify();
}

/* ── Scheduling tokens ───────────────────────────────────────────── */

export interface ScheduleSlot {
  id: string;
  label: string;       // e.g. "Thursday, Jul 3 · 2:00 PM"
  selected: boolean;
}

export interface ScheduleToken {
  token: string;
  clientId: string;
  clientName: string;
  specialistName: string;
  slots: ScheduleSlot[];
  selectedSlot: ScheduleSlot | null;
  createdAt: string;
  status: "pending" | "booked" | "expired";
}

let _scheduleTokens: Map<string, ScheduleToken> = new Map();

type ScheduleListener = (token: ScheduleToken) => void;
const _scheduleListeners: Map<string, Set<ScheduleListener>> = new Map();

export function createScheduleToken(
  clientId: string,
  clientName: string,
  specialistName: string,
  slots: string[]
): ScheduleToken {
  const token = `SCH_${clientId}_${Date.now().toString(36).toUpperCase()}`;
  const scheduleToken: ScheduleToken = {
    token,
    clientId,
    clientName,
    specialistName,
    slots: slots.map((label, i) => ({ id: `slot_${i}`, label, selected: false })),
    selectedSlot: null,
    createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: "pending",
  };
  _scheduleTokens.set(token, scheduleToken);
  return scheduleToken;
}

export function getScheduleToken(token: string): ScheduleToken | undefined {
  return _scheduleTokens.get(token);
}

export function selectSlot(token: string, slotId: string): ScheduleToken | null {
  const t = _scheduleTokens.get(token);
  if (!t || t.status !== "pending") return null;
  const slot = t.slots.find(s => s.id === slotId);
  if (!slot) return null;

  const updated: ScheduleToken = {
    ...t,
    slots: t.slots.map(s => ({ ...s, selected: s.id === slotId })),
    selectedSlot: slot,
    status: "booked",
  };
  _scheduleTokens.set(token, updated);

  // Update the client's nextSession in the shared client store
  updateClient(t.clientId, { nextSession: slot.label });

  // Notify schedule listeners for this token
  _scheduleListeners.get(token)?.forEach(fn => fn(updated));
  return updated;
}

export function subscribeToScheduleToken(token: string, fn: ScheduleListener): () => void {
  if (!_scheduleListeners.has(token)) _scheduleListeners.set(token, new Set());
  _scheduleListeners.get(token)!.add(fn);
  const current = _scheduleTokens.get(token);
  if (current) fn(current);
  return () => _scheduleListeners.get(token)?.delete(fn);
}
