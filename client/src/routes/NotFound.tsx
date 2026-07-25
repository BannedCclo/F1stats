import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/useI18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-32 text-center">
      <p className="font-data text-sm text-kerb">404</p>
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight">
        {t('notFound.title')}
      </h1>
      <p className="max-w-md text-smoke">{t('notFound.body')}</p>
      <Link
        to="/"
        className="mt-4 border border-kerb px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-kerb hover:bg-kerb hover:text-chalk"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  )
}
