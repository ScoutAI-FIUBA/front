import assert from 'node:assert/strict'
import test from 'node:test'
import type { IAnalysisService } from '../src/services/contracts/analysis.service.ts'
import type { ITeamService } from '../src/services/contracts/teams.service.ts'
import type { IVideoService } from '../src/services/contracts/videos.service.ts'
import {
  loadVideosPageData,
  loadVideosRecentActivity,
} from '../src/pages/videos/videos-page-data.ts'
import type { ActivityItem, Team, Video } from '../src/types/index.ts'

const video: Video = {
  id: 'video-1',
  teamId: 'team-1',
  title: 'Partido de prueba',
  storageUrl: 'https://example.test/video.mp4',
  uploadedAt: '2026-09-23T12:00:00.000Z',
  status: 'uploaded',
}

const team: Team = {
  id: 'team-1',
  name: 'Equipo de prueba',
  shortName: 'EDP',
  city: 'Buenos Aires',
  country: 'Argentina',
}

test('loads videos and teams as the primary page dataset', async () => {
  const calls: string[] = []
  const videos = {
    list: async () => {
      calls.push('videos')
      return [video]
    },
  } satisfies Pick<IVideoService, 'list'>
  const teams = {
    list: async () => {
      calls.push('teams')
      return [team]
    },
  } satisfies Pick<ITeamService, 'list'>

  const result = await loadVideosPageData({ videos, teams })

  assert.deepEqual(calls.sort(), ['teams', 'videos'])
  assert.deepEqual(result, { videos: [video], teams: [team] })
})

test('propagates a primary load failure so the page can offer retry', async () => {
  const failure = new Error('backend unavailable')

  await assert.rejects(
    loadVideosPageData({
      videos: { list: async () => { throw failure } },
      teams: { list: async () => [team] },
    }),
    failure,
  )
})

test('real API mode neither requests nor returns mock recent activity', async () => {
  let calls = 0
  const analysis = {
    getRecentActivity: async () => {
      calls += 1
      return []
    },
  } satisfies Pick<IAnalysisService, 'getRecentActivity'>

  const result = await loadVideosRecentActivity(false, analysis)

  assert.deepEqual(result, [])
  assert.equal(calls, 0)
})

test('mock mode preserves only video and analysis activity', async () => {
  const activity: ActivityItem[] = [
    {
      id: 'activity-video',
      type: 'video',
      title: 'Video subido',
      detail: 'Partido de prueba',
      timestamp: '2026-09-23T12:00:00.000Z',
    },
    {
      id: 'activity-analysis',
      type: 'analysis',
      title: 'Análisis listo',
      detail: 'Partido de prueba',
      timestamp: '2026-09-23T12:01:00.000Z',
    },
    {
      id: 'activity-team',
      type: 'team',
      title: 'Equipo creado',
      detail: 'Equipo de prueba',
      timestamp: '2026-09-23T12:02:00.000Z',
    },
  ]

  const result = await loadVideosRecentActivity(true, {
    getRecentActivity: async () => activity,
  })

  assert.deepEqual(result.map((item) => item.id), ['activity-video', 'activity-analysis'])
})
