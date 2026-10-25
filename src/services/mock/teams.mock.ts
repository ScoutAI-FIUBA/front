import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { ITeamService } from '../contracts/teams.service'

export const mockTeamService: ITeamService = {
  async list() {
    await simulateNetwork()
    return getStore().teams
  },

  async getById(id) {
    await simulateNetwork()
    return getStore().teams.find((t) => t.id === id) ?? null
  },

  async create(dto) {
    await simulateNetwork()
    const team = {
      id: generateId('team'),
      ...dto,
      isOwn: dto.isOwn ?? false,
      season: '2024/2025',
    }
    updateStore((s) => {
      s.teams.push(team)
    })
    return team
  },

  async update(id, dto) {
    await simulateNetwork()
    const updated = updateStore((s) => {
      const team = s.teams.find((t) => t.id === id)
      if (!team) return
      team.name = dto.name
      team.shortName = dto.shortName
      team.city = dto.city
      team.country = dto.country
      team.isOwn = dto.isOwn
    })
    const team = updated.teams.find((t) => t.id === id)
    if (!team) throw new Error('Team not found')
    return team
  },

  async delete(id) {
    await simulateNetwork()
    updateStore((s) => {
      s.teams = s.teams.filter((t) => t.id !== id)
      s.memberships = s.memberships.filter((m) => m.teamId !== id)
      s.players.forEach((player) => {
        if (player.teamId === id) player.teamId = null
      })
    })
  },

  async search(query) {
    await simulateNetwork(250)
    const q = query.toLowerCase()
    return getStore().teams.filter((t) => t.name.toLowerCase().includes(q))
  },

  async getMembers(teamId) {
    await simulateNetwork()
    return getStore().memberships.filter((m) => m.teamId === teamId && !m.leftAt)
  },

  async addMember(teamId, playerId) {
    await simulateNetwork()
    const exists = getStore().memberships.some(
      (m) => m.teamId === teamId && m.playerId === playerId && !m.leftAt,
    )
    if (exists) throw new Error('El jugador ya pertenece a este equipo')

    const membership = {
      id: generateId('mem'),
      teamId,
      playerId,
      joinedAt: new Date().toISOString(),
    }
    updateStore((s) => {
      const movedAt = new Date().toISOString()
      s.memberships.forEach((existingMembership) => {
        if (existingMembership.playerId === playerId && !existingMembership.leftAt) {
          existingMembership.leftAt = movedAt
        }
      })
      s.memberships.push(membership)
      const player = s.players.find((p) => p.id === playerId)
      if (player) player.teamId = teamId
    })
    return membership
  },

  async getPlayerCount(teamId) {
    await simulateNetwork(150)
    return getStore().memberships.filter((m) => m.teamId === teamId && !m.leftAt).length
  },
}
