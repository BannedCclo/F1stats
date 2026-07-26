import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/useI18n'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

/** Debounces input locally so callers only see settled query strings — avoids hammering the search endpoints per keystroke. */
export default function SearchField({ value, onChange, autoFocus }: SearchFieldProps) {
  const { t } = useI18n()
  const [local, setLocal] = useState(value)

  useEffect(() => setLocal(value), [value])

  useEffect(() => {
    const id = setTimeout(() => {
      if (local !== value) onChange(local)
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  return (
    <input
      type="search"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={t('search.placeholder')}
      autoFocus={autoFocus}
      className="w-full border border-hairline bg-panel px-4 py-3 font-body text-readout placeholder:text-dim focus:border-accent"
    />
  )
}
