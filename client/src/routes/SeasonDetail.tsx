import { Link, useParams } from 'react-router-dom'
import { useSeasonRaces } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import SeasonTimeline from '@/components/season/SeasonTimeline'

export default function SeasonDetail() {
  const { year } = useParams<{ year: string }>()
  const { t } = useI18n()
  const yearNum = Number(year)
  const query = useSeasonRaces(yearNum)
  const races = query.data?.races ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <p className="font-data text-sm text-smoke">{t('nav.seasons')}</p>
      <h1 className="mt-1 font-display text-5xl font-extrabold tracking-tight text-chalk">{year}</h1>

      <div className="mt-4 flex flex-wrap gap-3 font-data text-sm">
        <Link to={`/standings/drivers/${year}`} className="border border-graphite px-3 py-1.5 text-smoke hover:border-kerb hover:text-chalk">
          {t('home.driversStandings')}
        </Link>
        <Link to={`/standings/constructors/${year}`} className="border border-graphite px-3 py-1.5 text-smoke hover:border-kerb hover:text-chalk">
          {t('home.constructorsStandings')}
        </Link>
      </div>

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-chalk">{t('season.calendar')}</h2>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={races.length === 0} skeletonRows={8}>
        <SeasonTimeline year={year ?? yearNum} races={races} />
      </QueryStatus>
    </div>
  )
}
