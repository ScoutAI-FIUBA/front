import { teamVideosPath } from './video-team-navigation.ts'

export const VIDEO_UPLOAD_RETURN_QUERY_PARAM = 'return_to'

export function safeVideoUploadReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null

  try {
    const parsed = new URL(value, 'https://scoutai.local')
    if (parsed.origin !== 'https://scoutai.local') return null
    if (parsed.pathname !== '/videos' && parsed.pathname !== '/analisis/nuevo') return null
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
  return query ? `/videos/subir?${query}` : '/videos/subir'
}

export function videoUploadReturnPath(searchParams: URLSearchParams, selectedTeamId: string): string {
  const requested = safeVideoUploadReturnPath(searchParams.get(VIDEO_UPLOAD_RETURN_QUERY_PARAM))
  if (requested) return requested
  return selectedTeamId ? teamVideosPath(selectedTeamId) : '/videos'
}

export function videoUploadSuccessPath(
  searchParams: URLSearchParams,
  uploaded: { id: string; teamId: string },
): string {
  const destination = videoUploadReturnPath(searchParams, uploaded.teamId)
  if (!destination.startsWith('/analisis/nuevo')) return destination

  const parsed = new URL(destination, 'https://scoutai.local')
  parsed.searchParams.set('team_id', uploaded.teamId)
  parsed.searchParams.set('video_id', uploaded.id)
  return `${parsed.pathname}${parsed.search}`
}
