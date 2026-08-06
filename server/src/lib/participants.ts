import { inArray } from "drizzle-orm"
import { db } from "../../db/index.js"
import {
  constructorsClassifications,
  driverClassifications,
  results,
  seasonEntries,
} from "../../db/migrations/schema.js"

function groupToMap(
  rows: { key: string | null; value: string | null }[]
): Map<string, string[]> {
  const sets = new Map<string, Set<string>>()
  for (const { key, value } of rows) {
    if (!key || !value) continue
    if (!sets.has(key)) sets.set(key, new Set())
    sets.get(key)!.add(value)
  }

  const result = new Map<string, string[]>()
  for (const [key, set] of sets) result.set(key, [...set].sort())
  return result
}

/** All championshipIds a driver has ever raced in, keyed by driverId. */
export async function getDriverSeasons(
  driverIds: string[]
): Promise<Map<string, string[]>> {
  if (driverIds.length === 0) return new Map()

  const rows = await db
    .select({
      key: driverClassifications.driverId,
      value: driverClassifications.championshipId,
    })
    .from(driverClassifications)
    .where(inArray(driverClassifications.driverId, driverIds))

  return groupToMap(rows)
}

/**
 * All driverIds entered in a championship, keyed by championshipId. Unions
 * driver_classifications (has a row only once a driver has scored) with
 * season_entries (the roster, populated pre-season straight from f1api.dev's
 * driver list — see lib/sync/seasonRefresh.js) so a season shows its full
 * grid before round 1 has produced any standings.
 */
export async function getChampionshipDriverIds(
  championshipIds: string[]
): Promise<Map<string, string[]>> {
  if (championshipIds.length === 0) return new Map()

  const [classificationRows, entryRows] = await Promise.all([
    db
      .select({
        key: driverClassifications.championshipId,
        value: driverClassifications.driverId,
      })
      .from(driverClassifications)
      .where(inArray(driverClassifications.championshipId, championshipIds)),
    db
      .select({
        key: seasonEntries.championshipId,
        value: seasonEntries.driverId,
      })
      .from(seasonEntries)
      .where(inArray(seasonEntries.championshipId, championshipIds)),
  ])

  return groupToMap([...classificationRows, ...entryRows])
}

/**
 * All teamIds entered in a championship, keyed by championshipId. Unions
 * constructors_classifications with season_entries.teamId for the same
 * pre-season-roster reason as getChampionshipDriverIds above.
 */
export async function getChampionshipTeamIds(
  championshipIds: string[]
): Promise<Map<string, string[]>> {
  if (championshipIds.length === 0) return new Map()

  const [classificationRows, entryRows] = await Promise.all([
    db
      .select({
        key: constructorsClassifications.championshipId,
        value: constructorsClassifications.teamId,
      })
      .from(constructorsClassifications)
      .where(inArray(constructorsClassifications.championshipId, championshipIds)),
    db
      .select({
        key: seasonEntries.championshipId,
        value: seasonEntries.teamId,
      })
      .from(seasonEntries)
      .where(inArray(seasonEntries.championshipId, championshipIds)),
  ])

  return groupToMap([...classificationRows, ...entryRows])
}

/** All driverIds with a race result, keyed by raceId. */
export async function getRaceDriverIds(
  raceIds: string[]
): Promise<Map<string, string[]>> {
  if (raceIds.length === 0) return new Map()

  const rows = await db
    .select({ key: results.raceId, value: results.driverId })
    .from(results)
    .where(inArray(results.raceId, raceIds))

  return groupToMap(rows)
}

/** All teamIds with a race result, keyed by raceId. */
export async function getRaceTeamIds(
  raceIds: string[]
): Promise<Map<string, string[]>> {
  if (raceIds.length === 0) return new Map()

  const rows = await db
    .select({ key: results.raceId, value: results.teamId })
    .from(results)
    .where(inArray(results.raceId, raceIds))

  return groupToMap(rows)
}
