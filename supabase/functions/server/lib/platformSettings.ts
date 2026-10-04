// Reads the platform.* preference documents that System → Settings writes to
// admin_settings (routes/settings.ts), for the code that enforces them: the
// public /platform endpoint and the admin IP allowlist.
import { adminClient } from "./supabaseAdmin.ts";

export async function readPlatformSection(section: string): Promise<Record<string, unknown>> {
  const { data } = await adminClient()
    .from("admin_settings")
    .select("value")
    .eq("key", `platform.${section}`)
    .maybeSingle();
  if (!data?.value) return {};
  try {
    const parsed = JSON.parse(data.value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** The caller's address as the gateway reports it (first hop of x-forwarded-for). */
export function clientIp(header: string | undefined): string | null {
  const first = header?.split(",")[0]?.trim();
  return first || null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = n * 256 + octet;
  }
  return n;
}

/** True when `ip` equals an entry or falls inside an IPv4 CIDR entry
 *  ("203.0.113.0/24"). Anything that isn't IPv4 only matches exactly. */
export function ipAllowed(ip: string, allowlist: string[]): boolean {
  const addr = ipv4ToInt(ip);
  return allowlist.some((entry) => {
    const rule = entry.trim();
    if (rule === ip) return true;
    const [base, bitsRaw] = rule.split("/");
    const baseInt = ipv4ToInt(base);
    if (addr === null || baseInt === null || bitsRaw === undefined) return false;
    const bits = Number(bitsRaw);
    if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
    if (bits === 0) return true;
    const size = 2 ** (32 - bits);
    return Math.floor(addr / size) === Math.floor(baseInt / size);
  });
}
