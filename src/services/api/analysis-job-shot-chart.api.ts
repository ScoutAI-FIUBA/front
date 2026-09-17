import { apiJson } from './http-client'
import { createAnalysisJobShotChartService } from './analysis-job-shot-chart.client'

export const apiAnalysisJobShotChartService = createAnalysisJobShotChartService(
  (path, init) => apiJson(path, init),
)
