import { useMemo, useRef } from 'react'
import { generateCircuitPath } from '@/domain/circuitPath'
import { useScrollDraw } from '@/motion/useScrollDraw'
import { useI18n } from '@/i18n/useI18n'

interface CircuitTraceProps {
  circuitId: string
  corners?: number | null
  className?: string
  color?: string
  /** Draws the trace in as it scrolls into view instead of rendering it fully drawn. */
  animateOnScroll?: boolean
}

/**
 * A track silhouette. For the curated circuits in realCircuitShapes.ts
 * this is the actual track outline (vendored open-source data, see that
 * file for attribution). Everything else falls back to an abstract
 * deterministic shape that makes no claim to be the real track. A native
 * tooltip on hover discloses which one you're looking at.
 */
export default function CircuitTrace({
  circuitId,
  corners,
  className,
  color,
  animateOnScroll = false,
}: CircuitTraceProps) {
  const { t } = useI18n()
  const { path, viewBox, isRealLayout } = useMemo(
    () => generateCircuitPath(circuitId, corners),
    [circuitId, corners],
  )
  const pathRef = useRef<SVGPathElement>(null)

  useScrollDraw(animateOnScroll ? pathRef : { current: null })

  // Real layouts ship on a 500-unit viewBox (vendored source), abstract shapes on 200 — scale stroke to match.
  const strokeWidth = isRealLayout ? 14 : 3

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label={isRealLayout ? t('circuit.realTrace') : t('circuit.abstractTrace')}
    >
      <title>{isRealLayout ? t('circuit.realTrace') : t('circuit.abstractTrace')}</title>
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={color ?? 'var(--color-kerb)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
