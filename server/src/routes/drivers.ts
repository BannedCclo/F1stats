import { Router, type Request, type Response } from "express"
import { and, asc, eq, InferModel, like, or } from "drizzle-orm"
import { db } from "../../db"
import {
  championships,
  circuits,
  driverClassifications,
  drivers,
  races,
  results,
  sprintRace,
  teams,
} from "../../db/migrations/schema"
import { CURRENT_YEAR, SITE_URL } from "../lib/constants"
import { BaseApiResponse } from "../lib/definitions"
import { apiNotFound, circuitSvg, getLimitAndOffset } from "../lib/utils"
import { getDriverSeasons } from "../lib/participants"

const router = Router()

type Driver = InferModel<typeof drivers>
type DriverWithSeasons = Driver & { seasons: string[] }
type ExtendedDriver = Driver & { teamId: string | null }

interface DriversApiResponse extends BaseApiResponse {
  drivers: DriverWithSeasons[]
}

interface DriverApiResponse extends BaseApiResponse {
  driver: DriverWithSeasons[]
}

interface DriversSearchApiResponse extends BaseApiResponse {
  query: string
  drivers: DriverWithSeasons[]
}

interface YearDriversApiResponse extends BaseApiResponse {
  season: string | number
  championshipId: string
  drivers: ExtendedDriver[]
}

interface DriverResultsApiResponse extends BaseApiResponse {
  season: string | number
  championshipId: string
  driver: InferModel<typeof drivers>
  team: InferModel<typeof teams>
  results: any
}

interface DriverSeasonClassification {
  championshipId: string | null
  season: number | null
  position: number | null
  points: number | null
  wins: number
  team: {
    teamId: string
    teamName: string | null
    country: string | null
    url: string | null
  } | null
}

interface DriverClassificationsApiResponse extends BaseApiResponse {
  driverId: string
  classifications: DriverSeasonClassification[]
}

// GET /drivers
router.get("/drivers", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const driversData = await db
      .select()
      .from(drivers)
      .limit(limit)
      .offset(offset)
      .orderBy(drivers.driverId)

    if (driversData.length === 0) {
      return apiNotFound(res, fullUrl, "No drivers found.")
    }

    const seasonsByDriverId = await getDriverSeasons(
      driversData.map((driver) => driver.driverId)
    )
    const driversWithSeasons: DriverWithSeasons[] = driversData.map(
      (driver) => ({
        ...driver,
        seasons: seasonsByDriverId.get(driver.driverId) ?? [],
      })
    )

    const response: DriversApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: driversWithSeasons.length,
      drivers: driversWithSeasons,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      })
      .json(response)
  } catch (error) {
    console.error("Error:", error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /drivers/search
router.get("/drivers/search", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const driversData = await db
      .select()
      .from(drivers)
      .where(
        or(
          like(drivers.surname, `%${searchParams.get("q") ?? ""}%`),
          like(drivers.name, `%${searchParams.get("q") ?? ""}%`)
        )
      )
      .limit(limit)
      .offset(offset)
      .orderBy(drivers.driverId)

    if (driversData.length === 0) {
      return apiNotFound(res, fullUrl, "No drivers found.")
    }

    const seasonsByDriverId = await getDriverSeasons(
      driversData.map((driver) => driver.driverId)
    )
    const driversWithSeasons: DriverWithSeasons[] = driversData.map(
      (driver) => ({
        ...driver,
        seasons: seasonsByDriverId.get(driver.driverId) ?? [],
      })
    )

    const response: DriversSearchApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      query: searchParams.get("q") ?? "",
      total: driversWithSeasons.length,
      drivers: driversWithSeasons,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=300, stale-while-revalidate=30",
      })
      .json(response)
  } catch (error) {
    console.error("Error:", error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /drivers/:driverId
router.get("/drivers/:driverId", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { driverId } = req.params
    const limit = 1

    const driverData = await db
      .select()
      .from(drivers)
      .where(eq(drivers.driverId, driverId))
      .limit(limit)

    if (driverData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No driver found for this id, try with other one."
      )
    }

    const seasonsByDriverId = await getDriverSeasons(
      driverData.map((driver) => driver.driverId)
    )
    const driversWithSeasons: DriverWithSeasons[] = driverData.map(
      (driver) => ({
        ...driver,
        seasons: seasonsByDriverId.get(driver.driverId) ?? [],
      })
    )

    const response: DriverApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: driversWithSeasons.length,
      driver: driversWithSeasons,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      })
      .json(response)
  } catch (error) {
    console.error("Error:", error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /drivers/:driverId/classifications
router.get(
  "/drivers/:driverId/classifications",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    try {
      const { driverId } = req.params

      const rows = await db
        .select({
          championshipId: driverClassifications.championshipId,
          season: championships.year,
          position: driverClassifications.position,
          points: driverClassifications.points,
          wins: driverClassifications.wins,
          teamId: teams.teamId,
          teamName: teams.teamName,
          teamNationality: teams.teamNationality,
          teamUrl: teams.url,
        })
        .from(driverClassifications)
        .innerJoin(
          championships,
          eq(driverClassifications.championshipId, championships.championshipId)
        )
        .leftJoin(teams, eq(driverClassifications.teamId, teams.teamId))
        .where(eq(driverClassifications.driverId, driverId))
        .orderBy(asc(championships.year))

      if (rows.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No classifications found for this driver, try with other one."
        )
      }

      const classifications: DriverSeasonClassification[] = rows.map(
        (row) => ({
          championshipId: row.championshipId,
          season: row.season,
          position: row.position,
          points: row.points,
          wins: row.wins ?? 0,
          team: row.teamId
            ? {
                teamId: row.teamId,
                teamName: row.teamName,
                country: row.teamNationality,
                url: row.teamUrl,
              }
            : null,
        })
      )

      const response: DriverClassificationsApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        driverId,
        total: classifications.length,
        classifications,
      }

      return res
        .status(200)
        .set({
          "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
        })
        .json(response)
    } catch (error) {
      console.error("Error:", error)
      return res.status(500).json({ message: "Server error" })
    }
  }
)

