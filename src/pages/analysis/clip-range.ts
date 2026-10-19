export interface ClipRangeUpdateInput {
  start: number
  end: number
  duration: number
  maxDuration: number
  previousStart: number | null
  previousEnd: number | null
}

export interface ClipRangeUpdate {
  start: number
  end: number
  previewTime: number | null
}

export function clampClipTime(value: number, duration: number): number {
  return Math.min(Math.max(value, 0), duration)
}

export function normalizeClipRangeUpdate({
  start,
  end,
  duration,
  maxDuration,
  previousStart,
  previousEnd,
}: ClipRangeUpdateInput): ClipRangeUpdate | null {
  if (
    !Number.isFinite(start)
    || !Number.isFinite(end)
    || !Number.isFinite(duration)
    || duration <= 0
  ) return null

  let nextStart = clampClipTime(start, duration)
  let nextEnd = clampClipTime(end, duration)
  if (nextEnd <= nextStart) return null

  const startChanged = previousStart == null || Math.abs(nextStart - previousStart) > 0.01
  const endChanged = previousEnd == null || Math.abs(nextEnd - previousEnd) > 0.01

  if (nextEnd - nextStart > maxDuration) {
    if (startChanged) nextStart = Math.max(0, nextEnd - maxDuration)
    else nextEnd = Math.min(duration, nextStart + maxDuration)
  }

  const roundedStart = Math.round(nextStart * 10) / 10
  const roundedEnd = Math.round(nextEnd * 10) / 10
  return {
    start: roundedStart,
    end: roundedEnd,
    previewTime: startChanged ? roundedStart : endChanged ? roundedEnd : null,
  }
}

export function clipPreviewStart(
  activeClipEnd: number | null,
  start: number,
  end: number,
  duration: number,
): number | null {
  if (activeClipEnd != null) return null
  if (!Number.isFinite(start) || !Number.isFinite(end) || duration <= 0) return null
  if (start < 0 || end <= start || end > duration) return null
  return start
}

export function hasReachedClipEnd(currentTime: number, activeClipEnd: number | null): boolean {
  return activeClipEnd != null && currentTime >= activeClipEnd
}
