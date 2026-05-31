import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IPlayerService } from '../contracts/players.service'

export const mockPlayerService: IPlayerService = {
  async list() {
    await simulateNetwork()
    return getStore().players
  },

  async getById(id) {
    await simulateNetwork()
    return getStore().players.find((p) => p.id === id) ?? null
  },

  async create(dto) {
    await simulateNetwork()
    const player = {
      id: generateId('player'),
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: dto.birthDate,
      primaryPosition: dto.primaryPosition,
      jerseyNumber: dto.jerseyNumber,
      heightCm: dto.heightCm,
      weightKg: dto.weightKg,
      teamId: dto.teamId ?? null,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
    }
    updateStore((s) => {
      s.players.push(player)
      if (dto.teamId) {
        s.memberships.push({
          id: generateId('mem'),
          teamId: dto.teamId,
          playerId: player.id,
          joinedAt: new Date().toISOString(),
        })
      }
      s.activities.unshift({
        id: generateId('act'),
        type: 'player',
        title: 'Nuevo registro de jugador',
        detail: `Jugador: ${player.firstName} ${player.lastName}`,
        timestamp: new Date().toISOString(),
      })
    })
    return player
  },

  async update(id, dto) {
    await simulateNetwork()
    const updated = updateStore((s) => {
      const player = s.players.find((p) => p.id === id)
      if (!player) return
      player.firstName = dto.firstName
      player.lastName = dto.lastName
      player.birthDate = dto.birthDate
      player.primaryPosition = dto.primaryPosition
      player.jerseyNumber = dto.jerseyNumber
      player.heightCm = dto.heightCm
      player.weightKg = dto.weightKg
    })
    const player = updated.players.find((p) => p.id === id)
    if (!player) throw new Error('Player not found')
    return player
  },

  async delete(id) {
    await simulateNetwork()
    updateStore((s) => {
      s.players = s.players.filter((p) => p.id !== id)
      s.memberships = s.memberships.filter((m) => m.playerId !== id)
    })
  },

  async filterByTeam(teamId) {
    await simulateNetwork()
    const store = getStore()
    const playerIds = store.memberships
      .filter((m) => m.teamId === teamId && !m.leftAt)
      .map((m) => m.playerId)
    return store.players.filter((p) => playerIds.includes(p.id))
  },

  async getTeamName(playerId) {
    await simulateNetwork(150)
    const store = getStore()
    const player = store.players.find((p) => p.id === playerId)
    const teamId =
      player?.teamId ??
      store.memberships.find((m) => m.playerId === playerId && !m.leftAt)?.teamId
    if (!teamId) return null
    return store.teams.find((t) => t.id === teamId)?.name ?? null
  },
}
