import { useLayoutEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { animate } from 'animejs'
import { useI18n } from '@/i18n/useI18n'
import { useTheme } from '@/theme/useTheme'
import { prefersReducedMotion } from '@/motion/reducedMotion'
import { useMagnetic } from '@/motion/useMagnetic'
import { DURATION, EASE } from '@/motion/motionTokens'
import clsx from 'clsx'
import HeaderSearch from './HeaderSearch'
import StartLights from './StartLights'
import RouteTransition from './RouteTransition'
import { StatusStripProvider } from './StatusStrip'

const NAV_ITEMS = [
  { to: '/', key: 'nav.home' as const, end: true },
  { to: '/seasons', key: 'nav.seasons' as const, end: false },
  { to: '/standings/drivers', key: 'nav.standings' as const, end: false },
  { to: '/drivers', key: 'nav.drivers' as const, end: false },
  { to: '/teams', key: 'nav.teams' as const, end: false },
  { to: '/circuits', key: 'nav.circuits' as const, end: false },
]

export default function Layout() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const brandRef = useMagnetic<HTMLAnchorElement>({ strength: 6 })

  // The active nav item used to be signalled by colour alone. Slide an accent
  // rule under it instead. NavLink already sets aria-current="page", so the
  // indicator is driven by the same semantics screen readers use rather than
  // a parallel flag.
  useLayoutEffect(() => {
    const nav = navRef.current
    const marker = markerRef.current
    if (!nav || !marker) return

    const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (!active) {
      marker.style.opacity = '0'
      return
    }

    const left = active.offsetLeft
    const width = active.offsetWidth

    if (prefersReducedMotion()) {
      marker.style.opacity = '1'
      marker.style.width = `${width}px`
      marker.style.transform = `translateX(${left}px)`
      return
    }

    animate(marker, { width, translateX: left, opacity: 1, duration: DURATION.base, ease: EASE.standard })
  }, [location.pathname])

  return (
    <div className="flex min-h-full flex-col">
      <div className="grid-field" aria-hidden="true" />

      <StartLights onDone={() => {}} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:font-display focus:text-accent-contrast"
      >
        {t('nav.skipToContent')}
      </a>

      <header className="sticky top-0 z-40 border-b border-hairline bg-carbon/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:grid sm:grid-cols-[auto_1fr_auto] sm:px-6">
          <NavLink
            ref={brandRef}
            to="/"
            className="display-wide flex shrink-0 items-center gap-2 font-display text-xl font-extrabold uppercase tracking-tight text-readout"
          >
            <span className="h-3 w-3 bg-rosso" aria-hidden="true" />
            {t('brand.name')}
          </NavLink>

          <div className="order-3 w-full sm:order-none sm:w-full">
            <HeaderSearch />
          </div>

          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-none sm:ml-0">
            <div
              role="group"
              aria-label={t('theme.label')}
              className="flex shrink-0 overflow-hidden border border-hairline font-data text-xs"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                aria-label={t('theme.light')}
                title={t('theme.light')}
                className={clsx('px-2 py-1', theme === 'light' ? 'bg-accent text-accent-contrast' : 'text-dim hover:text-readout')}
              >
                ☀
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                aria-label={t('theme.dark')}
                title={t('theme.dark')}
                className={clsx('px-2 py-1', theme === 'dark' ? 'bg-accent text-accent-contrast' : 'text-dim hover:text-readout')}
              >
                🌙
              </button>
            </div>

            <div
              role="group"
              aria-label={t('language.label')}
              className="flex shrink-0 overflow-hidden border border-hairline font-data text-xs"
            >
              <button
                type="button"
                onClick={() => setLocale('pt-BR')}
                aria-pressed={locale === 'pt-BR'}
                className={clsx('px-2 py-1', locale === 'pt-BR' ? 'bg-accent text-accent-contrast' : 'text-dim hover:text-readout')}
              >
                {t('language.pt')}
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                aria-pressed={locale === 'en'}
                className={clsx('px-2 py-1', locale === 'en' ? 'bg-accent text-accent-contrast' : 'text-dim hover:text-readout')}
              >
                {t('language.en')}
              </button>
            </div>
          </div>
        </div>

        <nav
          ref={navRef}
          aria-label={t('nav.primary')}
          className="relative mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto border-t border-hairline px-4 sm:px-6"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'shrink-0 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors',
                  isActive ? 'text-readout' : 'text-dim hover:text-readout',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
          <span
            ref={markerRef}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-accent opacity-0"
          />
        </nav>
      </header>

      <StatusStripProvider>
        <main id="main" className="relative z-10 flex-1 pb-14">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>

        <footer className="relative z-10 border-t border-hairline px-4 py-6 text-center font-data text-xs text-dim sm:px-6">
          <p>{t('brand.tagline')} · Data via f1api.dev</p>
          <p className="mt-1">
            Circuit outlines by{' '}
            <a
              href="https://github.com/julesr0y/f1-circuits-svg"
              target="_blank"
              rel="noreferrer"
              className="hover:text-accent"
            >
              julesr0y/f1-circuits-svg
            </a>
            , licensed{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-accent"
            >
              CC BY 4.0
            </a>
          </p>
          <p className="mt-1">
            Driver photos via{' '}
            <a href="https://www.wikipedia.org/" target="_blank" rel="noreferrer" className="hover:text-accent">
              Wikipedia
            </a>
            — see each driver's Wikipedia page for the photographer credit and license
          </p>
          <p className="mt-1">
            Flags by{' '}
            <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer" className="hover:text-accent">
              lipis/flag-icons
            </a>
            , licensed MIT
          </p>
        </footer>
      </StatusStripProvider>
    </div>
  )
}
