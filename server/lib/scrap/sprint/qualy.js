import { formatDriver, formatTeam, toIntOrNull } from "../utils.js"
import { clientWriter } from "../../db.js"
import { MIN_EXPECTED_ROWS } from "../../sync/completeness.js"

// The BBC "Sprint Qualifying" table (unlike the main Results/Qualifying
// tables scraped elsewhere in this app) doesn't have a stable
// `td div` column count to index into — a driver cell nests a flag-badge div
// that shifts everything after it by a variable amount. It does have stable
// class-name fragments (BBC's styled-components hash the prefix but keep a
// readable suffix like `-FullName`), so cells are matched by class fragment
// instead of position.
function extractRows() {
  const table = document.querySelector('table[aria-label="Sprint Qualifying"]')
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

    // [rank, code, number, Q1, Q1(dup), Q2, Q2(dup), Q3, Q3(dup), fastestLapTag]
    const gridPosition = values[0]
    const clean = (v) => (v && v !== "-" ? v : null)
    let q1 = clean(values[3])
    let q2 = clean(values[5])
    let q3 = clean(values[7])

    // BBC collapses the fastest driver's row: instead of repeating their time
    // in its own Q-column, it's blank there and only appears once as
    // "[Q3] 1:21.012" in the trailing column — backfill from that tag.
    const tag = values[9]
    const tagMatch = tag?.match(/^\[Q(\d)\]\s*(.+)$/)
    if (tagMatch) {
      const [, session, time] = tagMatch
      if (session === "1" && !q1) q1 = time
      if (session === "2" && !q2) q2 = time
      if (session === "3" && !q3) q3 = time
    }

    data.push({ gridPosition, driver, team, q1, q2, q3 })
  })

  return data
}

/** @param raceId this app's DB race_id (may differ from `race`, the BBC URL slug — see lib/sync/raceSlugs.js) */
export const getSprintQualyResults = async (year, race, raceId, page) => {
  const url = `https://www.bbc.com/sport/formula1/${year}/${race}-grand-prix/results#SprintQualifying`

  await page.goto(url)
  await page.waitForSelector('table[aria-label="Sprint Qualifying"]', { state: "attached" })

  const results = await page.evaluate(extractRows)

  if (results.length < MIN_EXPECTED_ROWS) {
    console.warn(`  ! sprint_qualy ${raceId}: only ${results.length} rows scraped, expected a full grid — skipping insert, will retry`)
    return results.length
  }

  const formattedResults = results.map((result) => ({
    Race_ID: raceId,
    Driver_ID: formatDriver(result.driver),
    Team_ID: formatTeam(result.team, result.driver),
    Grid_Position: toIntOrNull(result.gridPosition),
    SQ1: result.q1,
    SQ2: result.q2,
    SQ3: result.q3,
  }))

  console.log(formattedResults)

  for (const result of formattedResults) {
    try {
      await clientWriter.execute({
        sql: `INSERT INTO Sprint_Qualy
        (Driver_ID, Race_ID, Team_ID, Grid_Position, SQ1, SQ2, SQ3)
        VALUES (:Driver_ID, :Race_ID, :Team_ID, :Grid_Position, :SQ1, :SQ2, :SQ3)
        ON CONFLICT (Race_ID, Driver_ID) DO NOTHING`,
        args: {
          Driver_ID: result.Driver_ID,
          Race_ID: result.Race_ID,
          Team_ID: result.Team_ID,
          Grid_Position: result.Grid_Position,
          SQ1: result.SQ1,
          SQ2: result.SQ2,
          SQ3: result.SQ3,
        },
      })
      console.log("Sprint Qualy results inserted correctly")
    } catch (error) {
      console.error("Error inserting sprint qualy results:", error)
    }
  }

  return results.length
}
