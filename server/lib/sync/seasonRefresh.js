// Pre-season "top-up" job — the counterpart to seasonEntities.js. That job
// only ever inserts rows that don't exist yet; this one revisits rows that
// already exist and fills in whatever f1api.dev has published since (a new
// circuit's lap_record, a team's championship counts) and keeps the
// season_entries roster current with who's driving for whom. Every write
// here goes through lib/f1apiRefresh.js's COALESCE-based "fill nulls only"
// updates, so it can never overwrite a value already in the database —
// including this repo's own hand data-fixes (db/migrations/0003, 0004).
// season_entries.team_id is the one deliberate exception; see
// f1apiRefresh.js for why.
//
// Runs on a much tighter schedule than season-entities-sync.yml during the
// pre-season window (.github/workflows/season-refresh.yml) because that's
// when circuits/teams/rosters actually change week to week; outside that
// window it's still safe (and cheap) to run — most days it's a no-op.
import {
  fetchJson,
  sleep,
  REQUEST_DELAY_MS,
  upsertDriver,
  upsertTeam,
} from "../f1apiClient.js"
import { refreshDriver, refreshTeam, refreshCircuit, upsertSeasonEntry } from "../f1apiRefresh.js"

async function refreshYear(year) {
  console.log(`\n=== Season refresh: ${year} ===`)

  // GET /{year}/drivers is both the roster source (it carries teamId per
  // driver) and the per-driver refresh source. A 404/empty response here
  // (e.g. every GET /2027/... call as of mid-2026) means f1api.dev doesn't
  // know this year's lineup yet — not an error — so skip it entirely rather
  // than guess from circuits/teams alone.
  const driversResp = await fetchJson(`/${year}/drivers?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  if (!driversResp?.drivers?.length) {
    console.log(`  no driver data for ${year} yet, skipping`)
    return
  }

  const championshipId = `f1_${year}`
  for (const d of driversResp.drivers) {
    // The driver/team may not have been onboarded yet by the daily sync (a
    // brand-new driver announced the same day this runs) — upsert them
    // (DO NOTHING if they already exist) before season_entries' FKs need them,
    // same ordering seasonEntities.js already uses before classifications.
    await upsertDriver(d)
    if (d.teamId) await upsertTeam({ teamId: d.teamId })
    await refreshDriver(d)
    await upsertSeasonEntry(championshipId, d)
  }
  console.log(`  ${driversResp.drivers.length} driver(s)/season-entries refreshed`)

  const circuitsResp = await fetchJson(`/${year}/circuits?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  const circuits = circuitsResp?.circuits ?? []
  for (const c of circuits) {
    await refreshCircuit(c)
  }
  console.log(`  ${circuits.length} circuit(s) checked`)

  // Team financial/history fields (championship counts, first_appeareance)
  // come off /{year}/teams directly — richer than the constructors-championship
  // standings payload seasonEntities.js uses for the initial insert, and this
  // job doesn't need points/position anyway (recomputeStandings.js owns those).
  const teamsResp = await fetchJson(`/${year}/teams?limit=100`)
  await sleep(REQUEST_DELAY_MS)
  const teams = teamsResp?.teams ?? []
  for (const t of teams) {
    await refreshTeam(t)
  }
  console.log(`  ${teams.length} team(s) checked`)
}

// Ranges over [currentYear - 1, currentYear, currentYear + 1]: last year still
// gets final-numbers updates (a lap record set at the last race, a title
// count once a championship is decided); next year's data shows up well
// before Jan 1 (refreshYear's own empty-response handling makes that case a
// cheap no-op most of the year).
export async function syncSeasonRefresh() {
  const currentYear = new Date().getFullYear()
  for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
    await refreshYear(year)
  }
}
