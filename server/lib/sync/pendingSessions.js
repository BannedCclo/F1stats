import { clientWriter } from "../db.js"
import { RACE_SLUGS } from "./raceSlugs.js"
import { SESSION_TYPES, isWithinWindow } from "./sessionWindows.js"

async function isAlreadySynced(table, raceId) {
  const { rows } = await clientWriter.execute({
    sql: `SELECT 1 FROM ${table} WHERE race_id = :race_id LIMIT 1`,
    args: { race_id: raceId },
  })
  return rows.length > 0
}

/**
 * Races only need checking around their own weekend, so this pulls a narrow
 * date window (nothing scheduled more than a week either side of `now`)
 * instead of scanning the whole season on every 5-minute tick.
 */
async function fetchCandidateRaces(now) {
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString().slice(0, 10)
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString().slice(0, 10)
  const { rows } = await clientWriter.execute({
    sql: `SELECT * FROM races WHERE race_date BETWEEN :from AND :to`,
    args: { from, to },
  })
  return rows
}

/**
 * Returns the sessions that are inside their polling window right now and
 * don't have results yet. Each entry carries everything the scraper needs
 * (raceId for the DB, bbcSlug for the URL) so callers don't have to re-derive
 * either.
 */
export async function getPendingSessions(now = new Date()) {
  const races = await fetchCandidateRaces(now)
  const pending = []

  for (const race of races) {
    const bbcSlug = RACE_SLUGS[race.race_id]
    for (const sessionType of SESSION_TYPES) {
      if (!isWithinWindow(race, sessionType, now)) continue

      if (bbcSlug === undefined) {
        console.warn(`[sync] ${race.race_id}: no BBC slug mapping at all — add one to lib/sync/raceSlugs.js`)
        continue
      }
      if (bbcSlug === null) {
        console.warn(`[sync] ${race.race_id}: BBC slug not yet confirmed (see lib/sync/raceSlugs.js) — skipping ${sessionType.key}`)
        continue
      }

      if (await isAlreadySynced(sessionType.table, race.race_id)) continue

      pending.push({
        raceId: race.race_id,
        year: new Date(race.race_date).getUTCFullYear(),
        bbcSlug,
        sessionKey: sessionType.key,
      })
    }
  }

  return pending
}
