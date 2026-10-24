export interface GroupPlaybackPosition {
  frameIndex: number | null
  xM: number
  yM: number
}

export interface GroupPlaybackInput {
  key: string
  positions: GroupPlaybackPosition[]
}

/** One player's samples, sorted by time, as parallel arrays so lookups stay cheap. */
export interface GroupTrack {
  key: string
  times: number[]
  xs: number[]
  ys: number[]
}

export interface GroupTimeline {
  /** `frames`: shared video frame indices. `order`: per-player sample order (some frame index is missing). */
  mode: 'frames' | 'order'
  start: number
  end: number
  /** Distinct shared instants, ascending. */
  ticks: number[]
  /** Typical distance between two consecutive samples of one player, in timeline units. */
  spacing: number
  /** Longer holes than this hide the player instead of interpolating across them. */
  maxGap: number
  tracks: GroupTrack[]
}

export interface GroupPoint {
  xM: number
  yM: number
}

export interface TailSegment {
  x1: number
  y1: number
  x2: number
  y2: number
  opacity: number
}

export const GROUP_PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const
export const GROUP_PLAYBACK_TAILS = [
  { id: 'short', label: 'Corta', steps: 4 },
  { id: 'medium', label: 'Media', steps: 10 },
  { id: 'long', label: 'Larga', steps: 24 },
] as const
export type GroupPlaybackTailId = (typeof GROUP_PLAYBACK_TAILS)[number]['id']
export const GROUP_PLAYBACK_DEFAULT_TAIL: GroupPlaybackTailId = 'medium'

const GAP_FACTOR = 4
const MAX_TAIL_OPACITY = 0.9
const MIN_TAIL_OPACITY = 0.04
const MAX_TAIL_VERTICES = 120
const MAX_SPACING_SAMPLES = 20000
const MIN_PLAY_SECONDS = 8
const MAX_PLAY_SECONDS = 60
const SECONDS_PER_STEP = 0.12

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function buildTrack(input: GroupPlaybackInput, useFrames: boolean): GroupTrack {
  const rows = input.positions
    .filter((position) => finite(position.xM) && finite(position.yM))
    .map((position, index) => ({
      t: useFrames ? (position.frameIndex as number) : index,
      x: position.xM,
      y: position.yM,
    }))
  if (useFrames) rows.sort((a, b) => a.t - b.t)
  const track: GroupTrack = { key: input.key, times: [], xs: [], ys: [] }
  rows.forEach((row, index) => {
    // Two samples on the same instant cannot be interpolated: keep the first.
    if (index > 0 && row.t === rows[index - 1].t) return
    track.times.push(row.t)
    track.xs.push(row.x)
    track.ys.push(row.y)
  })
  return track
}

export function buildGroupTimeline(inputs: GroupPlaybackInput[]): GroupTimeline {
  const allFrames = inputs.every((input) => input.positions.every(
    (position) => finite(position.xM) && finite(position.yM) ? finite(position.frameIndex) : true,
  ))
  const mode = allFrames ? 'frames' : 'order'
  const tracks = inputs
    .map((input) => buildTrack(input, allFrames))
    .filter((track) => track.times.length > 0)

  const tickSet = new Set<number>()
  const diffs: number[] = []
  const stride = Math.max(1, Math.ceil(tracks.reduce((sum, track) => sum + track.times.length, 0) / MAX_SPACING_SAMPLES))
  tracks.forEach((track) => {
    track.times.forEach((time, index) => {
      tickSet.add(time)
      if (index > 0 && index % stride === 0) diffs.push(time - track.times[index - 1])
    })
  })
  const ticks = [...tickSet].sort((a, b) => a - b)
  const spacing = median(diffs.filter((diff) => diff > 0)) || 1
  return {
    mode,
    start: ticks[0] ?? 0,
    end: ticks[ticks.length - 1] ?? 0,
    ticks,
    spacing,
    maxGap: spacing * GAP_FACTOR,
    tracks,
  }
}

/** Index of the last element <= value, or -1. */
function lastIndexAtOrBefore(times: number[], value: number): number {
  let low = 0
  let high = times.length - 1
  let found = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (times[mid] <= value) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}

/**
 * Position of a player at `time`. Interpolates linearly between neighbouring samples; never
 * extrapolates: outside the first/last sample (beyond `tolerance`) or across a hole longer than
 * `maxGap` it returns null.
 */
export function pointAt(track: GroupTrack, time: number, tolerance: number, maxGap: number): GroupPoint | null {
  const count = track.times.length
  if (count === 0 || !finite(time)) return null
  const at = (index: number): GroupPoint => ({ xM: track.xs[index], yM: track.ys[index] })
  const before = lastIndexAtOrBefore(track.times, time)
  if (before < 0) return track.times[0] - time <= tolerance ? at(0) : null
  if (track.times[before] === time) return at(before)
  if (before === count - 1) return time - track.times[before] <= tolerance ? at(before) : null
  const after = before + 1
  const gap = track.times[after] - track.times[before]
  if (gap > maxGap) {
    if (time - track.times[before] <= tolerance) return at(before)
    if (track.times[after] - time <= tolerance) return at(after)
    return null
  }
  const ratio = (time - track.times[before]) / gap
  return {
    xM: track.xs[before] + (track.xs[after] - track.xs[before]) * ratio,
    yM: track.ys[before] + (track.ys[after] - track.ys[before]) * ratio,
  }
}

