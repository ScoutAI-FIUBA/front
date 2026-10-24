import { simulateNetwork } from '@/mocks/delays'
import { generateId } from '@/mocks/store'
import type { MatchRecord, MatchWithParticipants } from '@/types'
import type { IMatchService } from '../contracts/matches.service'
import { MatchApiError } from '../api/matches.client'

/** In-memory only (no seed data, independent from the legacy mock store). */
const matches: MatchRecord[] = []
const participantsByMatch = new Map<string, MatchWithParticipants['participants']>()

function findMatch(id: string): MatchRecord {
  const match = matches.find((m) => m.id === id)
  if (!match) throw new MatchApiError(404, 'MATCH_NOT_FOUND', 'Match not found')
  return match
}

export const mockMatchService: IMatchService = {
  async list(filter) {
    await simulateNetwork()
    return matches
      .filter((m) => !filter?.teamId || m.homeTeamId === filter.teamId || m.awayTeamId === filter.teamId)
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate))
  },

  async getWithParticipants(id) {
    await simulateNetwork()
    return { match: findMatch(id), participants: participantsByMatch.get(id) ?? [] }
  },

  async create(input) {
    await simulateNetwork()
    if (input.homeTeamId === input.awayTeamId) {
      throw new MatchApiError(422, 'INVALID_MATCH_TEAMS', 'Home and away teams must be different')
    }
    const now = new Date().toISOString()
    const match: MatchRecord = {
      id: generateId('match'),
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      winnerTeamId: null,
      matchDate: input.matchDate,
      description: input.description ?? null,
      statsFormat: 'none',
      boxScore: null,
      createdAt: now,
      updatedAt: now,
    }
    matches.push(match)
    return match
  },

  async updateDetails(id, input) {
    await simulateNetwork()
    const match = findMatch(id)
    if (input.matchDate !== undefined) match.matchDate = input.matchDate
    if (input.description !== undefined) match.description = input.description
    match.updatedAt = new Date().toISOString()
    return match
  },

  async previewStatsImport() {
    await simulateNetwork()
    // No invented numbers: reading a real spreadsheet needs the backend.
    throw new MatchApiError(
      422,
      'INVALID_STATS_FILE',
      'La vista previa de la planilla necesita el backend real.',
    )
  },

  async saveStats(matchId, payload) {
    await simulateNetwork()
    const match = findMatch(matchId)
    // Stores what it receives; the preview is the only producer of valid payloads.
    match.winnerTeamId = payload.winner_team_id
    match.statsFormat = 'unknown'
    match.boxScore = null
    match.updatedAt = new Date().toISOString()
    const participants = payload.participants.map((p) => ({
      id: generateId('mpart'),
      playerId: p.player_id,
      teamSide: p.team_side === 'AWAY' ? ('AWAY' as const) : ('HOME' as const),
      displayName: p.display_name,
      jerseyNumber: p.jersey_number,
    }))
    participantsByMatch.set(matchId, participants)
    return { match, participants }
  },
}
