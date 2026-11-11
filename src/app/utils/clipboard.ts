/** Copy text to the clipboard. Resolves to whether it actually worked, so a
 *  caller can say "Copied" only when it is true. Tries the async Clipboard API
 *  first and falls back to execCommand (works in restricted iframes). */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback below.
  }
  return execCommandCopy(text);
}

function execCommandCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Copy, then say what really happened. On failure the text is shown in a
 *  prompt so it can still be copied by hand (nothing is silently lost — an
 *  invite link or temporary password may exist nowhere else). */
export async function copyWithToast(text: string, successMessage: string): Promise<boolean> {
  const { toast } = await import("sonner");
  const ok = await copyToClipboard(text);
  if (ok) toast.success(successMessage);
  else {
    toast.error("Couldn't copy automatically — copy it from the box instead.");
    window.prompt("Copy this:", text);
  }
  return ok;
}
