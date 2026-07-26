import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useSeasons, useDriversChampionship } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'
import { driverStandingToTimingItem } from '@/domain/adapters'
import TimingTower from '@/components/timing/TimingTower'
import QueryStatus from '@/components/ui/QueryStatus'
import { useDraggableStrip } from '@/motion/useDraggableStrip'
import { useRevealOnScroll } from '@/motion/useRevealOnScroll'
import { useTypeWidth } from '@/motion/useTypeWidth'
import { prefersReducedMotion } from '@/motion/reducedMotion'
import { useStatusStrip } from '@/components/layout/useStatusStrip'

const CURRENT_YEAR = new Date().getFullYear()
const decadeOf = (year: number) => Math.floor(year / 10) * 10

/**
 * A compact year strip for browsing, not the page's content — clicking a
 * year features it below rather than navigating away immediately. The
 * standings panel is what makes this page worth landing on; "view season
 * details" is the one link that goes where every tile used to go directly
 * (the season's race calendar).
 */
export default function Seasons() {
  const { t } = useI18n()
  const query = useSeasons(100, 0)
  const sorted = [...(query.data?.championships ?? [])].sort((a, b) => b.year - a.year)

  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const activeYear = selectedYear ?? sorted[0]?.year ?? CURRENT_YEAR

  const standingsQuery = useDriversChampionship(activeYear)
  const standingsItems = (standingsQuery.data?.drivers_championship ?? []).map(driverStandingToTimingItem)

  const titleRef = useTypeWidth<HTMLHeadingElement>()
  const stripRef = useDraggableStrip<HTMLDivElement>()
  const revealRef = useRevealOnScroll<HTMLDivElement>(
    { enabled: !query.isLoading, selector: '[data-season-tile]', from: 'last', staggerMs: 12, distance: 8 },
    [sorted.length],
  )
  useStatusStrip(`${activeYear} · ${standingsItems.length}`)

  // Read via a ref inside the keydown handler so the listener can be attached
  // once (empty deps) instead of re-subscribing every time `sorted` — a new
  // array by reference on every render — changes.
  const sortedRef = useRef(sorted)
  sortedRef.current = sorted

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return

      e.preventDefault()
      const list = sortedRef.current
      const delta = e.key === 'ArrowRight' ? 1 : -1

      setSelectedYear((prev) => {
        const current = prev ?? list[0]?.year
        const idx = list.findIndex((c) => c.year === current)
        if (idx === -1) return current ?? null
        const nextIdx = Math.min(list.length - 1, Math.max(0, idx + delta))
        return list[nextIdx]?.year ?? current
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Keep the featured tile in view whenever it changes, whether by click or arrow key.
  useEffect(() => {
    const container = stripRef.current
    const tile = container?.querySelector<HTMLElement>(`[data-year="${activeYear}"]`)
    tile?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear])

  return (
    <div className="py-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <h1
          ref={titleRef}
          className="display-wide font-display text-4xl font-extrabold uppercase tracking-tight text-readout"
        >
          {t('nav.seasons')}
        </h1>
        <p className="mt-2 font-data text-xs uppercase tracking-widest text-dim">{t('season.dragHint')}</p>
      </div>

      <QueryStatus isLoading={query.isLoading} error={query.error} isEmpty={sorted.length === 0} skeletonRows={4}>
        <div
          ref={(el) => {
            stripRef.current = el
            revealRef.current = el
          }}
          className="scroll-fade-x mt-6 flex items-end gap-2 overflow-x-auto px-4 pb-3 sm:px-6"
          style={{ scrollbarColor: 'var(--color-hairline) transparent' }}
        >
          {sorted.map((c, i) => {
            const isNewDecade = i === 0 || decadeOf(sorted[i - 1].year) !== decadeOf(c.year)
            const isSelected = c.year === activeYear

            return (
              <div key={c.championshipId} className="flex shrink-0 flex-col items-center gap-1.5">
                <p className="h-3.5 font-data text-[.625rem] uppercase tracking-[.16em] text-dim">
                  {isNewDecade ? `${decadeOf(c.year)}s` : ''}
                </p>
                <button
                  type="button"
                  data-season-tile
                  data-year={c.year}
                  onClick={() => setSelectedYear(c.year)}
                  aria-pressed={isSelected}
                  className={clsx(
                    'flex flex-col items-center justify-center border px-3 py-2.5 font-data text-sm tabular-nums transition-all',
                    isSelected
                      ? 'scale-110 border-accent bg-bezel text-accent emissive'
                      : 'border-hairline bg-panel text-dim hover:border-accent hover:text-readout',
                  )}
                >
                  {c.year}
                </button>
              </div>
            )
          })}
        </div>
      </QueryStatus>

      <div className="mx-auto mt-10 max-w-[1600px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold uppercase tracking-tight text-readout">
            {t('home.driversStandings')} · <span className="text-accent">{activeYear}</span>
          </h2>
          <Link
            to={`/seasons/${activeYear}`}
            className="inline-block shrink-0 border border-accent px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-accent-contrast"
          >
            {t('season.viewDetails')} →
          </Link>
        </div>

        <div className="mt-4">
          <QueryStatus
            isLoading={standingsQuery.isLoading}
            error={standingsQuery.error}
            isEmpty={standingsItems.length === 0}
            skeletonRows={12}
          >
            <TimingTower items={standingsItems} />
          </QueryStatus>
        </div>
      </div>
    </div>
  )
}
