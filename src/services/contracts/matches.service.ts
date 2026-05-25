import type { Match, MatchRoster } from '@/types'

export interface CreateMatchDto {
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  title?: string
  competition?: string
  venue?: string
}

export interface SetRosterDto {
  playerId: string
  teamId: string
  isStarter: boolean
}

export interface IMatchService {
  list(): Promise<Match[]>
  getById(id: string): Promise<Match | null>
  create(dto: CreateMatchDto): Promise<Match>
  getRoster(matchId: string): Promise<MatchRoster[]>
  setRoster(matchId: string, entries: SetRosterDto[]): Promise<MatchRoster[]>
}
