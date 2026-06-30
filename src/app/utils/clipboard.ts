/** Copy text to clipboard using execCommand fallback — works in restricted iframes */
export function copyToClipboard(text: string): void {
  try {
    // Prefer the modern async API when available and allowed
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => execCommandCopy(text));
    } else {
      execCommandCopy(text);
    }
  } catch {
    execCommandCopy(text);
  }
}

function execCommandCopy(text: string): void {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } catch {
    // Silent fail — clipboard unavailable in this environment
  }
}
