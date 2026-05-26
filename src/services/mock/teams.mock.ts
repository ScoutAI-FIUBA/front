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
      season: '2024/2025',
    }
    updateStore((s) => {
      s.teams.push(team)
    })
    return team
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
      s.memberships.push(membership)
    })
    return membership
  },

  async getPlayerCount(teamId) {
    await simulateNetwork(150)
    return getStore().memberships.filter((m) => m.teamId === teamId && !m.leftAt).length
  },
}
