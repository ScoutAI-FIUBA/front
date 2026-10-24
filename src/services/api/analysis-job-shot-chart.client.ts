import type {
  AnalysisJobShotChart,
  AnalysisJobShotChartCourt,
  AnalysisJobShotChartCoverage,
  AnalysisJobShotChartPlayer,
  AnalysisJobShotChartShot,
  AnalysisJobTeamSide,
  PlayerShotOutcomeConfidence,
  ShotChartResult,
} from '../../types/index.ts'
import type { IAnalysisJobShotChartService } from '../contracts/analysis-job-shot-chart.service.ts'
import type { AnalysisJobRequest } from './analysis-jobs.client.ts'

const OUTCOME_CONFIDENCES: readonly PlayerShotOutcomeConfidence[] = ['detected', 'inferred', 'timeout', 'unresolved']

export function mapAnalysisJobOutcomeConfidence(value: unknown): PlayerShotOutcomeConfidence | null {
  return OUTCOME_CONFIDENCES.find((confidence) => confidence === value) ?? null
}

interface ApiCourtPoint {
  x_m: number
  y_m: number
}

export interface ApiAnalysisJobShotChartCourt {
  length_m: number
  width_m: number
  hoop_inset_m: number
  hoops: {
    home: ApiCourtPoint
    away: ApiCourtPoint
  }
  three_point_radius_m: number
  corner_three_lateral_m: number
}

export interface ApiAnalysisJobShotChartShot {
  shot_id: string | number | null
  track_id: number | null
  stable_player_id?: string | null
  team_id: AnalysisJobTeamSide | null
  jersey_number: string | null
  roster_player_id: string | null
  roster_name: string | null
  x_m: number
  y_m: number
  made: boolean
  result: ShotChartResult
  points: 2 | 3
  zone: string
  distance_m: number
  shot_type: string | null
  timestamp_seconds: number | null
  attribution: string | null
  outcome_confidence?: string | null
  needs_review?: boolean | null
}

export interface ApiAnalysisJobShotChartPlayer {
  track_id: number
  stable_player_id?: string | null
  team_id: AnalysisJobTeamSide | null
  jersey_number: string | null
  display_name: string
  shots: ApiAnalysisJobShotChartShot[]
}

export interface ApiAnalysisJobShotChartCoverage {
  shots_detected: number
  shots_scored: number
  shots_without_court_position: number
  shots_without_shooter: number
  players_tracked: number
  players_on_court?: number
  players_with_jersey_number: number
  players_linked_to_roster: number
  measures: string[]
  not_measured: string[]
  shots_charted: number
  filtered_to_track_id: number | null
  filtered_to_stable_player_id?: string | null
}

export interface ApiAnalysisJobShotChart {
  court: ApiAnalysisJobShotChartCourt
  shots: ApiAnalysisJobShotChartShot[]
  players: ApiAnalysisJobShotChartPlayer[]
  coverage: ApiAnalysisJobShotChartCoverage
}

export function mapCourt(court: ApiAnalysisJobShotChartCourt): AnalysisJobShotChartCourt {
  return {
    lengthM: court.length_m,
    widthM: court.width_m,
    hoopInsetM: court.hoop_inset_m,
    hoops: {
      home: { xM: court.hoops.home.x_m, yM: court.hoops.home.y_m },
      away: { xM: court.hoops.away.x_m, yM: court.hoops.away.y_m },
    },
    threePointRadiusM: court.three_point_radius_m,
    cornerThreeLateralM: court.corner_three_lateral_m,
  }
}

function mapShot(shot: ApiAnalysisJobShotChartShot): AnalysisJobShotChartShot {
  return {
    shotId: shot.shot_id,
    trackId: shot.track_id,
    stablePlayerId: shot.stable_player_id ?? null,
    teamSide: shot.team_id,
    jerseyNumber: shot.jersey_number,
    rosterPlayerId: shot.roster_player_id,
    rosterName: shot.roster_name,
    xM: shot.x_m,
    yM: shot.y_m,
    made: shot.made,
    result: shot.result,
    points: shot.points,
    zone: shot.zone,
    distanceM: shot.distance_m,
    shotType: shot.shot_type,
    timestampSeconds: shot.timestamp_seconds,
    attribution: shot.attribution,
    outcomeConfidence: mapAnalysisJobOutcomeConfidence(shot.outcome_confidence),
    needsReview: typeof shot.needs_review === 'boolean' ? shot.needs_review : null,
  }
}

function mapPlayer(player: ApiAnalysisJobShotChartPlayer): AnalysisJobShotChartPlayer {
  return {
    trackId: player.track_id,
    stablePlayerId: player.stable_player_id ?? null,
    teamSide: player.team_id,
    jerseyNumber: player.jersey_number,
    displayName: player.display_name,
    shots: player.shots.map(mapShot),
  }
}

function mapCoverage(
  coverage: ApiAnalysisJobShotChartCoverage,
): AnalysisJobShotChartCoverage {
  return {
    shotsDetected: coverage.shots_detected,
    shotsScored: coverage.shots_scored,
    shotsWithoutCourtPosition: coverage.shots_without_court_position,
    shotsWithoutShooter: coverage.shots_without_shooter,
    playersTracked: coverage.players_tracked,
    playersOnCourt: coverage.players_on_court ?? 0,
    playersWithJerseyNumber: coverage.players_with_jersey_number,
    playersLinkedToRoster: coverage.players_linked_to_roster,
    measures: coverage.measures,
    notMeasured: coverage.not_measured,
    shotsCharted: coverage.shots_charted,
    filteredToTrackId: coverage.filtered_to_track_id,
    filteredToStablePlayerId: coverage.filtered_to_stable_player_id ?? null,
  }
}

export function mapAnalysisJobShotChart(
  response: ApiAnalysisJobShotChart,
): AnalysisJobShotChart {
  return {
    court: mapCourt(response.court),
    shots: response.shots.map(mapShot),
    players: response.players.map(mapPlayer),
    coverage: mapCoverage(response.coverage),
  }
}

export function createAnalysisJobShotChartService(
  request: AnalysisJobRequest,
): IAnalysisJobShotChartService {
  return {
    async get(jobId, teamId) {
      const path = `/jobs/${encodeURIComponent(jobId)}/shot-chart?team_id=${encodeURIComponent(teamId)}`
      const data = await request<ApiAnalysisJobShotChart>(path)
      return mapAnalysisJobShotChart(data)
    },
  }
}
