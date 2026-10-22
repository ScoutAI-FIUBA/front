import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAnalysisJobTeamSideService,
  mapAnalysisJobTeamSides,
  type ApiAnalysisJobTeamSides,
} from '../src/services/api/analysis-job-team-sides.client.ts'
import type {
  AnalysisJobRequest,
  ApiProcessingJob,
} from '../src/services/api/analysis-jobs.client.ts'
import {
  analysisJobTeamGroupLabel,
  createAnalysisJobTeamSideConfirmation,
  initialAnalysisJobTeamSide,
} from '../src/pages/analysis/analysis-job-team-side.ts'
import type { AnalysisJobTeamSide, ProcessingJob } from '../src/types/index.ts'

function apiTeamSides(
  overrides: Partial<ApiAnalysisJobTeamSides> = {},
): ApiAnalysisJobTeamSides {
  return {
    job_id: 'job-1',
    video_id: 'video-1',
    our_team_side: null,
    suggested_team_side: 1,
    sides: [
      { team_side: 0, track_count: 5, numbers: ['23'], roster_matches: 0 },
      { team_side: 1, track_count: 6, numbers: ['7', '9'], roster_matches: 2 },
    ],
    roster_numbers_known: 12,
    ...overrides,
  }
}

function apiJob(side: AnalysisJobTeamSide): ApiProcessingJob {
  return {
    id: 'job-1',
    video_id: 'video-1',
    team_id: 'team-1',
    requested_by_user_id: 'user-1',
    status: 'DONE',
    results_key: 'results/team-1/job-1',
    error_message: null,
    progress_percent: 100,
    summary: null,
    our_team_side: side,
    started_at: '2026-09-16T12:01:00+00:00',
    finished_at: '2026-09-16T12:05:00+00:00',
    created_at: '2026-09-16T12:00:00+00:00',
    updated_at: '2026-09-16T12:06:00+00:00',
  }
}

test('GET maps the detected team sides contract', async () => {
  const requests: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    requests.push(path)
    return apiTeamSides() as T
  }
  const service = createAnalysisJobTeamSideService(request)

  const result = await service.get('job/id', 'team id')

  assert.deepEqual(requests, ['/jobs/job%2Fid/team-sides?team_id=team%20id'])
  assert.equal(result.jobId, 'job-1')
  assert.equal(result.videoId, 'video-1')
  assert.deepEqual(result.sides, [
    { teamSide: 0, trackCount: 5, numbers: ['23'], rosterMatches: 0 },
    { teamSide: 1, trackCount: 6, numbers: ['7', '9'], rosterMatches: 2 },
  ])
  assert.equal(result.rosterNumbersKnown, 12)
})

test('uses suggested_team_side only as the initial selection when no side is confirmed', () => {
  const result = mapAnalysisJobTeamSides(apiTeamSides({ suggested_team_side: 1 }))

  assert.equal(result.suggestedTeamSide, 1)
  assert.equal(result.ourTeamSide, null)
  assert.equal(initialAnalysisJobTeamSide(result), 1)
})

test('a previously confirmed side takes precedence over the suggestion', () => {
  const result = mapAnalysisJobTeamSides(apiTeamSides({
    our_team_side: 0,
    suggested_team_side: 1,
  }))

  assert.equal(result.ourTeamSide, 0)
  assert.equal(initialAnalysisJobTeamSide(result), 0)
})

test('presents internal team sides as detected product groups', () => {
  assert.equal(analysisJobTeamGroupLabel(0), 'Grupo detectado A')
  assert.equal(analysisJobTeamGroupLabel(1), 'Grupo detectado B')
})

for (const side of [0, 1] as const) {
  test(`PUT persists team side ${side} with the backend payload`, async () => {
    const requests: Array<{ path: string; init?: RequestInit }> = []
    const request: AnalysisJobRequest = async <T>(path: string, init?: RequestInit) => {
      requests.push({ path, init })
      return { job: apiJob(side) } as T
    }
    const service = createAnalysisJobTeamSideService(request)

    const updated = await service.setOurTeamSide('job/id', 'team id', side)

    assert.equal(requests[0]?.path, '/jobs/job%2Fid/our-team?team_id=team%20id')
    assert.equal(requests[0]?.init?.method, 'PUT')
    assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { team_side: side })
    assert.equal(updated.ourTeamSide, side)
  })
}

test('PUT still returns the mapped job when the response carries player_stats_sync', async () => {
  const request: AnalysisJobRequest = async <T>() =>
    ({ job: apiJob(1), player_stats_sync: 'ok' }) as T
  const service = createAnalysisJobTeamSideService(request)

  const updated = await service.setOurTeamSide('job-1', 'team-1', 1)

  assert.equal(updated.id, 'job-1')
  assert.equal(updated.ourTeamSide, 1)
})

test('prevents a second confirmation while the first PUT is in flight', async () => {
  let calls = 0
  let resolveRequest: ((job: ProcessingJob) => void) | undefined
  const pending = new Promise<ProcessingJob>((resolve) => {
    resolveRequest = resolve
  })
  const confirmation = createAnalysisJobTeamSideConfirmation({
    service: {
      setOurTeamSide: async () => {
        calls += 1
        return pending
      },
    },
    jobId: 'job-1',
    teamId: 'team-1',
    onConfirmed: () => undefined,
    onError: () => undefined,
    onSubmittingChange: () => undefined,
  })

  const first = confirmation.submit(0)
  const second = confirmation.submit(1)

  assert.equal(calls, 1)
  assert.strictEqual(first, second)
  resolveRequest?.({
    id: 'job-1',
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status: 'DONE',
    resultsKey: null,
    errorMessage: null,
    progressPercent: 100,
    summary: null,
    ourTeamSide: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-16T12:00:00+00:00',
    updatedAt: '2026-09-16T12:00:00+00:00',
  })
  await first
})

test('surfaces a GET failure for the selector load state', async () => {
  const expected = new Error('Artifacts unavailable')
  const service = createAnalysisJobTeamSideService(async () => {
    throw expected
  })

  await assert.rejects(service.get('job-1', 'team-1'), expected)
})

test('a failed confirmation preserves the visible selection', async () => {
  let selectedSide: AnalysisJobTeamSide = 1
  let receivedError: unknown
  const confirmation = createAnalysisJobTeamSideConfirmation({
    service: {
      setOurTeamSide: async () => {
        throw new Error('Could not persist side')
      },
    },
    jobId: 'job-1',
    teamId: 'team-1',
    onConfirmed: (job) => {
      if (job.ourTeamSide != null) selectedSide = job.ourTeamSide
    },
    onError: (error) => {
      receivedError = error
    },
    onSubmittingChange: () => undefined,
  })

  await confirmation.submit(selectedSide)

  assert.equal(selectedSide, 1)
  assert.equal((receivedError as Error).message, 'Could not persist side')
})
