import { Link, useParams } from 'react-router-dom'
import { useTeam, useTeamDriversByYear } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne, normalizeTeam } from '@/domain/normalize'
import { teamColor } from '@/domain/teamColors'
import DriverMonogram from '@/components/identity/DriverMonogram'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import CountUpStat from '@/components/ui/CountUpStat'

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const { t } = useI18n()

  const bioQuery = useTeam(teamId)
  const driversQuery = useTeamDriversByYear('current', teamId)

  const rawTeam = unwrapOne(bioQuery.data?.team)
  const team = rawTeam ? normalizeTeam(rawTeam, teamId) : null
  const drivers = driversQuery.data?.drivers ?? []
  const color = teamColor(teamId)

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={bioQuery.isLoading} error={bioQuery.error} isEmpty={!team} skeletonRows={2}>
        {team && (
          <div className="flex flex-wrap items-center gap-6">
            <span aria-hidden="true" className="h-16 w-3 shrink-0" style={{ backgroundColor: color }} />
            <div>
              <div className="flex items-center gap-2">
                <CountryFlag country={team.country} />
                <span className="font-data text-xs uppercase tracking-widest text-smoke">{team.country}</span>
              </div>
              <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-chalk sm:text-5xl">
                {team.teamName}
              </h1>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-data text-xs text-smoke">
                <div className="flex gap-1.5">
                  <dt>{t('team.firstAppearance')}:</dt>
                  <dd className="text-chalk">{team.firstAppearance ?? '—'}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t('team.constructorsChampionships')}:</dt>
                  <dd className="text-chalk">
                    <CountUpStat value={team.constructorsChampionships} />
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t('team.driversChampionships')}:</dt>
                  <dd className="text-chalk">
                    <CountUpStat value={team.driversChampionships} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </QueryStatus>

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-chalk">
        {t('team.currentDrivers')}
      </h2>

      <QueryStatus
        isLoading={driversQuery.isLoading}
        error={driversQuery.error}
        isEmpty={drivers.length === 0}
        skeletonRows={2}
      >
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {drivers.map(({ driver }) => (
            <li key={driver.driverId}>
              <Link
                to={`/drivers/${driver.driverId}`}
                className="flex items-center gap-3 border border-graphite bg-carbon p-3 transition-colors hover:border-kerb"
              >
                <DriverMonogram
                  shortName={driver.shortName}
                  surname={driver.surname}
                  teamId={teamId}
                  wikipediaUrl={driver.url}
                />
                <span className="text-sm text-chalk">
                  {driver.name} {driver.surname}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </QueryStatus>

      {team?.url && (
        <a href={team.url} target="_blank" rel="noreferrer" className="mt-8 inline-block font-data text-xs text-smoke hover:text-kerb">
          Wikipedia ↗
        </a>
      )}
    </div>
  )
}
