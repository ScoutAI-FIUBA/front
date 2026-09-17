import { apiJson } from './http-client'
import { createAnalysisJobStatsService } from './analysis-job-stats.client'

export const apiAnalysisJobStatsService = createAnalysisJobStatsService(
  (path, init) => apiJson(path, init),
)
