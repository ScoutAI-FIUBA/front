import type { AnalysisJobSimilarAnalyses } from '@/types'

export interface IAnalysisJobSimilarService {
  get(jobId: string, teamId: string): Promise<AnalysisJobSimilarAnalyses>
}
