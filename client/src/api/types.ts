/**
 * Raw response shapes as returned by f1api.dev. Field names mirror the API
 * exactly, including its inconsistencies (e.g. `firstAppareance` typo on
 * some endpoints but not others, `country`/`nationality` used
 * interchangeably). Never fix these here — normalize.ts is where raw shapes
 * become the app's internal model.
 */

export interface RawPaginationEnvelope {
  api: string
  url: string
  limit: number
  offset: number
  total: number
}

export interface RawDriver {
  /** Absent when this driver is embedded inside a standings item — use the item's own driverId instead. */
  driverId?: string
  name: string
  surname: string
  nationality?: string
  country?: string
  birthday: string
  number: number | null
  shortName: string | null
  url: string
  /** All championshipIds this driver has raced in. Only present on `/drivers`, `/drivers/search`, `/drivers/:id`. */
  seasons?: string[]
}

export interface RawTeam {
  /** Absent when this team is embedded inside a standings item — use the item's own teamId instead. */
  teamId?: string
  teamName: string
  country?: string
  nationality?: string
  teamNationality?: string
  /** Three different spellings exist across endpoints — all coalesced in normalizeTeam. */
  firstAppareance?: number
  firstAppearance?: number
  firstAppeareance?: number
  constructorsChampionships: number
  driversChampionships: number
  /** Present when embedded in a standings-flavored response (e.g. team-drivers). */
  points?: number
  position?: number
  wins?: number | null
  url: string
}

export interface RawCircuit {
  circuitId: string
  circuitName: string
  country: string
  city: string
  /** Meters as a number on `/circuits`, but `"7004km"` (still meters) when nested in a race. */
  circuitLength: number | string
  lapRecord: string
  firstParticipationYear: number
  numberOfCorners?: number
  corners?: number
  fastestLapDriverId: string | null
  fastestLapTeamId: string | null
  fastestLapYear: number | null
  url: string
  /** The real track outline, when this circuit has been curated server-side. Null for the rest of the archive. */
  svg?: { path: string; viewBox: string } | null
}

export interface RawChampionship {
  championshipId: string
  championshipName: string
  url: string
  year: number
}

export interface RawSessionTime {
  date: string | null
  time: string | null
}

export interface RawSchedule {
  race: RawSessionTime
  qualy: RawSessionTime
  fp1: RawSessionTime
  fp2: RawSessionTime
  fp3: RawSessionTime
  sprintQualy: RawSessionTime
  sprintRace: RawSessionTime
}

export interface RawFastLap {
  fast_lap: string | null
  fast_lap_driver_id: string | null
  fast_lap_team_id: string | null
}

export interface RawRace {
  raceId: string
  championshipId: string
  raceName: string
  schedule: RawSchedule
  laps: number
  round: number
  url: string
  fast_lap?: RawFastLap
  circuit: RawCircuit
  winner: (RawDriver & { country?: string }) | null
  teamWinner: RawTeam | null
}

export interface RawSeasonResponse extends RawPaginationEnvelope {
  season: number
  championship: RawChampionship
  races: RawRace[]
}

export interface RawSeasonsResponse extends RawPaginationEnvelope {
  championships: RawChampionship[]
}

export interface RawSingleRaceResponse extends RawPaginationEnvelope {
  season: number
  round: number
  championship: RawChampionship
  /** Named singular, but the API still wraps it in a one-element array. */
  race: RawRace[]
}

export interface RawDriversResponse extends RawPaginationEnvelope {
  drivers: RawDriver[]
  query?: string
}

export interface RawTeamsResponse extends RawPaginationEnvelope {
  teams: RawTeam[]
  query?: string
}

export interface RawCircuitsResponse extends RawPaginationEnvelope {
  circuits: RawCircuit[]
  query?: string
}

/** `/circuits/:id` — item is array-wrapped, like the driver/team by-id endpoints. */
export interface RawCircuitDetailResponse {
  api: string
  url: string
  total: number
  circuit: RawCircuit[]
}

/** `/drivers/:id` — the all-time archive lookup. Item is array-wrapped, no year/team/results context. */
export interface RawDriverByIdResponse {
  api: string
  url: string
  total: number
  driver: RawDriver[]
}

export interface RawDriverSeasonClassification {
  championshipId: string
  season: number | null
  position: number | null
  points: number | null
  wins: number
  team: {
    teamId: string
    teamName: string | null
    country: string | null
    url: string | null
  } | null
}

/** `/drivers/:id/classifications` — this driver's standing in every season they've raced. */
export interface RawDriverClassificationsResponse {
  api: string
  url: string
  driverId: string
  total: number
  classifications: RawDriverSeasonClassification[]
}

/** `/teams/:id`, `/current/teams/:id`, `/:year/teams/:id` — item is array-wrapped. */
export interface RawTeamDetailResponse {
  api: string
  url: string
  total: number
  season?: number
  team: RawTeam[]
}

