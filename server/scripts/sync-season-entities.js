// Entrypoint for the daily season-entities-sync workflow. No Playwright
// here — this only talks to f1api.dev, unlike sync-active-sessions.js which
// drives a real browser against BBC Sport.
import { syncSeasonEntities } from "../lib/sync/seasonEntities.js"

try {
  await syncSeasonEntities()
  console.log("\n[season-entities] done")
  process.exit(0)
} catch (error) {
  console.error("[season-entities] fatal error:", error)
  process.exit(1)
}
