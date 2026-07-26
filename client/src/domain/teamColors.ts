/**
 * Curated colors for teams from the last ~15 seasons (teamId -> hex).
 * Anything outside this map — the archive goes back to 1950 — falls back to
 * a deterministic hash color so no team ever renders colorless.
 */
const TEAM_COLORS: Record<string, string> = {
  mercedes: '#27F4D2',
  ferrari: '#E8002D',
  mclaren: '#FF8000',
  red_bull: '#3671C6',
  alpine: '#00A1E8',
  rb: '#6C98FF',
  haas: '#B6BABD',
  williams: '#00A0DE',
  audi: '#00FF87',
  aston_martin: '#00665E',
  cadillac: '#8C1E28',

  // Recent past constructors, kept for historical result pages
  sauber: '#52C832',
  alfa: '#900000',
  alphatauri: '#2B4562',
  toro_rosso: '#469BFF',
  renault: '#FFF500',
  racing_point: '#F596C8',
  force_india: '#F596C8',
  lotus_f1: '#FFB800',
  manor: '#6E0000',
  marussia: '#6E0000',
  caterham: '#0A5E12',
  hrt: '#B2945C',
  brawn: '#B8FF3C',
  toyota: '#D4001F',
  bmw_sauber: '#2222FF',
  honda: '#DFDFDF',
  jordan: '#F5C900',
  minardi: '#000000',
}

/** Small hash so unmapped historical teams still get a stable, distinct color. */
function fallbackColor(teamId: string): string {
  let hash = 0
  for (let i = 0; i < teamId.length; i++) {
    hash = (hash << 5) - hash + teamId.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 70% 55%)`
}

export function teamColor(teamId: string | null | undefined): string {
  if (!teamId) return '#8A8A93'
  return TEAM_COLORS[teamId] ?? fallbackColor(teamId)
}

function parseToHsl(color: string): { h: number; s: number; l: number } {
  const hslMatch = color.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/)
  if (hslMatch) {
    return { h: Number(hslMatch[1]), s: Number(hslMatch[2]), l: Number(hslMatch[3]) }
  }

  const hex = color.replace('#', '')
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex
  const int = parseInt(full, 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
  }

  return { h, s: s * 100, l: l * 100 }
}

/**
 * A team's raw livery colour, clamped for use as the page-wide --accent.
 * Real liveries include values that break on a near-black surface: minardi's
 * #000000 would vanish, honda's #DFDFDF would glare. Lightness is clamped to
 * a visible band and saturation is floored so grayscale liveries (haas,
 * williams-era silvers) still read as a colour, not a shade of the
 * background. Contrast text is computed from the clamped lightness, not
 * assumed, so the accent is always legible either way it's used.
 */
export function teamAccent(teamId: string | null | undefined): { accent: string; contrast: string } {
  const raw = teamColor(teamId)
  const { h, s, l } = parseToHsl(raw)
  const clampedL = Math.min(78, Math.max(38, l))
  const clampedS = Math.max(s, 35)
  return {
    accent: `hsl(${h} ${clampedS}% ${clampedL}%)`,
    contrast: clampedL > 55 ? '#0a0d11' : '#eaf0f6',
  }
}
