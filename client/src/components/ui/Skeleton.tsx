interface SkeletonProps {
  className?: string
  rows?: number
}

/** Loading placeholder — a dimmed kerb zebra on panel bezels, so even the wait states carry the track motif. */
export default function Skeleton({ className, rows = 1 }: SkeletonProps) {
  return (
    <div className="flex flex-col gap-1" role="status" aria-label="loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`kerb-zebra-loading h-10 w-full border border-hairline bg-panel opacity-[0.1] ${className ?? ''}`}
        />
      ))}
    </div>
  )
}
