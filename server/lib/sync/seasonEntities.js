// Onboards new drivers, teams, and circuits as they appear each season —
// the one thing the BBC-based session-sync pipeline (sync-active-sessions.js)
// deliberately doesn't do: it only scrapes results for entities that already
// exist in the database (see pendingSessions.js). This job is what makes
// sure they exist in the first place, well before a race weekend needs them.
//
// Cheap enough (a handful of f1api.dev calls) to just run in full every
// time — no .progress.json-style checkpoint. Every insert is
// ON CONFLICT DO NOTHING via lib/f1apiClient.js, so re-running is a no-op
// once nothing's new.
import { clientWriter } from "../db.js"
import {
  fetchJson,
  fetchAllPages,
  sleep,
  REQUEST_DELAY_MS,
  upsertDriver,
  upsertTeam,
  upsertCircuit,
  upsertChampionship,
  upsertRace,
  upsertDriverClassification,
  upsertConstructorClassification,
} from "../f1apiClient.js"

function normalizeKey(value) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics after NFD decomposition
    .replace(/[^a-z0-9]/g, "")
}

async function fetchExistingRows(table, columns) {
  const { rows } = await clientWriter.execute({ sql: `SELECT ${columns.join(", ")} FROM ${table}` })
  return rows
}

// Flags — but never blocks — an insert that looks like it might be the same
// real-world entity as one we already have under a different id. This is
// exactly the failure mode behind the historical circuit-duplicate bug
// (Bahrain, Montreal, Mexico City, Austin, Paul Ricard, Barcelona-Catalunya
// all had two ids for the same track). A warning here is deliberately
// advisory, not a hard stop: a same-city-different-entity case is legitimate
// (e.g. Las Vegas's two real, distinct circuits), so blocking on a name+city
// match would risk silently dropping genuinely new data.
function warnIfLikelyDuplicate(kind, candidateId, candidateKey, existingRows, rowToKey, rowToId) {
  const match = existingRows.find((row) => rowToKey(row) === candidateKey)
  if (match) {
    console.warn(
      `  ! possible duplicate ${kind}: new id "${candidateId}" looks like existing "${rowToId(match)}" — inserted anyway, please review`,
    )
  }
}

async function syncCircuits(year) {
  const circuitsResp = await fetchJson(`/${year}/circuits?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  const circuits = circuitsResp?.circuits ?? []
  if (circuits.length === 0) return 0

  const existing = await fetchExistingRows("circuits", ["circuit_id", "circuit_name", "city"])
  const existingIds = new Set(existing.map((row) => row.circuit_id))
  const newCircuits = circuits.filter((c) => c.circuitId && !existingIds.has(c.circuitId))

  for (const c of newCircuits) {
    const key = `${normalizeKey(c.circuitName)}|${normalizeKey(c.city)}`
    warnIfLikelyDuplicate(
      "circuit",
      c.circuitId,
      key,
      existing,
      (row) => `${normalizeKey(row.circuit_name)}|${normalizeKey(row.city)}`,
      (row) => row.circuit_id,
    )
    await upsertCircuit(c)
    console.log(`  + new circuit: ${c.circuitId} (${c.circuitName})`)
  }

  return newCircuits.length
}

async function syncDrivers(year) {
  const driversResp = await fetchJson(`/${year}/drivers?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  const drivers = driversResp?.drivers ?? []
  if (drivers.length === 0) return 0

  const existing = await fetchExistingRows("drivers", ["driver_id", "name", "surname"])
  const existingIds = new Set(existing.map((row) => row.driver_id))
  const newDrivers = drivers.filter((d) => d.driverId && !existingIds.has(d.driverId))

  for (const d of newDrivers) {
    const key = `${normalizeKey(d.name)}|${normalizeKey(d.surname)}`
    warnIfLikelyDuplicate(
      "driver",
      d.driverId,
      key,
      existing,
      (row) => `${normalizeKey(row.name)}|${normalizeKey(row.surname)}`,
      (row) => row.driver_id,
    )
    await upsertDriver(d)
    console.log(`  + new driver: ${d.driverId} (${d.name} ${d.surname})`)
  }

  return newDrivers.length
}

async function syncYear(year) {
  console.log(`\n=== Season entities: ${year} ===`)

  const season = await fetchJson(`/${year}?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  if (!season) {
    console.log(`  no data for ${year} yet, skipping`)
    return
  }

  await upsertChampionship(year, season.championship)

  const newCircuitCount = await syncCircuits(year)
  const newDriverCount = await syncDrivers(year)

  // The calendar itself — lands new races before session-sync ever needs to
  // look for one.
  const races = season.races ?? []
  for (const race of races) {
    await upsertDriver(race.winner)
    await upsertTeam(race.teamWinner)
    await upsertRace(race)
  }

  // Standings entries double as the team-assignment source (and catch a
  // brand-new team, e.g. a new manufacturer entering).
  const driversChampionship = await fetchAllPages(
    (limit, offset) => `/${year}/drivers-championship?limit=${limit}&offset=${offset}`,
    "drivers_championship",
  )
  for (const entry of driversChampionship) {
    await upsertDriver(entry.driver ? { driverId: entry.driverId, ...entry.driver } : null)
    await upsertTeam(entry.team)
    await upsertDriverClassification(`f1_${year}`, entry)
  }

  const constructorsChampionship = await fetchAllPages(
    (limit, offset) => `/${year}/constructors-championship?limit=${limit}&offset=${offset}`,
    "constructors_championship",
  )
  for (const entry of constructorsChampionship) {
    await upsertTeam(entry.team ? { teamId: entry.teamId, ...entry.team } : null)
    await upsertConstructorClassification(`f1_${year}`, entry)
  }

  console.log(
    `  done: ${newCircuitCount} new circuit(s), ${newDriverCount} new driver(s), ${races.length} races, ` +
      `${driversChampionship.length} driver standings, ${constructorsChampionship.length} constructor standings`,
  )
}

// Current + next real-world year — next year's calendar/lineup is often
// partially announced (new circuits, confirmed drivers) months before the
// season actually starts, so this picks that up proactively instead of
// waiting for a hardcoded "season start" date.
export async function syncSeasonEntities() {
  const currentYear = new Date().getFullYear()
  for (const year of [currentYear, currentYear + 1]) {
    await syncYear(year)
  }
}
