import { Router, type Request, type Response } from "express"
import { and, asc, desc, eq, gte, InferModel, lte } from "drizzle-orm"
import { db } from "../../db/index.js"
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
} from "../../db/migrations/schema.js"
import { CURRENT_YEAR, SITE_URL } from "../lib/constants.js"
import { BaseApiResponse } from "../lib/definitions.js"
import {
  apiNotFound,
  circuitSvg,
  convertToTimezone,
  getDay,
  getLimitAndOffset,
  getYear,
} from "../lib/utils.js"
import {
  getChampionshipDriverIds,
  getChampionshipTeamIds,
  getRaceDriverIds,
  getRaceTeamIds,
} from "../lib/participants.js"

const router = Router()

type ChampionshipRow = InferModel<typeof championships>

/**
 * Enriches a championship and its races with the driverIds/teamIds that
 * actually participated, derived from race results and championship
 * classifications rather than stored redundantly.
 */
async function withParticipants<T extends { raceId: string | null }>(
  championship: ChampionshipRow,
  formattedRaces: T[]
) {
  const raceIds = formattedRaces
    .map((race) => race.raceId)
    .filter((id): id is string => id !== null)

  const [raceDriverIds, raceTeamIds, championshipDriverIds, championshipTeamIds] =
    await Promise.all([
      getRaceDriverIds(raceIds),
      getRaceTeamIds(raceIds),
      getChampionshipDriverIds([championship.championshipId]),
      getChampionshipTeamIds([championship.championshipId]),
    ])

  const races = formattedRaces.map((race) => ({
    ...race,
    driverIds: race.raceId ? raceDriverIds.get(race.raceId) ?? [] : [],
    teamIds: race.raceId ? raceTeamIds.get(race.raceId) ?? [] : [],
  }))

  const championshipWithParticipants = {
    ...championship,
    driverIds: championshipDriverIds.get(championship.championshipId) ?? [],
    teamIds: championshipTeamIds.get(championship.championshipId) ?? [],
  }

  return { championship: championshipWithParticipants, races }
}

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
      raceId: race.races.raceId,
      championshipId: race.races.championshipId,
      raceName: race.races.raceName,
      schedule: {
        race: convertToTimezone(
          race.races.raceDate,
          race.races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.races.qualyDate,
          race.races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.races.fp1Date,
          race.races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.races.fp2Date,
          race.races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.races.fp3Date,
          race.races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.races.sprintQualyDate,
          race.races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.races.sprintRaceDate,
          race.races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.races.laps,
      round: race.races.round,
      url: race.races.url,
      fast_lap: {
        fast_lap: race.races.fastLap,
        fast_lap_driver_id: race.races.fastLapDriverId,
        fast_lap_team_id: race.races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.circuits.circuitId,
        circuitName: race.circuits.circuitName,
        country: race.circuits.country,
        city: race.circuits.city,
        circuitLength: race.circuits.circuitLength + "km",
        lapRecord: race.circuits.lapRecord,
        firstParticipationYear: race.circuits.firstParticipationYear,
        corners: race.circuits.numberOfCorners,
        fastestLapDriverId: race.circuits.fastestLapDriverId,
        fastestLapTeamId: race.circuits.fastestLapTeamId,
        fastestLapYear: race.circuits.fastestLapYear,
        url: race.circuits.url,
        svg: circuitSvg(race.circuits),
      },
      winner: race.drivers?.driverId
        ? {
            driverId: race.drivers.driverId,
            name: race.drivers.name,
            surname: race.drivers.surname,
            country: race.drivers.nationality,
            birthday: race.drivers.birthday,
            number: race.drivers.number,
            shortName: race.drivers.shortName,
            url: race.drivers.url,
          }
        : null,
      teamWinner: race.teams?.teamId
        ? {
            teamId: race.teams.teamId,
            teamName: race.teams.teamName,
            country: race.teams.teamNationality,
            firstAppearance: race.teams.firstAppeareance,
            constructorsChampionships: race.teams.constructorsChampionships,
            driversChampionships: race.teams.driversChampionships,
            url: race.teams.url,
          }
        : null,
    }))

    const { championship: championshipWithParticipants, races: racesWithParticipants } =
      await withParticipants(championship, formattedData)

    const response: SeasonApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      championship: championshipWithParticipants,
      races: racesWithParticipants,
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

    const candidates = await db
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
      .orderBy(asc(races.round))

    // `races.raceDate` alone can't tell a race that's already run today from
    // one that hasn't started yet — both satisfy `raceDate >= today`. Compare
    // the full date+time instant instead, so "next race" flips over to the
    // following round as soon as today's lights go out, not at midnight.
    const now = new Date()
    const seasonData = candidates
      .filter((row) => {
        if (!row.races.raceDate) return true
        const instant = new Date(`${row.races.raceDate}T${row.races.raceTime ?? "00:00:00Z"}`)
        return Number.isNaN(instant.getTime()) || instant >= now
      })
      .slice(0, 1)

    if (seasonData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No races found for this season, try with another one."
      )
    }

    const formattedData = seasonData.map((race) => ({
      raceId: race.races.raceId,
      championshipId: race.races.championshipId,
      raceName: race.races.raceName,
      schedule: {
        race: convertToTimezone(
          race.races.raceDate,
          race.races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.races.qualyDate,
          race.races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.races.fp1Date,
          race.races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.races.fp2Date,
          race.races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.races.fp3Date,
          race.races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.races.sprintQualyDate,
          race.races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.races.sprintRaceDate,
          race.races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.races.laps,
      round: race.races.round,
      url: race.races.url,
      fast_lap: {
        fast_lap: race.races.fastLap,
        fast_lap_driver_id: race.races.fastLapDriverId,
        fast_lap_team_id: race.races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.circuits.circuitId,
        circuitName: race.circuits.circuitName,
        country: race.circuits.country,
        city: race.circuits.city,
        circuitLength: race.circuits.circuitLength + "km",
        lapRecord: race.circuits.lapRecord,
        firstParticipationYear: race.circuits.firstParticipationYear,
        corners: race.circuits.numberOfCorners,
        fastestLapDriverId: race.circuits.fastestLapDriverId,
        fastestLapTeamId: race.circuits.fastestLapTeamId,
        fastestLapYear: race.circuits.fastestLapYear,
        url: race.circuits.url,
        svg: circuitSvg(race.circuits),
      },
      winner: race.drivers?.driverId
        ? {
            driverId: race.drivers.driverId,
            name: race.drivers.name,
            surname: race.drivers.surname,
            country: race.drivers.nationality,
            birthday: race.drivers.birthday,
            number: race.drivers.number,
            shortName: race.drivers.shortName,
            url: race.drivers.url,
          }
        : null,
      teamWinner: race.teams?.teamId
        ? {
            teamId: race.teams.teamId,
            teamName: race.teams.teamName,
            country: race.teams.teamNationality,
            firstAppearance: race.teams.firstAppeareance,
            constructorsChampionships: race.teams.constructorsChampionships,
            driversChampionships: race.teams.driversChampionships,
            url: race.teams.url,
          }
        : null,
    }))

    const { championship: championshipWithParticipants, races: racesWithParticipants } =
      await withParticipants(championship, formattedData)

    const response: NextApiResponse = {
      api: SITE_URL,
      url: `${SITE_URL}api/current/last`,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      round: formattedData[0].round,
      championship: championshipWithParticipants,
      race: racesWithParticipants,
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
      raceId: race.races.raceId,
      championshipId: race.races.championshipId,
      raceName: race.races.raceName,
      schedule: {
        race: convertToTimezone(
          race.races.raceDate,
          race.races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.races.qualyDate,
          race.races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.races.fp1Date,
          race.races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.races.fp2Date,
          race.races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.races.fp3Date,
          race.races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.races.sprintQualyDate,
          race.races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.races.sprintRaceDate,
          race.races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.races.laps,
      round: race.races.round,
      url: race.races.url,
      fast_lap: {
        fast_lap: race.races.fastLap,
        fast_lap_driver_id: race.races.fastLapDriverId,
        fast_lap_team_id: race.races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.circuits.circuitId,
        circuitName: race.circuits.circuitName,
        country: race.circuits.country,
        city: race.circuits.city,
        circuitLength: race.circuits.circuitLength + "km",
        lapRecord: race.circuits.lapRecord,
        firstParticipationYear: race.circuits.firstParticipationYear,
        corners: race.circuits.numberOfCorners,
        fastestLapDriverId: race.circuits.fastestLapDriverId,
        fastestLapTeamId: race.circuits.fastestLapTeamId,
        fastestLapYear: race.circuits.fastestLapYear,
        url: race.circuits.url,
        svg: circuitSvg(race.circuits),
      },
      winner: race.drivers?.driverId
        ? {
            driverId: race.drivers.driverId,
            name: race.drivers.name,
            surname: race.drivers.surname,
            country: race.drivers.nationality,
            birthday: race.drivers.birthday,
            number: race.drivers.number,
            shortName: race.drivers.shortName,
            url: race.drivers.url,
          }
        : null,
      teamWinner: race.teams?.teamId
        ? {
            teamId: race.teams.teamId,
            teamName: race.teams.teamName,
            country: race.teams.teamNationality,
            firstAppearance: race.teams.firstAppeareance,
            constructorsChampionships: race.teams.constructorsChampionships,
            driversChampionships: race.teams.driversChampionships,
            url: race.teams.url,
          }
        : null,
    }))

    const { championship: championshipWithParticipants, races: racesWithParticipants } =
      await withParticipants(championship, formattedData)

    const response: LastApiResponse = {
      api: SITE_URL,
      url: `${SITE_URL}/api/current/last`,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: year,
      round: formattedData[0].round,
      championship: championshipWithParticipants,
      race: racesWithParticipants,
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
      .where(eq(results.raceId, race.races.raceId))
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
      race.races.raceDate,
      race.races.raceTime,
      timezone
    )

    const processedData = resultsData.map((result) => ({
      position: String(result.results.finishingPosition),
      points: result.results.pointsObtained,
      grid: String(result.results.gridPosition),
      time: result.results.raceTime,
      fastLap: result.results.fastLap,
      retired: result.results.retired,
      driver: {
        driverId: result.results.driverId,
        number: result.drivers.number,
        shortName: result.drivers.shortName,
        url: result.drivers.url,
        name: result.drivers.name,
        surname: result.drivers.surname,
        nationality: result.drivers.nationality,
        birthday: result.drivers.birthday,
      },
      team: {
        teamId: result.results.teamId,
        teamName: result.teams.teamName,
        nationality: result.teams.teamNationality,
        firstAppareance: result.teams.firstAppeareance,
        constructorsChampionships: result.teams.constructorsChampionships,
        driversChampionships: result.teams.driversChampionships,
        url: result.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      corners: race.circuits.numberOfCorners,
      firstParticipationYear: race.circuits.firstParticipationYear,
      lapRecord: race.circuits.lapRecord,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        round: race.races.round,
        date: localDate,
        time: localTime,
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(classifications.raceId, race.races.raceId))
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
      race.races.qualyDate,
      race.races.qualyTime,
      timezone
    )

    const processedData = qualyData.map((row) => ({
      classificationId: row.classifications.classificationId,
      driverId: row.classifications.driverId,
      teamId: row.classifications.teamId,
      q1: row.classifications.q1,
      q2: row.classifications.q2,
      q3: row.classifications.q3,
      gridPosition: row.classifications.gridPosition,
      driver: {
        driverId: row.drivers.driverId,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        url: row.drivers.url,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        birthday: row.drivers.birthday,
      },
      team: {
        teamId: row.teams.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      corners: race.circuits.numberOfCorners,
      firstParticipationYear: race.circuits.firstParticipationYear,
      lapRecord: race.circuits.lapRecord,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        round: race.races.round,
        qualyTime: localTime,
        qualyDate: localDate,
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp1.raceId, race.races.raceId))
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
      race.races.fp1Date,
      race.races.fp1Time,
      timezone
    )

    const processedData = fp1Data.map((row) => ({
      fp1Id: row.fp1.fp1Id,
      driverId: row.fp1.driverId,
      teamId: row.fp1.teamId,
      time: row.fp1.time,
      driver: {
        driverId: row.fp1.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp1.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        round: race.races.round,
        fp1Date: localDate,
        fp1Time: localTime,
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp2.raceId, race.races.raceId))
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
      race.races.fp2Date,
      race.races.fp2Time,
      timezone
    )

    const processedData = fp2Data.map((row) => ({
      fp2Id: row.fp2.fp2Id,
      driverId: row.fp2.driverId,
      teamId: row.fp2.teamId,
      time: row.fp2.time,
      driver: {
        driverId: row.fp2.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp2.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        round: race.races.round,
        fp2Date: localDate,
        fp2Time: localTime,
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp3.raceId, race.races.raceId))
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
      race.races.fp3Date,
      race.races.fp3Time,
      timezone
    )

    const processedData = fp3Data.map((row) => ({
      fp3Id: row.fp3.fp3Id,
      driverId: row.fp3.driverId,
      teamId: row.fp3.teamId,
      time: row.fp3.time,
      driver: {
        driverId: row.fp3.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp3.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        round: race.races.round,
        fp3Date: localDate,
        fp3Time: localTime,
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
        sprintRaceId: row.sprint_race.sprintRaceId,
        position: row.sprint_race.finishingPosition,
        points: row.sprint_race.pointsObtained,
        grid: row.sprint_race.gridPosition,
        laps: row.sprint_race.laps,
        time: row.sprint_race.raceTime,
        retired: row.sprint_race.retired,
        driver: {
          driverId: row.drivers.driverId,
          number: row.drivers.number,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
          name: row.drivers.name,
          surname: row.drivers.surname,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
        },
        team: {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          nationality: row.teams.teamNationality,
          firstAppareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        },
      }))

      const circuitData = {
        circuitId: sprintRaceData[0].circuits.circuitId,
        circuitName: sprintRaceData[0].circuits.circuitName,
        country: sprintRaceData[0].circuits.country,
        city: sprintRaceData[0].circuits.city,
        circuitLength:
          sprintRaceData[0].circuits.circuitLength !== null &&
          sprintRaceData[0].circuits.circuitLength !== undefined
            ? `${sprintRaceData[0].circuits.circuitLength}km`
            : null,
        lapRecord: sprintRaceData[0].circuits.lapRecord,
        firstParticipationYear:
          sprintRaceData[0].circuits.firstParticipationYear,
        corners: sprintRaceData[0].circuits.numberOfCorners,
        fastestLapDriverId: sprintRaceData[0].circuits.fastestLapDriverId,
        fastestLapTeamId: sprintRaceData[0].circuits.fastestLapTeamId,
        fastestLapYear: sprintRaceData[0].circuits.fastestLapYear,
        url: sprintRaceData[0].circuits.url,
        svg: circuitSvg(sprintRaceData[0].circuits),
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
        sprintQualyId: row.sprint_qualy.sprintQualyId,
        raceId: row.sprint_qualy.raceId,
        driverId: row.sprint_qualy.driverId,
        teamId: row.sprint_qualy.teamId,
        sq1: row.sprint_qualy.sq1,
        sq2: row.sprint_qualy.sq2,
        sq3: row.sprint_qualy.sq3,
        gridPosition: row.sprint_qualy.gridPosition,
        driver: {
          driverId: row.drivers.driverId,
          number: row.drivers.number,
          name: row.drivers.name,
          surname: row.drivers.surname,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
        },
        team: {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          nationality: row.teams.teamNationality,
          firstAppareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        },
      }))

      const circuitData = {
        circuitId: sprintQualyData[0].circuits.circuitId,
        circuitName: sprintQualyData[0].circuits.circuitName,
        country: sprintQualyData[0].circuits.country,
        city: sprintQualyData[0].circuits.city,
        circuitLength:
          sprintQualyData[0].circuits.circuitLength !== null &&
          sprintQualyData[0].circuits.circuitLength !== undefined
            ? `${sprintQualyData[0].circuits.circuitLength}km`
            : null,
        lapRecord: sprintQualyData[0].circuits.lapRecord,
        firstParticipationYear:
          sprintQualyData[0].circuits.firstParticipationYear,
        corners: sprintQualyData[0].circuits.numberOfCorners,
        fastestLapDriverId: sprintQualyData[0].circuits.fastestLapDriverId,
        fastestLapTeamId: sprintQualyData[0].circuits.fastestLapTeamId,
        fastestLapYear: sprintQualyData[0].circuits.fastestLapYear,
        url: sprintQualyData[0].circuits.url,
        svg: circuitSvg(sprintQualyData[0].circuits),
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
      raceId: race.races.raceId,
      championshipId: race.races.championshipId,
      raceName: race.races.raceName,
      schedule: {
        race: convertToTimezone(
          race.races.raceDate,
          race.races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.races.qualyDate,
          race.races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.races.fp1Date,
          race.races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.races.fp2Date,
          race.races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.races.fp3Date,
          race.races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.races.sprintQualyDate,
          race.races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.races.sprintRaceDate,
          race.races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.races.laps,
      round: race.races.round,
      url: race.races.url,
      fast_lap: {
        fast_lap: race.races.fastLap,
        fast_lap_driver_id: race.races.fastLapDriverId,
        fast_lap_team_id: race.races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.circuits.circuitId,
        circuitName: race.circuits.circuitName,
        country: race.circuits.country,
        city: race.circuits.city,
        circuitLength: race.circuits.circuitLength + "km",
        lapRecord: race.circuits.lapRecord,
        firstParticipationYear: race.circuits.firstParticipationYear,
        corners: race.circuits.numberOfCorners,
        fastestLapDriverId: race.circuits.fastestLapDriverId,
        fastestLapTeamId: race.circuits.fastestLapTeamId,
        fastestLapYear: race.circuits.fastestLapYear,
        url: race.circuits.url,
        svg: circuitSvg(race.circuits),
      },
      winner: race.drivers?.driverId
        ? {
            driverId: race.drivers.driverId,
            name: race.drivers.name,
            surname: race.drivers.surname,
            country: race.drivers.nationality,
            birthday: race.drivers.birthday,
            number: race.drivers.number,
            shortName: race.drivers.shortName,
            url: race.drivers.url,
          }
        : null,
      teamWinner: race.teams?.teamId
        ? {
            teamId: race.teams.teamId,
            teamName: race.teams.teamName,
            country: race.teams.teamNationality,
            firstAppearance: race.teams.firstAppeareance,
            constructorsChampionships: race.teams.constructorsChampionships,
            driversChampionships: race.teams.driversChampionships,
            url: race.teams.url,
          }
        : null,
    }))

    const { championship: championshipWithParticipants, races: racesWithParticipants } =
      await withParticipants(championship, formattedData)

    const response = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      timezone: timezone || undefined,
      total: formattedData.length,
      season: parseInt(year),
      championship: championshipWithParticipants,
      races: racesWithParticipants,
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
      raceId: race.races.raceId,
      championshipId: race.races.championshipId,
      raceName: race.races.raceName,
      schedule: {
        race: convertToTimezone(
          race.races.raceDate,
          race.races.raceTime,
          timezone
        ),
        qualy: convertToTimezone(
          race.races.qualyDate,
          race.races.qualyTime,
          timezone
        ),
        fp1: convertToTimezone(
          race.races.fp1Date,
          race.races.fp1Time,
          timezone
        ),
        fp2: convertToTimezone(
          race.races.fp2Date,
          race.races.fp2Time,
          timezone
        ),
        fp3: convertToTimezone(
          race.races.fp3Date,
          race.races.fp3Time,
          timezone
        ),
        sprintQualy: convertToTimezone(
          race.races.sprintQualyDate,
          race.races.sprintQualyTime,
          timezone
        ),
        sprintRace: convertToTimezone(
          race.races.sprintRaceDate,
          race.races.sprintRaceTime,
          timezone
        ),
      },
      laps: race.races.laps,
      round: race.races.round,
      url: race.races.url,
      fast_lap: {
        fast_lap: race.races.fastLap,
        fast_lap_driver_id: race.races.fastLapDriverId,
        fast_lap_team_id: race.races.fastLapTeamId,
      },
      circuit: {
        circuitId: race.circuits.circuitId,
        circuitName: race.circuits.circuitName,
        country: race.circuits.country,
        city: race.circuits.city,
        circuitLength:
          race.circuits.circuitLength !== null &&
          race.circuits.circuitLength !== undefined
            ? `${race.circuits.circuitLength}km`
            : null,
        lapRecord: race.circuits.lapRecord,
        firstParticipationYear: race.circuits.firstParticipationYear,
        corners: race.circuits.numberOfCorners,
        fastestLapDriverId: race.circuits.fastestLapDriverId,
        fastestLapTeamId: race.circuits.fastestLapTeamId,
        fastestLapYear: race.circuits.fastestLapYear,
        url: race.circuits.url,
      },
      winner: race.drivers?.driverId
        ? {
            driverId: race.drivers.driverId,
            name: race.drivers.name,
            surname: race.drivers.surname,
            country: race.drivers.nationality,
            birthday: race.drivers.birthday,
            number: race.drivers.number,
            shortName: race.drivers.shortName,
            url: race.drivers.url,
          }
        : null,
      teamWinner: race.teams?.teamId
        ? {
            teamId: race.teams.teamId,
            teamName: race.teams.teamName,
            country: race.teams.teamNationality,
            firstAppearance: race.teams.firstAppeareance,
            constructorsChampionships: race.teams.constructorsChampionships,
            driversChampionships: race.teams.driversChampionships,
            url: race.teams.url,
          }
        : null,
    }))

    const { championship: championshipWithParticipants, races: racesWithParticipants } =
      await withParticipants(championship, formattedData)

    const response: RoundApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: formattedData.length,
      timezone: timezone ?? undefined,
      season: parseInt(year),
      round: round,
      championship: championshipWithParticipants,
      race: racesWithParticipants,
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
      .where(eq(results.raceId, race.races.raceId))
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
      raceData[0].races.raceDate,
      raceData[0].races.raceTime,
      timezone
    )

    const processedData = resultsData.map((result) => ({
      position: String(result.results.finishingPosition),
      points: result.results.pointsObtained,
      grid: String(result.results.gridPosition),
      time: result.results.raceTime,
      fastLap: result.results.fastLap,
      retired: result.results.retired,
      driver: {
        driverId: result.results.driverId,
        number: result.drivers.number,
        shortName: result.drivers.shortName,
        url: result.drivers.url,
        name: result.drivers.name,
        surname: result.drivers.surname,
        nationality: result.drivers.nationality,
        birthday: result.drivers.birthday,
      },
      team: {
        teamId: result.results.teamId,
        teamName: result.teams.teamName,
        nationality: result.teams.teamNationality,
        firstAppareance: result.teams.firstAppeareance,
        constructorsChampionships: result.teams.constructorsChampionships,
        driversChampionships: result.teams.driversChampionships,
        url: result.teams.url,
      },
    }))

    const circuitData = raceData.map((circuit) => {
      return {
        circuitId: circuit.circuits.circuitId,
        circuitName: circuit.circuits.circuitName,
        country: circuit.circuits.country,
        city: circuit.circuits.city,
        circuitLength:
          circuit.circuits.circuitLength !== null &&
          circuit.circuits.circuitLength !== undefined
            ? `${circuit.circuits.circuitLength}km`
            : null,
        corners: circuit.circuits.numberOfCorners,
        firstParticipationYear: circuit.circuits.firstParticipationYear,
        lapRecord: circuit.circuits.lapRecord,
        fastestLapDriverId: circuit.circuits.fastestLapDriverId,
        fastestLapTeamId: circuit.circuits.fastestLapTeamId,
        fastestLapYear: circuit.circuits.fastestLapYear,
        url: circuit.circuits.url,
        svg: circuitSvg(circuit.circuits),
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
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(classifications.raceId, race.races.raceId))
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
      race.races.qualyDate,
      race.races.qualyTime,
      timezone
    )

    const processedData = qualyData.map((row) => ({
      classificationId: row.classifications.classificationId,
      driverId: row.classifications.driverId,
      teamId: row.classifications.teamId,
      q1: row.classifications.q1,
      q2: row.classifications.q2,
      q3: row.classifications.q3,
      gridPosition: row.classifications.gridPosition,
      driver: {
        driverId: row.drivers.driverId,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        url: row.drivers.url,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        birthday: row.drivers.birthday,
      },
      team: {
        teamId: row.teams.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp1.raceId, race.races.raceId))
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
      race.races.fp1Date,
      race.races.fp1Time,
      timezone
    )

    const processedData = fp1Data.map((row) => ({
      fp1Id: row.fp1.fp1Id,
      driverId: row.fp1.driverId,
      teamId: row.fp1.teamId,
      time: row.fp1.time,
      driver: {
        driverId: row.fp1.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp1.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp2.raceId, race.races.raceId))
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
      race.races.fp2Date,
      race.races.fp2Time,
      timezone
    )

    const processedData = fp2Data.map((row) => ({
      fp2Id: row.fp2.fp2Id,
      driverId: row.fp2.driverId,
      teamId: row.fp2.teamId,
      time: row.fp2.time,
      driver: {
        driverId: row.fp2.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp2.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
      .where(eq(fp3.raceId, race.races.raceId))
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
      race.races.fp3Date,
      race.races.fp3Time,
      timezone
    )

    const processedData = fp3Data.map((row) => ({
      fp3Id: row.fp3.fp3Id,
      driverId: row.fp3.driverId,
      teamId: row.fp3.teamId,
      time: row.fp3.time,
      driver: {
        driverId: row.fp3.driverId,
        name: row.drivers.name,
        surname: row.drivers.surname,
        nationality: row.drivers.nationality,
        number: row.drivers.number,
        shortName: row.drivers.shortName,
        birthday: row.drivers.birthday,
        url: row.drivers.url,
      },
      team: {
        teamId: row.fp3.teamId,
        teamName: row.teams.teamName,
        nationality: row.teams.teamNationality,
        firstAppareance: row.teams.firstAppeareance,
        constructorsChampionships: row.teams.constructorsChampionships,
        driversChampionships: row.teams.driversChampionships,
        url: row.teams.url,
      },
    }))

    const circuitData = {
      circuitId: race.circuits.circuitId,
      circuitName: race.circuits.circuitName,
      country: race.circuits.country,
      city: race.circuits.city,
      circuitLength:
        race.circuits.circuitLength !== null &&
        race.circuits.circuitLength !== undefined
          ? `${race.circuits.circuitLength}km`
          : null,
      lapRecord: race.circuits.lapRecord,
      firstParticipationYear: race.circuits.firstParticipationYear,
      corners: race.circuits.numberOfCorners,
      fastestLapDriverId: race.circuits.fastestLapDriverId,
      fastestLapTeamId: race.circuits.fastestLapTeamId,
      fastestLapYear: race.circuits.fastestLapYear,
      url: race.circuits.url,
      svg: circuitSvg(race.circuits),
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
        url: race.races.url,
        raceId: race.races.raceId,
        raceName: race.races.raceName,
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
        sprintRaceResults[0].races.sprintRaceDate,
        sprintRaceResults[0].races.sprintRaceTime,
        timezone
      )

      const processedData = sprintRaceResults.map((row) => ({
        sprintRaceId: row.sprint_race.sprintRaceId,
        driverId: row.sprint_race.driverId,
        teamId: row.sprint_race.teamId,
        position: row.sprint_race.finishingPosition,
        gridPosition: row.sprint_race.gridPosition,
        points: row.sprint_race.pointsObtained,
        driver: {
          driverId: row.drivers.driverId,
          number: row.drivers.number,
          name: row.drivers.name,
          surname: row.drivers.surname,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
        },
        team: {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        },
      }))

      const circuitData = sprintRaceResults.map((row) => {
        return {
          circuitId: row.circuits.circuitId,
          circuitName: row.circuits.circuitName,
          country: row.circuits.country,
          city: row.circuits.city,
          circuitLength: row.circuits.circuitLength + "km",
          corners: row.circuits.numberOfCorners,
          firstParticipationYear: row.circuits.firstParticipationYear,
          lapRecord: row.circuits.lapRecord,
          fastestLapDriverId: row.circuits.fastestLapDriverId,
          fastestLapTeamId: row.circuits.fastestLapTeamId,
          fastestLapYear: row.circuits.fastestLapYear,
          url: row.circuits.url,
          svg: circuitSvg(row.circuits),
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
          url: sprintRaceResults[0].races.url,
          raceId: sprintRaceResults[0].races.raceId,
          raceName: sprintRaceResults[0].races.raceName,
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
        sprintQualyResults[0].races.sprintQualyDate,
        sprintQualyResults[0].races.sprintQualyTime,
        timezone
      )

      const processedData = sprintQualyResults.map((row) => ({
        sprintQualyId: row.sprint_qualy.sprintQualyId,
        driverId: row.sprint_qualy.driverId,
        teamId: row.sprint_qualy.teamId,
        sq1: row.sprint_qualy.sq1,
        sq2: row.sprint_qualy.sq2,
        sq3: row.sprint_qualy.sq3,
        gridPosition: row.sprint_qualy.gridPosition,
        driver: {
          driverId: row.drivers.driverId,
          number: row.drivers.number,
          name: row.drivers.name,
          surname: row.drivers.surname,
          shortName: row.drivers.shortName,
          url: row.drivers.url,
          nationality: row.drivers.nationality,
          birthday: row.drivers.birthday,
        },
        team: {
          teamId: row.teams.teamId,
          teamName: row.teams.teamName,
          teamNationality: row.teams.teamNationality,
          firstAppeareance: row.teams.firstAppeareance,
          constructorsChampionships: row.teams.constructorsChampionships,
          driversChampionships: row.teams.driversChampionships,
          url: row.teams.url,
        },
      }))

      const circuitData = sprintQualyResults.map((row) => {
        return {
          circuitId: row.circuits.circuitId,
          circuitName: row.circuits.circuitName,
          country: row.circuits.country,
          city: row.circuits.city,
          circuitLength: row.circuits.circuitLength + "km",
          corners: row.circuits.numberOfCorners,
          firstParticipationYear: row.circuits.firstParticipationYear,
          lapRecord: row.circuits.lapRecord,
          fastestLapDriverId: row.circuits.fastestLapDriverId,
          fastestLapTeamId: row.circuits.fastestLapTeamId,
          fastestLapYear: row.circuits.fastestLapYear,
          url: row.circuits.url,
          svg: circuitSvg(row.circuits),
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
          url: sprintQualyResults[0].races.url,
          raceId: sprintQualyResults[0].races.raceId,
          raceName: sprintQualyResults[0].races.raceName,
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
