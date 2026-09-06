/**
 * StoredImage — renders a photo that lives in the private `record-photos`
 * bucket (migration 016).
 *
 * The database stores a storage PATH ("{uid}/{uuid}.webp"), never a URL,
 * because the bucket is private. Turning a path into something an <img>
 * can load needs an async round trip for a signed URL, which is why this
 * is a component and a hook rather than a formatting function.
 *
 * Two things stop that round trip from being expensive:
 *
 *  - Paths requested in the same tick are coalesced into ONE
 *    createSignedUrls call. A 30-card grid signs once, not thirty times.
 *  - Results are cached module-wide until shortly before they expire, so
 *    re-renders, tab switches and reopening a modal are all free.
 *
 * Anything that is already a URL — an imported hero asset, an http(s)
 * link, a data: URI, or a live blob: preview — is passed straight
 * through untouched. That is what keeps legacy rows working: photos
 * saved before this existed are dead `blob:` strings, and they simply
 * fail to load and get hidden, exactly as they appear today.
 */
import React, { useEffect, useState } from "react";
import { db } from "../services/supabase";

/** Signed URLs are requested for an hour and dropped from the cache five
 *  minutes early, so nothing is ever served within its expiry margin. */
const TTL_SECONDS = 3600;
const CACHE_MS = (TTL_SECONDS - 300) * 1000;

const cache = new Map<string, { url: string; expiresAt: number }>();
const inflight = new Map<string, Promise<string | null>>();

let batch: string[] = [];
let batchPromise: Promise<Record<string, string>> | null = null;

/** True for values that are already loadable by an <img> as-is. */
function isDirectUrl(value: string): boolean {
  return /^(https?:|data:|blob:|\/)/.test(value);
}

function resolve(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.url);

  const existing = inflight.get(path);
  if (existing) return existing;

  batch.push(path);
  if (!batchPromise) {
    // setTimeout(0) rather than a microtask: it lets a whole list finish
    // mounting before the request goes out, which is what makes the
    // coalescing worthwhile.
    batchPromise = new Promise<Record<string, string>>((res) => {
      setTimeout(() => {
        const paths = batch;
        batch = [];
        batchPromise = null;
        db.signRecordPhotos(paths, TTL_SECONDS).then(res, () => res({}));
      }, 0);
    });
  }

  const promise = batchPromise.then((map) => {
    const url = map[path] ?? null;
    if (url) cache.set(path, { url, expiresAt: Date.now() + CACHE_MS });
    inflight.delete(path);
    return url;
  });
  inflight.set(path, promise);
  return promise;
}

/**
 * Resolve one stored photo reference to something an <img> can load.
 * Returns "" while a signed URL is still in flight or unavailable, so
 * callers can render their own placeholder with a plain falsy check.
 */
export function useSignedPhoto(value: string | null | undefined): string {
  const [url, setUrl] = useState(() => (value && isDirectUrl(value) ? value : ""));

  useEffect(() => {
    if (!value) { setUrl(""); return; }
    if (isDirectUrl(value)) { setUrl(value); return; }

    const cached = cache.get(value);
    if (cached && cached.expiresAt > Date.now()) { setUrl(cached.url); return; }

    let live = true;
    setUrl("");
    void resolve(value).then((signed) => { if (live) setUrl(signed ?? ""); });
    return () => { live = false; };
  }, [value]);

  return url;
}

type StoredImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  /** Storage path, or any direct URL, or empty. */
  src: string | null | undefined;
};

/**
 * Drop-in replacement for <img src={row.photo}>. Renders nothing at all
 * until there is something real to show, which also swallows the broken
 * image icon for legacy dead blob: values.
 */
export function StoredImage({ src, alt = "", ...rest }: StoredImageProps) {
  const url = useSignedPhoto(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [url]);

  if (!url || failed) return null;
  return <img {...rest} src={url} alt={alt} onError={() => setFailed(true)} />;
}
