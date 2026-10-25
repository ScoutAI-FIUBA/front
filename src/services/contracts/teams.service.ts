import type { Team, TeamMembership } from '@/types'

export interface CreateTeamDto {
  name: string
  shortName: string
  city: string
  country: string
  isOwn?: boolean
  league?: string
  category?: string
}

export interface UpdateTeamDto {
  name: string
  shortName: string
  city: string
  country: string
  isOwn?: boolean
}

export interface ITeamService {
  list(): Promise<Team[]>
  getById(id: string): Promise<Team | null>
  create(dto: CreateTeamDto): Promise<Team>
  update(id: string, dto: UpdateTeamDto): Promise<Team>
  delete(id: string): Promise<void>
  search(query: string): Promise<Team[]>
  getMembers(teamId: string): Promise<TeamMembership[]>
  addMember(teamId: string, playerId: string): Promise<TeamMembership>
  getPlayerCount(teamId: string): Promise<number>
}
