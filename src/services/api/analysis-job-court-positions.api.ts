import { apiJson } from './http-client'
import { createAnalysisJobCourtPositionsService } from './analysis-job-court-positions.client'

export const apiAnalysisJobCourtPositionsService = createAnalysisJobCourtPositionsService(
  (path, init) => apiJson(path, init),
)
