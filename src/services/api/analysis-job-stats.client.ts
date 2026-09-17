import type {
  AnalysisJobPlayerShootingStats,
  AnalysisJobShootingStats,
  AnalysisJobShotStat,
  AnalysisJobStatsCoverage,
  AnalysisJobTeamSide,
  AnalysisJobTeamShootingStats,
  ShootingTotals,
  ShootingZoneStats,
} from '../../types/index.ts'
import type { IAnalysisJobStatsService } from '../contracts/analysis-job-stats.service.ts'
import type { AnalysisJobRequest } from './analysis-jobs.client.ts'

interface ApiShootingZoneStats {
  made: number
  attempted: number
  pct: number | null
}

interface ApiShootingTotals {
  points: number
  field_goals_made: number
  field_goals_attempted: number
  field_goal_pct: number | null
  two_point_made: number
  two_point_attempted: number
  two_point_pct: number | null
  three_point_made: number
  three_point_attempted: number
  three_point_pct: number | null
  by_zone: Record<string, ApiShootingZoneStats>
}

export interface ApiAnalysisJobTeamShootingStats extends ApiShootingTotals {
  team_id: AnalysisJobTeamSide
  players_tracked: number
}

export interface ApiAnalysisJobPlayerShootingStats extends ApiShootingTotals {
  track_id: number
  team_id: AnalysisJobTeamSide | null
  jersey_number: string | null
  roster_player_id: string | null
  roster_name: string | null
  display_name: string
}

export interface ApiAnalysisJobShotStat {
  shot_id: string | number | null
  track_id: number | null
  team_id: AnalysisJobTeamSide | null
  jersey_number: string | null
  roster_player_id: string | null
  roster_name: string | null
  made: boolean
  outcome: string | null
  points: 2 | 3
  zone: string
  distance_m: number
  court_x_m: number
  court_y_m: number
  timestamp_seconds: number | null
  shot_type: string | null
  attribution: string | null
}

export interface ApiAnalysisJobStatsCoverage {
  shots_detected: number
  shots_scored: number
  shots_without_court_position: number
  shots_without_shooter: number
  players_tracked: number
  players_with_jersey_number: number
  players_linked_to_roster: number
  measures: string[]
  not_measured: string[]
}

export interface ApiAnalysisJobShootingStats {
  job_id: string
  video_id: string
  our_team_side: AnalysisJobTeamSide | null
  teams: ApiAnalysisJobTeamShootingStats[]
  players: ApiAnalysisJobPlayerShootingStats[]
  shots: ApiAnalysisJobShotStat[]
  coverage: ApiAnalysisJobStatsCoverage
}

function mapZones(
  zones: Record<string, ApiShootingZoneStats>,
): Record<string, ShootingZoneStats> {
  return Object.fromEntries(
    Object.entries(zones).map(([zone, stats]) => [zone, {
      made: stats.made,
      attempted: stats.attempted,
      percentage: stats.pct,
    }]),
  )
}

function mapShootingTotals(totals: ApiShootingTotals): ShootingTotals {
  return {
    points: totals.points,
    fieldGoalsMade: totals.field_goals_made,
    fieldGoalsAttempted: totals.field_goals_attempted,
    fieldGoalPercentage: totals.field_goal_pct,
    twoPointMade: totals.two_point_made,
    twoPointAttempted: totals.two_point_attempted,
    twoPointPercentage: totals.two_point_pct,
    threePointMade: totals.three_point_made,
    threePointAttempted: totals.three_point_attempted,
    threePointPercentage: totals.three_point_pct,
    byZone: mapZones(totals.by_zone),
  }
}

function mapTeam(team: ApiAnalysisJobTeamShootingStats): AnalysisJobTeamShootingStats {
  return {
    teamSide: team.team_id,
    playersTracked: team.players_tracked,
    ...mapShootingTotals(team),
  }
}

function mapPlayer(player: ApiAnalysisJobPlayerShootingStats): AnalysisJobPlayerShootingStats {
  return {
    trackId: player.track_id,
    teamSide: player.team_id,
    jerseyNumber: player.jersey_number,
    rosterPlayerId: player.roster_player_id,
    rosterName: player.roster_name,
    displayName: player.display_name,
    ...mapShootingTotals(player),
  }
}

function mapShot(shot: ApiAnalysisJobShotStat): AnalysisJobShotStat {
  return {
    shotId: shot.shot_id,
    trackId: shot.track_id,
    teamSide: shot.team_id,
    jerseyNumber: shot.jersey_number,
    rosterPlayerId: shot.roster_player_id,
    rosterName: shot.roster_name,
    made: shot.made,
    outcome: shot.outcome,
    points: shot.points,
    zone: shot.zone,
    distanceM: shot.distance_m,
    courtXM: shot.court_x_m,
    courtYM: shot.court_y_m,
    timestampSeconds: shot.timestamp_seconds,
    shotType: shot.shot_type,
    attribution: shot.attribution,
  }
}

function mapCoverage(coverage: ApiAnalysisJobStatsCoverage): AnalysisJobStatsCoverage {
  return {
    shotsDetected: coverage.shots_detected,
    shotsScored: coverage.shots_scored,
    shotsWithoutCourtPosition: coverage.shots_without_court_position,
    shotsWithoutShooter: coverage.shots_without_shooter,
    playersTracked: coverage.players_tracked,
    playersWithJerseyNumber: coverage.players_with_jersey_number,
    playersLinkedToRoster: coverage.players_linked_to_roster,
    measures: coverage.measures,
    notMeasured: coverage.not_measured,
  }
}

export function mapAnalysisJobShootingStats(
  response: ApiAnalysisJobShootingStats,
): AnalysisJobShootingStats {
  return {
    jobId: response.job_id,
    videoId: response.video_id,
    ourTeamSide: response.our_team_side,
    teams: response.teams.map(mapTeam),
    players: response.players.map(mapPlayer),
    shots: response.shots.map(mapShot),
    coverage: mapCoverage(response.coverage),
  }
}

export function createAnalysisJobStatsService(
  request: AnalysisJobRequest,
): IAnalysisJobStatsService {
  return {
    async get(jobId, teamId) {
      const path = `/jobs/${encodeURIComponent(jobId)}/stats?team_id=${encodeURIComponent(teamId)}`
      const data = await request<ApiAnalysisJobShootingStats>(path)
      return mapAnalysisJobShootingStats(data)
    },
  }
}
