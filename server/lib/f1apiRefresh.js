// Companion to f1apiClient.js with the opposite upsert policy: every function
// here only ever fills a column that's currently NULL (via COALESCE), and
// never touches a column that already has a value. Used exclusively by the
// pre-season refresh job (lib/sync/seasonRefresh.js), never by the daily
// onboarding sync (lib/sync/seasonEntities.js) — that one's upserts stay
// insert-only on purpose, see f1apiClient.js's own header. This file exists
// specifically so a manual data-fix from a migration (0003/0004's circuit
// dedupe, a hand-corrected lap_record) can never be clobbered by a refresh
// run: COALESCE always prefers the value already in the row.
//
// Unlike f1apiClient.js's upserts (INSERT ... ON CONFLICT, because the row
// may not exist yet), these are plain UPDATEs: the row is always expected to
// already exist (the daily sync creates it), so an UPDATE that matches
// nothing is the honest outcome — this job doesn't do onboarding.
import { safeExecute } from "./f1apiClient.js"

export async function refreshDriver(d) {
  if (!d?.driverId) return
  await safeExecute(`refresh driver ${d.driverId}`, `
    UPDATE drivers SET
      number = COALESCE(number, :number),
      short_name = COALESCE(short_name, :short_name),
      url = COALESCE(url, :url)
    WHERE driver_id = :driver_id
      AND (number IS NULL OR short_name IS NULL OR url IS NULL)`, {
    driver_id: d.driverId,
    number: d.number ?? null,
    short_name: d.shortName ?? null,
    url: d.url ?? null,
  })
}

export async function refreshTeam(t) {
  const teamId = t?.teamId
  if (!teamId) return
  await safeExecute(`refresh team ${teamId}`, `
    UPDATE teams SET
      team_name = COALESCE(team_name, :team_name),
      team_nationality = COALESCE(team_nationality, :team_nationality),
      first_appeareance = COALESCE(first_appeareance, :first_appeareance),
      constructors_championships = COALESCE(constructors_championships, :constructors_championships),
      drivers_championships = COALESCE(drivers_championships, :drivers_championships),
      url = COALESCE(url, :url)
    WHERE team_id = :team_id
      AND (team_name IS NULL OR team_nationality IS NULL OR first_appeareance IS NULL
           OR constructors_championships IS NULL OR drivers_championships IS NULL OR url IS NULL)`, {
    team_id: teamId,
    team_name: t.teamName ?? null,
    team_nationality: t.teamNationality ?? t.country ?? null,
    first_appeareance: t.firstAppeareance ?? t.firstAppareance ?? null,
    constructors_championships: t.constructorsChampionships ?? null,
    drivers_championships: t.driversChampionships ?? null,
    url: t.url ?? null,
  })
}

export async function refreshCircuit(c) {
  if (!c?.circuitId) return
  await safeExecute(`refresh circuit ${c.circuitId}`, `
    UPDATE circuits SET
      country = COALESCE(country, :country),
      city = COALESCE(city, :city),
      circuit_length = COALESCE(circuit_length, :circuit_length),
      lap_record = COALESCE(lap_record, :lap_record),
      number_of_corners = COALESCE(number_of_corners, :number_of_corners),
      first_participation_year = COALESCE(first_participation_year, :first_participation_year),
      fastest_lap_driver_id = COALESCE(fastest_lap_driver_id, :fastest_lap_driver_id),
      fastest_lap_team_id = COALESCE(fastest_lap_team_id, :fastest_lap_team_id),
      fastest_lap_year = COALESCE(fastest_lap_year, :fastest_lap_year),
      url = COALESCE(url, :url)
    WHERE circuit_id = :circuit_id
      AND (country IS NULL OR city IS NULL OR circuit_length IS NULL OR lap_record IS NULL
           OR number_of_corners IS NULL OR first_participation_year IS NULL
           OR fastest_lap_driver_id IS NULL OR fastest_lap_team_id IS NULL
           OR fastest_lap_year IS NULL OR url IS NULL)`, {
    circuit_id: c.circuitId,
    country: c.country ?? null,
    city: c.city ?? null,
    circuit_length: typeof c.circuitLength === "number" ? c.circuitLength : null,
    lap_record: c.lapRecord ?? null,
    number_of_corners: c.numberOfCorners ?? c.corners ?? null,
    first_participation_year: c.firstParticipationYear ?? null,
    fastest_lap_driver_id: c.fastestLapDriverId ?? null,
    fastest_lap_team_id: c.fastestLapTeamId ?? null,
    fastest_lap_year: c.fastestLapYear ?? null,
    url: c.url ?? null,
  })
}

// season_entries is the deliberate exception to "fill nulls only": team_id
// must actually change when a driver moves teams during the pre-season
// window — that's the whole point of this table. COALESCE-protecting team_id
// the way every other function here does would make the first team we ever
// saw a driver linked to stick forever, which is backwards for a table whose
// entire job is tracking *current* team assignment. championship_id and
// driver_id are the ON CONFLICT key so they never change; last_seen_at always
// advances to now() so a stale row (a driver dropped from next year's
// provisional entry list) can be detected later.
export async function upsertSeasonEntry(championshipId, entry) {
  if (!entry?.driverId) return
  await safeExecute(`season_entry ${championshipId}/${entry.driverId}`, `
    INSERT INTO season_entries (championship_id, driver_id, team_id, last_seen_at)
    VALUES (:championship_id, :driver_id, :team_id, now())
    ON CONFLICT (championship_id, driver_id)
    DO UPDATE SET
      team_id = COALESCE(EXCLUDED.team_id, season_entries.team_id),
      last_seen_at = now()`, {
    championship_id: championshipId,
    driver_id: entry.driverId,
    team_id: entry.teamId ?? null,
  })
}
