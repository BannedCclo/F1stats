import { Link, useParams } from 'react-router-dom'
import { useTeam, useTeamClassifications, useTeamDrivers } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne, normalizeTeam } from '@/domain/normalize'
import { teamColor, teamAccent } from '@/domain/teamColors'
import { formatPoints, formatPosition } from '@/domain/format'
import CountryFlag from '@/components/identity/CountryFlag'
import DriverMonogram from '@/components/identity/DriverMonogram'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import StatTile from '@/components/ui/StatTile'
import { useThemeAccent } from '@/motion/useThemeAccent'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const { t } = useI18n()

  const bioQuery = useTeam(teamId)
  const classificationsQuery = useTeamClassifications(teamId)
  const lineupQuery = useTeamDrivers('current', teamId)

  const rawTeam = unwrapOne(bioQuery.data?.team)
  const team = rawTeam ? normalizeTeam(rawTeam, teamId) : null
  const classifications = classificationsQuery.data?.classifications ?? []
  const hasClassifications = !classificationsQuery.isError && classifications.length > 0
  const lineup = lineupQuery.data?.drivers.map((d) => d.driver) ?? []
  const color = teamColor(teamId)
  const accent = teamAccent(teamId)

  useThemeAccent(team ? accent.accent : null, team ? accent.contrast : null)
  useStatusStrip(team ? `${team.teamName} · ${classifications.length} ${t('table.season').toLowerCase()}` : null)

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={bioQuery.isLoading} error={bioQuery.error} isEmpty={!team} skeletonRows={2}>
        {team && (
          <>
            <div className="flex flex-wrap items-center gap-6">
              <span aria-hidden="true" className="h-16 w-3 shrink-0" style={{ backgroundColor: color }} />
              <div>
                <div className="flex items-center gap-2">
                  <CountryFlag country={team.country} />
                  <span className="font-data text-xs uppercase tracking-widest text-dim">{team.country}</span>
                </div>
                <h1 className="display-wide mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-readout sm:text-5xl">
                  {team.teamName}
                </h1>
                <p className="mt-2 font-data text-xs text-dim">
                  {t('team.firstAppearance')}: <span className="text-readout">{team.firstAppearance ?? '—'}</span>
                </p>
              </div>
            </div>

            <div className="mt-6 grid max-w-sm grid-cols-2 gap-3">
              <StatTile label={t('team.constructorsChampionships')} value={team.constructorsChampionships} />
              <StatTile label={t('team.driversChampionships')} value={team.driversChampionships} />
            </div>

            {lineup.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-dim">
                  {t('team.currentLineup')}
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
                  {lineup.map((d) => (
                    <Link
                      key={d.driverId}
                      to={`/drivers/${d.driverId}`}
                      className="flex items-center gap-2 border border-hairline bg-bezel px-3 py-2 transition-colors hover:border-accent"
                    >
                      <DriverMonogram shortName={d.shortName} surname={d.surname} teamId={teamId} wikipediaUrl={d.url} size="sm" />
                      <span className="text-sm text-readout">
                        {d.name} {d.surname}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </QueryStatus>

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
        {t('team.resultsBySeason')}
      </h2>

      {classificationsQuery.isLoading && <p className="mt-4 font-data text-sm text-dim">{t('status.loading')}</p>}

      {hasClassifications && (
        <div className="mt-4 overflow-x-auto border border-hairline">
          <table className="w-full min-w-[560px] border-collapse font-data text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-dim">
                <th className="px-3 py-2">{t('table.season')}</th>
                <th className="px-3 py-2 text-right">{t('table.position')}</th>
                <th className="px-3 py-2 text-right">{t('table.points')}</th>
                <th className="px-3 py-2 text-right">{t('table.wins')}</th>
                <th className="px-3 py-2 text-right">{t('team.racesEntered')}</th>
              </tr>
            </thead>
            <tbody>
              {[...classifications]
                .reverse()
                .map((entry) => (
                  <tr key={entry.championshipId} className="border-b border-hairline/60">
                    <td className="px-3 py-2 text-readout">
                      {entry.season ? (
                        <Link to={`/standings/constructors/${entry.season}`} className="hover:text-accent">
                          {entry.season}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-readout">
                      {entry.position !== null ? formatPosition(entry.position) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-readout">
                      {entry.points !== null ? formatPoints(entry.points) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-dim">{entry.wins}</td>
                    <td className="px-3 py-2 text-right font-tabular text-dim">{entry.racesEntered}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!classificationsQuery.isLoading && !hasClassifications && (
        <p className="mt-4 font-data text-sm text-dim">{t('status.empty')}</p>
      )}

      {team?.url && (
        <a
          href={team.url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block font-data text-xs text-dim hover:text-accent"
        >
          Wikipedia ↗
        </a>
      )}
    </div>
  )
}
