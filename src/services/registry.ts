import type { IAuthService } from './contracts/auth.service'
import type { ITeamService } from './contracts/teams.service'
import type { IPlayerService } from './contracts/players.service'
import type { IMatchService } from './contracts/matches.service'
import type { IVideoService } from './contracts/videos.service'
import type { IAnalysisService } from './contracts/analysis.service'
import type { IAnalysisJobService } from './contracts/analysis-jobs.service'
import type { IAnalysisJobTeamSideService } from './contracts/analysis-job-team-sides.service'
import type { IAnalysisJobStatsService } from './contracts/analysis-job-stats.service'
import type { IAnalysisJobShotChartService } from './contracts/analysis-job-shot-chart.service'
import type { IAnalysisJobCourtPositionsService } from './contracts/analysis-job-court-positions.service'
import type { IAnalysisJobSimilarService } from './contracts/analysis-job-similar.service'
import type { IClipCollectionService } from './contracts/clip-collections.service'
import { apiAuthService } from './api/auth.api'
import { apiPlayerService } from './api/players.api'
import { apiTeamService } from './api/teams.api'
import { apiVideoService, getApiVideoByIdForTeam } from './api/videos.api'
import { apiClipCollectionService } from './api/clip-collections.api'
import { apiAnalysisJobService } from './api/analysis-jobs.api'
import { apiAnalysisJobTeamSideService } from './api/analysis-job-team-sides.api'
import { apiAnalysisJobStatsService } from './api/analysis-job-stats.api'
import { apiAnalysisJobShotChartService } from './api/analysis-job-shot-chart.api'
import { apiAnalysisJobCourtPositionsService } from './api/analysis-job-court-positions.api'
import { apiAnalysisJobSimilarService } from './api/analysis-job-similar.api'
import { mockAuthService } from './mock/auth.mock'
import { mockTeamService } from './mock/teams.mock'
import { mockPlayerService } from './mock/players.mock'
import { mockMatchService } from './mock/matches.mock'
import { mockVideoService } from './mock/videos.mock'
import { mockAnalysisService } from './mock/analysis.mock'
import { mockClipCollectionService } from './mock/clip-collections.mock'

/** Set VITE_USE_MOCK_API=true to use sessionStorage mocks instead of the backend */
export const isMockApiEnabled = import.meta.env.VITE_USE_MOCK_API === 'true'

export const authService: IAuthService = isMockApiEnabled ? mockAuthService : apiAuthService
export const teamService: ITeamService = isMockApiEnabled ? mockTeamService : apiTeamService
export const playerService: IPlayerService = isMockApiEnabled ? mockPlayerService : apiPlayerService

/** Partidos y el flujo manual legacy siguen en mock; el análisis automático usa ProcessingJobs reales. */
export const matchService: IMatchService = mockMatchService
export const videoService: IVideoService = isMockApiEnabled ? mockVideoService : apiVideoService
export const getVideoByIdForTeam = (videoId: string, teamId: string) => (
  isMockApiEnabled
    ? mockVideoService.getById(videoId)
    : getApiVideoByIdForTeam(videoId, teamId)
)
export const clipCollectionService: IClipCollectionService = isMockApiEnabled
  ? mockClipCollectionService
  : apiClipCollectionService
export const analysisService: IAnalysisService = mockAnalysisService

/** Real processing-job boundary; it remains separate from the mock AnalysisSession service. */
export const analysisJobService: IAnalysisJobService = apiAnalysisJobService
export const analysisJobTeamSideService: IAnalysisJobTeamSideService = apiAnalysisJobTeamSideService
export const analysisJobStatsService: IAnalysisJobStatsService = apiAnalysisJobStatsService
export const analysisJobShotChartService: IAnalysisJobShotChartService = apiAnalysisJobShotChartService
export const analysisJobCourtPositionsService: IAnalysisJobCourtPositionsService = apiAnalysisJobCourtPositionsService
export const analysisJobSimilarService: IAnalysisJobSimilarService = apiAnalysisJobSimilarService
