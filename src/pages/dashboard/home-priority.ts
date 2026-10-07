import type { MatchLibraryItem } from '../matches/match-library.ts'

function timestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function activeTimestamp(item: MatchLibraryItem): number {
  if (item.latestJob) {
    return timestamp(item.latestJob.updatedAt) || timestamp(item.latestJob.createdAt)
  }
  return timestamp(item.video.uploadedAt)
}

export function homeLifecycleTimestamp(item: MatchLibraryItem): number {
  if (item.latestJob) {
    return timestamp(item.latestJob.finishedAt)
      || timestamp(item.latestJob.updatedAt)
      || timestamp(item.latestJob.createdAt)
  }
  return timestamp(item.video.uploadedAt)
}

function newest(
  items: readonly MatchLibraryItem[],
  dateFor: (item: MatchLibraryItem) => number,
): MatchLibraryItem | null {
  return [...items].sort((left, right) => dateFor(right) - dateFor(left))[0] ?? null
}

export function selectHomePriorityMatch(
  items: readonly MatchLibraryItem[],
): MatchLibraryItem | null {
  const running = newest(
    items.filter(({ analysisState }) => analysisState === 'RUNNING'),
    activeTimestamp,
  )
  if (running) return running

  const queued = newest(
    items.filter(({ analysisState }) => analysisState === 'QUEUED'),
    activeTimestamp,
  )
  if (queued) return queued

  const preparing = newest(
    items.filter(({ materialState }) => materialState === 'preparing'),
    activeTimestamp,
  )
  if (preparing) return preparing

  const terminalOrReady = newest(
    items.filter(({ analysisState, materialState }) => (
      materialState === 'failed'
      || analysisState === 'FAILED'
      || analysisState === 'DONE'
      || analysisState === 'none'
    )),
    homeLifecycleTimestamp,
  )
  if (terminalOrReady) return terminalOrReady

  return newest(
    items.filter(({ analysisState }) => analysisState === 'unknown'),
    homeLifecycleTimestamp,
  )
}

export function selectRecentHomeMatches(
  items: readonly MatchLibraryItem[],
  excludeVideoId?: string,
  limit = 3,
): MatchLibraryItem[] {
  const unique = new Map<string, MatchLibraryItem>()

  for (const item of [...items].sort(
    (left, right) => timestamp(right.video.uploadedAt) - timestamp(left.video.uploadedAt),
  )) {
    if (item.video.id === excludeVideoId || unique.has(item.video.id)) continue
    unique.set(item.video.id, item)
    if (unique.size === limit) break
  }

  return [...unique.values()]
}
