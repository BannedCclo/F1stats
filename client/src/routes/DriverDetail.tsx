import { Link, useParams } from 'react-router-dom'
import { useDriver, useDriverClassifications, useTeamDrivers } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne } from '@/domain/normalize'
import { formatBirthday, formatPoints, formatPosition } from '@/domain/format'
import { teamColor, teamAccent } from '@/domain/teamColors'
import DriverMonogram from '@/components/identity/DriverMonogram'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import HeadToHead from '@/components/compare/HeadToHead'
import { useThemeAccent } from '@/motion/useThemeAccent'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

const CURRENT_YEAR = new Date().getFullYear()

export default function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>()
  const { t, locale } = useI18n()

  const bioQuery = useDriver(driverId)
  const classificationsQuery = useDriverClassifications(driverId)

  const driver = unwrapOne(bioQuery.data?.driver)
  // Classifications come back oldest-first; the last entry is the driver's
  // current team if they're still racing, or their final team if retired.
  const classifications = classificationsQuery.data?.classifications ?? []
  const latestEntry = classifications[classifications.length - 1] ?? null
  const latestTeam = latestEntry?.team ?? null
  const hasClassifications = !classificationsQuery.isError && classifications.length > 0
  const isActiveThisSeason = latestEntry?.season === CURRENT_YEAR

  // A head-to-head only makes sense against this season's actual teammate —
  // 'current' lineup would misattribute teammates for a driver whose last
  // season wasn't this one.
  const lineupQuery = useTeamDrivers('current', isActiveThisSeason ? (latestTeam?.teamId ?? undefined) : undefined)
  const teammate = lineupQuery.data?.drivers.map((d) => d.driver).find((d) => d.driverId !== driverId) ?? null

  const accent = latestTeam ? teamAccent(latestTeam.teamId) : null
  useThemeAccent(accent?.accent, accent?.contrast)
  useStatusStrip(
    driver ? `${driver.name} ${driver.surname} · ${classifications.length} ${t('table.season').toLowerCase()}` : null,
  )

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
                <span className="font-data text-xs uppercase tracking-widest text-dim">
                  {driver.nationality ?? driver.country}
                </span>
              </div>
              <h1 className="display-wide mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-readout sm:text-5xl">
                {driver.name} {driver.surname}
              </h1>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-data text-xs text-dim">
                <div className="flex gap-1.5">
                  <dt>{t('driver.born')}:</dt>
                  <dd className="text-readout">{formatBirthday(driver.birthday, locale)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt>{t('driver.number')}:</dt>
                  <dd className="text-readout">{driver.number ?? t('driver.noNumber')}</dd>
                </div>
                {latestTeam && (
                  <div className="flex gap-1.5">
                    <dt>{t('driver.currentTeam')}:</dt>
                    <dd className="text-readout">
                      <Link to={`/teams/${latestTeam.teamId}`} className="hover:text-accent">
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

      {driver && teammate && driverId && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
            {t('compare.title')}
          </h2>
          <div className="mt-3 max-w-md">
            <HeadToHead
              year={CURRENT_YEAR}
              driverId1={driverId}
              driverId2={teammate.driverId}
              label1={driver.surname}
              label2={teammate.surname}
            />
          </div>
        </div>
      )}

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
        {t('driver.resultsBySeason')}
      </h2>

      {classificationsQuery.isLoading && <p className="mt-4 font-data text-sm text-dim">{t('status.loading')}</p>}

      {hasClassifications && (
        <div className="mt-4 overflow-x-auto border border-hairline">
          <table className="w-full min-w-[560px] border-collapse font-data text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-dim">
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
                  <tr key={entry.championshipId} className="border-b border-hairline/60">
                    <td className="px-3 py-2 text-readout">
                      {entry.season ? (
                        <Link to={`/standings/drivers/${entry.season}`} className="hover:text-accent">
                          {entry.season}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-dim">
                      {entry.team ? (
                        <Link to={`/teams/${entry.team.teamId}`} className="hover:text-accent">
                          {entry.team.teamName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-readout">
                      {formatPosition(entry.position)}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-readout">
                      {formatPoints(entry.points)}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-dim">{entry.wins}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!classificationsQuery.isLoading && !hasClassifications && (
        <p className="mt-4 font-data text-sm text-dim">{t('status.empty')}</p>
      )}

      {driver?.url && (
        <a
          href={driver.url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block font-data text-xs text-dim hover:text-accent"
          style={{ borderBottom: `1px solid ${latestTeam ? teamColor(latestTeam.teamId) : 'transparent'}` }}
        >
          Wikipedia ↗
        </a>
      )}
    </div>
  )
}
