import { apiGet } from './client'
import { endpoints } from './endpoints'
import { fetchAllPages } from './paginate'
import { dedupeDrivers, DRIVER_ID_ALIASES } from '@/domain/driverAliases'
import type { RawDriver, RawDriversResponse, RawSeasonsResponse, RawStandingsResponse } from './types'

/**
 * The API has no per-driver career endpoint — no lifetime win/championship
 * counts, no debut/retirement year, no "teams raced for" list. The only
 * way to derive those is to crawl every season's drivers-championship
 * standings (1950-present) and aggregate client-side. This is expensive
 * (~80 requests) so callers should only trigger it lazily, and the result
 * is cached with `staleTime: Infinity` — it only ever runs once per browser.
 */

export interface DriverCareerStats {
  championships: number
  wins: number
  firstYear: number
  lastYear: number
  /** Every distinct team the driver has raced for, order not meaningful — use lastTeam for "most recent". */
  teams: { teamId: string; teamName: string }[]
  lastTeamId: string | null
  lastTeamName: string | null
}

export interface DriverCareerIndexResult {
  index: Record<string, DriverCareerStats>
  /** Seasons whose standings couldn't be fetched even after retries — those drivers' stats will be missing or incomplete. */
  failedYears: number[]
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const current = cursor++
      results[current] = await fn(items[current])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** A single slow/flaky response shouldn't blank out a season's worth of driver stats — retry a couple of times first. */
async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2, backoffMs = 800): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < retries) await sleep(backoffMs * (attempt + 1))
    }
  }
  throw lastError
}

/** The full ~885-driver archive — used for identity fields (name, nationality, photo link). */
export async function fetchAllDrivers(): Promise<RawDriver[]> {
  const drivers = await fetchAllPages<RawDriver>(async (offset, limit) => {
    const res = await apiGet<RawDriversResponse>(endpoints.drivers(limit, offset))
    return res.drivers
  })
  return dedupeDrivers(drivers)
}

export async function fetchAllSeasonYears(): Promise<number[]> {
  const seasons = await fetchAllPages<RawSeasonsResponse['championships'][number]>(async (offset, limit) => {
    const res = await apiGet<RawSeasonsResponse>(endpoints.seasons(limit, offset))
    return res.championships
  })
  return seasons.map((s) => s.year).sort((a, b) => a - b)
}

export async function buildDriverCareerIndex(
  years: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<DriverCareerIndexResult> {
  const index: Record<string, DriverCareerStats> = {}
  const failedYears: number[] = []
  let completed = 0

  function touch(driverId: string): DriverCareerStats {
    let stats = index[driverId]
    if (!stats) {
      stats = {
        championships: 0,
        wins: 0,
        firstYear: Infinity,
        lastYear: -Infinity,
        teams: [],
        lastTeamId: null,
        lastTeamName: null,
      }
      index[driverId] = stats
    }
    return stats
  }

  await mapWithConcurrency(years, 8, async (year) => {
    try {
      const res = await fetchWithRetry(() => apiGet<RawStandingsResponse>(endpoints.driversChampionship(year)))
      for (const item of res.drivers_championship ?? []) {
        const rawDriverId = item.driverId ?? item.driver?.driverId
        if (!rawDriverId) continue
        // Fold the rare case of an orphaned duplicate id showing up in standings onto the canonical one.
        const driverId = DRIVER_ID_ALIASES[rawDriverId] ?? rawDriverId

        const stats = touch(driverId)
        stats.wins += item.wins ?? 0
        if (item.position === 1) stats.championships += 1
        stats.firstYear = Math.min(stats.firstYear, year)

        const teamId = item.teamId ?? item.team?.teamId
        if (teamId && !stats.teams.some((t) => t.teamId === teamId)) {
          stats.teams.push({ teamId, teamName: item.team.teamName })
        }

        // Requests resolve out of order under concurrency — only treat this season as
        // "most recent" if it's actually >= the latest year already recorded.
        if (year >= stats.lastYear) {
          stats.lastYear = year
          if (teamId) {
            stats.lastTeamId = teamId
            stats.lastTeamName = item.team.teamName
          }
        }
      }
    } catch {
      // Retries already happened in fetchWithRetry — this season's data is genuinely unavailable.
      failedYears.push(year)
    } finally {
      completed += 1
      onProgress?.(completed, years.length)
    }
  })

  return { index, failedYears: failedYears.sort((a, b) => a - b) }
}
