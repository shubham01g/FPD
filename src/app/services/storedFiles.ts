/**
 * Recordings, media and attachments that are really stored.
 *
 * Before this, voice/video messages, diary recordings, memory videos and
 * receipt scans were kept as `blob:` URLs, which point at browser memory
 * and are dead after a refresh, and attachment chips only toasted
 * "Opening…". Everything here goes to the private, metered
 * `vault-documents` bucket under "<uid>/media/…", and the storage quota is
 * checked first (migration 040).
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { checkUpload, showQuotaRefusal } from "../utils/storageQuota";

const BUCKET = "vault-documents";

/** A stored path looks like "<uid>/…"; anything else is a legacy value. */
export function isStoredPath(value: string | null | undefined): value is string {
  return Boolean(value) && !/^(blob:|data:|https?:)/.test(value!) && value!.includes("/");
}

const EXT: Record<string, string> = {
  "audio/webm": "webm", "video/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a",
  "video/mp4": "mp4", "audio/mpeg": "mp3", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

/**
 * Uploads a recording or media blob and returns its Storage path.
 * Throws (after showing the reason) when the storage limit refuses it.
 */
export async function uploadMedia(userId: string, blob: Blob, baseName: string): Promise<string> {
  const quota = await checkUpload(blob.size);
  if (quota && !quota.allowed) {
    showQuotaRefusal(quota.reason);
    throw new Error("Storage limit reached");
  }
  const type = (blob.type || "application/octet-stream").split(";")[0];
  const ext = EXT[type] ?? (baseName.includes(".") ? baseName.split(".").pop() : "bin");
  const safe = baseName.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "_").slice(0, 60) || "recording";
  const path = `${userId}/media/${crypto.randomUUID()}-${safe}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type });
  if (error) throw new Error(error.message);
  return path;
}

/** Turns a `blob:` URL from a recorder or scanner back into bytes. */
export async function blobFromObjectUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

/**
 * If `value` is a fresh blob:/data: URL, upload it and return the path;
 * a path that is already stored is returned unchanged.
 */
export async function persistMediaValue(userId: string, value: string | null | undefined, baseName: string): Promise<string | null> {
  if (!value) return null;
  if (isStoredPath(value)) return value;
  if (/^(blob:|data:)/.test(value)) return uploadMedia(userId, await blobFromObjectUrl(value), baseName);
  return value;
}

export async function signStoredFile(path: string, download?: string, seconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET)
    .createSignedUrl(path, seconds, download ? { download } : undefined);
  if (error || !data) throw new Error(error?.message ?? "Could not open the file");
  return data.signedUrl;
}

/** What attachment chips call: opens the stored file in a new tab. */
export async function openStoredFile(value: string | null | undefined, displayName?: string) {
  if (!value) return;
  if (!isStoredPath(value)) {
    // Saved before attachments were uploaded: only the name was kept.
    toast.error(`"${displayName ?? value}" was saved before files were stored, so there is nothing to open. Attach it again.`);
    return;
  }
  // Open the tab first (synchronously) so pop-up blockers allow it.
  const tab = window.open("", "_blank");
  try {
    const url = await signStoredFile(value);
    if (tab) { tab.opener = null; tab.location.href = url; } else window.location.href = url;
  } catch (err) {
    tab?.close();
    toast.error(`Could not open "${displayName ?? "file"}": ${(err as Error).message}`);
  }
}

/**
 * A playable URL for a stored recording (or the value itself when it is
 * already a URL, such as a just-recorded blob: preview).
 */
export function useStoredFileUrl(value: string | null | undefined): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    if (!value) { setUrl(""); return; }
    if (!isStoredPath(value)) { setUrl(value); return; }
    signStoredFile(value).then((u) => { if (alive) setUrl(u); }).catch(() => { if (alive) setUrl(""); });
    return () => { alive = false; };
  }, [value]);
  return url;
}
