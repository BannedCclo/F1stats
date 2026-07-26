import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeams } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import TeamBar from '@/components/identity/TeamBar'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import Pagination from '@/components/ui/Pagination'
import { useRevealOnScroll } from '@/motion/useRevealOnScroll'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

const PAGE_SIZE = 30

export default function Teams() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const query = useTeams(PAGE_SIZE, offset)
  const teams = query.data?.teams ?? []

  const gridRef = useRevealOnScroll<HTMLUListElement>(
    { enabled: !query.isLoading, selector: '[data-team-tile]', distance: 10, staggerMs: 16 },
    [offset, teams.length],
  )
  useStatusStrip(!query.isLoading ? `${teams.length} ${t('nav.teams').toLowerCase()}` : null)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
      <h1 className="display-wide font-display text-4xl font-extrabold uppercase tracking-tight text-readout">
        {t('nav.teams')}
      </h1>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={teams.length === 0} skeletonRows={12}>
        <ul ref={gridRef} className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.teamId} data-team-tile>
              <Link
                to={`/teams/${team.teamId}`}
                className="flex items-center gap-3 border border-hairline bg-panel p-3 transition-colors hover:border-accent"
              >
                <TeamBar teamId={team.teamId} teamName={team.teamName} />
                <span className="min-w-0 flex-1 truncate text-sm text-readout">{team.teamName}</span>
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
