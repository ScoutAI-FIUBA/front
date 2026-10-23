import { apiJson } from './http-client'
import { createPlayerAnalysisService } from './player-analysis.client'

export const apiPlayerAnalysisService = createPlayerAnalysisService(
  (path, init) => apiJson(path, init),
)
