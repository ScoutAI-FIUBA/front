import assert from 'node:assert/strict'
import test from 'node:test'
import {
  selectHomePriorityMatch,
  selectRecentHomeMatches,
} from '../src/pages/dashboard/home-priority.ts'
import type { MatchLibraryItem } from '../src/pages/matches/match-library.ts'
import type { ProcessingJobStatus } from '../src/types/index.ts'

function item({
  id,
  uploadedAt,
  materialState = 'ready',
  analysisState = 'none',
  jobStatus,
  jobCreatedAt,
  jobUpdatedAt,
  jobFinishedAt = null,
}: {
  id: string
  uploadedAt: string
  materialState?: MatchLibraryItem['materialState']
  analysisState?: MatchLibraryItem['analysisState']
  jobStatus?: ProcessingJobStatus
  jobCreatedAt?: string
  jobUpdatedAt?: string
  jobFinishedAt?: string | null
}): MatchLibraryItem {
  const job = jobStatus ? {
    id: `job-${id}`,
    videoId: id,
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status: jobStatus,
    resultsKey: null,
    errorMessage: null,
    progressPercent: null,
    summary: null,
    ourTeamSide: null,
    startedAt: null,
    finishedAt: jobFinishedAt,
    createdAt: jobCreatedAt ?? uploadedAt,
    updatedAt: jobUpdatedAt ?? jobCreatedAt ?? uploadedAt,
  } : null

  return {
    video: {
      id,
      teamId: 'team-1',
      title: id,
      storageUrl: '',
      uploadedAt,
      status: materialState === 'failed' ? 'failed' : materialState === 'preparing' ? 'processing' : 'uploaded',
    },
    team: null,
    latestJob: job,
    materialState,
    analysisState,
    action: null,
  }
}

test('Inicio prioritizes newest RUNNING, then QUEUED, then file preparation', () => {
  const preparing = item({ id: 'preparing', uploadedAt: '2026-10-05T12:00:00Z', materialState: 'preparing', analysisState: 'unknown' })
  const queued = item({ id: 'queued', uploadedAt: '2026-10-04T12:00:00Z', analysisState: 'QUEUED', jobStatus: 'QUEUED', jobUpdatedAt: '2026-10-05T13:00:00Z' })
  const runningOld = item({ id: 'running-old', uploadedAt: '2026-10-01T12:00:00Z', analysisState: 'RUNNING', jobStatus: 'RUNNING', jobUpdatedAt: '2026-10-05T10:00:00Z' })
  const runningNew = item({ id: 'running-new', uploadedAt: '2026-10-02T12:00:00Z', analysisState: 'RUNNING', jobStatus: 'RUNNING', jobUpdatedAt: '2026-10-05T14:00:00Z' })

  assert.equal(selectHomePriorityMatch([preparing, queued, runningOld, runningNew])?.video.id, 'running-new')
  assert.equal(selectHomePriorityMatch([preparing, queued])?.video.id, 'queued')
  assert.equal(selectHomePriorityMatch([preparing])?.video.id, 'preparing')
})

test('terminal priority follows lifecycle recency so an old FAILED does not beat a newer DONE', () => {
  const failedOld = item({
    id: 'failed-old',
    uploadedAt: '2026-09-01T12:00:00Z',
    analysisState: 'FAILED',
    jobStatus: 'FAILED',
    jobFinishedAt: '2026-09-02T12:00:00Z',
  })
  const doneNew = item({
    id: 'done-new',
    uploadedAt: '2026-10-01T12:00:00Z',
    analysisState: 'DONE',
    jobStatus: 'DONE',
    jobFinishedAt: '2026-10-05T12:00:00Z',
  })
  const readyNewestUpload = item({ id: 'ready', uploadedAt: '2026-10-04T12:00:00Z' })

  assert.equal(selectHomePriorityMatch([failedOld, doneNew, readyNewestUpload])?.video.id, 'done-new')
})

test('material failures and ready matches compete by their real upload recency', () => {
  const failedMaterial = item({ id: 'material-failed', uploadedAt: '2026-10-06T12:00:00Z', materialState: 'failed', analysisState: 'unknown' })
  const ready = item({ id: 'ready', uploadedAt: '2026-10-05T12:00:00Z' })
  assert.equal(selectHomePriorityMatch([ready, failedMaterial])?.video.id, 'material-failed')
})

test('Estado no disponible is only selected when no verified candidate exists', () => {
  const unavailable = item({ id: 'unknown', uploadedAt: '2026-10-06T12:00:00Z', analysisState: 'unknown' })
  const ready = item({ id: 'ready', uploadedAt: '2026-10-01T12:00:00Z' })
  assert.equal(selectHomePriorityMatch([unavailable, ready])?.video.id, 'ready')
  assert.equal(selectHomePriorityMatch([unavailable])?.video.id, 'unknown')
})

test('recent matches exclude the protagonist, deduplicate videos, and stop at three', () => {
  const values = [
    item({ id: 'priority', uploadedAt: '2026-10-06T12:00:00Z' }),
    item({ id: 'one', uploadedAt: '2026-10-05T12:00:00Z' }),
    item({ id: 'one', uploadedAt: '2026-10-04T12:00:00Z' }),
    item({ id: 'two', uploadedAt: '2026-10-03T12:00:00Z' }),
    item({ id: 'three', uploadedAt: '2026-10-02T12:00:00Z' }),
    item({ id: 'four', uploadedAt: '2026-10-01T12:00:00Z' }),
  ]

  assert.deepEqual(
    selectRecentHomeMatches(values, 'priority').map(({ video }) => video.id),
    ['one', 'two', 'three'],
  )
})
