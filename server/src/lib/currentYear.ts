import { sql } from "drizzle-orm"
import { db } from "../../db/index.js"
import { championships } from "../../db/migrations/schema.js"

const CACHE_TTL_MS = 5 * 60 * 1000

let cached: { year: number; expiresAt: number } | null = null

/**
 * "Current season" as whatever the latest championship row in the database
 * actually is, instead of a hardcoded literal that needed a code change and
 * redeploy every January. Once the season-entities sync job (see
 * server/lib/sync/seasonEntities.js) inserts the new season's championship
 * row, every /current/... route picks it up on its own within the cache
 * window below — no restart needed.
 */
export async function getCurrentYear(): Promise<number> {
  if (cached && cached.expiresAt > Date.now()) return cached.year

  const [row] = await db.select({ year: sql<number>`max(${championships.year})` }).from(championships)
  const year = row?.year ?? new Date().getFullYear()

  cached = { year, expiresAt: Date.now() + CACHE_TTL_MS }
  return year
}
