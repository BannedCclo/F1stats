import { useEffect, useRef, type DependencyList } from 'react'
import { createScope, type Scope } from 'animejs'
import { prefersReducedMotion } from './reducedMotion'

/**
 * Runs anime.js work scoped to a root element. createScope keeps selectors
 * local to the component and reverts every animation it created on cleanup,
 * which is what makes React StrictMode's double-mount safe. Under reduced
 * motion the setup never runs at all, so elements keep their static styles.
 */
export function useAnimeScope<T extends HTMLElement>(setup: () => void, deps: DependencyList = []) {
  const root = useRef<T>(null)

  useEffect(() => {
    if (!root.current || prefersReducedMotion()) return

    const scope: Scope = createScope({ root: root.current }).add(setup)
    return () => {
      scope.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return root
}
