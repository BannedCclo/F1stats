/**
 * Hits one representative endpoint per family and checks that the fields
 * this app depends on are still present. Not a full schema validator — a
 * fast regression tripwire for when f1api.dev changes shape. Run with:
 *   npx tsx scripts/probe-api.ts
 */

const BASE = process.env.VITE_F1_API_BASE ?? 'https://f1api.dev/api'

interface Probe {
  name: string
  path: string
  /** Dot-paths (array fields use `[0]`) that must exist and be non-undefined. */
  expect: string[]
}

const probes: Probe[] = [
  { name: 'seasons', path: '/seasons?limit=3', expect: ['championships[0].championshipId', 'championships[0].year'] },
  { name: 'season races', path: '/2026', expect: ['championship.championshipId', 'races[0].raceId', 'races[0].circuit.circuitId', 'races[0].schedule.race'] },
  { name: 'single race', path: '/2026/10', expect: ['race[0].raceId', 'race[0].circuit.circuitId', 'race[0].winner.driverId'] },
  { name: 'current/next race', path: '/current/next', expect: ['race[0].raceId'] },
  { name: 'current/last race', path: '/current/last', expect: ['race[0].raceId'] },
  { name: 'drivers championship', path: '/current/drivers-championship', expect: ['drivers_championship[0].driverId', 'drivers_championship[0].driver.name', 'drivers_championship[0].team.teamName'] },
  { name: 'constructors championship', path: '/current/constructors-championship', expect: ['constructors_championship[0].teamId', 'constructors_championship[0].team.teamName'] },
  { name: 'fp1 result', path: '/2026/10/fp1', expect: ['races.fp1Results[0].driverId', 'races.fp1Results[0].driver.name'] },
  { name: 'qualy result', path: '/2026/10/qualy', expect: ['races.qualyResults[0].q1', 'races.qualyResults[0].gridPosition'] },
  { name: 'race result', path: '/2026/10/race', expect: ['races.results[0].position', 'races.results[0].time'] },
  { name: 'drivers list', path: '/drivers?limit=2', expect: ['drivers[0].driverId', 'drivers[0].name'] },
  { name: 'driver search', path: '/drivers/search?q=hamilton', expect: ['drivers[0].driverId'] },
  { name: 'driver by id', path: '/drivers/hamilton', expect: ['driver[0].driverId'] },
  { name: 'drivers by year', path: '/2026/drivers?limit=2', expect: ['drivers[0].driverId'] },
  { name: 'driver by year detail', path: '/2026/drivers/max_verstappen', expect: ['driver.driverId', 'team.teamId', 'results[0].race.raceId', 'results[0].result.pointsObtained'] },
  { name: 'teams list', path: '/teams?limit=2', expect: ['teams[0].teamId', 'teams[0].teamName'] },
  { name: 'team by id', path: '/teams/ferrari', expect: ['team[0].teamId'] },
  { name: 'teams by year', path: '/2026/teams?limit=2', expect: ['teams[0].teamId'] },
  { name: 'team drivers by year', path: '/2026/teams/red_bull/drivers', expect: ['team.teamId', 'drivers[0].driver.driverId'] },
  { name: 'circuits list', path: '/circuits?limit=2', expect: ['circuits[0].circuitId', 'circuits[0].circuitLength'] },
  { name: 'circuit by id', path: '/circuits/monza', expect: ['circuit[0].circuitId'] },
]

function resolvePath(obj: unknown, path: string): unknown {
  const tokens = path.split(/\.|\[(\d+)\]/).filter((t) => t !== undefined && t !== '')
  let node: unknown = obj
  for (const token of tokens) {
    if (node === null || node === undefined) return undefined
    node = (node as Record<string, unknown>)[token]
  }
  return node
}

async function main() {
  let failures = 0

  for (const probe of probes) {
    try {
      const res = await fetch(`${BASE}${probe.path}`)
      if (!res.ok) {
        console.error(`FAIL  ${probe.name.padEnd(28)} HTTP ${res.status} on ${probe.path}`)
        failures++
        continue
      }
      const json = await res.json()
      const missing = probe.expect.filter((path) => resolvePath(json, path) === undefined)
      if (missing.length > 0) {
        console.error(`FAIL  ${probe.name.padEnd(28)} missing: ${missing.join(', ')}`)
        failures++
      } else {
        console.log(`OK    ${probe.name.padEnd(28)} ${probe.path}`)
      }
    } catch (err) {
      console.error(`ERROR ${probe.name.padEnd(28)} ${(err as Error).message}`)
      failures++
    }
  }

  console.log(`\n${probes.length - failures}/${probes.length} probes passed`)
  if (failures > 0) process.exit(1)
}

main()
