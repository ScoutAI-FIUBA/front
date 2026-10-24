import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  GROUP_PLAYBACK_TAILS,
  advanceProgress,
  buildGroupTimeline,
  groupDotLabel,
  playbackDurationSeconds,
  pointAt,
  progressAtTime,
  stepAtTime,
  tailSegments,
  tailSpan,
  timeAtProgress,
  type GroupPlaybackPosition,
} from '../src/components/analysis/court-positions-group-playback.ts'

function pos(frameIndex: number | null, xM: number, yM = 0): GroupPlaybackPosition {
  return { frameIndex, xM, yM }
}

function twoPlayers() {
  return buildGroupTimeline([
    { key: 'a', positions: [pos(0, 0), pos(10, 10), pos(20, 20), pos(30, 30)] },
    { key: 'b', positions: [pos(5, 1, 1), pos(15, 3, 3)] },
  ])
}

test('builds a shared sorted timeline from all frame indices', () => {
  const timeline = twoPlayers()
  assert.equal(timeline.mode, 'frames')
  assert.deepEqual(timeline.ticks, [0, 5, 10, 15, 20, 30])
  assert.equal(timeline.start, 0)
  assert.equal(timeline.end, 30)
  assert.equal(timeline.spacing, 10)
  assert.equal(timeline.maxGap, 40)
  assert.equal(timeline.tracks.length, 2)
})

test('sorts unsorted samples and drops duplicate instants', () => {
  const timeline = buildGroupTimeline([{ key: 'a', positions: [pos(20, 2), pos(0, 0), pos(10, 1), pos(10, 9)] }])
  assert.deepEqual(timeline.tracks[0].times, [0, 10, 20])
  assert.deepEqual(timeline.tracks[0].xs, [0, 1, 2])
})

test('interpolates linearly between neighbouring samples and returns exact samples', () => {
  const [a] = twoPlayers().tracks
  assert.deepEqual(pointAt(a, 10, 10, 40), { xM: 10, yM: 0 })
  assert.deepEqual(pointAt(a, 15, 10, 40), { xM: 15, yM: 0 })
  assert.deepEqual(pointAt(a, 2.5, 10, 40), { xM: 2.5, yM: 0 })
})

test('does not extrapolate: hides the dot beyond the tolerance outside first/last sample', () => {
  const b = twoPlayers().tracks[1]
  assert.equal(pointAt(b, 0, 4, 40), null)
  assert.deepEqual(pointAt(b, 2, 4, 40), { xM: 1, yM: 1 })
  assert.equal(pointAt(b, 25, 4, 40), null)
  assert.deepEqual(pointAt(b, 17, 4, 40), { xM: 3, yM: 3 })
  assert.equal(pointAt(b, Number.NaN, 4, 40), null)
})

test('hides the dot across a gap longer than maxGap but holds near its edges', () => {
  const timeline = buildGroupTimeline([{ key: 'a', positions: [pos(0, 0), pos(10, 1), pos(200, 50), pos(210, 51)] }])
  const [a] = timeline.tracks
  assert.equal(timeline.spacing, 10)
  assert.equal(pointAt(a, 100, timeline.spacing, timeline.maxGap), null)
  assert.deepEqual(pointAt(a, 15, timeline.spacing, timeline.maxGap), { xM: 1, yM: 0 })
  assert.deepEqual(pointAt(a, 195, timeline.spacing, timeline.maxGap), { xM: 50, yM: 0 })
})

test('tail fades with age and is ordered newest first with decreasing opacity', () => {
  const [a] = twoPlayers().tracks
  const segments = tailSegments(a, 25, 20, 10, 40)
  assert.ok(segments.length >= 2)
  assert.deepEqual({ x: segments[0].x2, y: segments[0].y2 }, { x: 25, y: 0 })
  for (let i = 1; i < segments.length; i += 1) assert.ok(segments[i].opacity < segments[i - 1].opacity)
  assert.ok(segments[0].opacity <= 0.9)
  assert.ok(segments[segments.length - 1].opacity >= 0.04)
  // The oldest vertex is interpolated exactly at the window start (t = 5 -> x = 5).
  assert.equal(segments[segments.length - 1].x1, 5)
})

