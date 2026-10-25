import type { AddClipDto } from '../contracts/clip-collections.service.ts'
import type { ClipCollectionItem, Video, VideoStatus } from '../../types/index.ts'

export interface ApiClipCollectionItem {
  id: string
  collection_id: string
  start_ms: number
  end_ms: number
  description?: string | null
  position: number
  created_at: string
}

export interface ApiVideo {
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
  match_id: string | null
}

function mapVideoStatus(status: ApiVideo['status']): VideoStatus {
  if (status === 'READY') return 'uploaded'
  if (status === 'FAILED') return 'failed'
  return 'processing'
}

export function mapApiVideo(video: ApiVideo, playbackUrl = '', thumbnailUrl = ''): Video {
  return {
    id: video.id,
    matchId: video.match_id,
    teamId: video.team_id,
    title: video.title,
    storageUrl: playbackUrl,
    thumbnailUrl: thumbnailUrl || undefined,
    durationMs: video.duration_ms ?? undefined,
    description: video.description ?? undefined,
    uploadedAt: video.created_at,
    status: mapVideoStatus(video.status),
    resolution: video.mime_type ?? undefined,
  }
}

export function mapApiClipCollectionItem(item: ApiClipCollectionItem): ClipCollectionItem {
  return {
    id: item.id,
    collectionId: item.collection_id,
    startMs: item.start_ms,
    endMs: item.end_ms,
    description: item.description ?? null,
    position: item.position,
    createdAt: item.created_at,
  }
}

export function toClipPayload(clip: AddClipDto): {
  start_ms: number
  end_ms: number
  description?: string | null
} {
  const payload: {
    start_ms: number
    end_ms: number
    description?: string | null
  } = {
    start_ms: clip.startMs,
    end_ms: clip.endMs,
  }

  if (clip.description !== undefined) {
    payload.description = clip.description.trim() || null
  }

  return payload
}
