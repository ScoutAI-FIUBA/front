import type { AnalysisJobCourtPositions } from '@/types'

export interface IAnalysisJobCourtPositionsService {
  get(jobId: string, teamId: string): Promise<AnalysisJobCourtPositions>
}
