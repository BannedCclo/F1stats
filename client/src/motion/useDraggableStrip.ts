import { useEffect, useRef, type RefObject } from 'react'
import { animate, type JSAnimation } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { EASE } from './motionTokens'

const DRAG_THRESHOLD_PX = 6

/**
 * Adds click-and-drag scrolling to a horizontal strip, for the one input its
 * native overflow-x-auto doesn't already serve: a mouse. Touch swipe,
 * trackpad, shift+wheel, and keyboard focus on the strip's children all work
 * today through plain browser scrolling and are left completely alone — this
 * only listens for pointerType "mouse", so touch never gets a second,
 * competing scroll handler fighting the one it already has.
 *
 * Deliberately does not use createDraggable: that drives a target's transform
 * directly, which would fight the container's own scrollLeft rather than
 * complement it. Instead this drags scrollLeft itself, and on release hands
 * off to a short decelerating anime tween for a bit of momentum — the same
 * "animate a plain value, mirror it onto the DOM" technique useCountUp
 * already uses elsewhere in this codebase.
 *
 * Pointer capture is deliberately withheld until the pointer has actually
 * moved past a small threshold. Capturing on the bare pointerdown — before
 * knowing whether this is a click or a drag — retargets the browser's
 * synthesized click event away from whatever child (a card, a Link) the
 * pointerdown started on, so every plain click on the strip's children
 * silently stops navigating. A real drag past the threshold still suppresses
 * the trailing click (via a one-shot capture-phase listener), so dragging
 * across a card never also fires its link.
 */
export function useDraggableStrip<T extends HTMLElement>(): RefObject<T | null> {
  const root = useRef<T | null>(null)

  useEffect(() => {
    const el = root.current
    if (!el || prefersReducedMotion()) return

    let pointerId: number | null = null
    let dragging = false
    let didDrag = false
    let startX = 0
    let startScroll = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let momentum: JSAnimation | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      momentum?.revert()
      pointerId = e.pointerId
      dragging = false
      didDrag = false
      startX = e.clientX
      startScroll = el.scrollLeft
      lastX = e.clientX
      lastT = performance.now()
      velocity = 0
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      const dx = e.clientX - startX

      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
        dragging = true
        didDrag = true
        el.style.cursor = 'grabbing'
        el.setPointerCapture(pointerId)
      }

      const now = performance.now()
      const dt = Math.max(1, now - lastT)
      velocity = (e.clientX - lastX) / dt
      lastX = e.clientX
      lastT = now
      el.scrollLeft = startScroll - dx
    }

    const endDrag = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return
      const wasDragging = dragging
      pointerId = null
      dragging = false

      if (!wasDragging) return

      el.style.cursor = ''
      el.releasePointerCapture(e.pointerId)

      const max = el.scrollWidth - el.clientWidth
      const proxy = { x: el.scrollLeft }
      const to = Math.min(max, Math.max(0, el.scrollLeft - velocity * 220))

      momentum = animate(proxy, {
        x: to,
        duration: 500,
        ease: EASE.standard,
        onUpdate: () => {
          el.scrollLeft = proxy.x
        },
      })
    }

    // A drag that passed over a link/card must not also fire its click.
    // Capture-phase so this runs before the target's own click handler.
    const suppressClickAfterDrag = (e: MouseEvent) => {
      if (!didDrag) return
      didDrag = false
      e.preventDefault()
      e.stopPropagation()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('click', suppressClickAfterDrag, true)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('click', suppressClickAfterDrag, true)
      el.style.cursor = ''
      momentum?.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return root
}
