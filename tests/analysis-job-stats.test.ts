import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAnalysisJobStatsService,
  type ApiAnalysisJobShootingStats,
} from '../src/services/api/analysis-job-stats.client.ts'
import type { AnalysisJobRequest } from '../src/services/api/analysis-jobs.client.ts'
import {
  analysisJobStatsLoadKey,
  loadAnalysisJobStats,
  type AnalysisJobStatsLoadContext,
} from '../src/pages/analysis/analysis-job-stats.ts'

function shootingTotals() {
  return {
    points: 5,
    field_goals_made: 2,
    field_goals_attempted: 4,
    field_goal_pct: 0.5,
    two_point_made: 1,
    two_point_attempted: 2,
    two_point_pct: 0.5,
    three_point_made: 1,
    three_point_attempted: 2,
    three_point_pct: 0.5,
    by_zone: {
      mid_range: { made: 1, attempted: 2, pct: 0.5 },
      above_the_break_three: { made: 1, attempted: 2, pct: 0.5 },
    },
  }
}

function apiStats(
  overrides: Partial<ApiAnalysisJobShootingStats> = {},
): ApiAnalysisJobShootingStats {
  return {
    job_id: 'job-1',
    video_id: 'video-1',
    our_team_side: 1,
    teams: [
      { team_id: 0, players_tracked: 1, ...shootingTotals() },
      { team_id: 1, players_tracked: 2, ...shootingTotals() },
    ],
    players: [
      {
        track_id: 9,
        team_id: 1,
        jersey_number: '22',
        roster_player_id: 'player-22',
        roster_name: 'Derrick White',
        display_name: 'Derrick White',
        ...shootingTotals(),
      },
      {
        track_id: 3,
        team_id: 1,
        jersey_number: null,
        roster_player_id: null,
        roster_name: null,
        display_name: 'Player 3',
        ...shootingTotals(),
      },
    ],
    shots: [
      {
        shot_id: 1,
        track_id: 9,
        team_id: 1,
        jersey_number: '22',
        roster_player_id: 'player-22',
        roster_name: 'Derrick White',
        made: true,
        outcome: 'made',
        points: 2,
        zone: 'mid_range',
        distance_m: 5.43,
        court_x_m: 3.87,
        court_y_m: 13.27,
        timestamp_seconds: 4,
        shot_type: 'jump_shot',
        attribution: 'nearest_player_bbox_to_shot_anchor',
      },
    ],
    coverage: {
      shots_detected: 6,
      shots_scored: 4,
      shots_without_court_position: 1,
      shots_without_shooter: 1,
      players_tracked: 3,
      players_with_jersey_number: 1,
      players_linked_to_roster: 1,
      measures: ['shooting'],
      not_measured: ['rebounds', 'assists', 'turnovers', 'steals', 'fouls', 'minutes'],
    },
    ...overrides,
  }
}

const readyContext: AnalysisJobStatsLoadContext = {
  jobId: 'job/id',
  teamId: 'team id',
  status: 'DONE',
  ourTeamSide: 1,
}

test('GET uses the real stats endpoint and maps the response', async () => {
  const paths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    paths.push(path)
    return apiStats() as T
  }
  const service = createAnalysisJobStatsService(request)

  const stats = await service.get('job/id', 'team id')

  assert.deepEqual(paths, ['/jobs/job%2Fid/stats?team_id=team%20id'])
  assert.equal(stats.jobId, 'job-1')
  assert.equal(stats.videoId, 'video-1')
  assert.equal(stats.ourTeamSide, 1)
  assert.equal(stats.shots[0]?.courtXM, 3.87)
})

test('maps team shooting totals, percentages, and zones', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats() as T)
  const stats = await service.get('job-1', 'team-1')
  const team = stats.teams.find((item) => item.teamSide === 1)

  assert.equal(team?.points, 5)
  assert.equal(team?.fieldGoalsMade, 2)
  assert.equal(team?.fieldGoalsAttempted, 4)
  assert.equal(team?.twoPointMade, 1)
  assert.equal(team?.threePointMade, 1)
  assert.deepEqual(team?.byZone.mid_range, { made: 1, attempted: 2, percentage: 0.5 })
})

