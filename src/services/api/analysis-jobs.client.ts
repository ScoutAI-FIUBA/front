import type { ProcessingJob, ProcessingJobStatus } from '../../types/index.ts'
import type { IAnalysisJobService } from '../contracts/analysis-jobs.service.ts'

export interface ApiProcessingJob {
  id: string
  video_id: string
  team_id: string
  requested_by_user_id: string
  status: ProcessingJobStatus
  results_key: string | null
  error_message: string | null
  progress_percent: number | null
  summary: Record<string, unknown> | null
  our_team_side: 0 | 1 | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

interface VideoJobsResponse {
  jobs: ApiProcessingJob[]
}

interface ProcessingJobResponse {
  job: ApiProcessingJob
}

export type AnalysisJobRequest = <T>(path: string) => Promise<T>

export function mapProcessingJob(job: ApiProcessingJob): ProcessingJob {
  return {
    id: job.id,
    videoId: job.video_id,
    teamId: job.team_id,
    requestedByUserId: job.requested_by_user_id,
    status: job.status,
    resultsKey: job.results_key,
    errorMessage: job.error_message,
    progressPercent: job.progress_percent,
    summary: job.summary,
    ourTeamSide: job.our_team_side,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
}

function withTeamId(path: string, teamId: string): string {
  return `${path}?team_id=${encodeURIComponent(teamId)}`
}

export function createAnalysisJobService(request: AnalysisJobRequest): IAnalysisJobService {
  return {
    async listForVideo(videoId, teamId) {
      const path = withTeamId(
        `/videos/${encodeURIComponent(videoId)}/jobs`,
        teamId,
      )
      const data = await request<VideoJobsResponse>(path)
      return data.jobs.map(mapProcessingJob)
    },

    async get(jobId, teamId) {
      const path = withTeamId(`/jobs/${encodeURIComponent(jobId)}`, teamId)
      const data = await request<ProcessingJobResponse>(path)
      return mapProcessingJob(data.job)
    },
  }
}
