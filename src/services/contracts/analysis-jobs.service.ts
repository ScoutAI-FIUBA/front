import type { ProcessingJob } from '@/types'

export interface CreateAnalysisJobDto {
  teamId: string
  pipeline?: string
}

export interface IAnalysisJobService {
  create(videoId: string, dto: CreateAnalysisJobDto): Promise<ProcessingJob>
  listForVideo(videoId: string, teamId: string): Promise<ProcessingJob[]>
  get(jobId: string, teamId: string): Promise<ProcessingJob>
}
