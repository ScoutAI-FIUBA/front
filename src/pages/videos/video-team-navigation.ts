export const VIDEO_TEAM_QUERY_PARAM = 'team_id'
export const ALL_VIDEO_TEAMS_FILTER = 'all'

export function teamVideosPath(teamId: string): string {
  return `/videos?${VIDEO_TEAM_QUERY_PARAM}=${encodeURIComponent(teamId)}`
}

export function resolveVideoTeamFilter(
  searchParams: URLSearchParams,
  teams: ReadonlyArray<{ id: string }>,
): string {
  const requestedTeamId = searchParams.get(VIDEO_TEAM_QUERY_PARAM)
  if (!requestedTeamId) return ALL_VIDEO_TEAMS_FILTER
  return teams.some((team) => team.id === requestedTeamId)
    ? requestedTeamId
    : ALL_VIDEO_TEAMS_FILTER
}

export function withVideoTeamFilter(
  searchParams: URLSearchParams,
  teamFilter: string,
): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams)
  if (teamFilter === ALL_VIDEO_TEAMS_FILTER) {
    nextSearchParams.delete(VIDEO_TEAM_QUERY_PARAM)
  } else {
    nextSearchParams.set(VIDEO_TEAM_QUERY_PARAM, teamFilter)
  }
  return nextSearchParams
}
