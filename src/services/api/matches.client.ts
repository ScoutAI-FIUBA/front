import type {
  BoxScoreLine,
  BoxScorePlayerLine,
  BoxScoreTeamTotals,
  MatchBoxScore,
  MatchImportLinkedPlayer,
  MatchImportTeamCheck,
  MatchImportUnlinkedPlayer,
  MatchParticipant,
  MatchRecord,
  MatchSide,
  MatchStatsFormat,
  MatchStatsImportPreview,
  MatchWithParticipants,
  ShootingSplit,
  TeamMismatchDetail,
  UnlinkedReason,
} from '../../types/index.ts'
import type { PreviewStatsImportInput } from '../contracts/matches.service.ts'
import { ApiResponseError } from './errors.ts'

// --- Wire (snake_case) shapes. Everything is optional-ish: the mappers are defensive. ---

export interface ApiShootingSplit {
  made?: number | null
  attempted?: number | null
  pct?: number | null
}

export interface ApiBoxScoreLine {
  minutes?: string | null
  seconds_played?: number | null
  points?: number | null
  two_point?: ApiShootingSplit | null
  three_point?: ApiShootingSplit | null
  free_throws?: ApiShootingSplit | null
  rebounds?: { defensive?: number | null; offensive?: number | null; total?: number | null } | null
  assists?: number | null
  steals?: number | null
  turnovers?: number | null
  blocks?: number | null
  blocks_received?: number | null
  fouls?: number | null
  fouls_drawn?: number | null
  valuation?: number | null
  plus_minus?: number | null
}

export interface ApiBoxScorePlayerLine extends ApiBoxScoreLine {
  team_side?: string | null
  jersey_number?: string | null
  name?: string | null
  played?: boolean | null
  player_id?: string | null
}

export interface ApiBoxScoreTeamTotals {
  name?: string | null
  points?: number | null
  totals?: ApiBoxScoreLine | null
}

export interface ApiMatchStats {
  source?: string
  schema_version?: number
  title?: string | null
  competition?: string | null
  teams?: Partial<Record<MatchSide, ApiBoxScoreTeamTotals | null>> | null
  players?: ApiBoxScorePlayerLine[] | null
}

export interface ApiMatch {
  id: string
  home_team_id: string
  away_team_id: string
  winner_team_id?: string | null
  match_date: string
  description?: string | null
  stats?: unknown
  created_at?: string | null
  updated_at?: string | null
}

export interface ApiMatchParticipant {
  id: string
  match_id?: string
  player_id?: string | null
  team_side: string
  display_name: string
  jersey_number?: string | null
}

export interface ApiImportParticipant {
  team_side: string
  display_name: string
  player_id: string | null
  jersey_number: string | null
}

export interface ApiImportPreview {
  winner_team_id?: string | null
  participants?: ApiImportParticipant[] | null
  stats?: unknown
  report?: {
    teams?: {
      side: string
      excel_name?: string | null
      team_id?: string | null
      team_name?: string | null
      name_score?: number | null
      roster_score?: number | null
      matches_selected_team?: boolean | null
      players_in_file?: number | null
      players_who_played?: number | null
    }[] | null
    linked_players?: {
      team_side: string
      jersey_number?: string | null
      name?: string | null
      player_id: string
      roster_name?: string | null
    }[] | null
    unlinked_players?: {
      team_side: string
      jersey_number?: string | null
      name?: string | null
      reason?: string | null
    }[] | null
    warnings?: string[] | null
  } | null
}

