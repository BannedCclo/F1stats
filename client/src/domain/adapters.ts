import type {
  RawPracticeResult,
  RawQualyResult,
  RawRaceResult,
  RawSprintQualyResult,
  RawSprintRaceResult,
  RawStandingItem,
} from '@/api/types'
import type { TimingTowerItem } from '@/components/timing/TimingTower'
import { driverCode, formatLapTime, formatPoints, formatPosition, formatResultTime, parseLapTimeToMs } from './format'
import { positionDelta, retiredStatus } from './timingSemantics'

export function driverStandingToTimingItem(item: RawStandingItem): TimingTowerItem {
  const driverId = item.driverId ?? item.driver?.driverId ?? String(item.classificationId)
  const driver = item.driver
  return {
    id: driverId,
    position: formatPosition(item.position),
    code: driverCode(driver?.shortName, driver?.surname ?? ''),
    teamId: item.teamId ?? item.team?.teamId ?? null,
    label: driver ? `${driver.name} ${driver.surname}` : driverId,
    value: `${formatPoints(item.points)} pts`,
    href: `/drivers/${driverId}`,
  }
}

export function constructorStandingToTimingItem(item: RawStandingItem): TimingTowerItem {
  const teamId = item.teamId ?? item.team?.teamId ?? String(item.classificationId)
  return {
    id: teamId,
    position: formatPosition(item.position),
    code: teamId.slice(0, 3).toUpperCase(),
    teamId,
    label: item.team.teamName,
    value: `${formatPoints(item.points)} pts`,
    href: `/teams/${teamId}`,
  }
}

function withFastestLap(items: TimingTowerItem[], timesMs: (number | null)[]): TimingTowerItem[] {
  const valid = timesMs.filter((t): t is number => t !== null)
  if (valid.length === 0) return items
  const fastest = Math.min(...valid)
  return items.map((item, i) => (timesMs[i] === fastest ? { ...item, status: 'fastest' as const } : item))
}

export function raceResultsToTimingItems(results: RawRaceResult[]): TimingTowerItem[] {
  const items = results.map((r) => ({
    id: r.driver.driverId ?? `${r.team.teamId}-${r.position}`,
    position: formatPosition(r.position),
    code: driverCode(r.driver.shortName, r.driver.surname),
    teamId: r.team.teamId ?? null,
    label: `${r.driver.name} ${r.driver.surname}`,
    value: formatResultTime(r.time),
    href: `/drivers/${r.driver.driverId}`,
    status: retiredStatus(r.retired) ?? positionDelta(r.grid, r.position),
  }))
  const timesMs = results.map((r) => parseLapTimeToMs(r.fastLap))
  return withFastestLap(items, timesMs)
}

export function sprintRaceResultsToTimingItems(results: RawSprintRaceResult[]): TimingTowerItem[] {
  return results.map((r) => ({
    id: r.driver.driverId ?? `${r.teamId}-${r.position}`,
    position: formatPosition(r.position),
    code: driverCode(r.driver.shortName, r.driver.surname),
    teamId: r.team.teamId ?? r.teamId ?? null,
    label: `${r.driver.name} ${r.driver.surname}`,
    value: r.time ? formatResultTime(r.time) : `${formatPoints(r.points)} pts`,
    href: `/drivers/${r.driver.driverId}`,
    status: positionDelta(r.gridPosition, r.position),
  }))
}

export function qualyResultsToTimingItems(results: RawQualyResult[]): TimingTowerItem[] {
  const items = results.map((r) => ({
    id: r.driver.driverId ?? `${r.teamId}-${r.gridPosition}`,
    position: formatPosition(r.gridPosition),
    code: driverCode(r.driver.shortName, r.driver.surname),
    teamId: r.team.teamId ?? r.teamId ?? null,
    label: `${r.driver.name} ${r.driver.surname}`,
    value: formatLapTime(r.q3 ?? r.q2 ?? r.q1),
    href: `/drivers/${r.driver.driverId}`,
  }))
  const timesMs = results.map((r) => parseLapTimeToMs(r.q3 ?? r.q2 ?? r.q1))
  return withFastestLap(items, timesMs)
}

export function sprintQualyResultsToTimingItems(results: RawSprintQualyResult[]): TimingTowerItem[] {
  const items = results.map((r) => ({
    id: r.driver.driverId ?? `${r.teamId}-${r.gridPosition}`,
    position: formatPosition(r.gridPosition),
    code: driverCode(r.driver.shortName, r.driver.surname),
    teamId: r.team.teamId ?? r.teamId ?? null,
    label: `${r.driver.name} ${r.driver.surname}`,
    value: formatLapTime(r.sq3 ?? r.sq2 ?? r.sq1),
    href: `/drivers/${r.driver.driverId}`,
  }))
  const timesMs = results.map((r) => parseLapTimeToMs(r.sq3 ?? r.sq2 ?? r.sq1))
  return withFastestLap(items, timesMs)
}

export function practiceResultsToTimingItems(results: RawPracticeResult[]): TimingTowerItem[] {
  const items = results.map((r, i) => ({
    id: r.driver.driverId ?? `${r.teamId}-${i}`,
    position: String(i + 1),
    code: driverCode(r.driver.shortName, r.driver.surname),
    teamId: r.team.teamId ?? r.teamId ?? null,
    label: `${r.driver.name} ${r.driver.surname}`,
    value: formatLapTime(r.time),
    href: `/drivers/${r.driver.driverId}`,
  }))
  const timesMs = results.map((r) => parseLapTimeToMs(r.time))
  return withFastestLap(items, timesMs)
}
