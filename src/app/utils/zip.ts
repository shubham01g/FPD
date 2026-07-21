/**
 * Minimal ZIP writer — no dependency, no compression.
 *
 * Files are written with the "stored" method (compression = 0), which is a
 * fully valid ZIP that Explorer, Finder, and every unzip tool open natively.
 * Compression would need DEFLATE; for the text manifests the Legacy Vault
 * exports, the size difference does not justify pulling in a library.
 *
 * Spec: PKWARE APPNOTE 4.3 — local file header, central directory, EOCD.
 */

/* ── CRC-32 (IEEE 802.3), table built once on first use ── */
let CRC_TABLE: Uint32Array | null = null;

function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  CRC_TABLE = t;
  return t;
}

function crc32(bytes: Uint8Array): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ── Little-endian writers ── */
const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

/** MS-DOS date/time, the format ZIP stores timestamps in. */
function dosDateTime(d: Date): { date: number; time: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { date, time };
}

export interface ZipEntry {
  /** Path inside the archive; forward slashes create folders. */
  name: string;
  content: string | Uint8Array;
}

/**
 * Build a ZIP archive from a list of entries.
 * Returns a Blob ready for download.
 */
export function createZip(entries: ZipEntry[], now = new Date()): Blob {
  const enc = new TextEncoder();
  const { date, time } = dosDateTime(now);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  let count = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = typeof entry.content === "string" ? enc.encode(entry.content) : entry.content;
    const crc = crc32(data);
    const size = data.length;

    /* Local file header */
    const local = [
      ...u32(0x04034b50),  // signature
      ...u16(20),          // version needed
      ...u16(0x0800),      // flags: UTF-8 filenames
      ...u16(0),           // method: stored
      ...u16(time),
      ...u16(date),
      ...u32(crc),
      ...u32(size),        // compressed size
      ...u32(size),        // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0),           // extra field length
    ];
    const localHeader = new Uint8Array(local);
    localParts.push(localHeader, nameBytes, data);

    /* Central directory entry */
    const central = [
      ...u32(0x02014b50),  // signature
      ...u16(20),          // version made by
      ...u16(20),          // version needed
      ...u16(0x0800),      // flags
      ...u16(0),           // method
      ...u16(time),
      ...u16(date),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0),           // extra
      ...u16(0),           // comment
      ...u16(0),           // disk number
      ...u16(0),           // internal attrs
      ...u32(0),           // external attrs
      ...u32(offset),      // offset of local header
    ];
    centralParts.push(new Uint8Array(central), nameBytes);

    offset += localHeader.length + nameBytes.length + data.length;
    count++;
  }

  const centralSize = centralParts.reduce((n, p) => n + p.length, 0);

  /* End of central directory */
  const eocd = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),          // disk number
    ...u16(0),          // disk with central dir
    ...u16(count),      // entries on this disk
    ...u16(count),      // total entries
    ...u32(centralSize),
    ...u32(offset),     // central dir offset
    ...u16(0),          // comment length
  ]);

  return new Blob([...localParts, ...centralParts, eocd], { type: "application/zip" });
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
