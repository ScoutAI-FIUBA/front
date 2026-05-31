import type { Player } from '@/types'

export interface CreatePlayerDto {
  firstName: string
  lastName: string
  birthDate: string
  primaryPosition: Player['primaryPosition']
  jerseyNumber?: number
  heightCm?: number
  weightKg?: number
  teamId?: string
}

export interface UpdatePlayerDto {
  firstName: string
  lastName: string
  birthDate: string
  primaryPosition: Player['primaryPosition']
  jerseyNumber?: number
  heightCm?: number
  weightKg?: number
}

export interface IPlayerService {
  list(): Promise<Player[]>
  getById(id: string): Promise<Player | null>
  create(dto: CreatePlayerDto): Promise<Player>
  update(id: string, dto: UpdatePlayerDto): Promise<Player>
  delete(id: string): Promise<void>
  filterByTeam(teamId: string): Promise<Player[]>
  getTeamName(playerId: string): Promise<string | null>
}
