import type { ReactNode } from 'react'
import { useRevealOnScroll } from '@/motion/useRevealOnScroll'

interface RevealProps {
  children: ReactNode
  className?: string
  enabled?: boolean
  selector?: string
}

/**
 * Thin wrapper around useRevealOnScroll for sections that don't need the
 * hook's extra knobs directly. Without a `selector`, the wrapper reveals as
 * one block — it carries `data-reveal` itself, which is the hook's default
 * selector. Pass `selector` to stagger specific children instead.
 */
export default function Reveal({ children, className, enabled = true, selector }: RevealProps) {
  const ref = useRevealOnScroll<HTMLDivElement>({ enabled, selector })
  return (
    <div ref={ref} data-reveal className={className}>
      {children}
    </div>
  )
}
