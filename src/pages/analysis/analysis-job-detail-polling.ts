import type { ProcessingJob, ProcessingJobStatus } from '../../types/index.ts'

export const ANALYSIS_JOB_DETAIL_POLL_INTERVAL_MS = 10_000

export interface AnalysisJobDetailPollingScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

interface AnalysisJobDetailPollerOptions {
  load: () => Promise<ProcessingJob>
  onJob: (job: ProcessingJob) => void
  intervalMs?: number
  scheduler?: AnalysisJobDetailPollingScheduler
}

export interface AnalysisJobDetailPoller {
  start(status: ProcessingJobStatus): void
  stop(): void
}

function isActiveStatus(status: ProcessingJobStatus): boolean {
  return status === 'QUEUED' || status === 'RUNNING'
}

const browserScheduler: AnalysisJobDetailPollingScheduler = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

export function createAnalysisJobDetailPoller({
  load,
  onJob,
  intervalMs = ANALYSIS_JOB_DETAIL_POLL_INTERVAL_MS,
  scheduler = browserScheduler,
}: AnalysisJobDetailPollerOptions): AnalysisJobDetailPoller {
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
      const job = await load()
      if (!running) return

      onJob(job)
      if (!isActiveStatus(job.status)) {
        running = false
      }
    } catch {
      // Preserve the last successful snapshot and retry after the normal interval.
    } finally {
      requestInFlight = false
      schedule()
    }
  }

  return {
    start(status) {
      clearTimer()
      running = isActiveStatus(status)
      schedule()
    },
    stop() {
      running = false
      clearTimer()
    },
  }
}
