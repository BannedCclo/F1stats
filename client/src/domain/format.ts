/**
 * The API is not internally consistent about number/string formats — these
 * helpers absorb that so components never special-case raw API quirks.
 */

/**
 * Lap times mostly arrive as "1:49.098" (colon between min/sec, dot before
 * millis), but `lapRecord` on circuits uses "1:31:447" (colon in place of
 * the millis dot). Normalize both to the former.
 */
export function formatLapTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const parts = raw.split(':')
  if (parts.length === 3) {
    // "1:31:447" -> "1:31.447"
    return `${parts[0]}:${parts[1]}.${parts[2]}`
  }
  return raw
}

/**
 * Race/sprint result "time" is already human-formatted by the API as one
 * of: absolute time ("1:24:42.479"), a gap ("+1.952"), a laps-down gap
 * ("+1 Lap"), or a status ("DNF (52)", "DNS", "DSQ"). Passthrough is
 * correct — just supply a placeholder for missing data.
 */
export function formatResultTime(raw: string | null | undefined): string {
  return raw && raw.trim().length > 0 ? raw : '—'
}

/**
 * `circuitLength` is a bare number (meters) on `/circuits`, but a string
 * like "7004km" (still meters, mislabeled unit) when nested inside a race.
 * Both encode the same magnitude, so strip non-digits and treat as meters.
 */
export function formatCircuitLength(raw: number | string | null | undefined): string {
  if (raw === null || raw === undefined) return '—'
  const meters = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(meters) || meters <= 0) return '—'
  return `${(meters / 1000).toFixed(3)} km`
}

/**
 * Birthdays arrive as ISO "1997-09-30" on most endpoints, but as
 * "07/01/1985" (DD/MM/YYYY) on the `/drivers/:id` archive lookup. Detect
 * and normalize both to a Date.
 */
export function parseBirthday(raw: string | null | undefined): Date | null {
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])))

  const slash = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slash) return new Date(Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1])))

  const fallback = new Date(raw)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export function formatBirthday(raw: string | null | undefined, locale: string): string {
  const date = parseBirthday(raw)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

export function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '—'
  const date = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

export function formatDateTime(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined,
  locale: string,
): string {
  if (!dateStr) return '—'
  const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: timeStr ? '2-digit' : undefined,
    minute: timeStr ? '2-digit' : undefined,
    timeZoneName: timeStr ? 'short' : undefined,
  }).format(date)
}

/** For comparing lap times to find a session's fastest — not for display. */
export function parseLapTimeToMs(raw: string | null | undefined): number | null {
  if (!raw) return null
  const normalized = formatLapTime(raw)
  const match = normalized.match(/^(?:(\d+):)?(\d+)\.(\d+)$/)
  if (!match) return null
  const minutes = match[1] ? Number(match[1]) : 0
  const seconds = Number(match[2])
  const millis = Number(match[3].padEnd(3, '0').slice(0, 3))
  return minutes * 60_000 + seconds * 1000 + millis
}

export function formatPosition(pos: number | string | null | undefined): string {
  if (pos === null || pos === undefined) return '—'
  return String(pos)
}

export function formatPoints(points: number | null | undefined): string {
  return points === null || points === undefined ? '0' : String(points)
}

export function driverInitials(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

/** Best-effort readable label from a bare driverId/teamId (e.g. "max_verstappen" -> "Max Verstappen") when we don't want an extra fetch just for a name. */
export function idToLabel(id: string | null | undefined): string {
  if (!id) return '—'
  return id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function driverCode(shortName: string | null | undefined, surname: string): string {
  if (shortName) return shortName.toUpperCase()
  return surname.slice(0, 3).toUpperCase()
}
