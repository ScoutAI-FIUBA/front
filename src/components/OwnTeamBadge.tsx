import { OWN_TEAM_BADGE } from '@/pages/teams/team-ownership'
import { cn } from '@/lib/utils'

export function OwnTeamBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border border-[#FF6A1F]/30 bg-[#FF6A1F]/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-[#FF6A1F]',
        className,
      )}
    >
      {OWN_TEAM_BADGE}
    </span>
  )
}

/** Team name followed by the badge when the team is the user's own. */
export function TeamNameWithBadge({ team }: { team: { name: string; isOwn: boolean } }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{team.name}</span>
      {team.isOwn && <OwnTeamBadge />}
    </span>
  )
}
