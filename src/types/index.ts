export type UserRole = 'analyst' | 'scout' | 'coach'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  emailVerified: boolean
  createdAt: string
}

export interface UserCredentials {
  email: string
  password: string
}

export interface RegisterDto {
  fullName: string
  email: string
  password: string
}

export type PositionCode = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export interface Team {
  id: string
  name: string
  shortName: string
  city: string
  country: string
  league?: string
  category?: string
  season?: string
  logoUrl?: string
}

export type PlayerStatus = 'pending' | 'active'

/** Compact per-player totals from the `stats` field of GET /players. */
export interface PlayerAnalysisSummary {
  games: number
  points: number
  fgMade: number
  fgAttempted: number
}

export interface Player {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  heightCm?: number
  weightKg?: number
  primaryPosition: PositionCode
  createdAt: string
  teamId?: string | null
  jerseyNumber?: string
  photoUrl?: string
  status?: PlayerStatus
  analysisSummary?: PlayerAnalysisSummary
}

export interface TeamMembership {
  id: string
  teamId: string
  playerId: string
  joinedAt: string
  leftAt?: string
}

/** @deprecated legacy mock analysis only */
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled'

/** @deprecated legacy mock analysis only */
export interface Match {
  id: string
  homeTeamId: string
  awayTeamId?: string | null
  scheduledAt: string
  venue?: string
  competition?: string
  status: MatchStatus
  title?: string
}

/** @deprecated legacy mock analysis only */
export interface MatchRoster {
  id: string
  matchId: string
  playerId: string
  teamId: string
  isStarter: boolean
}

export type VideoStatus = 'uploaded' | 'processing' | 'analyzed' | 'failed'

export interface Video {
  id: string
  matchId?: string
  teamId: string
  title: string
  storageUrl: string
  durationMs?: number
  thumbnailUrl?: string
  resolution?: string
  description?: string
  uploadedAt: string
  status: VideoStatus
}

