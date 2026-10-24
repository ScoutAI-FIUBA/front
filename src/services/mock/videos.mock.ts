import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IVideoService } from '../contracts/videos.service'
import { MatchApiError } from '../api/matches.client'
import { mockMatchService } from './matches.mock'

export const mockVideoService: IVideoService = {
  canRequestAnalysis: true,

  async list() {
    await simulateNetwork()
    return getStore().videos
  },

  async getById(id) {
    await simulateNetwork()
    return getStore().videos.find((v) => v.id === id) ?? null
  },

  async filterByTeam(teamId) {
    await simulateNetwork()
    return getStore().videos.filter((v) => v.teamId === teamId)
  },

  async filterByStatus(status) {
    await simulateNetwork()
    if (status === 'all') return getStore().videos
    return getStore().videos.filter((v) => v.status === status)
  },

  async upload(dto) {
    await simulateNetwork(800)
      const video = {
        id: generateId('video'),
      matchId: '',
        linkedMatchId: null,
        teamId: dto.teamId,
      title: dto.title,
      storageUrl: `/mock/videos/${dto.file.name}`,
      durationMs: dto.durationMs,
      description: dto.description,
        uploadedAt: new Date().toISOString(),
        status: 'uploaded' as const,
      resolution: '1080p',
    }
    updateStore((s) => {
      s.videos.unshift(video)
      s.activities.unshift({
        id: generateId('act'),
        type: 'video',
        title: 'Video Subido',
        detail: `${dto.title} - Ahora`,
        timestamp: new Date().toISOString(),
      })
    })
    return video
  },

  async setMatch(videoId, teamId, matchId) {
    await simulateNetwork()
    const video = getStore().videos.find((v) => v.id === videoId && v.teamId === teamId)
    if (!video) throw new MatchApiError(404, 'VIDEO_NOT_FOUND', 'Video not found')
    if (matchId !== null) {
      const { match } = await mockMatchService.getWithParticipants(matchId)
      if (match.homeTeamId !== video.teamId && match.awayTeamId !== video.teamId) {
        throw new MatchApiError(422, 'VIDEO_TEAM_NOT_IN_MATCH', 'Video team is not in the match')
      }
    }
    updateStore((s) => {
      const target = s.videos.find((v) => v.id === videoId)
      if (target) target.linkedMatchId = matchId
    })
    return getStore().videos.find((v) => v.id === videoId)!
  },

  async requestAnalysis(videoId) {
    await simulateNetwork()
    updateStore((s) => {
      const v = s.videos.find((x) => x.id === videoId)
      if (v) v.status = 'processing'
      s.analysisSessions.push({
        id: generateId('analysis'),
        matchId: v?.matchId ?? '',
        videoId,
        sessionCode: `SCAN-${Date.now().toString().slice(-4)}`,
        status: 'processing',
        progressPercent: 5,
        totalMinutes: 0,
        framesAnalyzed: 0,
        remainingTime: '--:--',
      })
    })
    return getStore().videos.find((v) => v.id === videoId)!
  },
}
