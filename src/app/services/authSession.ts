/**
 * Lightweight session flags for the demo Admin/Concierge login gates.
 * sessionStorage only — no backend, mirrors the localStorage pattern
 * already used for entitlements in context/WLEntitlementContext.tsx.
 */

const ADMIN_KEY = "fpd_admin_session";
const CONCIERGE_KEY = "fpd_concierge_employee_id";

export function isAdminAuthed(): boolean {
  try { return sessionStorage.getItem(ADMIN_KEY) === "1"; } catch { return false; }
}

export function setAdminAuthed(): void {
  try { sessionStorage.setItem(ADMIN_KEY, "1"); } catch { /* private mode / quota */ }
}

export function clearAdminAuthed(): void {
  try { sessionStorage.removeItem(ADMIN_KEY); } catch { /* private mode / quota */ }
}

export function getConciergeEmployeeId(): string | null {
  try { return sessionStorage.getItem(CONCIERGE_KEY); } catch { return null; }
}

export function setConciergeEmployeeId(id: string): void {
  try { sessionStorage.setItem(CONCIERGE_KEY, id); } catch { /* private mode / quota */ }
}

export function clearConciergeEmployeeId(): void {
  try { sessionStorage.removeItem(CONCIERGE_KEY); } catch { /* private mode / quota */ }
}
