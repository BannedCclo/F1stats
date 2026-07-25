import type { RawSchedule } from '@/api/types'
import type { TranslationKey } from '@/i18n/useI18n'

export type SessionKind = 'fp1' | 'fp2' | 'fp3' | 'qualy' | 'sprintQualy' | 'sprintRace' | 'race'

export interface SessionMeta {
  kind: SessionKind
  labelKey: TranslationKey
}

export const SESSION_CATALOG: SessionMeta[] = [
  { kind: 'fp1', labelKey: 'session.fp1' },
  { kind: 'fp2', labelKey: 'session.fp2' },
  { kind: 'fp3', labelKey: 'session.fp3' },
  { kind: 'qualy', labelKey: 'session.qualy' },
  { kind: 'sprintQualy', labelKey: 'session.sprintQualy' },
  { kind: 'sprintRace', labelKey: 'session.sprintRace' },
  { kind: 'race', labelKey: 'session.race' },
]

/** A session with a null date on the schedule was never planned for this weekend (e.g. no sprint). */
export function isSessionScheduled(schedule: RawSchedule | undefined, kind: SessionKind): boolean {
  if (!schedule) return true // unknown schedule — don't hide, let the fetch decide
  return schedule[kind]?.date !== null
}

/** A scheduled session in the future has no results yet — that's expected, not an error. */
export function isSessionInFuture(schedule: RawSchedule | undefined, kind: SessionKind): boolean {
  const entry = schedule?.[kind]
  if (!entry?.date) return false
  const sessionDate = new Date(`${entry.date}T${entry.time ?? '23:59:59Z'}`)
  return sessionDate.getTime() > Date.now()
}
