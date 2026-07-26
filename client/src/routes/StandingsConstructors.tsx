import { Link, useNavigate, useParams } from 'react-router-dom'
import { useConstructorsChampionship } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { constructorStandingToTimingItem } from '@/domain/adapters'
import TimingTower from '@/components/timing/TimingTower'
import QueryStatus from '@/components/ui/QueryStatus'
import SeasonJump from '@/components/ui/SeasonJump'

const CURRENT_YEAR = new Date().getFullYear()

export default function StandingsConstructors() {
  const { year } = useParams<{ year?: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const yearNum = year ? Number(year) : null
  const query = useConstructorsChampionship(yearNum ?? 'current')
  const items = (query.data?.constructors_championship ?? []).map(constructorStandingToTimingItem)
  const displayYear = yearNum ?? query.data?.season ?? CURRENT_YEAR

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">
          {t('home.constructorsStandings')}
        </h1>
        <div className="flex items-center gap-2 font-data text-sm">
          <Link to={`/standings/constructors/${displayYear - 1}`} className="text-smoke hover:text-kerb">
            ← {displayYear - 1}
          </Link>
          <SeasonJump year={displayYear} onSelect={(y) => navigate(`/standings/constructors/${y}`)} />
          {displayYear < CURRENT_YEAR && (
            <Link to={`/standings/constructors/${displayYear + 1}`} className="text-smoke hover:text-kerb">
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
