import { Link, useParams } from 'react-router-dom'
import { useCircuit } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne, normalizeCircuit } from '@/domain/normalize'
import { formatCircuitLength, formatLapTime, idToLabel } from '@/domain/format'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import CountryFlag from '@/components/identity/CountryFlag'
import QueryStatus from '@/components/ui/QueryStatus'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

export default function CircuitDetail() {
  const { circuitId } = useParams<{ circuitId: string }>()
  const { t } = useI18n()

  const query = useCircuit(circuitId)
  const raw = unwrapOne(query.data?.circuit)
  const circuit = raw ? normalizeCircuit(raw) : null

  useStatusStrip(circuit ? `${circuit.circuitName} · ${circuit.city}, ${circuit.country}` : null)

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={!circuit} skeletonRows={4}>
        {circuit && (
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2">
                <CountryFlag country={circuit.country} />
                <span className="font-data text-xs uppercase tracking-widest text-dim">
                  {circuit.city}, {circuit.country}
                </span>
              </div>
              <h1 className="display-wide mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-readout sm:text-5xl">
                {circuit.circuitName}
              </h1>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 font-data text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dim">{t('circuit.length')}</dt>
                  <dd className="mt-0.5 text-readout">{formatCircuitLength(circuit.lengthMeters)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dim">{t('circuit.corners')}</dt>
                  <dd className="mt-0.5 text-readout">{circuit.corners ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dim">{t('circuit.firstParticipation')}</dt>
                  <dd className="mt-0.5 text-readout">{circuit.firstParticipationYear}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-dim">{t('circuit.lapRecord')}</dt>
                  <dd className="mt-0.5 text-fastest emissive">{formatLapTime(circuit.lapRecord)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-dim">{t('circuit.fastestLapBy')}</dt>
                  <dd className="mt-0.5 text-readout">
                    {circuit.fastestLapDriverId ? (
                      <Link to={`/drivers/${circuit.fastestLapDriverId}`} className="hover:text-accent">
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
                  className="mt-8 inline-block font-data text-xs text-dim hover:text-accent"
                >
                  Wikipedia ↗
                </a>
              )}
            </div>

            <CircuitTrace
              circuitId={circuit.circuitId}
              corners={circuit.corners}
              svg={circuit.svg}
              className="h-52 w-52 sm:h-64 sm:w-64"
              animateOnScroll
              animateLap
            />
          </div>
        )}
      </QueryStatus>
    </div>
  )
}
