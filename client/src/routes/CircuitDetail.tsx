import { Link, useParams } from 'react-router-dom'
import { useCircuit } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne, normalizeCircuit } from '@/domain/normalize'
import { formatCircuitLength, formatLapTime, idToLabel } from '@/domain/format'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'

export default function CircuitDetail() {
  const { circuitId } = useParams<{ circuitId: string }>()
  const { t } = useI18n()

  const query = useCircuit(circuitId)
  const raw = unwrapOne(query.data?.circuit)
  const circuit = raw ? normalizeCircuit(raw) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={!circuit} skeletonRows={4}>
        {circuit && (
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2">
                <CountryFlag country={circuit.country} />
                <span className="font-data text-xs uppercase tracking-widest text-smoke">
                  {circuit.city}, {circuit.country}
                </span>
              </div>
              <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-chalk sm:text-5xl">
                {circuit.circuitName}
              </h1>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 font-data text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-smoke">{t('circuit.length')}</dt>
                  <dd className="mt-0.5 text-chalk">{formatCircuitLength(circuit.lengthMeters)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-smoke">{t('circuit.corners')}</dt>
                  <dd className="mt-0.5 text-chalk">{circuit.corners ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-smoke">{t('circuit.firstParticipation')}</dt>
                  <dd className="mt-0.5 text-chalk">{circuit.firstParticipationYear}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-smoke">{t('circuit.lapRecord')}</dt>
                  <dd className="mt-0.5 text-chalk">{formatLapTime(circuit.lapRecord)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-smoke">{t('circuit.fastestLapBy')}</dt>
                  <dd className="mt-0.5 text-chalk">
                    {circuit.fastestLapDriverId ? (
                      <Link to={`/drivers/${circuit.fastestLapDriverId}`} className="hover:text-kerb">
                        {idToLabel(circuit.fastestLapDriverId)}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {circuit.fastestLapYear ? ` (${circuit.fastestLapYear})` : ''}
                  </dd>
                </div>
              </dl>

              {circuit.url && (
                <a
                  href={circuit.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-block font-data text-xs text-smoke hover:text-kerb"
                >
                  Wikipedia ↗
                </a>
              )}
            </div>

            <CircuitTrace
              circuitId={circuit.circuitId}
              corners={circuit.corners}
              className="h-52 w-52 sm:h-64 sm:w-64"
              animateOnScroll
            />
          </div>
        )}
      </QueryStatus>
    </div>
  )
}
