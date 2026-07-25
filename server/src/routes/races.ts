import { Router, type Request, type Response } from "express"
import { and, asc, desc, eq, gte, InferModel, lte } from "drizzle-orm"
import { db } from "../../db"
import {
  championships,
  circuits,
  classifications,
  drivers,
  fp1,
  fp2,
  fp3,
  races,
  results,
  sprintQualy,
  sprintRace,
  teams,
} from "../../db/migrations/schema"
import { CURRENT_YEAR, SITE_URL } from "../lib/constants"
import { BaseApiResponse } from "../lib/definitions"
import {
  apiNotFound,
  convertToTimezone,
  getDay,
  getLimitAndOffset,
  getYear,
} from "../lib/utils"

const router = Router()

interface SeasonApiResponse extends BaseApiResponse {
  season: number | string
  timezone?: string
  championship: any
  races: any
}

interface RoundApiResponse extends BaseApiResponse {
  season: number | string
  round: number | string
  championship: any
  timezone?: string
  race: any
}

interface SessionApiResponse extends BaseApiResponse {
  season: number | string
  timezone?: string
  races: any
}

interface NextApiResponse extends BaseApiResponse {
  season: number | string
  timezone?: string
  round?: number | null
  championship: any
  race: any
}

interface LastApiResponse extends BaseApiResponse {
  season: number | string
  round: number | null
  timezone?: string
  championship: any
  race: any
}

// GET /current
router.get("/current", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const year = CURRENT_YEAR
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  const timezone = searchParams.get("timezone")
  try {
    const championshipData = await db
      .select()
      .from(championships)
      .where(eq(championships.year, year))
      .limit(1)

    if (championshipData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No seasons found for this year, try with another one."
      )
    }

    const championship = championshipData[0]

    const seasonData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .leftJoin(drivers, eq(races.winnerId, drivers.driverId))
      .leftJoin(teams, eq(races.teamWinnerId, teams.teamId))
      .where(eq(races.championshipId, championship.championshipId))
      .limit(limit)
      .offset(offset)
      .orderBy(races.round, races.raceId)

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.Races.raceId,
      championshipId: race.Races.championshipId,
      raceName: race.Races.raceName,
      schedule: {
        race: convertToTimezone(
          race.Races.raceDate,
          race.Races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.Races.qualyDate,
          race.Races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.Races.fp1Date,
          race.Races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.Races.fp2Date,
          race.Races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.Races.fp3Date,
          race.Races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.Races.sprintQualyDate,
          race.Races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.Races.sprintRaceDate,
          race.Races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.Races.laps,
      round: race.Races.round,
      url: race.Races.url,
      fast_lap: {
        fast_lap: race.Races.fastLap,
        fast_lap_driver_id: race.Races.fastLapDriverId,
        fast_lap_team_id: race.Races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.Circuits.circuitId,
        circuitName: race.Circuits.circuitName,
        country: race.Circuits.country,
        city: race.Circuits.city,
        circuitLength: race.Circuits.circuitLength + "km",
        lapRecord: race.Circuits.lapRecord,
        firstParticipationYear: race.Circuits.firstParticipationYear,
        corners: race.Circuits.numberOfCorners,
        fastestLapDriverId: race.Circuits.fastestLapDriverId,
        fastestLapTeamId: race.Circuits.fastestLapTeamId,
        fastestLapYear: race.Circuits.fastestLapYear,
        url: race.Circuits.url,
      },
      winner: race.Drivers?.driverId
        ? {
            driverId: race.Drivers.driverId,
            name: race.Drivers.name,
            surname: race.Drivers.surname,
            country: race.Drivers.nationality,
            birthday: race.Drivers.birthday,
            number: race.Drivers.number,
            shortName: race.Drivers.shortName,
            url: race.Drivers.url,
          }
        : null,
      teamWinner: race.Teams?.teamId
        ? {
            teamId: race.Teams.teamId,
            teamName: race.Teams.teamName,
            country: race.Teams.teamNationality,
            firstAppearance: race.Teams.firstAppeareance,
            constructorsChampionships: race.Teams.constructorsChampionships,
            driversChampionships: race.Teams.driversChampionships,
            url: race.Teams.url,
          }
        : null,
    }))

    const response: SeasonApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      championship: championship,
      races: formattedData,
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

