import { useEffect, useRef, type RefObject } from 'react'
import { animate } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { DURATION, EASE } from './motionTokens'

interface TypeWidthOptions {
  from?: number
  to?: number
  duration?: number
  delay?: number
}

/**
 * Tweens the Archivo Variable width axis (--display-wdth) so a heading opens
 * up on entrance, compressed to full width, like a car passing at speed.
 *
 * Restricted by design to one heading per route: a width-axis tween reflows
 * text every frame, the most expensive thing in this app's motion layer, so
 * it never runs on scroll (entrance only) and never on text that's also been
 * through useSplitReveal — per-character layout on top of a live width tween
 * compounds both costs at once.
 */
export function useTypeWidth<T extends HTMLElement>(
  { from = 70, to = 118, duration = DURATION.slow, delay = 0 }: TypeWidthOptions = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      el.style.setProperty('--display-wdth', `${to}%`)
      return
    }

    el.style.setProperty('--display-wdth', `${from}%`)
    const animation = animate(el, {
      '--display-wdth': [`${from}%`, `${to}%`],
      duration,
      delay,
      ease: EASE.decelerate,
    })

    return () => {
      animation.revert()
      el.style.setProperty('--display-wdth', `${to}%`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}
