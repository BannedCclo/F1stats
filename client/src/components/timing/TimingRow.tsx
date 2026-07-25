import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import TeamBar from '@/components/identity/TeamBar'
import { useReducedMotion } from '@/motion/reducedMotion'
import type { TimingTowerItem } from './TimingTower'

interface TimingRowProps {
  item: TimingTowerItem
}

const SECTOR_CLASS: Record<NonNullable<TimingTowerItem['sector']>, string> = {
  purple: 'text-sector-purple',
  green: 'text-sector-green',
  yellow: 'text-sector-yellow',
}

export default function TimingRow({ item }: TimingRowProps) {
  const reduced = useReducedMotion()

  const content = (
    <>
      <span className="w-8 shrink-0 font-data text-sm text-smoke">{item.position}</span>
      <TeamBar teamId={item.teamId} teamName={item.label} />
      <span className="w-12 shrink-0 font-display text-sm font-bold uppercase tracking-wide text-chalk">
        {item.code}
      </span>
      {/* Full name/team stays in the accessibility tree on narrow screens even though it's visually
          collapsed — position + code + gap is the compact reading, not a loss of information. */}
      <span className="sr-only sm:not-sr-only sm:min-w-0 sm:flex-1 sm:truncate sm:text-sm sm:text-smoke">
        {item.label}
      </span>
      <span
        className={clsx(
          'ml-auto shrink-0 font-data text-sm font-tabular sm:ml-0',
          item.sector ? SECTOR_CLASS[item.sector] : 'text-chalk',
        )}
      >
        {item.value}
      </span>
    </>
  )

  const rowClass =
    'flex items-center gap-3 border-b border-graphite/60 px-3 py-2.5 transition-colors hover:bg-graphite/40'

  const row = item.href ? (
    <Link to={item.href} className={clsx(rowClass, 'no-underline')}>
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  )

  if (reduced) return row

  return (
    <motion.div layout="position" layoutId={item.id} transition={{ type: 'spring', stiffness: 400, damping: 40 }}>
      {row}
    </motion.div>
  )
}
