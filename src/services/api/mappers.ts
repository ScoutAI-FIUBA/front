import type { Player, PlayerAnalysisSummary, Team, User, UserRole } from '@/types'

export interface ApiUser {
  id: string
  email: string
  role: string
  email_verified?: boolean
  full_name?: string | null
}

export interface ApiTeam {
  id: string
  name: string
  short_name: string
  city: string
  country: string
  is_own?: boolean
  created_at?: string
}

export interface ApiPlayer {
  id: string
  first_name: string
  last_name: string
  birth_date: string | null
  height_cm: number | null
  weight_kg: number | null
  primary_position: string | null
  jersey_number?: string | null
  team_id?: string | null
  stats?: unknown
}

const PROFILE_PREFIX = 'scoutai-profile-'

function mapRole(role: string): UserRole {
  if (role === 'analyst' || role === 'scout' || role === 'coach') return role
  return 'analyst'
}

export function getProfileFullName(userId: string): string | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { fullName?: string }
    return parsed.fullName?.trim() || null
  } catch {
    return null
  }
}

export function setProfileFullName(userId: string, fullName: string): void {
  localStorage.setItem(`${PROFILE_PREFIX}${userId}`, JSON.stringify({ fullName }))
}

export function mapApiUser(apiUser: ApiUser, fullNameOverride?: string): User {
  const fullName =
    fullNameOverride?.trim() ||
    apiUser.full_name?.trim() ||
    getProfileFullName(apiUser.id) ||
    apiUser.email.split('@')[0]

  if (apiUser.full_name?.trim()) {
    setProfileFullName(apiUser.id, apiUser.full_name.trim())
  }

  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName,
    role: mapRole(apiUser.role),
    emailVerified: Boolean(apiUser.email_verified),
    createdAt: new Date().toISOString(),
  }
}

export function mapApiTeam(team: ApiTeam): Team {
  return {
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    city: team.city,
    country: team.country,
    isOwn: team.is_own === true,
  }
}

function asCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** Reads only games, points and field goals made/attempted; never the backend percentage. */
export function mapPlayerStatsSummary(stats: unknown): PlayerAnalysisSummary | undefined {
  const root = asRecord(stats)
  if (!root) return undefined
  const points = asRecord(root.points)
  const fieldGoals = asRecord(root.field_goals)
  const games = asCount(root.games_played)
  const pointsTotal = asCount(points?.total)
  const fgMade = asCount(fieldGoals?.made_total)
  const fgAttempted = asCount(fieldGoals?.attempted_total)
  if (games === null || pointsTotal === null || fgMade === null || fgAttempted === null) {
    return undefined
  }
  if (fgMade > fgAttempted) return undefined
  return { games, points: pointsTotal, fgMade, fgAttempted }
}

export function mapApiPlayer(player: ApiPlayer): Player {
  return {
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    birthDate: player.birth_date ?? null,
    heightCm: player.height_cm ?? null,
    weightKg: player.weight_kg ?? null,
    primaryPosition: (player.primary_position ?? null) as Player['primaryPosition'],
    jerseyNumber: player.jersey_number ?? undefined,
    teamId: player.team_id ?? null,
    createdAt: new Date().toISOString(),
    status: 'active',
    analysisSummary: mapPlayerStatsSummary(player.stats),
  }
}

export function toTeamPayload(dto: {
  name: string
  shortName: string
  city: string
  country: string
  isOwn?: boolean
}) {
  return {
    name: dto.name,
    short_name: dto.shortName,
    city: dto.city,
    country: dto.country,
    ...(dto.isOwn === undefined ? {} : { is_own: dto.isOwn }),
  }
}

export function toPlayerPayload(dto: {
  firstName: string
  lastName: string
  birthDate?: string | null
  primaryPosition?: string | null
  jerseyNumber?: string
  heightCm?: number | null
  weightKg?: number | null
}) {
  return {
    first_name: dto.firstName,
    last_name: dto.lastName,
    birth_date: dto.birthDate ?? null,
    height_cm: dto.heightCm ?? null,
    weight_kg: dto.weightKg ?? null,
    primary_position: dto.primaryPosition ?? null,
    jersey_number: dto.jerseyNumber ?? null,
  }
}
