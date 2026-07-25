import { Link, useParams } from 'react-router-dom'
import { useDriversChampionship } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { driverStandingToTimingItem } from '@/domain/adapters'
import TimingTower from '@/components/timing/TimingTower'
import QueryStatus from '@/components/ui/QueryStatus'

const CURRENT_YEAR = new Date().getFullYear()

export default function StandingsDrivers() {
  const { year } = useParams<{ year?: string }>()
  const { t } = useI18n()
  const yearNum = year ? Number(year) : null
  const query = useDriversChampionship(yearNum ?? 'current')
  const items = (query.data?.drivers_championship ?? []).map(driverStandingToTimingItem)
  const displayYear = yearNum ?? query.data?.season ?? CURRENT_YEAR

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">
          {t('home.driversStandings')}
        </h1>
        <div className="flex items-center gap-2 font-data text-sm">
          <Link to={`/standings/drivers/${displayYear - 1}`} className="text-smoke hover:text-kerb">
            ← {displayYear - 1}
          </Link>
          <span className="text-chalk">{displayYear}</span>
          {displayYear < CURRENT_YEAR && (
            <Link to={`/standings/drivers/${displayYear + 1}`} className="text-smoke hover:text-kerb">
              {displayYear + 1} →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8">
        <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={items.length === 0} skeletonRows={20}>
          <TimingTower items={items} />
        </QueryStatus>
      </div>
    </div>
  )
}
