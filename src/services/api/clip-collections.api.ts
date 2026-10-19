import type {
  ClipCollection,
} from '@/types'
import type {
  CreateClipCollectionDto,
  IClipCollectionService,
} from '../contracts/clip-collections.service'
import { apiJson } from './http-client'
import {
  mapApiClipCollectionItem,
  toClipPayload,
  type ApiClipCollectionItem,
} from './contract-mappers'

export const CLIP_EXPORT_TIMEOUT_MS = 180_000
export const CLIP_EXPORT_TIMEOUT_MESSAGE =
  'La exportación está tardando más de lo esperado. No vuelvas a iniciarla todavía; intentá nuevamente en unos minutos.'

interface ApiClipCollection {
  id: string
  video_id: string
  team_id: string
  owner_user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

function collectionPath(videoId: string, collectionId?: string): string {
  const base = `/videos/${encodeURIComponent(videoId)}/collections`
  return collectionId ? `${base}/${encodeURIComponent(collectionId)}` : base
}

function mapCollection(collection: ApiClipCollection): ClipCollection {
  return {
    id: collection.id,
    videoId: collection.video_id,
    teamId: collection.team_id,
    ownerUserId: collection.owner_user_id,
    name: collection.name,
    description: collection.description,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
  }
}

export const apiClipCollectionService: IClipCollectionService = {
  async list(videoId) {
    const data = await apiJson<{ collections: ApiClipCollection[] }>(collectionPath(videoId))
    return data.collections.map(mapCollection)
  },

  async getDetail(videoId, collectionId) {
    const data = await apiJson<{
      collection: ApiClipCollection
      items: ApiClipCollectionItem[]
    }>(collectionPath(videoId, collectionId))
    return {
      collection: mapCollection(data.collection),
      items: data.items.map(mapApiClipCollectionItem),
    }
  },

  async create(videoId, dto: CreateClipCollectionDto) {
    const data = await apiJson<{ collection: ApiClipCollection }>(collectionPath(videoId), {
      method: 'POST',
      body: JSON.stringify({
        name: dto.name,
        description: dto.description || null,
      }),
    })
    return mapCollection(data.collection)
  },

  async addClip(videoId, collectionId, dto) {
    const data = await apiJson<{ item: ApiClipCollectionItem }>(
      `${collectionPath(videoId, collectionId)}/clips`,
      {
        method: 'POST',
        body: JSON.stringify(toClipPayload(dto)),
      },
    )
    return mapApiClipCollectionItem(data.item)
  },

  async addClips(videoId, collectionId, clips) {
    const data = await apiJson<{ items: ApiClipCollectionItem[] }>(
      `${collectionPath(videoId, collectionId)}/clips/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ clips: clips.map(toClipPayload) }),
      },
    )
    return data.items.map(mapApiClipCollectionItem)
  },

  async exportClip(videoId, collectionId, itemId) {
    const data = await apiJson<{ download_url: string }>(
      `${collectionPath(videoId, collectionId)}/clips/${encodeURIComponent(itemId)}/export`,
      { method: 'POST' },
      {
        timeoutMs: CLIP_EXPORT_TIMEOUT_MS,
        timeoutMessage: CLIP_EXPORT_TIMEOUT_MESSAGE,
      },
    )
    return data.download_url
  },

  async deleteClip(videoId, collectionId, itemId) {
    await apiJson<void>(
      `${collectionPath(videoId, collectionId)}/clips/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
    )
  },
}
