import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCircuitSearch, useDriverSearch, useTeamSearch } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import DriverMonogram from '@/components/identity/DriverMonogram'
import TeamBar from '@/components/identity/TeamBar'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import SearchField from '@/components/ui/SearchField'
import KerbDivider from '@/components/ui/KerbDivider'

export default function Search() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  const driversQuery = useDriverSearch(query)
  const teamsQuery = useTeamSearch(query)
  const circuitsQuery = useCircuitSearch(query)

  const drivers = driversQuery.data?.drivers ?? []
  const teams = teamsQuery.data?.teams ?? []
  const circuits = circuitsQuery.data?.circuits ?? []

  const hasQuery = query.trim().length > 0
  const isLoading = driversQuery.isFetching || teamsQuery.isFetching || circuitsQuery.isFetching
  const hasResults = drivers.length > 0 || teams.length > 0 || circuits.length > 0

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">{t('nav.search')}</h1>

      <div className="mt-6">
        <SearchField value={query} onChange={setQuery} autoFocus />
      </div>

      {!hasQuery && <p className="mt-8 text-sm text-smoke">{t('search.prompt')}</p>}

      {hasQuery && !isLoading && !hasResults && <p className="mt-8 text-sm text-smoke">{t('search.noResults')}</p>}

      {drivers.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-smoke">{t('search.drivers')}</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {drivers.map((d) => (
              <li key={d.driverId}>
                <Link
                  to={`/drivers/${d.driverId}`}
                  className="flex items-center gap-3 border border-graphite bg-carbon p-3 hover:border-kerb"
                >
                  <DriverMonogram shortName={d.shortName} surname={d.surname} wikipediaUrl={d.url} />
                  <span className="text-sm text-chalk">
                    {d.name} {d.surname}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {teams.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-smoke">{t('search.teams')}</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {teams.map((team) => (
              <li key={team.teamId}>
                <Link
                  to={`/teams/${team.teamId}`}
                  className="flex items-center gap-3 border border-graphite bg-carbon p-3 hover:border-kerb"
                >
                  <TeamBar teamId={team.teamId} teamName={team.teamName} />
                  <span className="text-sm text-chalk">{team.teamName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {circuits.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-smoke">
            {t('search.circuits')}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {circuits.map((c) => (
              <li key={c.circuitId}>
                <Link
                  to={`/circuits/${c.circuitId}`}
                  className="flex items-center gap-3 border border-graphite bg-carbon p-3 hover:border-kerb"
                >
                  <CircuitTrace
                    circuitId={c.circuitId}
                    corners={c.corners ?? c.numberOfCorners}
                    className="h-10 w-10 shrink-0"
                    color="var(--color-smoke)"
                  />
                  <span className="text-sm text-chalk">{c.circuitName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <KerbDivider className="mt-12" />
    </div>
  )
}
