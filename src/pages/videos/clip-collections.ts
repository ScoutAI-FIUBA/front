import type { ClipCollection, ClipCollectionItem } from '@/types'

export function orderClipCollections(collections: ClipCollection[]): ClipCollection[] {
  const dated = collections.map((collection, index) => ({
    collection,
    index,
    updatedAt: Date.parse(collection.updatedAt),
  }))

  if (dated.some(({ updatedAt }) => !Number.isFinite(updatedAt))) {
    return [...collections]
  }

  return dated
    .sort((left, right) => right.updatedAt - left.updatedAt || left.index - right.index)
    .map(({ collection }) => collection)
}

export function orderClipItems(items: ClipCollectionItem[]): ClipCollectionItem[] {
  return [...items].sort((left, right) => left.position - right.position)
}

export function formatClipSeconds(value: number): string {
  const minutes = Math.floor(Math.max(0, value) / 60)
  const seconds = Math.floor(Math.max(0, value) % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function clipRange(item: ClipCollectionItem): string {
  return `${formatClipSeconds(item.startMs / 1000)}–${formatClipSeconds(item.endMs / 1000)}`
}

export function clipTitle(item: ClipCollectionItem): string {
  return item.description?.trim() || `Clip ${item.position} · ${clipRange(item)}`
}
