import type { AnalysisDetail, AnalysisSession, DashboardStats, ActivityItem } from '@/types'

export interface IAnalysisService {
  listSessions(): Promise<AnalysisSession[]>
  getByMatchId(matchId: string): Promise<AnalysisDetail | null>
  getBySessionId(sessionId: string): Promise<AnalysisDetail | null>
  getDashboardStats(): Promise<DashboardStats>
  getRecentActivity(): Promise<ActivityItem[]>
}
