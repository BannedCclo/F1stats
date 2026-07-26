import { useSeasons } from '@/api/queries'
import { useI18n } from '@/i18n/useI18n'

interface SeasonJumpProps {
  year: number
  onSelect: (year: number) => void
}

/**
 * Jumps straight to any season instead of stepping one year at a time —
 * going from the current season back to 1950 one prev-link click at a time
 * takes ~76 clicks.
 */
export default function SeasonJump({ year, onSelect }: SeasonJumpProps) {
  const { t } = useI18n()
  const { data } = useSeasons(100, 0)
  const years = [...new Set((data?.championships ?? []).map((c) => c.year))].sort((a, b) => b - a)

  return (
    <select
      aria-label={t('season.jumpToSeason')}
      value={years.includes(year) ? year : ''}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="border border-hairline bg-panel px-2 py-1 font-data text-sm text-readout hover:border-accent"
    >
      {!years.includes(year) && <option value={year}>{year}</option>}
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}
