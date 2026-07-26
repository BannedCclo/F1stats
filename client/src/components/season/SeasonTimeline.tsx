import { Link } from 'react-router-dom'
import { animate, stagger } from 'animejs'
import clsx from 'clsx'
import type { RawRace } from '@/api/types'
import { useI18n } from '@/i18n/useI18n'
import { formatDate } from '@/domain/format'
import { useAnimeScope } from '@/motion/useAnimeScope'
import { useDraggableStrip } from '@/motion/useDraggableStrip'
import CircuitTrace from '@/components/circuit/CircuitTrace'

interface SeasonTimelineProps {
  year: string | number
  races: RawRace[]
  activeRaceId?: string | number | null
  onActivateRace?: (race: RawRace) => void
}

/**
 * The season calendar as a horizontally scrollable strip with scroll-snap.
 * Cards fade in on enter, staggered along the strip. Click-and-drag scrolling
 * (useDraggableStrip) layers on top of the native overflow-x-auto scroll —
 * touch, trackpad, and keyboard all keep working exactly as before.
 *
 * This only ever animates opacity/transform on existing nodes — it never
 * pins the scroller. A GSAP ScrollTrigger `pin` here previously caused an
 * app-wide scroll lockup that persisted after routing away; anime.js has
 * replaced GSAP entirely, but pinning stays off-limits regardless of library.
 */
export default function SeasonTimeline({ year, races, activeRaceId, onActivateRace }: SeasonTimelineProps) {
  const { t, locale } = useI18n()

  const root = useAnimeScope<HTMLDivElement>(() => {
    animate('[data-race-card]', {
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 350,
      delay: stagger(40, { start: 0 }),
      ease: 'outQuad',
    })
  }, [races.length, year])

  const dragRef = useDraggableStrip<HTMLDivElement>()

  return (
    <div
      ref={(el) => {
        root.current = el
        dragRef.current = el
      }}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto py-6"
      style={{ scrollbarColor: 'var(--color-hairline) transparent' }}
    >
      {races.map((race) => (
        <div key={race.raceId} data-race-card className="shrink-0 snap-start">
          <Link
            to={`/races/${year}/${race.round}`}
            onMouseEnter={() => onActivateRace?.(race)}
            onFocus={() => onActivateRace?.(race)}
            className={clsx(
              'flex w-64 flex-col items-center gap-3 border bg-panel p-5 text-center transition-colors',
              activeRaceId != null && String(activeRaceId) === String(race.raceId)
                ? 'border-accent'
                : 'border-hairline hover:border-accent',
            )}
          >
            <CircuitTrace
              circuitId={race.circuit.circuitId}
              corners={race.circuit.corners ?? race.circuit.numberOfCorners}
              svg={race.circuit.svg}
              className="h-24 w-24"
              color="var(--color-dim)"
            />
            <p className="font-data text-xs text-dim">
              {t('season.round')} {race.round} · {formatDate(race.schedule.race.date, locale)}
            </p>
            <p className="font-display text-base font-bold uppercase leading-tight tracking-tight text-readout">
              {race.raceName}
            </p>
            {race.winner && (
              <p className="truncate text-xs text-dim">
                {t('season.winner')}: {race.winner.name} {race.winner.surname}
              </p>
            )}
          </Link>
        </div>
      ))}
    </div>
  )
}
