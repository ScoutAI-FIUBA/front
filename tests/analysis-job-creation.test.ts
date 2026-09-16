import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCreatedAnalysisJob,
  createAnalysisJobSubmission,
} from '../src/pages/videos/analysis-job-creation.ts'
import {
  createAnalysisJobsPoller,
  type AnalysisJobsPollingScheduler,
} from '../src/pages/videos/analysis-jobs-polling.ts'
import type { ProcessingJob, ProcessingJobStatus } from '../src/types/index.ts'

function job(id: string, status: ProcessingJobStatus): ProcessingJob {
  return {
    id,
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status,
    resultsKey: null,
    errorMessage: null,
    progressPercent: null,
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
  readonly timers = new Map<number, () => void>()

  setTimeout(callback: () => void): number {
    const id = this.nextId
    this.nextId += 1
    this.timers.set(id, callback)
    return id
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number)
  }
}

test('prevents a second submit while creation is in flight', async () => {
  let createCalls = 0
  let resolveCreate: ((job: ProcessingJob) => void) | undefined
  const pending = new Promise<ProcessingJob>((resolve) => {
    resolveCreate = resolve
  })
  const submission = createAnalysisJobSubmission({
    create: () => {
      createCalls += 1
      return pending
    },
    onCreated: () => undefined,
    onError: () => undefined,
    onSubmittingChange: () => undefined,
  })

  const first = submission.submit()
  const second = submission.submit()

  assert.equal(createCalls, 1)
  assert.strictEqual(first, second)
  resolveCreate?.(job('new-job', 'QUEUED'))
  await first
})

test('adds a created queued job to the existing history without duplicates', async () => {
  let history = [job('old-job', 'DONE')]
  const created = job('new-job', 'QUEUED')
  const submission = createAnalysisJobSubmission({
    create: async () => created,
    onCreated: (newJob) => {
      history = addCreatedAnalysisJob(history, newJob)
    },
    onError: () => undefined,
    onSubmittingChange: () => undefined,
  })

  await submission.submit()

  assert.deepEqual(history.map((item) => item.id), ['new-job', 'old-job'])
  assert.equal(history[0]?.status, 'QUEUED')
})

test('starts polling after the created job enters history as queued', async () => {
  const scheduler = new ManualScheduler()
  let history = [job('old-job', 'DONE')]
  const poller = createAnalysisJobsPoller({
    scheduler,
    load: async () => history,
    onJobs: (jobs) => {
      history = jobs
    },
  })
  const submission = createAnalysisJobSubmission({
    create: async () => job('new-job', 'QUEUED'),
    onCreated: (newJob) => {
      history = addCreatedAnalysisJob(history, newJob)
      poller.start(history)
    },
    onError: () => undefined,
    onSubmittingChange: () => undefined,
  })

  await submission.submit()

  assert.equal(scheduler.timers.size, 1)
})

test('creation errors preserve the existing history', async () => {
  const history = [job('old-job', 'DONE')]
  const snapshot = [...history]
  let receivedError: unknown
  const submission = createAnalysisJobSubmission({
    create: async () => {
      throw new Error('Video already has an active job')
    },
    onCreated: (created) => {
      history.push(created)
    },
    onError: (error) => {
      receivedError = error
    },
    onSubmittingChange: () => undefined,
  })

  await submission.submit()

  assert.deepEqual(history, snapshot)
  assert.equal((receivedError as Error).message, 'Video already has an active job')
})
