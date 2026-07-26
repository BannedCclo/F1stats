import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { apiGet, NotYetAvailableError } from './client'
import { endpoints } from './endpoints'
import { staleTimeForYear } from './queryClient'
import { buildDriverCareerIndex, fetchAllDrivers, fetchAllSeasonYears } from './careerStats'
import { dedupeDrivers } from '@/domain/driverAliases'
import type {
  RawCircuitsResponse,
  RawCircuitDetailResponse,
  RawDriverByIdResponse,
  RawDriverClassificationsResponse,
  RawDriversResponse,
  RawSeasonResponse,
  RawSeasonsResponse,
  RawSessionResultsResponse,
  RawSingleRaceResponse,
  RawStandingsResponse,
  RawTeamClassificationsResponse,
  RawTeamDetailResponse,
  RawTeamsResponse,
} from './types'

export type YearParam = number | 'current'

function yearStaleTime(year: YearParam) {
  return year === 'current' ? undefined : staleTimeForYear(year)
}

/** 404 on a not-yet-happened session is expected — don't burn retries on it. */
const NO_RETRY_ON_FUTURE: Pick<UseQueryOptions, 'retry'> = {
  retry: (failureCount, error) => {
    if (error instanceof NotYetAvailableError) return false
    return failureCount < 1
  },
}

// ---------------------------------------------------------------------------
// Seasons / calendar
// ---------------------------------------------------------------------------

export function useSeasons(limit: number, offset: number) {
  return useQuery({
    queryKey: ['seasons', limit, offset],
    queryFn: () => apiGet<RawSeasonsResponse>(endpoints.seasons(limit, offset)),
    staleTime: Infinity,
  })
}

export function useSeasonRaces(year: YearParam) {
  return useQuery({
    queryKey: ['season-races', year],
    queryFn: () => apiGet<RawSeasonResponse>(endpoints.seasonRaces(year)),
    staleTime: yearStaleTime(year),
  })
}

export function useRace(year: YearParam, round: number | string) {
  return useQuery({
    queryKey: ['race', year, round],
    queryFn: () => apiGet<RawSingleRaceResponse>(endpoints.race(year, round)),
    staleTime: yearStaleTime(year),
  })
}

