import { formatDriver, formatTeam, toIntOrNull, toFloatOrNull } from "./utils.js"
import { clientWriter } from "../db.js"
import { MIN_EXPECTED_ROWS } from "../sync/completeness.js"

/** @param raceId this app's DB race_id (may differ from `race`, the BBC URL slug — see lib/sync/raceSlugs.js) */
export const getRaceResults = async (year, race, raceId, page) => {
  const url = `https://www.bbc.com/sport/formula1/${year}/${race}-grand-prix/results`

  await page.goto(url)

  await page.waitForSelector('table[aria-label="Race"]')

  const results = await page.evaluate(() => {
    const table = document.querySelector('table[aria-label="Race"]')
    const rows = table.querySelectorAll("tbody tr")
    const data = []

    rows.forEach((row) => {
      const columns = row.querySelectorAll("td div")
      const position =
        columns[0]
          ?.querySelector(`span[aria-hidden="true"]`)
          ?.innerText.split("\n")[0]
          .trim() || null
      const driver = columns[3]?.innerText.trim().toLowerCase() || null
      const team = columns[5]?.innerText.trim().toLowerCase() || null
      const gridPosition = columns[7]?.innerText.split("\n")[0].trim() || null
      const fastLap =
        columns[10]
          ?.querySelector(`span[aria-hidden="true"]`)
          ?.innerText.trim() || // Try `aria-hidden`
        columns[10]?.querySelector(`span.visually-hidden`)?.innerText.trim() || // Fallback to `visually-hidden`
        null

      const lapTime = fastLap ? fastLap.match(/\d+:\d+\.\d+/)?.[0] : null

      const raceTime =
        columns[11]
          ?.querySelector(`span[aria-hidden="true"]`)
          ?.innerText.split("\n")[0]
          .trim() || null
      const points = columns[12]?.innerText.split("\n")[0].trim() || null

      data.push({
        position,
        driver,
        team,
        raceTime,
        points,
        gridPosition,
        lapTime,
        fastLap,
      })
    })

    return data
  })

  if (results.length < MIN_EXPECTED_ROWS) {
    console.warn(`  ! race ${raceId}: only ${results.length} rows scraped, expected a full grid — skipping insert, will retry`)
    return results.length
  }

  const formattedResults = results.map((result) => {
    return {
      Race_ID: raceId,
      Driver_ID: formatDriver(result.driver),
      Team_ID: formatTeam(result.team),
      Finishing_Position: toIntOrNull(result.position),
      Grid_Position: toIntOrNull(result.gridPosition),
      Race_Time: result.raceTime,
      Points_Obtained: toFloatOrNull(result.points),
      fast_lap: result.lapTime,
    }
  })

  // we want to retrieve the fastest overall lap of the race

  const fastestLap = results.reduce(
    (acc, result) => {
      // Check if the lapTime exists and is a valid lap time
      if (result.lapTime) {
        const lapTime = result.lapTime

        // Compare lap time only if it's the fastest one
        if (!acc.lapTime || lapTime < acc.lapTime) {
          acc.lapTime = lapTime
          acc.driverId = formatDriver(result.driver)
          acc.teamId = formatTeam(result.team)
        }
      }
      return acc
    },
    { lapTime: null, driverId: null, teamId: null },
  )

  console.log(formattedResults)
  console.log(fastestLap)

  for (const result of formattedResults) {
    try {
      await clientWriter.execute({
        sql: `INSERT INTO Results (Driver_ID, Race_ID, Team_ID, Finishing_Position, Grid_Position, Race_Time, Points_Obtained, fast_lap) VALUES (:Driver_ID, :Race_ID, :Team_ID, :Finishing_Position, :Grid_Position, :Race_Time, :Points_Obtained, :fast_lap) ON CONFLICT (Race_ID, Driver_ID) DO NOTHING`,
        args: {
          Driver_ID: result.Driver_ID,
          Race_ID: raceId,
          Team_ID: result.Team_ID,
          Finishing_Position: result.Finishing_Position,
          Grid_Position: result.Grid_Position,
          Race_Time: result.Race_Time,
          Points_Obtained: result.Points_Obtained,
          fast_lap: result.fast_lap ? result.fast_lap : null,
        },
      })
      console.log("Race Results inserted correctly")
    } catch (error) {
      console.error("Error inserting race results:", error)
    }
  }

  try {
    await clientWriter.execute({
      sql: `UPDATE Races
      SET
        Winner_ID = :Winner_ID,
        fast_lap = :fast_lap,
        fast_lap_driver_id = :fast_lap_driver_id,
        fast_lap_team_id = :fast_lap_team_id,
        Team_Winner_ID = :Team_Winner_ID
      WHERE Race_ID = :Race_ID`,
      args: {
        Winner_ID: formattedResults[0].Driver_ID,
        fast_lap: fastestLap.lapTime,
        fast_lap_driver_id: fastestLap.driverId,
        fast_lap_team_id: fastestLap.teamId,
        Team_Winner_ID: formattedResults[0].Team_ID,
        Race_ID: raceId,
      },
    })
    console.log("Races updated correctly")
  } catch (error) {
    console.error("Error updating races", error)
  }

  return results.length
}
