import { useEffect, useRef, useState, type RefObject } from 'react'
import { animate, utils } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { EASE } from './motionTokens'

/**
 * Counts up from 0 to `target` once the element scrolls into view. Fires once.
 *
 * Animates a plain JS object rather than the DOM so React stays the only thing
 * writing to the element; `modifier` rounds each frame to a whole number. The
 * trigger is an IntersectionObserver — anime's onScroll scrubs progress against
 * scroll position, which is wrong for a value that should count once and settle.
 */
export function useCountUp(target: number, duration = 900): [RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }

    const el = ref.current
    if (!el) return

    const counter = { n: 0 }
    const animation = animate(counter, {
      n: target,
      duration,
      ease: EASE.decelerate,
      modifier: utils.round(0),
      onUpdate: () => setValue(counter.n),
      autoplay: false,
    })

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        animation.play()
        observer.disconnect()
      },
      { threshold: 0.4 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      animation.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return [ref, value]
}
