import { apiJson } from './http-client'
import { createAnalysisJobService } from './analysis-jobs.client'

export const apiAnalysisJobService = createAnalysisJobService((path) => apiJson(path))
