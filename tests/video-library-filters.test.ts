import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterVideoLibrary,
  latestVideoAnalysisJob,
  videoAnalysisLabel,
  videoAnalysisState,
  videoMaterialLabel,
  videoMaterialState,
  videoPrimaryAnalysisAction,
} from '../src/pages/videos/video-library-filters.ts'
import type { ProcessingJob, Video } from '../src/types/index.ts'

const videos: Video[] = [
  { id: 'ready', teamId: 'team-1', title: 'Listo', storageUrl: '', uploadedAt: '2026-10-01T10:00:00Z', status: 'uploaded' },
  { id: 'preparing', teamId: 'team-1', title: 'Preparando', storageUrl: '', uploadedAt: '2026-10-01T09:00:00Z', status: 'processing' },
  { id: 'legacy-ready', teamId: 'team-2', title: 'Legacy', storageUrl: '', uploadedAt: '2026-10-01T08:00:00Z', status: 'analyzed' },
]

function job(id: string, videoId: string, status: ProcessingJob['status'], createdAt: string): ProcessingJob {
  return { id, videoId, teamId: 'team-1', requestedByUserId: 'user-1', status, resultsKey: null, errorMessage: null, progressPercent: null, summary: null, ourTeamSide: null, startedAt: null, finishedAt: null, createdAt, updatedAt: createdAt }
}

const jobs = [
  job('old', 'ready', 'DONE', '2026-10-01T10:00:00Z'),
  job('new', 'ready', 'RUNNING', '2026-10-01T11:00:00Z'),
]

test('video material status stays separate from analysis status', () => {
  assert.equal(videoMaterialState(videos[0]), 'ready')
  assert.equal(videoMaterialState(videos[1]), 'preparing')
  assert.equal(videoMaterialState(videos[2]), 'ready')
  assert.equal(videoAnalysisState('ready', jobs, ['ready', 'preparing']), 'RUNNING')
  assert.equal(videoAnalysisState('preparing', jobs, ['ready', 'preparing']), 'none')
  assert.equal(videoAnalysisState('legacy-ready', jobs, ['ready', 'preparing']), 'unknown')
})

test('video and analysis states keep distinct product language', () => {
  assert.equal(videoMaterialLabel('ready'), 'Listo')
  assert.equal(videoMaterialLabel('preparing'), 'Preparando archivo')
  assert.equal(videoMaterialLabel('failed'), 'Error')

  assert.equal(videoAnalysisLabel('QUEUED'), 'En cola')
  assert.equal(videoAnalysisLabel('RUNNING'), 'En proceso')
  assert.equal(videoAnalysisLabel('DONE'), 'Completado')
  assert.equal(videoAnalysisLabel('FAILED'), 'Fallido')
  assert.equal(videoAnalysisLabel('none'), 'Sin análisis')
  assert.equal(videoAnalysisLabel('unknown'), 'No verificado')
})

test('analysis filtering never treats an unverified history as no analysis', () => {
  const withoutAnalysis = filterVideoLibrary(videos, {
    teamId: 'all', material: 'all', analysis: 'none', jobs, loadedJobVideoIds: ['ready', 'preparing'],
  })
  assert.deepEqual(withoutAnalysis.map((video) => video.id), ['preparing'])
})

test('latest analysis state is selected independently from video readiness', () => {
  assert.equal(latestVideoAnalysisJob('ready', jobs)?.id, 'new')
  const running = filterVideoLibrary(videos, {
    teamId: 'team-1', material: 'ready', analysis: 'RUNNING', jobs, loadedJobVideoIds: ['ready'],
  })
  assert.deepEqual(running.map((video) => video.id), ['ready'])
})

test('primary video CTA follows the latest known ProcessingJob', () => {
  const readyVideo = videos[0]
  const queued = job('queued', readyVideo.id, 'QUEUED', '2026-10-01T12:00:00Z')
  const running = job('running', readyVideo.id, 'RUNNING', '2026-10-01T13:00:00Z')
  const done = job('done', readyVideo.id, 'DONE', '2026-10-01T14:00:00Z')
  const failed = job('failed', readyVideo.id, 'FAILED', '2026-10-01T15:00:00Z')

  assert.deepEqual(videoPrimaryAnalysisAction(readyVideo, null), {
    type: 'new-analysis',
    label: 'Nuevo análisis',
  })
  assert.deepEqual(videoPrimaryAnalysisAction(readyVideo, null, 'Analizar'), {
    type: 'new-analysis',
    label: 'Analizar',
  })
  assert.equal(videoPrimaryAnalysisAction(readyVideo, queued)?.label, 'Ver progreso')
  assert.equal(videoPrimaryAnalysisAction(readyVideo, running)?.label, 'Ver progreso')
  assert.equal(videoPrimaryAnalysisAction(readyVideo, done)?.label, 'Ver análisis')
  assert.equal(videoPrimaryAnalysisAction(readyVideo, failed)?.label, 'Ver detalle')
  assert.equal(videoPrimaryAnalysisAction(videos[1], null), null)
})
