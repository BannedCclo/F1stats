import { countryToISO2 } from '@/domain/countries'

interface CountryFlagProps {
  country: string | null | undefined
  className?: string
}

/**
 * Real flag artwork (vendored SVGs, see public/flags and the footer credit)
 * — not Unicode emoji. Regional-indicator flag emoji rely on OS/browser
 * font support that's inconsistent (notably patchy on Windows Chrome), so
 * this renders identically everywhere instead of silently disappearing.
 */
export default function CountryFlag({ country, className }: CountryFlagProps) {
  const iso2 = countryToISO2(country)

  if (!iso2) {
    return (
      <span
        role="img"
        aria-label={country ?? undefined}
        title={country ?? undefined}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center font-data text-[7px] text-dim ${className ?? ''}`}
      >
        {country ? country.slice(0, 2).toUpperCase() : '—'}
      </span>
    )
  }

  return (
    <img
      src={`/flags/${iso2.toLowerCase()}.svg`}
      alt={country ?? ''}
      title={country ?? undefined}
      loading="lazy"
      className={`inline-block h-3 w-4 shrink-0 object-cover ${className ?? ''}`}
    />
  )
}
