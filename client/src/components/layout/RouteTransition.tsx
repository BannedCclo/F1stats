import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { usePageTransition } from '@/motion/usePageTransition'

interface RouteTransitionProps {
  children: ReactNode
}

/**
 * Wraps <Outlet/> and plays an enter animation on the shell whenever the
 * route changes. See usePageTransition for why this is enter-only.
 */
export default function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation()
  const root = usePageTransition<HTMLDivElement>(location.pathname)

  return <div ref={root}>{children}</div>
}
