import type { IAnalysisJobService } from '../../services/contracts/analysis-jobs.service.ts'
import type { ITeamService } from '../../services/contracts/teams.service.ts'
import type { IVideoService } from '../../services/contracts/videos.service.ts'
import { isApiErrorStatus } from '../../services/api/errors.ts'
import type { ProcessingJob, Team, Video } from '../../types/index.ts'

export interface AnalysisJobDetailModel {
  job: ProcessingJob
  video: Video | null
  team: Team | null
}

interface AnalysisJobDetailDependencies {
  analysisJobs: Pick<IAnalysisJobService, 'get'>
  videos: Pick<IVideoService, 'getById'>
  teams: Pick<ITeamService, 'getById'>
}

export function canOpenAnalysisJob(job: ProcessingJob): boolean {
  return job.status === 'DONE'
}

export function analysisJobDetailPath(job: ProcessingJob): string {
  return `/analisis/jobs/${encodeURIComponent(job.id)}?team_id=${encodeURIComponent(job.teamId)}`
}

export function classifyAnalysisJobDetailError(error: unknown): 'not-found' | 'error' {
  return isApiErrorStatus(error, 404) ? 'not-found' : 'error'
}

export async function loadAnalysisJobDetail(
  jobId: string,
  teamId: string,
  dependencies: AnalysisJobDetailDependencies,
): Promise<AnalysisJobDetailModel> {
  const job = await dependencies.analysisJobs.get(jobId, teamId)
  const [videoResult, teamResult] = await Promise.allSettled([
    dependencies.videos.getById(job.videoId),
    dependencies.teams.getById(job.teamId),
  ])

  return {
    job,
    video: videoResult.status === 'fulfilled' ? videoResult.value : null,
    team: teamResult.status === 'fulfilled' ? teamResult.value : null,
  }
}
