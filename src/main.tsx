
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initGlowCursor } from "./app/glowCursor";

  initGlowCursor();
  createRoot(document.getElementById("root")!).render(<App />);
  