import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ANALYSIS_JOB_DETAIL_POLL_INTERVAL_MS,
  createAnalysisJobDetailPoller,
  type AnalysisJobDetailPollingScheduler,
} from '../src/pages/analysis/analysis-job-detail-polling.ts'
import type { ProcessingJob, ProcessingJobStatus } from '../src/types/index.ts'

function job(status: ProcessingJobStatus, progressPercent: number | null = null): ProcessingJob {
  return {
    id: 'job-1',
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status,
    resultsKey: null,
    errorMessage: status === 'FAILED' ? 'Pipeline failed' : null,
    progressPercent,
    summary: null,
    ourTeamSide: null,
    startedAt: null,
    finishedAt: status === 'DONE' ? '2026-09-24T02:00:00+00:00' : null,
    createdAt: '2026-09-24T01:00:00+00:00',
    updatedAt: '2026-09-24T01:30:00+00:00',
  }
}

class ManualScheduler implements AnalysisJobDetailPollingScheduler {
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

test('RUNNING starts detail polling every 10 seconds and publishes real progress', async () => {
  const scheduler = new ManualScheduler()
  const received: ProcessingJob[] = []
  const poller = createAnalysisJobDetailPoller({
    scheduler,
    load: async () => job('RUNNING', 42),
    onJob: (updatedJob) => received.push(updatedJob),
  })

  poller.start('RUNNING')

  assert.equal(scheduler.timers.size, 1)
  assert.equal(scheduler.firstDelay(), ANALYSIS_JOB_DETAIL_POLL_INTERVAL_MS)
  scheduler.runNext()
  await flushPromises()

  assert.equal(received[0]?.progressPercent, 42)
  assert.equal(scheduler.timers.size, 1)
})

test('QUEUED starts detail polling and continues when the job becomes RUNNING', async () => {
  const scheduler = new ManualScheduler()
  const received: ProcessingJob[] = []
  const poller = createAnalysisJobDetailPoller({
    scheduler,
    load: async () => job('RUNNING', 12),
    onJob: (updatedJob) => received.push(updatedJob),
  })

  poller.start('QUEUED')
  assert.equal(scheduler.timers.size, 1)
  scheduler.runNext()
  await flushPromises()

  assert.equal(received[0]?.status, 'RUNNING')
  assert.equal(scheduler.timers.size, 1)
})

for (const terminalStatus of ['DONE', 'FAILED'] as const) {
  test(`RUNNING to ${terminalStatus} publishes the terminal job and stops polling`, async () => {
    const scheduler = new ManualScheduler()
    const received: ProcessingJob[] = []
    const poller = createAnalysisJobDetailPoller({
      scheduler,
      load: async () => job(terminalStatus, terminalStatus === 'DONE' ? 100 : 42),
      onJob: (updatedJob) => received.push(updatedJob),
    })

    poller.start('RUNNING')
    scheduler.runNext()
    await flushPromises()

    assert.equal(received[0]?.status, terminalStatus)
    assert.equal(scheduler.timers.size, 0)
  })
}

test('cleanup cancels the timer and ignores an in-flight response', async () => {
  const scheduler = new ManualScheduler()
  let published = 0
  let resolveRequest: ((value: ProcessingJob) => void) | undefined
  const pendingRequest = new Promise<ProcessingJob>((resolve) => {
    resolveRequest = resolve
  })
  const poller = createAnalysisJobDetailPoller({
    scheduler,
    load: () => pendingRequest,
    onJob: () => {
      published += 1
    },
  })

  poller.start('RUNNING')
  scheduler.runNext()
  poller.stop()
  resolveRequest?.(job('RUNNING', 60))
  await flushPromises()

  assert.equal(published, 0)
  assert.equal(scheduler.timers.size, 0)
})

test('never overlaps detail requests', async () => {
  const scheduler = new ManualScheduler()
  let requests = 0
  let resolveRequest: ((value: ProcessingJob) => void) | undefined
  const pendingRequest = new Promise<ProcessingJob>((resolve) => {
    resolveRequest = resolve
  })
  const poller = createAnalysisJobDetailPoller({
    scheduler,
    load: () => {
      requests += 1
      return pendingRequest
    },
    onJob: () => undefined,
  })

  poller.start('RUNNING')
  scheduler.runNext()

  assert.equal(requests, 1)
  assert.equal(scheduler.timers.size, 0)
  assert.equal(scheduler.runNext(), false)
  assert.equal(requests, 1)

  resolveRequest?.(job('RUNNING', 60))
  await flushPromises()

  assert.equal(scheduler.timers.size, 1)
})

test('reports a transient detail failure, preserves polling, and recovers on success', async () => {
  const scheduler = new ManualScheduler()
  const events: string[] = []
  let attempts = 0
  const poller = createAnalysisJobDetailPoller({
    scheduler,
    load: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('network')
      return job('RUNNING', 55)
    },
    onJob: () => events.push('job'),
    onError: () => events.push('error'),
  })

  poller.start('RUNNING')
  scheduler.runNext()
  await flushPromises()
  assert.deepEqual(events, ['error'])
  assert.equal(scheduler.timers.size, 1)

  scheduler.runNext()
  await flushPromises()
  assert.deepEqual(events, ['error', 'job'])
  assert.equal(scheduler.timers.size, 1)
})

test('terminal jobs do not leave detail polling active', () => {
  for (const status of ['DONE', 'FAILED'] as const) {
    const scheduler = new ManualScheduler()
    const poller = createAnalysisJobDetailPoller({
      scheduler,
      load: async () => job(status),
      onJob: () => undefined,
    })

    poller.start(status)
    assert.equal(scheduler.timers.size, 0)
  }
})

test('the detail wires polling to the existing team-scoped job endpoint', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobDetailPage.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /jobStatus !== 'QUEUED' && jobStatus !== 'RUNNING'/)
  assert.match(source, /load: \(\) => analysisJobService\.get\(jobId, teamId\)/)
  assert.match(source, /setDetail\(\(current\) => current && current\.job\.id === updatedJob\.id/)
  assert.match(source, /return \(\) => poller\.stop\(\)/)
  assert.match(source, /setIsPollingDisconnected\(true\)/)
  assert.match(source, /<AnalysisPollingNotice/)
})
