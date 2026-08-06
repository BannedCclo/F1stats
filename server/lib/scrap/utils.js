import { clientWriter } from "../db.js"

export const generateRaceId = (race, year) => {
  return `${race}_${year}`
}

// Position/grid fields scraped from BBC are sometimes non-numeric
// placeholders ("-" for a DNF's finishing position, "not available" for a
// grid that never got set) rather than a real number.
export const toIntOrNull = (value) => {
  if (value === null || value === undefined) return null
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? null : n
}

export const toFloatOrNull = (value) => {
  if (value === null || value === undefined) return null
  const n = parseFloat(value)
  return Number.isNaN(n) ? null : n
}

export const exceptions = ["max verstappen", "kevin magnussen"]
export const teamExceptions = ["red bull", "aston martin"]

export const formatDriver = (driver) => {
  let driverId

  if (exceptions.includes(driver)) {
    driverId = driver.replace(" ", "_")
    return driverId
  } else if (driver === "carlos sainz jnr") {
    driverId = "sainz"
    return driverId
  } else if (driver === "zhou guanyu") {
    driverId = "zhou"
    return driverId
  } else if (driver === "crawford") {
    driverId = "jak_crawford"
    return driverId
  } else if (driver === "o'ward") {
    driverId = "oward"
    return driverId
  } else {
    driverId = driver.split(" ").pop()
    return driverId
  }
}

// The driver's team for whichever season is most recent in our own data —
// replaces a hardcoded driver->team array that needed a manual edit every
// time a driver or team changed. Looked up by driverId (see formatDriver),
// which is season-agnostic and stable across a driver's whole career, so
// this stays correct without any per-season maintenance once the
// season-entities sync (lib/sync/seasonEntities.js) has populated this
// year's driver_classifications.
//
// Checks season_entries first: it's fed straight from f1api.dev's driver
// list (server/lib/sync/seasonRefresh.js) and lands before the season's
// first classification row exists, so it's the only source that's correct
// in the pre-season window — the driver_classifications fallback below
// would otherwise report last year's team for anyone who switched over the
// winter, right when session-sync most needs to get round 1 correct.
async function currentTeamForDriver(driverId) {
  const seasonEntry = await clientWriter.execute({
    sql: `
      SELECT se.team_id AS team_id
      FROM season_entries se
      JOIN championships c ON c.championship_id = se.championship_id
      WHERE se.driver_id = :driver_id AND se.team_id IS NOT NULL
      ORDER BY c.year DESC
      LIMIT 1`,
    args: { driver_id: driverId },
  })
  if (seasonEntry.rows[0]?.team_id) return seasonEntry.rows[0].team_id

  const { rows } = await clientWriter.execute({
    sql: `
      SELECT dc.team_id AS team_id
      FROM driver_classifications dc
      JOIN championships c ON c.championship_id = dc.championship_id
      WHERE dc.driver_id = :driver_id AND dc.team_id IS NOT NULL
      ORDER BY c.year DESC
      LIMIT 1`,
    args: { driver_id: driverId },
  })
  return rows[0]?.team_id ?? null
}

export const formatTeam = async (team, driver = null) => {
  const formattedTeam = team?.trim().toLowerCase() || ""

  if (driver) {
    const teamId = await currentTeamForDriver(formatDriver(driver))
    if (teamId) return teamId
  }

  // Fall back to parsing BBC's own team-name text — reached when there's no
  // driver to look up (or the driver isn't in our data yet, e.g. their very
  // first classification row hasn't landed). Team names change rarely
  // enough that this short exception list isn't the maintenance burden the
  // driver grid was.
  if (formattedTeam === "bulls" || formattedTeam === "racing bulls") {
    return "rb"
  } else if (teamExceptions.includes(formattedTeam)) {
    return formattedTeam.replace(" ", "_")
  } else {
    const teamId = formattedTeam.split(" ").pop()
    return teamId === "bulls" ? "rb" : teamId
  }
}
