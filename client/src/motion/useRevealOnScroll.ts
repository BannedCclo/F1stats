import { useEffect, useRef, type RefObject, type DependencyList } from 'react'
import { animate, stagger, type JSAnimation } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { DURATION, EASE, STAGGER } from './motionTokens'

interface RevealOptions {
  /** Selector for the children to stagger in. Defaults to direct data-reveal nodes. */
  selector?: string
  staggerMs?: number
  from?: 'first' | 'last' | 'center'
  distance?: number
  duration?: number
  threshold?: number
  /**
   * Gate the observer entirely — pass `!isLoading` from the caller. Without
   * this, the observer attaches to skeleton rows at mount, fires once they're
   * on screen, and disconnects; the real rows that replace them after the
   * query resolves never get a reveal at all.
   */
  enabled?: boolean
}

const DEFAULT_SELECTOR = '[data-reveal]'

/**
 * Staggers a section's children in as the section scrolls into view. Built on
 * IntersectionObserver, not anime's onScroll — onScroll in scrubbed mode
 * previously left an SVG path stuck part-drawn when it was already on screen
 * at load (see useScrollDraw), and this app's policy since is to keep
 * scroll-triggered reveals on the observer that's never misbehaved.
 */
export function useRevealOnScroll<T extends HTMLElement>(
  options: RevealOptions = {},
  deps: DependencyList = [],
): RefObject<T | null> {
  const root = useRef<T | null>(null)
  const {
    selector = DEFAULT_SELECTOR,
    staggerMs = STAGGER.base,
    from = 'first',
    distance = 16,
    duration = DURATION.reveal,
    threshold = 0.15,
    enabled = true,
  } = options

  useEffect(() => {
    const el = root.current
    if (!el || !enabled) return

    if (prefersReducedMotion()) return

    const targets = el.matches(selector) ? [el] : Array.from(el.querySelectorAll<HTMLElement>(selector))
    if (targets.length === 0) return

    targets.forEach((t) => {
      t.style.opacity = '0'
      t.style.transform = `translateY(${distance}px)`
    })

    let animation: JSAnimation | null = null

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        animation = animate(targets, {
          opacity: [0, 1],
          translateY: [distance, 0],
          duration,
          delay: stagger(staggerMs, { from }),
          ease: EASE.standard,
        })
        observer.disconnect()
      },
      { threshold },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      animation?.revert()
      targets.forEach((t) => {
        t.style.opacity = ''
        t.style.transform = ''
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selector, staggerMs, from, distance, duration, threshold, ...deps])

  return root
}
