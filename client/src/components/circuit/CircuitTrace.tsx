import { useMemo, useRef } from 'react'
import { generateCircuitPath } from '@/domain/circuitPath'
import { useScrollDraw } from '@/motion/useScrollDraw'
import { useMotionPath } from '@/motion/useMotionPath'
import { useI18n } from '@/i18n/useI18n'

interface CircuitTraceProps {
  circuitId: string
  corners?: number | null
  className?: string
  color?: string
  /** The API's own curated track outline, when the caller already has it. Preferred over the vendored/abstract fallback. */
  svg?: { path: string; viewBox: string } | null
  /** Draws the trace in as it scrolls into view instead of rendering it fully drawn. */
  animateOnScroll?: boolean
  /** Sends a dot around the trace using the path's own geometry. Reserved for one hero use per page. */
  animateLap?: boolean
}

function viewBoxWidth(viewBox: string): number {
  const width = Number(viewBox.trim().split(/\s+/)[2])
  return Number.isFinite(width) && width > 0 ? width : 500
}

/**
 * A track silhouette. Prefers the real outline the API itself now curates
 * (`circuit.svg`) when the caller has already fetched it. Falls back to the
 * vendored open-source outlines in realCircuitShapes.ts (see that file for
 * attribution), and finally to an abstract deterministic shape that makes no
 * claim to represent the real layout. A native tooltip on hover discloses
 * which one you're looking at.
 */
export default function CircuitTrace({
  circuitId,
  corners,
  className,
  color,
  svg,
  animateOnScroll = false,
  animateLap = false,
}: CircuitTraceProps) {
  const { t } = useI18n()
  const generated = useMemo(() => generateCircuitPath(circuitId, corners), [circuitId, corners])
  const { path, viewBox, isRealLayout } = svg ? { ...svg, isRealLayout: true } : generated
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)

  useScrollDraw(animateOnScroll ? pathRef : { current: null })
  useMotionPath(animateLap ? pathRef : { current: null }, animateLap ? dotRef : { current: null })

  // Real layouts scale their stroke to a fraction of the viewBox width tuned against
  // the vendored 500-unit source; abstract shapes use a thinner fraction on their 200-unit box.
  const strokeWidth = viewBoxWidth(viewBox) * (isRealLayout ? 0.028 : 0.015)

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
        stroke={color ?? 'var(--color-rosso)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {animateLap && (
        <circle ref={dotRef} r={strokeWidth * 1.4} fill="var(--color-accent)" aria-hidden="true" />
      )}
    </svg>
  )
}
