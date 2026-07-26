import { Router, type Request, type Response } from "express"
import { and, eq, or } from "drizzle-orm"
import { db } from "../../db/index.js"
import { driverClassifications, drivers } from "../../db/migrations/schema.js"
import { SITE_URL } from "../lib/constants.js"
import { BaseApiResponse } from "../lib/definitions.js"
import { executeQuery } from "../lib/executeQuery.js"
import { apiNotFound } from "../lib/utils.js"

const router = Router()

interface DriverStats {
  [driverId: string]: number
}

export interface ProcessedComparison {
  totalRaces: number
  championship: {
    totalPoints: {
      [driverId: string]: number | null
    }
    position: {
      [driverId: string]: number | null
    }
  }
  raceComparison: DriverStats
  qualifyingComparison: DriverStats
  wins: {
    [driverId: string]: number | null
  }
  podiums: {
    [driverId: string]: number | null
  }
  poles: {
    [driverId: string]: number | null
  }
  pointFinishes: DriverStats
  bestRaceFinish: DriverStats
  bestGridPosition: DriverStats
  dnfs: DriverStats
}
interface ApiResponse extends BaseApiResponse {
  season: number | string
  championshipId: string
  drivers: DriverInfo[]
  comparison: ProcessedComparison
}

type DriverInfo = {
  driverId1?: string
  driverId2?: string
  name: string
  surname: string
  nationality: string
  birthday: string
  number: number | null
  shortName: string | null
  url: string | null
  teamId: string | null
}

