interface KerbDividerProps {
  className?: string
}

/** Signature section divider — the red/white kerb zebra, the one motif borrowed straight off the track surface. */
export default function KerbDivider({ className }: KerbDividerProps) {
  return <div aria-hidden="true" className={`kerb-zebra h-1.5 w-full ${className ?? ''}`} />
}
