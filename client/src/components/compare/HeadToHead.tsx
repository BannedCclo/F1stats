import clsx from 'clsx'
import { useCompare } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'

interface HeadToHeadProps {
  year: number
  driverId1: string
  driverId2: string
  label1: string
  label2: string
}

interface StatRow {
  label: string
  v1: number | null
  v2: number | null
  /** Points/wins/podiums are better higher; finishing and grid positions, and DNFs, are better lower. */
  higherIsBetter: boolean
}

/**
 * Head-to-head stats between two drivers, scoped to the season they shared —
 * the server computes this only within one championship, so there's no
 * career-spanning version of this endpoint to fall back to.
 *
 * Renders nothing on load, error, or no shared results (a 404 here just
 * means these two drivers never raced each other that season) — this is a
 * supplementary panel, not a load-bearing one, so it never shows a broken or
 * loading state to the page around it.
 */
export default function HeadToHead({ year, driverId1, driverId2, label1, label2 }: HeadToHeadProps) {
  const { t } = useI18n()
  const query = useCompare(year, driverId1, driverId2)
  const data = query.data

  if (query.isLoading || query.isError || !data) return null

  const c = data.comparison
  const rows: StatRow[] = [
    { label: t('compare.points'), v1: c.championship.totalPoints[driverId1], v2: c.championship.totalPoints[driverId2], higherIsBetter: true },
    { label: t('compare.raceWins'), v1: c.raceComparison[driverId1], v2: c.raceComparison[driverId2], higherIsBetter: true },
    { label: t('compare.qualyWins'), v1: c.qualifyingComparison[driverId1], v2: c.qualifyingComparison[driverId2], higherIsBetter: true },
    { label: t('compare.podiums'), v1: c.podiums[driverId1], v2: c.podiums[driverId2], higherIsBetter: true },
    { label: t('compare.poles'), v1: c.poles[driverId1], v2: c.poles[driverId2], higherIsBetter: true },
    { label: t('compare.pointFinishes'), v1: c.pointFinishes[driverId1], v2: c.pointFinishes[driverId2], higherIsBetter: true },
    { label: t('compare.bestFinish'), v1: c.bestRaceFinish[driverId1], v2: c.bestRaceFinish[driverId2], higherIsBetter: false },
    { label: t('compare.bestGrid'), v1: c.bestGridPosition[driverId1], v2: c.bestGridPosition[driverId2], higherIsBetter: false },
    { label: t('compare.dnfs'), v1: c.dnfs[driverId1], v2: c.dnfs[driverId2], higherIsBetter: false },
  ]

  function winnerClass(row: StatRow, side: 'v1' | 'v2'): string {
    const mine = row[side]
    const other = row[side === 'v1' ? 'v2' : 'v1']
    if (mine == null || other == null || mine === other) return 'text-readout'
    const wins = row.higherIsBetter ? mine > other : mine < other
    return wins ? 'text-gain' : 'text-dim'
  }

  return (
    <div className="border border-hairline bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase tracking-wide text-readout">
          {label1}
        </span>
        <span className="shrink-0 font-data text-xs uppercase tracking-widest text-dim">{t('compare.vs')}</span>
        <span className="min-w-0 flex-1 truncate text-right font-display text-sm font-bold uppercase tracking-wide text-readout">
          {label2}
        </span>
      </div>
      <p className="border-b border-hairline px-4 py-1.5 text-center font-data text-xs text-dim">
        {c.totalRaces} {t('compare.totalRaces').toLowerCase()}
      </p>
      <div className="divide-y divide-hairline">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 font-data text-sm">
            <span className={clsx('text-right tabular-nums', winnerClass(row, 'v1'))}>{row.v1 ?? '—'}</span>
            <span className="text-center text-[.6875rem] uppercase tracking-wide text-dim">{row.label}</span>
            <span className={clsx('tabular-nums', winnerClass(row, 'v2'))}>{row.v2 ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
