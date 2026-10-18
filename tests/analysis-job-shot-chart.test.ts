import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createAnalysisJobShotChartService,
  type ApiAnalysisJobShotChart,
  type ApiAnalysisJobShotChartShot,
} from '../src/services/api/analysis-job-shot-chart.client.ts'
import type { AnalysisJobRequest } from '../src/services/api/analysis-jobs.client.ts'
import {
  analysisJobShotChartLoadKey,
  loadAnalysisJobShotChart,
  type AnalysisJobShotChartLoadContext,
} from '../src/pages/analysis/analysis-job-shot-chart.ts'
import {
  shotChartPointToPercent,
  shotChartResultLabel,
} from '../src/components/analysis/shot-chart-court.ts'
import { basketballCourtLineGeometry } from '../src/components/analysis/basketball-court-lines.ts'
import type { AnalysisJobShotChartCourt, ShotChartResult } from '../src/types/index.ts'

function apiShot(
  result: ShotChartResult,
  overrides: Partial<ApiAnalysisJobShotChartShot> = {},
): ApiAnalysisJobShotChartShot {
  return {
    shot_id: 1,
    track_id: 9,
    team_id: 1,
    jersey_number: '22',
    roster_player_id: 'player-22',
    roster_name: 'Derrick White',
    x_m: 14,
    y_m: 7.5,
    made: result === 'made',
    result,
    points: 2,
    zone: 'mid_range',
    distance_m: 5.43,
    shot_type: 'jump_shot',
    timestamp_seconds: 4,
    attribution: 'nearest_player_bbox_to_shot_anchor',
    ...overrides,
  }
}

function apiChart(
  overrides: Partial<ApiAnalysisJobShotChart> = {},
): ApiAnalysisJobShotChart {
  const made = apiShot('made')
  const missed = apiShot('missed', { shot_id: 2, x_m: 9.5, points: 3, zone: 'above_the_break_three' })
  const unknown = apiShot('unknown', {
    shot_id: 3,
    track_id: null,
    jersey_number: null,
    roster_player_id: null,
    roster_name: null,
    x_m: 20,
  })

  return {
    court: {
      length_m: 28,
      width_m: 15,
      hoop_inset_m: 1.575,
      hoops: {
        home: { x_m: 1.575, y_m: 7.5 },
        away: { x_m: 26.425, y_m: 7.5 },
      },
      three_point_radius_m: 6.75,
      corner_three_lateral_m: 6.6,
    },
    shots: [made, missed, unknown],
    players: [
      {
        track_id: 9,
        team_id: 1,
        jersey_number: '22',
        display_name: 'Derrick White',
        shots: [made, missed],
      },
      {
        track_id: 3,
        team_id: 0,
        jersey_number: null,
        display_name: 'Player 3',
        shots: [],
      },
    ],
    coverage: {
      shots_detected: 4,
      shots_scored: 3,
      shots_without_court_position: 1,
      shots_without_shooter: 1,
      players_tracked: 2,
      players_with_jersey_number: 1,
      players_linked_to_roster: 1,
      measures: ['shooting'],
      not_measured: ['rebounds', 'assists'],
      shots_charted: 3,
      filtered_to_track_id: null,
    },
    ...overrides,
  }
}

const readyContext: AnalysisJobShotChartLoadContext = {
  jobId: 'job/id',
  teamId: 'team id',
  status: 'DONE',
  ourTeamSide: 1,
}

test('GET uses the real shot-chart endpoint and maps the full response', async () => {
  const paths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    paths.push(path)
    return apiChart() as T
  }
  const service = createAnalysisJobShotChartService(request)

  const chart = await service.get('job/id', 'team id')

  assert.deepEqual(paths, ['/jobs/job%2Fid/shot-chart?team_id=team%20id'])
  assert.equal(chart.court.lengthM, 28)
  assert.equal(chart.court.hoops.away.xM, 26.425)
  assert.equal(chart.players[0]?.displayName, 'Derrick White')
  assert.equal(chart.coverage.shotsCharted, 3)
})

test('maps a made shot as converted', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const shot = (await service.get('job-1', 'team-1')).shots[0]

  assert.equal(shot?.made, true)
  assert.equal(shot?.result, 'made')
  assert.equal(shotChartResultLabel('made'), 'Convertido')
})

test('maps a missed shot as a miss', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const shot = (await service.get('job-1', 'team-1')).shots[1]

  assert.equal(shot?.made, false)
  assert.equal(shot?.result, 'missed')
  assert.equal(shotChartResultLabel('missed'), 'Fallado')
})

test('keeps unknown distinct from missed', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const shot = (await service.get('job-1', 'team-1')).shots[2]

  assert.equal(shot?.made, false)
  assert.equal(shot?.result, 'unknown')
  assert.equal(shotChartResultLabel('unknown'), 'Resultado desconocido')
  assert.notEqual(shotChartResultLabel('unknown'), shotChartResultLabel('missed'))
})

test('maps metre coordinates and transforms them using court dimensions', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const chart = await service.get('job-1', 'team-1')
  const shot = chart.shots[0]

  assert.equal(shot?.xM, 14)
  assert.equal(shot?.yM, 7.5)
  assert.deepEqual(
    shot && shotChartPointToPercent(chart.court, shot),
    { leftPercent: 50, topPercent: 50 },
  )
})

test('draws the backend FIBA three-point geometry in the same metre coordinate frame', () => {
  const geometry = basketballCourtLineGeometry({
    lengthM: 28,
    widthM: 15,
    hoopInsetM: 1.575,
    threePointRadiusM: 6.75,
    cornerThreeLateralM: 6.6,
  })

  assert.equal(geometry.centreY, 7.5)
  assert.ok(Math.abs(geometry.topCornerY - 0.9) < 1e-10)
  assert.ok(Math.abs(geometry.bottomCornerY - 14.1) < 1e-10)
  assert.ok(Math.abs(geometry.leftArcX - 2.990097169808489) < 1e-10)
  assert.ok(Math.abs(geometry.rightArcX - 25.00990283019151) < 1e-10)
  assert.equal(geometry.threePointRadiusM, 6.75)
})

