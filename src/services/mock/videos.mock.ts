import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IVideoService } from '../contracts/videos.service'

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
      matchId: null,
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
