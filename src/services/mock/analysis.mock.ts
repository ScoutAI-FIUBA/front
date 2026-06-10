import { simulateNetwork } from '@/mocks/delays'
import { generateId, getStore, updateStore } from '@/mocks/store'
import type { IAnalysisService } from '../contracts/analysis.service'
import type { AnalysisDetail, AnalysisSession } from '@/types'

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

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

  async saveManualAnalysis(draft) {
    await simulateNetwork(500)
    let savedSession: AnalysisSession | null = null

    updateStore((s) => {
      if (!s.manualAnalyses) s.manualAnalyses = []

      const now = new Date().toISOString()
      const matchId = generateId('manual-match')
      const sessionId = generateId('analysis')
      const rivalTeamId = draft.rivalTeamId ?? s.teams.find((team) => team.id !== draft.teamId)?.id ?? draft.teamId

      if (!s.videos.some((video) => video.id === draft.video.id)) {
        s.videos.unshift({ ...draft.video, matchId, status: 'analyzed' })
      } else {
        const video = s.videos.find((item) => item.id === draft.video.id)
        if (video) {
          video.matchId = matchId
          video.status = 'analyzed'
        }
      }

      s.matches.unshift({
        id: matchId,
        homeTeamId: draft.teamId,
        awayTeamId: rivalTeamId,
        scheduledAt: now,
        competition: 'Analisis manual',
        status: 'completed',
        title: draft.name,
      })

      savedSession = {
        id: sessionId,
        matchId,
        videoId: draft.video.id,
        sessionCode: `MAN-${Date.now().toString().slice(-4)}`,
        status: 'completed',
        progressPercent: 100,
        totalMinutes: Math.ceil(Math.max(...draft.clips.map((clip) => clip.endSecond), 0) / 60),
        framesAnalyzed: draft.clips.length,
        remainingTime: '00:00',
      }

      s.analysisSessions.unshift(savedSession)
      s.manualAnalyses.unshift({ ...draft, sessionId, savedAt: now })
      s.gameEvents.unshift(
        ...draft.clips.map((clip, index) => ({
          id: generateId('evt'),
          matchId,
          playerId: draft.playerIds[index % Math.max(draft.playerIds.length, 1)] ?? '',
          teamId: draft.teamId,
          videoId: draft.video.id,
          eventType: 'pass' as const,
          quarter: 1 as const,
          metadata: {
            label: clip.label,
            minute: `${formatSeconds(clip.startSecond)}-${formatSeconds(clip.endSecond)}`,
          },
        })),
      )
      s.activities.unshift({
        id: generateId('act'),
        type: 'analysis',
        title: 'Analisis manual guardado',
        detail: `${draft.name} - ${draft.clips.length} clips`,
        timestamp: now,
      })
    })

    if (!savedSession) throw new Error('No se pudo guardar el analisis')
    return savedSession
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
