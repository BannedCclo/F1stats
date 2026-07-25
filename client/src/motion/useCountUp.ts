import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from './reducedMotion'

/** Counts up from 0 to `target` once the element scrolls into view. Fires once. */
export function useCountUp(target: number, duration = 900): [RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement | null>(null)
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0)
  const played = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || played.current) return
        played.current = true

        const start = performance.now()
        function tick(now: number) {
          const progress = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
        observer.disconnect()
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return [ref, value]
}
