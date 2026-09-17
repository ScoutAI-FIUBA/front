import type { AnalysisJobShootingStats } from '@/types'

export interface IAnalysisJobStatsService {
  get(jobId: string, teamId: string): Promise<AnalysisJobShootingStats>
}
