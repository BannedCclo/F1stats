import { useI18n } from '@/i18n/useI18n'

interface PaginationProps {
  offset: number
  limit: number
  itemCount: number
  onOffsetChange: (offset: number) => void
}

/**
 * The API's `total` field is the page size, not the dataset size — the only
 * reliable "is there more" signal is whether this page came back full.
 */
export default function Pagination({ offset, limit, itemCount, onOffsetChange }: PaginationProps) {
  const { t } = useI18n()
  const page = Math.floor(offset / limit) + 1
  const hasPrevious = offset > 0
  const hasNext = itemCount === limit

  return (
    <div className="flex items-center justify-between gap-4 py-4 font-data text-sm">
      <button
        type="button"
        disabled={!hasPrevious}
        onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        className="border border-hairline bg-panel px-3 py-1.5 uppercase tracking-wide text-dim transition-colors hover:enabled:border-accent hover:enabled:text-readout disabled:opacity-30"
      >
        {t('pagination.previous')}
      </button>
      <span className="tabular-nums text-dim">
        {t('pagination.page')} {page}
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onOffsetChange(offset + limit)}
        className="border border-hairline bg-panel px-3 py-1.5 uppercase tracking-wide text-dim transition-colors hover:enabled:border-accent hover:enabled:text-readout disabled:opacity-30"
      >
        {t('pagination.next')}
      </button>
    </div>
  )
}
