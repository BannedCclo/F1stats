import { teamColor } from '@/domain/teamColors'

interface TeamBarProps {
  teamId: string | null | undefined
  teamName?: string
  className?: string
}

/** The team-color bar reused everywhere a row needs to signal constructor identity. */
export default function TeamBar({ teamId, teamName, className }: TeamBarProps) {
  return (
    <span
      aria-hidden="true"
      title={teamName}
      className={`inline-block h-4 w-1.5 shrink-0 ${className ?? ''}`}
      style={{ backgroundColor: teamColor(teamId) }}
    />
  )
}
