
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initGlowCursor } from "./app/glowCursor";
  import { initInstallPrompt, registerServiceWorker } from "./app/pwa";

  initGlowCursor();
  // Before render: `beforeinstallprompt` can fire earlier than React mounts.
  initInstallPrompt();
  registerServiceWorker();
  createRoot(document.getElementById("root")!).render(<App />);