test('maps shooting totals for every tracked player', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats() as T)
  const stats = await service.get('job-1', 'team-1')
  const player = stats.players.find((item) => item.trackId === 9)

  assert.equal(player?.points, 5)
  assert.equal(player?.fieldGoalPercentage, 0.5)
  assert.equal(player?.twoPointAttempted, 2)
  assert.equal(player?.threePointAttempted, 2)
})

test('preserves the backend roster identity for a linked player', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats() as T)
  const stats = await service.get('job-1', 'team-1')
  const linked = stats.players.find((item) => item.trackId === 9)

  assert.equal(linked?.rosterPlayerId, 'player-22')
  assert.equal(linked?.rosterName, 'Derrick White')
  assert.equal(linked?.displayName, 'Derrick White')
})

test('keeps the backend fallback for a player without complete identity', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats() as T)
  const stats = await service.get('job-1', 'team-1')
  const anonymous = stats.players.find((item) => item.trackId === 3)

  assert.equal(anonymous?.jerseyNumber, null)
  assert.equal(anonymous?.rosterPlayerId, null)
  assert.equal(anonymous?.rosterName, null)
  assert.equal(anonymous?.displayName, 'Player 3')
})

test('maps partial coverage and explicitly unmeasured metrics', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats() as T)
  const stats = await service.get('job-1', 'team-1')

  assert.equal(stats.coverage.shotsDetected, 6)
  assert.equal(stats.coverage.shotsScored, 4)
  assert.equal(stats.coverage.shotsWithoutCourtPosition, 1)
  assert.equal(stats.coverage.playersLinkedToRoster, 1)
  assert.deepEqual(stats.coverage.measures, ['shooting'])
  assert.deepEqual(stats.coverage.notMeasured, ['rebounds', 'assists', 'turnovers', 'steals', 'fouls', 'minutes'])
})

test('keeps an empty stats response empty without fabricating totals', async () => {
  const service = createAnalysisJobStatsService(async <T>() => apiStats({
    teams: [],
    players: [],
    shots: [],
  }) as T)

  const stats = await service.get('job-1', 'team-1')

  assert.deepEqual(stats.teams, [])
  assert.deepEqual(stats.players, [])
  assert.deepEqual(stats.shots, [])
})

test('a failed load can be retried without changing the contract', async () => {
  let attempts = 0
  const request: AnalysisJobRequest = async <T>() => {
    attempts += 1
    if (attempts === 1) throw new Error('Stats unavailable')
    return apiStats() as T
  }
  const service = createAnalysisJobStatsService(request)

  await assert.rejects(loadAnalysisJobStats(readyContext, service), /Stats unavailable/)
  const retried = await loadAnalysisJobStats(readyContext, service)

  assert.equal(attempts, 2)
  assert.equal(retried?.teams.length, 2)
})

test('does not request stats before the job is DONE', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return apiStats() as never } }

  const result = await loadAnalysisJobStats({ ...readyContext, status: 'RUNNING' }, service)

  assert.equal(result, null)
  assert.equal(calls, 0)
})

test('does not request stats until our_team_side is confirmed', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return apiStats() as never } }

  const result = await loadAnalysisJobStats({ ...readyContext, ourTeamSide: null }, service)

  assert.equal(result, null)
  assert.equal(calls, 0)
})

test('changing the confirmed side changes the load key and refreshes stats', async () => {
  const requestedSides: Array<0 | 1> = []
  const service = {
    get: async () => {
      const side = requestedSides.length === 0 ? 0 : 1
      requestedSides.push(side)
      return createAnalysisJobStatsService(async <T>() => apiStats({ our_team_side: side }) as T)
        .get('job-1', 'team-1')
    },
  }
  const sideZero = { ...readyContext, ourTeamSide: 0 as const }
  const sideOne = { ...readyContext, ourTeamSide: 1 as const }

  assert.notEqual(analysisJobStatsLoadKey(sideZero), analysisJobStatsLoadKey(sideOne))
  const first = await loadAnalysisJobStats(sideZero, service)
  const second = await loadAnalysisJobStats(sideOne, service)

  assert.deepEqual(requestedSides, [0, 1])
  assert.equal(first?.ourTeamSide, 0)
  assert.equal(second?.ourTeamSide, 1)
})
