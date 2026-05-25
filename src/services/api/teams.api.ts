import type { ITeamService } from '../contracts/teams.service'
import type { Team, TeamMembership } from '@/types'
import { apiJson } from './http-client'
import { mapApiTeam, toTeamPayload, type ApiTeam } from './mappers'

const MEMBERSHIP_UNAVAILABLE =
  'La vinculación jugador-equipo aún no está disponible en el backend.'

export const apiTeamService: ITeamService = {
  async list(): Promise<Team[]> {
    const data = await apiJson<{ teams: ApiTeam[] }>('/teams')
    return data.teams.map(mapApiTeam)
  },

  async getById(id: string): Promise<Team | null> {
    const teams = await this.list()
    return teams.find((t) => t.id === id) ?? null
  },

  async create(dto) {
    const data = await apiJson<{ team: ApiTeam }>('/teams', {
      method: 'POST',
      body: JSON.stringify(toTeamPayload(dto)),
    })
    return mapApiTeam(data.team)
  },

  async search(query: string): Promise<Team[]> {
    const q = query.trim().toLowerCase()
    if (!q) return this.list()
    const teams = await this.list()
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q),
    )
  },

  async getMembers(_teamId: string): Promise<TeamMembership[]> {
    return []
  },

  async addMember(_teamId: string, _playerId: string): Promise<TeamMembership> {
    throw new Error(MEMBERSHIP_UNAVAILABLE)
  },

  async getPlayerCount(_teamId: string): Promise<number> {
    return 0
  },
}
