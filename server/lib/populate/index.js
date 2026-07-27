// Populates the local Postgres database with the full historical dataset
// from the public f1api.dev API (the hosted, already-populated version of
// this same project). Safe to re-run: every insert uses
// `ON CONFLICT ... DO NOTHING`, and completed seasons are checkpointed to
// .progress.json so an interrupted run can resume without re-fetching
// everything from scratch.
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import {
  PAGE_LIMIT,
  REQUEST_DELAY_MS,
  fetchJson,
  fetchAllPages,
  safeExecute,
  sleep,
  upsertDriver,
  upsertTeam,
  upsertCircuit,
  upsertChampionship,
  upsertRace,
  upsertDriverClassification,
  upsertConstructorClassification,
} from "../f1apiClient.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROGRESS_FILE = path.join(__dirname, ".progress.json")

const ROUND_CONCURRENCY = 5
const START_YEAR = parseInt(process.env.POPULATE_START_YEAR ?? "1950", 10)
const END_YEAR = parseInt(process.env.POPULATE_END_YEAR ?? "2026", 10)

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

// --- result upserts (populate-only: the season-entities sync never touches
// per-round session results, that's the BBC-based sync-active-sessions job) --

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

// Whether this season is done and this year's data can be checkpointed as
// "never needs revisiting." A year with no data yet, or with any race still
// ahead of today, is left unmarked so the next run reprocesses it — that's
// how a season picks up new drivers/circuits/races as they're announced
// instead of being frozen after the first (necessarily incomplete) pass.
function isSeasonFinished(races) {
  if (races.length === 0) return false
  const now = Date.now()
  return races.every((race) => {
    const date = race.schedule?.race?.date
    return date && new Date(date).getTime() < now
  })
}

async function processYear(year) {
  console.log(`\n=== Season ${year} ===`)

  const season = await fetchJson(`/${year}?limit=${PAGE_LIMIT}`)
  await sleep(REQUEST_DELAY_MS)
  if (!season) {
    console.log(`  no data for ${year}, skipping`)
    return false
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

  return isSeasonFinished(races)
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
    const finished = await processYear(year)
    if (finished) {
      completed.add(year)
      saveProgress({ completedYears: [...completed].sort((a, b) => a - b) })
    }
  }

  console.log("\nAll done.")
  process.exit(0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
