import { Router, type Request, type Response } from "express"
import { asc, eq } from "drizzle-orm"
import { db } from "../../db"
import {
  constructorsClassifications,
  driverClassifications,
  drivers,
  teams,
} from "../../db/migrations/schema"
import { CURRENT_YEAR, SITE_NAME, SITE_URL } from "../lib/constants"
import { BaseApiResponse } from "../lib/definitions"
import { apiNotFound, getLimitAndOffset } from "../lib/utils"

const router = Router()

interface DriversChampionshipApiResponse extends BaseApiResponse {
  season: number | string
  championshipId: string
  drivers_championship: any
}

interface ConstructorsChampionshipApiResponse extends BaseApiResponse {
  season: string | number
  championshipId: string
  constructors_championship: any
}

// GET /current/drivers-championship
// NOTE: must be registered before /:year/drivers-championship — Express
// matches routes in registration order, and the dynamic :year route would
// otherwise swallow "current" as a literal year value.
router.get(
  "/current/drivers-championship",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const year = CURRENT_YEAR
      const driverStandings = await db
        .select()
        .from(driverClassifications)
        .innerJoin(
          drivers,
          eq(driverClassifications.driverId, drivers.driverId)
        )
        .innerJoin(teams, eq(driverClassifications.teamId, teams.teamId))
        .where(eq(driverClassifications.championshipId, `f1_${year}`))
        .orderBy(asc(driverClassifications.position))
        .limit(limit)
        .offset(offset)

      if (driverStandings.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No drivers championship found for this year, try with other one."
        )
      }

      const formattedDriverStandings = driverStandings.map((driver) => {
        return {
          classificationId: driver.driver_classifications.classificationId,
          driverId: driver.driver_classifications.driverId,
          teamId: driver.driver_classifications.teamId,
          points: driver.driver_classifications.points,
          position: driver.driver_classifications.position,
          wins: driver.driver_classifications.wins ?? 0,
          driver: {
            name: driver.drivers.name,
            surname: driver.drivers.surname,
            nationality: driver.drivers.nationality,
            birthday: driver.drivers.birthday,
            number: driver.drivers.number,
            shortName: driver.drivers.shortName,
            url: driver.drivers.url,
          },
          team: {
            teamId: driver.teams.teamId,
            teamName: driver.teams.teamName,
            country: driver.teams.teamNationality,
            firstAppareance: driver.teams.firstAppeareance,
            constructorsChampionships: driver.teams.constructorsChampionships,
            driversChampionships: driver.teams.driversChampionships,
            url: driver.teams.url,
          },
        }
      })

      const response: DriversChampionshipApiResponse = {
        api: SITE_NAME,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: driverStandings.length,
        season: year,
        championshipId: `f1_${year}`,
        drivers_championship: formattedDriverStandings,
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

// GET /current/constructors-championship
router.get(
  "/current/constructors-championship",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const year = CURRENT_YEAR
      const teamStandingsData = await db
        .select()
        .from(constructorsClassifications)
        .innerJoin(teams, eq(teams.teamId, constructorsClassifications.teamId))
        .where(eq(constructorsClassifications.championshipId, `f1_${year}`))
        .orderBy(asc(constructorsClassifications.position))
        .limit(limit)
        .offset(offset)

      if (teamStandingsData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No constructors championship found for this year. Try with other one."
        )
      }

      const processedData = teamStandingsData.map((team) => {
        return {
          classificationId:
            team.constructors_classifications.classificationId,
          teamId: team.constructors_classifications.teamId,
          points: team.constructors_classifications.points,
          position: team.constructors_classifications.position,
          wins: team.constructors_classifications.wins ?? 0,
          team: {
            teamName: team.teams.teamName,
            country: team.teams.teamNationality,
            firstAppareance: team.teams.firstAppeareance,
            constructorsChampionships: team.teams.constructorsChampionships,
            driversChampionships: team.teams.driversChampionships,
            url: team.teams.url,
          },
        }
      })

      const response: ConstructorsChampionshipApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: processedData.length,
        season: year,
        championshipId: `f1_${year}`,
        constructors_championship: processedData,
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

// GET /:year/drivers-championship
router.get(
  "/:year/drivers-championship",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const { year } = req.params

      const driverStandings = await db
        .select()
        .from(driverClassifications)
        .innerJoin(
          drivers,
          eq(driverClassifications.driverId, drivers.driverId)
        )
        .innerJoin(teams, eq(driverClassifications.teamId, teams.teamId))
        .where(eq(driverClassifications.championshipId, `f1_${year}`))
        .orderBy(asc(driverClassifications.position))
        .limit(limit)
        .offset(offset)

      if (driverStandings.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No drivers championship found for this year, try with other one."
        )
      }

      const formattedDriverStandings = driverStandings.map((driver) => {
        return {
          classificationId: driver.driver_classifications.classificationId,
          driverId: driver.driver_classifications.driverId,
          teamId: driver.driver_classifications.teamId,
          points: driver.driver_classifications.points,
          position: driver.driver_classifications.position,
          wins: driver.driver_classifications.wins ?? 0,
          driver: {
            name: driver.drivers.name,
            surname: driver.drivers.surname,
            nationality: driver.drivers.nationality,
            birthday: driver.drivers.birthday,
            number: driver.drivers.number,
            shortName: driver.drivers.shortName,
            url: driver.drivers.url,
          },
          team: {
            teamId: driver.teams.teamId,
            teamName: driver.teams.teamName,
            country: driver.teams.teamNationality,
            firstAppareance: driver.teams.firstAppeareance,
            constructorsChampionships: driver.teams.constructorsChampionships,
            driversChampionships: driver.teams.driversChampionships,
            url: driver.teams.url,
          },
        }
      })

      const response: DriversChampionshipApiResponse = {
        api: SITE_NAME,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: driverStandings.length,
        season: parseInt(year),
        championshipId: `f1_${year}`,
        drivers_championship: formattedDriverStandings,
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

// GET /:year/constructors-championship
router.get(
  "/:year/constructors-championship",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const { year } = req.params

      const teamStandingsData = await db
        .select()
        .from(constructorsClassifications)
        .innerJoin(teams, eq(teams.teamId, constructorsClassifications.teamId))
        .where(eq(constructorsClassifications.championshipId, `f1_${year}`))
        .orderBy(asc(constructorsClassifications.position))
        .limit(limit)
        .offset(offset)

      if (teamStandingsData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No constructors championship found for this year. Try with other one."
        )
      }

      const processedData = teamStandingsData.map((team) => {
        return {
          classificationId:
            team.constructors_classifications.classificationId,
          teamId: team.constructors_classifications.teamId,
          points: team.constructors_classifications.points,
          position: team.constructors_classifications.position,
          wins: team.constructors_classifications.wins ?? 0,
          team: {
            teamName: team.teams.teamName,
            country: team.teams.teamNationality,
            firstAppareance: team.teams.firstAppeareance,
            constructorsChampionships: team.teams.constructorsChampionships,
            driversChampionships: team.teams.driversChampionships,
            url: team.teams.url,
          },
        }
      })

      const response: ConstructorsChampionshipApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        total: teamStandingsData.length,
        season: parseInt(year),
        championshipId: `f1_${year}`,
        constructors_championship: processedData,
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
