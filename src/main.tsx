
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { toast } from "sonner";
  import { initGlowCursor } from "./app/glowCursor";
  import { initInstallPrompt, onUpdateReady, registerServiceWorker } from "./app/pwa";
  import { initNetStatus } from "./app/services/netStatus";

  initGlowCursor();
  // Before render: `beforeinstallprompt` can fire earlier than React mounts.
  initInstallPrompt();
  // Connectivity is watched from startup so the shell can be honest about it
  // before any screen has tried (and failed) to load.
  initNetStatus();

  // A new build takes over on its own (the worker calls skipWaiting), so this
  // announces the swap rather than gating it — someone mid-form can finish
  // first. Sonner queues until <Toaster/> mounts, so registering here is safe.
  onUpdateReady(() => {
    toast("A new version of Final Pass Down is ready.", {
      duration: Infinity,
      action: { label: "Reload", onClick: () => window.location.reload() },
    });
  });
  registerServiceWorker();
  createRoot(document.getElementById("root")!).render(<App />);
