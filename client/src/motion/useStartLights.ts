import { useEffect, useRef, useState, type RefObject } from 'react'
import { createTimeline } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'

const SESSION_KEY = 'f1stats-start-lights-seen'
const LIGHT_SELECTOR = '[data-light]'
const LIGHT_STEP = 220

interface UseStartLightsResult {
  /** Whether the overlay should render at all this session. */
  visible: boolean
  /** Attach to the container holding the five `[data-light]` elements. */
  root: RefObject<HTMLDivElement | null>
}

/**
 * Five red lights, in sequence, then out — the one loading moment F1 owns
 * more than any other, so it's the one loading moment this app spends on.
 *
 * Runs once per browser session (sessionStorage), skips entirely under
 * reduced motion, and is abortable by any key press or click. Callers must
 * start their own data queries immediately regardless of `visible` — the
 * overlay never gates or delays a fetch, it only covers the page while one
 * that was already in flight finishes.
 */
export function useStartLights(onDone: () => void): UseStartLightsResult {
  const root = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    if (prefersReducedMotion()) return false
    return !window.sessionStorage.getItem(SESSION_KEY)
  })

  useEffect(() => {
    if (!visible) return

    window.sessionStorage.setItem(SESSION_KEY, '1')

    const el = root.current
    if (!el) return

    const finish = () => {
      setVisible(false)
      onDone()
    }

    const lights = Array.from(el.querySelectorAll<HTMLElement>(LIGHT_SELECTOR))
    const tl = createTimeline({ onComplete: finish })

    lights.forEach((light, i) => {
      tl.add(light, { opacity: [0, 1], duration: 120, ease: 'outQuad' }, i * LIGHT_STEP)
    })
    tl.add(lights, { opacity: 0, duration: 160, ease: 'outQuad' }, '+=180')

    const skip = () => tl.complete()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)

    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      tl.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return { visible, root }
}
