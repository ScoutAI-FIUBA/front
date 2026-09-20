import type {
  AnalysisJobSimilarAnalyses,
  AnalysisJobSimilarResult,
} from '../../types/index.ts'
import type { IAnalysisJobSimilarService } from '../contracts/analysis-job-similar.service.ts'
import type { AnalysisJobRequest } from './analysis-jobs.client.ts'

export const ANALYSIS_JOB_SIMILAR_LIMIT = 5
export const ANALYSIS_JOB_SIMILAR_MOVEMENT_WEIGHT = 0.5

export interface ApiAnalysisJobSimilarResult {
  job_id: string
  video_id: string
  score: number
  shot_score: number
  movement_score: number
}

export interface ApiAnalysisJobSimilarAnalyses {
  job_id: string
  video_id: string
  movement_weight: number
  candidates_compared: number
  results: ApiAnalysisJobSimilarResult[]
}

function mapResult(result: ApiAnalysisJobSimilarResult): AnalysisJobSimilarResult {
  return {
    jobId: result.job_id,
    videoId: result.video_id,
    score: result.score,
    shotScore: result.shot_score,
    movementScore: result.movement_score,
  }
}

export function mapAnalysisJobSimilarAnalyses(
  response: ApiAnalysisJobSimilarAnalyses,
): AnalysisJobSimilarAnalyses {
  return {
    jobId: response.job_id,
    videoId: response.video_id,
    movementWeight: response.movement_weight,
    candidatesCompared: response.candidates_compared,
    results: response.results.map(mapResult),
  }
}

export function createAnalysisJobSimilarService(
  request: AnalysisJobRequest,
): IAnalysisJobSimilarService {
  return {
    async get(jobId, teamId) {
      const path = `/jobs/${encodeURIComponent(jobId)}/similar?team_id=${encodeURIComponent(teamId)}&limit=${ANALYSIS_JOB_SIMILAR_LIMIT}&movement_weight=${ANALYSIS_JOB_SIMILAR_MOVEMENT_WEIGHT}`
      const data = await request<ApiAnalysisJobSimilarAnalyses>(path)
      return mapAnalysisJobSimilarAnalyses(data)
    },
  }
}
