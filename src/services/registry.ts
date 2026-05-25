import type { IAuthService } from './contracts/auth.service'
import type { ITeamService } from './contracts/teams.service'
import type { IPlayerService } from './contracts/players.service'
import type { IMatchService } from './contracts/matches.service'
import type { IVideoService } from './contracts/videos.service'
import type { IAnalysisService } from './contracts/analysis.service'
import { mockAuthService } from './mock/auth.mock'
import { mockTeamService } from './mock/teams.mock'
import { mockPlayerService } from './mock/players.mock'
import { mockMatchService } from './mock/matches.mock'
import { mockVideoService } from './mock/videos.mock'
import { mockAnalysisService } from './mock/analysis.mock'

/** Switch implementations here when connecting the real API */
export const authService: IAuthService = mockAuthService
export const teamService: ITeamService = mockTeamService
export const playerService: IPlayerService = mockPlayerService
export const matchService: IMatchService = mockMatchService
export const videoService: IVideoService = mockVideoService
export const analysisService: IAnalysisService = mockAnalysisService
