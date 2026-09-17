import type { IAnalysisJobStatsService } from '../../services/contracts/analysis-job-stats.service.ts'
import type {
  AnalysisJobShootingStats,
  AnalysisJobTeamSide,
  ProcessingJobStatus,
} from '../../types/index.ts'

export interface AnalysisJobStatsLoadContext {
  jobId: string
  teamId: string
  status: ProcessingJobStatus
  ourTeamSide: AnalysisJobTeamSide | null
}

export function analysisJobStatsLoadKey(
  context: AnalysisJobStatsLoadContext,
): string | null {
  if (context.status !== 'DONE' || context.ourTeamSide == null) return null
  return `${context.jobId}:${context.teamId}:${context.ourTeamSide}`
}

export async function loadAnalysisJobStats(
  context: AnalysisJobStatsLoadContext,
  service: Pick<IAnalysisJobStatsService, 'get'>,
): Promise<AnalysisJobShootingStats | null> {
  if (!analysisJobStatsLoadKey(context)) return null
  return service.get(context.jobId, context.teamId)
}
