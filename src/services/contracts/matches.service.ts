import type {
  MatchRecord,
  MatchStatsImportPreview,
  MatchStatsSavePayload,
  MatchWithParticipants,
} from '@/types'

export interface CreateMatchInput {
  homeTeamId: string
  awayTeamId: string
  /** YYYY-MM-DD */
  matchDate: string
  description?: string
}

export interface PreviewStatsImportInput {
  file: Blob
  fileName: string
  homeTeamId: string
  awayTeamId: string
  allowTeamMismatch?: boolean
}

export interface IMatchService {
  list(filter?: { teamId?: string }): Promise<MatchRecord[]>
  /** GET /matches/{id}/stats */
  getWithParticipants(id: string): Promise<MatchWithParticipants>
  create(input: CreateMatchInput): Promise<MatchRecord>
  previewStatsImport(input: PreviewStatsImportInput): Promise<MatchStatsImportPreview>
  /** Full replace of the stats of a match. */
  saveStats(matchId: string, payload: MatchStatsSavePayload): Promise<MatchWithParticipants>
}
