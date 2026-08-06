// Shared f1api.dev HTTP client + entity upserts, used by both the bulk
// historical populate script (lib/populate/index.js) and the lightweight
// season-entities sync (lib/sync/seasonEntities.js). Kept in one place so
// both callers agree on exactly what a driver/team/circuit/race/
// championship row looks like — the historical circuit-duplicate bug came
// from two different code paths trusting f1api.dev's ids in two slightly
// different ways.
import { clientWriter } from "./db.js"

export const API_BASE = "https://f1api.dev/api"
export const PAGE_LIMIT = 100
export const REQUEST_DELAY_MS = 40
const MAX_RETRIES = 4

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJson(pathname) {
  const url = `${API_BASE}${pathname}`
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`  ! giving up on ${url}: ${error.message}`)
        return null
      }
      await sleep(300 * attempt)
    }
  }
}

export async function fetchAllPages(pathBuilder, itemsKey) {
  const items = []
  let offset = 0
  for (;;) {
    const data = await fetchJson(pathBuilder(PAGE_LIMIT, offset))
    await sleep(REQUEST_DELAY_MS)
    const page = data?.[itemsKey]
    if (!Array.isArray(page) || page.length === 0) break
    items.push(...page)
    if (page.length < PAGE_LIMIT) break
    offset += PAGE_LIMIT
  }
  return items
}

export async function safeExecute(label, sql, args) {
  try {
    await clientWriter.execute({ sql, args })
  } catch (error) {
    console.error(`  ! ${label} failed:`, error.message)
  }
}

// --- entity upserts -------------------------------------------------------
// Every upsert here is ON CONFLICT DO NOTHING: safe to call repeatedly with
// the same id, but deliberately never refreshes a field on a row that
// already exists (a full historical re-sync isn't what either caller wants
// mid-season — see the checkpoint handling in lib/populate/index.js). For the
// pre-season refresh job's opposite policy (fill-null-only updates on
// existing rows), see lib/f1apiRefresh.js instead.

export async function upsertDriver(d) {
  if (!d?.driverId) return
  await safeExecute(`driver ${d.driverId}`, `
    INSERT INTO drivers (driver_id, name, surname, nationality, birthday, number, short_name, url)
    VALUES (:driver_id, :name, :surname, :nationality, :birthday, :number, :short_name, :url)
    ON CONFLICT (driver_id) DO NOTHING`, {
    driver_id: d.driverId,
    name: d.name ?? "",
    surname: d.surname ?? "",
    nationality: d.nationality ?? "",
    birthday: d.birthday ?? "",
    number: d.number ?? null,
    short_name: d.shortName ?? null,
    url: d.url ?? null,
  })
}

export async function upsertTeam(t) {
  const teamId = t?.teamId
  if (!teamId) return
  await safeExecute(`team ${teamId}`, `
    INSERT INTO teams (team_id, team_name, team_nationality, first_appeareance, constructors_championships, drivers_championships, url)
    VALUES (:team_id, :team_name, :team_nationality, :first_appeareance, :constructors_championships, :drivers_championships, :url)
    ON CONFLICT (team_id) DO NOTHING`, {
    team_id: teamId,
    team_name: t.teamName ?? null,
    team_nationality: t.teamNationality ?? t.country ?? null,
    first_appeareance: t.firstAppeareance ?? t.firstAppareance ?? null,
    constructors_championships: t.constructorsChampionships ?? null,
    drivers_championships: t.driversChampionships ?? null,
    url: t.url ?? null,
  })
}

export async function upsertCircuit(c) {
  if (!c?.circuitId) return
  await safeExecute(`circuit ${c.circuitId}`, `
    INSERT INTO circuits (circuit_id, circuit_name, country, city, circuit_length, lap_record, first_participation_year, number_of_corners, fastest_lap_driver_id, fastest_lap_team_id, fastest_lap_year, url)
    VALUES (:circuit_id, :circuit_name, :country, :city, :circuit_length, :lap_record, :first_participation_year, :number_of_corners, :fastest_lap_driver_id, :fastest_lap_team_id, :fastest_lap_year, :url)
    ON CONFLICT (circuit_id) DO NOTHING`, {
    circuit_id: c.circuitId,
    circuit_name: c.circuitName ?? null,
    country: c.country ?? null,
    city: c.city ?? null,
    circuit_length: typeof c.circuitLength === "number" ? c.circuitLength : null,
    lap_record: c.lapRecord ?? null,
    first_participation_year: c.firstParticipationYear ?? null,
    number_of_corners: c.numberOfCorners ?? c.corners ?? null,
    fastest_lap_driver_id: c.fastestLapDriverId ?? null,
    fastest_lap_team_id: c.fastestLapTeamId ?? null,
    fastest_lap_year: c.fastestLapYear ?? null,
    url: c.url ?? null,
  })
}

