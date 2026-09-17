import type { IAnalysisJobShotChartService } from '../../services/contracts/analysis-job-shot-chart.service.ts'
import type {
  AnalysisJobShotChart,
  AnalysisJobTeamSide,
  ProcessingJobStatus,
} from '../../types/index.ts'

export interface AnalysisJobShotChartLoadContext {
  jobId: string
  teamId: string
  status: ProcessingJobStatus
  ourTeamSide: AnalysisJobTeamSide | null
}

export function analysisJobShotChartLoadKey(
  context: AnalysisJobShotChartLoadContext,
): string | null {
  if (context.status !== 'DONE' || context.ourTeamSide == null) return null
  return `${context.jobId}:${context.teamId}:${context.ourTeamSide}`
}

export async function loadAnalysisJobShotChart(
  context: AnalysisJobShotChartLoadContext,
  service: Pick<IAnalysisJobShotChartService, 'get'>,
): Promise<AnalysisJobShotChart | null> {
  if (!analysisJobShotChartLoadKey(context)) return null
  return service.get(context.jobId, context.teamId)
}
