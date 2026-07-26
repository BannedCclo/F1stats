// Populates the local Postgres database with the full historical dataset
// from the public f1api.dev API (the hosted, already-populated version of
// this same project). Safe to re-run: every insert uses
// `ON CONFLICT ... DO NOTHING`, and completed seasons are checkpointed to
// .progress.json so an interrupted run can resume without re-fetching
// everything from scratch.
import { clientWriter } from "../db.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROGRESS_FILE = path.join(__dirname, ".progress.json")

const API_BASE = "https://f1api.dev/api"
const PAGE_LIMIT = 100
const REQUEST_DELAY_MS = 40
const MAX_RETRIES = 4
const ROUND_CONCURRENCY = 5
const START_YEAR = parseInt(process.env.POPULATE_START_YEAR ?? "1950", 10)
const END_YEAR = parseInt(process.env.POPULATE_END_YEAR ?? "2026", 10)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"))
  } catch {
    return { completedYears: [] }
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

async function fetchJson(pathname) {
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

async function fetchAllPages(pathBuilder, itemsKey) {
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

// Position/grid fields are sometimes non-numeric placeholders like "NC"
// (not classified) or "-" (session not run for this driver) rather than a
// real number.
function toIntOrNull(value) {
  if (value === null || value === undefined) return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

async function runWithConcurrency(items, limit, worker) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      await worker(item)
    }
  })
  await Promise.all(workers)
}

async function safeExecute(label, sql, args) {
  try {
    await clientWriter.execute({ sql, args })
  } catch (error) {
    console.error(`  ! ${label} failed:`, error.message)
  }
}

// --- entity upserts -------------------------------------------------------

