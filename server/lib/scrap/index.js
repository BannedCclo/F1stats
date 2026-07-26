import { chromium } from "playwright"
import { getRaceResults } from "./race.js"
import { getQualyResults } from "./qualy.js"
import { getPracticeResults } from "./fp.js"
import { getSprintRaceResults } from "./sprint/race.js"
import { getSprintQualyResults } from "./sprint/qualy.js"
import { updateDriversChampionship } from "./championships/drivers.js"
import { updateTeamsChampionship } from "./championships/teams.js"
import { generateRaceId } from "./utils.js"
;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()

  const page = await context.newPage()
  const year = 2026
  const race = "belgian" // BBC URL slug — see lib/sync/raceSlugs.js if it differs from the DB race_id
  const raceId = generateRaceId(race, year)

  await getPracticeResults(year, race, raceId, page)
  //await getQualyResults(year, race, raceId, page)
  //await getSprintQualyResults(year, race, raceId, page)
  //await getSprintRaceResults(year, race, raceId, page)
  //await getRaceResults(year, race, raceId, page)
  //await updateDriversChampionship(year, page)
  //await updateTeamsChampionship(year, page)

  await context.close()
  await browser.close()
})()
