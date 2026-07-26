import { useState } from 'react'
import { teamColor } from '@/domain/teamColors'
import { driverCode } from '@/domain/format'
import { useDriverPhoto } from '@/api/wikipedia'

interface DriverMonogramProps {
  shortName?: string | null
  surname: string
  teamId?: string | null
  /** The driver's Wikipedia URL (the F1 API's `driver.url`) — used to look up a real headshot. */
  wikipediaUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
} as const

/**
 * Driver headshot when Wikipedia has one for this driver, otherwise a
 * team-colored monogram — the F1 API itself supplies no images, only a
 * Wikipedia link, and not every driver (especially historical ones) has
 * an infobox photo there.
 */
export default function DriverMonogram({
  shortName,
  surname,
  teamId,
  wikipediaUrl,
  size = 'md',
  className,
}: DriverMonogramProps) {
  const color = teamColor(teamId)
  const code = driverCode(shortName, surname)
  const { data: photoUrl } = useDriverPhoto(wikipediaUrl)
  const [photoFailed, setPhotoFailed] = useState(false)

  if (photoUrl && !photoFailed) {
    return (
      <img
        src={photoUrl}
        alt={surname}
        loading="lazy"
        onError={() => setPhotoFailed(true)}
        className={`shrink-0 border object-cover ${SIZES[size]} ${className ?? ''}`}
        style={{ borderColor: color }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border font-display font-extrabold tracking-wide text-readout ${SIZES[size]} ${className ?? ''}`}
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 26%, var(--color-panel))` }}
    >
      {code}
    </span>
  )
}