// GET /:year/compare/:driverId1/:driverId2
router.get(
  "/:year/compare/:driverId1/:driverId2",
  async (req: Request, res: Response) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`
    try {
      const { year, driverId1, driverId2 } = req.params

      const sql = `
    SELECT
      COUNT(r1.race_id) AS "Total_Races",
      SUM(CASE WHEN r1.grid_position < r2.grid_position THEN 1 ELSE 0 END) AS "Driver1_BetterQualifying",
      SUM(CASE WHEN r2.grid_position < r1.grid_position THEN 1 ELSE 0 END) AS "Driver2_BetterQualifying",
      MIN(r1.grid_position) AS "Driver1_BestQualifying",
      MIN(r2.grid_position) AS "Driver2_BestQualifying",
      SUM(CASE WHEN r1.finishing_position < r2.finishing_position THEN 1 ELSE 0 END) AS "Driver1_BetterRaceFinish",
      SUM(CASE WHEN r2.finishing_position < r1.finishing_position THEN 1 ELSE 0 END) AS "Driver2_BetterRaceFinish",
      MIN(r1.finishing_position) AS "Driver1_BestRaceFinish",
      MIN(r2.finishing_position) AS "Driver2_BestRaceFinish",
      SUM(CASE WHEN r1.finishing_position <= 10 THEN 1 ELSE 0 END) AS "Driver1_PointFinishes",
      SUM(CASE WHEN r2.finishing_position <= 10 THEN 1 ELSE 0 END) AS "Driver2_PointFinishes",
      SUM(CASE WHEN r1.finishing_position <= 3 THEN 1 ELSE 0 END) AS "Driver1_Podiums",
      SUM(CASE WHEN r2.finishing_position <= 3 THEN 1 ELSE 0 END) AS "Driver2_Podiums",
      SUM(CASE WHEN r1.grid_position = 1 THEN 1 ELSE 0 END) AS "Driver1_Poles",
      SUM(CASE WHEN r2.grid_position = 1 THEN 1 ELSE 0 END) AS "Driver2_Poles",
      SUM(CASE WHEN r1.retired IS NOT NULL AND TRIM(r1.retired) <> '' THEN 1 ELSE 0 END) AS "Driver1_DNFs",
      SUM(CASE WHEN r2.retired IS NOT NULL AND TRIM(r2.retired) <> '' THEN 1 ELSE 0 END) AS "Driver2_DNFs"
    FROM results r1
    JOIN results r2 ON r1.race_id = r2.race_id AND r2.driver_id = $1
    JOIN races rr ON rr.race_id = r1.race_id
    WHERE r1.driver_id = $2
      AND rr.championship_id = $3;
    `

      const driversPointsData = await db
        .select()
        .from(driverClassifications)
        .innerJoin(
          drivers,
          eq(drivers.driverId, driverClassifications.driverId)
        )
        .where(
          and(
            eq(driverClassifications.championshipId, `f1_${year}`),
            or(
              eq(driverClassifications.driverId, driverId1),
              eq(driverClassifications.driverId, driverId2)
            )
          )
        )
        .limit(2)

      const data = await executeQuery(sql, [
        driverId1,
        driverId2,
        `f1_${year}`,
      ])

      if (data.length === 0) {
        return apiNotFound(
          res,
          fullUrl,
          "No results found for this drivers. Try with others, or other year."
        )
      }

      const result = data[0]

      const pointsMap = new Map<string, number>()
      driversPointsData.forEach((entry: any) => {
        pointsMap.set(entry.driverId, entry.points)
      })

      const driver1Points = driversPointsData[0].driver_classifications.points
      const driver2Points = driversPointsData[1].driver_classifications.points

      const driversInfo = [
        {
          driverId1: driverId1,
          name: driversPointsData[0].drivers.name,
          surname: driversPointsData[0].drivers.surname,
          nationality: driversPointsData[0].drivers.nationality,
          birthday: driversPointsData[0].drivers.birthday,
          number: driversPointsData[0].drivers.number,
          shortName: driversPointsData[0].drivers.shortName,
          url: driversPointsData[0].drivers.url,
          teamId: driversPointsData[0].driver_classifications.teamId,
        },
        {
          driverId2: driverId2,
          name: driversPointsData[1].drivers.name,
          surname: driversPointsData[1].drivers.surname,
          nationality: driversPointsData[1].drivers.nationality,
          birthday: driversPointsData[1].drivers.birthday,
          number: driversPointsData[1].drivers.number,
          shortName: driversPointsData[1].drivers.shortName,
          url: driversPointsData[1].drivers.url,
          teamId: driversPointsData[1].driver_classifications.teamId,
        },
      ]

      const processedData: ProcessedComparison = {
        totalRaces: result.Total_Races,
        championship: {
          totalPoints: {
            [driverId1]: driver1Points,
            [driverId2]: driver2Points,
          },
          position: {
            [driverId1]: driversPointsData[0].driver_classifications.position,
            [driverId2]: driversPointsData[1].driver_classifications.position,
          },
        },
        raceComparison: {
          [driverId1]: result.Driver2_BetterRaceFinish,
          [driverId2]: result.Driver1_BetterRaceFinish,
        },
        qualifyingComparison: {
          [driverId1]: result.Driver2_BetterQualifying,
          [driverId2]: result.Driver1_BetterQualifying,
        },
        wins: {
          [driverId1]: driversPointsData[0].driver_classifications.wins,
          [driverId2]: driversPointsData[1].driver_classifications.wins,
        },
        podiums: {
          [driverId1]: result.Driver2_Podiums,
          [driverId2]: result.Driver1_Podiums,
        },
        poles: {
          [driverId1]: result.Driver2_Poles,
          [driverId2]: result.Driver1_Poles,
        },
        pointFinishes: {
          [driverId1]: result.Driver2_PointFinishes,
          [driverId2]: result.Driver1_PointFinishes,
        },
        bestRaceFinish: {
          [driverId1]: result.Driver2_BestRaceFinish,
          [driverId2]: result.Driver1_BestRaceFinish,
        },
        bestGridPosition: {
          [driverId1]: result.Driver2_BestQualifying,
          [driverId2]: result.Driver1_BestQualifying,
        },
        dnfs: {
          [driverId1]: result.Driver2_DNFs,
          [driverId2]: result.Driver1_DNFs,
        },
      }

      const response: ApiResponse = {
        api: SITE_URL,
        url: fullUrl,
        season: parseInt(year),
        championshipId: `f1_${year}`,
        drivers: driversInfo,
        comparison: processedData,
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
