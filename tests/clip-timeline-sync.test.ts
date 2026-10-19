import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  clipPreviewStart,
  hasReachedClipEnd,
  normalizeClipRangeUpdate,
} from '../src/pages/analysis/clip-range.ts'
import {
  buildTimelineThumbnails,
  configureTimelineThumbnailVideo,
  timelineThumbnailTimes,
} from '../src/pages/analysis/clip-thumbnails.ts'

test('dragging the start previews the new start without changing the end', () => {
  const update = normalizeClipRangeUpdate({
    start: 6,
    end: 12,
    duration: 60,
    maxDuration: 30,
    previousStart: 2,
    previousEnd: 12,
  })

  assert.deepEqual(update, { start: 6, end: 12, previewTime: 6 })
})

test('dragging the end previews the new end without changing the start', () => {
  const update = normalizeClipRangeUpdate({
    start: 6,
    end: 18,
    duration: 60,
    maxDuration: 30,
    previousStart: 6,
    previousEnd: 12,
  })

  assert.deepEqual(update, { start: 6, end: 18, previewTime: 18 })
})

test('range changes preserve the thirty-second maximum from either edge', () => {
  assert.deepEqual(
    normalizeClipRangeUpdate({
      start: 6,
      end: 50,
      duration: 90,
      maxDuration: 30,
      previousStart: 6,
      previousEnd: 12,
    }),
    { start: 6, end: 36, previewTime: 36 },
  )
  assert.deepEqual(
    normalizeClipRangeUpdate({
      start: 0,
      end: 40,
      duration: 90,
      maxDuration: 30,
      previousStart: 20,
      previousEnd: 40,
    }),
    { start: 10, end: 40, previewTime: 10 },
  )
})

test('selection playback starts at the selected beginning and pauses at its end', () => {
  assert.equal(clipPreviewStart(null, 6, 12, 60), 6)
  assert.equal(clipPreviewStart(12, 6, 12, 60), null)
  assert.equal(hasReachedClipEnd(11.9, 12), false)
  assert.equal(hasReachedClipEnd(12, 12), true)
})

test('numeric range updates use the same normalization and preview rules', () => {
  const update = normalizeClipRangeUpdate({
    start: Number('7.5'),
    end: Number('11.2'),
    duration: 60,
    maxDuration: 30,
    previousStart: 6,
    previousEnd: 11.2,
  })

  assert.deepEqual(update, { start: 7.5, end: 11.2, previewTime: 7.5 })
})

test('thumbnail video enables anonymous CORS before assigning the signed URL', () => {
  const writes: string[] = []
  const video = {
    muted: false,
    preload: '',
    playsInline: false,
    get crossOrigin() { return null },
    set crossOrigin(value: string | null) { writes.push(`crossOrigin:${value}`) },
    get src() { return '' },
    set src(value: string) { writes.push(`src:${value}`) },
  }

  configureTimelineThumbnailVideo(video, 'https://signed.example/video.mp4')

  assert.deepEqual(writes, [
    'crossOrigin:anonymous',
    'src:https://signed.example/video.mp4',
  ])
  assert.equal(video.muted, true)
  assert.equal(video.preload, 'auto')
  assert.equal(video.playsInline, true)
})

test('thumbnail generation distributes real captures and falls back when Canvas is blocked', async () => {
  const times = timelineThumbnailTimes(120, 4)
  assert.deepEqual(times, [15, 45, 75, 105])

  const sought: number[] = []
  let frame = 0
  const thumbnails = await buildTimelineThumbnails(
    120,
    4,
    async (time) => { sought.push(time) },
    () => `data:image/jpeg;base64,frame-${frame += 1}`,
  )
  assert.deepEqual(sought, times)
  assert.equal(thumbnails.length, 4)

  const blocked = await buildTimelineThumbnails(
    120,
    4,
    async () => undefined,
    () => { throw new DOMException('Canvas is tainted', 'SecurityError') },
  )
  assert.deepEqual(blocked, [])
})

test('collection editor wires dragging, numeric fields, play and pause to one range', () => {
  const source = readFileSync(
    new URL('../src/pages/videos/VideoCollectionDetailPage.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /normalizeClipRangeUpdate/)
  assert.match(source, /handleTimelineSeek\(update\.previewTime\)/)
  assert.match(source, /handleNumericRangeChange\('start'/)
  assert.match(source, /handleNumericRangeChange\('end'/)
  assert.match(source, /onPlay=\{handleVideoPlay\}/)
  assert.match(source, /hasReachedClipEnd\(player\.currentTime, activeClipEndRef\.current\)/)
})

test('timeline keeps shared pointer and keyboard controls for mouse, touch and accessibility', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/ClipTimeline.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /onPointerDown=\{\(event\) => handleEdgePointerDown\(event, edge\)\}/)
  assert.match(source, /onPointerMove=\{\(event\) => handleEdgePointerMove\(event, edge\)\}/)
  assert.match(source, /onPointerUp=\{handleEdgePointerUp\}/)
  assert.match(source, /onPointerCancel=\{handleEdgePointerUp\}/)
  assert.match(source, /onKeyDown=\{\(event\) => handleEdgeKeyDown\(event, edge\)\}/)
  assert.match(source, /touch-none/)
})
