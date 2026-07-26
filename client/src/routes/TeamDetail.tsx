import { Link, useParams } from 'react-router-dom'
import { useTeam, useTeamClassifications } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne, normalizeTeam } from '@/domain/normalize'
import { teamColor } from '@/domain/teamColors'
import { formatPoints, formatPosition } from '@/domain/format'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import CountUpStat from '@/components/ui/CountUpStat'

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const { t } = useI18n()

  const bioQuery = useTeam(teamId)
  const classificationsQuery = useTeamClassifications(teamId)

  const rawTeam = unwrapOne(bioQuery.data?.team)
  const team = rawTeam ? normalizeTeam(rawTeam, teamId) : null
  const classifications = classificationsQuery.data?.classifications ?? []
  const hasClassifications = !classificationsQuery.isError && classifications.length > 0
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
        {t('team.resultsBySeason')}
      </h2>

      {classificationsQuery.isLoading && <p className="mt-4 font-data text-sm text-smoke">{t('status.loading')}</p>}

      {hasClassifications && (
        <div className="mt-4 overflow-x-auto border border-graphite">
          <table className="w-full min-w-[560px] border-collapse font-data text-sm">
            <thead>
              <tr className="border-b border-graphite text-left text-xs uppercase tracking-wide text-smoke">
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
                  <tr key={entry.championshipId} className="border-b border-graphite/60">
                    <td className="px-3 py-2 text-chalk">
                      {entry.season ? (
                        <Link
                          to={`/standings/constructors/${entry.season}`}
                          className="hover:text-kerb"
                        >
                          {entry.season}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-chalk">
                      {entry.position !== null ? formatPosition(entry.position) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-chalk">
                      {entry.points !== null ? formatPoints(entry.points) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-tabular text-smoke">{entry.wins}</td>
                    <td className="px-3 py-2 text-right font-tabular text-smoke">{entry.racesEntered}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!classificationsQuery.isLoading && !hasClassifications && (
        <p className="mt-4 font-data text-sm text-smoke">{t('status.empty')}</p>
      )}

      {team?.url && (
        <a
          href={team.url}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block font-data text-xs text-smoke hover:text-kerb"
        >
          Wikipedia ↗
        </a>
      )}
    </div>
  )
}
