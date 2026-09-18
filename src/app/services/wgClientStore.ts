/**
 * White Glove Client Store — ConciergePortal / WGSchedulePage / WGDocumentInbox only.
 *
 * WhiteGloveAdmin.tsx no longer uses this: it reads/writes the real `wg_clients`
 * table via /admin/white-glove/clients (see supabase/functions/server/routes/whiteGlove.ts).
 * This in-memory store is what's left of the Concierge Portal's own session —
 * that portal's login (services/conciergeStaff.ts's authenticateConcierge) still
 * checks a plaintext in-memory password, not the real bcrypt hash the admin-side
 * invite flow now writes to concierge_employees.password_hash, so the portal
 * can't actually authenticate a real employee yet. Wiring the portal itself to
 * the database is unfinished follow-up work.
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

/* ── Client list (shared) ────────────────────────────────────────── */
/* Starts empty. wg_clients exists in the schema but no admin route reads or
   writes it yet, so clients added here are in-memory and lost on refresh. */
let _clients: WGClient[] = [];

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