// GET /current/drivers
// NOTE: must be registered before /:year/drivers — Express matches routes in
// registration order, and the dynamic :year route would otherwise swallow
// "current" as a literal year value.
router.get("/current/drivers", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const year = CURRENT_YEAR

    const driversData = await db
      .select({
        driverId: drivers.driverId,
        name: drivers.name,
        surname: drivers.surname,
        nationality: drivers.nationality,
        birthday: drivers.birthday,
        number: drivers.number,
        shortName: drivers.shortName,
        url: drivers.url,
        teamId: driverClassifications.teamId,
      })
      .from(drivers)
      .innerJoin(
        driverClassifications,
        eq(drivers.driverId, driverClassifications.driverId)
      )
      .where(eq(driverClassifications.championshipId, `f1_${year}`))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(driverClassifications.position))

    if (driversData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No drivers found for this year, try with another one."
      )
    }

    const response: YearDriversApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit,
      offset,
      total: driversData.length,
      season: year,
      championshipId: `f1_${year}`,
      drivers: driversData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /current/drivers/:driverId
router.get(
  "/current/drivers/:driverId",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const year = CURRENT_YEAR
      const { driverId } = req.params

      const sprintResultsData = await db
        .select({
          raceId: sprintRace.raceId,
          finishingPosition: sprintRace.finishingPosition,
          gridPosition: sprintRace.gridPosition,
          raceTime: sprintRace.raceTime,
          pointsObtained: sprintRace.pointsObtained,
          retired: sprintRace.retired,
        })
        .from(sprintRace)
        .innerJoin(races, eq(sprintRace.raceId, races.raceId))
        .where(
          and(
            eq(sprintRace.driverId, driverId),
            eq(races.championshipId, `f1_${year}`)
          )
        )

      const resultsData = await db
        .select()
        .from(results)
        .innerJoin(races, eq(results.raceId, races.raceId))
        .innerJoin(drivers, eq(results.driverId, drivers.driverId))
        .innerJoin(teams, eq(results.teamId, teams.teamId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        //.leftJoin(sprintRace, eq(results.raceId, sprintRace.raceId))
        .where(
          and(
            eq(races.championshipId, `f1_${year}`),
            eq(results.driverId, driverId)
          )
        )
        .orderBy(races.round)
        .limit(limit)
        .offset(offset)

      if (resultsData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No results found for this driver and year, try with another one."
        )
      }

      const driver = resultsData.map((row) => {
        return {
          driverId: row.drivers.driverId,
          name: row.drivers.name,
          surname: row.drivers.surname,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
          number: row.drivers.number,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
        }
      })

      const team = resultsData.map((row) => {
        return {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        }
      })

      const sprintResultsByRaceId = new Map(
        sprintResultsData.map((sprint) => [sprint.raceId, sprint])
      )

      const processedData = resultsData.map((row) => {
        const sprintResult = sprintResultsByRaceId.get(row.races.raceId)

        return {
          race: {
            raceId: row.races.raceId,
            name: row.races.raceName,
            round: row.races.round,
            date: row.races.raceDate,
            circuit: {
              circuitId: row.circuits.circuitId,
              name: row.circuits.circuitName,
              country: row.circuits.country,
              city: row.circuits.city,
              length: row.circuits.circuitLength,
              lapRecord: row.circuits.lapRecord,
              firstParticipationYear: row.circuits.firstParticipationYear,
              numberOfCorners: row.circuits.numberOfCorners,
              fastestLapDriverId: row.circuits.fastestLapDriverId,
              fastestLapTeamId: row.circuits.fastestLapTeamId,
              fastestLapYear: row.circuits.fastestLapYear,
              svg: circuitSvg(row.circuits),
            },
          },
          result: {
            finishingPosition: row.results.finishingPosition,
            gridPosition: row.results.gridPosition,
            raceTime: row.results.raceTime,
            pointsObtained: row.results.pointsObtained,
            retired: row.results.retired,
          },
          sprintResult: sprintResult
            ? {
                finishingPosition: sprintResult.finishingPosition,
                gridPosition: sprintResult.gridPosition,
                raceTime: sprintResult.raceTime,
                pointsObtained: sprintResult.pointsObtained,
                retired: sprintResult.retired,
              }
            : null,
        }
      })

      const response: DriverResultsApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: processedData.length,
        season: year,
        championshipId: `f1_${year}`,
        driver: driver[0],
        team: team[0],
        results: processedData,
      }

      return res
        .status(200)
        .set({
          "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
        })
        .json(response)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: "Server error" })
    }
  }
)

