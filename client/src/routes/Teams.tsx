import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeams } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import TeamBar from '@/components/identity/TeamBar'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 30

export default function Teams() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const query = useTeams(PAGE_SIZE, offset)
  const teams = query.data?.teams ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">{t('nav.teams')}</h1>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={teams.length === 0} skeletonRows={12}>
        <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.teamId}>
              <Link
                to={`/teams/${team.teamId}`}
                className="flex items-center gap-3 border border-graphite bg-carbon p-3 transition-colors hover:border-kerb"
              >
                <TeamBar teamId={team.teamId} teamName={team.teamName} />
                <span className="min-w-0 flex-1 truncate text-sm text-chalk">{team.teamName}</span>
                <CountryFlag country={team.country ?? team.nationality ?? team.teamNationality} />
              </Link>
            </li>
          ))}
        </ul>
      </QueryStatus>

      <Pagination offset={offset} limit={PAGE_SIZE} itemCount={teams.length} onOffsetChange={setOffset} />
    </div>
  )
}
