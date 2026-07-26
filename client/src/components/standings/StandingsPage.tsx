import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import TimingTower from '@/components/timing/TimingTower'
import type { TimingTowerItem } from '@/components/timing/TimingTower'
import QueryStatus from '@/components/ui/QueryStatus'
import SeasonJump from '@/components/ui/SeasonJump'
import Reveal from '@/components/ui/Reveal'
import { useStatusStrip } from '@/components/layout/useStatusStrip'
import { useTypeWidth } from '@/motion/useTypeWidth'

const CURRENT_YEAR = new Date().getFullYear()

interface StandingsPageProps {
  title: string
  basePath: string
  displayYear: number
  isLoading: boolean
  error: unknown
  items: TimingTowerItem[]
  onSelectYear: (year: number) => void
  statusStrip?: ReactNode
}

/**
 * Shared shell for the drivers/constructors standings routes — the two were
 * near-identical files differing only in which endpoint/adapter they call.
 * That data-fetching stays in each thin route component; this renders the
 * header, year navigation, and the tower once for both.
 */
export default function StandingsPage({
  title,
  basePath,
  displayYear,
  isLoading,
  error,
  items,
  onSelectYear,
  statusStrip,
}: StandingsPageProps) {
  const titleRef = useTypeWidth<HTMLHeadingElement>()
  useStatusStrip(statusStrip)

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1
          ref={titleRef}
          className="display-wide font-display text-4xl font-extrabold uppercase tracking-tight text-readout"
        >
          {title}
        </h1>
        <div className="flex items-center gap-2 font-data text-sm">
          <Link to={`${basePath}/${displayYear - 1}`} className="text-dim hover:text-accent">
            ← {displayYear - 1}
          </Link>
          <SeasonJump year={displayYear} onSelect={onSelectYear} />
          {displayYear < CURRENT_YEAR && (
            <Link to={`${basePath}/${displayYear + 1}`} className="text-dim hover:text-accent">
              {displayYear + 1} →
            </Link>
          )}
        </div>
      </div>

      <Reveal className="mt-8">
        <QueryStatus isLoading={isLoading} error={error} isEmpty={items.length === 0} skeletonRows={20}>
          <TimingTower items={items} />
        </QueryStatus>
      </Reveal>
    </div>
  )
}