export async function upsertChampionship(year, championship) {
  await safeExecute(`championship ${year}`, `
    INSERT INTO championships (championship_id, championship_name, url, year)
    VALUES (:championship_id, :championship_name, :url, :year)
    ON CONFLICT (championship_id) DO NOTHING`, {
    championship_id: championship?.championshipId ?? `f1_${year}`,
    championship_name: championship?.championshipName ?? null,
    url: championship?.url ?? null,
    year,
  })
}

export async function upsertRace(race) {
  const s = race.schedule ?? {}
  await safeExecute(`race ${race.raceId}`, `
    INSERT INTO races (race_id, championship_id, race_name, race_date, circuit, laps, winner_id, team_winner_id, url, round, race_time, qualy_date, fp1_date, fp2_date, fp3_date, sprint_qualy_date, sprint_race_date, qualy_time, fp1_time, fp2_time, fp3_time, sprint_qualy_time, sprint_race_time, fast_lap, fast_lap_driver_id, fast_lap_team_id)
    VALUES (:race_id, :championship_id, :race_name, :race_date, :circuit, :laps, :winner_id, :team_winner_id, :url, :round, :race_time, :qualy_date, :fp1_date, :fp2_date, :fp3_date, :sprint_qualy_date, :sprint_race_date, :qualy_time, :fp1_time, :fp2_time, :fp3_time, :sprint_qualy_time, :sprint_race_time, :fast_lap, :fast_lap_driver_id, :fast_lap_team_id)
    ON CONFLICT (race_id) DO NOTHING`, {
    race_id: race.raceId,
    championship_id: race.championshipId,
    race_name: race.raceName ?? null,
    race_date: s.race?.date ?? null,
    circuit: race.circuit?.circuitId ?? null,
    laps: race.laps ?? null,
    winner_id: race.winner?.driverId ?? null,
    team_winner_id: race.teamWinner?.teamId ?? null,
    url: race.url ?? null,
    round: race.round ?? null,
    race_time: s.race?.time ?? null,
    qualy_date: s.qualy?.date ?? null,
    fp1_date: s.fp1?.date ?? null,
    fp2_date: s.fp2?.date ?? null,
    fp3_date: s.fp3?.date ?? null,
    sprint_qualy_date: s.sprintQualy?.date ?? null,
    sprint_race_date: s.sprintRace?.date ?? null,
    qualy_time: s.qualy?.time ?? null,
    fp1_time: s.fp1?.time ?? null,
    fp2_time: s.fp2?.time ?? null,
    fp3_time: s.fp3?.time ?? null,
    sprint_qualy_time: s.sprintQualy?.time ?? null,
    sprint_race_time: s.sprintRace?.time ?? null,
    fast_lap: race.fast_lap?.fast_lap ?? null,
    fast_lap_driver_id: race.fast_lap?.fast_lap_driver_id ?? null,
    fast_lap_team_id: race.fast_lap?.fast_lap_team_id ?? null,
  })
}

export async function upsertDriverClassification(championshipId, entry) {
  await safeExecute(`driver_classification ${championshipId}/${entry.driverId}`, `
    INSERT INTO driver_classifications (championship_id, driver_id, team_id, points, position, wins)
    VALUES (:championship_id, :driver_id, :team_id, :points, :position, :wins)
    ON CONFLICT (championship_id, driver_id) DO NOTHING`, {
    championship_id: championshipId,
    driver_id: entry.driverId,
    team_id: entry.teamId ?? null,
    points: entry.points ?? null,
    position: entry.position ?? null,
    wins: entry.wins ?? null,
  })
}

export async function upsertConstructorClassification(championshipId, entry) {
  await safeExecute(`constructor_classification ${championshipId}/${entry.teamId}`, `
    INSERT INTO constructors_classifications (championship_id, team_id, points, position, wins)
    VALUES (:championship_id, :team_id, :points, :position, :wins)
    ON CONFLICT (championship_id, team_id) DO NOTHING`, {
    championship_id: championshipId,
    team_id: entry.teamId,
    points: entry.points ?? null,
    position: entry.position ?? null,
    wins: entry.wins ?? null,
  })
}
