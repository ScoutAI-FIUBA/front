import type { CreateTeamDto } from '@/services/contracts/teams.service'
import type { Team } from '@/types'
import { VIDEO_UPLOAD_PATH, videoUploadPath } from '../videos/video-upload-navigation.ts'

export const TEAM_CREATION_RETURN_QUERY_PARAM = 'return_to'

export function teamsPathForVideoUpload(): string {
  const params = new URLSearchParams({
    [TEAM_CREATION_RETURN_QUERY_PARAM]: VIDEO_UPLOAD_PATH,
  })
  return `/equipos?${params.toString()}`
}

/** @deprecated Use teamsPathForVideoUpload. */
export const teamsPathForNewMatch = teamsPathForVideoUpload

export function teamCreationReturnPath(
  requestedReturn: string | null,
  createdTeamId: string,
): string | null {
  if (requestedReturn !== VIDEO_UPLOAD_PATH) return null
  return videoUploadPath({ teamId: createdTeamId })
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