export interface RawTeamSeasonClassification {
  championshipId: string
  season: number | null
  position: number | null
  points: number | null
  wins: number
  /** Always populated, even for the many early/minor entrants that never had a tracked constructors' championship position. */
  racesEntered: number
}

/** `/teams/:id/classifications` — this team's standing in every season it competed. */
export interface RawTeamClassificationsResponse {
  api: string
  url: string
  teamId: string
  total: number
  classifications: RawTeamSeasonClassification[]
}

export interface RawTeamLineupDriver {
  driverId: string
  name: string
  surname: string
  nationality: string | null
  birthday: string
  number: number | null
  shortName: string | null
  url: string | null
  points: number | null
  position: number | null
  wins: number | null
}

/** `/current/teams/:id/drivers` and `/:year/teams/:id/drivers` — this team's driver lineup for one season. */
export interface RawTeamDriversResponse {
  api: string
  url: string
  total: number
  season: number
  teamId: string
  team: RawTeam
  drivers: { driver: RawTeamLineupDriver }[]
}

export interface RawCompareDriverInfo {
  driverId1?: string
  driverId2?: string
  name: string
  surname: string
  nationality: string
  birthday: string
  number: number | null
  shortName: string | null
  url: string | null
  teamId: string | null
}

/** Head-to-head stats, scoped to the two drivers' shared results within one season. */
export interface RawCompareResponse {
  api: string
  url: string
  season: number | string
  championshipId: string
  drivers: RawCompareDriverInfo[]
  comparison: {
    totalRaces: number
    championship: {
      totalPoints: Record<string, number | null>
      position: Record<string, number | null>
    }
    raceComparison: Record<string, number>
    qualifyingComparison: Record<string, number>
    wins: Record<string, number | null>
    podiums: Record<string, number | null>
    poles: Record<string, number | null>
    pointFinishes: Record<string, number>
    bestRaceFinish: Record<string, number>
    bestGridPosition: Record<string, number>
    dnfs: Record<string, number>
  }
}

export interface RawStandingItem {
  classificationId: number
  driverId?: string
  teamId?: string
  points: number
  position: number
  wins: number
  driver?: RawDriver
  team: RawTeam
}

export interface RawStandingsResponse extends RawPaginationEnvelope {
  season: number
  championshipId: string
  drivers_championship?: RawStandingItem[]
  constructors_championship?: RawStandingItem[]
}

export interface RawRaceResult {
  position: number | string
  points: number
  grid: number
  time: string | null
  fastLap: string | null
  retired: string | null
  driver: RawDriver
  team: RawTeam
}

export interface RawQualyResult {
  classificationId: number
  driverId: string
  teamId: string
  q1: string | null
  q2: string | null
  q3: string | null
  gridPosition: number
  driver: RawDriver
  team: RawTeam
}

/** Sprint qualifying uses `sq1`/`sq2`/`sq3`, not `q1`/`q2`/`q3`. */
export interface RawSprintQualyResult {
  sprintQualyId: number
  driverId: string
  teamId: string
  sq1: string | null
  sq2: string | null
  sq3: string | null
  gridPosition: number
  driver: RawDriver
  team: RawTeam
}

export interface RawSprintRaceResult {
  sprintRaceId: number
  driverId: string
  teamId: string
  position: number | string
  gridPosition: number
  points: number
  time?: string | null
  driver: RawDriver
  team: RawTeam
}

export interface RawPracticeResult {
  driverId: string
  teamId: string
  time: string | null
  driver: RawDriver
  team: RawTeam
}

/**
 * Named `races` (plural) but the API returns a single object, not an array
 * — the opposite wrapping convention from `/:year/:round`. The session
 * date/time is exposed under a session-prefixed key pair
 * (`fp1Date`/`fp1Time`, `qualyDate`/`qualyTime`, `raceDate`/`raceTime`, …)
 * that varies by which endpoint you called, hence the index signature.
 */
export interface RawSessionResultsRace {
  raceId: string
  raceName: string
  round: number | string
  url?: string
  /** Object on every session endpoint except `/race`, where it's array-wrapped. */
  circuit?: RawCircuit | RawCircuit[]
  fp1Results?: RawPracticeResult[]
  fp2Results?: RawPracticeResult[]
  fp3Results?: RawPracticeResult[]
  qualyResults?: RawQualyResult[]
  /** The race session's own results — despite the endpoint being `/race`, the key is just `results`. */
  results?: RawRaceResult[]
  sprintQualyResults?: RawSprintQualyResult[]
  sprintRaceResults?: RawSprintRaceResult[]
  [dateOrTimeKey: string]: unknown
}

export interface RawSessionResultsResponse extends RawPaginationEnvelope {
  season: number
  races: RawSessionResultsRace
}
