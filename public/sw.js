/**
 * Final Pass Down — service worker.
 *
 * Scope is deliberately narrow: this makes the app installable and lets the
 * shell survive a dropped connection. It is NOT an offline vault.
 *
 * ── WHAT IS NEVER CACHED ─────────────────────────────────────────────────
 * Nothing belonging to a user ever enters a cache:
 *   • cross-origin requests (Supabase, Stripe, fonts) are not intercepted at
 *     all — no vault data, no documents, no auth tokens on disk
 *   • /sb-api/* (the dev-only Supabase proxy, which IS same-origin) is skipped
 *   • non-GET requests are skipped
 * Caches hold only the app shell, build assets, and icons — the same bytes
 * every visitor downloads. That matters on a shared or stolen device: signing
 * out leaves nothing personal behind in Cache Storage.
 *
 * ── STRATEGIES ───────────────────────────────────────────────────────────
 *   navigations  → network-first, fall back to the cached shell when offline.
 *                  Network-first avoids the classic PWA trap of pinning users
 *                  to a stale index.html after a deploy.
 *   /assets/*    → cache-first. Vite content-hashes these, so a given URL's
 *                  bytes never change and staleness is impossible.
 *   everything else (public/media video, etc.) → straight to network.
 *
 * Bump VERSION to force every client onto a fresh cache.
 */
const VERSION = "fpd-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const KEEP = [SHELL_CACHE, ASSET_CACHE];

/** Offline fallback for navigations, plus the install-time icon set. */
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll is atomic: one 404 would reject the whole install, so each entry
      // is added on its own and a missing optional icon cannot block activation.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** Content-hashed build output — safe to serve from cache indefinitely. */
function isImmutable(url) {
  return url.pathname.startsWith("/assets/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put("/", response.clone());
    }
    return response;
  } catch (err) {
    // Offline: hand back the shell so the SPA boots and can show its own
    // connection error, rather than the browser's dinosaur.
    const cached = (await caches.match(request)) || (await caches.match("/"));
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Stripe, fonts
  if (url.pathname.startsWith("/sb-api")) return;  // dev Supabase proxy
  if (request.headers.has("range")) return;        // video seeking

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request));
  }
});
