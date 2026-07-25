import { Router, type Request, type Response } from "express"
import { and, asc, eq, InferModel, like } from "drizzle-orm"
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

type Team = InferModel<typeof teams>

interface TeamsApiResponse extends BaseApiResponse {
  teams: Team[]
}

interface TeamApiResponse extends BaseApiResponse {
  team: Team[]
}

interface TeamsSearchApiResponse extends BaseApiResponse {
  teams: Team[]
  query: string
}

interface YearTeamsApiResponse extends BaseApiResponse {
  teams: Team[]
  season: string | number
  championshipId: string
}

interface YearTeamApiResponse extends BaseApiResponse {
  season: number | string
  team: Team[]
}

interface TeamDriversApiResponse extends BaseApiResponse {
  season: number | string
  teamId: string
  team: Team
  drivers: {
    driver: {
      driverId: string
      name: string
      surname: string
      nationality: string
      birthday: string
      number: number | null
      shortName: string | null
      url: string | null
    }
  }[]
}

// GET /teams
router.get("/teams", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const teamsData = await db
      .select()
      .from(teams)
      .limit(limit)
      .offset(offset)
      .orderBy(teams.teamId)

    if (teamsData.length === 0) {
      return apiNotFound(res, fullUrl, "No teams found.")
    }

    teamsData.forEach((team) => {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.teamNationality,
        firstAppareance: team.firstAppeareance,
        driversChampionships: team.driversChampionships,
        constructorsChampionships: team.constructorsChampionships,
        url: team.url,
      }
    })

    const response: TeamsApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: teamsData.length,
      teams: teamsData,
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

// GET /teams/search
router.get("/teams/search", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const teamsData = await db
      .select()
      .from(teams)
      .where(like(teams.teamName, `%${searchParams.get("q") ?? ""}%`))
      .limit(limit)
      .offset(offset)
      .orderBy(teams.teamId)

    if (teamsData.length === 0) {
      return apiNotFound(res, fullUrl, "No teams found.")
    }

    teamsData.forEach((team) => {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.teamNationality,
        firstAppareance: team.firstAppeareance,
        driversChampionships: team.driversChampionships,
        constructorsChampionships: team.constructorsChampionships,
        url: team.url,
      }
    })

    const response: TeamsSearchApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      query: searchParams.get("q") ?? "",
      total: teamsData.length,
      teams: teamsData,
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

// GET /teams/:teamId
router.get("/teams/:teamId", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { teamId } = req.params
    const limit = 1
    const teamData = await db
      .select()
      .from(teams)
      .where(eq(teams.teamId, teamId))
      .limit(limit)

    if (teamData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No team found for this id, try with other."
      )
    }

    teamData.forEach((team) => {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.teamNationality,
        firstAppareance: team.firstAppeareance,
        driversChampionships: team.driversChampionships,
        constructorsChampionships: team.constructorsChampionships,
        url: team.url,
      }
    })

    const response: TeamApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: teamData.length,
      team: teamData,
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

