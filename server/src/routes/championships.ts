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
          classificationId: driver.Driver_Classifications.classificationId,
          driverId: driver.Driver_Classifications.driverId,
          teamId: driver.Driver_Classifications.teamId,
          points: driver.Driver_Classifications.points,
          position: driver.Driver_Classifications.position,
          wins: driver.Driver_Classifications.wins ?? 0,
          driver: {
            name: driver.Drivers.name,
            surname: driver.Drivers.surname,
            nationality: driver.Drivers.nationality,
            birthday: driver.Drivers.birthday,
            number: driver.Drivers.number,
            shortName: driver.Drivers.shortName,
            url: driver.Drivers.url,
          },
          team: {
            teamId: driver.Teams.teamId,
            teamName: driver.Teams.teamName,
            country: driver.Teams.teamNationality,
            firstAppareance: driver.Teams.firstAppeareance,
            constructorsChampionships: driver.Teams.constructorsChampionships,
            driversChampionships: driver.Teams.driversChampionships,
            url: driver.Teams.url,
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
            team.Constructors_Classifications.classificationId,
          teamId: team.Constructors_Classifications.teamId,
          points: team.Constructors_Classifications.points,
          position: team.Constructors_Classifications.position,
          wins: team.Constructors_Classifications.wins ?? 0,
          team: {
            teamName: team.Teams.teamName,
            country: team.Teams.teamNationality,
            firstAppareance: team.Teams.firstAppeareance,
            constructorsChampionships: team.Teams.constructorsChampionships,
            driversChampionships: team.Teams.driversChampionships,
            url: team.Teams.url,
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

// GET /current/drivers-championship
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
          classificationId: driver.Driver_Classifications.classificationId,
          driverId: driver.Driver_Classifications.driverId,
          teamId: driver.Driver_Classifications.teamId,
          points: driver.Driver_Classifications.points,
          position: driver.Driver_Classifications.position,
          wins: driver.Driver_Classifications.wins ?? 0,
          driver: {
            name: driver.Drivers.name,
            surname: driver.Drivers.surname,
            nationality: driver.Drivers.nationality,
            birthday: driver.Drivers.birthday,
            number: driver.Drivers.number,
            shortName: driver.Drivers.shortName,
            url: driver.Drivers.url,
          },
          team: {
            teamId: driver.Teams.teamId,
            teamName: driver.Teams.teamName,
            country: driver.Teams.teamNationality,
            firstAppareance: driver.Teams.firstAppeareance,
            constructorsChampionships: driver.Teams.constructorsChampionships,
            driversChampionships: driver.Teams.driversChampionships,
            url: driver.Teams.url,
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
            team.Constructors_Classifications.classificationId,
          teamId: team.Constructors_Classifications.teamId,
          points: team.Constructors_Classifications.points,
          position: team.Constructors_Classifications.position,
          wins: team.Constructors_Classifications.wins ?? 0,
          team: {
            teamName: team.Teams.teamName,
            country: team.Teams.teamNationality,
            firstAppareance: team.Teams.firstAppeareance,
            constructorsChampionships: team.Teams.constructorsChampionships,
            driversChampionships: team.Teams.driversChampionships,
            url: team.Teams.url,
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

export default router
