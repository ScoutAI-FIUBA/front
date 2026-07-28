import type { IAuthService } from './contracts/auth.service'
import type { ITeamService } from './contracts/teams.service'
import type { IPlayerService } from './contracts/players.service'
import type { IMatchService } from './contracts/matches.service'
import type { IVideoService } from './contracts/videos.service'
import type { IAnalysisService } from './contracts/analysis.service'
import type { IClipCollectionService } from './contracts/clip-collections.service'
import { apiAuthService } from './api/auth.api'
import { apiPlayerService } from './api/players.api'
import { apiTeamService } from './api/teams.api'
import { apiVideoService } from './api/videos.api'
import { apiClipCollectionService } from './api/clip-collections.api'
import { mockAuthService } from './mock/auth.mock'
import { mockTeamService } from './mock/teams.mock'
import { mockPlayerService } from './mock/players.mock'
import { mockMatchService } from './mock/matches.mock'
import { mockVideoService } from './mock/videos.mock'
import { mockAnalysisService } from './mock/analysis.mock'
import { mockClipCollectionService } from './mock/clip-collections.mock'

/** Set VITE_USE_MOCK_API=true to use sessionStorage mocks instead of the backend */
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true'

export const authService: IAuthService = useMockApi ? mockAuthService : apiAuthService
export const teamService: ITeamService = useMockApi ? mockTeamService : apiTeamService
export const playerService: IPlayerService = useMockApi ? mockPlayerService : apiPlayerService

/** Partidos y análisis siguen en mock hasta que existan en el backend */
export const matchService: IMatchService = mockMatchService
export const videoService: IVideoService = useMockApi ? mockVideoService : apiVideoService
export const clipCollectionService: IClipCollectionService = useMockApi
  ? mockClipCollectionService
  : apiClipCollectionService
export const analysisService: IAnalysisService = mockAnalysisService
