import type { IMatchService } from '../contracts/matches.service'
import { apiFetch } from './http-client'
import {
  buildPreviewFormData,
  mapApiMatch,
  mapImportPreview,
  mapMatchWithParticipants,
  parseMatchErrorBody,
  type ApiImportPreview,
  type ApiMatch,
  type ApiMatchParticipant,
} from './matches.client'

/** Like apiJson, but keeps the backend error code (throws MatchApiError). */
async function readMatchJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) throw parseMatchErrorBody(res.status, text)
  return JSON.parse(text) as T
}

export const apiMatchService: IMatchService = {
  async list(filter) {
    const query = filter?.teamId ? `?team_id=${encodeURIComponent(filter.teamId)}` : ''
    const data = await readMatchJson<{ matches: ApiMatch[] }>(await apiFetch(`/matches${query}`))
    return data.matches.map(mapApiMatch)
  },

  async getWithParticipants(id) {
    const data = await readMatchJson<{ match: ApiMatch; participants: ApiMatchParticipant[] }>(
      await apiFetch(`/matches/${encodeURIComponent(id)}/stats`),
    )
    return mapMatchWithParticipants(data)
  },

  async create(input) {
    const body: Record<string, unknown> = {
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      match_date: input.matchDate,
    }
    if (input.description) body.description = input.description
    const data = await readMatchJson<{ match: ApiMatch }>(
      await apiFetch('/matches', { method: 'POST', body: JSON.stringify(body) }),
    )
    return mapApiMatch(data.match)
  },

  async previewStatsImport(input) {
    const res = await apiFetch(
      '/matches/stats/import-preview',
      { method: 'POST', body: buildPreviewFormData(input) },
      { timeoutMs: 60_000, timeoutMessage: 'Leer la planilla tardó demasiado. Probá de nuevo.' },
    )
    return mapImportPreview(await readMatchJson<ApiImportPreview>(res))
  },

  async saveStats(matchId, payload) {
    const data = await readMatchJson<{ match: ApiMatch; participants: ApiMatchParticipant[] }>(
      await apiFetch(`/matches/${encodeURIComponent(matchId)}/stats`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    )
    return mapMatchWithParticipants(data)
  },
}
