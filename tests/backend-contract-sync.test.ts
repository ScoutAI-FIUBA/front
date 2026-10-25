import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  mapApiClipCollectionItem,
  mapApiVideo,
  toClipPayload,
  type ApiVideo,
} from '../src/services/api/contract-mappers.ts'

const apiVideo: ApiVideo = {
  id: 'video-1',
  team_id: 'team-1',
  storage_key: 'videos/team-1/video-1.mp4',
  title: 'Partido real',
  description: null,
  status: 'READY',
  mime_type: 'video/mp4',
  size_bytes: 12_000,
  duration_ms: 90_000,
  created_at: '2026-10-05T10:00:00Z',
  updated_at: '2026-10-05T10:00:00Z',
  match_id: null,
}

test('video detail maps the signed poster and remains compatible when it is absent', () => {
  const withPoster = mapApiVideo(
    apiVideo,
    'https://storage.example/video-signed',
    'https://storage.example/poster-signed',
  )
  assert.equal(withPoster.thumbnailUrl, 'https://storage.example/poster-signed')

  const legacy = mapApiVideo(apiVideo, 'https://storage.example/video-signed')
  assert.equal(legacy.thumbnailUrl, undefined)
  assert.equal(legacy.matchId, null)

  const linked = mapApiVideo({ ...apiVideo, match_id: 'match-1' })
  assert.equal(linked.matchId, 'match-1')

  const apiSource = readFileSync(new URL('../src/services/api/videos.api.ts', import.meta.url), 'utf8')
  assert.match(apiSource, /presigned_thumbnail_url\?: string \| null/)
  assert.match(apiSource, /data\.presigned_thumbnail_url \?\? ''/)
})

test('mock video uploads start without inventing a match association', () => {
  const source = readFileSync(new URL('../src/services/mock/videos.mock.ts', import.meta.url), 'utf8')
  const store = readFileSync(new URL('../src/mocks/store.ts', import.meta.url), 'utf8')
  assert.match(source, /matchId: null/)
  assert.doesNotMatch(source, /matchId: ''/)
  assert.match(store, /matchId: video\.matchId \|\| null/)
})

test('clip responses map persisted descriptions and normalize legacy responses', () => {
  const base = {
    id: 'clip-1',
    collection_id: 'collection-1',
    start_ms: 42_000,
    end_ms: 55_000,
    position: 1,
    created_at: '2026-10-05T10:00:00Z',
  }

  assert.equal(mapApiClipCollectionItem({ ...base, description: 'Defensa zonal' }).description, 'Defensa zonal')
  assert.equal(mapApiClipCollectionItem(base).description, null)
  assert.equal(mapApiClipCollectionItem({ ...base, description: null }).description, null)
})

test('clip creation sends a real description but keeps it optional for older callers', () => {
  assert.deepEqual(
    toClipPayload({ startMs: 42_000, endMs: 55_000, description: '  Pick and roll  ' }),
    { start_ms: 42_000, end_ms: 55_000, description: 'Pick and roll' },
  )
  assert.deepEqual(
    toClipPayload({ startMs: 42_000, endMs: 55_000 }),
    { start_ms: 42_000, end_ms: 55_000 },
  )
})

test('both real clip creation flows forward the user label as description', () => {
  const manualSource = readFileSync(new URL('../src/pages/analysis/AnalysisNewPage.tsx', import.meta.url), 'utf8')
  const collectionSource = readFileSync(new URL('../src/pages/videos/VideoCollectionDetailPage.tsx', import.meta.url), 'utf8')

  assert.match(manualSource, /description: clip\.label\.trim\(\) \|\| undefined/)
  assert.match(collectionSource, /description: clipDescription\.trim\(\) \|\| undefined/)
  assert.match(collectionSource, /maxLength=\{200\}/)
})
