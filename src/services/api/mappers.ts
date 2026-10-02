import type { Player, Team, User, UserRole } from '@/types'

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
  created_at?: string
}

export interface ApiPlayer {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  height_cm: number
  weight_kg: number
  primary_position: string
  jersey_number?: string | null
  team_id?: string | null
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
  }
}

export function mapApiPlayer(player: ApiPlayer): Player {
  return {
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    birthDate: player.birth_date,
    heightCm: player.height_cm,
    weightKg: player.weight_kg,
    primaryPosition: player.primary_position as Player['primaryPosition'],
    jerseyNumber: player.jersey_number ?? undefined,
    teamId: player.team_id ?? null,
    createdAt: new Date().toISOString(),
    status: 'active',
  }
}

export function toTeamPayload(dto: {
  name: string
  shortName: string
  city: string
  country: string
}) {
  return {
    name: dto.name,
    short_name: dto.shortName,
    city: dto.city,
    country: dto.country,
  }
}

export function toPlayerPayload(dto: {
  firstName: string
  lastName: string
  birthDate: string
  primaryPosition: string
  jerseyNumber?: string
  heightCm?: number
  weightKg?: number
}) {
  return {
    first_name: dto.firstName,
    last_name: dto.lastName,
    birth_date: dto.birthDate,
    height_cm: dto.heightCm ?? 180,
    weight_kg: dto.weightKg ?? 75,
    primary_position: dto.primaryPosition,
    jersey_number: dto.jerseyNumber ?? null,
  }
}
