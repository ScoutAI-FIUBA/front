import type { IAnalysisJobSimilarService } from '../../services/contracts/analysis-job-similar.service.ts'
import { ANALYSIS_JOB_SIMILAR_LIMIT } from '../../services/api/analysis-job-similar.client.ts'
import type {
  AnalysisJobSimilarAnalyses,
  AnalysisJobSimilarResult,
  ProcessingJob,
  ProcessingJobStatus,
} from '../../types/index.ts'

export interface AnalysisJobSimilarLoadContext {
  jobId: string
  teamId: string
  status: ProcessingJobStatus
}

export function analysisJobSimilarContextForJob(
  job: Pick<ProcessingJob, 'id' | 'teamId' | 'status'>,
): AnalysisJobSimilarLoadContext {
  return {
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
  }
}

export function analysisJobSimilarLoadKey(
  context: AnalysisJobSimilarLoadContext,
): string | null {
  if (context.status !== 'DONE') return null
  return `${context.jobId}:${context.teamId}`
}

export async function loadAnalysisJobSimilar(
  context: AnalysisJobSimilarLoadContext,
  service: Pick<IAnalysisJobSimilarService, 'get'>,
): Promise<AnalysisJobSimilarAnalyses | null> {
  if (!analysisJobSimilarLoadKey(context)) return null
  return service.get(context.jobId, context.teamId)
}

export function similarResultsForDisplay(
  results: AnalysisJobSimilarResult[],
): AnalysisJobSimilarResult[] {
  return results.slice(0, ANALYSIS_JOB_SIMILAR_LIMIT)
}

export function formatSimilarityScore(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function analysisJobSimilarPath(jobId: string, teamId: string): string {
  return `/analisis/jobs/${encodeURIComponent(jobId)}?team_id=${encodeURIComponent(teamId)}`
}
