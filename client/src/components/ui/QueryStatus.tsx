import { useEffect, useState, type ReactNode } from 'react'
import { NotYetAvailableError } from '@/api/client'
import { useI18n } from '@/i18n/useI18n'
import Skeleton from './Skeleton'

interface QueryStatusProps {
  isLoading: boolean
  error: unknown
  isEmpty?: boolean
  skeletonRows?: number
  children: ReactNode
}

const SLOW_NOTICE_DELAY_MS = 2500

/** Surfaces a "this is the data source, not the app" hint once a load has been running a while. */
function useSlowNotice(isLoading: boolean): boolean {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setSlow(false)
      return
    }
    const id = setTimeout(() => setSlow(true), SLOW_NOTICE_DELAY_MS)
    return () => clearTimeout(id)
  }, [isLoading])

  return slow
}

/**
 * Centralizes the loading/error/empty states every data-driven route needs.
 * A 404 on a not-yet-happened session (NotYetAvailableError) is rendered as
 * an expected empty state, never as an error. Loads past ~2.5s get an extra
 * hint — the F1 data API commonly takes several seconds per request, and
 * without an explanation that reads as the app being broken rather than
 * waiting on a slow third party.
 */
export default function QueryStatus({ isLoading, error, isEmpty, skeletonRows = 6, children }: QueryStatusProps) {
  const { t } = useI18n()
  const slow = useSlowNotice(isLoading)

  if (isLoading) {
    return (
      <div>
        <Skeleton rows={skeletonRows} />
        {slow && <p className="mt-3 text-center font-data text-xs text-smoke">{t('status.slowNotice')}</p>}
      </div>
    )
  }

  if (error instanceof NotYetAvailableError) {
    return <p className="px-3 py-8 text-center text-sm text-smoke">{t('status.futureRound')}</p>
  }

  if (error) {
    return <p className="px-3 py-8 text-center text-sm text-kerb">{t('status.error')}</p>
  }

  if (isEmpty) {
    return <p className="px-3 py-8 text-center text-sm text-smoke">{t('status.empty')}</p>
  }

  return <>{children}</>
}
