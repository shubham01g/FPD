import { useEffect, useState } from "react";
import { canPrompt, isIOS, isStandalone, promptInstall, subscribeInstall } from "../pwa";

/** Shared install-prompt state so any button on the site (shell header, homepage) stays in sync. */
export function usePwaInstall() {
  const [available, setAvailable] = useState(canPrompt());
  const [standalone, setStandalone] = useState(isStandalone());
  const ios = isIOS();

  useEffect(
    () =>
      subscribeInstall(() => {
        setAvailable(canPrompt());
        setStandalone(isStandalone());
      }),
    []
  );

  // Installing on desktop can leave the tab open; keep buttons honest.
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setStandalone(true);
    return accepted;
  };

  return { available, standalone, ios, install };
}
