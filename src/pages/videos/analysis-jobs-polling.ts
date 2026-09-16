import type { ProcessingJob } from '../../types/index.ts'

export const ANALYSIS_JOBS_POLL_INTERVAL_MS = 10_000

export function hasActiveAnalysisJobs(jobs: ProcessingJob[]): boolean {
  return jobs.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING')
}

export interface AnalysisJobsPollingScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

interface AnalysisJobsPollerOptions {
  load: () => Promise<ProcessingJob[]>
  onJobs: (jobs: ProcessingJob[]) => void
  intervalMs?: number
  scheduler?: AnalysisJobsPollingScheduler
}

export interface AnalysisJobsPoller {
  start(jobs: ProcessingJob[]): void
  stop(): void
}

const browserScheduler: AnalysisJobsPollingScheduler = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

export function createAnalysisJobsPoller({
  load,
  onJobs,
  intervalMs = ANALYSIS_JOBS_POLL_INTERVAL_MS,
  scheduler = browserScheduler,
}: AnalysisJobsPollerOptions): AnalysisJobsPoller {
  let running = false
  let requestInFlight = false
  let timer: unknown = null

  const clearTimer = () => {
    if (timer == null) return
    scheduler.clearTimeout(timer)
    timer = null
  }

  const schedule = () => {
    if (!running || requestInFlight || timer != null) return
    timer = scheduler.setTimeout(() => {
      timer = null
      void poll()
    }, intervalMs)
  }

  const poll = async () => {
    if (!running || requestInFlight) return
    requestInFlight = true

    try {
      const jobs = await load()
      if (!running) return

      onJobs(jobs)
      if (!hasActiveAnalysisJobs(jobs)) {
        running = false
        return
      }
    } catch {
      // Keep the last successful snapshot and retry after the normal interval.
    } finally {
      requestInFlight = false
      schedule()
    }
  }

  return {
    start(jobs) {
      clearTimer()
      running = hasActiveAnalysisJobs(jobs)
      schedule()
    },
    stop() {
      running = false
      clearTimer()
    },
  }
}
