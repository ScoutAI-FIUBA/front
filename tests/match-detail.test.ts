import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  clipDisplayTitle,
  clipFallbackLabel,
  clipTimeRange,
  loadMatchClips,
  loadMatchDetail,
  matchAnalysisPath,
  matchDetailPath,
  matchReportPath,
  resolveMatchDetailTab,
  resolveMatchReportSection,
} from '../src/pages/matches/match-detail.ts'
import type {
  ClipCollection,
  ClipCollectionDetail,
  ProcessingJob,
  ProcessingJobStatus,
  Team,
  Video,
} from '../src/types/index.ts'

const team: Team = {
  id: 'team/1',
  name: 'Club del Sur',
  shortName: 'SUR',
  city: 'Buenos Aires',
  country: 'Argentina',
}

const video: Video = {
  id: 'video/1',
  teamId: team.id,
  title: 'Partido real',
  storageUrl: 'https://storage.example/playback-signed',
  uploadedAt: '2026-10-01T12:00:00Z',
  status: 'uploaded',
}

function job(id: string, status: ProcessingJobStatus, createdAt: string): ProcessingJob {
  return {
    id,
    videoId: video.id,
    teamId: team.id,
    requestedByUserId: 'user-1',
    status,
    resultsKey: status === 'DONE' ? 'results.json' : null,
    errorMessage: status === 'FAILED' ? 'private pipeline detail' : null,
    progressPercent: status === 'RUNNING' ? 37 : null,
    summary: null,
    ourTeamSide: null,
    startedAt: status === 'QUEUED' ? null : createdAt,
    finishedAt: status === 'DONE' || status === 'FAILED' ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
  }
}

test('Partido detail paths and tabs are canonical, encoded and refresh-safe', () => {
  assert.equal(matchDetailPath('video/1'), '/partidos/video%2F1')
  assert.equal(matchDetailPath('video/1', 'reporte'), '/partidos/video%2F1?tab=reporte')
  assert.equal(matchDetailPath('video/1', 'clips'), '/partidos/video%2F1?tab=clips')
  assert.equal(resolveMatchDetailTab(new URLSearchParams()), 'video')
  assert.equal(resolveMatchDetailTab(new URLSearchParams('tab=reporte')), 'reporte')
  assert.equal(resolveMatchDetailTab(new URLSearchParams('tab=clips')), 'clips')
  assert.equal(resolveMatchDetailTab(new URLSearchParams('tab=unknown')), 'video')
  assert.equal(matchReportPath('video/1'), '/partidos/video%2F1?tab=reporte&seccion=resumen')
  assert.equal(matchReportPath('video/1', 'tiros'), '/partidos/video%2F1?tab=reporte&seccion=tiros')
  assert.equal(resolveMatchReportSection(new URLSearchParams()), 'resumen')
  assert.equal(resolveMatchReportSection(new URLSearchParams('tab=reporte&seccion=movimiento')), 'movimiento')
  assert.equal(resolveMatchReportSection(new URLSearchParams('tab=reporte&seccion=unknown')), 'resumen')
})

test('direct refresh loads the real video context and selects the newest ProcessingJob', async () => {
  const calls: string[] = []
  const older = job('job-old', 'DONE', '2026-10-01T13:00:00Z')
  const newest = job('job-new', 'RUNNING', '2026-10-01T14:00:00Z')

  const model = await loadMatchDetail(video.id, {
    videos: {
      async getById(videoId) {
        calls.push(`video:${videoId}`)
        return video
      },
    },
    teams: {
      async getById(teamId) {
        calls.push(`team:${teamId}`)
        return team
      },
    },
    jobs: {
      async listForVideo(videoId, teamId) {
        calls.push(`jobs:${videoId}:${teamId}`)
        return [older, newest]
      },
    },
  })

  assert.equal(model?.video.storageUrl, 'https://storage.example/playback-signed')
  assert.equal(model?.team?.name, 'Club del Sur')
  assert.equal(model?.latestJob?.id, 'job-new')
  assert.equal(model?.jobsUnavailable, false)
  assert.deepEqual(calls, ['video:video/1', 'team:team/1', 'jobs:video/1:team/1'])
})

test('a missing video returns not found without requesting team or jobs', async () => {
  let dependentRequests = 0
  const model = await loadMatchDetail('missing', {
    videos: { async getById() { return null } },
    teams: { async getById() { dependentRequests += 1; return null } },
    jobs: { async listForVideo() { dependentRequests += 1; return [] } },
  })

  assert.equal(model, null)
  assert.equal(dependentRequests, 0)
})

