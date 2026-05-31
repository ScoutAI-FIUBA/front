import type { ITeamService } from '../contracts/teams.service'
import type { Team, TeamMembership } from '@/types'
import { apiJson } from './http-client'
import { mapApiTeam, toTeamPayload, type ApiPlayer, type ApiTeam } from './mappers'
import { assignPlayerToTeam } from './players.api'

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

  async update(id, dto) {
    const data = await apiJson<{ team: ApiTeam }>(`/teams/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(toTeamPayload(dto)),
    })
    return mapApiTeam(data.team)
  },

  async delete(id) {
    await apiJson<void>(`/teams/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
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

  async getMembers(teamId: string): Promise<TeamMembership[]> {
    const data = await apiJson<{ players: ApiPlayer[] }>(
      `/players?team_id=${encodeURIComponent(teamId)}`,
    )
    return data.players.map((player) => ({
      id: `${player.id}-${teamId}`,
      teamId,
      playerId: player.id,
      joinedAt: new Date().toISOString(),
    }))
  },

  async addMember(teamId: string, playerId: string): Promise<TeamMembership> {
    await assignPlayerToTeam(playerId, teamId)
    return {
      id: `${playerId}-${teamId}`,
      teamId,
      playerId,
      joinedAt: new Date().toISOString(),
    }
  },

  async getPlayerCount(teamId: string): Promise<number> {
    const data = await apiJson<{ players: ApiPlayer[] }>(
      `/players?team_id=${encodeURIComponent(teamId)}`,
    )
    return data.players.length
  },
}
