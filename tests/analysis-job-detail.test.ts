import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { ApiResponseError } from '../src/services/api/errors.ts'
import {
  analysisJobDetailActionLabel,
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

test('RUNNING and DONE jobs expose the correct action and refresh-safe detail URL', () => {
  const runningJob = job('RUNNING')
  const doneJob = job('DONE')

  assert.equal(analysisJobDetailActionLabel(runningJob), 'Ver progreso')
  assert.equal(analysisJobDetailActionLabel(doneJob), 'Ver análisis')
  assert.equal(
    analysisJobDetailPath(runningJob),
    '/analisis/jobs/job%2Fid?team_id=team%20id',
  )
  assert.equal(
    analysisJobDetailPath(doneJob),
    '/analisis/jobs/job%2Fid?team_id=team%20id',
  )
  assert.equal(canOpenAnalysisJob(runningJob), true)
  assert.equal(canOpenAnalysisJob(doneJob), true)
})

test('QUEUED and FAILED jobs keep no visible detail action', () => {
  assert.equal(analysisJobDetailActionLabel(job('QUEUED')), null)
  assert.equal(analysisJobDetailActionLabel(job('FAILED')), null)
  assert.equal(canOpenAnalysisJob(job('QUEUED')), false)
  assert.equal(canOpenAnalysisJob(job('FAILED')), false)
})

test('the top action opens RUNNING progress while QUEUED stays non-navigable', () => {
  const source = readFileSync(
    new URL('../src/pages/videos/VideoAnalysisJobs.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /const runningJob = jobs\.find\(\(job\) => job\.status === 'RUNNING'\)/)
  assert.match(source, /<Link to=\{analysisJobDetailPath\(runningJob\)\}>/)
  assert.match(source, /runningJob \? \(/)
  assert.match(source, /activeJobExists\s*\? 'Análisis en curso'/)
  assert.equal(analysisJobDetailActionLabel(job('DONE')), 'Ver análisis')
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