test('job history failure stays explicit and never becomes a false no-job state', async () => {
  const model = await loadMatchDetail(video.id, {
    videos: { async getById() { return video } },
    teams: { async getById() { return team } },
    jobs: { async listForVideo() { throw new Error('network') } },
  })

  assert.equal(model?.latestJob, null)
  assert.equal(model?.jobsUnavailable, true)
})

test('the analysis CTA reuses the existing real creation route', () => {
  assert.equal(
    matchAnalysisPath(video),
    '/analisis/nuevo?team_id=team%2F1&video_id=video%2F1',
  )
})

const collection: ClipCollection = {
  id: 'collection/1',
  videoId: video.id,
  teamId: team.id,
  ownerUserId: 'user-1',
  name: 'Selección',
  description: null,
  createdAt: '2026-10-01T15:00:00Z',
  updatedAt: '2026-10-01T15:00:00Z',
}

const collectionDetail: ClipCollectionDetail = {
  collection,
  items: [{
    id: 'clip-1',
    collectionId: collection.id,
    startMs: 42_000,
    endMs: 55_900,
    position: 1,
    createdAt: '2026-10-01T15:01:00Z',
  }],
}

test('Clips supports an honest empty state and persisted collections', async () => {
  const empty = await loadMatchClips(video.id, {
    async list() { return [] },
    async getDetail() { throw new Error('not called') },
  })
  assert.deepEqual(empty, { collections: [], hasPartialFailure: false })

  const existing = await loadMatchClips(video.id, {
    async list() { return [collection] },
    async getDetail(requestedVideoId, collectionId) {
      assert.equal(requestedVideoId, video.id)
      assert.equal(collectionId, collection.id)
      return collectionDetail
    },
  })
  assert.equal(existing.collections[0].items?.length, 1)
  assert.equal(existing.hasPartialFailure, false)
  assert.equal(clipFallbackLabel(collectionDetail.items[0]), 'Clip 1 · 00:42–00:55')
  assert.equal(clipDisplayTitle(collectionDetail.items[0]), 'Clip 1 · 00:42–00:55')
  assert.equal(clipTimeRange(collectionDetail.items[0]), '00:42–00:55')
})

test('Clips uses a persisted description as title and keeps the real range visible', () => {
  const describedItem = {
    ...collectionDetail.items[0],
    description: 'Pick and roll central',
  }

  assert.equal(clipDisplayTitle(describedItem), 'Pick and roll central')
  assert.equal(clipTimeRange(describedItem), '00:42–00:55')
  assert.equal(clipDisplayTitle({ ...describedItem, description: '   ' }), 'Clip 1 · 00:42–00:55')
})

test('a partial clip failure preserves the real collection without inventing empty content', async () => {
  const model = await loadMatchClips(video.id, {
    async list() { return [collection] },
    async getDetail() { throw new Error('temporary') },
  })

  assert.equal(model.collections[0].collection.name, 'Selección')
  assert.equal(model.collections[0].items, null)
  assert.equal(model.hasPartialFailure, true)
})

test('the detail shell covers Video, Reporte, Clips and every real job state', () => {
  const detailSource = readFileSync(new URL('../src/pages/matches/MatchDetailPage.tsx', import.meta.url), 'utf8')
  const workspaceSource = readFileSync(new URL('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx', import.meta.url), 'utf8')
  const shootingControllerSource = readFileSync(new URL('../src/pages/analysis/use-analysis-job-shooting-data.ts', import.meta.url), 'utf8')
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const playerSource = readFileSync(new URL('../src/pages/analysis/AnalysisWorkspaceVideo.tsx', import.meta.url), 'utf8')

  assert.match(appSource, /path="\/partidos\/:videoId"/)
  assert.match(detailSource, /ArrowLeft[^\n]+Partidos|<ArrowLeft[\s\S]*?Partidos/)
  assert.match(detailSource, /label: 'Video'/)
  assert.match(detailSource, /label: 'Reporte'/)
  assert.match(detailSource, /label: 'Clips'/)
  assert.match(detailSource, /job\.status === 'QUEUED'/)
  assert.match(detailSource, /job\.status === 'RUNNING'/)
  assert.match(detailSource, /job\.status === 'FAILED'/)
  assert.doesNotMatch(detailSource, /Abrir reporte completo/)
  assert.match(detailSource, /<AnalysisJobResultsWorkspace/)
  assert.match(detailSource, /showNavigation={false}/)
  assert.match(detailSource, /includeDetails={false}/)
  assert.match(detailSource, /label: 'Resumen'/)
  assert.match(detailSource, /label: 'Tiros'/)
  assert.match(detailSource, /label: 'Movimiento'/)
  assert.match(detailSource, /label: 'Similares'/)
  assert.equal(workspaceSource.match(/<AnalysisWorkspaceVideo\s/g)?.length, 1)
  assert.match(workspaceSource, /const shootingData = useAnalysisJobShootingData\(job\)/)
  assert.match(workspaceSource, /shootingSummary=\{shootingSummary\}/)
  assert.match(workspaceSource, /shootingData=\{shootingData\}/)
  assert.match(shootingControllerSource, /loadAnalysisJobStats/)
  assert.match(shootingControllerSource, /loadAnalysisJobShotChart/)
  assert.match(detailSource, /minimalChrome/)
  assert.match(playerSource, /getVideoByIdForTeam/)
  assert.match(playerSource, /poster=\{playbackVideo\.thumbnailUrl \|\| undefined\}/)
  assert.match(detailSource, /Gestionar clips/)
  assert.doesNotMatch(detailSource, /score|rival|competencia|64%|10\/2\/8\/14/i)
})

