import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { prefersReducedMotion } from './reducedMotion'

/**
 * Global smooth-scroll wrapper. Lenis drives its own rAF loop (autoRaf) and
 * dispatches native scroll events, so IntersectionObserver-based reveals
 * (useRevealOnScroll, useScrollDraw, useCountUp) keep working untouched.
 * Skipped entirely under reduced-motion — no Lenis instance is even created,
 * so scroll behaves natively.
 */
export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)),
      autoRaf: true,
    })

    return () => {
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
