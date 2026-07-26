import { Link } from 'react-router-dom'
import clsx from 'clsx'
import TeamBar from '@/components/identity/TeamBar'
import { TIMING_STATUS_CLASS, TIMING_STATUS_BG_CLASS } from '@/domain/timingSemantics'
import type { TimingTowerItem } from './TimingTower'

interface TimingRowProps {
  item: TimingTowerItem
}

/**
 * FIA timing-screen semantics, and each one is backed by real data: purple is
 * the fastest lap, gain/loss come from grid minus finish, retired is a real
 * non-finish. Nothing here is decorative — if we can't populate it honestly,
 * it isn't here. See domain/timingSemantics.ts for the single source of this
 * mapping.
 */
export default function TimingRow({ item }: TimingRowProps) {
  const statusClass = item.status ? TIMING_STATUS_CLASS[item.status] : 'text-readout'

  const content = (
    <>
      <span
        aria-hidden="true"
        className={clsx('h-full w-[3px] shrink-0', item.status ? TIMING_STATUS_BG_CLASS[item.status] : 'bg-transparent')}
      />
      <span className="w-8 shrink-0 font-data text-sm text-dim">{item.position}</span>
      <TeamBar teamId={item.teamId} teamName={item.label} />
      <span className="w-12 shrink-0 font-display text-sm font-bold uppercase tracking-wide text-readout">
        {item.code}
      </span>
      {/* Full name/team stays in the accessibility tree on narrow screens even though it's visually
          collapsed — position + code + gap is the compact reading, not a loss of information. */}
      <span className="sr-only sm:not-sr-only sm:min-w-0 sm:flex-1 sm:truncate sm:text-sm sm:text-dim">
        {item.label}
      </span>
      <span className={clsx('ml-auto shrink-0 font-data text-sm font-tabular sm:ml-0', statusClass)}>
        {item.value}
      </span>
    </>
  )

  const rowClass = 'flex items-center gap-3 border-b border-hairline py-2.5 pr-3 transition-colors hover:bg-bezel'

  return item.href ? (
    <Link to={item.href} data-timing-row className={clsx(rowClass, 'no-underline')}>
      {content}
    </Link>
  ) : (
    <div data-timing-row className={rowClass}>
      {content}
    </div>
  )
}
