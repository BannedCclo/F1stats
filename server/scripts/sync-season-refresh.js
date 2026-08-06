// Entrypoint for the season-refresh workflow (pre-season top-up of
// already-onboarded entities). Sibling to scripts/sync-season-entities.js,
// which handles first-time onboarding instead — see lib/sync/seasonRefresh.js
// for how the two jobs' write policies differ.
import { syncSeasonRefresh } from "../lib/sync/seasonRefresh.js"

try {
  await syncSeasonRefresh()
  console.log("\n[season-refresh] done")
  process.exit(0)
} catch (error) {
  console.error("[season-refresh] fatal error:", error)
  process.exit(1)
}
