import { simulateNetwork } from '@/mocks/delays'
import { getStore } from '@/mocks/store'
import type { IAnalysisService } from '../contracts/analysis.service'
import type { AnalysisDetail } from '@/types'

function buildDetail(sessionId: string): AnalysisDetail | null {
  const store = getStore()
  const session = store.analysisSessions.find((a) => a.id === sessionId)
  if (!session) return null

  const match = store.matches.find((m) => m.id === session.matchId)
  const video = store.videos.find((v) => v.id === session.videoId)
  if (!match || !video) return null

  const homeTeam = store.teams.find((t) => t.id === match.homeTeamId)!
  const awayTeam = store.teams.find((t) => t.id === match.awayTeamId)!
  const events = store.gameEvents.filter(
    (e) => e.matchId === match.id && (!e.videoId || e.videoId === video.id),
  )

  const rosterPlayerIds = store.rosters
    .filter((r) => r.matchId === match.id)
    .map((r) => r.playerId)

  const detectedPlayers = store.players
    .filter((p) => rosterPlayerIds.includes(p.id))
    .map((p) => ({
      playerId: p.id,
      name: `${p.firstName.charAt(0)}. ${p.lastName}`,
      jerseyNumber: p.jerseyNumber ?? 0,
      position: p.primaryPosition,
      heatmapPercent: Math.floor(Math.random() * 40) + 30,
    }))

  return { session, match, video, homeTeam, awayTeam, events, detectedPlayers }
}

export const mockAnalysisService: IAnalysisService = {
  async listSessions() {
    await simulateNetwork()
    return getStore().analysisSessions
  },

  async getByMatchId(matchId) {
    await simulateNetwork()
    const session = getStore().analysisSessions.find((a) => a.matchId === matchId)
    if (!session) return null
    return buildDetail(session.id)
  },

  async getBySessionId(sessionId) {
    await simulateNetwork()
    return buildDetail(sessionId)
  },

  async getDashboardStats() {
    await simulateNetwork()
    const store = getStore()
    return {
      totalTeams: store.teams.length,
      totalPlayers: store.players.length,
      totalVideos: store.videos.length,
      pendingAnalysis: store.analysisSessions.filter(
        (a) => a.status === 'processing' || a.status === 'pending',
      ).length,
    }
  },

  async getRecentActivity() {
    await simulateNetwork()
    return getStore().activities.slice(0, 5)
  },
}
