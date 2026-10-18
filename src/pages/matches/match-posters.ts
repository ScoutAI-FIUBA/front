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
let activeUserId: string | null = null
let identityGeneration = 0

function cacheKey(userId: string, videoId: string): string {
  return `${userId}:${videoId}`
}

function isCurrentIdentity(userId: string, generation = identityGeneration): boolean {
  return activeUserId === userId && identityGeneration === generation
}

export function setMatchPosterCacheIdentity(userId: string | null): void {
  if (activeUserId === userId) return
  activeUserId = userId
  identityGeneration += 1
  posterCache.clear()
  inFlightPosters.clear()
}

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

export function cachedMatchPoster(
  userId: string,
  videoId: string,
  now = Date.now(),
): string | null | undefined {
  if (activeUserId !== userId) return undefined
  const key = cacheKey(userId, videoId)
  const cached = posterCache.get(key)
  if (!cached) return undefined
  if (cached.expiresAt <= now) {
    posterCache.delete(key)
    return undefined
  }
  return cached.url
}

export function matchPosterCacheExpiry(userId: string, videoId: string): number | undefined {
  if (activeUserId !== userId) return undefined
  return posterCache.get(cacheKey(userId, videoId))?.expiresAt
}

export function requestMatchPoster(
  userId: string,
  video: Pick<Video, 'id' | 'teamId'>,
  loadVideo: PosterLoader,
  now = Date.now(),
): Promise<string | null> {
  if (activeUserId !== userId) return Promise.resolve(null)
  const generation = identityGeneration
  const key = cacheKey(userId, video.id)
  const cached = cachedMatchPoster(userId, video.id, now)
  if (cached !== undefined) return Promise.resolve(cached)

  const existing = inFlightPosters.get(key)
  if (existing) return existing

  const request = schedulePosterRequest(async () => {
    if (!isCurrentIdentity(userId, generation)) return null
    try {
      const detail = await loadVideo(video.id, video.teamId)
      if (!isCurrentIdentity(userId, generation)) return null
      const url = detail?.thumbnailUrl?.trim() || null
      posterCache.set(key, {
        url,
        expiresAt: now + (url ? SIGNED_POSTER_CACHE_TTL_MS : NEGATIVE_POSTER_CACHE_TTL_MS),
      })
      return url
    } catch {
      if (!isCurrentIdentity(userId, generation)) return null
      posterCache.set(key, {
        url: null,
        expiresAt: now + NEGATIVE_POSTER_CACHE_TTL_MS,
      })
      return null
    }
  })

  inFlightPosters.set(key, request)
  void request.then(
    () => {
      if (inFlightPosters.get(key) === request) inFlightPosters.delete(key)
    },
    () => {
      if (inFlightPosters.get(key) === request) inFlightPosters.delete(key)
    },
  )
  return request
}

export function clearMatchPosterCache(): void {
  activeUserId = null
  identityGeneration += 1
  posterCache.clear()
  inFlightPosters.clear()
}
