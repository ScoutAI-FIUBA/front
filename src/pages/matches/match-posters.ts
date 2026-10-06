import type { Video } from '../../types/index.ts'

const MAX_CONCURRENT_POSTER_REQUESTS = 4
const SIGNED_POSTER_CACHE_TTL_MS = 55 * 60 * 1000
const NEGATIVE_POSTER_CACHE_TTL_MS = 5 * 60 * 1000

interface PosterCacheEntry {
  url: string | null
  expiresAt: number
}

type PosterLoader = (videoId: string, teamId: string) => Promise<Video | null>

const posterCache = new Map<string, PosterCacheEntry>()
const inFlightPosters = new Map<string, Promise<string | null>>()
const requestQueue: Array<() => void> = []
let activeRequests = 0

function runNextRequest(): void {
  while (activeRequests < MAX_CONCURRENT_POSTER_REQUESTS && requestQueue.length > 0) {
    const start = requestQueue.shift()
    if (!start) return
    activeRequests += 1
    start()
  }
}

function schedulePosterRequest(task: () => Promise<string | null>): Promise<string | null> {
  return new Promise((resolve) => {
    requestQueue.push(() => {
      void task()
        .then(resolve)
        .finally(() => {
          activeRequests -= 1
          runNextRequest()
        })
    })
    runNextRequest()
  })
}

export function cachedMatchPoster(videoId: string, now = Date.now()): string | null | undefined {
  const cached = posterCache.get(videoId)
  if (!cached) return undefined
  if (cached.expiresAt <= now) {
    posterCache.delete(videoId)
    return undefined
  }
  return cached.url
}

export function matchPosterCacheExpiry(videoId: string): number | undefined {
  return posterCache.get(videoId)?.expiresAt
}

export function requestMatchPoster(
  video: Pick<Video, 'id' | 'teamId'>,
  loadVideo: PosterLoader,
  now = Date.now(),
): Promise<string | null> {
  const cached = cachedMatchPoster(video.id, now)
  if (cached !== undefined) return Promise.resolve(cached)

  const existing = inFlightPosters.get(video.id)
  if (existing) return existing

  const request = schedulePosterRequest(async () => {
    try {
      const detail = await loadVideo(video.id, video.teamId)
      const url = detail?.thumbnailUrl?.trim() || null
      posterCache.set(video.id, {
        url,
        expiresAt: now + (url ? SIGNED_POSTER_CACHE_TTL_MS : NEGATIVE_POSTER_CACHE_TTL_MS),
      })
      return url
    } catch {
      posterCache.set(video.id, {
        url: null,
        expiresAt: now + NEGATIVE_POSTER_CACHE_TTL_MS,
      })
      return null
    }
  })

  inFlightPosters.set(video.id, request)
  void request.finally(() => {
    if (inFlightPosters.get(video.id) === request) inFlightPosters.delete(video.id)
  })
  return request
}

export function clearMatchPosterCache(): void {
  posterCache.clear()
  inFlightPosters.clear()
  requestQueue.length = 0
  activeRequests = 0
}
