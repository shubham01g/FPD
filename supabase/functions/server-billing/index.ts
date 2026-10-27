// Second deployment of the same backend, used while Stripe billing is proven
// in test mode: production keeps calling "server" (built from main), and the
// billing branch is deployed here with test-mode Stripe secrets. Every route
// is mounted under both names in ../server/index.tsx. Deleted after cutover
// (GO_LIVE_CHECKLIST.md, Phase D).
import "../server/index.tsx";
