/**
 * URL builders for every f1api.dev endpoint the app consumes. Centralized so
 * base-URL changes and query-string construction happen in one place.
 */

export const API_BASE = import.meta.env.VITE_F1_API_BASE ?? 'https://f1api.dev/api'

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return ''
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))
  return `?${search.toString()}`
}

export const endpoints = {
  seasons: (limit?: number, offset?: number) => `/seasons${qs({ limit, offset })}`,

  seasonRaces: (year: number | 'current') => `/${year}`,
  race: (year: number | 'current', round: number | string) => `/${year}/${round}`,
  lastRace: () => `/current/last`,
  nextRace: () => `/current/next`,

  driversChampionship: (year: number | 'current') => `/${year}/drivers-championship`,
  constructorsChampionship: (year: number | 'current') => `/${year}/constructors-championship`,

  sessionResult: (
    year: number | 'current',
    round: number | 'last',
    session: 'fp1' | 'fp2' | 'fp3' | 'qualy' | 'race',
  ) => `/${year}/${round}/${session}`,
  sprintResult: (
    year: number | 'current',
    round: number | 'last',
    session: 'qualy' | 'race',
  ) => `/${year}/${round}/sprint/${session}`,

  drivers: (limit?: number, offset?: number) => `/drivers${qs({ limit, offset })}`,
  driverSearch: (q: string) => `/drivers/search${qs({ q })}`,
  driver: (driverId: string) => `/drivers/${driverId}`,
  driverClassifications: (driverId: string) => `/drivers/${driverId}/classifications`,
  driversByYear: (year: number | 'current', limit?: number, offset?: number) =>
    `/${year}/drivers${qs({ limit, offset })}`,

  teams: (limit?: number, offset?: number) => `/teams${qs({ limit, offset })}`,
  teamSearch: (q: string) => `/teams/search${qs({ q })}`,
  team: (teamId: string) => `/teams/${teamId}`,
  teamClassifications: (teamId: string) => `/teams/${teamId}/classifications`,
  teamsByYear: (year: number | 'current', limit?: number, offset?: number) =>
    `/${year}/teams${qs({ limit, offset })}`,
  teamByYear: (year: number | 'current', teamId: string) => `/${year}/teams/${teamId}`,

  circuits: (limit?: number, offset?: number) => `/circuits${qs({ limit, offset })}`,
  circuitSearch: (q: string) => `/circuits/search${qs({ q })}`,
  circuit: (circuitId: string) => `/circuits/${circuitId}`,
}
