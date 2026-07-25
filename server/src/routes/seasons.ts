import { Router, type Request, type Response } from "express"
import { desc, InferModel } from "drizzle-orm"
import { db } from "../../db"
import { championships } from "../../db/migrations/schema"
import { SITE_URL } from "../lib/constants"
import { BaseApiResponse } from "../lib/definitions"
import { apiNotFound, getLimitAndOffset } from "../lib/utils"

const router = Router()

type Championship = InferModel<typeof championships>

interface SeasonsApiResponse extends BaseApiResponse {
  championships: Championship[]
}

// GET /seasons
router.get("/seasons", async (req: Request, res: Response) => {
  const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
  const searchParams = new URL(fullUrl).searchParams
  const { limit, offset } = getLimitAndOffset(searchParams)
  try {
    const seasonsData = await db
      .select()
      .from(championships)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(championships.championshipId))

    if (seasonsData.length === 0) {
      return apiNotFound(res, fullUrl, "No seasons found.")
    }

    const response: SeasonsApiResponse = {
      api: SITE_URL,
      url: fullUrl,
      limit,
      offset,
      total: seasonsData.length,
      championships: seasonsData,
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

export default router
