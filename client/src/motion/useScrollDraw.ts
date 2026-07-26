import { useEffect, type RefObject } from 'react'
import { animate } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'

/**
 * Draws an SVG path in as it scrolls into view.
 *
 * Drives stroke-dashoffset directly rather than going through anime's
 * createDrawable helper, which did not reliably run to completion here. The
 * circuit outline is the one thing on the page that must never render broken,
 * so this stays boring on purpose.
 *
 * The trigger is a plain IntersectionObserver rather than anime's onScroll,
 * which ties playback progress to scroll position and leaves the path stuck
 * part-drawn when it's already on screen at load. Pinning is separately
 * off-limits — it once caused an app-wide scroll lockup in this SPA.
 *
 * Under reduced motion nothing is set up, so the path renders fully drawn.
 */
export function useScrollDraw(ref: RefObject<SVGPathElement | null>) {
  useEffect(() => {
    const path = ref.current
    if (!path || prefersReducedMotion()) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const animation = animate(path, {
      strokeDashoffset: [length, 0],
      ease: 'outQuad',
      duration: 1400,
      autoplay: false,
      onComplete: () => {
        // Drop the dash entirely once drawn, so no stale offset can survive a
        // resize or a re-render and leave the outline clipped.
        path.style.strokeDasharray = ''
        path.style.strokeDashoffset = ''
      },
    })

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        animation.play()
        observer.disconnect()
      },
      { threshold: 0.15 },
    )
    observer.observe(path)

    return () => {
      observer.disconnect()
      animation.revert()
      // revert() restores anime's starting value; clear outright so the path
      // is never left hidden behind a stale dash offset.
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current])
}
