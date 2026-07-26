import { useNavigate, useParams } from 'react-router-dom'
import { useConstructorsChampionship } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { constructorStandingToTimingItem } from '@/domain/adapters'
import StandingsPage from '@/components/standings/StandingsPage'

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
    <StandingsPage
      title={t('home.constructorsStandings')}
      basePath="/standings/constructors"
      displayYear={displayYear}
      isLoading={query.isLoading}
      error={query.error}
      items={items}
      onSelectYear={(y) => navigate(`/standings/constructors/${y}`)}
      statusStrip={`${displayYear} · ${items.length}`}
    />
  )
}
