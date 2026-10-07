import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildMatchLibrary,
  filterMatchLibrary,
  matchLibraryDisplayLabel,
  matchLibraryDisplayState,
} from '../src/pages/matches/match-library.ts'
import type {
  AnalysisJobCatalog,
  AnalysisCatalogFailure,
} from '../src/pages/analysis/analysis-job-catalog.ts'
import type { ProcessingJob, ProcessingJobStatus, Team, Video } from '../src/types/index.ts'

const team: Team = {
  id: 'team/1',
  name: 'Club del Sur',
  shortName: 'SUR',
  city: 'Buenos Aires',
  country: 'Argentina',
}

function video(id: string, status: Video['status'] = 'uploaded'): Video {
  return {
    id,
    teamId: team.id,
    title: `Partido ${id}`,
    storageUrl: '',
    uploadedAt: '2026-10-01T12:00:00Z',
    status,
  }
}

function job(
  id: string,
  videoId: string,
  status: ProcessingJobStatus,
  createdAt = '2026-10-01T13:00:00Z',
): ProcessingJob {
  return {
    id,
    videoId,
    teamId: team.id,
    requestedByUserId: 'user-1',
    status,
    resultsKey: null,
    errorMessage: status === 'FAILED' ? 'pipeline failed' : null,
    progressPercent: status === 'RUNNING' ? 42 : null,
    summary: null,
    ourTeamSide: null,
    startedAt: status === 'QUEUED' ? null : createdAt,
    finishedAt: status === 'DONE' || status === 'FAILED' ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  }
}

function catalog(
  videos: Video[],
  jobs: ProcessingJob[],
  options: {
    loadedJobVideoIds?: string[]
    partialFailures?: AnalysisCatalogFailure[]
  } = {},
): AnalysisJobCatalog {
  return {
    teams: [team],
    videos,
    items: jobs.map((item) => ({
      job: item,
      video: videos.find((entry) => entry.id === item.videoId)!,
      team,
    })),
    loadedJobVideoIds: options.loadedJobVideoIds ?? videos.map((item) => item.id),
    partialFailures: options.partialFailures ?? [],
    updatedAt: 1,
  }
}

test('a READY video without jobs becomes a real Partido with one Analizar action', () => {
  const [item] = buildMatchLibrary(catalog([video('video/1')], []))

  assert.equal(item.team?.name, 'Club del Sur')
  assert.equal(item.materialState, 'ready')
  assert.equal(item.analysisState, 'none')
  assert.deepEqual(item.action, {
    kind: 'new-analysis',
    label: 'Analizar',
    to: '/partidos/video%2F1?tab=reporte',
  })
})

test('the newest ProcessingJob decides the Partido state and destination', () => {
  const sourceVideo = video('video-1')
  const olderDone = job('old-job', sourceVideo.id, 'DONE', '2026-10-01T13:00:00Z')
  const newerRunning = job('new/job', sourceVideo.id, 'RUNNING', '2026-10-01T14:00:00Z')
  const [item] = buildMatchLibrary(catalog([sourceVideo], [olderDone, newerRunning]))

  assert.equal(item.latestJob?.id, 'new/job')
  assert.equal(item.analysisState, 'RUNNING')
  assert.deepEqual(item.action, {
    kind: 'job',
    label: 'Ver progreso',
    to: '/partidos/video-1?tab=reporte',
  })
})

test('QUEUED, RUNNING, DONE and FAILED jobs use product-facing CTAs', () => {
  const statuses: Array<[ProcessingJobStatus, string]> = [
    ['QUEUED', 'Ver progreso'],
    ['RUNNING', 'Ver progreso'],
    ['DONE', 'Ver reporte'],
    ['FAILED', 'Ver problema'],
  ]

  for (const [status, label] of statuses) {
    const sourceVideo = video(`video-${status}`)
    const [item] = buildMatchLibrary(catalog([sourceVideo], [job(`job-${status}`, sourceVideo.id, status)]))
    assert.equal(item.analysisState, status)
    assert.equal(item.action?.label, label)
    assert.equal(item.action?.to, `/partidos/video-${status}?tab=reporte`)
  }
})

