import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAnalysisJobService,
  type ApiProcessingJob,
  type AnalysisJobRequest,
} from '../src/services/api/analysis-jobs.client.ts'
import { apiJson } from '../src/services/api/http-client.ts'
import { createAnalysisJobSubmission } from '../src/pages/videos/analysis-job-creation.ts'

function apiJob(overrides: Partial<ApiProcessingJob> = {}): ApiProcessingJob {
  return {
    id: 'job-1',
    video_id: 'video-1',
    team_id: 'team-1',
    requested_by_user_id: 'user-1',
    status: 'RUNNING',
    results_key: 'results/team-1/job-1',
    error_message: null,
    progress_percent: 42,
    summary: { frames_processed: 1200 },
    our_team_side: 1,
    started_at: '2026-09-16T12:01:00+00:00',
    finished_at: null,
    created_at: '2026-09-16T12:00:00+00:00',
    updated_at: '2026-09-16T12:02:00+00:00',
    ...overrides,
  }
}

test('listForVideo uses the video jobs endpoint and maps the response', async () => {
  const requestedPaths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    requestedPaths.push(path)
    return { jobs: [apiJob()] } as T
  }
  const service = createAnalysisJobService(request)

  const jobs = await service.listForVideo('video/id', 'team id')

  assert.deepEqual(requestedPaths, ['/videos/video%2Fid/jobs?team_id=team%20id'])
  assert.deepEqual(jobs, [
    {
      id: 'job-1',
      videoId: 'video-1',
      teamId: 'team-1',
      requestedByUserId: 'user-1',
      status: 'RUNNING',
      resultsKey: 'results/team-1/job-1',
      errorMessage: null,
      progressPercent: 42,
      summary: { frames_processed: 1200 },
      ourTeamSide: 1,
      startedAt: '2026-09-16T12:01:00+00:00',
      finishedAt: null,
      createdAt: '2026-09-16T12:00:00+00:00',
      updatedAt: '2026-09-16T12:02:00+00:00',
    },
  ])
})

test('create posts team_id in the body and maps the queued job', async () => {
  const requests: Array<{ path: string; init?: RequestInit }> = []
  const request: AnalysisJobRequest = async <T>(path: string, init?: RequestInit) => {
    requests.push({ path, init })
    return {
      job: apiJob({
        status: 'QUEUED',
        progress_percent: null,
        started_at: null,
      }),
    } as T
  }
  const service = createAnalysisJobService(request)

  const created = await service.create('video/id', { teamId: 'team-1' })

  assert.equal(requests.length, 1)
  assert.equal(requests[0]?.path, '/videos/video%2Fid/jobs')
  assert.equal(requests[0]?.init?.method, 'POST')
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { team_id: 'team-1' })
  assert.equal(created.status, 'QUEUED')
  assert.equal(created.progressPercent, null)
  assert.equal(created.videoId, 'video-1')
})

test('a JSON 202 creates and publishes the accepted job without a reload', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  globalThis.fetch = (async () => Response.json({
    job: apiJob({
      id: 'job-accepted',
      status: 'QUEUED',
      progress_percent: null,
      started_at: null,
    }),
  }, { status: 202 })) as typeof fetch
  const service = createAnalysisJobService(
    (path, init) => apiJson(path, init, { auth: false }),
  )
  let visibleJobId: string | null = null
  let creationError: unknown
  const submission = createAnalysisJobSubmission({
    create: () => service.create('video-1', { teamId: 'team-1' }),
    onCreated: (job) => {
      visibleJobId = job.id
    },
    onError: (error) => {
      creationError = error
    },
    onSubmittingChange: () => undefined,
  })

  await submission.submit()

  assert.equal(visibleJobId, 'job-accepted')
  assert.equal(creationError, undefined)
})

test('get uses the job endpoint and preserves nullable progress', async () => {
  const requestedPaths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    requestedPaths.push(path)
    return {
      job: apiJob({
        status: 'QUEUED',
        progress_percent: null,
        results_key: null,
        our_team_side: null,
      }),
    } as T
  }
  const service = createAnalysisJobService(request)

  const job = await service.get('job/id', 'team id')

  assert.deepEqual(requestedPaths, ['/jobs/job%2Fid?team_id=team%20id'])
  assert.equal(job.status, 'QUEUED')
  assert.equal(job.progressPercent, null)
  assert.equal(job.resultsKey, null)
  assert.equal(job.ourTeamSide, null)
})

test('all backend processing job statuses are accepted unchanged', async () => {
  const statuses = ['QUEUED', 'RUNNING', 'DONE', 'FAILED'] as const

  for (const status of statuses) {
    const request: AnalysisJobRequest = async <T>() => ({ job: apiJob({ status }) }) as T
    const service = createAnalysisJobService(request)
    const job = await service.get('job-1', 'team-1')

    assert.equal(job.status, status)
  }
})
