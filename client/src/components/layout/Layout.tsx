import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '@/i18n/useI18n'
import clsx from 'clsx'
import HeaderSearch from './HeaderSearch'

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

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-kerb focus:px-4 focus:py-2 focus:font-display focus:text-chalk"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-graphite bg-asphalt/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold tracking-tight text-chalk"
          >
            <span className="h-3 w-3 bg-kerb" aria-hidden="true" />
            {t('brand.name')}
          </NavLink>

          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <HeaderSearch />
          </div>

          <div
            role="group"
            aria-label={t('language.label')}
            className="order-2 ml-auto flex shrink-0 overflow-hidden border border-graphite font-data text-xs sm:order-3 sm:ml-0"
          >
            <button
              type="button"
              onClick={() => setLocale('pt-BR')}
              aria-pressed={locale === 'pt-BR'}
              className={clsx(
                'px-2 py-1',
                locale === 'pt-BR' ? 'bg-kerb text-chalk' : 'text-smoke hover:text-chalk',
              )}
            >
              {t('language.pt')}
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              aria-pressed={locale === 'en'}
              className={clsx(
                'px-2 py-1',
                locale === 'en' ? 'bg-kerb text-chalk' : 'text-smoke hover:text-chalk',
              )}
            >
              {t('language.en')}
            </button>
          </div>
        </div>

        <nav
          aria-label={t('nav.home')}
          className="flex items-center gap-1 overflow-x-auto border-t border-graphite px-4 sm:px-6"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'shrink-0 px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition-colors',
                  isActive ? 'text-kerb' : 'text-smoke hover:text-chalk',
                )
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-graphite px-4 py-6 text-center font-data text-xs text-smoke sm:px-6">
        <p>{t('brand.tagline')} · Data via f1api.dev</p>
        <p className="mt-1">
          Circuit outlines by{' '}
          <a
            href="https://github.com/julesr0y/f1-circuits-svg"
            target="_blank"
            rel="noreferrer"
            className="hover:text-kerb"
          >
            julesr0y/f1-circuits-svg
          </a>
          , licensed{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-kerb"
          >
            CC BY 4.0
          </a>
        </p>
        <p className="mt-1">
          Driver photos via{' '}
          <a href="https://www.wikipedia.org/" target="_blank" rel="noreferrer" className="hover:text-kerb">
            Wikipedia
          </a>
          — see each driver's Wikipedia page for the photographer credit and license
        </p>
        <p className="mt-1">
          Flags by{' '}
          <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer" className="hover:text-kerb">
            lipis/flag-icons
          </a>
          , licensed MIT
        </p>
      </footer>
    </div>
  )
}
