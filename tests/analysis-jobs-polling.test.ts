import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ANALYSIS_JOBS_POLL_INTERVAL_MS,
  createAnalysisJobsPoller,
  type AnalysisJobsPollingScheduler,
} from '../src/pages/videos/analysis-jobs-polling.ts'
import type { ProcessingJob, ProcessingJobStatus } from '../src/types/index.ts'

function job(status: ProcessingJobStatus): ProcessingJob {
  return {
    id: 'job-1',
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status,
    resultsKey: null,
    errorMessage: status === 'FAILED' ? 'Pipeline failed' : null,
    progressPercent: status === 'RUNNING' ? 25 : null,
    summary: null,
    ourTeamSide: null,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-16T12:00:00+00:00',
    updatedAt: '2026-09-16T12:00:00+00:00',
  }
}

class ManualScheduler implements AnalysisJobsPollingScheduler {
  private nextId = 1
  readonly timers = new Map<number, { callback: () => void; delayMs: number }>()

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId
    this.nextId += 1
    this.timers.set(id, { callback, delayMs })
    return id
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number)
  }

  runNext(): boolean {
    const next = this.timers.entries().next().value as
      | [number, { callback: () => void; delayMs: number }]
      | undefined
    if (!next) return false
    const [id, timer] = next
    this.timers.delete(id)
    timer.callback()
    return true
  }

  firstDelay(): number | undefined {
    return this.timers.values().next().value?.delayMs
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

test('starts polling at the configured interval when an active job exists', async () => {
  const scheduler = new ManualScheduler()
  let requests = 0
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => {
      requests += 1
      return [job('RUNNING')]
    },
    onJobs: () => undefined,
  })

  poller.start([job('QUEUED')])

  assert.equal(scheduler.timers.size, 1)
  assert.equal(scheduler.firstDelay(), ANALYSIS_JOBS_POLL_INTERVAL_MS)
  scheduler.runNext()
  await flushPromises()
  assert.equal(requests, 1)
  assert.equal(scheduler.timers.size, 1)
})

test('stops polling when the refreshed jobs are all terminal', async () => {
  const scheduler = new ManualScheduler()
  const received: ProcessingJob[][] = []
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => [job('DONE'), job('FAILED')],
    onJobs: (jobs) => received.push(jobs),
  })

  poller.start([job('RUNNING')])
  scheduler.runNext()
  await flushPromises()

  assert.deepEqual(received.map((jobs) => jobs.map((item) => item.status)), [['DONE', 'FAILED']])
  assert.equal(scheduler.timers.size, 0)
})

test('cleans up the timer when the panel unmounts', () => {
  const scheduler = new ManualScheduler()
  let requests = 0
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => {
      requests += 1
      return [job('RUNNING')]
    },
    onJobs: () => undefined,
  })

  poller.start([job('RUNNING')])
  poller.stop()

  assert.equal(scheduler.timers.size, 0)
  assert.equal(scheduler.runNext(), false)
  assert.equal(requests, 0)
})

test('does not publish or reschedule an in-flight response after unmount', async () => {
  const scheduler = new ManualScheduler()
  let published = 0
  let resolveRequest: ((jobs: ProcessingJob[]) => void) | undefined
  const pendingRequest = new Promise<ProcessingJob[]>((resolve) => {
    resolveRequest = resolve
  })
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: () => pendingRequest,
    onJobs: () => {
      published += 1
    },
  })

  poller.start([job('RUNNING')])
  scheduler.runNext()
  poller.stop()
  resolveRequest?.([job('RUNNING')])
  await flushPromises()

  assert.equal(published, 0)
  assert.equal(scheduler.timers.size, 0)
})

test('does not poll when every initial job is already terminal', () => {
  const scheduler = new ManualScheduler()
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => [job('DONE')],
    onJobs: () => undefined,
  })

  poller.start([job('DONE'), job('FAILED')])

  assert.equal(scheduler.timers.size, 0)
})

test('never overlaps requests when one takes longer than the interval', async () => {
  const scheduler = new ManualScheduler()
  let requests = 0
  let resolveRequest: ((jobs: ProcessingJob[]) => void) | undefined
  const slowRequest = new Promise<ProcessingJob[]>((resolve) => {
    resolveRequest = resolve
  })
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: () => {
      requests += 1
      return slowRequest
    },
    onJobs: () => undefined,
  })

  poller.start([job('RUNNING')])
  scheduler.runNext()

  assert.equal(requests, 1)
  assert.equal(scheduler.timers.size, 0)
  assert.equal(scheduler.runNext(), false)
  assert.equal(requests, 1)

  resolveRequest?.([job('RUNNING')])
  await flushPromises()

  assert.equal(scheduler.timers.size, 1)
  scheduler.runNext()
  assert.equal(requests, 2)
})

test('reports a transient history failure and keeps retrying the last known jobs', async () => {
  const scheduler = new ManualScheduler()
  const events: string[] = []
  let attempts = 0
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('network')
      return [job('RUNNING')]
    },
    onJobs: () => events.push('jobs'),
    onError: () => events.push('error'),
  })

  poller.start([job('RUNNING')])
  scheduler.runNext()
  await flushPromises()
  assert.deepEqual(events, ['error'])
  assert.equal(scheduler.timers.size, 1)

  scheduler.runNext()
  await flushPromises()
  assert.deepEqual(events, ['error', 'jobs'])
  assert.equal(scheduler.timers.size, 1)
})
