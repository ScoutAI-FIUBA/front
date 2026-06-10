import type { IVideoService, UploadVideoDto } from '../contracts/videos.service'
import type { Video, VideoStatus } from '@/types'
import { apiJson } from './http-client'

interface ApiTeamRef {
  id: string
}

interface ApiVideo {
  id: string
  team_id: string
  storage_key: string
  title: string
  description: string | null
  status: 'PENDING_UPLOAD' | 'READY' | 'FAILED' | 'DELETED'
  mime_type: string | null
  size_bytes: number | null
  duration_ms: number | null
  created_at: string
  updated_at: string
}

interface InitUploadResponse {
  video_id: string
  upload_id: string
  parts: Array<{
    part_number: number
    presigned_part_url: string
  }>
}

const PART_SIZE_BYTES = 5 * 1024 * 1024

async function uploadPart(url: string, chunk: Blob, contentType: string): Promise<string> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: chunk,
  })

  if (!res.ok) {
    throw new Error(`No se pudo subir una parte del video (${res.status})`)
  }

  const etag = res.headers.get('ETag')
  if (!etag) {
    throw new Error('La subida de una parte del video no devolvio ETag')
  }

  return etag
}

function mapVideoStatus(status: ApiVideo['status']): VideoStatus {
  if (status === 'READY') return 'uploaded'
  if (status === 'FAILED') return 'failed'
  return 'processing'
}

function mapBackendStatus(status: VideoStatus | 'all'): string | null {
  if (status === 'uploaded') return 'READY'
  if (status === 'processing') return 'PENDING_UPLOAD'
  if (status === 'failed') return 'FAILED'
  return null
}

function mapApiVideo(video: ApiVideo): Video {
  return {
    id: video.id,
    teamId: video.team_id,
    title: video.title,
    storageUrl: video.storage_key,
    rivalName: video.description ?? undefined,
    uploadedAt: video.created_at,
    status: mapVideoStatus(video.status),
    resolution: video.mime_type ?? undefined,
  }
}

async function listTeamVideos(teamId: string, status?: string | null): Promise<Video[]> {
  const query = status
    ? `?team_id=${encodeURIComponent(teamId)}&status=${encodeURIComponent(status)}`
    : `?team_id=${encodeURIComponent(teamId)}`
  const data = await apiJson<{ videos: ApiVideo[] }>(`/videos${query}`)
  return data.videos.map(mapApiVideo)
}

export const apiVideoService: IVideoService = {
  canRequestAnalysis: false,

  async list(): Promise<Video[]> {
    const data = await apiJson<{ teams: ApiTeamRef[] }>('/teams')
    const videosByTeam = await Promise.all(data.teams.map((team) => listTeamVideos(team.id)))
    return videosByTeam.flat().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  },

  async getById(id: string): Promise<Video | null> {
    const videos = await this.list()
    return videos.find((video) => video.id === id) ?? null
  },

  async filterByTeam(teamId: string): Promise<Video[]> {
    return listTeamVideos(teamId)
  },

  async filterByStatus(status: VideoStatus | 'all'): Promise<Video[]> {
    if (status === 'analyzed') return []

    const backendStatus = mapBackendStatus(status)
    const data = await apiJson<{ teams: ApiTeamRef[] }>('/teams')
    const videosByTeam = await Promise.all(
      data.teams.map((team) => listTeamVideos(team.id, backendStatus)),
    )
    return videosByTeam.flat().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  },

  async upload(dto: UploadVideoDto): Promise<Video> {
    const file = dto.file
    const partCount = Math.max(1, Math.ceil(file.size / PART_SIZE_BYTES))
    const contentType = file.type || 'application/octet-stream'

    const init = await apiJson<InitUploadResponse>('/videos/upload/init', {
      method: 'POST',
      body: JSON.stringify({
        team_id: dto.teamId,
        title: dto.title,
        description: dto.description || null,
        content_type: contentType,
        part_count: partCount,
      }),
    })

    try {
      const parts = await Promise.all(
        init.parts.map(async (part) => {
          const start = (part.part_number - 1) * PART_SIZE_BYTES
          const chunk = file.slice(start, Math.min(start + PART_SIZE_BYTES, file.size))
          const etag = await uploadPart(part.presigned_part_url, chunk, contentType)
          return { part_number: part.part_number, etag }
        }),
      )

      const complete = await apiJson<{ video: ApiVideo }>(`/videos/${encodeURIComponent(init.video_id)}/upload/complete`, {
        method: 'POST',
        body: JSON.stringify({
          team_id: dto.teamId,
          mime_type: contentType,
          size_bytes: file.size,
          upload_id: init.upload_id,
          parts,
        }),
      })

      return mapApiVideo(complete.video)
    } catch (error) {
      await apiJson<void>(`/videos/${encodeURIComponent(init.video_id)}/upload/abort`, {
        method: 'POST',
        body: JSON.stringify({ team_id: dto.teamId, upload_id: init.upload_id }),
      }).catch(() => undefined)
      throw error
    }
  },

  async requestAnalysis(): Promise<Video> {
    throw new Error('El backend todavia no expone solicitud de analisis para videos')
  },
}
