// Legacy Management admin module — scope not yet defined by the client
// (deferred during Milestone 3 planning). Routing slot reserved so the
// domain list in index.tsx matches the plan; no handlers until scope lands.
import { Hono } from "npm:hono";

const legacy = new Hono();

legacy.all("*", (c) =>
  c.json({ error: "Legacy Management scope has not been defined yet — no endpoints implemented." }, 501),
);

export default legacy;
