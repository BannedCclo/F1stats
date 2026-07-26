import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n/useI18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-4 px-6 py-32 text-center">
      <span
        aria-hidden="true"
        className="h-10 w-16 border border-hairline"
        style={{
          backgroundImage:
            'repeating-conic-gradient(var(--color-readout) 0% 25%, var(--color-carbon) 0% 50%)',
          backgroundSize: '10px 10px',
        }}
      />
      <p className="mt-2 font-data text-sm text-rosso emissive">404</p>
      <h1 className="display-wide font-display text-4xl font-extrabold uppercase tracking-tight text-readout">
        {t('notFound.title')}
      </h1>
      <p className="max-w-md text-dim">{t('notFound.body')}</p>
      <p className="font-data text-xs uppercase tracking-widest text-dim">{t('notFound.radio')}</p>
      <Link
        to="/"
        className="mt-4 border border-rosso px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-rosso hover:bg-rosso hover:text-carbon"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  )
}
