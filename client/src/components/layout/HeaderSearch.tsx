import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { animate } from 'animejs'
import { useCircuitSearch, useDriverSearch, useTeamSearch } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { prefersReducedMotion } from '@/motion/reducedMotion'
import { DURATION, EASE } from '@/motion/motionTokens'
import DriverMonogram from '@/components/identity/DriverMonogram'
import TeamBar from '@/components/identity/TeamBar'
import CircuitTrace from '@/components/circuit/CircuitTrace'

const MAX_PER_GROUP = 4

/**
 * A command palette rather than a persistent field: opened by clicking the
 * trigger, pressing ⌘K/Ctrl+K from anywhere, closed by Escape or a backdrop
 * click. Search itself is unchanged — debounced locally, three parallel
 * queries, grouped results — only the shell around it changed.
 */
export default function HeaderSearch() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const id = setTimeout(() => setQuery(input), 250)
    return () => clearTimeout(id)
  }, [input])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      if (!prefersReducedMotion() && panelRef.current) {
        animate(panelRef.current, {
          opacity: [0, 1],
          scale: [0.96, 1],
          duration: DURATION.fast,
          ease: EASE.decelerate,
        })
      }
    } else {
      triggerRef.current?.focus()
      setInput('')
      setQuery('')
    }
  }, [open])

  const active = query.trim().length > 0
  const driversQuery = useDriverSearch(active ? query : '')
  const teamsQuery = useTeamSearch(active ? query : '')
  const circuitsQuery = useCircuitSearch(active ? query : '')

  const drivers = (driversQuery.data?.drivers ?? []).slice(0, MAX_PER_GROUP)
  const teams = (teamsQuery.data?.teams ?? []).slice(0, MAX_PER_GROUP)
  const circuits = (circuitsQuery.data?.circuits ?? []).slice(0, MAX_PER_GROUP)
  const hasResults = drivers.length > 0 || teams.length > 0 || circuits.length > 0

  function goToFullSearch() {
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('nav.search')}
        className="flex w-full items-center justify-between gap-3 border border-hairline bg-panel px-3 py-2 font-body text-sm text-dim transition-colors hover:border-accent sm:max-w-xl"
      >
        <span>{t('search.placeholder')}</span>
        <kbd className="hidden shrink-0 border border-hairline px-1.5 py-0.5 font-data text-[.6875rem] text-dim sm:inline">
          {t('search.paletteHint').replace('Press ', '').replace('Pressione ', '')}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-carbon/80 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.search')}
            className="w-full max-w-lg border border-hairline bg-panel shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            <input
              ref={inputRef}
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && active) goToFullSearch()
              }}
              placeholder={t('search.placeholder')}
              aria-label={t('nav.search')}
              aria-expanded={active}
              role="combobox"
              aria-controls="header-search-results"
              aria-haspopup="listbox"
              className="w-full border-b border-hairline bg-transparent px-4 py-3 font-body text-readout placeholder:text-dim focus:outline-none"
            />

            {active && (
              <div id="header-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto">
                {!hasResults && <p className="px-4 py-4 text-center text-sm text-dim">{t('search.noResults')}</p>}

                {drivers.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-dim">
                      {t('search.drivers')}
                    </p>
                    {drivers.map((d) => (
                      <Link
                        key={d.driverId}
                        to={`/drivers/${d.driverId}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-bezel"
                      >
                        <DriverMonogram shortName={d.shortName} surname={d.surname} wikipediaUrl={d.url} size="sm" />
                        <span className="text-sm text-readout">
                          {d.name} {d.surname}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {teams.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-dim">
                      {t('search.teams')}
                    </p>
                    {teams.map((team) => (
                      <Link
                        key={team.teamId}
                        to={`/teams/${team.teamId}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-bezel"
                      >
                        <TeamBar teamId={team.teamId} teamName={team.teamName} />
                        <span className="text-sm text-readout">{team.teamName}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {circuits.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 font-display text-xs font-bold uppercase tracking-wide text-dim">
                      {t('search.circuits')}
                    </p>
                    {circuits.map((c) => (
                      <Link
                        key={c.circuitId}
                        to={`/circuits/${c.circuitId}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-bezel"
                      >
                        <CircuitTrace
                          circuitId={c.circuitId}
                          corners={c.corners ?? c.numberOfCorners}
                          svg={c.svg}
                          className="h-8 w-8 shrink-0"
                          color="var(--color-dim)"
                        />
                        <span className="text-sm text-readout">{c.circuitName}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {hasResults && (
                  <button
                    type="button"
                    onClick={goToFullSearch}
                    className="block w-full border-t border-hairline px-3 py-2.5 text-center font-data text-xs uppercase tracking-wide text-dim hover:text-accent"
                  >
                    {t('nav.search')} →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
