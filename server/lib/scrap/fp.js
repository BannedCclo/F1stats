import { clientWriter } from "../db.js"
import { formatDriver, formatTeam } from "./utils.js"
import { MIN_EXPECTED_ROWS } from "../sync/completeness.js"

/** @param raceId this app's DB race_id (may differ from `race`, the BBC URL slug — see lib/sync/raceSlugs.js) */
export const getPracticeResults = async (year, race, raceId, page) => {
  const url = `https://www.bbc.com/sport/formula1/${year}/${race}-grand-prix/results#Practice`

  await page.goto(url)

  await page.waitForSelector("#Practice")

  const results = await page.evaluate(() => {
    const fp1Table = document.querySelector(
      `#Practice table[aria-label="First Practice"]`,
    )
    const fp2Table = document.querySelector(
      `#Practice table[aria-label="Second Practice"]`,
    )
    const fp3Table = document.querySelector(
      `#Practice table[aria-label="3rd Practice"]`,
    )

    const data = []
    const tables = [fp1Table, fp2Table, fp3Table]

    tables.forEach((table, index) => {
      if (table) {
        const rows = table.querySelectorAll("tbody tr")
        rows.forEach((row) => {
          const columns = row.querySelectorAll("td div")
          const position =
            columns[0]
              ?.querySelector(`span[aria-hidden="true"]`)
              ?.innerText.split("\n")[0]
              .trim() || null
          const driver = columns[3]?.innerText.trim().toLowerCase() || null
          const team = columns[5]?.innerText.trim().toLowerCase() || null
          const time =
            columns[7]
              ?.querySelector(`span[aria-hidden="true"]`)
              ?.innerText.split("\n")[0]
              .trim() || null

          data.push({
            session: `FP${index + 1}`,
            position,
            driver,
            team,
            time: time === "-" ? null : time,
          })
        })
      }
    })

    return data
  })

  const bySession = { FP1: [], FP2: [], FP3: [] }
  for (const result of results) {
    bySession[result.session]?.push(result)
  }

  const counts = {}
  for (const [tableName, rows] of Object.entries(bySession)) {
    counts[tableName] = rows.length
    if (rows.length === 0) continue // session hasn't run yet — nothing to insert
    if (rows.length < MIN_EXPECTED_ROWS) {
      console.warn(`  ! ${tableName} ${raceId}: only ${rows.length} rows scraped, expected a full grid — skipping insert, will retry`)
      continue
    }

    for (const result of rows) {
      try {
        await clientWriter.execute({
          sql: `INSERT INTO ${tableName} (Driver_ID, Race_ID, Team_ID, Time) VALUES (:Driver_ID, :Race_ID, :Team_ID, :Time) ON CONFLICT (Race_ID, Driver_ID) DO NOTHING`,
          args: {
            Driver_ID: formatDriver(result.driver),
            Race_ID: raceId,
            Team_ID: await formatTeam(result.team, result.driver),
            Time: result.time,
          },
        })
      } catch (error) {
        console.error(`Error inserting ${tableName} data:`, error)
      }
    }
    console.log(`${tableName} results inserted correctly`)
  }

  return counts
}
