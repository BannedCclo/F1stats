import { useCountUp } from '@/motion/useCountUp'

interface CountUpStatProps {
  value: number
  className?: string
}

/** Counts up to `value` once scrolled into view — used for headline stats like championship totals. */
export default function CountUpStat({ value, className }: CountUpStatProps) {
  const [ref, displayed] = useCountUp(value)
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {displayed}
    </span>
  )
}
