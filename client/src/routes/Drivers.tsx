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

  const selectClass = 'border border-graphite bg-carbon px-2 py-1.5 text-chalk'

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-chalk">
          {t('nav.drivers')}
        </h1>
        <Link to="/search" className="font-data text-sm text-smoke hover:text-kerb">
          {t('nav.search')} →
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 font-data text-sm">
        <label className="flex items-center gap-2">
          <span className="text-smoke">{t('driversPage.sortBy')}</span>
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
          <span className="text-smoke">{t('driversPage.countryFilter')}</span>
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
          <span className="text-smoke">{t('driversPage.teamFilter')}</span>
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
            className="border border-graphite px-2 py-1.5 text-smoke hover:border-kerb hover:text-chalk"
          >
            {t('driversPage.loadLastTeam')}
          </button>
        )}
      </div>

      {isLoadingBase && <p className="mt-6 font-data text-sm text-smoke">{t('driversPage.loadingArchive')}</p>}
      {!isLoadingBase && isLoadingStats && (
        <div className="mt-6">
          <p className="font-data text-sm text-smoke">
            {t('driversPage.loadingCareerStats')}
            {progress ? ` (${progress.done}/${progress.total})` : ''}
          </p>
          <div className="mt-2 h-1 w-full max-w-xs border border-graphite">
            <div
              className="h-full bg-kerb transition-[width]"
              style={{ width: progress ? `${(100 * progress.done) / progress.total}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {ready && failedYears.length > 0 && (
        <p className="mt-6 font-data text-xs text-kerb">
          {t('driversPage.someSeasonsFailed').replace('{n}', String(failedYears.length))}{' '}
          <button type="button" onClick={() => careerQuery.refetch()} className="underline hover:text-chalk">
            {t('driversPage.retry')}
          </button>
        </p>
      )}

      {ready && (
        <>
          <p className="mt-6 font-data text-xs text-smoke">
            {filteredSorted.length} {t('driversPage.resultCount')}
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((d) => {
              const lastTeam = statsFor(d.driverId)?.lastTeamName
              return (
                <li key={d.driverId}>
                  <Link
                    to={`/drivers/${d.driverId}`}
                    className="flex items-center gap-3 border border-graphite bg-carbon p-3 transition-colors hover:border-kerb"
                  >
                    <DriverMonogram shortName={d.shortName} surname={d.surname} wikipediaUrl={d.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-chalk">
                        {d.name} {d.surname}
                      </span>
                      {lastTeam && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke">
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