test('keeps scaled shot markers aligned with the court metre view box', () => {
  const court: AnalysisJobShotChartCourt = {
    lengthM: 28,
    widthM: 15,
    hoopInsetM: 1.575,
    hoops: {
      home: { xM: 1.575, yM: 7.5 },
      away: { xM: 26.425, yM: 7.5 },
    },
    threePointRadiusM: 6.75,
    cornerThreeLateralM: 6.6,
  }

  const point = shotChartPointToPercent(court, { xM: 1.575, yM: 0.9 })

  assert.ok(point)
  assert.ok(Math.abs(point.leftPercent - 5.625) < 1e-10)
  assert.ok(Math.abs(point.topPercent - 6) < 1e-10)
})

test('keeps the shot court responsive without changing its metre coordinate frame', () => {
  const source = readFileSync(
    new URL('../src/components/analysis/ShotChartCourt.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /style=\{\{ aspectRatio: `\$\{court\.lengthM\} \/ \$\{court\.widthM\}` \}\}/)
  assert.match(source, /viewBox=\{`0 0 \$\{court\.lengthM\} \$\{court\.widthM\}`\}/)
  assert.match(source, /className="absolute inset-0 h-full w-full"/)
  assert.doesNotMatch(source, /min-w-\[/)
})

test('preserves linked and unlinked player identity exactly as returned', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const chart = await service.get('job-1', 'team-1')

  assert.equal(chart.shots[0]?.rosterPlayerId, 'player-22')
  assert.equal(chart.shots[0]?.rosterName, 'Derrick White')
  assert.equal(chart.shots[2]?.trackId, null)
  assert.equal(chart.shots[2]?.rosterPlayerId, null)
  assert.equal(chart.shots[2]?.rosterName, null)
  assert.equal(chart.players[1]?.displayName, 'Player 3')
  assert.equal(chart.players[1]?.stablePlayerId, null)
})

test('maps model v2 stable identity and stable-player filter coverage', async () => {
  const response = apiChart()
  response.players[0] = {
    ...response.players[0]!,
    stable_player_id: 'player-stable-22',
  }
  response.shots[0] = {
    ...response.shots[0]!,
    stable_player_id: 'player-stable-22',
  }
  response.coverage.players_on_court = 10
  response.coverage.filtered_to_stable_player_id = 'player-stable-22'
  const service = createAnalysisJobShotChartService(async <T>() => response as T)

  const chart = await service.get('job-1', 'team-1')

  assert.equal(chart.players[0]?.stablePlayerId, 'player-stable-22')
  assert.equal(chart.shots[0]?.stablePlayerId, 'player-stable-22')
  assert.equal(chart.coverage.playersOnCourt, 10)
  assert.equal(chart.coverage.filteredToStablePlayerId, 'player-stable-22')
})

test('does not place invalid coordinates on the court and preserves missing-position coverage', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart() as T)
  const chart = await service.get('job-1', 'team-1')

  assert.equal(chart.coverage.shotsWithoutCourtPosition, 1)
  assert.equal(
    shotChartPointToPercent(chart.court, { xM: -2, yM: 7.5 }),
    null,
  )
  assert.equal(
    shotChartPointToPercent(chart.court, { xM: Number.NaN, yM: 7.5 }),
    null,
  )
})

test('keeps an empty shot chart empty', async () => {
  const service = createAnalysisJobShotChartService(async <T>() => apiChart({
    shots: [],
    players: [],
    coverage: {
      ...apiChart().coverage,
      shots_charted: 0,
    },
  }) as T)

  const chart = await service.get('job-1', 'team-1')

  assert.deepEqual(chart.shots, [])
  assert.deepEqual(chart.players, [])
  assert.equal(chart.coverage.shotsCharted, 0)
})

test('a failed load can be retried', async () => {
  let attempts = 0
  const service = createAnalysisJobShotChartService(async <T>() => {
    attempts += 1
    if (attempts === 1) throw new Error('Chart unavailable')
    return apiChart() as T
  })

  await assert.rejects(loadAnalysisJobShotChart(readyContext, service), /Chart unavailable/)
  const retried = await loadAnalysisJobShotChart(readyContext, service)

  assert.equal(attempts, 2)
  assert.equal(retried?.shots.length, 3)
})

test('does not request a shot chart without a confirmed team side', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return {} as never } }

  const result = await loadAnalysisJobShotChart({ ...readyContext, ourTeamSide: null }, service)

  assert.equal(result, null)
  assert.equal(calls, 0)
})

test('does not request a shot chart before DONE', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return {} as never } }

  const result = await loadAnalysisJobShotChart({ ...readyContext, status: 'RUNNING' }, service)

  assert.equal(result, null)
  assert.equal(calls, 0)
})

test('changing ourTeamSide changes the load key and refreshes the chart', async () => {
  let calls = 0
  const service = createAnalysisJobShotChartService(async <T>() => {
    calls += 1
    return apiChart() as T
  })
  const sideZero = { ...readyContext, ourTeamSide: 0 as const }
  const sideOne = { ...readyContext, ourTeamSide: 1 as const }

  assert.notEqual(analysisJobShotChartLoadKey(sideZero), analysisJobShotChartLoadKey(sideOne))
  await loadAnalysisJobShotChart(sideZero, service)
  await loadAnalysisJobShotChart(sideOne, service)

  assert.equal(calls, 2)
})
