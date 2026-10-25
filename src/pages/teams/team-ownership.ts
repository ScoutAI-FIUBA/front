import type { Team } from '@/types'

export const OWN_TEAM_BADGE = 'Mi equipo'

export type OwnFilter = 'own' | 'rivals' | 'all'

/** Own teams first; the relative order inside each group is kept. */
export function sortTeamsOwnFirst<T extends Pick<Team, 'isOwn'>>(teams: T[]): T[] {
  return [...teams.filter((team) => team.isOwn), ...teams.filter((team) => !team.isOwn)]
}

/** `own` only when at least one team is marked as own, so the list is never empty by default. */
export function defaultOwnFilter(teams: Pick<Team, 'isOwn'>[]): OwnFilter {
  return teams.some((team) => team.isOwn) ? 'own' : 'all'
}

export function filterTeamsByOwnership<T extends Pick<Team, 'isOwn'>>(teams: T[], filter: OwnFilter): T[] {
  if (filter === 'own') return teams.filter((team) => team.isOwn)
  if (filter === 'rivals') return teams.filter((team) => !team.isOwn)
  return teams
}
