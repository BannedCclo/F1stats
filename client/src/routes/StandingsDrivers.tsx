import { useNavigate, useParams } from 'react-router-dom'
import { useDriversChampionship } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { driverStandingToTimingItem } from '@/domain/adapters'
import StandingsPage from '@/components/standings/StandingsPage'

const CURRENT_YEAR = new Date().getFullYear()

export default function StandingsDrivers() {
  const { year } = useParams<{ year?: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const yearNum = year ? Number(year) : null
  const query = useDriversChampionship(yearNum ?? 'current')
  const items = (query.data?.drivers_championship ?? []).map(driverStandingToTimingItem)
  const displayYear = yearNum ?? query.data?.season ?? CURRENT_YEAR

  return (
    <StandingsPage
      title={t('home.driversStandings')}
      basePath="/standings/drivers"
      displayYear={displayYear}
      isLoading={query.isLoading}
      error={query.error}
      items={items}
      onSelectYear={(y) => navigate(`/standings/drivers/${y}`)}
      statusStrip={`${displayYear} · ${items.length}`}
    />
  )
}