export function useLastRace() {
  return useQuery({
    queryKey: ['last-race'],
    queryFn: () => apiGet<RawSingleRaceResponse>(endpoints.lastRace()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useNextRace() {
  return useQuery({
    queryKey: ['next-race'],
    queryFn: () => apiGet<RawSingleRaceResponse>(endpoints.nextRace()),
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export function useDriversChampionship(year: YearParam) {
  return useQuery({
    queryKey: ['drivers-championship', year],
    queryFn: () => apiGet<RawStandingsResponse>(endpoints.driversChampionship(year)),
    staleTime: yearStaleTime(year),
  })
}

export function useConstructorsChampionship(year: YearParam) {
  return useQuery({
    queryKey: ['constructors-championship', year],
    queryFn: () => apiGet<RawStandingsResponse>(endpoints.constructorsChampionship(year)),
    staleTime: yearStaleTime(year),
  })
}

// ---------------------------------------------------------------------------
// Session results
// ---------------------------------------------------------------------------

export function useSessionResult(
  year: YearParam,
  round: number | 'last',
  session: 'fp1' | 'fp2' | 'fp3' | 'qualy' | 'race',
  enabled = true,
) {
  return useQuery({
    queryKey: ['session-result', year, round, session],
    queryFn: () => apiGet<RawSessionResultsResponse>(endpoints.sessionResult(year, round, session)),
    staleTime: yearStaleTime(year),
    enabled,
    ...NO_RETRY_ON_FUTURE,
  })
}

export function useSprintResult(year: YearParam, round: number | 'last', session: 'qualy' | 'race', enabled = true) {
  return useQuery({
    queryKey: ['sprint-result', year, round, session],
    queryFn: () => apiGet<RawSessionResultsResponse>(endpoints.sprintResult(year, round, session)),
    staleTime: yearStaleTime(year),
    enabled,
    ...NO_RETRY_ON_FUTURE,
  })
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

/** The full driver archive (~885 entries) — needed for any global sort/filter, since the API can't sort itself. */
export function useAllDrivers() {
  return useQuery({
    queryKey: ['all-drivers'],
    queryFn: fetchAllDrivers,
    staleTime: Infinity,
  })
}

/**
 * Career totals (championships, wins, active years, teams raced for) derived by
 * crawling every season's standings — expensive, so it's opt-in via `enabled`
 * and cached forever once computed.
 */
export function useDriverCareerIndex(enabled: boolean, onProgress?: (done: number, total: number) => void) {
  return useQuery({
    queryKey: ['driver-career-index'],
    queryFn: async () => {
      const years = await fetchAllSeasonYears()
      onProgress?.(0, years.length)
      return buildDriverCareerIndex(years, onProgress)
    },
    staleTime: Infinity,
    enabled,
  })
}

export function useDriverSearch(q: string) {
  return useQuery({
    queryKey: ['driver-search', q],
    queryFn: () => apiGet<RawDriversResponse>(endpoints.driverSearch(q)),
    enabled: q.trim().length > 0,
    select: (data) => ({ ...data, drivers: dedupeDrivers(data.drivers) }),
  })
}

export function useDriver(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => apiGet<RawDriverByIdResponse>(endpoints.driver(driverId!)),
    enabled: !!driverId,
    staleTime: Infinity,
  })
}

export function useDriversByYear(year: YearParam, limit: number, offset: number) {
  return useQuery({
    queryKey: ['drivers-by-year', year, limit, offset],
    queryFn: () => apiGet<RawDriversResponse>(endpoints.driversByYear(year, limit, offset)),
    staleTime: yearStaleTime(year),
  })
}

/** This driver's standing (position, points, wins, team) in every season they've raced. */
export function useDriverClassifications(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-classifications', driverId],
    queryFn: () =>
      apiGet<RawDriverClassificationsResponse>(endpoints.driverClassifications(driverId!)),
    enabled: !!driverId,
    staleTime: Infinity,
  })
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export function useTeams(limit: number, offset: number) {
  return useQuery({
    queryKey: ['teams', limit, offset],
    queryFn: () => apiGet<RawTeamsResponse>(endpoints.teams(limit, offset)),
    staleTime: Infinity,
  })
}

export function useTeamSearch(q: string) {
  return useQuery({
    queryKey: ['team-search', q],
    queryFn: () => apiGet<RawTeamsResponse>(endpoints.teamSearch(q)),
    enabled: q.trim().length > 0,
  })
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId],
    queryFn: () => apiGet<RawTeamDetailResponse>(endpoints.team(teamId!)),
    enabled: !!teamId,
    staleTime: Infinity,
  })
}

export function useTeamsByYear(year: YearParam, limit: number, offset: number) {
  return useQuery({
    queryKey: ['teams-by-year', year, limit, offset],
    queryFn: () => apiGet<RawTeamsResponse>(endpoints.teamsByYear(year, limit, offset)),
    staleTime: yearStaleTime(year),
  })
}

export function useTeamByYear(year: YearParam, teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-by-year', year, teamId],
    queryFn: () => apiGet<RawTeamDetailResponse>(endpoints.teamByYear(year, teamId!)),
    enabled: !!teamId,
    staleTime: yearStaleTime(year),
  })
}

/** This team's standing (position, points, wins, races entered) in every season it competed. */
export function useTeamClassifications(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-classifications', teamId],
    queryFn: () =>
      apiGet<RawTeamClassificationsResponse>(endpoints.teamClassifications(teamId!)),
    enabled: !!teamId,
    staleTime: Infinity,
  })
}

// ---------------------------------------------------------------------------
// Circuits
// ---------------------------------------------------------------------------

export function useCircuits(limit: number, offset: number) {
  return useQuery({
    queryKey: ['circuits', limit, offset],
    queryFn: () => apiGet<RawCircuitsResponse>(endpoints.circuits(limit, offset)),
    staleTime: Infinity,
  })
}

export function useCircuitSearch(q: string) {
  return useQuery({
    queryKey: ['circuit-search', q],
    queryFn: () => apiGet<RawCircuitsResponse>(endpoints.circuitSearch(q)),
    enabled: q.trim().length > 0,
  })
}

export function useCircuit(circuitId: string | undefined) {
  return useQuery({
    queryKey: ['circuit', circuitId],
    queryFn: () => apiGet<RawCircuitDetailResponse>(endpoints.circuit(circuitId!)),
    enabled: !!circuitId,
    staleTime: Infinity,
  })
}
