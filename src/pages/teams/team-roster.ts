import type { Player } from '@/types'

export function playersWithJersey(
  roster: Player[],
  jerseyNumber: string,
  excludePlayerId?: string,
): Player[] {
  if (!jerseyNumber) return []
  return roster.filter(
    (player) => player.id !== excludePlayerId && player.jerseyNumber === jerseyNumber,
  )
}

export function duplicateJerseyNumbers(roster: Player[]): Set<string> {
  const counts = new Map<string, number>()
  roster.forEach((player) => {
    if (!player.jerseyNumber) return
    counts.set(player.jerseyNumber, (counts.get(player.jerseyNumber) ?? 0) + 1)
  })
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([jersey]) => jersey),
  )
}

export function filterRosterPlayers(players: Player[], query: string): Player[] {
  const normalized = query.trim().toLocaleLowerCase('es')
  if (!normalized) return players
  return players.filter((player) => {
    const haystack = `${player.firstName} ${player.lastName} ${player.jerseyNumber ?? ''}`
      .toLocaleLowerCase('es')
    return haystack.includes(normalized)
  })
}
