import { AnimatePresence } from 'motion/react'
import TimingRow from './TimingRow'

export interface TimingTowerItem {
  /** Stable key across re-renders (driverId/teamId) — required for reordering to animate correctly. */
  id: string
  position: string | number
  code: string
  label: string
  teamId?: string | null
  value: string
  sector?: 'purple' | 'green' | 'yellow' | null
  href?: string
}

interface TimingTowerProps {
  items: TimingTowerItem[]
}

/**
 * The signature element, reused everywhere the app shows a ranked list of
 * drivers or teams: standings, race/quali/practice results, sprint. Rows
 * physically reorder via layout animation when the underlying data changes
 * (season switch, session switch) instead of just swapping content.
 */
export default function TimingTower({ items }: TimingTowerProps) {
  return (
    <div className="border border-graphite bg-carbon">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <TimingRow key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  )
}
