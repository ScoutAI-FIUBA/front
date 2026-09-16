import type { ProcessingJob } from '@/types'

export interface IAnalysisJobService {
  listForVideo(videoId: string, teamId: string): Promise<ProcessingJob[]>
  get(jobId: string, teamId: string): Promise<ProcessingJob>
}
