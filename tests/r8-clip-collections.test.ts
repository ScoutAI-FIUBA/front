import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { orderClipCollections, orderClipItems } from '../src/pages/videos/clip-collections.ts'
import type { ClipCollection, ClipCollectionItem } from '../src/types/index.ts'

function collection(id: string, updatedAt: string): ClipCollection {
  return {
    id,
    videoId: 'video-1',
    teamId: 'team-1',
    ownerUserId: 'user-1',
    name: id,
    description: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
  }
}

function clip(id: string, position: number): ClipCollectionItem {
  return {
    id,
    collectionId: 'collection-1',
    startMs: position * 1_000,
    endMs: position * 1_000 + 5_000,
    position,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

test('collection order uses updatedAt only when every timestamp is valid', () => {
  const older = collection('older', '2026-01-01T00:00:00.000Z')
  const newer = collection('newer', '2026-02-01T00:00:00.000Z')
  assert.deepEqual(orderClipCollections([older, newer]).map(({ id }) => id), ['newer', 'older'])

  const invalid = collection('invalid', 'not-a-date')
  assert.deepEqual(orderClipCollections([older, invalid, newer]).map(({ id }) => id), ['older', 'invalid', 'newer'])
})

test('clip order follows backend position', () => {
  assert.deepEqual(orderClipItems([clip('third', 3), clip('first', 1), clip('second', 2)]).map(({ id }) => id), ['first', 'second', 'third'])
})

test('collection index stays editorial and returns to the video clips context', () => {
  const source = readFileSync(new URL('../src/pages/videos/VideoCollectionsPage.tsx', import.meta.url), 'utf8')
  assert.match(source, /videoDetailPath\(videoId, 'clips'\)/)
  assert.match(source, /loadCollections/)
  assert.match(source, /loadVideo/)
  assert.match(source, /orderedCollections\.map/)
  assert.match(source, /Crear primera colección/)
  assert.match(source, /clipCollectionService\.create/)
  assert.match(source, /divide-y divide-\[#252B37\]/)
  assert.doesNotMatch(source, /md:grid-cols-2 xl:grid-cols-3/)
  assert.doesNotMatch(source, /getDetail\(videoId, collection\.id\)/)
  assert.doesNotMatch(source, /colecci[oó]n (?:por defecto|autom[aá]tica)/i)
})

test('collection detail isolates the player, preserves range capture, and marks active clips', () => {
  const source = readFileSync(new URL('../src/pages/videos/VideoCollectionDetailPage.tsx', import.meta.url), 'utf8')
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_380px\]/)
  assert.match(source, /playerUnavailable/)
  assert.match(source, /Reintentar video/)
  assert.match(source, /videoRef\.current\?\.currentTime/)
  assert.match(source, /playingItemId === item\.id/)
  assert.match(source, /orderClipItems/)
  assert.match(source, /El clip sigue seleccionado/)
  assert.match(source, /orderedItems\.length === 1 \? 'clip' : 'clips'/)
  assert.match(source, /formatClipSeconds\(Number\(startSeconds\) \|\| 0\).*formatClipSeconds\(Number\(endSeconds\) \|\| 0\)/s)
  assert.match(source, /Usar actual/)
  assert.match(source, /import \{ ClipTimeline \}/)
  assert.match(source, /<ClipTimeline/)
  assert.match(source, /maxRangeSeconds=\{MAX_CLIP_DURATION_SECONDS\}/)
  assert.match(source, /onRangeChange=\{handleTimelineRangeChange\}/)
  assert.match(source, /exportInFlightRef\.current/)
  assert.match(source, /disabled=\{Boolean\(exportingId\)\}/)
  assert.match(source, /scout-display[^"]*truncate[^"]*"[^>]*>\{detail\.collection\.name\}/)
})

test('clip export has a dedicated timeout without changing the global request timeout', () => {
  const source = readFileSync(new URL('../src/services/api/clip-collections.api.ts', import.meta.url), 'utf8')

  assert.match(source, /CLIP_EXPORT_TIMEOUT_MS = 180_000/)
  assert.match(source, /timeoutMs: CLIP_EXPORT_TIMEOUT_MS/)
  assert.match(source, /timeoutMessage: CLIP_EXPORT_TIMEOUT_MESSAGE/)
})