/** The instant the dot is really drawn at: `time`, or the sample it is held on near an edge or hole. */
function heldTime(track: GroupTrack, time: number, maxGap: number): number {
  const last = track.times.length - 1
  const before = lastIndexAtOrBefore(track.times, time)
  if (before < 0) return track.times[0]
  if (before === last) return track.times[last]
  const gap = track.times[before + 1] - track.times[before]
  if (gap <= maxGap) return time
  return time - track.times[before] <= track.times[before + 1] - time ? track.times[before] : track.times[before + 1]
}

/**
 * The fading tail behind the playhead: segments covering the last `span` timeline units, newest
 * most opaque, oldest nearly transparent. The tail stops at a long gap and is empty when the
 * player is hidden at the playhead.
 */
export function tailSegments(
  track: GroupTrack,
  time: number,
  span: number,
  tolerance: number,
  maxGap: number,
): TailSegment[] {
  if (!(span > 0)) return []
  const head = pointAt(track, time, tolerance, maxGap)
  if (!head) return []
  const headTime = heldTime(track, time, maxGap)

  const vertices: Array<{ t: number; x: number; y: number }> = [{ t: headTime, x: head.xM, y: head.yM }]
  const windowStart = headTime - span
  let index = lastIndexAtOrBefore(track.times, headTime)
  if (index >= 0 && track.times[index] === headTime) index -= 1
  while (index >= 0 && vertices.length < MAX_TAIL_VERTICES) {
    const t = track.times[index]
    const newer = vertices[vertices.length - 1]
    if (newer.t - t > maxGap) break
    if (t < windowStart) {
      const ratio = (newer.t - windowStart) / (newer.t - t)
      vertices.push({
        t: windowStart,
        x: newer.x + (track.xs[index] - newer.x) * ratio,
        y: newer.y + (track.ys[index] - newer.y) * ratio,
      })
      break
    }
    vertices.push({ t, x: track.xs[index], y: track.ys[index] })
    index -= 1
  }

  const segments: TailSegment[] = []
  for (let i = 0; i + 1 < vertices.length; i += 1) {
    const newer = vertices[i]
    const older = vertices[i + 1]
    const age = (headTime - (newer.t + older.t) / 2) / span
    const opacity = Math.max(MIN_TAIL_OPACITY, MAX_TAIL_OPACITY * (1 - Math.min(1, Math.max(0, age))))
    segments.push({ x1: older.x, y1: older.y, x2: newer.x, y2: newer.y, opacity })
  }
  return segments
}

export function timeAtProgress(timeline: GroupTimeline, progress: number): number {
  const clamped = Math.min(1, Math.max(0, finite(progress) ? progress : 0))
  return timeline.start + (timeline.end - timeline.start) * clamped
}

export function progressAtTime(timeline: GroupTimeline, time: number): number {
  const length = timeline.end - timeline.start
  if (!(length > 0)) return 0
  return Math.min(1, Math.max(0, (time - timeline.start) / length))
}

/** 1-based step shown to the user: how many shared instants the playhead has reached (min 1). */
export function stepAtTime(timeline: GroupTimeline, time: number): number {
  if (timeline.ticks.length === 0) return 0
  return Math.max(1, lastIndexAtOrBefore(timeline.ticks, time) + 1)
}

/** Seconds the whole replay takes at 1x: proportional to the number of steps, kept watchable. */
export function playbackDurationSeconds(timeline: GroupTimeline): number {
  const steps = timeline.spacing > 0 ? (timeline.end - timeline.start) / timeline.spacing : timeline.ticks.length
  return Math.min(MAX_PLAY_SECONDS, Math.max(MIN_PLAY_SECONDS, steps * SECONDS_PER_STEP))
}

export function advanceProgress(
  progress: number,
  elapsedSeconds: number,
  timeline: GroupTimeline,
  speed: number,
): { progress: number; ended: boolean } {
  const delta = Math.max(0, elapsedSeconds) * Math.max(0, speed) / playbackDurationSeconds(timeline)
  const next = Math.min(1, Math.max(0, progress) + delta)
  return { progress: next, ended: next >= 1 }
}

export function tailSpan(timeline: GroupTimeline, tailId: GroupPlaybackTailId): number {
  const tail = GROUP_PLAYBACK_TAILS.find((option) => option.id === tailId) ?? GROUP_PLAYBACK_TAILS[1]
  return tail.steps * timeline.spacing
}

/** Dot text: jersey number first, else the initials of the shared legend label, else a fallback. */
export function groupDotLabel(jerseyNumber: string | null, label: string | undefined, fallback: string): string {
  const jersey = jerseyNumber?.trim().replace(/^#/, '')
  if (jersey) return jersey
  const initials = (label ?? '')
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
  return initials || fallback
}
