import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { afterEach } from 'node:test'
import {
  cachedMatchPoster,
  clearMatchPosterCache,
  requestMatchPoster,
} from '../src/pages/matches/match-posters.ts'
import type { Video } from '../src/types/index.ts'

function video(id: string, thumbnailUrl?: string): Video {
  return {
    id,
    teamId: 'team-1',
    title: `Partido ${id}`,
    storageUrl: `https://storage.example/${id}.mp4`,
    thumbnailUrl,
    uploadedAt: '2026-10-05T10:00:00Z',
    status: 'uploaded',
  }
}

afterEach(() => {
  clearMatchPosterCache()
})

test('an available poster is returned and reused from the session cache', async () => {
  let requests = 0
  const source = video('video-1')
  const loader = async () => {
    requests += 1
    return video(source.id, 'https://storage.example/poster-signed')
  }

  assert.equal(await requestMatchPoster(source, loader), 'https://storage.example/poster-signed')
  assert.equal(await requestMatchPoster(source, loader), 'https://storage.example/poster-signed')
  assert.equal(requests, 1)
})

test('a signed poster expires from cache before the backend 3600-second URL limit', async () => {
  const loadedAt = 1_000
  const source = video('video-expiring')
  await requestMatchPoster(
    source,
    async () => video(source.id, 'https://storage.example/expiring.jpg'),
    loadedAt,
  )

  assert.equal(cachedMatchPoster(source.id, loadedAt + 55 * 60 * 1000 - 1), 'https://storage.example/expiring.jpg')
  assert.equal(cachedMatchPoster(source.id, loadedAt + 55 * 60 * 1000), undefined)
})

test('a null poster keeps a cached fallback without failing', async () => {
  let requests = 0
  const source = video('video-null')
  const loader = async () => {
    requests += 1
    return video(source.id)
  }

  assert.equal(await requestMatchPoster(source, loader), null)
  assert.equal(await requestMatchPoster(source, loader), null)
  assert.equal(requests, 1)
})

test('an individual poster failure resolves to the fallback and does not retry immediately', async () => {
  let requests = 0
  const source = video('video-failed')
  const loader = async (): Promise<Video> => {
    requests += 1
    throw new Error('temporary poster failure')
  }

  assert.equal(await requestMatchPoster(source, loader), null)
  assert.equal(await requestMatchPoster(source, loader), null)
  assert.equal(requests, 1)
})

test('multiple videos never exceed four simultaneous detail requests', async () => {
  let active = 0
  let peak = 0
  const sources = Array.from({ length: 9 }, (_, index) => video(`video-${index + 1}`))

  const posters = await Promise.all(sources.map((source) => requestMatchPoster(source, async () => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise<void>((resolve) => setTimeout(resolve, 2))
    active -= 1
    return video(source.id, `https://storage.example/${source.id}.jpg`)
  })))

  assert.equal(peak, 4)
  assert.equal(posters.length, 9)
  assert.ok(posters.every(Boolean))
})

test('the schematic fallback remains available while a poster request is pending', async () => {
  const source = video('video-pending')
  let finish: ((value: Video) => void) | undefined
  const pending = requestMatchPoster(source, () => new Promise<Video>((resolve) => {
    finish = resolve
  }))

  assert.equal(cachedMatchPoster(source.id), undefined)

  const pageSource = readFileSync(new URL('../src/pages/matches/MatchesPage.tsx', import.meta.url), 'utf8')
  assert.match(pageSource, /posterUrl \? \([\s\S]*?<img[\s\S]*?: \([\s\S]*?<BasketballCourtLines/)

  assert.ok(finish)
  finish(video(source.id, 'https://storage.example/pending.jpg'))
  assert.equal(await pending, 'https://storage.example/pending.jpg')
})

test('poster failures stay isolated and the catalog hydration remains usable', async () => {
  const sources = [video('good-1'), video('bad'), video('good-2')]
  const posters = await Promise.all(sources.map((source) => requestMatchPoster(source, async () => {
    if (source.id === 'bad') throw new Error('isolated failure')
    return video(source.id, `https://storage.example/${source.id}.jpg`)
  })))

  assert.deepEqual(posters, [
    'https://storage.example/good-1.jpg',
    null,
    'https://storage.example/good-2.jpg',
  ])
})
