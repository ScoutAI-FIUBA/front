import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  ANALYSIS_JOB_SIMILAR_LIMIT,
  ANALYSIS_JOB_SIMILAR_MOVEMENT_WEIGHT,
  createAnalysisJobSimilarService,
  type ApiAnalysisJobSimilarAnalyses,
} from '../src/services/api/analysis-job-similar.client.ts'
import type { AnalysisJobRequest } from '../src/services/api/analysis-jobs.client.ts'
import {
  analysisJobSimilarContextForJob,
  analysisJobSimilarLoadKey,
  analysisJobSimilarPath,
  formatSimilarityScore,
  loadAnalysisJobSimilar,
  similarResultsForDisplay,
} from '../src/pages/analysis/analysis-job-similar.ts'
import type { ProcessingJob } from '../src/types/index.ts'

function apiSimilar(
  overrides: Partial<ApiAnalysisJobSimilarAnalyses> = {},
): ApiAnalysisJobSimilarAnalyses {
  return {
    job_id: 'job-1',
    video_id: 'video-1',
    movement_weight: 0.5,
    candidates_compared: 8,
    results: [
      {
        job_id: 'job-3',
        video_id: 'video-3',
        score: 0.91,
        shot_score: 0.87,
        movement_score: 0.95,
      },
      {
        job_id: 'job-2',
        video_id: 'video-2',
        score: 0.72,
        shot_score: 0.82,
        movement_score: 0.62,
      },
    ],
    ...overrides,
  }
}

function job(status: ProcessingJob['status'], ourTeamSide: 0 | 1 | null = null): ProcessingJob {
  return {
    id: 'job-1',
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status,
    resultsKey: status === 'DONE' ? 'results/team-1/job-1' : null,
    errorMessage: null,
    progressPercent: status === 'DONE' ? 100 : null,
    summary: null,
    ourTeamSide,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-20T12:00:00+00:00',
    updatedAt: '2026-09-20T12:01:00+00:00',
  }
}

test('requests similar jobs with the fixed v1 parameters and maps the real contract', async () => {
  const paths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    paths.push(path)
    return apiSimilar() as T
  }
  const service = createAnalysisJobSimilarService(request)

  const result = await service.get('job/id', 'team id')

  assert.equal(ANALYSIS_JOB_SIMILAR_LIMIT, 5)
  assert.equal(ANALYSIS_JOB_SIMILAR_MOVEMENT_WEIGHT, 0.5)
  assert.deepEqual(paths, [
    '/jobs/job%2Fid/similar?team_id=team%20id&limit=5&movement_weight=0.5',
  ])
  assert.deepEqual(result, {
    jobId: 'job-1',
    videoId: 'video-1',
    movementWeight: 0.5,
    candidatesCompared: 8,
    results: [
      {
        jobId: 'job-3',
        videoId: 'video-3',
        score: 0.91,
        shotScore: 0.87,
        movementScore: 0.95,
      },
      {
        jobId: 'job-2',
        videoId: 'video-2',
        score: 0.72,
        shotScore: 0.82,
        movementScore: 0.62,
      },
    ],
  })
})

test('does not request similar analyses unless the job is DONE', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return {} as never } }

  for (const status of ['QUEUED', 'RUNNING', 'FAILED'] as const) {
    const result = await loadAnalysisJobSimilar(
      analysisJobSimilarContextForJob(job(status)),
      service,
    )
    assert.equal(result, null)
  }

  assert.equal(calls, 0)
})

test('keeps backend order and limits displayed results to five', async () => {
  const results = Array.from({ length: 6 }, (_, index) => ({
    jobId: `job-${index}`,
    videoId: `video-${index}`,
    score: 1 - index / 10,
    shotScore: 0.8,
    movementScore: 0.7,
  }))

  assert.deepEqual(
    similarResultsForDisplay(results).map((result) => result.jobId),
    ['job-0', 'job-1', 'job-2', 'job-3', 'job-4'],
  )
  assert.deepEqual(results.map((result) => result.jobId), [
    'job-0', 'job-1', 'job-2', 'job-3', 'job-4', 'job-5',
  ])
})

test('formats all three values as explicitly labelled similarity scores', () => {
  assert.equal(formatSimilarityScore(0.91), '91%')
  assert.equal(formatSimilarityScore(0.875), '88%')

  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobSimilarAnalyses.tsx', import.meta.url),
    'utf8',
  )
  assert.match(source, /Similitud general/)
  assert.match(source, /Similitud de tiros/)
  assert.match(source, /Similitud de movimiento/)
  assert.match(source, /score de similitud/)
  assert.doesNotMatch(source, /precisión|probabilidad|confianza|muy similar/i)
})

test('keeps the explicit empty state when no comparable jobs are returned', async () => {
  const service = createAnalysisJobSimilarService(async <T>() => apiSimilar({
    candidates_compared: 0,
    results: [],
  }) as T)
  const result = await loadAnalysisJobSimilar(
    analysisJobSimilarContextForJob(job('DONE')),
    service,
  )
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobSimilarAnalyses.tsx', import.meta.url),
    'utf8',
  )

  assert.deepEqual(result?.results, [])
  assert.match(source, /No encontramos otros análisis comparables para este equipo\./)
})

test('a failed request can be retried without changing the contract', async () => {
  let attempts = 0
  const service = createAnalysisJobSimilarService(async <T>() => {
    attempts += 1
    if (attempts === 1) throw new Error('Similar endpoint unavailable')
    return apiSimilar() as T
  })
  const context = analysisJobSimilarContextForJob(job('DONE'))

  await assert.rejects(loadAnalysisJobSimilar(context, service), /endpoint unavailable/)
  const retried = await loadAnalysisJobSimilar(context, service)

  assert.equal(attempts, 2)
  assert.equal(retried?.results.length, 2)

  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobSimilarAnalyses.tsx', import.meta.url),
    'utf8',
  )
  assert.match(source, /No pudimos cargar los análisis similares/)
  assert.match(source, /Reintentar/)
})

test('builds result navigation with the current team_id', () => {
  assert.equal(
    analysisJobSimilarPath('other/job', 'same team'),
    '/analisis/jobs/other%2Fjob?team_id=same%20team',
  )
})

test('load identity is independent from our_team_side', () => {
  const sideZero = analysisJobSimilarContextForJob(job('DONE', 0))
  const sideOne = analysisJobSimilarContextForJob(job('DONE', 1))
  const unconfirmed = analysisJobSimilarContextForJob(job('DONE', null))

  assert.deepEqual(sideZero, sideOne)
  assert.deepEqual(sideOne, unconfirmed)
  assert.equal(analysisJobSimilarLoadKey(sideZero), 'job-1:team-1')
})

test('the independent block is placed after Court Positions in DONE job detail', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobDetailPage.tsx', import.meta.url),
    'utf8',
  )
  const courtPositionsIndex = source.indexOf('<AnalysisJobCourtPositionsView job={job} />')
  const similarIndex = source.indexOf('<AnalysisJobSimilarAnalysesView job={job} />')

  assert.ok(courtPositionsIndex >= 0)
  assert.ok(similarIndex > courtPositionsIndex)
})
