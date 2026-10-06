import { simulateNetwork } from '@/mocks/delays'
import { generateId, getStore, updateStore } from '@/mocks/store'
import type { ClipCollectionItem } from '@/types'
import type { AddClipDto, IClipCollectionService } from '../contracts/clip-collections.service'

const MAX_CLIP_DURATION_MS = 30_000

function ensureCollections() {
  const store = getStore()
  store.clipCollections ??= []
  store.clipCollectionItems ??= []
  return store
}

function validateRange(clip: AddClipDto, durationMs?: number): void {
  const rangeDuration = clip.endMs - clip.startMs
  if (
    !Number.isInteger(clip.startMs)
    || !Number.isInteger(clip.endMs)
    || clip.startMs < 0
    || clip.endMs <= clip.startMs
    || rangeDuration > MAX_CLIP_DURATION_MS
    || (durationMs != null && clip.endMs > durationMs)
  ) {
    throw new Error('El rango del clip no es válido. Debe durar como máximo 30 segundos y quedar dentro del video.')
  }
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
    const video = store.videos.find((item) => item.id === videoId)
    const collection = store.clipCollections.find(
      (item) => item.id === collectionId && item.videoId === videoId,
    )
    if (!video) throw new Error('Video no encontrado')
    if (!collection) throw new Error('Colección de clips no encontrada')
    clips.forEach((clip) => validateRange(clip, video.durationMs))
    const existing = store.clipCollectionItems.filter((item) => item.collectionId === collectionId)
    let position = Math.max(0, ...existing.map((item) => item.position)) + 1
    const created: ClipCollectionItem[] = clips.map((clip) => {
      const id = generateId('clip-item')
      const item = {
        id,
        collectionId,
        startMs: clip.startMs,
        endMs: clip.endMs,
        description: clip.description?.trim() || null,
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

  async exportClip(videoId, collectionId, itemId) {
    await simulateNetwork(600)
    const store = ensureCollections()
    const collectionExists = store.clipCollections.some(
      (item) => item.id === collectionId && item.videoId === videoId,
    )
    const itemExists = store.clipCollectionItems.some(
      (item) => item.id === itemId && item.collectionId === collectionId,
    )
    const video = store.videos.find((item) => item.id === videoId)
    if (!collectionExists) throw new Error('Colección de clips no encontrada')
    if (!itemExists) throw new Error('Clip no encontrado')
    if (!video?.storageUrl) throw new Error('No se pudo preparar la descarga del clip')
    return video.storageUrl
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
