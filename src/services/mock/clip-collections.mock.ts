import { simulateNetwork } from '@/mocks/delays'
import { generateId, getStore, updateStore } from '@/mocks/store'
import type { ClipCollectionItem } from '@/types'
import type { IClipCollectionService } from '../contracts/clip-collections.service'

function ensureCollections() {
  const store = getStore()
  store.clipCollections ??= []
  store.clipCollectionItems ??= []
  return store
}

function sanitizeFilename(filename: string): string {
  const leaf = filename.replace(/\\/g, '/').split('/').pop()?.trim() || 'clip'
  return leaf.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '') || 'clip'
}

export const mockClipCollectionService: IClipCollectionService = {
  async list(videoId) {
    await simulateNetwork()
    return ensureCollections().clipCollections
      .filter((collection) => collection.videoId === videoId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getDetail(videoId, collectionId) {
    await simulateNetwork()
    const store = ensureCollections()
    const collection = store.clipCollections.find(
      (item) => item.id === collectionId && item.videoId === videoId,
    )
    if (!collection) throw new Error('Colección de clips no encontrada')
    return {
      collection,
      items: store.clipCollectionItems
        .filter((item) => item.collectionId === collectionId)
        .sort((a, b) => a.position - b.position),
    }
  },

  async create(videoId, dto) {
    await simulateNetwork()
    const store = ensureCollections()
    const video = store.videos.find((item) => item.id === videoId)
    if (!video) throw new Error('Video no encontrado')
    const now = new Date().toISOString()
    const collection = {
      id: generateId('collection'),
      videoId,
      teamId: video.teamId,
      ownerUserId: store.users[0]?.id ?? 'user-1',
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }
    updateStore((draft) => {
      draft.clipCollections ??= []
      draft.clipCollections.unshift(collection)
    })
    return collection
  },

  async addClip(videoId, collectionId, dto) {
    const [item] = await this.addClips(videoId, collectionId, [dto])
    return item
  },

  async addClips(videoId, collectionId, clips) {
    await simulateNetwork()
    const store = ensureCollections()
    const collection = store.clipCollections.find(
      (item) => item.id === collectionId && item.videoId === videoId,
    )
    if (!collection) throw new Error('Colección de clips no encontrada')
    const existing = store.clipCollectionItems.filter((item) => item.collectionId === collectionId)
    let position = Math.max(0, ...existing.map((item) => item.position)) + 1
    const created: ClipCollectionItem[] = clips.map((clip) => {
      const id = generateId('clip-item')
      const item = {
        id,
        collectionId,
        filename: clip.filename.trim(),
        storageKey: `user/${collection.ownerUserId}/team/${collection.teamId}/video/${videoId}/collection/${collectionId}/clips/${id}-${sanitizeFilename(clip.filename)}`,
        cloudflareUrl: clip.cloudflareUrl.trim(),
        position,
        createdAt: new Date().toISOString(),
      }
      position += 1
      return item
    })
    updateStore((draft) => {
      draft.clipCollectionItems ??= []
      draft.clipCollectionItems.push(...created)
    })
    return created
  },

  async deleteClip(videoId, collectionId, itemId) {
    await simulateNetwork()
    const store = ensureCollections()
    const collectionExists = store.clipCollections.some(
      (item) => item.id === collectionId && item.videoId === videoId,
    )
    if (!collectionExists) throw new Error('Colección de clips no encontrada')
    const itemExists = store.clipCollectionItems.some(
      (item) => item.id === itemId && item.collectionId === collectionId,
    )
    if (!itemExists) throw new Error('Clip no encontrado')
    updateStore((draft) => {
      draft.clipCollectionItems = draft.clipCollectionItems.filter((item) => item.id !== itemId)
    })
  },
}