test('Partidos exposes one product-facing state instead of video and job states', () => {
  const cases: Array<[Video['status'], ProcessingJobStatus | null, string]> = [
    ['processing', null, 'Preparando archivo'],
    ['failed', null, 'Archivo con error'],
    ['uploaded', null, 'Sin analizar'],
    ['uploaded', 'QUEUED', 'En cola'],
    ['uploaded', 'RUNNING', 'Analizando'],
    ['uploaded', 'DONE', 'Reporte listo'],
    ['uploaded', 'FAILED', 'Error de análisis'],
  ]

  for (const [videoStatus, jobStatus, expectedLabel] of cases) {
    const sourceVideo = video(`video-${expectedLabel}`, videoStatus)
    const jobs = jobStatus ? [job(`job-${jobStatus}`, sourceVideo.id, jobStatus)] : []
    const [item] = buildMatchLibrary(catalog([sourceVideo], jobs))

    assert.equal(matchLibraryDisplayLabel(matchLibraryDisplayState(item)), expectedLabel)
  }
})

test('a non-ready source remains Preparando archivo even if a job is known', () => {
  const sourceVideo = video('video-processing', 'processing')
  const [item] = buildMatchLibrary(
    catalog([sourceVideo], [job('job-done', sourceVideo.id, 'DONE')]),
  )

  assert.equal(matchLibraryDisplayLabel(matchLibraryDisplayState(item)), 'Preparando archivo')
})

test('a non-ready video cannot start an invalid analysis', () => {
  const [preparing, failed] = buildMatchLibrary(
    catalog([video('preparing', 'processing'), video('failed', 'failed')], []),
  )

  assert.equal(preparing.materialState, 'preparing')
  assert.equal(preparing.action, null)
  assert.equal(failed.materialState, 'failed')
  assert.equal(failed.action, null)
})

test('an unverified job history is a partial result and never offers Analizar', () => {
  const sourceVideo = video('video-1')
  const [item] = buildMatchLibrary(
    catalog([sourceVideo], [], {
      loadedJobVideoIds: [],
      partialFailures: [{ scope: 'jobs', teamId: team.id, videoId: sourceVideo.id }],
    }),
  )

  assert.equal(item.analysisState, 'unknown')
  assert.equal(matchLibraryDisplayLabel(matchLibraryDisplayState(item)), 'Estado no disponible')
  assert.equal(item.action, null)
})

test('Partidos filters active, completed and all error states without hiding source failures', () => {
  const videos = [
    video('queued'),
    video('running'),
    video('done'),
    video('job-failed'),
    video('video-failed', 'failed'),
    video('no-job'),
  ]
  const jobs = [
    job('job-q', 'queued', 'QUEUED'),
    job('job-r', 'running', 'RUNNING'),
    job('job-d', 'done', 'DONE'),
    job('job-f', 'job-failed', 'FAILED'),
  ]
  const items = buildMatchLibrary(catalog(videos, jobs))

  assert.deepEqual(filterMatchLibrary(items, 'active').map((item) => item.video.id), ['queued', 'running'])
  assert.deepEqual(filterMatchLibrary(items, 'done').map((item) => item.video.id), ['done'])
  assert.deepEqual(filterMatchLibrary(items, 'failed').map((item) => item.video.id), ['job-failed', 'video-failed'])
  assert.equal(filterMatchLibrary(items, 'all').length, 6)
})

test('Partidos renders loading, retry, empty, partial failure and responsive card states', () => {
  const source = readFileSync(new URL('../src/pages/matches/MatchesPage.tsx', import.meta.url), 'utf8')

  assert.match(source, /Cargando partidos/)
  assert.match(source, /No pudimos cargar tus partidos/)
  assert.match(source, /Reintentar/)
  assert.match(source, /Subí tu primer partido para obtener tiros, evidencia, movimiento y comparaciones/)
  assert.match(source, /Algunos estados no se pudieron verificar/)
  assert.match(source, /md:grid-cols-2 xl:grid-cols-3/)
  assert.match(source, /Subir partido/)
  assert.match(source, /Subí tus partidos, seguí el análisis y encontrá cada jugada/)
  assert.match(source, /flex-nowrap items-center gap-2 overflow-x-auto/)
  assert.match(source, /text-balance/)
  assert.match(source, /requestMatchPoster\(video, getVideoByIdForTeam\)/)
  assert.match(source, /posterUrl=\{posterUrls\[item\.video\.id\]\}/)
  assert.doesNotMatch(source, /Video ·|>\s*Reporte\s*</)
  assert.doesNotMatch(source, /score|rival|competencia|64%|10\/2\/8\/14/i)
})

test('Partidos uses the canonical Nuevo partido entry', () => {
  const source = readFileSync(new URL('../src/pages/matches/MatchesPage.tsx', import.meta.url), 'utf8')
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.match(source, /newMatchPath\(\)/)
  assert.match(appSource, /path="\/partidos\/nuevo" element=\{<VideoUploadPage \/>\}/)
  assert.match(appSource, /path="\/videos\/subir" element=\{<VideoUploadPage \/>\}/)
})