test('tail is empty when the player is hidden, span is zero, or only one sample exists', () => {
  const timeline = twoPlayers()
  assert.deepEqual(tailSegments(timeline.tracks[1], 0, 20, 4, 40), [])
  assert.deepEqual(tailSegments(timeline.tracks[0], 15, 0, 10, 40), [])
  const single = buildGroupTimeline([{ key: 's', positions: [pos(7, 4, 4)] }])
  assert.deepEqual(tailSegments(single.tracks[0], 7, 10, 1, 4), [])
  assert.deepEqual(pointAt(single.tracks[0], 7, 1, 4), { xM: 4, yM: 4 })
})

test('tail stops at a long gap instead of drawing a line across it', () => {
  const timeline = buildGroupTimeline([{ key: 'a', positions: [pos(0, 0), pos(10, 1), pos(20, 2), pos(300, 9), pos(310, 10)] }])
  const segments = tailSegments(timeline.tracks[0], 310, 1000, timeline.spacing, timeline.maxGap)
  assert.equal(segments.length, 1)
  assert.equal(segments[0].x1, 9)
})

test('tail never exceeds its vertex cap for very dense data', () => {
  const positions = Array.from({ length: 5000 }, (_, i) => pos(i, i))
  const timeline = buildGroupTimeline([{ key: 'a', positions }])
  const segments = tailSegments(timeline.tracks[0], 4999, 4000, 1, 4)
  assert.ok(segments.length <= 120)
})

test('falls back to sample order when any frame index is missing', () => {
  const timeline = buildGroupTimeline([
    { key: 'a', positions: [pos(0, 0), pos(null, 1), pos(20, 2)] },
    { key: 'b', positions: [pos(3, 5), pos(4, 6)] },
  ])
  assert.equal(timeline.mode, 'order')
  assert.deepEqual(timeline.tracks[0].times, [0, 1, 2])
  assert.deepEqual(timeline.tracks[1].times, [0, 1])
  assert.deepEqual(timeline.ticks, [0, 1, 2])
  assert.equal(timeline.spacing, 1)
})

test('handles empty input, players without samples and a single instant', () => {
  const empty = buildGroupTimeline([])
  assert.equal(empty.tracks.length, 0)
  assert.equal(stepAtTime(empty, 0), 0)
  assert.equal(progressAtTime(empty, 0), 0)
  const none = buildGroupTimeline([{ key: 'a', positions: [] }])
  assert.equal(none.tracks.length, 0)
  const one = buildGroupTimeline([{ key: 'a', positions: [pos(9, 1)] }])
  assert.equal(one.ticks.length, 1)
  assert.equal(one.spacing, 1)
  assert.equal(timeAtProgress(one, 0.7), 9)
  assert.equal(progressAtTime(one, 9), 0)
  assert.equal(stepAtTime(one, 9), 1)
})

test('maps progress to time and to a 1-based step', () => {
  const timeline = twoPlayers()
  assert.equal(timeAtProgress(timeline, -1), 0)
  assert.equal(timeAtProgress(timeline, 0.5), 15)
  assert.equal(timeAtProgress(timeline, 2), 30)
  assert.equal(progressAtTime(timeline, 15), 0.5)
  assert.equal(stepAtTime(timeline, 0), 1)
  assert.equal(stepAtTime(timeline, 12), 3)
  assert.equal(stepAtTime(timeline, 30), 6)
})

