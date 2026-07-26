import { useLayoutEffect, useRef } from 'react'
import { createLayout, type AutoLayout } from 'animejs'
import { prefersReducedMotion } from '@/motion/reducedMotion'
import type { TimingStatus } from '@/domain/timingSemantics'
import TimingRow from './TimingRow'

export interface TimingTowerItem {
  /** Stable key across re-renders (driverId/teamId) — required for reordering to animate correctly. */
  id: string
  position: string | number
  code: string
  label: string
  teamId?: string | null
  value: string
  /** Backed by real data only: fastest lap, places gained/lost, or a retirement. */
  status?: TimingStatus
  href?: string
}

interface TimingTowerProps {
  items: TimingTowerItem[]
}

/**
 * The signature ranked list, reused everywhere the app shows an order of
 * drivers or teams. Rows physically slide to their new place when the
 * underlying data changes (season switch, session switch) instead of just
 * swapping content.
 *
 * anime's createLayout is FLIP built in: record() captures where rows are now,
 * React commits the new order, then animate() plays the difference.
 *
 * animate() only plays for a true reorder — the same set of ids in a new
 * order. When the id set itself changes (switching from qualifying results to
 * race results on the same page, or a filter changing which drivers are in
 * the list), skipping animate() and only recording avoids rows flying in from
 * wherever the previous, unrelated occupant of that slot used to be.
 */
export default function TimingTower({ items }: TimingTowerProps) {
  const root = useRef<HTMLDivElement>(null)
  const layout = useRef<AutoLayout | null>(null)
  const prevIdSet = useRef<string | null>(null)

  const ids = items.map((i) => i.id)
  const orderKey = ids.join(',')
  const idSetKey = [...ids].sort().join(',')

  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return

    const isReorder = prevIdSet.current !== null && prevIdSet.current === idSetKey

    if (!layout.current) {
      layout.current = createLayout(root.current, {
        children: '[data-timing-row]',
        duration: 420,
        ease: 'outQuad',
      })
    } else if (isReorder) {
      // The DOM already holds the new order; play the delta from the last record.
      layout.current.animate()
    }
    layout.current.record()
    prevIdSet.current = idSetKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, idSetKey])

  useLayoutEffect(() => {
    return () => {
      layout.current?.revert()
      layout.current = null
      prevIdSet.current = null
    }
  }, [])

  return (
    <div ref={root} className="border border-hairline bg-panel">
      {items.map((item) => (
        <TimingRow key={item.id} item={item} />
      ))}
    </div>
  )
}
