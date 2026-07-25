/**
 * Single source of truth for storage figures shown across the app.
 * Both the Dashboard ("Storage & Usage Breakdown") and the Usage & Billing
 * page read from this so their category splits can never drift apart.
 *
 * The category GB values sum to STORAGE_USED_GB.
 */

export interface StorageCategory {
  key: string;
  label: string;
  gb: number;
  color: string;
}

export const STORAGE_USED_GB = 16.9;
export const STORAGE_LIMIT_GB = 25;

export const STORAGE_BREAKDOWN: StorageCategory[] = [
  { key: "media",     label: "Video Messages", gb: 5.5, color: "#5B6EE1" },
  { key: "financial", label: "Financial",      gb: 4.7, color: "#48BB78" },
  { key: "legal",     label: "Legal & Estate", gb: 4.2, color: "#5BA7D6" },
  { key: "photos",    label: "Photos",         gb: 1.3, color: "#FC8181" },
  { key: "personal",  label: "Personal",       gb: 0.8, color: "#5B6EE1" },
  { key: "digital",   label: "Digital Assets", gb: 0.4, color: "#ED8936" },
];

/** Sum of all category GB — equals STORAGE_USED_GB by construction. */
export const STORAGE_BREAKDOWN_TOTAL_GB = STORAGE_BREAKDOWN.reduce((s, c) => s + c.gb, 0);
