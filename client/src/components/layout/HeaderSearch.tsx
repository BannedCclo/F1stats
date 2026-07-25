import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCircuitSearch, useDriverSearch, useTeamSearch } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import DriverMonogram from '@/components/identity/DriverMonogram'
import TeamBar from '@/components/identity/TeamBar'
import CircuitTrace from '@/components/circuit/CircuitTrace'

const MAX_PER_GROUP = 4

/**
 * Persistent header search — always visible, not tucked behind a route.
 * Debounces locally, shows a live results dropdown, closes on Escape,
 * outside click, or picking a result.
 */
export default function HeaderSearch() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 250)
    return () => clearTimeout(id)
  }, [input])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const active = query.trim().length > 0

  const driversQuery = useDriverSearch(active ? query : '')
  const teamsQuery = useTeamSearch(active ? query : '')
  const circuitsQuery = useCircuitSearch(active ? query : '')

  const drivers = (driversQuery.data?.drivers ?? []).slice(0, MAX_PER_GROUP)
  const teams = (teamsQuery.data?.teams ?? []).slice(0, MAX_PER_GROUP)
  const circuits = (circuitsQuery.data?.circuits ?? []).slice(0, MAX_PER_GROUP)
  const hasResults = drivers.length > 0 || teams.length > 0 || circuits.length > 0

  function closeAndReset() {
    setOpen(false)
    setInput('')
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Enter' && active) {
            navigate(`/search?q=${encodeURIComponent(query)}`)
            closeAndReset()
          }
        }}
        placeholder={t('search.placeholder')}
        aria-label={t('nav.search')}
        aria-expanded={open && active}
        role="combobox"
        aria-controls="header-search-results"
        aria-haspopup="listbox"
        className="w-full border border-graphite bg-carbon px-3 py-2 font-body text-sm text-chalk placeholder:text-smoke focus:border-kerb"
      />

      {open && active && (
        <div
          id="header-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto border border-graphite bg-carbon shadow-lg"
        >
          {!hasResults && (
            <p className="px-4 py-4 text-center text-sm text-smoke">{t('search.noResults')}</p>
          )}

          {drivers.length > 0 && (
            <div>
              <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-smoke">
                {t('search.drivers')}
              </p>
              {drivers.map((d) => (
                <Link
                  key={d.driverId}
                  to={`/drivers/${d.driverId}`}
                  onClick={closeAndReset}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-graphite/40"
                >
                  <DriverMonogram shortName={d.shortName} surname={d.surname} wikipediaUrl={d.url} size="sm" />
                  <span className="text-sm text-chalk">
                    {d.name} {d.surname}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {teams.length > 0 && (
            <div>
              <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-smoke">
                {t('search.teams')}
              </p>
              {teams.map((team) => (
                <Link
                  key={team.teamId}
                  to={`/teams/${team.teamId}`}
                  onClick={closeAndReset}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-graphite/40"
                >
                  <TeamBar teamId={team.teamId} teamName={team.teamName} />
                  <span className="text-sm text-chalk">{team.teamName}</span>
                </Link>
              ))}
            </div>
          )}

          {circuits.length > 0 && (
            <div>
              <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-smoke">
                {t('search.circuits')}
              </p>
              {circuits.map((c) => (
                <Link
                  key={c.circuitId}
                  to={`/circuits/${c.circuitId}`}
                  onClick={closeAndReset}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-graphite/40"
                >
                  <CircuitTrace
                    circuitId={c.circuitId}
                    corners={c.corners ?? c.numberOfCorners}
                    className="h-8 w-8 shrink-0"
                    color="var(--color-smoke)"
                  />
                  <span className="text-sm text-chalk">{c.circuitName}</span>
                </Link>
              ))}
            </div>
          )}

          {hasResults && (
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              onClick={closeAndReset}
              className="block border-t border-graphite px-3 py-2.5 text-center font-data text-xs uppercase tracking-wide text-smoke hover:text-kerb"
            >
              {t('nav.search')} →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
