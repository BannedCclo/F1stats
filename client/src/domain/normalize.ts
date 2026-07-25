import type { RawCircuit, RawDriver, RawTeam } from '@/api/types'

/**
 * Several endpoints wrap a logically-single entity in a one-element array
 * (`/drivers/:id`, `/teams/:id`, `/circuits/:id`, `/:year/:round`'s `race`,
 * and a session's `circuit` on the `/race` endpoint specifically). Others
 * return the same entity as a bare object. This absorbs both.
 */
export function unwrapOne<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export interface Driver {
  driverId: string
  name: string
  surname: string
  fullName: string
  nationality: string | null
  birthday: string
  number: number | null
  shortName: string | null
  url: string
}

export interface Team {
  teamId: string
  teamName: string
  country: string | null
  firstAppearance: number | null
  constructorsChampionships: number
  driversChampionships: number
  url: string
}

export interface Circuit {
  circuitId: string
  circuitName: string
  country: string
  city: string
  lengthMeters: number | null
  lapRecord: string | null
  firstParticipationYear: number
  corners: number | null
  fastestLapDriverId: string | null
  fastestLapTeamId: string | null
  fastestLapYear: number | null
  url: string
}

export function normalizeDriver(raw: RawDriver, fallbackId?: string): Driver {
  return {
    driverId: raw.driverId ?? fallbackId ?? '',
    name: raw.name,
    surname: raw.surname,
    fullName: `${raw.name} ${raw.surname}`,
    nationality: raw.nationality ?? raw.country ?? null,
    birthday: raw.birthday,
    number: raw.number,
    shortName: raw.shortName,
    url: raw.url,
  }
}

export function normalizeTeam(raw: RawTeam, fallbackId?: string): Team {
  return {
    teamId: raw.teamId ?? fallbackId ?? '',
    teamName: raw.teamName,
    country: raw.country ?? raw.nationality ?? raw.teamNationality ?? null,
    firstAppearance:
      raw.firstAppearance ?? raw.firstAppareance ?? raw.firstAppeareance ?? null,
    constructorsChampionships: raw.constructorsChampionships,
    driversChampionships: raw.driversChampionships,
    url: raw.url,
  }
}

export function normalizeCircuit(raw: RawCircuit): Circuit {
  const rawLength = raw.circuitLength
  const lengthMeters =
    rawLength === null || rawLength === undefined
      ? null
      : typeof rawLength === 'number'
        ? rawLength
        : Number(String(rawLength).replace(/[^\d.]/g, '')) || null

  return {
    circuitId: raw.circuitId,
    circuitName: raw.circuitName,
    country: raw.country,
    city: raw.city,
    lengthMeters,
    lapRecord: raw.lapRecord ?? null,
    firstParticipationYear: raw.firstParticipationYear,
    corners: raw.corners ?? raw.numberOfCorners ?? null,
    fastestLapDriverId: raw.fastestLapDriverId,
    fastestLapTeamId: raw.fastestLapTeamId,
    fastestLapYear: raw.fastestLapYear,
    url: raw.url,
  }
}
