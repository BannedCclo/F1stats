import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import type { RawRace } from '@/api/types'
import { useI18n } from '@/i18n/useI18n'
import { formatDate } from '@/domain/format'
import { useReducedMotion } from '@/motion/reducedMotion'
import CircuitTrace from '@/components/circuit/CircuitTrace'

interface SeasonTimelineProps {
  year: string | number
  races: RawRace[]
}

/**
 * The season calendar as a horizontally scrollable strip with scroll-snap.
 * Cards fade/scale in as they enter view (Motion's `whileInView`, which
 * only ever toggles opacity/transform — no DOM insertion, so it can't
 * corrupt page layout the way a GSAP ScrollTrigger `pin` can in a
 * client-routed SPA, which is what caused the app-wide scroll lockup this
 * component used to cause after a single visit to this page).
 */
export default function SeasonTimeline({ year, races }: SeasonTimelineProps) {
  const { t, locale } = useI18n()
  const reduced = useReducedMotion()

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto py-6 [scrollbar-color:var(--color-graphite)_transparent]">
      {races.map((race, i) => (
        <motion.div
          key={race.raceId}
          className="snap-start shrink-0"
          initial={reduced ? undefined : { opacity: 0, scale: 0.9 }}
          whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.35, delay: reduced ? 0 : Math.min(i * 0.04, 0.3) }}
        >
          <Link
            to={`/races/${year}/${race.round}`}
            className="flex w-64 flex-col items-center gap-3 border border-graphite bg-carbon p-5 text-center transition-colors hover:border-kerb"
          >
            <CircuitTrace
              circuitId={race.circuit.circuitId}
              corners={race.circuit.corners ?? race.circuit.numberOfCorners}
              className="h-24 w-24"
              color="var(--color-smoke)"
            />
            <p className="font-data text-xs text-smoke">
              {t('season.round')} {race.round} · {formatDate(race.schedule.race.date, locale)}
            </p>
            <p className="font-display text-base font-bold uppercase leading-tight tracking-tight text-chalk">
              {race.raceName}
            </p>
            {race.winner && (
              <p className="truncate text-xs text-smoke">
                {t('season.winner')}: {race.winner.name} {race.winner.surname}
              </p>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
