import type { Video, VideoStatus } from '../../types/index.ts'

export const MATCH_VIDEO_PREPARATION_POLL_INTERVAL_MS = 5_000
export const MATCH_VIDEO_PREPARATION_MAX_ATTEMPTS = 60

export interface MatchVideoPreparationPollingScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

interface MatchVideoPreparationPollerOptions {
  load: () => Promise<Video | null>
  onVideo: (video: Video) => void
  onError?: (error: unknown) => void
  onExhausted?: () => void
  intervalMs?: number
  maxAttempts?: number
  scheduler?: MatchVideoPreparationPollingScheduler
}

export interface MatchVideoPreparationPoller {
  start(status: VideoStatus): void
  stop(): void
}

const browserScheduler: MatchVideoPreparationPollingScheduler = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

export function createMatchVideoPreparationPoller({
  load,
  onVideo,
  onError,
  onExhausted,
  intervalMs = MATCH_VIDEO_PREPARATION_POLL_INTERVAL_MS,
  maxAttempts = MATCH_VIDEO_PREPARATION_MAX_ATTEMPTS,
  scheduler = browserScheduler,
}: MatchVideoPreparationPollerOptions): MatchVideoPreparationPoller {
  let running = false
  let requestInFlight = false
  let timer: unknown = null
  let attempts = 0

  const clearTimer = () => {
    if (timer == null) return
    scheduler.clearTimeout(timer)
    timer = null
  }

  const stopIfExhausted = () => {
    if (!running || attempts < maxAttempts) return false
    running = false
    onExhausted?.()
    return true
  }

  const schedule = () => {
    if (!running || requestInFlight || timer != null || stopIfExhausted()) return
    timer = scheduler.setTimeout(() => {
      timer = null
      void poll()
    }, intervalMs)
  }

  const poll = async () => {
    if (!running || requestInFlight || stopIfExhausted()) return
    requestInFlight = true
    attempts += 1

    try {
      const video = await load()
      if (!running) return

      if (!video) {
        onError?.(new Error('Video not found while polling preparation'))
        return
      }

      onVideo(video)
      if (video.status !== 'processing') running = false
    } catch (error) {
      if (running) onError?.(error)
    } finally {
      requestInFlight = false
      schedule()
    }
  }

  return {
    start(status) {
      clearTimer()
      attempts = 0
      running = status === 'processing'
      schedule()
    },
    stop() {
      running = false
      clearTimer()
    },
  }
}
