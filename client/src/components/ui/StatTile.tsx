import clsx from 'clsx'
import CountUpStat from './CountUpStat'

interface StatTileProps {
  label: string
  value: number
  animate?: boolean
  emphasis?: boolean
  className?: string
}

/** A labelled number in a panel bezel — championships, wins, podiums. The headline read-out of the whole system. */
export default function StatTile({ label, value, animate = true, emphasis, className }: StatTileProps) {
  return (
    <div className={clsx('border border-hairline bg-panel px-4 py-3', className)}>
      <p className="font-data text-[.6875rem] uppercase tracking-[.18em] text-dim">{label}</p>
      <p
        className={clsx(
          'mt-1 font-data text-3xl font-medium tabular-nums text-readout',
          emphasis && 'text-accent emissive',
        )}
      >
        {animate ? <CountUpStat value={value} /> : value}
      </p>
    </div>
  )
}
