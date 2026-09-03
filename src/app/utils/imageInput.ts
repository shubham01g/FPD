/**
 * imageInput — one place that decides what a picked image is allowed to be.
 *
 * Phone cameras routinely produce 3–8MB files, so simply rejecting anything
 * over the limit would leave people unable to add most of their own photos.
 * Instead the image is shrunk first — downscaled to at most MAX_EDGE and
 * re-encoded as WebP — and only rejected if it is still too big afterwards,
 * which in practice means it was not really a photo.
 *
 * This is the same trick that took the app's hero art from 27MB to 1MB: PNG
 * and un-resized camera JPEGs are simply the wrong format for the job.
 *
 * A typical 4032x3024 phone photo comes out around 120KB.
 */

/** Longest edge kept, in CSS pixels. Comfortably sharp on a 2x display. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

/** Hard ceiling after shrinking. Nothing legitimate should exceed this. */
export const MAX_MB = 2;

export interface PreparedImage {
  /** Object URL for previewing. Caller owns it; revoke when done. */
  url: string;
  /** The shrunk image, ready to upload to Storage. */
  blob: Blob;
  originalBytes: number;
  bytes: number;
  width: number;
  height: number;
}

const bytesToMb = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;

/** Human-readable size, for messages. */
export function formatBytes(b: number): string {
  return b >= 1024 * 1024 ? `${bytesToMb(b)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file could not be read as an image.")); };
    img.src = url;
  });
}

/**
 * Validate, shrink and hand back a preview URL plus the blob to upload.
 * Throws with a message suitable for showing to the user.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That is not an image file. Please choose a JPG, PNG, HEIC or WebP.");
  }

  const img = await loadImage(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", QUALITY));
  if (!blob) throw new Error("Your browser could not process this image.");

  // Only now is a size complaint fair: the image has already been shrunk as
  // far as it usefully can be.
  if (blob.size > MAX_MB * 1024 * 1024) {
    throw new Error(
      `This image is still ${formatBytes(blob.size)} after resizing — the limit is ${MAX_MB}MB. Please choose a smaller one.`
    );
  }

  return {
    url: URL.createObjectURL(blob),
    blob,
    originalBytes: file.size,
    bytes: blob.size,
    width: w,
    height: h,
  };
}

/**
 * Message worth showing after a large photo was accepted, so the shrinking is
 * visible rather than silent. Returns null when the saving is not worth a toast.
 */
export function shrinkNotice(r: PreparedImage): string | null {
  if (r.originalBytes < 1024 * 1024) return null;
  if (r.bytes >= r.originalBytes * 0.7) return null;
  return `Photo optimised — ${formatBytes(r.originalBytes)} → ${formatBytes(r.bytes)}`;
}
