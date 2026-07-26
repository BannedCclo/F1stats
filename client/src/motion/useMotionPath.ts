import { useEffect, type RefObject } from 'react'
import { animate, createMotionPath } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'

interface MotionPathOptions {
  duration?: number
  loop?: boolean
}

/**
 * Sends a dot around a circuit trace using the path's own geometry
 * (createMotionPath reads translateX/translateY/rotate off the path itself)
 * rather than a hand-rolled cx/cy tween.
 *
 * Must run after the path has real SVG layout — call from a useLayoutEffect
 * in the caller, after the path ref is attached and painted. Calling this
 * before the path has been measured yields NaN transforms.
 */
export function useMotionPath(
  pathRef: RefObject<SVGPathElement | null>,
  dotRef: RefObject<SVGElement | null>,
  { duration = 6000, loop = true }: MotionPathOptions = {},
) {
  useEffect(() => {
    const path = pathRef.current
    const dot = dotRef.current
    if (!path || !dot || prefersReducedMotion()) return

    const animation = animate(dot, {
      ...createMotionPath(path),
      duration,
      loop,
      ease: 'linear',
    })

    return () => {
      animation.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathRef.current, dotRef.current, duration, loop])
}
