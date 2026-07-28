import type {
  ClipCollection,
  ClipCollectionItem,
} from '@/types'
import type {
  AddClipDto,
  CreateClipCollectionDto,
  IClipCollectionService,
} from '../contracts/clip-collections.service'
import { apiJson } from './http-client'

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

interface ApiClipCollectionItem {
  id: string
  collection_id: string
  filename: string
  storage_key: string
  cloudflare_url: string
  position: number
  created_at: string
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

function mapItem(item: ApiClipCollectionItem): ClipCollectionItem {
  return {
    id: item.id,
    collectionId: item.collection_id,
    filename: item.filename,
    storageKey: item.storage_key,
    cloudflareUrl: item.cloudflare_url,
    position: item.position,
    createdAt: item.created_at,
  }
}

function toClipPayload(clip: AddClipDto) {
  return {
    filename: clip.filename,
    cloudflare_url: clip.cloudflareUrl,
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
      items: data.items.map(mapItem),
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
    return mapItem(data.item)
  },

  async addClips(videoId, collectionId, clips) {
    const data = await apiJson<{ items: ApiClipCollectionItem[] }>(
      `${collectionPath(videoId, collectionId)}/clips/batch`,
      {
        method: 'POST',
        body: JSON.stringify({ clips: clips.map(toClipPayload) }),
      },
    )
    return data.items.map(mapItem)
  },

  async deleteClip(videoId, collectionId, itemId) {
    await apiJson<void>(
      `${collectionPath(videoId, collectionId)}/clips/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
    )
  },
}
