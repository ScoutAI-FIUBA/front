import type { Player } from '@/types'

export interface CreatePlayerDto {
  firstName: string
  lastName: string
  birthDate: string | null
  primaryPosition: Player['primaryPosition']
  jerseyNumber?: string
  heightCm: number | null
  weightKg: number | null
  teamId?: string
}

export interface UpdatePlayerDto {
  firstName: string
  lastName: string
  birthDate: string | null
  primaryPosition: Player['primaryPosition']
  jerseyNumber?: string
  heightCm: number | null
  weightKg: number | null
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
