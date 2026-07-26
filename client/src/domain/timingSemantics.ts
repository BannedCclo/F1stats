/**
 * The single pure mapping from data to an FIA timing-screen colour. Every
 * place in the app that colours a number by status routes through this file
 * — nothing here is decorative, and nothing outside it invents a new status.
 */
export type TimingStatus = 'fastest' | 'gained' | 'lost' | 'retired' | 'offpace' | null

export const TIMING_STATUS_CLASS: Record<NonNullable<TimingStatus>, string> = {
  fastest: 'text-fastest',
  gained: 'text-gain',
  lost: 'text-rosso',
  retired: 'text-rosso',
  offpace: 'text-offpace',
}

export const TIMING_STATUS_BG_CLASS: Record<NonNullable<TimingStatus>, string> = {
  fastest: 'bg-fastest',
  gained: 'bg-gain',
  lost: 'bg-rosso',
  retired: 'bg-rosso',
  offpace: 'bg-offpace',
}

/** Grid vs. finish position: real ground gained or lost, nothing else. */
export function positionDelta(grid: number | null | undefined, finish: number | string): TimingStatus {
  if (grid == null || grid <= 0) return null
  const finishNum = typeof finish === 'number' ? finish : parseInt(finish, 10)
  if (!Number.isFinite(finishNum)) return null
  if (finishNum < grid) return 'gained'
  if (finishNum > grid) return 'lost'
  return null
}

/** A non-null `retired` string from the API means the car didn't take the flag. */
export function retiredStatus(retired: string | null | undefined): TimingStatus {
  return retired ? 'retired' : null
}

/**
 * Which qualifying round a driver was knocked out in, derived from which of
 * q1/q2/q3 the API actually populated — never guessed from position alone.
 */
export function qualyEliminationRound(q1: string | null, q2: string | null, q3: string | null): 'Q1' | 'Q2' | null {
  if (!q1) return null
  if (!q2) return 'Q1'
  if (!q3) return 'Q2'
  return null
}
