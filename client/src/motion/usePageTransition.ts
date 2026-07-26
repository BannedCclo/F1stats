import { useLayoutEffect, useRef, type RefObject } from 'react'
import { createTimeline } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { DURATION, EASE } from './motionTokens'

/**
 * Plays a one-shot enter animation on the route shell whenever `key` (the
 * router pathname) changes. Enter-only by design: react-router's flat
 * <Routes> swaps children synchronously on unmount, so there's no window for
 * a real exit animation without holding the previous location in state and
 * fighting scroll restoration for it. Targets the shell wrapper the caller
 * attaches this ref to, never the data region inside it, so it never plays
 * against a loading skeleton.
 */
export function usePageTransition<T extends HTMLElement>(key: string): RefObject<T | null> {
  const root = useRef<T | null>(null)
  const mounted = useRef(false)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return

    // Skip the very first paint - first load is either the start-lights
    // sequence or an instant render; this hook only owns later transitions.
    if (!mounted.current) {
      mounted.current = true
      return
    }

    if (prefersReducedMotion()) return

    const tl = createTimeline({ defaults: { ease: EASE.decelerate } })
    tl.add(el, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: DURATION.page,
    })

    return () => {
      tl.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return root
}
