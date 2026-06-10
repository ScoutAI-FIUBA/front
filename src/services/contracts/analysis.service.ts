import type { AnalysisDetail, AnalysisSession, DashboardStats, ActivityItem, ManualAnalysisDraft } from '@/types'

export interface IAnalysisService {
  listSessions(): Promise<AnalysisSession[]>
  getByMatchId(matchId: string): Promise<AnalysisDetail | null>
  getBySessionId(sessionId: string): Promise<AnalysisDetail | null>
  saveManualAnalysis(draft: ManualAnalysisDraft): Promise<AnalysisSession>
  getDashboardStats(): Promise<DashboardStats>
  getRecentActivity(): Promise<ActivityItem[]>
}
