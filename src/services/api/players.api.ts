import type { IPlayerService } from '../contracts/players.service'
import type { Player } from '@/types'
import { apiJson } from './http-client'
import { mapApiPlayer, toPlayerPayload, type ApiPlayer } from './mappers'

export const apiPlayerService: IPlayerService = {
  async list(): Promise<Player[]> {
    const data = await apiJson<{ players: ApiPlayer[] }>('/players')
    return data.players.map(mapApiPlayer)
  },

  async getById(id: string): Promise<Player | null> {
    const players = await this.list()
    return players.find((p) => p.id === id) ?? null
  },

  async create(dto) {
    if (dto.teamId) {
      console.warn(
        '[ScoutAI] teamId en create player ignorado: el backend aún no soporta membresías.',
      )
    }

    const data = await apiJson<{ player: ApiPlayer }>('/players', {
      method: 'POST',
      body: JSON.stringify(
        toPlayerPayload({
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthDate: dto.birthDate,
          primaryPosition: dto.primaryPosition,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
        }),
      ),
    })
    return mapApiPlayer(data.player)
  },

  async filterByTeam(): Promise<Player[]> {
    return []
  },

  async getTeamName(): Promise<string | null> {
    return null
  },
}
