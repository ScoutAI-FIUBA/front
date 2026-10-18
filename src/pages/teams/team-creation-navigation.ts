import type { CreateTeamDto } from '@/services/contracts/teams.service'
import type { Team } from '@/types'
import { NEW_MATCH_PATH, newMatchPath } from '../videos/video-upload-navigation.ts'

export const TEAM_CREATION_RETURN_QUERY_PARAM = 'return_to'

export function teamsPathForNewMatch(): string {
  const params = new URLSearchParams({
    [TEAM_CREATION_RETURN_QUERY_PARAM]: NEW_MATCH_PATH,
  })
  return `/equipos?${params.toString()}`
}

export function teamCreationReturnPath(
  requestedReturn: string | null,
  createdTeamId: string,
): string | null {
  if (requestedReturn !== NEW_MATCH_PATH) return null
  return newMatchPath({ teamId: createdTeamId })
}

export async function createTeamWithNavigationContext({
  values,
  requestedReturn,
  createTeam,
}: {
  values: CreateTeamDto
  requestedReturn: string | null
  createTeam: (values: CreateTeamDto) => Promise<Team>
}): Promise<{ team: Team; returnPath: string | null }> {
  const team = await createTeam(values)
  return {
    team,
    returnPath: teamCreationReturnPath(requestedReturn, team.id),
  }
}
