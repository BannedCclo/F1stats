import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCircuits } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 24

export default function Circuits() {
  const { t } = useI18n()
  const [offset, setOffset] = useState(0)
  const query = useCircuits(PAGE_SIZE, offset)
  const circuits = query.data?.circuits ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">
        {t('nav.circuits')}
      </h1>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={circuits.length === 0} skeletonRows={12}>
        <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {circuits.map((c) => (
            <li key={c.circuitId}>
              <Link
                to={`/circuits/${c.circuitId}`}
                className="flex items-center gap-3 border border-graphite bg-carbon p-3 transition-colors hover:border-kerb"
              >
                <CircuitTrace
                  circuitId={c.circuitId}
                  corners={c.corners ?? c.numberOfCorners}
                  className="h-12 w-12 shrink-0"
                  color="var(--color-smoke)"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-chalk">{c.circuitName}</p>
                  <p className="truncate text-xs text-smoke">{c.city}</p>
                </div>
                <CountryFlag country={c.country} />
              </Link>
            </li>
          ))}
        </ul>
      </QueryStatus>

      <Pagination offset={offset} limit={PAGE_SIZE} itemCount={circuits.length} onOffsetChange={setOffset} />
    </div>
  )
}
