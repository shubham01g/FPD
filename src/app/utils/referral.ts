/* Affiliate referrals. An affiliate shares finalpassdown.com/r/CODE (or any
   page with ?ref=CODE); the code is remembered in this browser for 60 days
   and sent with the signup, where the database links the new account to the
   affiliate (migration 041). Storage can be unavailable (private windows,
   blocked site data) — then the referral simply isn't remembered. */
const KEY = "fpd_ref";
const TTL_MS = 60 * 24 * 60 * 60 * 1000;
const CODE = /^[A-Za-z0-9]{4,32}$/;

/** Reads a referral code from the current URL, if there is one. */
export function captureReferral(): string | null {
  const fromPath = window.location.pathname.match(/^\/r\/([^/]+)\/?$/)?.[1] ?? null;
  const fromQuery = new URLSearchParams(window.location.search).get("ref");
  const code = [fromPath, fromQuery].find(c => c && CODE.test(c)) ?? null;
  if (!code) return null;
  try { localStorage.setItem(KEY, JSON.stringify({ code: code.toUpperCase(), at: Date.now() })); } catch { /* not remembered */ }
  return code.toUpperCase();
}

/** The remembered referral code, while it is still fresh. */
export function storedReferral(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number };
    return code && CODE.test(code) && at && Date.now() - at < TTL_MS ? code : null;
  } catch {
    return null;
  }
}
