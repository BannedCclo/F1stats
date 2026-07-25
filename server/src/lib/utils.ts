import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import type { Response } from "express"
import { SITE_URL } from "./constants"

// return error message when the api not found any result.
export function apiNotFound(res: Response, url: string, message: string) {
  return res.status(404).json({
    api: SITE_URL,
    url: url,
    message: message,
    status: 404,
  })
}

export function getYear(): number {
  const year = new Date().getFullYear()
  return year
}

export function getDay(): string {
  const today = new Date().toISOString().split("T")[0] // Fecha actual en formato YYYY-MM-DD
  return today
}

export const getLimitAndOffset = (queryParams: URLSearchParams) => {
  const rawLimit = parseInt(queryParams.get("limit") || "30", 10)
  const rawOffset = parseInt(queryParams.get("offset") || "0", 10)

  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 100)
    : 30
  const offset = Number.isFinite(rawOffset)
    ? Math.min(Math.max(rawOffset, 0), 10_000)
    : 0

  return { limit, offset }
}

export function convertToTimezone(
  date: string | null,
  time: string | null,
  timezone: string | null
) {
  if (!date || !time || !timezone) return { date, time }

  try {
    const isoString = `${date}T${time}` // UTC time
    const zoned = toZonedTime(isoString, timezone)

    return {
      date: format(zoned, "yyyy-MM-dd"),
      time: format(zoned, "HH:mm:ss"),
    }
  } catch (e) {
    return { date, time } // fallback to original on error
  }
}
