import { formatDriver, formatTeam, toIntOrNull, toFloatOrNull } from "../utils.js"
import { clientWriter } from "../../db.js"
import { MIN_EXPECTED_ROWS } from "../../sync/completeness.js"

// See sprint/qualy.js for why this matches by class-name fragment instead of
// a fixed `td div` column index.
function extractRows() {
  const table = document.querySelector('table[aria-label="Sprint"]')
  if (!table) return []
  const rows = table.querySelectorAll("tbody tr")
  const data = []

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td")
    const values = [...cells].map((td) => td.querySelector('span[aria-hidden="true"]')?.innerText.trim() ?? null)

    const driverCell = [...cells].find((td) => td.querySelector("[data-driver-id]"))
    let driver = null
    let team = null
    if (driverCell) {
      for (const span of driverCell.querySelectorAll("span")) {
        if (span.className.includes("FullName") && !span.className.includes("TeamFullName")) driver = span.innerText.trim().toLowerCase()
        if (span.className.includes("TeamFullName")) team = span.innerText.trim().toLowerCase()
      }
    }

    // [rank, code, number, laps, time/gap, points]
    const [position, , , laps, raceTime, points] = values
    data.push({ position, driver, team, laps, raceTime, points })
  })

  return data
}

async function lookupSprintGridPosition(raceId, driverId) {
  const { rows } = await clientWriter.execute({
    sql: `SELECT grid_position FROM sprint_qualy WHERE race_id = :race_id AND driver_id = :driver_id LIMIT 1`,
    args: { race_id: raceId, driver_id: driverId },
  })
  return rows[0]?.grid_position ?? null
}

/** @param raceId this app's DB race_id (may differ from `race`, the BBC URL slug — see lib/sync/raceSlugs.js) */
export const getSprintRaceResults = async (year, race, raceId, page) => {
  const url = `https://www.bbc.com/sport/formula1/${year}/${race}-grand-prix/results#Sprint`

  await page.goto(url)
  await page.waitForSelector('table[aria-label="Sprint"]', { state: "attached" })

  const results = await page.evaluate(extractRows)

  if (results.length < MIN_EXPECTED_ROWS) {
    console.warn(`  ! sprint_race ${raceId}: only ${results.length} rows scraped, expected a full grid — skipping insert, will retry`)
    return results.length
  }

  for (const result of results) {
    const Driver_ID = formatDriver(result.driver)
    const Team_ID = await formatTeam(result.team, result.driver)
    // BBC's sprint results table doesn't carry a starting-grid column; the
    // sprint qualifying classification is the best available proxy (it won't
    // reflect a post-qualifying grid penalty, which BBC doesn't publish
    // separately for sprints).
    const Grid_Position = await lookupSprintGridPosition(raceId, Driver_ID)

    try {
      await clientWriter.execute({
        sql: `INSERT INTO Sprint_Race (Driver_ID, Race_ID, Team_ID, Finishing_Position, Grid_Position, Laps, Race_Time, Points_Obtained) VALUES (:Driver_ID, :Race_ID, :Team_ID, :Finishing_Position, :Grid_Position, :Laps, :Race_Time, :Points_Obtained) ON CONFLICT (Race_ID, Driver_ID) DO NOTHING`,
        args: {
          Driver_ID,
          Race_ID: raceId,
          Team_ID,
          Finishing_Position: toIntOrNull(result.position),
          Grid_Position,
          Laps: toIntOrNull(result.laps),
          Race_Time: result.raceTime,
          Points_Obtained: toFloatOrNull(result.points),
        },
      })
      console.log("Sprint race results inserted correctly")
    } catch (error) {
      console.error("Error inserting sprint race results:", error)
    }
  }

  return results.length
}
