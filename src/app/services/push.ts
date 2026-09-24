/**
 * Web push (VAPID) subscription helpers.
 *
 * Requires the app to be running as the installed PWA with an active service
 * worker — `registerServiceWorker()` in pwa.ts deliberately unregisters any
 * worker in dev, so none of this can subscribe outside a production build.
 */
import { db } from "./supabase";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** True if this browser already holds a live push subscription. */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/** Requests permission, subscribes, and saves the subscription for `userId`. */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) return false;

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false; // not installed as a PWA in this session — nothing to bind the subscription to

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  if (!json.endpoint || !json.keys) return false;

  const { error } = await db.upsertPushSubscription({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
  });
  return !error;
}

/** Unsubscribes this browser and removes its saved subscription for `userId`. */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await db.deletePushSubscription(userId, endpoint);
}
