import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiResponseError } from '../src/services/api/errors.ts'
import {
  analysisJobDetailPath,
  canOpenAnalysisJob,
  classifyAnalysisJobDetailError,
  loadAnalysisJobDetail,
} from '../src/pages/analysis/analysis-job-detail.ts'
import type { ProcessingJob, ProcessingJobStatus } from '../src/types/index.ts'

function job(status: ProcessingJobStatus = 'DONE'): ProcessingJob {
  return {
    id: 'job/id',
    videoId: 'video-1',
    teamId: 'team id',
    requestedByUserId: 'user-1',
    status,
    resultsKey: 'results/team/job',
    errorMessage: null,
    progressPercent: status === 'RUNNING' ? 50 : null,
    summary: null,
    ourTeamSide: null,
    startedAt: '2026-09-16T12:01:00+00:00',
    finishedAt: status === 'DONE' ? '2026-09-16T12:05:00+00:00' : null,
    createdAt: '2026-09-16T12:00:00+00:00',
    updatedAt: '2026-09-16T12:05:00+00:00',
  }
}

test('builds a refresh-safe job detail URL and only DONE jobs can open it', () => {
  assert.equal(
    analysisJobDetailPath(job()),
    '/analisis/jobs/job%2Fid?team_id=team%20id',
  )
  assert.equal(canOpenAnalysisJob(job('DONE')), true)
  assert.equal(canOpenAnalysisJob(job('QUEUED')), false)
  assert.equal(canOpenAnalysisJob(job('RUNNING')), false)
  assert.equal(canOpenAnalysisJob(job('FAILED')), false)
})

test('loads the job first and resolves video and team context from its ids', async () => {
  const calls: string[] = []
  const loaded = await loadAnalysisJobDetail('job-1', 'team-1', {
    analysisJobs: {
      async get(jobId, teamId) {
        calls.push(`job:${jobId}:${teamId}`)
        return { ...job(), id: jobId, teamId }
      },
    },
    videos: {
      async getById(videoId) {
        calls.push(`video:${videoId}`)
        return null
      },
    },
    teams: {
      async getById(teamId) {
        calls.push(`team:${teamId}`)
        return null
      },
    },
  })

  assert.equal(loaded.job.id, 'job-1')
  assert.deepEqual(calls, ['job:job-1:team-1', 'video:video-1', 'team:team-1'])
})

test('keeps the real job available when optional context lookups fail', async () => {
  const loaded = await loadAnalysisJobDetail('job-1', 'team-1', {
    analysisJobs: { get: async () => job() },
    videos: { getById: async () => { throw new Error('video unavailable') } },
    teams: { getById: async () => { throw new Error('team unavailable') } },
  })

  assert.equal(loaded.job.status, 'DONE')
  assert.equal(loaded.video, null)
  assert.equal(loaded.team, null)
})

test('classifies only HTTP 404 as not found', () => {
  assert.equal(
    classifyAnalysisJobDetailError(new ApiResponseError('Job not found', 404)),
    'not-found',
  )
  assert.equal(
    classifyAnalysisJobDetailError(new ApiResponseError('Server error', 500)),
    'error',
  )
  assert.equal(classifyAnalysisJobDetailError(new Error('network')), 'error')
})
