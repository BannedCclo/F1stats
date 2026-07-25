import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Global smooth-scroll wrapper, driven by GSAP's ticker so Lenis and
 * ScrollTrigger (used by useScrollDraw) stay in sync. Skipped entirely
 * under reduced-motion — native scroll behaves normally, no Lenis instance
 * is even created, and ScrollTrigger-based reveals fall back to instant.
 */
export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)),
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
