/**
 * Reads a receipt image in the browser with Tesseract.js (user decision,
 * 2026-11-07: free, no API key, the image isn't sent anywhere for OCR).
 *
 * Replaces the fake "OCR": fixed 91/63/88% confidence bars, and every scan
 * saved as "OCR verified · 95%" without anything being read.
 *
 * Tesseract is imported lazily, so it adds nothing to the main bundle; its
 * worker and English data (~4 MB) are fetched from the jsDelivr CDN the
 * first time a receipt is scanned. Results are a starting point: the review
 * form shows them for the user to confirm or correct before saving.
 */

export interface OcrField<T> { value: T | null; confidence: number }
export interface ReceiptOcrResult {
  merchant: OcrField<string>;
  amount: OcrField<number>;
  isoDate: OcrField<string>;
  /** Tesseract's mean confidence for the whole page, 0-100. */
  confidence: number;
  text: string;
}

interface Line { text: string; confidence: number }

const MONEY = /(?:\$|USD\s*)?(\d{1,3}(?:[,]\d{3})*(?:\.\d{2})|\d+\.\d{2})\b/g;
const TOTAL_WORDS = /\b(grand\s+total|total\s+due|amount\s+due|balance\s+due|total|amount|balance)\b/i;
const NOT_TOTAL = /\b(sub\s*-?\s*total|tax|tip|change|cash|savings|discount)\b/i;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

function parseDate(text: string): string | null {
  // 2026-11-07
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  // 11/07/2026 or 11/07/26 (US order)
  m = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const mo = +m[1], d = +m[2];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`;
  }
  // Nov 7, 2026
  m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (m) return `${m[3]}-${pad(MONTHS.indexOf(m[1].toLowerCase()) + 1)}-${pad(+m[2])}`;
  return null;
}

function moneyIn(text: string): number[] {
  return Array.from(text.matchAll(MONEY), (x) => Number(x[1].replace(/,/g, ""))).filter((n) => n > 0 && n < 1_000_000);
}

export function parseReceiptLines(lines: Line[]): Omit<ReceiptOcrResult, "confidence" | "text"> {
  const clean = lines.map((l) => ({ text: l.text.trim(), confidence: l.confidence })).filter((l) => l.text);

  // Merchant: the first line near the top with real letters in it.
  const merchantLine = clean.slice(0, 6).find((l) => /[A-Za-z]{3,}/.test(l.text) && !parseDate(l.text) && !moneyIn(l.text).length);

  // Amount: the largest money value on a "total" line; else the largest anywhere.
  let amountLine: Line | undefined;
  let amount: number | null = null;
  for (const l of clean) {
    if (!TOTAL_WORDS.test(l.text) || NOT_TOTAL.test(l.text)) continue;
    const vals = moneyIn(l.text);
    if (vals.length && (amount === null || Math.max(...vals) > amount)) { amount = Math.max(...vals); amountLine = l; }
  }
  if (amount === null) {
    for (const l of clean) {
      const vals = moneyIn(l.text);
      if (vals.length && (amount === null || Math.max(...vals) > amount)) { amount = Math.max(...vals); amountLine = l; }
    }
  }

  const dateLine = clean.find((l) => parseDate(l.text));

  return {
    merchant: { value: merchantLine ? merchantLine.text.replace(/[^\w&'.,\- ]+/g, "").trim().slice(0, 80) : null, confidence: Math.round(merchantLine?.confidence ?? 0) },
    amount: { value: amount, confidence: Math.round(amountLine?.confidence ?? 0) },
    isoDate: { value: dateLine ? parseDate(dateLine.text) : null, confidence: Math.round(dateLine?.confidence ?? 0) },
  };
}

/** Runs OCR on a receipt image (Blob, File, or a blob:/data: URL). */
export async function readReceipt(image: Blob | string, onProgress?: (pct: number) => void): Promise<ReceiptOcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(image);
    const lines: Line[] = (data.lines ?? []).map((l: { text: string; confidence: number }) => ({ text: l.text, confidence: l.confidence }));
    return { ...parseReceiptLines(lines), confidence: Math.round(data.confidence ?? 0), text: data.text ?? "" };
  } finally {
    await worker.terminate();
  }
}