// GET /:year/teams
router.get("/:year/teams", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const { year } = req.params

    const teamsData = await db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamNationality: teams.teamNationality,
        firstAppeareance: teams.firstAppeareance,
        constructorsChampionships: teams.constructorsChampionships,
        driversChampionships: teams.driversChampionships,
        url: teams.url,
      })
      .from(teams)
      .innerJoin(
        constructorsClassifications,
        eq(teams.teamId, constructorsClassifications.teamId)
      )
      .where(eq(constructorsClassifications.championshipId, `f1_${year}`))
      .orderBy(asc(constructorsClassifications.position))
      .limit(limit)
      .offset(offset)

    if (teamsData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No teams found for this year, try with other one."
      )
    }

    teamsData.forEach((team) => {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.teamNationality,
        firstAppeareance: team.firstAppeareance,
        constructorsChampionships: team.constructorsChampionships,
        driversChampionships: team.driversChampionships,
        url: team.url,
      }
    })

    const response: YearTeamsApiResponse = {
      api: SITE_NAME,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: teamsData.length,
      season: parseInt(year),
      championshipId: `f1_${year}`,
      teams: teamsData,
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

// GET /:year/teams/:teamId
router.get("/:year/teams/:teamId", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { year, teamId } = req.params

    const teamData = await db
      .select()
      .from(teams)
      .where(eq(teams.teamId, teamId))
      .limit(1)

    if (teamData.length === 0 || !Number(year)) {
      return apiNotFound(
        res,
        fullUrl,
        "No teams found for this year, try with other one."
      )
    }

    const processedData = teamData.map((row) => {
      return {
        teamId: row.teamId,
        teamName: row.teamName,
        teamNationality: row.teamNationality,
        firstAppeareance: row.firstAppeareance,
        constructorsChampionships: row.constructorsChampionships,
        driversChampionships: row.driversChampionships,
        url: row.url,
      }
    })

    const response: YearTeamApiResponse = {
      api: SITE_NAME,
      url: fullUrl,
      total: processedData.length,
      season: parseInt(year),
      team: processedData,
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

// GET /:year/teams/:teamId/drivers
router.get(
  "/:year/teams/:teamId/drivers",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const { year, teamId } = req.params

      const data = await db
        .select({
          drivers,
          teams,
          driverClassifications,
          constructorsClassifications,
        })
        .from(driverClassifications)
        .innerJoin(teams, eq(driverClassifications.teamId, teams.teamId))
        .innerJoin(
          drivers,
          eq(driverClassifications.driverId, drivers.driverId)
        )
        .innerJoin(
          constructorsClassifications,
          and(
            eq(constructorsClassifications.teamId, teamId),
            eq(constructorsClassifications.championshipId, `f1_${year}`)
          )
        )
        .where(
          and(
            eq(driverClassifications.teamId, teamId),
            eq(driverClassifications.championshipId, `f1_${year}`)
          )
        )
        .groupBy(driverClassifications.driverId)
        .orderBy(driverClassifications.points)
        .limit(limit || 4)
        .offset(offset || 0)

      if (data.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No team or drivers found for this year and team ID."
        )
      }

      const processedData = data.map((driver) => {
        return {
          driver: {
            driverId: driver.drivers.driverId,
            name: driver.drivers.name,
            surname: driver.drivers.surname,
            nationality: driver.drivers.nationality,
            birthday: driver.drivers.birthday,
            number: driver.drivers.number,
            shortName: driver.drivers.shortName,
            url: driver.drivers.url,
            points: driver.driverClassifications.points,
            position: driver.driverClassifications.position,
            wins: driver.driverClassifications.wins,
          },
        }
      })

      const teamData = data.map((row) => {
        return {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          points: row.constructorsClassifications.points,
          position: row.constructorsClassifications.position,
          wins: row.constructorsClassifications.wins,
          url: row.teams.url,
        }
      })

      const response: TeamDriversApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        total: processedData.length,
        limit: limit,
        offset: offset,
        season: parseInt(year),
        teamId: teamId,
        team: teamData[0],
        drivers: processedData,
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

// GET /current/teams
router.get("/current/teams", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const year = CURRENT_YEAR
    const teamsData = await db
      .select({
        teamId: teams.teamId,
        teamName: teams.teamName,
        teamNationality: teams.teamNationality,
        firstAppeareance: teams.firstAppeareance,
        constructorsChampionships: teams.constructorsChampionships,
        driversChampionships: teams.driversChampionships,
        url: teams.url,
      })
      .from(teams)
      .innerJoin(
        constructorsClassifications,
        eq(teams.teamId, constructorsClassifications.teamId)
      )
      .where(eq(constructorsClassifications.championshipId, `f1_${year}`))
      .orderBy(asc(constructorsClassifications.position))
      .limit(limit)
      .offset(offset)

    if (teamsData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No teams found for this year, try with other one."
      )
    }

    teamsData.forEach((team) => {
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        country: team.teamNationality,
        firstAppeareance: team.firstAppeareance,
        constructorsChampionships: team.constructorsChampionships,
        driversChampionships: team.driversChampionships,
        url: team.url,
      }
    })

    const response: YearTeamsApiResponse = {
      api: SITE_NAME,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: teamsData.length,
      season: year,
      championshipId: `f1_${year}`,
      teams: teamsData,
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

// GET /current/teams/:teamId
router.get(
  "/current/teams/:teamId",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    try {
      const year = CURRENT_YEAR
      const { teamId } = req.params
      const teamData = await db
        .select()
        .from(teams)
        .where(eq(teams.teamId, teamId))
        .limit(1)

      if (teamData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No teams found for this year, try with other one."
        )
      }

      const processedData = teamData.map((row) => {
        return {
          teamId: row.teamId,
          teamName: row.teamName,
          teamNationality: row.teamNationality,
          firstAppeareance: row.firstAppeareance,
          constructorsChampionships: row.constructorsChampionships,
          driversChampionships: row.driversChampionships,
          url: row.url,
        }
      })

      const response: YearTeamApiResponse = {
        api: SITE_NAME,
        url: fullUrl,
        total: processedData.length,
        season: year,
        team: processedData,
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

// GET /current/teams/:teamId/drivers
router.get(
  "/current/teams/:teamId/drivers",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const year = CURRENT_YEAR
      const { teamId } = req.params

      const data = await db
        .select({
          drivers,
          teams,
          driverClassifications,
          constructorsClassifications,
        })
        .from(driverClassifications)
        .innerJoin(teams, eq(driverClassifications.teamId, teams.teamId))
        .innerJoin(
          drivers,
          eq(driverClassifications.driverId, drivers.driverId)
        )
        .innerJoin(
          constructorsClassifications,
          and(
            eq(constructorsClassifications.teamId, teamId),
            eq(constructorsClassifications.championshipId, `f1_${year}`)
          )
        )
        .where(
          and(
            eq(driverClassifications.teamId, teamId),
            eq(driverClassifications.championshipId, `f1_${year}`)
          )
        )
        .groupBy(driverClassifications.driverId)
        .orderBy(driverClassifications.points)
        .limit(limit || 4)
        .offset(offset || 0)

      if (data.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No team or drivers found for this year and team ID."
        )
      }

      const processedData = data.map((driver) => {
        return {
          driver: {
            driverId: driver.drivers.driverId,
            name: driver.drivers.name,
            surname: driver.drivers.surname,
            nationality: driver.drivers.nationality,
            birthday: driver.drivers.birthday,
            number: driver.drivers.number,
            shortName: driver.drivers.shortName,
            url: driver.drivers.url,
            points: driver.driverClassifications.points,
            position: driver.driverClassifications.position,
            wins: driver.driverClassifications.wins,
          },
        }
      })

      const teamData = data.map((row) => {
        return {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          points: row.constructorsClassifications.points,
          position: row.constructorsClassifications.position,
          wins: row.constructorsClassifications.wins,
          url: row.teams.url,
        }
      })

      const response: TeamDriversApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        total: processedData.length,
        limit: limit,
        offset: offset,
        season: year,
        teamId: teamId,
        team: teamData[0],
        drivers: processedData,
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
