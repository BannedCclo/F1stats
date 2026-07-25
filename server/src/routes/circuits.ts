import { Router, type Request, type Response } from "express"
import { eq, InferModel, like, or } from "drizzle-orm"
import { db } from "../../db"
import { circuits, races } from "../../db/migrations/schema"
import { SITE_NAME, SITE_URL } from "../lib/constants"
import { BaseApiResponse } from "../lib/definitions"
import { apiNotFound, getLimitAndOffset } from "../lib/utils"

const router = Router()

type Circuit = InferModel<typeof circuits>

interface CircuitsApiResponse extends BaseApiResponse {
  circuits: Circuit[]
}

interface CircuitApiResponse extends BaseApiResponse {
  circuit: Circuit[]
}

interface CircuitsSearchApiResponse extends BaseApiResponse {
  circuits: Circuit[]
  query: string
}

type YearCircuit = {
  circuitId: string | null
  circuitName: string | null
  country: string | null
  city: string | null
  circuitLength: number | null
  firstParticipationYear: number | null
  corners?: number | null
  lapRecord: string | null
  fastestLapDriverId: string | null
  fastestLapTeamId: string | null
  fastestLapYear: number | null
  url: string | null
}

interface YearCircuitsApiResponse extends BaseApiResponse {
  season: string | number
  circuits: YearCircuit[]
}

// GET /circuits
router.get("/circuits", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams

  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const circuitsData = await db
      .select()
      .from(circuits)
      .limit(limit)
      .offset(offset)

    if (circuitsData.length === 0) {
      return apiNotFound(res, fullUrl, "No circuits found.")
    }

    circuitsData.forEach((circuit) => {
      return {
        circuitId: circuit.circuitId,
        circuitName: circuit.circuitName,
        country: circuit.country,
        city: circuit.city,
        circuitLength: circuit.circuitLength,
        corners: circuit.numberOfCorners,
        firstParticipationYear: circuit.firstParticipationYear,
        lapRecord: circuit.lapRecord,
        fastestLapDriverId: circuit.fastestLapDriverId,
        fastestLapTeamId: circuit.fastestLapTeamId,
        fastestLapYear: circuit.fastestLapYear,
        url: circuit.url,
      }
    })

    const response: CircuitsApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: circuitsData.length,
      circuits: circuitsData,
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

// GET /circuits/search
router.get("/circuits/search", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams

  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const circuitsData = await db
      .select()
      .from(circuits)
      .where(
        or(
          like(circuits.circuitName, `%${searchParams.get("q") ?? ""}%`),
          like(circuits.city, `%${searchParams.get("q") ?? ""}%`),
          like(circuits.country, `%${searchParams.get("q") ?? ""}%`)
        )
      )
      .limit(limit)
      .offset(offset)

    if (circuitsData.length === 0) {
      return apiNotFound(res, fullUrl, "No circuits found.")
    }

    circuitsData.forEach((circuit) => {
      return {
        circuitId: circuit.circuitId,
        circuitName: circuit.circuitName,
        country: circuit.country,
        city: circuit.city,
        circuitLength: circuit.circuitLength,
        corners: circuit.numberOfCorners,
        firstParticipationYear: circuit.firstParticipationYear,
        lapRecord: circuit.lapRecord,
        fastestLapDriverId: circuit.fastestLapDriverId,
        fastestLapTeamId: circuit.fastestLapTeamId,
        fastestLapYear: circuit.fastestLapYear,
        url: circuit.url,
      }
    })

    const response: CircuitsSearchApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit: limit,
      offset: offset,
      query: searchParams.get("q") ?? "",
      total: circuitsData.length,
      circuits: circuitsData,
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

// GET /circuits/:circuitId
router.get("/circuits/:circuitId", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  try {
    const { circuitId } = req.params
    const limit = 1

    const circuitData = await db
      .select()
      .from(circuits)
      .where(eq(circuits.circuitId, circuitId))
      .limit(limit)

    if (circuitData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No Circuit found for this id, try with other one."
      )
    }

    circuitData.forEach((circuit) => {
      return {
        circuitId: circuit.circuitId,
        circuitName: circuit.circuitName,
        country: circuit.country,
        city: circuit.city,
        circuitLength: circuit.circuitLength,
        corners: circuit.numberOfCorners,
        firstParticipationYear: circuit.firstParticipationYear,
        lapRecord: circuit.lapRecord,
        fastestLapDriverId: circuit.fastestLapDriverId,
        fastestLapTeamId: circuit.fastestLapTeamId,
        fastestLapYear: circuit.fastestLapYear,
        url: circuit.url,
      }
    })

    const response: CircuitApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      total: circuitData.length,
      circuit: circuitData,
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

// GET /:year/circuits
router.get("/:year/circuits", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const { year } = req.params

    const circuitsData = await db
      .select({
        circuitId: races.circuit,
        circuitName: circuits.circuitName,
        country: circuits.country,
        city: circuits.city,
        circuitLength: circuits.circuitLength,
        lapRecord: circuits.lapRecord,
        firstParticipationYear: circuits.firstParticipationYear,
        numberOfCorners: circuits.numberOfCorners,
        fastestLapDriverId: circuits.fastestLapDriverId,
        fastestLapTeamId: circuits.fastestLapTeamId,
        fastestLapYear: circuits.fastestLapYear,
        url: circuits.url,
      })
      .from(circuits)
      .innerJoin(races, eq(circuits.circuitId, races.circuit))
      .where(eq(races.championshipId, `f1_${year}`))
      .limit(limit)
      .offset(offset)

    if (circuitsData.length === 0) {
      return apiNotFound(
        res,
        fullUrl,
        "No circuits found for this year. Try with other one."
      )
    }

    circuitsData.forEach((circuit) => {
      return {
        circuitId: circuit.circuitId,
        circuitName: circuit.circuitName,
        country: circuit.country,
        city: circuit.city,
        circuitLength: circuit.circuitLength,
        lapRecord: circuit.lapRecord,
        firstParticipationYear: circuit.firstParticipationYear,
        corners: circuit.numberOfCorners,
        fastestLapDriverId: circuit.fastestLapDriverId,
        fastestLapTeamId: circuit.fastestLapTeamId,
        fastestLapYear: circuit.fastestLapYear,
        url: circuit.url,
      }
    })

    const response: YearCircuitsApiResponse = {
      api: SITE_NAME,
      url: fullUrl,
      limit: limit,
      offset: offset,
      total: circuitsData.length,
      season: parseInt(year),
      circuits: circuitsData,
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

export default router