export interface ClipCollection {
  id: string
  videoId: string
  teamId: string
  ownerUserId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ClipCollectionItem {
  id: string
  collectionId: string
  startMs: number
  endMs: number
  description?: string | null
  position: number
  createdAt: string
}

export interface ClipCollectionDetail {
  collection: ClipCollection
  items: ClipCollectionItem[]
}

export type EventType =
  | 'shot'
  | 'pass'
  | 'foul'
  | 'rebound'
  | 'turnover'
  | 'assist'
  | 'goal'

export type Quarter = 1 | 2 | 3 | 4 | 'OT'

/** @deprecated legacy mock analysis only */
export interface GameEvent {
  id: string
  matchId: string
  playerId: string
  teamId: string
  videoId?: string
  eventType: EventType
  quarter: Quarter
  metadata: Record<string, unknown>
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed'

export type ProcessingJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
export type AnalysisJobTeamSide = 0 | 1

export interface DetectedAnalysisJobTeamSide {
  teamSide: AnalysisJobTeamSide
  trackCount: number
  numbers: string[]
  rosterMatches: number
}

export interface AnalysisJobTeamSides {
  jobId: string
  videoId: string
  ourTeamSide: AnalysisJobTeamSide | null
  suggestedTeamSide: AnalysisJobTeamSide | null
  sides: DetectedAnalysisJobTeamSide[]
  rosterNumbersKnown: number
}

export interface ShootingZoneStats {
  made: number
  attempted: number
  percentage: number | null
}

export interface ShootingTotals {
  points: number
  fieldGoalsMade: number
  fieldGoalsAttempted: number
  fieldGoalPercentage: number | null
  twoPointMade: number
  twoPointAttempted: number
  twoPointPercentage: number | null
  threePointMade: number
  threePointAttempted: number
  threePointPercentage: number | null
  byZone: Record<string, ShootingZoneStats>
}

export interface AnalysisJobTeamShootingStats extends ShootingTotals {
  teamSide: AnalysisJobTeamSide
  playersTracked: number
}

export interface AnalysisJobPlayerShootingStats extends ShootingTotals {
  trackId: number
  stablePlayerId: string | null
  teamSide: AnalysisJobTeamSide | null
  jerseyNumber: string | null
  observations: number
  onCourt: boolean
  rosterPlayerId: string | null
  rosterName: string | null
  displayName: string
}

export interface AnalysisJobShotStat {
  shotId: string | number | null
  trackId: number | null
  stablePlayerId: string | null
  teamSide: AnalysisJobTeamSide | null
  jerseyNumber: string | null
  rosterPlayerId: string | null
  rosterName: string | null
  made: boolean
  outcome: string | null
  points: 2 | 3
  zone: string
  distanceM: number
  courtXM: number
  courtYM: number
  timestampSeconds: number | null
  shotType: string | null
  attribution: string | null
  outcomeConfidence: PlayerShotOutcomeConfidence | null
  needsReview: boolean | null
}

export interface AnalysisJobStatsCoverage {
  shotsDetected: number
  shotsScored: number
  shotsWithoutCourtPosition: number
  shotsWithoutShooter: number
  playersTracked: number
  playersOnCourt: number
  playersWithJerseyNumber: number
  playersLinkedToRoster: number
  measures: string[]
  notMeasured: string[]
}

export interface AnalysisJobShootingStats {
  jobId: string
  videoId: string
  ourTeamSide: AnalysisJobTeamSide | null
  teams: AnalysisJobTeamShootingStats[]
  players: AnalysisJobPlayerShootingStats[]
  shots: AnalysisJobShotStat[]
  coverage: AnalysisJobStatsCoverage
}

export type ShotChartResult = 'made' | 'missed' | 'unknown'

export interface ShotChartCourtPoint {
  xM: number
  yM: number
}

export interface AnalysisJobShotChartCourt {
  lengthM: number
  widthM: number
  hoopInsetM: number
  hoops: {
    home: ShotChartCourtPoint
    away: ShotChartCourtPoint
  }
  threePointRadiusM: number
  cornerThreeLateralM: number
}

export interface AnalysisJobShotChartShot {
  shotId: string | number | null
  trackId: number | null
  stablePlayerId: string | null
  teamSide: AnalysisJobTeamSide | null
  jerseyNumber: string | null
  rosterPlayerId: string | null
  rosterName: string | null
  xM: number
  yM: number
  made: boolean
  result: ShotChartResult
  points: 2 | 3
  zone: string
  distanceM: number
  shotType: string | null
  timestampSeconds: number | null
  attribution: string | null
  outcomeConfidence: PlayerShotOutcomeConfidence | null
  needsReview: boolean | null
}

export interface AnalysisJobShotChartPlayer {
  trackId: number
  stablePlayerId: string | null
  teamSide: AnalysisJobTeamSide | null
  jerseyNumber: string | null
  displayName: string
  shots: AnalysisJobShotChartShot[]
}

export interface AnalysisJobShotChartCoverage {
  shotsDetected: number
  shotsScored: number
  shotsWithoutCourtPosition: number
  shotsWithoutShooter: number
  playersTracked: number
  playersOnCourt: number
  playersWithJerseyNumber: number
  playersLinkedToRoster: number
  measures: string[]
  notMeasured: string[]
  shotsCharted: number
  filteredToTrackId: number | null
  filteredToStablePlayerId: string | null
}

export interface AnalysisJobShotChart {
  court: AnalysisJobShotChartCourt
  shots: AnalysisJobShotChartShot[]
  players: AnalysisJobShotChartPlayer[]
  coverage: AnalysisJobShotChartCoverage
}

/** pct is a fraction 0..1 (null without attempts); only display code converts it. */
export interface PlayerShootingLine {
  made: number
  attempted: number
  pct: number | null
}

export interface PlayerZoneLine extends PlayerShootingLine {
  unresolvedAttempts: number
}

export interface PlayerAnalysisVideo {
  jobId: string
  videoId: string
  videoTitle: string | null
  jerseyNumber: string | null
  secondsOnScreen: number | null
  distanceM: number | null
  points: number
  fieldGoals: { made: number; attempted: number }
  twoPoint: { made: number; attempted: number }
  threePoint: { made: number; attempted: number }
  unresolvedAttempts: number
}

export interface PlayerAnalysisStats {
  playerId: string
  calcVersion: number
  /** Analysed videos where the player is linked, not official games. */
  games: number
  points: number
  fieldGoals: PlayerShootingLine
  twoPoint: PlayerShootingLine
  threePoint: PlayerShootingLine
  unresolvedAttempts: number
  /** Seconds visible in video, not minutes played. */
  secondsOnScreen: number | null
  distanceM: number | null
  byZone: Record<string, PlayerZoneLine>
  byShotType: Record<string, PlayerZoneLine>
  videos: PlayerAnalysisVideo[]
  notMeasured: string[]
}

export type PlayerShotOutcomeConfidence =
  | 'detected'
  | 'inferred'
  | 'timeout'
  | 'unresolved'

export interface PlayerShotChartShot {
  /** Unique among the player's shots; shot ids repeat across jobs. */
  shotKey: string
  shotId: number | null
  jobId: string
  videoId: string
  videoTitle: string | null
  xM: number
  yM: number
  /** Use result, not a boolean: unknown outcomes are not misses. */
  result: ShotChartResult
  /** Worth of the shot by location, even when missed. */
  shotValue: 2 | 3
  zone: string | null
  shotType: string | null
  distanceM: number | null
  timestampSeconds: number | null
  outcomeConfidence: PlayerShotOutcomeConfidence | null
  needsReview: boolean | null
}

export interface PlayerShotChart {
  playerId: string
  player: {
    id: string
    firstName: string
    lastName: string
    jerseyNumber: string | null
    teamId: string | null
  }
  calcVersion: number
  court: AnalysisJobShotChartCourt
  shots: PlayerShotChartShot[]
  coverage: {
    shotsCharted: number
    made: number
    missed: number
    unresolved: number
    videos: number
  }
}

export interface AnalysisJobCourtPosition {
  frameIndex: number | null
  xM: number
  yM: number
}

export interface AnalysisJobCourtMovement {
  samples: number
  distanceM: number
  averagePosition: {
    xM: number
    yM: number
  }
}

export interface AnalysisJobCourtPositionsPlayer {
  trackId: number
  stablePlayerId: string | null
  teamSide: AnalysisJobTeamSide | null
  jerseyNumber: string | null
  positions: AnalysisJobCourtPosition[]
  movement: AnalysisJobCourtMovement
}

export type AnalysisJobCourtPositionsSource =
  | 'projected_tracks.jsonl'
  | 'player_positions.jsonl'
  | null

export interface AnalysisJobCourtPositionsCoverage {
  sourceFile: AnalysisJobCourtPositionsSource
  recordsRead: number
  recordsOffCourt: number
  sampleEvery: number
  truncated: boolean
}

export interface AnalysisJobCourtPositions {
  jobId: string
  videoId: string
  court: {
    lengthM: number
    widthM: number
  }
  players: AnalysisJobCourtPositionsPlayer[]
  coverage: AnalysisJobCourtPositionsCoverage
}

export interface AnalysisJobSimilarResult {
  jobId: string
  videoId: string
  score: number
  shotScore: number
  movementScore: number
}

export interface AnalysisJobSimilarAnalyses {
  jobId: string
  videoId: string
  movementWeight: number
  candidatesCompared: number
  results: AnalysisJobSimilarResult[]
}

export interface ProcessingJob {
  id: string
  videoId: string
  teamId: string
  requestedByUserId: string
  status: ProcessingJobStatus
  resultsKey: string | null
  errorMessage: string | null
  progressPercent: number | null
  summary: Record<string, unknown> | null
  ourTeamSide: AnalysisJobTeamSide | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnalysisSession {
  id: string
  matchId: string
  videoId: string
  sessionCode: string
  status: AnalysisStatus
  progressPercent: number
  totalMinutes: number
  framesAnalyzed: number
  remainingTime: string
}

export interface ManualAnalysisClip {
  id: string
  label: string
  startSecond: number
  endSecond: number
}

export interface ManualAnalysisDraft {
  name: string
  video: Video
  clipCollectionId?: string
  team: Team
  rivalTeam?: Team | null
  teamId: string
  rivalTeamId?: string | null
  playerIds: string[]
  clips: ManualAnalysisClip[]
}

export interface SavedManualAnalysis extends ManualAnalysisDraft {
  sessionId: string
  savedAt: string
}

export interface ActivityItem {
  id: string
  type: 'player' | 'video' | 'analysis' | 'team'
  title: string
  detail: string
  timestamp: string
}

export interface DashboardStats {
  totalTeams: number
  totalPlayers: number
  totalVideos: number
  pendingAnalysis: number
}

export interface AnalysisDetail {
  session: AnalysisSession
  match: Match
  video: Video
  homeTeam: Team
  awayTeam?: Team
  manualAnalysis?: SavedManualAnalysis
  events: GameEvent[]
  detectedPlayers: Array<{
    playerId: string
    name: string
    jerseyNumber: string
    position: string
  }>
}

export interface MockStore {
  users: Array<User & { password: string }>
  teams: Team[]
  players: Player[]
  memberships: TeamMembership[]
  matches: Match[]
  rosters: MatchRoster[]
  videos: Video[]
  clipCollections: ClipCollection[]
  clipCollectionItems: ClipCollectionItem[]
  gameEvents: GameEvent[]
  analysisSessions: AnalysisSession[]
  manualAnalyses: SavedManualAnalysis[]
  activities: ActivityItem[]
}

// --- Matches (real /matches backend) ---

export type MatchSide = 'HOME' | 'AWAY'

export interface ShootingSplit {
  made: number
  attempted: number
  /** 0..100 with one decimal, computed by the backend; null when nothing was attempted. */
  pct: number | null
}

export interface BoxScoreLine {
  minutes: string
  secondsPlayed: number
  points: number
  twoPoint: ShootingSplit
  threePoint: ShootingSplit
  freeThrows: ShootingSplit
  rebounds: { defensive: number; offensive: number; total: number }
  assists: number
  steals: number
  turnovers: number
  blocks: number
  blocksReceived: number
  fouls: number
  foulsDrawn: number
  valuation: number
  plusMinus: number
}

export interface BoxScorePlayerLine extends BoxScoreLine {
  teamSide: MatchSide
  jerseyNumber: string | null
  name: string
  played: boolean
  playerId: string | null
}

export interface BoxScoreTeamTotals {
  name: string
  points: number
  totals: BoxScoreLine | null
}

export interface MatchBoxScore {
  title: string | null
  competition: string | null
  teams: Record<MatchSide, BoxScoreTeamTotals>
  players: BoxScorePlayerLine[]
}

export type MatchStatsFormat = 'none' | 'cabb_excel_v1' | 'unknown'

export interface MatchRecord {
  id: string
  homeTeamId: string
  awayTeamId: string
  winnerTeamId: string | null
  /** YYYY-MM-DD */
  matchDate: string
  description: string | null
  statsFormat: MatchStatsFormat
  boxScore: MatchBoxScore | null
  createdAt: string
  updatedAt: string
}

export interface MatchParticipant {
  id: string
  playerId: string | null
  teamSide: MatchSide
  displayName: string
  jerseyNumber: string | null
}

export interface MatchWithParticipants {
  match: MatchRecord
  participants: MatchParticipant[]
}

export type UnlinkedReason =
  | 'no_roster_player'
  | 'ambiguous_jersey_number'
  | 'no_jersey_number'
  | 'no_team_selected'

export interface MatchImportTeamCheck {
  side: MatchSide
  excelName: string
  teamId: string | null
  teamName: string | null
  /** 0..1 */
  nameScore: number | null
  /** 0..1 */
  rosterScore: number | null
  matchesSelectedTeam: boolean | null
  playersInFile: number
  playersWhoPlayed: number
}

export interface MatchImportLinkedPlayer {
  teamSide: MatchSide
  jerseyNumber: string | null
  name: string
  playerId: string
  rosterName: string
}

export interface MatchImportUnlinkedPlayer {
  teamSide: MatchSide
  jerseyNumber: string | null
  name: string
  reason: UnlinkedReason
}

/** Snake_case on purpose: this is the exact wire body of PUT /matches/{id}/stats. */
export interface MatchStatsSavePayload {
  stats: unknown
  winner_team_id: string | null
  participants: {
    team_side: string
    display_name: string
    player_id: string | null
    jersey_number: string | null
  }[]
}

export interface MatchStatsImportPreview {
  winnerTeamId: string | null
  boxScore: MatchBoxScore | null
  report: {
    teams: MatchImportTeamCheck[]
    linkedPlayers: MatchImportLinkedPlayer[]
    unlinkedPlayers: MatchImportUnlinkedPlayer[]
    warnings: string[]
  }
  savePayload: MatchStatsSavePayload
}

export interface TeamMismatchDetail {
  side: MatchSide
  selectedTeam: string
  nameInFile: string
  nameScore: number | null
  rosterScore: number | null
}
