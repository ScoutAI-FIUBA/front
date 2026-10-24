import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { Player } from '@/types'
import type { IPlayerService, TeamRosterResult } from '../contracts/players.service'

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
      birthDate: dto.birthDate ?? null,
      primaryPosition: dto.primaryPosition ?? null,
      jerseyNumber: dto.jerseyNumber,
      heightCm: dto.heightCm ?? null,
      weightKg: dto.weightKg ?? null,
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
      player.birthDate = dto.birthDate ?? null
      player.primaryPosition = dto.primaryPosition ?? null
      player.jerseyNumber = dto.jerseyNumber
      player.heightCm = dto.heightCm ?? null
      player.weightKg = dto.weightKg ?? null
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

  async createTeamRoster(teamId, inputs) {
    await simulateNetwork()
    const created: Player[] = []
    const skipped: TeamRosterResult['skipped'] = []
    updateStore((s) => {
      const taken = new Set(
        s.players.filter((p) => p.teamId === teamId && p.jerseyNumber).map((p) => p.jerseyNumber),
      )
      for (const input of inputs) {
        if (taken.has(input.jerseyNumber)) {
          skipped.push({ jerseyNumber: input.jerseyNumber, reason: 'jersey_taken' })
          continue
        }
        taken.add(input.jerseyNumber)
        const player: Player = {
          id: generateId('player'),
          firstName: input.firstName,
          lastName: input.lastName,
          birthDate: null,
          primaryPosition: null,
          jerseyNumber: input.jerseyNumber,
          heightCm: null,
          weightKg: null,
          teamId,
          createdAt: new Date().toISOString(),
          status: 'pending',
        }
        s.players.push(player)
        s.memberships.push({
          id: generateId('mem'),
          teamId,
          playerId: player.id,
          joinedAt: new Date().toISOString(),
        })
        created.push(player)
      }
    })
    return { created, skipped }
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
