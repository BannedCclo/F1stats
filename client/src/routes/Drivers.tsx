import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllDrivers, useDriverCareerIndex } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import type { RawDriver } from '@/api/types'
import type { DriverCareerStats } from '@/api/careerStats'
import DriverMonogram from '@/components/identity/DriverMonogram'
import CountryFlag from '@/components/identity/CountryFlag'
import TeamBar from '@/components/identity/TeamBar'
import Pagination from '@/components/ui/Pagination'
import { useRevealOnScroll } from '@/motion/useRevealOnScroll'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

const PAGE_SIZE = 30

type SortKey = 'alphabetical' | 'championships' | 'wins' | 'firstYear' | 'lastYear'
const STATS_SORTS: SortKey[] = ['championships', 'wins', 'firstYear', 'lastYear']

type IdentifiedDriver = RawDriver & { driverId: string }

export default function Drivers() {
  const { t } = useI18n()
  const [sortBy, setSortBy] = useState<SortKey>('alphabetical')
  const [country, setCountry] = useState('')
  const [team, setTeam] = useState('')
  const [offset, setOffset] = useState(0)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [wantsCareerData, setWantsCareerData] = useState(false)

  const driversQuery = useAllDrivers()
  const sortOrFilterNeedsStats = STATS_SORTS.includes(sortBy) || team !== ''
  // The career-stats crawl hits ~80 endpoints on an API that answers in ~5s each — expensive enough
  // that it must stay opt-in (a stats sort/filter, or the explicit toggle below), never automatic.
  const needsCareerStats = sortOrFilterNeedsStats || wantsCareerData
  const careerQuery = useDriverCareerIndex(needsCareerStats, (done, total) => setProgress({ done, total }))
  const careerIndex = careerQuery.data?.index
  const failedYears = careerQuery.data?.failedYears ?? []

  // The flat /drivers archive always includes driverId — this just satisfies the type
  // (the standings-embedded shape reuses RawDriver with driverId optional).
  const allDrivers = useMemo<IdentifiedDriver[]>(
    () => (driversQuery.data ?? []).filter((d): d is IdentifiedDriver => !!d.driverId),
    [driversQuery.data],
  )

  const countryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const d of allDrivers) {
      const c = d.nationality ?? d.country
      if (c) set.add(c)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [allDrivers])

  const teamOptions = useMemo(() => {
    if (!careerIndex) return []
    const byId = new Map<string, string>()
    for (const stats of Object.values(careerIndex)) {
      for (const t of stats.teams) byId.set(t.teamId, t.teamName)
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [careerIndex])

  function statsFor(driverId: string): DriverCareerStats | undefined {
    return careerIndex?.[driverId]
  }

  const filteredSorted = useMemo(() => {
    let list = allDrivers

    if (country) {
      list = list.filter((d) => (d.nationality ?? d.country) === country)
    }
    if (team && careerIndex) {
      list = list.filter((d) => statsFor(d.driverId)?.teams.some((t) => t.teamId === team))
    }

    const sorted = [...list]
    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name))
        break
      case 'championships':
        sorted.sort((a, b) => (statsFor(b.driverId)?.championships ?? -1) - (statsFor(a.driverId)?.championships ?? -1))
        break
      case 'wins':
        sorted.sort((a, b) => (statsFor(b.driverId)?.wins ?? -1) - (statsFor(a.driverId)?.wins ?? -1))
        break
      case 'firstYear':
        sorted.sort((a, b) => (statsFor(a.driverId)?.firstYear ?? Infinity) - (statsFor(b.driverId)?.firstYear ?? Infinity))
        break
      case 'lastYear':
        sorted.sort((a, b) => (statsFor(b.driverId)?.lastYear ?? -Infinity) - (statsFor(a.driverId)?.lastYear ?? -Infinity))
        break
    }
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDrivers, country, team, careerIndex, sortBy])

  const pageItems = filteredSorted.slice(offset, offset + PAGE_SIZE)

  function updateAndReset<T>(setter: (v: T) => void, value: T) {
    setter(value)
    setOffset(0)
  }

  const isLoadingBase = driversQuery.isLoading
  const isLoadingStats = careerQuery.isLoading
  const blockedOnStats = sortOrFilterNeedsStats && !careerIndex
  const ready = !isLoadingBase && !blockedOnStats

  const selectClass = 'border border-hairline bg-panel px-2 py-1.5 text-readout'

  const gridRef = useRevealOnScroll<HTMLUListElement>(
    { enabled: ready, selector: '[data-driver-tile]', distance: 10, staggerMs: 16 },
    [offset, sortBy, country, team, ready],
  )

  useStatusStrip(ready ? `${filteredSorted.length} ${t('driversPage.resultCount')}` : null)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="display-wide font-display text-4xl font-extrabold uppercase tracking-tight text-readout">
          {t('nav.drivers')}
        </h1>
        <Link to="/search" className="font-data text-sm text-dim hover:text-accent">
          {t('nav.search')} →
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 font-data text-sm">
        <label className="flex items-center gap-2">
          <span className="text-dim">{t('driversPage.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => updateAndReset(setSortBy, e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="alphabetical">{t('driversPage.alphabetical')}</option>
            <option value="championships">{t('driversPage.championships')}</option>
            <option value="wins">{t('driversPage.wins')}</option>
            <option value="firstYear">{t('driversPage.firstYear')}</option>
            <option value="lastYear">{t('driversPage.lastYear')}</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-dim">{t('driversPage.countryFilter')}</span>
          <select value={country} onChange={(e) => updateAndReset(setCountry, e.target.value)} className={selectClass}>
            <option value="">{t('driversPage.allCountries')}</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-dim">{t('driversPage.teamFilter')}</span>
          <select value={team} onChange={(e) => updateAndReset(setTeam, e.target.value)} className={selectClass}>
            <option value="">{t('driversPage.allTeams')}</option>
            {teamOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {!needsCareerStats && (
          <button
            type="button"
            onClick={() => setWantsCareerData(true)}
            className="border border-hairline px-2 py-1.5 text-dim hover:border-accent hover:text-readout"
          >
            {t('driversPage.loadLastTeam')}
          </button>
        )}
      </div>

      {isLoadingBase && <p className="mt-6 font-data text-sm text-dim">{t('driversPage.loadingArchive')}</p>}
      {!isLoadingBase && isLoadingStats && (
        <div className="mt-6">
          <p className="font-data text-sm text-dim">
            {t('driversPage.loadingCareerStats')}
            {progress ? ` (${progress.done}/${progress.total})` : ''}
          </p>
          <div className="mt-2 h-1 w-full max-w-xs border border-hairline">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {ready && failedYears.length > 0 && (
        <p className="mt-6 font-data text-xs text-rosso">
          {t('driversPage.someSeasonsFailed').replace('{n}', String(failedYears.length))}{' '}
          <button type="button" onClick={() => careerQuery.refetch()} className="underline hover:text-readout">
            {t('driversPage.retry')}
          </button>
        </p>
      )}

      {ready && (
        <>
          <p className="mt-6 font-data text-xs text-dim">
            {filteredSorted.length} {t('driversPage.resultCount')}
          </p>
          <ul ref={gridRef} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((d) => {
              const lastTeam = statsFor(d.driverId)?.lastTeamName
              return (
                <li key={d.driverId} data-driver-tile>
                  <Link
                    to={`/drivers/${d.driverId}`}
                    className="flex items-center gap-3 border border-hairline bg-panel p-3 transition-colors hover:border-accent"
                  >
                    <DriverMonogram shortName={d.shortName} surname={d.surname} wikipediaUrl={d.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-readout">
                        {d.name} {d.surname}
                      </span>
                      {lastTeam && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-dim">
                          <TeamBar teamId={statsFor(d.driverId)?.lastTeamId} teamName={lastTeam} className="h-3" />
                          <span className="truncate">{lastTeam}</span>
                        </span>
                      )}
                    </span>
                    <CountryFlag country={d.nationality ?? d.country} />
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pagination offset={offset} limit={PAGE_SIZE} itemCount={pageItems.length} onOffsetChange={setOffset} />
        </>
      )}
    </div>
  )
}
