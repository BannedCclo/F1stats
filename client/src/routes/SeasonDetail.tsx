import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSeasonRaces } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import type { RawRace } from '@/api/types'
import QueryStatus from '@/components/ui/QueryStatus'
import KerbDivider from '@/components/ui/KerbDivider'
import SeasonTimeline from '@/components/season/SeasonTimeline'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import { useTypeWidth } from '@/motion/useTypeWidth'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

export default function SeasonDetail() {
  const { year } = useParams<{ year: string }>()
  const { t } = useI18n()
  const yearNum = Number(year)
  const query = useSeasonRaces(yearNum)
  const races = query.data?.races ?? []
  const [activeRace, setActiveRace] = useState<RawRace | null>(null)
  const heroRace = activeRace ?? races[0] ?? null

  const yearRef = useTypeWidth<HTMLHeadingElement>()
  useStatusStrip(heroRace ? `${t('season.round')} ${heroRace.round}/${races.length} · ${heroRace.circuit.circuitName}` : null)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
      <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center">
        <div>
          <p className="font-data text-sm text-dim">{t('nav.seasons')}</p>
          <h1
            ref={yearRef}
            className="display-wide mt-1 font-display text-5xl font-extrabold tracking-tight text-readout"
          >
            {year}
          </h1>

          <div className="mt-4 flex flex-wrap gap-3 font-data text-sm">
            <Link
              to={`/standings/drivers/${year}`}
              className="border border-hairline px-3 py-1.5 text-dim hover:border-accent hover:text-readout"
            >
              {t('home.driversStandings')}
            </Link>
            <Link
              to={`/standings/constructors/${year}`}
              className="border border-hairline px-3 py-1.5 text-dim hover:border-accent hover:text-readout"
            >
              {t('home.constructorsStandings')}
            </Link>
          </div>
        </div>

        {heroRace && (
          <CircuitTrace
            key={heroRace.raceId}
            circuitId={heroRace.circuit.circuitId}
            corners={heroRace.circuit.corners ?? heroRace.circuit.numberOfCorners}
            className="h-40 w-40 shrink-0 sm:h-48 sm:w-48"
            animateOnScroll
          />
        )}
      </div>

      <KerbDivider className="my-8" />

      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">{t('season.calendar')}</h2>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={races.length === 0} skeletonRows={8}>
        <SeasonTimeline
          year={year ?? yearNum}
          races={races}
          activeRaceId={heroRace?.raceId}
          onActivateRace={setActiveRace}
        />
      </QueryStatus>
    </div>
  )
}
