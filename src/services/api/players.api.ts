import type { IPlayerService } from '../contracts/players.service'
import type { Player } from '@/types'
import { apiJson } from './http-client'
import { mapApiPlayer, toPlayerPayload, type ApiPlayer } from './mappers'

async function fetchPlayers(teamId?: string): Promise<Player[]> {
  const path = teamId
    ? `/players?team_id=${encodeURIComponent(teamId)}`
    : '/players'
  const data = await apiJson<{ players: ApiPlayer[] }>(path)
  return data.players.map(mapApiPlayer)
}

export async function assignPlayerToTeam(playerId: string, teamId: string): Promise<Player> {
  const data = await apiJson<{ player: ApiPlayer }>(
    `/players/${encodeURIComponent(playerId)}/team/${encodeURIComponent(teamId)}`,
    { method: 'PUT' },
  )
  return mapApiPlayer(data.player)
}

export const apiPlayerService: IPlayerService = {
  async list(): Promise<Player[]> {
    return fetchPlayers()
  },

  async getById(id: string): Promise<Player | null> {
    const players = await this.list()
    return players.find((p) => p.id === id) ?? null
  },

  async create(dto) {
    const data = await apiJson<{ player: ApiPlayer }>('/players', {
      method: 'POST',
      body: JSON.stringify(
        toPlayerPayload({
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate,
          primaryPosition: dto.primaryPosition,
          jerseyNumber: dto.jerseyNumber,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
        }),
      ),
    })

    let player = mapApiPlayer(data.player)

    if (dto.teamId) {
      player = await assignPlayerToTeam(player.id, dto.teamId)
    }

    return player
  },

  async update(id, dto) {
    const data = await apiJson<{ player: ApiPlayer }>(`/players/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(
        toPlayerPayload({
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate,
          primaryPosition: dto.primaryPosition,
          jerseyNumber: dto.jerseyNumber,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
        }),
      ),
    })
    return mapApiPlayer(data.player)
  },

  async delete(id) {
    await apiJson<void>(`/players/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  },

  async filterByTeam(teamId: string): Promise<Player[]> {
    return fetchPlayers(teamId)
  },

  async getTeamName(playerId: string): Promise<string | null> {
    const player = await this.getById(playerId)
    if (!player?.teamId) return null

    const teams = await apiJson<{ teams: { id: string; name: string }[] }>('/teams')
    return teams.teams.find((t) => t.id === player.teamId)?.name ?? null
  },
}
