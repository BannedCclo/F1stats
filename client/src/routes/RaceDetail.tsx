import { useState } from 'react'
import { useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useRace, useSessionResult, useSprintResult } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { unwrapOne } from '@/domain/normalize'
import { formatDateTime, formatCircuitLength, formatLapTime } from '@/domain/format'
import { SESSION_CATALOG, isSessionScheduled, type SessionKind } from '@/domain/sessions'
import {
  practiceResultsToTimingItems,
  qualyResultsToTimingItems,
  raceResultsToTimingItems,
  sprintQualyResultsToTimingItems,
  sprintRaceResultsToTimingItems,
} from '@/domain/adapters'
import TimingTower from '@/components/timing/TimingTower'
import CircuitTrace from '@/components/circuit/CircuitTrace'
import KerbDivider from '@/components/ui/KerbDivider'
import QueryStatus from '@/components/ui/QueryStatus'

function SessionPanel({ year, round, kind }: { year: number; round: number; kind: SessionKind }) {
  const isFp = kind === 'fp1' || kind === 'fp2' || kind === 'fp3'
  const isQualy = kind === 'qualy'
  const isSprintQualy = kind === 'sprintQualy'
  const isSprintRace = kind === 'sprintRace'
  const isRace = kind === 'race'

  // All hooks are always called (rules of hooks), but `enabled` gates the network request
  // to whichever tab is actually active — switching tabs doesn't fire the other four.
  const fpQuery = useSessionResult(year, round, isFp ? (kind as 'fp1' | 'fp2' | 'fp3') : 'fp1', isFp)
  const qualyQuery = useSessionResult(year, round, 'qualy', isQualy)
  const raceQuery = useSessionResult(year, round, 'race', isRace)
  const sprintQualyQuery = useSprintResult(year, round, 'qualy', isSprintQualy)
  const sprintRaceQuery = useSprintResult(year, round, 'race', isSprintRace)

  const active = isFp ? fpQuery : isQualy ? qualyQuery : isRace ? raceQuery : isSprintQualy ? sprintQualyQuery : sprintRaceQuery

  const races = active.data?.races

  let items: ReturnType<typeof raceResultsToTimingItems> = []
  if (isFp && races?.fp1Results) items = practiceResultsToTimingItems(races.fp1Results)
  else if (isFp && races?.fp2Results) items = practiceResultsToTimingItems(races.fp2Results)
  else if (isFp && races?.fp3Results) items = practiceResultsToTimingItems(races.fp3Results)
  else if (isQualy && races?.qualyResults) items = qualyResultsToTimingItems(races.qualyResults)
  else if (isRace && races?.results) items = raceResultsToTimingItems(races.results)
  else if (isSprintQualy && races?.sprintQualyResults) items = sprintQualyResultsToTimingItems(races.sprintQualyResults)
  else if (isSprintRace && races?.sprintRaceResults) items = sprintRaceResultsToTimingItems(races.sprintRaceResults)

  return (
    <QueryStatus isLoading={active.isLoading} error={active.error} isEmpty={items.length === 0}>
      <TimingTower items={items} />
    </QueryStatus>
  )
}

export default function RaceDetail() {
  const { year, round } = useParams<{ year: string; round: string }>()
  const { t, locale } = useI18n()
  const yearNum = Number(year)
  const roundNum = Number(round)

  const raceQuery = useRace(yearNum, roundNum)
  const race = unwrapOne(raceQuery.data?.race)

  const [session, setSession] = useState<SessionKind>('race')

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <QueryStatus isLoading={raceQuery.isLoading} error={raceQuery.error} skeletonRows={2}>
        {race && (
          <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="font-data text-sm text-smoke">
                {t('season.round')} {race.round} · {year}
              </p>
              <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-tight text-chalk sm:text-5xl">
                {race.raceName}
              </h1>
              <p className="mt-2 text-sm text-smoke">
                {race.circuit.circuitName}, {race.circuit.city} · {formatCircuitLength(race.circuit.circuitLength)} ·{' '}
                {race.circuit.corners ?? race.circuit.numberOfCorners} {t('circuit.corners').toLowerCase()}
              </p>
              <p className="mt-1 font-data text-xs text-smoke">
                {formatDateTime(race.schedule.race.date, race.schedule.race.time, locale)}
              </p>
            </div>
            <CircuitTrace
              circuitId={race.circuit.circuitId}
              corners={race.circuit.corners ?? race.circuit.numberOfCorners}
              className="h-36 w-36 sm:h-44 sm:w-44"
              animateOnScroll
            />
          </div>
        )}
      </QueryStatus>

      <KerbDivider className="my-8" />

      <div className="flex flex-wrap gap-1 border-b border-graphite">
        {SESSION_CATALOG.filter((s) => !race || isSessionScheduled(race.schedule, s.kind)).map((s) => (
          <button
            key={s.kind}
            type="button"
            onClick={() => setSession(s.kind)}
            className={clsx(
              'border-b-2 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors',
              session === s.kind ? 'border-kerb text-kerb' : 'border-transparent text-smoke hover:text-chalk',
            )}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {Number.isFinite(yearNum) && Number.isFinite(roundNum) && (
          <SessionPanel year={yearNum} round={roundNum} kind={session} />
        )}
      </div>

      {race?.fast_lap?.fast_lap && (
        <p className="mt-6 font-data text-xs text-smoke">
          {t('table.fastestLap')}: {formatLapTime(race.fast_lap.fast_lap)}
        </p>
      )}
    </div>
  )
}
