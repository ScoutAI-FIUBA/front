import assert from 'node:assert/strict'
import test from 'node:test'
import { getAnalysisJobPresentation } from '../src/pages/videos/analysis-job-presentation.ts'
import type { ProcessingJob, ProcessingJobStatus } from '../src/types/index.ts'

function job(status: ProcessingJobStatus, overrides: Partial<ProcessingJob> = {}): ProcessingJob {
  return {
    id: 'job-1',
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
    ...overrides,
  }
}

test('maps every backend status to the expected UI status', () => {
  assert.deepEqual(getAnalysisJobPresentation(job('QUEUED')), {
    label: 'En cola',
    indicatorState: 'neutral',
    message: 'El procesamiento está esperando para comenzar.',
  })
  assert.equal(getAnalysisJobPresentation(job('RUNNING')).indicatorState, 'information')
  assert.equal(getAnalysisJobPresentation(job('DONE')).indicatorState, 'success')
  assert.equal(getAnalysisJobPresentation(job('FAILED')).indicatorState, 'destructive')
})

test('running jobs never fabricate progress', () => {
  assert.equal(
    getAnalysisJobPresentation(job('RUNNING')).message,
    'Procesando sin porcentaje informado.',
  )
  assert.equal(
    getAnalysisJobPresentation(job('RUNNING', { progressPercent: 0 })).message,
    '0% procesado.',
  )
  assert.equal(
    getAnalysisJobPresentation(job('RUNNING', { progressPercent: 63 })).message,
    '63% procesado.',
  )
})

test('failed jobs prefer the backend error message and have a safe fallback', () => {
  assert.equal(
    getAnalysisJobPresentation(job('FAILED', { errorMessage: 'GPU unavailable' })).message,
    'GPU unavailable',
  )
  assert.equal(
    getAnalysisJobPresentation(job('FAILED')).message,
    'El procesamiento finalizó con un error.',
  )
})
