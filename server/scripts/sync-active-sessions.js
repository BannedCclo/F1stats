// Runs the actual scrape + insert for whatever check-active-sessions.js just
// found pending. Only invoked by the workflow when that check said there's
// something to do, so a browser is installed/launched rarely, not every
// 5-minute tick.
import { chromium } from "playwright"
import { getPendingSessions } from "../lib/sync/pendingSessions.js"
import { getPracticeResults } from "../lib/scrap/fp.js"
import { getQualyResults } from "../lib/scrap/qualy.js"
import { getRaceResults } from "../lib/scrap/race.js"
import { getSprintQualyResults } from "../lib/scrap/sprint/qualy.js"
import { getSprintRaceResults } from "../lib/scrap/sprint/race.js"

const PRACTICE_KEYS = new Set(["fp1", "fp2", "fp3"])

function dedupeWork(pending) {
  const work = []
  const seenPractice = new Set()

  for (const p of pending) {
    if (PRACTICE_KEYS.has(p.sessionKey)) {
      // getPracticeResults scrapes FP1/FP2/FP3 in one page load — one call
      // per race covers every practice session pending in this tick.
      if (seenPractice.has(p.raceId)) continue
      seenPractice.add(p.raceId)
      work.push({ ...p, run: getPracticeResults })
    } else if (p.sessionKey === "qualy") {
      work.push({ ...p, run: getQualyResults })
    } else if (p.sessionKey === "sprintQualy") {
      work.push({ ...p, run: getSprintQualyResults })
    } else if (p.sessionKey === "sprintRace") {
      work.push({ ...p, run: getSprintRaceResults })
    } else if (p.sessionKey === "race") {
      work.push({ ...p, run: getRaceResults })
    }
  }

  return work
}

const pending = await getPendingSessions()
const work = dedupeWork(pending)

if (work.length === 0) {
  console.log("[sync] nothing to do (window closed between check and sync steps)")
  process.exit(0)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()

let hadError = false
for (const item of work) {
  const page = await context.newPage()
  console.log(`[sync] ${item.raceId} / ${item.sessionKey} (bbc slug: ${item.bbcSlug})`)
  try {
    await item.run(item.year, item.bbcSlug, item.raceId, page)
  } catch (error) {
    hadError = true
    console.error(`[sync] ${item.raceId} / ${item.sessionKey} failed:`, error)
  } finally {
    await page.close()
  }
}

await context.close()
await browser.close()

process.exit(hadError ? 1 : 0)
