import type {
  PlayerAnalysisStats,
  PlayerAnalysisVideo,
  PlayerShootingLine,
  PlayerShotChart,
  PlayerShotChartShot,
  PlayerShotOutcomeConfidence,
  PlayerZoneLine,
  ShotChartResult,
} from '../../types/index.ts'
import type { IPlayerAnalysisService } from '../contracts/player-analysis.service.ts'
import type { AnalysisJobRequest } from './analysis-jobs.client.ts'
import {
  mapCourt,
  type ApiAnalysisJobShotChartCourt,
} from './analysis-job-shot-chart.client.ts'

export interface ApiPlayerShootingSection {
  made: number
  attempted: number
  pct: number | null
}

export interface ApiPlayerBreakdownEntry extends ApiPlayerShootingSection {
  unresolved_attempts: number
}

export interface ApiPlayerAnalysisVideo {
  job_id: string
  video_id: string
  video_title: string | null
  jersey_number: string | null
  seconds_on_screen: number | null
  distance_m: number | null
  points: number
  field_goals_made: number
  field_goals_attempted: number
  two_point_made: number
  two_point_attempted: number
  three_point_made: number
  three_point_attempted: number
  unresolved_attempts: number
}

export interface ApiPlayerAnalysisStats {
  player_id: string
  calc_version: number
  games: number
  points: number
  field_goals: ApiPlayerShootingSection
  two_point: ApiPlayerShootingSection
  three_point: ApiPlayerShootingSection
  unresolved_attempts: number
  seconds_on_screen: number | null
  distance_m: number | null
  by_zone: Record<string, ApiPlayerBreakdownEntry>
  by_shot_type: Record<string, ApiPlayerBreakdownEntry>
  videos: ApiPlayerAnalysisVideo[]
  not_measured: string[]
}

export interface ApiPlayerShotChartPlayer {
  id: string
  first_name: string
  last_name: string
  jersey_number: string | null
  team_id: string | null
}

export interface ApiPlayerShotChartShot {
  shot_key: string
  shot_id: number | null
  job_id: string
  video_id: string
  video_title: string | null
  x_m: number
  y_m: number
  made: boolean
  result: ShotChartResult
  shot_value: 2 | 3
  zone: string | null
  shot_type: string | null
  distance_m: number | null
  timestamp_seconds: number | null
  outcome_confidence: PlayerShotOutcomeConfidence | null
  outcome_source?: string | null
  release_timestamp_seconds?: number | null
  resolved_timestamp_seconds?: number | null
  attribution?: string | null
  needs_review: boolean | null
}

export interface ApiPlayerShotChartCoverage {
  shots_charted: number
  made: number
  missed: number
  unresolved: number
  videos: number
}

export interface ApiPlayerShotChart {
  player_id: string
  player: ApiPlayerShotChartPlayer
  calc_version: number
  court: ApiAnalysisJobShotChartCourt
  shots: ApiPlayerShotChartShot[]
  coverage: ApiPlayerShotChartCoverage
}

function mapShootingLine(line: ApiPlayerShootingSection | null | undefined): PlayerShootingLine {
  return {
    made: line?.made ?? 0,
    attempted: line?.attempted ?? 0,
    pct: line?.pct ?? null,
  }
}

function mapBreakdown(
  entries: Record<string, ApiPlayerBreakdownEntry> | null | undefined,
): Record<string, PlayerZoneLine> {
  const result: Record<string, PlayerZoneLine> = {}
  for (const [key, entry] of Object.entries(entries ?? {})) {
    result[key] = {
      ...mapShootingLine(entry),
      unresolvedAttempts: entry?.unresolved_attempts ?? 0,
    }
  }
  return result
}

function mapVideo(video: ApiPlayerAnalysisVideo): PlayerAnalysisVideo {
  return {
    jobId: video.job_id,
    videoId: video.video_id,
    videoTitle: video.video_title ?? null,
    jerseyNumber: video.jersey_number ?? null,
    secondsOnScreen: video.seconds_on_screen ?? null,
    distanceM: video.distance_m ?? null,
    points: video.points ?? 0,
    fieldGoals: {
      made: video.field_goals_made ?? 0,
      attempted: video.field_goals_attempted ?? 0,
    },
    twoPoint: {
      made: video.two_point_made ?? 0,
      attempted: video.two_point_attempted ?? 0,
    },
    threePoint: {
      made: video.three_point_made ?? 0,
      attempted: video.three_point_attempted ?? 0,
    },
    unresolvedAttempts: video.unresolved_attempts ?? 0,
  }
}

export function mapPlayerAnalysisStats(
  response: ApiPlayerAnalysisStats,
): PlayerAnalysisStats {
  return {
    playerId: response.player_id,
    calcVersion: response.calc_version,
    games: response.games ?? 0,
    points: response.points ?? 0,
    fieldGoals: mapShootingLine(response.field_goals),
    twoPoint: mapShootingLine(response.two_point),
    threePoint: mapShootingLine(response.three_point),
    unresolvedAttempts: response.unresolved_attempts ?? 0,
    secondsOnScreen: response.seconds_on_screen ?? null,
    distanceM: response.distance_m ?? null,
    byZone: mapBreakdown(response.by_zone),
    byShotType: mapBreakdown(response.by_shot_type),
    videos: (response.videos ?? []).map(mapVideo),
    notMeasured: response.not_measured ?? [],
  }
}

function mapShot(shot: ApiPlayerShotChartShot): PlayerShotChartShot {
  return {
    shotKey: shot.shot_key,
    shotId: shot.shot_id ?? null,
    jobId: shot.job_id,
    videoId: shot.video_id,
    videoTitle: shot.video_title ?? null,
    xM: shot.x_m,
    yM: shot.y_m,
    result: shot.result,
    shotValue: shot.shot_value,
    zone: shot.zone ?? null,
    shotType: shot.shot_type ?? null,
    distanceM: shot.distance_m ?? null,
    timestampSeconds: shot.timestamp_seconds ?? null,
    outcomeConfidence: shot.outcome_confidence ?? null,
    needsReview: shot.needs_review ?? null,
  }
}

export function mapPlayerShotChart(response: ApiPlayerShotChart): PlayerShotChart {
  return {
    playerId: response.player_id,
    player: {
      id: response.player.id,
      firstName: response.player.first_name,
      lastName: response.player.last_name,
      jerseyNumber: response.player.jersey_number ?? null,
      teamId: response.player.team_id ?? null,
    },
    calcVersion: response.calc_version,
    court: mapCourt(response.court),
    shots: (response.shots ?? []).map(mapShot),
    coverage: {
      shotsCharted: response.coverage?.shots_charted ?? 0,
      made: response.coverage?.made ?? 0,
      missed: response.coverage?.missed ?? 0,
      unresolved: response.coverage?.unresolved ?? 0,
      videos: response.coverage?.videos ?? 0,
    },
  }
}

export function createPlayerAnalysisService(
  request: AnalysisJobRequest,
): IPlayerAnalysisService {
  return {
    async getStats(playerId): Promise<PlayerAnalysisStats> {
      const data = await request<ApiPlayerAnalysisStats>(
        `/players/${encodeURIComponent(playerId)}/analysis-stats`,
      )
      return mapPlayerAnalysisStats(data)
    },

    async getShotChart(playerId): Promise<PlayerShotChart> {
      const data = await request<ApiPlayerShotChart>(
        `/players/${encodeURIComponent(playerId)}/shot-chart`,
      )
      return mapPlayerShotChart(data)
    },
  }
}