test('speed scales the advance, duration is bounded, and the end is reported', () => {
  const timeline = twoPlayers()
  const duration = playbackDurationSeconds(timeline)
  assert.ok(duration >= 8 && duration <= 60)
  const normal = advanceProgress(0, 1, timeline, 1)
  const fast = advanceProgress(0, 1, timeline, 4)
  assert.ok(Math.abs(fast.progress - normal.progress * 4) < 1e-9)
  assert.equal(normal.ended, false)
  assert.deepEqual(advanceProgress(0.99, 1000, timeline, 1), { progress: 1, ended: true })
  assert.equal(advanceProgress(0.5, -3, timeline, 1).progress, 0.5)
  const huge = buildGroupTimeline([{ key: 'a', positions: Array.from({ length: 100000 }, (_, i) => pos(i * 5, i)) }])
  assert.equal(playbackDurationSeconds(huge), 60)
})

test('tail length is a number of typical steps', () => {
  const timeline = twoPlayers()
  assert.deepEqual(GROUP_PLAYBACK_TAILS.map((tail) => tail.label), ['Corta', 'Media', 'Larga'])
  assert.equal(tailSpan(timeline, 'short'), 4 * timeline.spacing)
  assert.ok(tailSpan(timeline, 'long') > tailSpan(timeline, 'medium'))
})

test('dot label prefers jersey, then legend initials, then fallback', () => {
  assert.equal(groupDotLabel('10', 'Ana Perez', 'J'), '10')
  assert.equal(groupDotLabel('#7', undefined, 'J'), '7')
  assert.equal(groupDotLabel(null, 'ana perez gomez', 'J'), 'AP')
  assert.equal(groupDotLabel(' ', '#12', '3'), '3')
  assert.equal(groupDotLabel(null, undefined, 'J'), 'J')
})

test('survives heavily fragmented data with many partial players', () => {
  const inputs = Array.from({ length: 40 }, (_, p) => ({
    key: `p${p}`,
    positions: Array.from({ length: 3 }, (_, i) => pos(p * 7 + i * 5, p, i)),
  }))
  const timeline = buildGroupTimeline(inputs)
  for (let p = 0; p <= 1; p += 0.05) {
    const time = timeAtProgress(timeline, p)
    timeline.tracks.forEach((track) => {
      pointAt(track, time, timeline.spacing, timeline.maxGap)
      tailSegments(track, time, tailSpan(timeline, 'long'), timeline.spacing, timeline.maxGap)
    })
  }
  assert.equal(timeline.tracks.length, 40)
})

test('page wires the joint replay opt-in, defaulting to the full route', () => {
  const page = readFileSync(new URL('../src/pages/analysis/AnalysisJobCourtPositions.tsx', import.meta.url), 'utf8')
  assert.match(page, /useState<CourtPositionsGroupMode>\('full'\)/)
  assert.match(page, /Recorrido completo/)
  assert.match(page, /Reproducir juntos/)
  assert.equal((page.match(/<CourtPositionsGroupPlayback/g) ?? []).length, 2)
  assert.equal((page.match(/<GroupModeToggle/g) ?? []).length, 2)
  assert.match(page, /\[filter, job\.ourTeamSide\]/)
  assert.doesNotMatch(page, /muestras/i)
})

test('group playback component fits the window, honours reduced motion and avoids jargon', () => {
  const source = readFileSync(new URL('../src/components/analysis/CourtPositionsGroupPlayback.tsx', import.meta.url), 'utf8')
  assert.match(source, /courtFrameStyle\(court\)/)
  assert.match(source, /courtColumnStyle\(court\)/)
  assert.match(source, /useReducedMotion\(\)/)
  assert.match(source, /requestAnimationFrame/)
  assert.match(source, /cancelAnimationFrame/)
  assert.match(source, /Reproducir/)
  assert.match(source, /Pausar/)
  assert.match(source, /Paso \$\{step\} de \$\{stepCount\}/)
  assert.match(source, /No representa tiempo real ni está sincronizado con el video/)
  assert.match(source, /type="range"/)
  assert.doesNotMatch(source, /muestras|minutos/i)
  const pure = readFileSync(new URL('../src/components/analysis/court-positions-group-playback.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(pure, /from '@\//)
})
