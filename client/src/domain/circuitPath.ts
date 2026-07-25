import { REAL_CIRCUIT_SHAPES } from './realCircuitShapes'

/**
 * The API's own circuit archive has duplicate entries for several tracks —
 * the same real place under two different circuitIds, one used by recent
 * seasons and another by older ones (confirmed by cross-referencing
 * `/circuits` against race data across seasons: e.g. current-season races
 * use "montmelo" for Barcelona-Catalunya, but most historical seasons use
 * "catalunya" for the exact same circuit). Alias the duplicates onto the
 * one key that actually has shape data, so every season of a real-shaped
 * circuit gets the real shape, not just whichever ID happened to be curated.
 */
const CIRCUIT_ID_ALIASES: Record<string, string> = {
  catalunya: 'montmelo',
  villeneuve: 'gilles_villeneuve',
  rodriguez: 'hermanos_rodriguez',
  americas: 'austin',
  ricard: 'paul_ricard',
  bahrain: 'bahrein',
}

/**
 * The API has no track geometry of its own — no coordinates, no map data.
 * For the curated set of circuits in `realCircuitShapes.ts` we use the
 * actual track outline, vendored from an open-source dataset (see that
 * file for attribution/license). Everything else in the archive (which
 * goes back to 1950) falls back to a deterministic abstract shape seeded
 * by circuitId, which makes no claim to represent the real layout.
 */

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface CircuitTraceData {
  path: string
  viewBox: string
  /** Whether this is the real track outline (true) or an abstract placeholder shape (false). */
  isRealLayout: boolean
}

/** Catmull-Rom -> cubic Bezier through a closed loop of points, for a smooth track-like curve. */
function smoothClosedPath(points: readonly (readonly [number, number])[]): string {
  const d: string[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]

    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6

    if (i === 0) d.push(`M ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`)
    d.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`,
    )
  }
  d.push('Z')
  return d.join(' ')
}

function abstractCircuitPath(circuitId: string, corners: number | null | undefined): CircuitTraceData {
  const rand = mulberry32(hashString(circuitId))
  const pointCount = Math.min(16, Math.max(7, corners ?? 10))

  const size = 200
  const cx = size / 2
  const cy = size / 2
  const baseRadius = size * 0.38

  const angles: number[] = []
  for (let i = 0; i < pointCount; i++) {
    angles.push((i / pointCount) * Math.PI * 2 + (rand() - 0.5) * ((Math.PI * 2) / pointCount) * 0.6)
  }
  angles.sort((a, b) => a - b)

  const points = angles.map((angle) => {
    const radius = baseRadius * (0.62 + rand() * 0.4)
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius] as const
  })

  return { path: smoothClosedPath(points), viewBox: `0 0 ${size} ${size}`, isRealLayout: false }
}

export function generateCircuitPath(circuitId: string, corners: number | null | undefined): CircuitTraceData {
  const resolvedId = CIRCUIT_ID_ALIASES[circuitId] ?? circuitId
  const real = REAL_CIRCUIT_SHAPES[resolvedId]
  if (real) {
    return { path: real.path, viewBox: real.viewBox, isRealLayout: true }
  }
  return abstractCircuitPath(circuitId, corners)
}
