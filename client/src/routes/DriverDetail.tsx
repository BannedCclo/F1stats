import { Link, useParams } from 'react-router-dom'
import { useDriver, useDriverClassifications } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne } from '@/domain/normalize'
import { formatBirthday, formatPoints, formatPosition } from '@/domain/format'
import { teamColor } from '@/domain/teamColors'
import DriverMonogram from '@/components/identity/DriverMonogram'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'

export default function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>()
  const { t, locale } = useI18n()

  const bioQuery = useDriver(driverId)
  const classificationsQuery = useDriverClassifications(driverId)

  const driver = unwrapOne(bioQuery.data?.driver)
  // Classifications come back oldest-first; the last entry is the driver's
  // current team if they're still racing, or their final team if retired.
  const classifications = classificationsQuery.data?.classifications ?? []
  const latestTeam = classifications[classifications.length - 1]?.team ?? null
  const hasClassifications = !classificationsQuery.isError && classifications.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={bioQuery.isLoading} error={bioQuery.error} isEmpty={!driver} skeletonRows={2}>
        {driver && (
          <div className="flex flex-wrap items-center gap-6">
            <DriverMonogram
              shortName={driver.shortName}
              surname={driver.surname}
              teamId={latestTeam?.teamId}
              wikipediaUrl={driver.url}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <CountryFlag country={driver.nationality ?? driver.country} />
                <span className="font-data text-xs uppercase tracking-widest text-smoke">
                  {driver.nationality ?? driver.country}
                </span>
              </div>
              <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-chalk sm:text-5xl">
                {driver.name} {driver.surname}
              </h1>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-data text-xs text-smoke">
                <div className="flex gap-1.5">
                  <dt>{t('driver.born')}:</dt>
                  <dd className="text-chalk">{formatBirthday(driver.birthday, locale)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t('driver.number')}:</dt>
                  <dd className="text-chalk">{driver.number ?? t('driver.noNumber')}</dd>
                </div>
                {latestTeam && (
                  <div className="flex gap-1.5">
                    <dt>{t('driver.currentTeam')}:</dt>
                    <dd className="text-chalk">
                      <Link to={`/teams/${latestTeam.teamId}`} className="hover:text-kerb">
                        {latestTeam.teamName}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </QueryStatus>

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-chalk">
        {t('driver.resultsBySeason')}
      </h2>

      {classificationsQuery.isLoading && <p className="mt-4 font-data text-sm text-smoke">{t('status.loading')}</p>}

      {hasClassifications && (
        <div className="mt-4 overflow-x-auto border border-graphite">
          <table className="w-full min-w-[560px] border-collapse font-data text-sm">
            <thead>
              <tr className="border-b border-graphite text-left text-xs uppercase tracking-wide text-smoke">
                <th className="px-3 py-2">{t('table.season')}</th>
                <th className="px-3 py-2">{t('table.team')}</th>
                <th className="px-3 py-2 text-right">{t('table.position')}</th>
                <th className="px-3 py-2 text-right">{t('table.points')}</th>
                <th className="px-3 py-2 text-right">{t('table.wins')}</th>
              </tr>
            </thead>
            <tbody>
              {[...classifications]
                .reverse()
                .map((entry) => (
                  <tr key={entry.championshipId} className="border-b border-graphite/60">
                    <td className="px-3 py-2 text-chalk">
                      {entry.season ? (
                        <Link to={`/standings/drivers/${entry.season}`} className="hover:text-kerb">
                          {entry.season}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-smoke">
                      {entry.team ? (
                        <Link to={`/teams/${entry.team.teamId}`} className="hover:text-kerb">
                          {entry.team.teamName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-chalk">
                      {formatPosition(entry.position)}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-chalk">
                      {formatPoints(entry.points)}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-smoke">{entry.wins}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!classificationsQuery.isLoading && !hasClassifications && (
        <p className="mt-4 font-data text-sm text-smoke">{t('status.empty')}</p>
      )}

      {driver?.url && (
        <a
          href={driver.url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block font-data text-xs text-smoke hover:text-kerb"
          style={{ borderBottom: `1px solid ${latestTeam ? teamColor(latestTeam.teamId) : 'transparent'}` }}
        >
          Wikipedia ↗
        </a>
      )}
    </div>
  )
}
