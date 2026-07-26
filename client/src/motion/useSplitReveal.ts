import { useEffect, useRef, type RefObject } from 'react'
import { splitText, animate, stagger } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'
import { DURATION, STAGGER, EASE } from './motionTokens'

interface SplitRevealOptions {
  by?: 'chars' | 'words'
  delay?: number
}

/**
 * Reveals a heading by character or word on mount.
 *
 * Always splits with accessible: true, which keeps the original text in the
 * accessibility tree and marks the per-fragment spans aria-hidden — a screen
 * reader hears the heading once, not once per character.
 *
 * Only call this on text that's stable for the life of the mount: splitText
 * rewrites the node's innerHTML, so if React re-renders it afterwards the
 * two trees diverge silently. Anything that changes with locale (nearly
 * everything here does) must be keyed by locale at the call site so the
 * locale toggle remounts the component instead of mutating it in place.
 */
export function useSplitReveal<T extends HTMLElement>(
  { by = 'chars', delay = 0 }: SplitRevealOptions = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) return

    const split = splitText(el, {
      chars: by === 'chars',
      words: by === 'words',
      accessible: true,
    })
    const targets = by === 'chars' ? split.chars : split.words

    const animation = animate(targets, {
      translateY: ['100%', '0%'],
      opacity: [0, 1],
      duration: DURATION.base,
      delay: stagger(STAGGER.tight, { start: delay }),
      ease: EASE.emphasized,
    })

    return () => {
      animation.revert()
      split.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [by, delay])

  return ref
}
