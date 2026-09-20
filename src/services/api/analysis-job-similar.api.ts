import { apiJson } from './http-client'
import { createAnalysisJobSimilarService } from './analysis-job-similar.client'

export const apiAnalysisJobSimilarService = createAnalysisJobSimilarService(
  (path, init) => apiJson(path, init),
)