// --- Mappers ---

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function side(value: unknown): MatchSide {
  return value === 'AWAY' ? 'AWAY' : 'HOME'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The percentage comes from the backend (0..100, one decimal) and is never recomputed. */
function mapSplit(raw: ApiShootingSplit | null | undefined): ShootingSplit {
  return {
    made: num(raw?.made),
    attempted: num(raw?.attempted),
    pct: numOrNull(raw?.pct),
  }
}

export function mapBoxScoreLine(raw: ApiBoxScoreLine | null | undefined): BoxScoreLine {
  return {
    minutes: typeof raw?.minutes === 'string' ? raw.minutes : '00:00',
    secondsPlayed: num(raw?.seconds_played),
    points: num(raw?.points),
    twoPoint: mapSplit(raw?.two_point),
    threePoint: mapSplit(raw?.three_point),
    freeThrows: mapSplit(raw?.free_throws),
    rebounds: {
      defensive: num(raw?.rebounds?.defensive),
      offensive: num(raw?.rebounds?.offensive),
      total: num(raw?.rebounds?.total),
    },
    assists: num(raw?.assists),
    steals: num(raw?.steals),
    turnovers: num(raw?.turnovers),
    blocks: num(raw?.blocks),
    blocksReceived: num(raw?.blocks_received),
    fouls: num(raw?.fouls),
    foulsDrawn: num(raw?.fouls_drawn),
    valuation: num(raw?.valuation),
    plusMinus: num(raw?.plus_minus),
  }
}

function mapBoxScorePlayer(raw: ApiBoxScorePlayerLine): BoxScorePlayerLine {
  return {
    ...mapBoxScoreLine(raw),
    teamSide: side(raw.team_side),
    jerseyNumber: strOrNull(raw.jersey_number),
    name: typeof raw.name === 'string' ? raw.name : '',
    played: raw.played === true,
    playerId: strOrNull(raw.player_id),
  }
}

function mapTeamTotals(raw: ApiBoxScoreTeamTotals | null | undefined): BoxScoreTeamTotals {
  return {
    name: typeof raw?.name === 'string' ? raw.name : '',
    points: num(raw?.points),
    totals: isRecord(raw?.totals) ? mapBoxScoreLine(raw.totals as ApiBoxScoreLine) : null,
  }
}

/** Maps a raw `stats` blob already known to be CABB schema v1; returns null if it is unusable. */
export function mapBoxScore(raw: unknown): MatchBoxScore | null {
  if (!isRecord(raw)) return null
  const stats = raw as ApiMatchStats
  if (!isRecord(stats.teams) || !Array.isArray(stats.players)) return null
  return {
    title: strOrNull(stats.title),
    competition: strOrNull(stats.competition),
    teams: {
      HOME: mapTeamTotals(stats.teams.HOME),
      AWAY: mapTeamTotals(stats.teams.AWAY),
    },
    players: stats.players.filter(isRecord).map((p) => mapBoxScorePlayer(p as ApiBoxScorePlayerLine)),
  }
}

export function mapStatsFormat(stats: unknown): MatchStatsFormat {
  if (stats === null || stats === undefined) return 'none'
  if (isRecord(stats) && stats.source === 'cabb_excel' && stats.schema_version === 1) {
    return 'cabb_excel_v1'
  }
  return 'unknown'
}

export function mapApiMatch(raw: ApiMatch): MatchRecord {
  let statsFormat = mapStatsFormat(raw.stats)
  let boxScore: MatchBoxScore | null = null
  if (statsFormat === 'cabb_excel_v1') {
    boxScore = mapBoxScore(raw.stats)
    if (!boxScore) statsFormat = 'unknown'
  }
  return {
    id: raw.id,
    homeTeamId: raw.home_team_id,
    awayTeamId: raw.away_team_id,
    winnerTeamId: raw.winner_team_id ?? null,
    matchDate: raw.match_date,
    description: raw.description ?? null,
    statsFormat,
    boxScore,
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
  }
}

export function mapApiParticipant(raw: ApiMatchParticipant): MatchParticipant {
  return {
    id: raw.id,
    playerId: raw.player_id ?? null,
    teamSide: side(raw.team_side),
    displayName: raw.display_name,
    jerseyNumber: raw.jersey_number ?? null,
  }
}

export function mapMatchWithParticipants(raw: {
  match: ApiMatch
  participants?: ApiMatchParticipant[] | null
}): MatchWithParticipants {
  return {
    match: mapApiMatch(raw.match),
    participants: (raw.participants ?? []).map(mapApiParticipant),
  }
}

const UNLINKED_REASONS: readonly UnlinkedReason[] = [
  'no_roster_player',
  'ambiguous_jersey_number',
  'no_jersey_number',
  'no_team_selected',
]

function mapUnlinkedReason(value: unknown): UnlinkedReason {
  return UNLINKED_REASONS.find((reason) => reason === value) ?? 'no_roster_player'
}

export function mapImportPreview(raw: ApiImportPreview): MatchStatsImportPreview {
  const report = raw.report ?? {}
  const teams: MatchImportTeamCheck[] = (report.teams ?? []).map((t) => ({
    side: side(t.side),
    excelName: t.excel_name ?? '',
    teamId: t.team_id ?? null,
    teamName: t.team_name ?? null,
    nameScore: numOrNull(t.name_score),
    rosterScore: numOrNull(t.roster_score),
    matchesSelectedTeam: typeof t.matches_selected_team === 'boolean' ? t.matches_selected_team : null,
    playersInFile: num(t.players_in_file),
    playersWhoPlayed: num(t.players_who_played),
  }))
  const linkedPlayers: MatchImportLinkedPlayer[] = (report.linked_players ?? []).map((p) => ({
    teamSide: side(p.team_side),
    jerseyNumber: p.jersey_number ?? null,
    name: p.name ?? '',
    playerId: p.player_id,
    rosterName: p.roster_name ?? '',
  }))
  const unlinkedPlayers: MatchImportUnlinkedPlayer[] = (report.unlinked_players ?? []).map((p) => ({
    teamSide: side(p.team_side),
    jerseyNumber: p.jersey_number ?? null,
    name: p.name ?? '',
    reason: mapUnlinkedReason(p.reason),
  }))
  return {
    winnerTeamId: raw.winner_team_id ?? null,
    boxScore: mapBoxScore(raw.stats),
    report: {
      teams,
      linkedPlayers,
      unlinkedPlayers,
      warnings: (report.warnings ?? []).filter((w): w is string => typeof w === 'string'),
    },
    // Taken UNCHANGED from the wire: the saved body must be exactly what the preview validated.
    savePayload: {
      stats: raw.stats,
      winner_team_id: raw.winner_team_id as string | null,
      participants: raw.participants as ApiImportParticipant[],
    },
  }
}

export function buildPreviewFormData(input: PreviewStatsImportInput): FormData {
  const form = new FormData()
  form.append('file', input.file, input.fileName)
  form.append('home_team_id', input.homeTeamId)
  form.append('away_team_id', input.awayTeamId)
  if (input.allowTeamMismatch === true) form.append('allow_team_mismatch', 'true')
  return form
}

// --- Errors ---

export type MatchErrorCode =
  | 'MATCH_NOT_FOUND'
  | 'TEAM_NOT_FOUND'
  | 'PLAYER_NOT_FOUND'
  | 'INVALID_MATCH_TEAMS'
  | 'INVALID_WINNER_TEAM'
  | 'INVALID_STATS_FILE'
  | 'STATS_FILE_TOO_LARGE'
  | 'TEAM_MISMATCH'
  | 'VALIDATION_ERROR'

const MATCH_ERROR_CODES: readonly MatchErrorCode[] = [
  'MATCH_NOT_FOUND',
  'TEAM_NOT_FOUND',
  'PLAYER_NOT_FOUND',
  'INVALID_MATCH_TEAMS',
  'INVALID_WINNER_TEAM',
  'INVALID_STATS_FILE',
  'STATS_FILE_TOO_LARGE',
  'TEAM_MISMATCH',
  'VALIDATION_ERROR',
]

export class MatchApiError extends ApiResponseError {
  readonly code: MatchErrorCode | null
  readonly details: unknown

  constructor(status: number, code: MatchErrorCode | null, message: string, details?: unknown) {
    super(message, status)
    this.name = 'MatchApiError'
    this.code = code
    this.details = details
  }
}

/** Handles `{error:{code,message,details?}}`, FastAPI `{detail:[...]|"..."}` (422 only) and plain text. */
export function parseMatchErrorBody(status: number, text: string): MatchApiError {
  const fallback = text.trim() || 'Error de servidor'
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return new MatchApiError(status, null, fallback)
  }
  if (!isRecord(data)) return new MatchApiError(status, null, fallback)

  if (isRecord(data.error)) {
    const { code, message, details } = data.error
    const known = MATCH_ERROR_CODES.find((c) => c === code) ?? null
    return new MatchApiError(
      status,
      known,
      typeof message === 'string' && message ? message : fallback,
      details,
    )
  }
  // FastAPI also answers 404/405 with {detail:"..."}: only a 422 is a validation error.
  const validationCode = status === 422 ? 'VALIDATION_ERROR' : null
  if (typeof data.detail === 'string') {
    return new MatchApiError(status, validationCode, data.detail || fallback, data.detail)
  }
  if (Array.isArray(data.detail)) {
    const message =
      data.detail
        .map((item) => (isRecord(item) && typeof item.msg === 'string' ? item.msg : ''))
        .filter(Boolean)
        .join('. ') || fallback
    return new MatchApiError(status, validationCode, message, data.detail)
  }
  return new MatchApiError(status, null, fallback)
}

export function isMatchApiError(error: unknown, code: MatchErrorCode): error is MatchApiError {
  return error instanceof MatchApiError && error.code === code
}

/** Entries of `details.teams` of a TEAM_MISMATCH error (empty for anything else). */
export function teamMismatchDetails(error: unknown): TeamMismatchDetail[] {
  if (!(error instanceof MatchApiError) || !isRecord(error.details)) return []
  const teams = error.details.teams
  if (!Array.isArray(teams)) return []
  return teams.filter(isRecord).map((t) => ({
    side: side(t.side),
    selectedTeam: typeof t.selected_team === 'string' ? t.selected_team : '',
    nameInFile: typeof t.name_in_file === 'string' ? t.name_in_file : '',
    nameScore: numOrNull(t.name_score),
    rosterScore: numOrNull(t.roster_score),
  }))
}
