import { useEffect, useRef, type RefObject } from 'react'
import { createAnimatable, utils } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'

interface MagneticOptions {
  /** Max offset in px at the element's edge. */
  strength?: number
  /** Damp factor — higher tracks the cursor more tightly. */
  factor?: number
}

/**
 * Subtle cursor attraction, restricted by design to the header brand mark —
 * the one place on an otherwise data-dense timing screen where a purely
 * decorative flourish doesn't compete with :focus-visible or a keyboard
 * user's expectations. Pointer-only, with no keyboard equivalent; that's
 * exactly why this isn't offered as a general primitive for controls.
 */
export function useMagnetic<T extends HTMLElement>(
  { strength = 10, factor = 0.3 }: MagneticOptions = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    if (window.matchMedia('(pointer: coarse)').matches) return

    const animatable = createAnimatable(el, { x: 0, y: 0 })
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let lastT = performance.now()
    let raf = 0

    const tick = () => {
      const now = performance.now()
      const dt = now - lastT
      lastT = now
      currentX = utils.damp(currentX, targetX, dt, factor)
      currentY = utils.damp(currentY, targetY, dt, factor)
      animatable.x(currentX)
      animatable.y(currentY)
      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      targetX = ((e.clientX - (rect.left + rect.width / 2)) / rect.width) * strength
      targetY = ((e.clientY - (rect.top + rect.height / 2)) / rect.height) * strength
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      animatable.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strength, factor])

  return ref
}
