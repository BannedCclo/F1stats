import { useEffect } from 'react'

/**
 * Dresses the page in a team's livery. Deliberately not an anime hook: both
 * custom properties are registered in index.css via @property, so a plain CSS
 * transition on :root does the actual color interpolation natively — no
 * per-frame JS, and no way for a stuck tween to leave the wrong page wearing
 * the wrong colors. This hook only ever calls setProperty and restores the
 * previous value on cleanup, so leaving a route always hands the accent back
 * cleanly to whatever the next one sets (or the readout default).
 *
 * `accent` is optional on purpose: pass undefined/null for "no entity to
 * dress the page as" (e.g. a standings table with ten liveries visible at
 * once) and the accent falls back to --color-readout via the CSS default.
 */
export function useThemeAccent(accent: string | null | undefined, contrast: string | null | undefined) {
  useEffect(() => {
    const root = document.documentElement
    const prevAccent = root.style.getPropertyValue('--accent')
    const prevContrast = root.style.getPropertyValue('--accent-contrast')

    if (accent) {
      root.style.setProperty('--accent', accent)
    }
    if (contrast) {
      root.style.setProperty('--accent-contrast', contrast)
    }

    return () => {
      if (prevAccent) {
        root.style.setProperty('--accent', prevAccent)
      } else {
        root.style.removeProperty('--accent')
      }
      if (prevContrast) {
        root.style.setProperty('--accent-contrast', prevContrast)
      } else {
        root.style.removeProperty('--accent-contrast')
      }
    }
  }, [accent, contrast])
}
