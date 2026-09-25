import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { IVideoService } from '../src/services/contracts/videos.service.ts'
import type { Video } from '../src/types/index.ts'
import {
  canOpenVideoPlayback,
  loadVideoPlayback,
} from '../src/pages/videos/video-playback.ts'

const readyVideo: Video = {
  id: 'video-ready',
  teamId: 'team-1',
  title: 'Partido disponible',
  storageUrl: '',
  uploadedAt: '2026-09-24T20:00:00.000Z',
  status: 'uploaded',
}

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('only ready videos expose direct playback', () => {
  assert.equal(canOpenVideoPlayback(readyVideo), true)

  for (const status of ['processing', 'failed', 'analyzed'] as const) {
    assert.equal(canOpenVideoPlayback({ ...readyVideo, status }), false)
  }

  const pageSource = readSource('../src/pages/videos/VideosPage.tsx')
  assert.match(pageSource, /canOpenVideoPlayback\(video\)/)
  assert.match(pageSource, /onClick=\{\(\) => onPlayVideo\(video\)\}/)
  assert.match(pageSource, /> Ver video/)
})

test('opening playback requests detail and returns its fresh URL', async () => {
  const requestedIds: string[] = []
  const videos = {
    getById: async (videoId: string) => {
      requestedIds.push(videoId)
      return { ...readyVideo, storageUrl: 'https://video.example/fresh-playback-url' }
    },
  } satisfies Pick<IVideoService, 'getById'>

  const loaded = await loadVideoPlayback(readyVideo.id, videos)

  assert.deepEqual(requestedIds, [readyVideo.id])
  assert.equal(loaded.storageUrl, 'https://video.example/fresh-playback-url')

  const dialogSource = readSource('../src/pages/videos/VideoPlaybackDialog.tsx')
  assert.match(dialogSource, /loadVideoPlayback\(video\.id, videoService\)/)
  assert.match(dialogSource, /src=\{playbackVideo\.storageUrl\}/)
})

test('playback keeps loading, error, retry, and close inside its dialog', async () => {
  const dialogSource = readSource('../src/pages/videos/VideoPlaybackDialog.tsx')

  assert.match(dialogSource, /useState<PlaybackState>\('loading'\)/)
  assert.match(dialogSource, /Preparando video/)
  assert.match(dialogSource, /setState\('error'\)/)
  assert.match(dialogSource, />\s*Reintentar\s*</)
  assert.match(dialogSource, /<DialogClose asChild>/)
  assert.match(dialogSource, /onClose\(\)/)
  assert.doesNotMatch(dialogSource, /setLoadState/)

  await assert.rejects(
    loadVideoPlayback(readyVideo.id, { getById: async () => null }),
    /VIDEO_PLAYBACK_UNAVAILABLE/,
  )
})
