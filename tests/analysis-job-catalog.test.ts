import assert from 'node:assert/strict'
import test from 'node:test'
import {
  composeAnalysisJobCatalog,
  refreshActiveCatalogJobs,
} from '../src/pages/analysis/analysis-job-catalog.ts'
import type { ProcessingJob, Team, Video } from '../src/types/index.ts'

const teams: Team[] = [
  { id: 'team-1', name: 'Metropolitano', shortName: 'MET', city: 'Buenos Aires', country: 'Argentina' },
  { id: 'team-2', name: 'Olympia', shortName: 'OLY', city: 'Montevideo', country: 'Uruguay' },
  { id: 'team-3', name: 'Central', shortName: 'CEN', city: 'Córdoba', country: 'Argentina' },
]

function video(id: string, teamId: string): Video {
  return { id, teamId, title: `Video ${id}`, storageUrl: '', uploadedAt: '2026-10-01T12:00:00Z', status: 'uploaded' }
}

function job(id: string, videoId: string, teamId: string, status: ProcessingJob['status'] = 'DONE'): ProcessingJob {
  return {
    id, videoId, teamId, requestedByUserId: 'user-1', status,
    resultsKey: null, errorMessage: null, progressPercent: status === 'RUNNING' ? 45 : null,
    summary: null, ourTeamSide: null, startedAt: null, finishedAt: status === 'DONE' ? '2026-10-01T13:00:00Z' : null,
    createdAt: `2026-10-01T12:0${id.slice(-1)}:00Z`, updatedAt: '2026-10-01T13:00:00Z',
  }
}

test('global analysis composition bounds requests and keeps human context', async () => {
  let activeVideoRequests = 0
  let maxVideoRequests = 0
  let activeJobRequests = 0
  let maxJobRequests = 0
  const videos = teams.map((team, index) => video(`video-${index + 1}`, team.id))

  const catalog = await composeAnalysisJobCatalog({
    teams: { list: async () => teams },
    videos: {
      filterByTeam: async (teamId) => {
        activeVideoRequests += 1
        maxVideoRequests = Math.max(maxVideoRequests, activeVideoRequests)
        await new Promise((resolve) => setTimeout(resolve, 2))
        activeVideoRequests -= 1
        return videos.filter((item) => item.teamId === teamId)
      },
    },
    jobs: {
      listForVideo: async (videoId, teamId) => {
        activeJobRequests += 1
        maxJobRequests = Math.max(maxJobRequests, activeJobRequests)
        await new Promise((resolve) => setTimeout(resolve, 2))
        activeJobRequests -= 1
        return [job(`job-${videoId.slice(-1)}`, videoId, teamId)]
      },
      get: async () => { throw new Error('not used') },
    },
  }, { teamConcurrency: 2, jobConcurrency: 2, now: () => 123 })

  assert.equal(maxVideoRequests <= 2, true)
  assert.equal(maxJobRequests <= 2, true)
  assert.equal(catalog.items.length, 3)
  assert.equal(catalog.items[0]?.video.title.startsWith('Video'), true)
  assert.equal(catalog.items[0]?.team.name.length > 0, true)
  assert.equal(catalog.updatedAt, 123)
})

test('partial video and job failures preserve successful analyses', async () => {
  const firstVideo = video('video-1', 'team-1')
  const secondVideo = video('video-2', 'team-2')
  const catalog = await composeAnalysisJobCatalog({
    teams: { list: async () => teams },
    videos: {
      filterByTeam: async (teamId) => {
        if (teamId === 'team-3') throw new Error('team videos unavailable')
        return teamId === 'team-1' ? [firstVideo] : [secondVideo]
      },
    },
    jobs: {
      listForVideo: async (videoId, teamId) => {
        if (videoId === 'video-2') throw new Error('jobs unavailable')
        return [job('job-1', videoId, teamId)]
      },
      get: async () => { throw new Error('not used') },
    },
  })

  assert.deepEqual(catalog.items.map((item) => item.job.id), ['job-1'])
  assert.deepEqual(catalog.loadedJobVideoIds, ['video-1'])
  assert.equal(catalog.partialFailures.some((failure) => failure.scope === 'videos' && failure.teamId === 'team-3'), true)
  assert.equal(catalog.partialFailures.some((failure) => failure.scope === 'jobs' && failure.videoId === 'video-2'), true)
})

test('catalog polling requests only active jobs and preserves failures', async () => {
  const sourceVideo = video('video-1', 'team-1')
  const done = job('job-1', sourceVideo.id, 'team-1', 'DONE')
  const running = job('job-2', sourceVideo.id, 'team-1', 'RUNNING')
  const requested: string[] = []
  const catalog = {
    items: [
      { job: done, video: sourceVideo, team: teams[0] },
      { job: running, video: sourceVideo, team: teams[0] },
    ],
    teams: [teams[0]], videos: [sourceVideo], loadedJobVideoIds: [sourceVideo.id], partialFailures: [], updatedAt: 1,
  }

  const refreshed = await refreshActiveCatalogJobs(catalog, {
    get: async (jobId) => {
      requested.push(jobId)
      return { ...running, status: 'DONE', progressPercent: null, finishedAt: '2026-10-01T14:00:00Z' }
    },
  }, 2, () => 2)

  assert.deepEqual(requested, ['job-2'])
  assert.equal(refreshed.items.find((item) => item.job.id === 'job-2')?.job.status, 'DONE')
  assert.equal(refreshed.updatedAt, 2)
})
