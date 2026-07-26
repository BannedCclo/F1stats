import { Link } from 'react-router-dom'
import { useDriversChampionship, useConstructorsChampionship, useLastRace, useNextRace } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne } from '@/domain/normalize'
import { driverStandingToTimingItem, constructorStandingToTimingItem } from '@/domain/adapters'
import { formatDateTime } from '@/domain/format'
import { teamAccent } from '@/domain/teamColors'
import { useCountdown } from '@/motion/useCountdown'
import { useTypeWidth } from '@/motion/useTypeWidth'
import { useSplitReveal } from '@/motion/useSplitReveal'
import { useThemeAccent } from '@/motion/useThemeAccent'
import { useStatusStrip } from '@/components/layout/useStatusStrip'
import TimingTower from '@/components/timing/TimingTower'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import KerbDivider from '@/components/ui/KerbDivider'
import QueryStatus from '@/components/ui/QueryStatus'
import Reveal from '@/components/ui/Reveal'

function Countdown({ iso }: { iso: string | null }) {
  const { t } = useI18n()
  const parts = useCountdown(iso)
  if (!parts) return null

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-data">
      <span className="text-xs uppercase tracking-widest text-dim">{t('home.countdown')}</span>
      <div className="flex flex-wrap gap-x-2 gap-y-1 text-2xl font-tabular text-fastest emissive sm:text-3xl">
        <span>
          {parts.days}
          {t('home.days')}
        </span>
        <span>
          {String(parts.hours).padStart(2, '0')}
          {t('home.hours')}
        </span>
        <span>
          {String(parts.minutes).padStart(2, '0')}
          {t('home.minutes')}
        </span>
        <span>
          {String(parts.seconds).padStart(2, '0')}
          {t('home.seconds')}
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  const { t, locale } = useI18n()
  const nextRaceQuery = useNextRace()
  const lastRaceQuery = useLastRace()
  const driversQuery = useDriversChampionship('current')
  const constructorsQuery = useConstructorsChampionship('current')

  const nextRace = unwrapOne(nextRaceQuery.data?.race)
  const lastRace = unwrapOne(lastRaceQuery.data?.race)

  const driverItems = (driversQuery.data?.drivers_championship ?? []).slice(0, 5).map(driverStandingToTimingItem)
  const constructorItems = (constructorsQuery.data?.constructors_championship ?? [])
    .slice(0, 5)
    .map(constructorStandingToTimingItem)

  // The page wears the championship leader's livery — the one entity every
  // visitor to the home page has in common, so it's the only accent choice
  // that isn't arbitrary here.
  const leader = driverItems[0]
  const accent = leader?.teamId ? teamAccent(leader.teamId) : null
  useThemeAccent(accent?.accent, accent?.contrast)

  const titleRef = useTypeWidth<HTMLHeadingElement>({ duration: 700 })
  const taglineRef = useSplitReveal<HTMLParagraphElement>({ by: 'words' })

  useStatusStrip(
    nextRace
      ? [
          `${t('season.round')} ${nextRace.round}`,
          nextRace.circuit.circuitName,
          leader ? `${t('statusStrip.leader')}: ${leader.label}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null,
  )

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 sm:py-24">
        <p key={locale} ref={taglineRef} className="font-data text-sm uppercase tracking-widest text-rosso">
          {t('brand.tagline')}
        </p>
        <h1
          ref={titleRef}
          className="display-wide mt-3 font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight text-readout sm:text-7xl"
        >
          {t('brand.name')}
        </h1>

        <QueryStatus isLoading={nextRaceQuery.isLoading} error={nextRaceQuery.error} skeletonRows={1}>
          {nextRace && (
            <div className="mt-10 grid grid-cols-1 items-center gap-8 border border-hairline bg-panel p-6 sm:grid-cols-[1fr_auto] sm:p-8">
              <div>
                <p className="font-data text-xs uppercase tracking-widest text-dim">{t('home.nextRace')}</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-readout sm:text-3xl">
                  {nextRace.raceName}
                </h2>
                <p className="mt-1 text-sm text-dim">
                  {nextRace.circuit.circuitName} ·{' '}
                  {formatDateTime(nextRace.schedule.race.date, nextRace.schedule.race.time, locale)}
                </p>
                <div className="mt-6">
                  <Countdown
                    iso={
                      nextRace.schedule.race.date
                        ? `${nextRace.schedule.race.date}T${nextRace.schedule.race.time ?? '00:00:00Z'}`
                        : null
                    }
                  />
                </div>
                <Link
                  to={`/races/2026/${nextRace.round}`}
                  className="mt-6 inline-block border border-accent px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-accent hover:bg-accent hover:text-accent-contrast"
                >
                  {t('nav.circuits')} → {nextRace.circuit.circuitName}
                </Link>
              </div>
              <CircuitTrace
                circuitId={nextRace.circuit.circuitId}
                corners={nextRace.circuit.corners ?? nextRace.circuit.numberOfCorners}
                svg={nextRace.circuit.svg}
                className="h-40 w-40 sm:h-48 sm:w-48"
                animateOnScroll
              />
            </div>
          )}
        </QueryStatus>
      </section>

      <KerbDivider />

      {/* Last race */}
      <section className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
        <p className="font-data text-xs uppercase tracking-widest text-dim">{t('home.lastRace')}</p>
        <QueryStatus isLoading={lastRaceQuery.isLoading} error={lastRaceQuery.error} skeletonRows={1}>
          {lastRace && (
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-readout">
                {lastRace.raceName}
              </h2>
              {lastRace.winner && (
                <Link
                  to={`/drivers/${lastRace.winner.driverId}`}
                  className="font-data text-sm text-accent hover:underline"
                >
                  🏆 {lastRace.winner.name} {lastRace.winner.surname}
                </Link>
              )}
            </div>
          )}
        </QueryStatus>
      </section>

      <KerbDivider />

      {/* Standings preview */}
      <section className="mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
              {t('home.driversStandings')}
            </h2>
            <Link to="/standings/drivers" className="font-data text-xs text-dim hover:text-accent">
              {t('home.viewFull')} →
            </Link>
          </div>
          <QueryStatus isLoading={driversQuery.isLoading} error={driversQuery.error} isEmpty={driverItems.length === 0}>
            <TimingTower items={driverItems} />
          </QueryStatus>
        </Reveal>

        <Reveal>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
              {t('home.constructorsStandings')}
            </h2>
            <Link to="/standings/constructors" className="font-data text-xs text-dim hover:text-accent">
              {t('home.viewFull')} →
            </Link>
          </div>
          <QueryStatus
            isLoading={constructorsQuery.isLoading}
            error={constructorsQuery.error}
            isEmpty={constructorItems.length === 0}
          >
            <TimingTower items={constructorItems} />
          </QueryStatus>
        </Reveal>
      </section>
    </div>
  )
}