// GET /:year/drivers
router.get("/:year/drivers", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)

  try {
    const { year } = req.params

    const driversData = await db
      .select({
        driverId: drivers.driverId,
        name: drivers.name,
        surname: drivers.surname,
        nationality: drivers.nationality,
        birthday: drivers.birthday,
        number: drivers.number,
        shortName: drivers.shortName,
        url: drivers.url,
        teamId: driverClassifications.teamId,
      })
      .from(drivers)
      .innerJoin(
        driverClassifications,
        eq(drivers.driverId, driverClassifications.driverId)
      )
      .where(eq(driverClassifications.championshipId, `f1_${year}`))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(driverClassifications.position))

    if (driversData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No drivers found for this year, try with another one."
      )
    }

    const response: YearDriversApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit,
      offset,
      total: driversData.length,
      season: parseInt(year),
      championshipId: `f1_${year}`,
      drivers: driversData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /:year/drivers/:driverId
router.get(
  "/:year/drivers/:driverId",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const { year, driverId } = req.params

      const sprintResultsData = await db
        .select({
          raceId: sprintRace.raceId,
          finishingPosition: sprintRace.finishingPosition,
          gridPosition: sprintRace.gridPosition,
          raceTime: sprintRace.raceTime,
          pointsObtained: sprintRace.pointsObtained,
          retired: sprintRace.retired,
        })
        .from(sprintRace)
        .innerJoin(races, eq(sprintRace.raceId, races.raceId))
        .where(
          and(
            eq(sprintRace.driverId, driverId),
            eq(races.championshipId, `f1_${year}`)
          )
        )

      const resultsData = await db
        .select()
        .from(results)
        .innerJoin(races, eq(results.raceId, races.raceId))
        .innerJoin(drivers, eq(results.driverId, drivers.driverId))
        .innerJoin(teams, eq(results.teamId, teams.teamId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        //.leftJoin(sprintRace, eq(results.raceId, sprintRace.raceId))
        .where(
          and(
            eq(races.championshipId, `f1_${year}`),
            eq(results.driverId, driverId)
          )
        )
        .orderBy(races.round)
        .limit(limit)
        .offset(offset)

      if (resultsData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No results found for this driver and year, try with another one."
        )
      }

      const driver = resultsData.map((row) => {
        return {
          driverId: row.drivers.driverId,
          name: row.drivers.name,
          surname: row.drivers.surname,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
          number: row.drivers.number,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
        }
      })

      const team = resultsData.map((row) => {
        return {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        }
      })

      const sprintResultsByRaceId = new Map(
        sprintResultsData.map((sprint) => [sprint.raceId, sprint])
      )

      const processedData = resultsData.map((row) => {
        const sprintResult = sprintResultsByRaceId.get(row.races.raceId)

        return {
          race: {
            raceId: row.races.raceId,
            name: row.races.raceName,
            round: row.races.round,
            date: row.races.raceDate,
            circuit: {
              circuitId: row.circuits.circuitId,
              name: row.circuits.circuitName,
              country: row.circuits.country,
              city: row.circuits.city,
              length: row.circuits.circuitLength,
              lapRecord: row.circuits.lapRecord,
              firstParticipationYear: row.circuits.firstParticipationYear,
              numberOfCorners: row.circuits.numberOfCorners,
              fastestLapDriverId: row.circuits.fastestLapDriverId,
              fastestLapTeamId: row.circuits.fastestLapTeamId,
              fastestLapYear: row.circuits.fastestLapYear,
              svg: circuitSvg(row.circuits),
            },
          },
          result: {
            finishingPosition: row.results.finishingPosition,
            gridPosition: row.results.gridPosition,
            raceTime: row.results.raceTime,
            pointsObtained: row.results.pointsObtained,
            retired: row.results.retired,
          },
          sprintResult: sprintResult
            ? {
                finishingPosition: sprintResult.finishingPosition,
                gridPosition: sprintResult.gridPosition,
                raceTime: sprintResult.raceTime,
                pointsObtained: sprintResult.pointsObtained,
                retired: sprintResult.retired,
              }
            : null,
        }
      })

      const response: DriverResultsApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: processedData.length,
        season: parseInt(year),
        championshipId: `f1_${year}`,
        driver: driver[0],
        team: team[0],
        results: processedData,
      }

      return res
        .status(200)
        .set({
          "Cache-Control": "public, max-age=600, stale-while-revalidate=60",
        })
        .json(response)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: "Server error" })
    }
  }
)


export default router
