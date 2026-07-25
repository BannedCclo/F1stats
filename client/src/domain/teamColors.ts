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