async function upsertDriver(d) {
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

async function upsertTeam(t) {
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

async function upsertCircuit(c) {
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

async function upsertChampionship(year, championship) {
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

async function upsertRace(race) {
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

async function upsertDriverClassification(championshipId, entry) {
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

async function upsertConstructorClassification(championshipId, entry) {
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

async function upsertResult(raceId, r) {
  await safeExecute(`result ${raceId}/${r.driver?.driverId}`, `
    INSERT INTO results (race_id, driver_id, team_id, finishing_position, grid_position, race_time, retired, points_obtained, fast_lap)
    VALUES (:race_id, :driver_id, :team_id, :finishing_position, :grid_position, :race_time, :retired, :points_obtained, :fast_lap)
    ON CONFLICT (race_id, driver_id) DO NOTHING`, {
    race_id: raceId,
    driver_id: r.driver?.driverId,
    team_id: r.team?.teamId ?? null,
    finishing_position: toIntOrNull(r.position),
    grid_position: toIntOrNull(r.grid),
    race_time: r.time ?? null,
    retired: r.retired ?? null,
    points_obtained: r.points ?? null,
    fast_lap: r.fastLap ?? null,
  })
}

async function upsertQualyResult(raceId, r) {
  await safeExecute(`qualy ${raceId}/${r.driverId}`, `
    INSERT INTO classifications (race_id, driver_id, team_id, q1, q2, q3, grid_position)
    VALUES (:race_id, :driver_id, :team_id, :q1, :q2, :q3, :grid_position)
    ON CONFLICT (race_id, driver_id) DO NOTHING`, {
    race_id: raceId,
    driver_id: r.driverId,
    team_id: r.teamId ?? null,
    q1: r.q1 ?? null,
    q2: r.q2 ?? null,
    q3: r.q3 ?? null,
    grid_position: toIntOrNull(r.gridPosition),
  })
}

async function upsertPracticeResult(table, raceId, r) {
  await safeExecute(`${table} ${raceId}/${r.driverId}`, `
    INSERT INTO ${table} (race_id, driver_id, team_id, time)
    VALUES (:race_id, :driver_id, :team_id, :time)
    ON CONFLICT (race_id, driver_id) DO NOTHING`, {
    race_id: raceId,
    driver_id: r.driverId,
    team_id: r.teamId ?? null,
    time: r.time ?? null,
  })
}

async function upsertSprintRaceResult(raceId, r) {
  await safeExecute(`sprint_race ${raceId}/${r.driverId}`, `
    INSERT INTO sprint_race (race_id, driver_id, team_id, finishing_position, grid_position, laps, race_time, retired, points_obtained)
    VALUES (:race_id, :driver_id, :team_id, :finishing_position, :grid_position, :laps, :race_time, :retired, :points_obtained)
    ON CONFLICT (race_id, driver_id) DO NOTHING`, {
    race_id: raceId,
    driver_id: r.driverId,
    team_id: r.teamId ?? null,
    finishing_position: toIntOrNull(r.position),
    grid_position: toIntOrNull(r.gridPosition),
    laps: r.laps ?? null,
    race_time: r.time ?? null,
    retired: r.retired ?? null,
    points_obtained: r.points ?? null,
  })
}

async function upsertSprintQualyResult(raceId, r) {
  await safeExecute(`sprint_qualy ${raceId}/${r.driverId}`, `
    INSERT INTO sprint_qualy (race_id, driver_id, team_id, sq1, sq2, sq3, grid_position)
    VALUES (:race_id, :driver_id, :team_id, :sq1, :sq2, :sq3, :grid_position)
    ON CONFLICT (race_id, driver_id) DO NOTHING`, {
    race_id: raceId,
    driver_id: r.driverId,
    team_id: r.teamId ?? null,
    sq1: r.sq1 ?? null,
    sq2: r.sq2 ?? null,
    sq3: r.sq3 ?? null,
    grid_position: toIntOrNull(r.gridPosition),
  })
}

// --- per-round / per-year processing --------------------------------------

async function processRound(year, race) {
  const round = race.round
  const raceId = race.raceId

  const raceDetail = await fetchJson(`/${year}/${round}/race`)
  await sleep(REQUEST_DELAY_MS)
  const raceResults = raceDetail?.races?.results ?? []
  for (const r of raceResults) {
    await upsertDriver(r.driver)
    await upsertTeam(r.team)
    await upsertResult(raceId, r)
  }

  // f1api.dev's season-list `winner`/`teamWinner` convenience fields are
  // null for a lot of older seasons even though the actual race results
  // (fetched above) have a P1 finisher. Backfill from there when needed.
  if (!race.winner?.driverId) {
    const winnerResult = raceResults.find((r) => r.position === "1" || r.position === 1)
    if (winnerResult?.driver?.driverId) {
      await safeExecute(`backfill winner ${raceId}`, `
        UPDATE races SET winner_id = :winner_id, team_winner_id = :team_winner_id
        WHERE race_id = :race_id AND winner_id IS NULL`, {
        winner_id: winnerResult.driver.driverId,
        team_winner_id: winnerResult.team?.teamId ?? null,
        race_id: raceId,
      })
    }
  }

  const qualy = await fetchJson(`/${year}/${round}/qualy`)
  await sleep(REQUEST_DELAY_MS)
  for (const r of qualy?.races?.qualyResults ?? []) {
    await upsertDriver(r.driver)
    await upsertTeam(r.team)
    await upsertQualyResult(raceId, r)
  }

  for (const session of ["fp1", "fp2", "fp3"]) {
    const fp = await fetchJson(`/${year}/${round}/${session}`)
    await sleep(REQUEST_DELAY_MS)
    for (const r of fp?.races?.[`${session}Results`] ?? []) {
      await upsertDriver(r.driver)
      await upsertTeam(r.team)
      await upsertPracticeResult(session, raceId, r)
    }
  }

  const sprintRace = await fetchJson(`/${year}/${round}/sprint/race`)
  await sleep(REQUEST_DELAY_MS)
  for (const r of sprintRace?.races?.sprintRaceResults ?? []) {
    await upsertDriver(r.driver)
    await upsertTeam(r.team)
    await upsertSprintRaceResult(raceId, r)
  }

  const sprintQualy = await fetchJson(`/${year}/${round}/sprint/qualy`)
  await sleep(REQUEST_DELAY_MS)
  for (const r of sprintQualy?.races?.sprintQualyResults ?? []) {
    await upsertDriver(r.driver)
    await upsertTeam(r.team)
    await upsertSprintQualyResult(raceId, r)
  }
}

async function processYear(year) {
  console.log(`\n=== Season ${year} ===`)

  const season = await fetchJson(`/${year}?limit=${PAGE_LIMIT}`)
  await sleep(REQUEST_DELAY_MS)
  if (!season) {
    console.log(`  no data for ${year}, skipping`)
    return
  }

  await upsertChampionship(year, season.championship)

  const races = season.races ?? []
  console.log(`  ${races.length} races`)
  for (const race of races) {
    await upsertDriver(race.winner)
    await upsertTeam(race.teamWinner)
    await upsertRace(race)
  }

  await runWithConcurrency(races, ROUND_CONCURRENCY, (race) => processRound(year, race))

  const driversChampionship = await fetchAllPages(
    (limit, offset) => `/${year}/drivers-championship?limit=${limit}&offset=${offset}`,
    "drivers_championship"
  )
  for (const entry of driversChampionship) {
    await upsertDriver(entry.driver ? { driverId: entry.driverId, ...entry.driver } : null)
    await upsertTeam(entry.team)
    await upsertDriverClassification(`f1_${year}`, entry)
  }

  const constructorsChampionship = await fetchAllPages(
    (limit, offset) => `/${year}/constructors-championship?limit=${limit}&offset=${offset}`,
    "constructors_championship"
  )
  for (const entry of constructorsChampionship) {
    await upsertTeam(entry.team ? { teamId: entry.teamId, ...entry.team } : null)
    await upsertConstructorClassification(`f1_${year}`, entry)
  }

  console.log(`  done: ${races.length} races, ${driversChampionship.length} driver standings, ${constructorsChampionship.length} constructor standings`)
}

async function main() {
  const progress = loadProgress()
  const completed = new Set(progress.completedYears)

  if (!process.env.POPULATE_SKIP_GLOBALS) {
    console.log("Populating drivers (global list)...")
    const drivers = await fetchAllPages((limit, offset) => `/drivers?limit=${limit}&offset=${offset}`, "drivers")
    for (const d of drivers) await upsertDriver(d)
    console.log(`  ${drivers.length} drivers`)

    console.log("Populating teams (global list)...")
    const teams = await fetchAllPages((limit, offset) => `/teams?limit=${limit}&offset=${offset}`, "teams")
    for (const t of teams) await upsertTeam(t)
    console.log(`  ${teams.length} teams`)

    console.log("Populating circuits (global list)...")
    const circuits = await fetchAllPages((limit, offset) => `/circuits?limit=${limit}&offset=${offset}`, "circuits")
    for (const c of circuits) await upsertCircuit(c)
    console.log(`  ${circuits.length} circuits`)
  }

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    if (completed.has(year)) {
      console.log(`\n=== Season ${year} === already completed, skipping`)
      continue
    }
    await processYear(year)
    completed.add(year)
    saveProgress({ completedYears: [...completed].sort((a, b) => a - b) })
  }

  console.log("\nAll done.")
  process.exit(0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
