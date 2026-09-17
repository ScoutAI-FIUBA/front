import type { AnalysisJobShotChart } from '@/types'

export interface IAnalysisJobShotChartService {
  get(jobId: string, teamId: string): Promise<AnalysisJobShotChart>
}
