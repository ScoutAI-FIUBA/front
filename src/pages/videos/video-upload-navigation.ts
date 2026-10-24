import { teamVideosPath } from './video-team-navigation.ts'
import { videoDetailPath } from '../matches/match-detail.ts'

export const VIDEO_UPLOAD_RETURN_QUERY_PARAM = 'return_to'
export const VIDEO_UPLOAD_PATH = '/videos/subir'
/** @deprecated Use VIDEO_UPLOAD_PATH. */
export const NEW_MATCH_PATH = VIDEO_UPLOAD_PATH

export function safeVideoUploadReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  try {
    const parsed = new URL(value, 'https://scoutai.local')
    if (parsed.origin !== 'https://scoutai.local') return null
    if (parsed.pathname !== '/videos' && parsed.pathname !== '/analisis/nuevo') {
      return null
    }
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return null
  }
}

export function videoUploadPath({
  teamId,
  returnTo,
}: {
  teamId?: string
  returnTo?: string
} = {}): string {
  const params = new URLSearchParams()
  if (teamId) params.set('team_id', teamId)
  const safeReturn = safeVideoUploadReturnPath(returnTo ?? null)
  if (safeReturn) params.set(VIDEO_UPLOAD_RETURN_QUERY_PARAM, safeReturn)
  const query = params.toString()
  return query ? `${VIDEO_UPLOAD_PATH}?${query}` : VIDEO_UPLOAD_PATH
}

/** @deprecated Use videoUploadPath. */
export function newMatchPath({ teamId }: { teamId?: string } = {}): string {
  return videoUploadPath({ teamId })
}

export function videoUploadReturnPath(searchParams: URLSearchParams, selectedTeamId: string): string {
  const requested = safeVideoUploadReturnPath(searchParams.get(VIDEO_UPLOAD_RETURN_QUERY_PARAM))
  if (requested) return requested
  return selectedTeamId ? teamVideosPath(selectedTeamId) : '/videos'
}

export function videoUploadSuccessPath(
  _searchParams: URLSearchParams,
  uploaded: { id: string; teamId: string },
): string {
  return videoDetailPath(uploaded.id, 'reporte')
}
