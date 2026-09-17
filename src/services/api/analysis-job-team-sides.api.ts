import { apiJson } from './http-client'
import { createAnalysisJobTeamSideService } from './analysis-job-team-sides.client'

export const apiAnalysisJobTeamSideService = createAnalysisJobTeamSideService(
  (path, init) => apiJson(path, init),
)
