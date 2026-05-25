export type UserRole = 'analyst' | 'scout' | 'coach'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
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

export type PositionCode =
  | 'DEL'
  | 'MC'
  | 'MCD'
  | 'DFC'
  | 'MED'
  | 'DEF'
  | 'EXT'
  | 'POR'

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

export interface Player {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  heightCm?: number
  weightKg?: number
  primaryPosition: PositionCode
  createdAt: string
  jerseyNumber?: number
  photoUrl?: string
  status?: PlayerStatus
}

export interface TeamMembership {
  id: string
  teamId: string
  playerId: string
  joinedAt: string
  leftAt?: string
}

export type MatchStatus = 'scheduled' | 'completed' | 'cancelled'

export interface Match {
  id: string
  homeTeamId: string
  awayTeamId: string
  scheduledAt: string
  venue?: string
  competition?: string
  status: MatchStatus
  title?: string
}

export interface MatchRoster {
  id: string
  matchId: string
  playerId: string
  teamId: string
  isStarter: boolean
}

export type VideoStatus = 'uploaded' | 'processing' | 'analyzed'

export interface Video {
  id: string
  matchId: string
  teamId: string
  title: string
  storageUrl: string
  thumbnailUrl?: string
  resolution?: string
  rivalName?: string
  uploadedAt: string
  status: VideoStatus
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
  awayTeam: Team
  events: GameEvent[]
  detectedPlayers: Array<{
    playerId: string
    name: string
    jerseyNumber: number
    position: string
    heatmapPercent: number
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
  gameEvents: GameEvent[]
  analysisSessions: AnalysisSession[]
  activities: ActivityItem[]
}
