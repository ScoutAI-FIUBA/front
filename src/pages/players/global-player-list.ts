import type { Player } from '@/types'

export const UNASSIGNED_TEAM_FILTER = 'unassigned'

const collator = new Intl.Collator('es', { sensitivity: 'base' })

export function sortGlobalPlayers(players: Player[]): Player[] {
  return [...players].sort((left, right) => (
    collator.compare(left.lastName, right.lastName)
    || collator.compare(left.firstName, right.firstName)
    || collator.compare(left.id, right.id)
  ))
}

export function filterGlobalPlayers(
  players: Player[],
  search: string,
  teamFilter: string,
): Player[] {
  const query = search.trim().toLocaleLowerCase('es')

  return players.filter((player) => {
    const matchesSearch = !query || (
      `${player.firstName} ${player.lastName} ${player.jerseyNumber ?? ''}`
        .toLocaleLowerCase('es')
        .includes(query)
    )
    const matchesTeam = teamFilter === 'all'
      || (teamFilter === UNASSIGNED_TEAM_FILTER ? !player.teamId : player.teamId === teamFilter)

    return matchesSearch && matchesTeam
  })
}
