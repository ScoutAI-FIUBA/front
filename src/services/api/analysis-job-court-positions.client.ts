import type {
  AnalysisJobCourtPosition,
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsCoverage,
  AnalysisJobCourtPositionsPlayer,
  AnalysisJobCourtPositionsSource,
  AnalysisJobTeamSide,
} from '../../types/index.ts'
import type { IAnalysisJobCourtPositionsService } from '../contracts/analysis-job-court-positions.service.ts'
import type { AnalysisJobRequest } from './analysis-jobs.client.ts'

/** Keeps long paths light enough to draw while backend movement metrics stay complete. */
export const COURT_POSITIONS_SAMPLE_EVERY = 5

interface ApiCourtPosition {
  frame_index: number | null
  x_m: number
  y_m: number
}

interface ApiCourtMovement {
  samples: number
  distance_m: number
  average_position: {
    x_m: number
    y_m: number
  }
}

export interface ApiAnalysisJobCourtPositionsPlayer {
  track_id: number
  stable_player_id?: string | null
  team_id: AnalysisJobTeamSide | null
  jersey_number: string | null
  positions: ApiCourtPosition[]
  movement: ApiCourtMovement
}

export interface ApiAnalysisJobCourtPositionsCoverage {
  source_file: AnalysisJobCourtPositionsSource
  records_read: number
  records_off_court: number
  sample_every: number
  truncated: boolean
}

export interface ApiAnalysisJobCourtPositions {
  job_id: string
  video_id: string
  court: {
    length_m: number
    width_m: number
  }
  players: ApiAnalysisJobCourtPositionsPlayer[]
  coverage: ApiAnalysisJobCourtPositionsCoverage
}

function mapPosition(position: ApiCourtPosition): AnalysisJobCourtPosition {
  return {
    frameIndex: position.frame_index,
    xM: position.x_m,
    yM: position.y_m,
  }
}

function mapPlayer(
  player: ApiAnalysisJobCourtPositionsPlayer,
): AnalysisJobCourtPositionsPlayer {
  return {
    trackId: player.track_id,
    stablePlayerId: player.stable_player_id ?? null,
    teamSide: player.team_id,
    jerseyNumber: player.jersey_number,
    positions: player.positions.map(mapPosition),
    movement: {
      samples: player.movement.samples,
      distanceM: player.movement.distance_m,
      averagePosition: {
        xM: player.movement.average_position.x_m,
        yM: player.movement.average_position.y_m,
      },
    },
  }
}

function mapCoverage(
  coverage: ApiAnalysisJobCourtPositionsCoverage,
): AnalysisJobCourtPositionsCoverage {
  return {
    sourceFile: coverage.source_file,
    recordsRead: coverage.records_read,
    recordsOffCourt: coverage.records_off_court,
    sampleEvery: coverage.sample_every,
    truncated: coverage.truncated,
  }
}

export function mapAnalysisJobCourtPositions(
  response: ApiAnalysisJobCourtPositions,
): AnalysisJobCourtPositions {
  return {
    jobId: response.job_id,
    videoId: response.video_id,
    court: {
      lengthM: response.court.length_m,
      widthM: response.court.width_m,
    },
    players: response.players.map(mapPlayer),
    coverage: mapCoverage(response.coverage),
  }
}

export function createAnalysisJobCourtPositionsService(
  request: AnalysisJobRequest,
): IAnalysisJobCourtPositionsService {
  return {
    async get(jobId, teamId) {
      const path = `/jobs/${encodeURIComponent(jobId)}/court-positions?team_id=${encodeURIComponent(teamId)}&sample_every=${COURT_POSITIONS_SAMPLE_EVERY}`
      const data = await request<ApiAnalysisJobCourtPositions>(path)
      return mapAnalysisJobCourtPositions(data)
    },
  }
}
