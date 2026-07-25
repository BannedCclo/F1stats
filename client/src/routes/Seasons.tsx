import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSeasons } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import QueryStatus from '@/components/ui/QueryStatus'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 24

export default function Seasons() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const query = useSeasons(PAGE_SIZE, offset)
  const championships = query.data?.championships ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">
        {t('nav.seasons')}
      </h1>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={championships.length === 0} skeletonRows={10}>
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {championships.map((c) => (
            <Link
              key={c.championshipId}
              to={`/seasons/${c.year}`}
              className="border border-graphite bg-carbon px-4 py-6 text-center transition-colors hover:border-kerb"
            >
              <span className="font-display text-2xl font-extrabold text-chalk">{c.year}</span>
            </Link>
          ))}
        </div>
      </QueryStatus>

      <Pagination offset={offset} limit={PAGE_SIZE} itemCount={championships.length} onOffsetChange={setOffset} />
    </div>
  )
}
