import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './reducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Draws an SVG path in as it scrolls into view (stroke-dashoffset from full
 * length to 0). Under reduced-motion the path is just left fully drawn —
 * no ScrollTrigger is created at all.
 */
export function useScrollDraw(ref: RefObject<SVGPathElement | null>, options?: { start?: string }) {
  useEffect(() => {
    const path = ref.current
    if (!path) return

    if (prefersReducedMotion()) {
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
      return
    }

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const tween = gsap.to(path, {
      strokeDashoffset: 0,
      ease: 'power2.out',
      duration: 1.4,
      scrollTrigger: {
        trigger: path,
        start: options?.start ?? 'top 85%',
        toggleActions: 'play none none reverse',
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current])
}
