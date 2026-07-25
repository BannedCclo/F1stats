import { Router, type Request, type Response } from "express"
import { and, asc, eq, InferModel, like, or } from "drizzle-orm"
import { db } from "../../db"
import {
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
import { apiNotFound, getLimitAndOffset } from "../lib/utils"

const router = Router()

type Driver = InferModel<typeof drivers>
type ExtendedDriver = Driver & { teamId: string | null }

interface DriversApiResponse extends BaseApiResponse {
  drivers: Driver[]
}

interface DriverApiResponse extends BaseApiResponse {
  driver: Driver[]
}

interface DriversSearchApiResponse extends BaseApiResponse {
  query: string
  drivers: Driver[]
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

    driversData.forEach((driver) => {
      return {
        driverId: driver.driverId,
        name: driver.name,
        surname: driver.surname,
        country: driver.nationality,
        birthday: driver.birthday,
        number: driver.number,
        shortName: driver.shortName,
        url: driver.url,
      }
    })

    const response: DriversApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: driversData.length,
      drivers: driversData,
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

    driversData.forEach((driver) => {
      return {
        driverId: driver.driverId,
        name: driver.name,
        surname: driver.surname,
        country: driver.nationality,
        birthday: driver.birthday,
        number: driver.number,
        shortName: driver.shortName,
        url: driver.url,
      }
    })

    const response: DriversSearchApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      query: searchParams.get("q") ?? "",
      total: driversData.length,
      drivers: driversData,
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

    driverData.forEach((driver) => {
      return {
        driverId: driver.driverId,
        name: driver.name,
        surname: driver.surname,
        country: driver.nationality,
        birthday: driver.birthday,
        number: driver.number,
        shortName: driver.shortName,
        url: driver.url,
      }
    })

    const response: DriverApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: driverData.length,
      driver: driverData,
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
          driverId: row.Drivers.driverId,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
          number: row.Drivers.number,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
        }
      })

      const team = resultsData.map((row) => {
        return {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          teamNationality: row.Teams.teamNationality,
          firstAppeareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        }
      })

      const sprintResultsByRaceId = new Map(
        sprintResultsData.map((sprint) => [sprint.raceId, sprint])
      )

      const processedData = resultsData.map((row) => {
        const sprintResult = sprintResultsByRaceId.get(row.Races.raceId)

        return {
          race: {
            raceId: row.Races.raceId,
            name: row.Races.raceName,
            round: row.Races.round,
            date: row.Races.raceDate,
            circuit: {
              circuitId: row.Circuits.circuitId,
              name: row.Circuits.circuitName,
              country: row.Circuits.country,
              city: row.Circuits.city,
              length: row.Circuits.circuitLength,
              lapRecord: row.Circuits.lapRecord,
              firstParticipationYear: row.Circuits.firstParticipationYear,
              numberOfCorners: row.Circuits.numberOfCorners,
              fastestLapDriverId: row.Circuits.fastestLapDriverId,
              fastestLapTeamId: row.Circuits.fastestLapTeamId,
              fastestLapYear: row.Circuits.fastestLapYear,
            },
          },
          result: {
            finishingPosition: row.Results.finishingPosition,
            gridPosition: row.Results.gridPosition,
            raceTime: row.Results.raceTime,
            pointsObtained: row.Results.pointsObtained,
            retired: row.Results.retired,
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

// GET /current/drivers
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
          driverId: row.Drivers.driverId,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
          number: row.Drivers.number,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
        }
      })

      const team = resultsData.map((row) => {
        return {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          teamNationality: row.Teams.teamNationality,
          firstAppeareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        }
      })

      const sprintResultsByRaceId = new Map(
        sprintResultsData.map((sprint) => [sprint.raceId, sprint])
      )

      const processedData = resultsData.map((row) => {
        const sprintResult = sprintResultsByRaceId.get(row.Races.raceId)

        return {
          race: {
            raceId: row.Races.raceId,
            name: row.Races.raceName,
            round: row.Races.round,
            date: row.Races.raceDate,
            circuit: {
              circuitId: row.Circuits.circuitId,
              name: row.Circuits.circuitName,
              country: row.Circuits.country,
              city: row.Circuits.city,
              length: row.Circuits.circuitLength,
              lapRecord: row.Circuits.lapRecord,
              firstParticipationYear: row.Circuits.firstParticipationYear,
              numberOfCorners: row.Circuits.numberOfCorners,
              fastestLapDriverId: row.Circuits.fastestLapDriverId,
              fastestLapTeamId: row.Circuits.fastestLapTeamId,
              fastestLapYear: row.Circuits.fastestLapYear,
            },
          },
          result: {
            finishingPosition: row.Results.finishingPosition,
            gridPosition: row.Results.gridPosition,
            raceTime: row.Results.raceTime,
            pointsObtained: row.Results.pointsObtained,
            retired: row.Results.retired,
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

export default router