test('R3-B1 gives Partido an editorial report presentation without replacing the legacy workspace', () => {
  const detailSource = readFileSync(new URL('../src/pages/matches/MatchDetailPage.tsx', import.meta.url), 'utf8')
  const workspaceSource = readFileSync(new URL('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx', import.meta.url), 'utf8')
  const overviewSource = readFileSync(new URL('../src/pages/analysis/AnalysisJobOverview.tsx', import.meta.url), 'utf8')
  const shotsSource = readFileSync(new URL('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx', import.meta.url), 'utf8')
  const teamSideSource = readFileSync(new URL('../src/pages/analysis/AnalysisJobTeamSide.tsx', import.meta.url), 'utf8')
  const courtSource = readFileSync(new URL('../src/components/analysis/ShotChartCourt.tsx', import.meta.url), 'utf8')

  assert.match(detailSource, /presentation="match-report"/)
  assert.match(detailSource, /scout-display[^\n]+text-xl[^\n]+font-bold/)
  assert.match(detailSource, /bottom-0 left-3 h-\[3px\] w-10 bg-\[#FF6A1F\]/)
  assert.match(workspaceSource, /presentation = 'legacy'/)
  assert.match(workspaceSource, /showReportEvidence/)
  assert.match(workspaceSource, /Evidencia de video/)
  assert.match(overviewSource, /fieldGoalsMade[^\n]+fieldGoalsAttempted/)
  assert.match(overviewSource, /<ShotChartCourt/)
  assert.doesNotMatch(overviewSource, /tiros con evidencia/i)
  assert.match(teamSideSource, /¿Cuál es tu equipo en este video\?/)
  assert.match(teamSideSource, /Lado \{sideValue\}/)
  assert.match(teamSideSource, /Sugerido · puede ser incompleto/)
  assert.match(shotsSource, /function viewShotPlay|const viewShotPlay/)
  assert.match(shotsSource, /shot\.shotType/)
  assert.match(courtSource, /REPORT_RESULT_STYLES/)
  assert.match(courtSource, /selected && presentation === 'match-report'/)
})

test('R3-B1.1 compacts only the Partido report header', () => {
  const detailSource = readFileSync(new URL('../src/pages/matches/MatchDetailPage.tsx', import.meta.url), 'utf8')

  assert.match(detailSource, /const isCompactReportHeader = activeTab === 'reporte'/)
  assert.match(detailSource, /isCompactReportHeader \? 'pb-16 pt-4 sm:pt-5' : 'pb-16 pt-8'/)
  assert.match(detailSource, /isCompactReportHeader \? 'min-w-0 flex-1' : 'min-w-0'/)
  assert.match(detailSource, /text-\[clamp\(2rem,4vw,3rem\)\][^\n]+sm:truncate sm:whitespace-nowrap/)
  assert.match(detailSource, /isCompactReportHeader \? 'min-h-12' : 'min-h-\[58px\]'/)
  assert.match(detailSource, /isCompactReportHeader \? 'pt-4' : 'pt-8'/)
  assert.match(detailSource, /text-\[clamp\(3\.2rem,8vw,5rem\)\]/)
})

test('legacy analysis, video and collection routes remain available', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.match(appSource, /path="\/videos"/)
  assert.match(appSource, /path="\/videos\/:videoId\/colecciones"/)
  assert.match(appSource, /path="\/videos\/:videoId\/colecciones\/:collectionId"/)
  assert.match(appSource, /path="\/analisis\/jobs\/:jobId"/)
  assert.match(appSource, /path="\/revision-manual"/)
})