// GET /current/next
router.get("/current/next", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const year = getYear()
    const today = getDay()

    const searchParams = new URL(fullUrl).searchParams
    const timezone = searchParams.get("timezone")

    const championshipData = await db
      .select()
      .from(championships)
      .where(eq(championships.year, year))
      .limit(1)

    if (championshipData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No seasons found for this year, try with another one."
      )
    }

    const championship = championshipData[0]

    const seasonData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .leftJoin(drivers, eq(races.winnerId, drivers.driverId))
      .leftJoin(teams, eq(races.teamWinnerId, teams.teamId))
      .where(
        and(
          eq(races.championshipId, championship.championshipId),
          gte(races.raceDate, today)
        )
      )
      .limit(1)
      .orderBy(asc(races.round))

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.Races.raceId,
      championshipId: race.Races.championshipId,
      raceName: race.Races.raceName,
      schedule: {
        race: convertToTimezone(
          race.Races.raceDate,
          race.Races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.Races.qualyDate,
          race.Races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.Races.fp1Date,
          race.Races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.Races.fp2Date,
          race.Races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.Races.fp3Date,
          race.Races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.Races.sprintQualyDate,
          race.Races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.Races.sprintRaceDate,
          race.Races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.Races.laps,
      round: race.Races.round,
      url: race.Races.url,
      fast_lap: {
        fast_lap: race.Races.fastLap,
        fast_lap_driver_id: race.Races.fastLapDriverId,
        fast_lap_team_id: race.Races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.Circuits.circuitId,
        circuitName: race.Circuits.circuitName,
        country: race.Circuits.country,
        city: race.Circuits.city,
        circuitLength: race.Circuits.circuitLength + "km",
        lapRecord: race.Circuits.lapRecord,
        firstParticipationYear: race.Circuits.firstParticipationYear,
        corners: race.Circuits.numberOfCorners,
        fastestLapDriverId: race.Circuits.fastestLapDriverId,
        fastestLapTeamId: race.Circuits.fastestLapTeamId,
        fastestLapYear: race.Circuits.fastestLapYear,
        url: race.Circuits.url,
      },
      winner: race.Drivers?.driverId
        ? {
            driverId: race.Drivers.driverId,
            name: race.Drivers.name,
            surname: race.Drivers.surname,
            country: race.Drivers.nationality,
            birthday: race.Drivers.birthday,
            number: race.Drivers.number,
            shortName: race.Drivers.shortName,
            url: race.Drivers.url,
          }
        : null,
      teamWinner: race.Teams?.teamId
        ? {
            teamId: race.Teams.teamId,
            teamName: race.Teams.teamName,
            country: race.Teams.teamNationality,
            firstAppearance: race.Teams.firstAppeareance,
            constructorsChampionships: race.Teams.constructorsChampionships,
            driversChampionships: race.Teams.driversChampionships,
            url: race.Teams.url,
          }
        : null,
    }))

    const response: NextApiResponse = {
      api: SITE_URL,
      url: `${SITE_URL}api/current/last`,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      round: formattedData[0].round,
      championship: championship,
      race: formattedData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control":
          "public, s-maxage=120, max-age=30, stale-while-revalidate=600, stale-if-error=86400",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /current/last
router.get("/current/last", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const year = CURRENT_YEAR
    const today = getDay()

    const searchParams = new URL(fullUrl).searchParams
    const timezone = searchParams.get("timezone")

    const championshipData = await db
      .select()
      .from(championships)
      .where(eq(championships.year, year))
      .limit(1)

    if (championshipData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No seasons found for this year, try with another one."
      )
    }

    const championship = championshipData[0]

    const seasonData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .leftJoin(drivers, eq(races.winnerId, drivers.driverId))
      .leftJoin(teams, eq(races.teamWinnerId, teams.teamId))
      .where(
        and(
          eq(races.championshipId, championship.championshipId),
          lte(races.raceDate, today)
        )
      )
      .limit(1)
      .orderBy(desc(races.round))

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.Races.raceId,
      championshipId: race.Races.championshipId,
      raceName: race.Races.raceName,
      schedule: {
        race: convertToTimezone(
          race.Races.raceDate,
          race.Races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.Races.qualyDate,
          race.Races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.Races.fp1Date,
          race.Races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.Races.fp2Date,
          race.Races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.Races.fp3Date,
          race.Races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.Races.sprintQualyDate,
          race.Races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.Races.sprintRaceDate,
          race.Races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.Races.laps,
      round: race.Races.round,
      url: race.Races.url,
      fast_lap: {
        fast_lap: race.Races.fastLap,
        fast_lap_driver_id: race.Races.fastLapDriverId,
        fast_lap_team_id: race.Races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.Circuits.circuitId,
        circuitName: race.Circuits.circuitName,
        country: race.Circuits.country,
        city: race.Circuits.city,
        circuitLength: race.Circuits.circuitLength + "km",
        lapRecord: race.Circuits.lapRecord,
        firstParticipationYear: race.Circuits.firstParticipationYear,
        corners: race.Circuits.numberOfCorners,
        fastestLapDriverId: race.Circuits.fastestLapDriverId,
        fastestLapTeamId: race.Circuits.fastestLapTeamId,
        fastestLapYear: race.Circuits.fastestLapYear,
        url: race.Circuits.url,
      },
      winner: race.Drivers?.driverId
        ? {
            driverId: race.Drivers.driverId,
            name: race.Drivers.name,
            surname: race.Drivers.surname,
            country: race.Drivers.nationality,
            birthday: race.Drivers.birthday,
            number: race.Drivers.number,
            shortName: race.Drivers.shortName,
            url: race.Drivers.url,
          }
        : null,
      teamWinner: race.Teams?.teamId
        ? {
            teamId: race.Teams.teamId,
            teamName: race.Teams.teamName,
            country: race.Teams.teamNationality,
            firstAppearance: race.Teams.firstAppeareance,
            constructorsChampionships: race.Teams.constructorsChampionships,
            driversChampionships: race.Teams.driversChampionships,
            url: race.Teams.url,
          }
        : null,
    }))

    const response: LastApiResponse = {
      api: SITE_URL,
      url: `${SITE_URL}/api/current/last`,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      round: formattedData[0].round,
      championship: championship,
      race: formattedData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control":
          "public, s-maxage=120, max-age=30, stale-while-revalidate=600, stale-if-error=86400",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /current/last/race
router.get("/current/last/race", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")

    const year = CURRENT_YEAR
    const today = getDay()

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.championshipId, `f1_${year}`),
          lte(races.raceDate, today)
        )
      )
      .orderBy(desc(races.round))
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No race found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const resultsData = await db
      .select()
      .from(results)
      .innerJoin(drivers, eq(results.driverId, drivers.driverId))
      .innerJoin(teams, eq(results.teamId, teams.teamId))
      .where(eq(results.raceId, race.Races.raceId))
      .orderBy(results.finishingPosition)
      .limit(limit || 20)
      .offset(offset)

    if (resultsData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No race results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.raceDate,
      race.Races.raceTime,
      timezone
    )

    const processedData = resultsData.map((result) => ({
      position: String(result.Results.finishingPosition),
      points: result.Results.pointsObtained,
      grid: String(result.Results.gridPosition),
      time: result.Results.raceTime,
      fastLap: result.Results.fastLap,
      retired: result.Results.retired,
      driver: {
        driverId: result.Results.driverId,
        number: result.Drivers.number,
        shortName: result.Drivers.shortName,
        url: result.Drivers.url,
        name: result.Drivers.name,
        surname: result.Drivers.surname,
        nationality: result.Drivers.nationality,
        birthday: result.Drivers.birthday,
      },
      team: {
        teamId: result.Results.teamId,
        teamName: result.Teams.teamName,
        nationality: result.Teams.teamNationality,
        firstAppareance: result.Teams.firstAppeareance,
        constructorsChampionships: result.Teams.constructorsChampionships,
        driversChampionships: result.Teams.driversChampionships,
        url: result.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      corners: race.Circuits.numberOfCorners,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      lapRecord: race.Circuits.lapRecord,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: resultsData.length,
      season: year,
      races: {
        round: race.Races.round,
        date: localDate,
        time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        results: processedData,
      },
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

// GET /current/last/qualy
router.get("/current/last/qualy", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)

  try {
    const timezone = searchParams.get("timezone")

    const year = CURRENT_YEAR
    const today = getDay()

    const lastRace = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          lte(races.qualyDate, today),
          eq(races.championshipId, `f1_${year}`)
        )
      )
      .orderBy(desc(races.qualyDate), desc(races.round))
      .limit(1)

    if (lastRace.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No qualifying results found for the current season."
      )
    }

    const race = lastRace[0]

    const qualyData = await db
      .select()
      .from(classifications)
      .innerJoin(drivers, eq(classifications.driverId, drivers.driverId))
      .innerJoin(teams, eq(classifications.teamId, teams.teamId))
      .where(eq(classifications.raceId, race.Races.raceId))
      .limit(limit || 20)
      .offset(offset)
      .orderBy(asc(classifications.gridPosition))

    if (qualyData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No qualifying results found for the last race."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.qualyDate,
      race.Races.qualyTime,
      timezone
    )

    const processedData = qualyData.map((row) => ({
      classificationId: row.Classifications.classificationId,
      driverId: row.Classifications.driverId,
      teamId: row.Classifications.teamId,
      q1: row.Classifications.q1,
      q2: row.Classifications.q2,
      q3: row.Classifications.q3,
      gridPosition: row.Classifications.gridPosition,
      driver: {
        driverId: row.Drivers.driverId,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        url: row.Drivers.url,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        birthday: row.Drivers.birthday,
      },
      team: {
        teamId: row.Teams.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      corners: race.Circuits.numberOfCorners,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      lapRecord: race.Circuits.lapRecord,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: qualyData.length,
      season: year,
      races: {
        round: race.Races.round,
        qualyTime: localTime,
        qualyDate: localDate,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        qualyResults: processedData,
      },
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

// GET /current/last/fp1
router.get("/current/last/fp1", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")
    const year = CURRENT_YEAR
    const today = getDay()

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(lte(races.fp1Date, today), eq(races.championshipId, `f1_${year}`))
      )
      .orderBy(desc(races.fp1Date), desc(races.round))
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp1 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp1Data = await db
      .select()
      .from(fp1)
      .innerJoin(drivers, eq(fp1.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp1.teamId, teams.teamId))
      .where(eq(fp1.raceId, race.Races.raceId))
      .limit(limit || 20)
      .offset(offset)
      .orderBy(fp1.time)

    if (fp1Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp1 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp1Date,
      race.Races.fp1Time,
      timezone
    )

    const processedData = fp1Data.map((row) => ({
      fp1Id: row.FP1.fp1Id,
      driverId: row.FP1.driverId,
      teamId: row.FP1.teamId,
      time: row.FP1.time,
      driver: {
        driverId: row.FP1.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP1.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp1Data.length,
      season: year,
      races: {
        round: race.Races.round,
        fp1Date: localDate,
        fp1Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp1Results: processedData,
      },
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

// GET /current/last/fp2
router.get("/current/last/fp2", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")
    const year = CURRENT_YEAR
    const today = getDay()

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(lte(races.fp2Date, today), eq(races.championshipId, `f1_${year}`))
      )
      .orderBy(desc(races.fp2Date), desc(races.round))
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp2 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp2Data = await db
      .select()
      .from(fp2)
      .innerJoin(drivers, eq(fp2.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp2.teamId, teams.teamId))
      .where(eq(fp2.raceId, race.Races.raceId))
      .limit(limit || 20)
      .offset(offset)
      .orderBy(fp2.time)

    if (fp2Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp2 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp2Date,
      race.Races.fp2Time,
      timezone
    )

    const processedData = fp2Data.map((row) => ({
      fp2Id: row.FP2.fp2Id,
      driverId: row.FP2.driverId,
      teamId: row.FP2.teamId,
      time: row.FP2.time,
      driver: {
        driverId: row.FP2.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP2.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp2Data.length,
      season: year,
      races: {
        round: race.Races.round,
        fp2Date: localDate,
        fp2Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp2Results: processedData,
      },
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

// GET /current/last/fp3
router.get("/current/last/fp3", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")

    const year = CURRENT_YEAR
    const today = getDay()

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(lte(races.fp3Date, today), eq(races.championshipId, `f1_${year}`))
      )
      .orderBy(desc(races.fp3Date), desc(races.round))
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp3 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp3Data = await db
      .select()
      .from(fp3)
      .innerJoin(drivers, eq(fp3.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp3.teamId, teams.teamId))
      .where(eq(fp3.raceId, race.Races.raceId))
      .limit(limit || 20)
      .offset(offset)
      .orderBy(fp3.time)

    if (fp3Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp3 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp3Date,
      race.Races.fp3Time,
      timezone
    )

    const processedData = fp3Data.map((row) => ({
      fp3Id: row.FP3.fp3Id,
      driverId: row.FP3.driverId,
      teamId: row.FP3.teamId,
      time: row.FP3.time,
      driver: {
        driverId: row.FP3.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP3.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp3Data.length,
      season: year,
      races: {
        round: race.Races.round,
        fp3Date: localDate,
        fp3Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp3Results: processedData,
      },
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

// GET /current/last/sprint/race
router.get(
  "/current/last/sprint/race",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)

    try {
      const year = CURRENT_YEAR
      const today = getDay()

      const lastSprintRace = await db
        .select()
        .from(races)
        .where(
          and(
            eq(races.championshipId, `f1_${year}`),
            lte(races.sprintRaceDate, today)
          )
        )
        .orderBy(desc(races.sprintRaceDate), desc(races.round))
        .limit(1)

      if (lastSprintRace.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint race results found for this season yet."
        )
      }

      const race = lastSprintRace[0]

      const sprintRaceData = await db
        .select()
        .from(sprintRace)
        .innerJoin(drivers, eq(sprintRace.driverId, drivers.driverId))
        .innerJoin(teams, eq(sprintRace.teamId, teams.teamId))
        .innerJoin(races, eq(sprintRace.raceId, races.raceId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        .where(eq(sprintRace.raceId, race.raceId))
        .orderBy(sprintRace.finishingPosition)
        .limit(limit)
        .offset(offset)

      if (sprintRaceData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint race results found for this round. Try with other one."
        )
      }

      const processedData = sprintRaceData.map((row) => ({
        sprintRaceId: row.Sprint_Race.sprintRaceId,
        position: row.Sprint_Race.finishingPosition,
        points: row.Sprint_Race.pointsObtained,
        grid: row.Sprint_Race.gridPosition,
        laps: row.Sprint_Race.laps,
        time: row.Sprint_Race.raceTime,
        retired: row.Sprint_Race.retired,
        driver: {
          driverId: row.Drivers.driverId,
          number: row.Drivers.number,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
        },
        team: {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          nationality: row.Teams.teamNationality,
          firstAppareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        },
      }))

      const circuitData = {
        circuitId: sprintRaceData[0].Circuits.circuitId,
        circuitName: sprintRaceData[0].Circuits.circuitName,
        country: sprintRaceData[0].Circuits.country,
        city: sprintRaceData[0].Circuits.city,
        circuitLength:
          sprintRaceData[0].Circuits.circuitLength !== null &&
          sprintRaceData[0].Circuits.circuitLength !== undefined
            ? `${sprintRaceData[0].Circuits.circuitLength}km`
            : null,
        lapRecord: sprintRaceData[0].Circuits.lapRecord,
        firstParticipationYear:
          sprintRaceData[0].Circuits.firstParticipationYear,
        corners: sprintRaceData[0].Circuits.numberOfCorners,
        fastestLapDriverId: sprintRaceData[0].Circuits.fastestLapDriverId,
        fastestLapTeamId: sprintRaceData[0].Circuits.fastestLapTeamId,
        fastestLapYear: sprintRaceData[0].Circuits.fastestLapYear,
        url: sprintRaceData[0].Circuits.url,
      }

      const response: SessionApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit,
        offset,
        total: processedData.length,
        season: year,
        races: {
          date: race.sprintRaceDate,
          time: race.sprintRaceTime,
          raceId: race.raceId,
          raceName: race.raceName,
          round: race.round,
          url: race.url,
          circuit: circuitData,
          sprintRaceResults: processedData,
        },
      }

      return res
        .status(200)
        .set({
          "Cache-Control":
            "public, s-maxage=120, max-age=30, stale-while-revalidate=600, stale-if-error=86400",
        })
        .json(response)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: "Server error" })
    }
  }
)

// GET /current/last/sprint/qualy
router.get(
  "/current/last/sprint/qualy",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)

    try {
      const timezone = searchParams.get("timezone")

      const year = CURRENT_YEAR
      const today = getDay()

      const lastSprintQualy = await db
        .select()
        .from(races)
        .where(
          and(
            eq(races.championshipId, `f1_${year}`),
            lte(races.sprintQualyDate, today)
          )
        )
        .orderBy(desc(races.sprintQualyDate), desc(races.round))
        .limit(1)

      if (lastSprintQualy.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint qualifying results found for this season yet."
        )
      }

      const race = lastSprintQualy[0]

      const sprintQualyData = await db
        .select()
        .from(sprintQualy)
        .innerJoin(drivers, eq(sprintQualy.driverId, drivers.driverId))
        .innerJoin(teams, eq(sprintQualy.teamId, teams.teamId))
        .innerJoin(races, eq(sprintQualy.raceId, races.raceId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        .where(eq(sprintQualy.raceId, race.raceId))
        .orderBy(sprintQualy.gridPosition)
        .limit(limit)
        .offset(offset)

      if (sprintQualyData.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint qualy results found for this round. Try with other one."
        )
      }

      const processedData = sprintQualyData.map((row) => ({
        sprintQualyId: row.Sprint_Qualy.sprintQualyId,
        raceId: row.Sprint_Qualy.raceId,
        driverId: row.Sprint_Qualy.driverId,
        teamId: row.Sprint_Qualy.teamId,
        sq1: row.Sprint_Qualy.sq1,
        sq2: row.Sprint_Qualy.sq2,
        sq3: row.Sprint_Qualy.sq3,
        gridPosition: row.Sprint_Qualy.gridPosition,
        driver: {
          driverId: row.Drivers.driverId,
          number: row.Drivers.number,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
        },
        team: {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          nationality: row.Teams.teamNationality,
          firstAppareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        },
      }))

      const circuitData = {
        circuitId: sprintQualyData[0].Circuits.circuitId,
        circuitName: sprintQualyData[0].Circuits.circuitName,
        country: sprintQualyData[0].Circuits.country,
        city: sprintQualyData[0].Circuits.city,
        circuitLength:
          sprintQualyData[0].Circuits.circuitLength !== null &&
          sprintQualyData[0].Circuits.circuitLength !== undefined
            ? `${sprintQualyData[0].Circuits.circuitLength}km`
            : null,
        lapRecord: sprintQualyData[0].Circuits.lapRecord,
        firstParticipationYear:
          sprintQualyData[0].Circuits.firstParticipationYear,
        corners: sprintQualyData[0].Circuits.numberOfCorners,
        fastestLapDriverId: sprintQualyData[0].Circuits.fastestLapDriverId,
        fastestLapTeamId: sprintQualyData[0].Circuits.fastestLapTeamId,
        fastestLapYear: sprintQualyData[0].Circuits.fastestLapYear,
        url: sprintQualyData[0].Circuits.url,
      }

      const response: SessionApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit,
        offset,
        total: processedData.length,
        season: year,
        races: {
          date: race.sprintQualyDate,
          time: race.sprintQualyTime,
          raceId: race.raceId,
          raceName: race.raceName,
          round: race.round,
          url: race.url,
          circuit: circuitData,
          sprintQualyResults: processedData,
        },
      }

      return res
        .status(200)
        .set({
          "Cache-Control":
            "public, s-maxage=120, max-age=30, stale-while-revalidate=600, stale-if-error=86400",
        })
        .json(response)
    } catch (error) {
      console.log(error)
      return res.status(500).json({ message: "Server error" })
    }
  }
)


// GET /:year
router.get("/:year", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { year } = req.params
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    const timezone = searchParams.get("timezone")

    const championshipData = await db
      .select()
      .from(championships)
      .where(eq(championships.year, Number(year)))
      .limit(1)

    if (championshipData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No seasons found for this year, try with another one."
      )
    }

    const championship = championshipData[0]

    const seasonData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .leftJoin(drivers, eq(races.winnerId, drivers.driverId))
      .leftJoin(teams, eq(races.teamWinnerId, teams.teamId))
      .where(eq(races.championshipId, championship.championshipId))
      .limit(limit)
      .offset(offset)
      .orderBy(races.round, races.raceId)

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.Races.raceId,
      championshipId: race.Races.championshipId,
      raceName: race.Races.raceName,
      schedule: {
        race: convertToTimezone(
          race.Races.raceDate,
          race.Races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.Races.qualyDate,
          race.Races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.Races.fp1Date,
          race.Races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.Races.fp2Date,
          race.Races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.Races.fp3Date,
          race.Races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.Races.sprintQualyDate,
          race.Races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.Races.sprintRaceDate,
          race.Races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.Races.laps,
      round: race.Races.round,
      url: race.Races.url,
      fast_lap: {
        fast_lap: race.Races.fastLap,
        fast_lap_driver_id: race.Races.fastLapDriverId,
        fast_lap_team_id: race.Races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.Circuits.circuitId,
        circuitName: race.Circuits.circuitName,
        country: race.Circuits.country,
        city: race.Circuits.city,
        circuitLength: race.Circuits.circuitLength + "km",
        lapRecord: race.Circuits.lapRecord,
        firstParticipationYear: race.Circuits.firstParticipationYear,
        corners: race.Circuits.numberOfCorners,
        fastestLapDriverId: race.Circuits.fastestLapDriverId,
        fastestLapTeamId: race.Circuits.fastestLapTeamId,
        fastestLapYear: race.Circuits.fastestLapYear,
        url: race.Circuits.url,
      },
      winner: race.Drivers?.driverId
        ? {
            driverId: race.Drivers.driverId,
            name: race.Drivers.name,
            surname: race.Drivers.surname,
            country: race.Drivers.nationality,
            birthday: race.Drivers.birthday,
            number: race.Drivers.number,
            shortName: race.Drivers.shortName,
            url: race.Drivers.url,
          }
        : null,
      teamWinner: race.Teams?.teamId
        ? {
            teamId: race.Teams.teamId,
            teamName: race.Teams.teamName,
            country: race.Teams.teamNationality,
            firstAppearance: race.Teams.firstAppeareance,
            constructorsChampionships: race.Teams.constructorsChampionships,
            driversChampionships: race.Teams.driversChampionships,
            url: race.Teams.url,
          }
        : null,
    }))

    const response = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: parseInt(year),
      championship: championship,
      races: formattedData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=30",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /:year/:round
router.get("/:year/:round", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { year, round } = req.params
    const searchParams = new URL(fullUrl).searchParams
    const timezone = searchParams.get("timezone")

    const championshipData = await db
      .select()
      .from(championships)
      .where(eq(championships.year, Number(year)))
      .limit(1)

    if (championshipData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No seasons found for this year, try with another one."
      )
    }

    const championship = championshipData[0]

    const seasonData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .leftJoin(drivers, eq(races.winnerId, drivers.driverId))
      .leftJoin(teams, eq(races.teamWinnerId, teams.teamId))
      .where(
        and(
          eq(races.championshipId, championship.championshipId),
          eq(races.round, Number(round))
        )
      )
      .limit(1)
      .orderBy(races.round, races.raceId)

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.Races.raceId,
      championshipId: race.Races.championshipId,
      raceName: race.Races.raceName,
      schedule: {
        race: convertToTimezone(
          race.Races.raceDate,
          race.Races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.Races.qualyDate,
          race.Races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.Races.fp1Date,
          race.Races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.Races.fp2Date,
          race.Races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.Races.fp3Date,
          race.Races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.Races.sprintQualyDate,
          race.Races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.Races.sprintRaceDate,
          race.Races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.Races.laps,
      round: race.Races.round,
      url: race.Races.url,
      fast_lap: {
        fast_lap: race.Races.fastLap,
        fast_lap_driver_id: race.Races.fastLapDriverId,
        fast_lap_team_id: race.Races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.Circuits.circuitId,
        circuitName: race.Circuits.circuitName,
        country: race.Circuits.country,
        city: race.Circuits.city,
        circuitLength:
          race.Circuits.circuitLength !== null &&
          race.Circuits.circuitLength !== undefined
            ? `${race.Circuits.circuitLength}km`
            : null,
        lapRecord: race.Circuits.lapRecord,
        firstParticipationYear: race.Circuits.firstParticipationYear,
        corners: race.Circuits.numberOfCorners,
        fastestLapDriverId: race.Circuits.fastestLapDriverId,
        fastestLapTeamId: race.Circuits.fastestLapTeamId,
        fastestLapYear: race.Circuits.fastestLapYear,
        url: race.Circuits.url,
      },
      winner: race.Drivers?.driverId
        ? {
            driverId: race.Drivers.driverId,
            name: race.Drivers.name,
            surname: race.Drivers.surname,
            country: race.Drivers.nationality,
            birthday: race.Drivers.birthday,
            number: race.Drivers.number,
            shortName: race.Drivers.shortName,
            url: race.Drivers.url,
          }
        : null,
      teamWinner: race.Teams?.teamId
        ? {
            teamId: race.Teams.teamId,
            teamName: race.Teams.teamName,
            country: race.Teams.teamNationality,
            firstAppearance: race.Teams.firstAppeareance,
            constructorsChampionships: race.Teams.constructorsChampionships,
            driversChampionships: race.Teams.driversChampionships,
            url: race.Teams.url,
          }
        : null,
    }))

    const response: RoundApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: formattedData.length,
      timezone: timezone ?? undefined,
      season: parseInt(year),
      round: round,
      championship: championship,
      race: formattedData,
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=30",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /:year/:round/race
router.get("/:year/:round/race", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)

  try {
    const timezone = searchParams.get("timezone")
    const { year, round } = req.params
    const roundNumber = Number(round)

    if (!Number.isInteger(roundNumber)) {
      return apiNotFound(
        res,
        fullUrl,
        "No race found for this round. Try with other one."
      )
    }

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.championshipId, `f1_${year}`),
          eq(races.round, roundNumber)
        )
      )
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No race found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const resultsData = await db
      .select()
      .from(results)
      .innerJoin(drivers, eq(results.driverId, drivers.driverId))
      .innerJoin(teams, eq(results.teamId, teams.teamId))
      .where(eq(results.raceId, race.Races.raceId))
      .orderBy(results.finishingPosition)
      .limit(limit)
      .offset(offset)

    if (resultsData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No race results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      raceData[0].Races.raceDate,
      raceData[0].Races.raceTime,
      timezone
    )

    const processedData = resultsData.map((result) => ({
      position: String(result.Results.finishingPosition),
      points: result.Results.pointsObtained,
      grid: String(result.Results.gridPosition),
      time: result.Results.raceTime,
      fastLap: result.Results.fastLap,
      retired: result.Results.retired,
      driver: {
        driverId: result.Results.driverId,
        number: result.Drivers.number,
        shortName: result.Drivers.shortName,
        url: result.Drivers.url,
        name: result.Drivers.name,
        surname: result.Drivers.surname,
        nationality: result.Drivers.nationality,
        birthday: result.Drivers.birthday,
      },
      team: {
        teamId: result.Results.teamId,
        teamName: result.Teams.teamName,
        nationality: result.Teams.teamNationality,
        firstAppareance: result.Teams.firstAppeareance,
        constructorsChampionships: result.Teams.constructorsChampionships,
        driversChampionships: result.Teams.driversChampionships,
        url: result.Teams.url,
      },
    }))

    const circuitData = raceData.map((circuit) => {
      return {
        circuitId: circuit.Circuits.circuitId,
        circuitName: circuit.Circuits.circuitName,
        country: circuit.Circuits.country,
        city: circuit.Circuits.city,
        circuitLength:
          circuit.Circuits.circuitLength !== null &&
          circuit.Circuits.circuitLength !== undefined
            ? `${circuit.Circuits.circuitLength}km`
            : null,
        corners: circuit.Circuits.numberOfCorners,
        firstParticipationYear: circuit.Circuits.firstParticipationYear,
        lapRecord: circuit.Circuits.lapRecord,
        fastestLapDriverId: circuit.Circuits.fastestLapDriverId,
        fastestLapTeamId: circuit.Circuits.fastestLapTeamId,
        fastestLapYear: circuit.Circuits.fastestLapYear,
        url: circuit.Circuits.url,
      }
    })

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: resultsData.length,
      season: parseInt(year),
      races: {
        round: round,
        date: localDate,
        time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        results: processedData,
      },
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

// GET /:year/:round/qualy
router.get("/:year/:round/qualy", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const { year, round } = req.params
    const roundNumber = Number(round)
    const timezone = searchParams.get("timezone")

    if (!Number.isInteger(roundNumber)) {
      return apiNotFound(
        res,
        fullUrl,
        "No qualy results found for this round. Try with other one."
      )
    }

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.round, roundNumber),
          eq(races.championshipId, `f1_${year}`)
        )
      )
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No qualy results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const qualyData = await db
      .select()
      .from(classifications)
      .innerJoin(drivers, eq(classifications.driverId, drivers.driverId))
      .innerJoin(teams, eq(classifications.teamId, teams.teamId))
      .where(eq(classifications.raceId, race.Races.raceId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(classifications.gridPosition))

    if (qualyData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No qualy results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.qualyDate,
      race.Races.qualyTime,
      timezone
    )

    const processedData = qualyData.map((row) => ({
      classificationId: row.Classifications.classificationId,
      driverId: row.Classifications.driverId,
      teamId: row.Classifications.teamId,
      q1: row.Classifications.q1,
      q2: row.Classifications.q2,
      q3: row.Classifications.q3,
      gridPosition: row.Classifications.gridPosition,
      driver: {
        driverId: row.Drivers.driverId,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        url: row.Drivers.url,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        birthday: row.Drivers.birthday,
      },
      team: {
        teamId: row.Teams.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: qualyData.length,
      season: parseInt(year),
      races: {
        round: round,
        qualyTime: localTime,
        qualyDate: localDate,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        qualyResults: processedData,
      },
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

// GET /:year/:round/fp1
router.get("/:year/:round/fp1", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")
    const { year, round } = req.params
    const roundNumber = Number(round)

    if (!Number.isInteger(roundNumber)) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp1 results found for this round. Try with other one."
      )
    }

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.round, roundNumber),
          eq(races.championshipId, `f1_${year}`)
        )
      )
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp1 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp1Data = await db
      .select()
      .from(fp1)
      .innerJoin(drivers, eq(fp1.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp1.teamId, teams.teamId))
      .where(eq(fp1.raceId, race.Races.raceId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(fp1.time))

    if (fp1Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp1 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp1Date,
      race.Races.fp1Time,
      timezone
    )

    const processedData = fp1Data.map((row) => ({
      fp1Id: row.FP1.fp1Id,
      driverId: row.FP1.driverId,
      teamId: row.FP1.teamId,
      time: row.FP1.time,
      driver: {
        driverId: row.FP1.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP1.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp1Data.length,
      season: parseInt(year),
      races: {
        round: round,
        fp1Date: localDate,
        fp1Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp1Results: processedData,
      },
    }

    return res
      .status(200)
      .set({
        "Cache-Control": "public, max-age=600, stale-while-revalidate=30",
      })
      .json(response)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Server error" })
  }
})

// GET /:year/:round/fp2
router.get("/:year/:round/fp2", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const timezone = searchParams.get("timezone")
    const { year, round } = req.params
    const roundNumber = Number(round)

    if (!Number.isInteger(roundNumber)) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp2 results found for this round. Try with other one."
      )
    }

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.round, roundNumber),
          eq(races.championshipId, `f1_${year}`)
        )
      )
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp2 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp2Data = await db
      .select()
      .from(fp2)
      .innerJoin(drivers, eq(fp2.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp2.teamId, teams.teamId))
      .where(eq(fp2.raceId, race.Races.raceId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(fp2.time))

    if (fp2Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp2 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp2Date,
      race.Races.fp2Time,
      timezone
    )

    const processedData = fp2Data.map((row) => ({
      fp2Id: row.FP2.fp2Id,
      driverId: row.FP2.driverId,
      teamId: row.FP2.teamId,
      time: row.FP2.time,
      driver: {
        driverId: row.FP2.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP2.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp2Data.length,
      season: parseInt(year),
      races: {
        round: round,
        fp2Date: localDate,
        fp2Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp2Results: processedData,
      },
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

// GET /:year/:round/fp3
router.get("/:year/:round/fp3", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const { year, round } = req.params
    const roundNumber = Number(round)
    const timezone = searchParams.get("timezone")

    if (!Number.isInteger(roundNumber)) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp3 results found for this round. Try with other one."
      )
    }

    const raceData = await db
      .select()
      .from(races)
      .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
      .where(
        and(
          eq(races.round, roundNumber),
          eq(races.championshipId, `f1_${year}`)
        )
      )
      .limit(1)

    if (raceData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp3 results found for this round. Try with other one."
      )
    }

    const race = raceData[0]

    const fp3Data = await db
      .select()
      .from(fp3)
      .innerJoin(drivers, eq(fp3.driverId, drivers.driverId))
      .innerJoin(teams, eq(fp3.teamId, teams.teamId))
      .where(eq(fp3.raceId, race.Races.raceId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(fp3.time))

    if (fp3Data.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No fp3 results found for this round. Try with other one."
      )
    }

    const { date: localDate, time: localTime } = convertToTimezone(
      race.Races.fp3Date,
      race.Races.fp3Time,
      timezone
    )

    const processedData = fp3Data.map((row) => ({
      fp3Id: row.FP3.fp3Id,
      driverId: row.FP3.driverId,
      teamId: row.FP3.teamId,
      time: row.FP3.time,
      driver: {
        driverId: row.FP3.driverId,
        name: row.Drivers.name,
        surname: row.Drivers.surname,
        nationality: row.Drivers.nationality,
        number: row.Drivers.number,
        shortName: row.Drivers.shortName,
        birthday: row.Drivers.birthday,
        url: row.Drivers.url,
      },
      team: {
        teamId: row.FP3.teamId,
        teamName: row.Teams.teamName,
        nationality: row.Teams.teamNationality,
        firstAppareance: row.Teams.firstAppeareance,
        constructorsChampionships: row.Teams.constructorsChampionships,
        driversChampionships: row.Teams.driversChampionships,
        url: row.Teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.Circuits.circuitId,
      circuitName: race.Circuits.circuitName,
      country: race.Circuits.country,
      city: race.Circuits.city,
      circuitLength:
        race.Circuits.circuitLength !== null &&
        race.Circuits.circuitLength !== undefined
          ? `${race.Circuits.circuitLength}km`
          : null,
      lapRecord: race.Circuits.lapRecord,
      firstParticipationYear: race.Circuits.firstParticipationYear,
      corners: race.Circuits.numberOfCorners,
      fastestLapDriverId: race.Circuits.fastestLapDriverId,
      fastestLapTeamId: race.Circuits.fastestLapTeamId,
      fastestLapYear: race.Circuits.fastestLapYear,
      url: race.Circuits.url,
    }

    const response: SessionApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: fp3Data.length,
      season: parseInt(year),
      races: {
        round: round,
        fp3Date: localDate,
        fp3Time: localTime,
        url: race.Races.url,
        raceId: race.Races.raceId,
        raceName: race.Races.raceName,
        circuit: circuitData,
        fp3Results: processedData,
      },
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

// GET /:year/:round/sprint/race
router.get(
  "/:year/:round/sprint/race",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const timezone = searchParams.get("timezone")
      const { year, round } = req.params

      const sprintRaceResults = await db
        .select()
        .from(sprintRace)
        .innerJoin(races, eq(races.raceId, sprintRace.raceId))
        .innerJoin(
          championships,
          eq(races.championshipId, championships.championshipId)
        )
        .innerJoin(drivers, eq(sprintRace.driverId, drivers.driverId))
        .innerJoin(teams, eq(sprintRace.teamId, teams.teamId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        .where(
          and(
            eq(races.round, Number(round)),
            eq(races.championshipId, `f1_${year}`)
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(asc(sprintRace.finishingPosition))

      if (sprintRaceResults.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint race results found for this round. Try with other one."
        )
      }

      const { date: localDate, time: localTime } = convertToTimezone(
        sprintRaceResults[0].Races.sprintRaceDate,
        sprintRaceResults[0].Races.sprintRaceTime,
        timezone
      )

      const processedData = sprintRaceResults.map((row) => ({
        sprintRaceId: row.Sprint_Race.sprintRaceId,
        driverId: row.Sprint_Race.driverId,
        teamId: row.Sprint_Race.teamId,
        position: row.Sprint_Race.finishingPosition,
        gridPosition: row.Sprint_Race.gridPosition,
        points: row.Sprint_Race.pointsObtained,
        driver: {
          driverId: row.Drivers.driverId,
          number: row.Drivers.number,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
        },
        team: {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          teamNationality: row.Teams.teamNationality,
          firstAppeareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        },
      }))

      const circuitData = sprintRaceResults.map((row) => {
        return {
          circuitId: row.Circuits.circuitId,
          circuitName: row.Circuits.circuitName,
          country: row.Circuits.country,
          city: row.Circuits.city,
          circuitLength: row.Circuits.circuitLength + "km",
          corners: row.Circuits.numberOfCorners,
          firstParticipationYear: row.Circuits.firstParticipationYear,
          lapRecord: row.Circuits.lapRecord,
          fastestLapDriverId: row.Circuits.fastestLapDriverId,
          fastestLapTeamId: row.Circuits.fastestLapTeamId,
          fastestLapYear: row.Circuits.fastestLapYear,
          url: row.Circuits.url,
        }
      })

      const response: SessionApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        timezone: timezone || undefined,
        total: sprintRaceResults.length,
        season: parseInt(year),
        races: {
          round: round,
          date: localDate,
          time: localTime,
          url: sprintRaceResults[0].Races.url,
          raceId: sprintRaceResults[0].Races.raceId,
          raceName: sprintRaceResults[0].Races.raceName,
          circuit: circuitData[0],
          sprintRaceResults: processedData,
        },
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

// GET /:year/:round/sprint/qualy
router.get(
  "/:year/:round/sprint/qualy",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    const searchParams = new URL(fullUrl).searchParams
    const { limit, offset } = getLimitAndOffset(searchParams)
    try {
      const timezone = searchParams.get("timezone")
      const { year, round } = req.params

      const sprintQualyResults = await db
        .select()
        .from(sprintQualy)
        .innerJoin(races, eq(races.raceId, sprintQualy.raceId))
        .innerJoin(
          championships,
          eq(races.championshipId, championships.championshipId)
        )
        .innerJoin(drivers, eq(sprintQualy.driverId, drivers.driverId))
        .innerJoin(teams, eq(sprintQualy.teamId, teams.teamId))
        .innerJoin(circuits, eq(races.circuit, circuits.circuitId))
        .where(
          and(
            eq(races.round, Number(round)),
            eq(races.championshipId, `f1_${year}`)
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(asc(sprintQualy.gridPosition))

      if (sprintQualyResults.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No sprint qualy results found for this round. Try with other one."
        )
      }

      const { date: localDate, time: localTime } = convertToTimezone(
        sprintQualyResults[0].Races.sprintQualyDate,
        sprintQualyResults[0].Races.sprintQualyTime,
        timezone
      )

      const processedData = sprintQualyResults.map((row) => ({
        sprintQualyId: row.Sprint_Qualy.sprintQualyId,
        driverId: row.Sprint_Qualy.driverId,
        teamId: row.Sprint_Qualy.teamId,
        sq1: row.Sprint_Qualy.sq1,
        sq2: row.Sprint_Qualy.sq2,
        sq3: row.Sprint_Qualy.sq3,
        gridPosition: row.Sprint_Qualy.gridPosition,
        driver: {
          driverId: row.Drivers.driverId,
          number: row.Drivers.number,
          name: row.Drivers.name,
          surname: row.Drivers.surname,
          shortName: row.Drivers.shortName,
          url: row.Drivers.url,
          nationality: row.Drivers.nationality,
          birthday: row.Drivers.birthday,
        },
        team: {
          teamId: row.Teams.teamId,
          teamName: row.Teams.teamName,
          teamNationality: row.Teams.teamNationality,
          firstAppeareance: row.Teams.firstAppeareance,
          constructorsChampionships: row.Teams.constructorsChampionships,
          driversChampionships: row.Teams.driversChampionships,
          url: row.Teams.url,
        },
      }))

      const circuitData = sprintQualyResults.map((row) => {
        return {
          circuitId: row.Circuits.circuitId,
          circuitName: row.Circuits.circuitName,
          country: row.Circuits.country,
          city: row.Circuits.city,
          circuitLength: row.Circuits.circuitLength + "km",
          corners: row.Circuits.numberOfCorners,
          firstParticipationYear: row.Circuits.firstParticipationYear,
          lapRecord: row.Circuits.lapRecord,
          fastestLapDriverId: row.Circuits.fastestLapDriverId,
          fastestLapTeamId: row.Circuits.fastestLapTeamId,
          fastestLapYear: row.Circuits.fastestLapYear,
          url: row.Circuits.url,
        }
      })

      const response: SessionApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        limit: limit,
        offset: offset,
        timezone: timezone || undefined,
        total: sprintQualyResults.length,
        season: parseInt(year),
        races: {
          round: round,
          date: localDate,
          time: localTime,
          url: sprintQualyResults[0].Races.url,
          raceId: sprintQualyResults[0].Races.raceId,
          raceName: sprintQualyResults[0].Races.raceName,
          circuit: circuitData[0],
          sprintQualyResults: processedData,
        },
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
