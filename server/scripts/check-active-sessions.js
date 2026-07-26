// Cheap pre-check for the session-sync workflow: no Playwright import here on
// purpose, so the 5-minute cron tick can decide "nothing to do" in a couple
// of seconds without installing a browser. Only when this finds pending work
// does the workflow move on to the (slower, browser-based) sync step.
import fs from "fs"
import { getPendingSessions } from "../lib/sync/pendingSessions.js"

const pending = await getPendingSessions()

if (pending.length === 0) {
  console.log("[check] nothing pending right now")
} else {
  console.log(`[check] ${pending.length} pending session(s):`)
  for (const p of pending) console.log(`  - ${p.raceId} / ${p.sessionKey}`)
}

const output = process.env.GITHUB_OUTPUT
if (output) {
  fs.appendFileSync(output, `active=${pending.length > 0}\n`)
}

process.exit(0)
