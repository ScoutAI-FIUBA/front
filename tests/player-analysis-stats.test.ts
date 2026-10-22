import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import {
  createPlayerAnalysisService,
  mapPlayerAnalysisStats,
  mapPlayerShotChart,
  type ApiPlayerAnalysisStats,
  type ApiPlayerShotChart,
} from '../src/services/api/player-analysis.client.ts'
import type { AnalysisJobRequest } from '../src/services/api/analysis-jobs.client.ts'
import {
  formatShootingPct,
  hasPlayerAnalysisStats,
  playerShotsToCourtShots,
} from '../src/pages/players/player-analysis-stats.ts'

function readSource(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

function apiStats(): ApiPlayerAnalysisStats {
  return {
    player_id: 'p-1',
    calc_version: 2,
    games: 2,
    points: 11,
    field_goals: { made: 5, attempted: 9, pct: 0.5556 },
    two_point: { made: 3, attempted: 5, pct: 0.6 },
    three_point: { made: 2, attempted: 4, pct: null },
    unresolved_attempts: 1,
    seconds_on_screen: 123.4,
    distance_m: null,
    by_zone: {
      corner_three: { made: 1, attempted: 2, unresolved_attempts: 0, pct: 0.5 },
      paint: { made: 2, attempted: 3, unresolved_attempts: 1, pct: null },
    },
    by_shot_type: {
      jump_shot: { made: 3, attempted: 6, unresolved_attempts: 0, pct: 0.5 },
    },
    videos: [
      {
        job_id: 'job-1',
        video_id: 'video-1',
        video_title: null,
        jersey_number: '7',
        seconds_on_screen: 60,
        distance_m: 40.5,
        points: 6,
        field_goals_made: 3,
        field_goals_attempted: 5,
        two_point_made: 2,
        two_point_attempted: 3,
        three_point_made: 1,
        three_point_attempted: 2,
        unresolved_attempts: 1,
      },
    ],
    not_measured: ['rebounds', 'minutes'],
  }
}

function apiChart(): ApiPlayerShotChart {
  const base = {
    shot_id: 3,
    job_id: 'job-1',
    video_id: 'video-1',
    video_title: 'Partido',
    x_m: 5,
    y_m: 7,
    made: false,
    shot_value: 3 as const,
    zone: 'corner_three',
    shot_type: 'jump_shot',
    distance_m: 6.5,
    timestamp_seconds: 12,
    outcome_confidence: 'unresolved' as const,
    needs_review: true,
  }
  return {
    player_id: 'p-1',
    player: {
      id: 'p-1',
      first_name: 'Ana',
      last_name: 'Pérez',
      jersey_number: '7',
      team_id: 'team-1',
    },
    calc_version: 2,
    court: {
      length_m: 28,
      width_m: 15,
      hoop_inset_m: 1.575,
      hoops: { home: { x_m: 1.575, y_m: 7.5 }, away: { x_m: 26.425, y_m: 7.5 } },
      three_point_radius_m: 6.75,
      corner_three_lateral_m: 6.6,
    },
    shots: [
      { ...base, shot_key: 'job-1:3', result: 'unknown' },
      { ...base, shot_key: 'job-2:3', result: 'made', made: true, shot_value: 2 },
    ],
    coverage: { shots_charted: 2, made: 1, missed: 0, unresolved: 1, videos: 1 },
  }
}

test('mapPlayerAnalysisStats maps the full payload to camelCase', () => {
  const result = mapPlayerAnalysisStats(apiStats())

  assert.equal(result.playerId, 'p-1')
  assert.equal(result.calcVersion, 2)
  assert.equal(result.games, 2)
  assert.equal(result.points, 11)
  assert.deepEqual(result.fieldGoals, { made: 5, attempted: 9, pct: 0.5556 })
  assert.deepEqual(result.twoPoint, { made: 3, attempted: 5, pct: 0.6 })
  assert.equal(result.unresolvedAttempts, 1)
  assert.equal(result.secondsOnScreen, 123.4)
  assert.equal(result.distanceM, null)
  assert.deepEqual(result.byZone.corner_three, {
    made: 1,
    attempted: 2,
    pct: 0.5,
    unresolvedAttempts: 0,
  })
  assert.equal(result.byZone.paint.unresolvedAttempts, 1)
  assert.equal(result.byShotType.jump_shot.attempted, 6)
  assert.deepEqual(result.notMeasured, ['rebounds', 'minutes'])
  assert.deepEqual(result.videos[0], {
    jobId: 'job-1',
    videoId: 'video-1',
    videoTitle: null,
    jerseyNumber: '7',
    secondsOnScreen: 60,
    distanceM: 40.5,
    points: 6,
    fieldGoals: { made: 3, attempted: 5 },
    twoPoint: { made: 2, attempted: 3 },
    threePoint: { made: 1, attempted: 2 },
    unresolvedAttempts: 1,
  })
  assert.equal(hasPlayerAnalysisStats(result), true)
})

test('mapPlayerAnalysisStats keeps a null pct instead of turning it into 0', () => {
  const result = mapPlayerAnalysisStats(apiStats())

  assert.equal(result.threePoint.pct, null)
  assert.equal(result.byZone.paint.pct, null)
})

test('mapPlayerAnalysisStats maps the empty payload to the empty state', () => {
  const empty: ApiPlayerAnalysisStats = {
    player_id: 'p-2',
    calc_version: 2,
    games: 0,
    points: 0,
    field_goals: { made: 0, attempted: 0, pct: null },
    two_point: { made: 0, attempted: 0, pct: null },
    three_point: { made: 0, attempted: 0, pct: null },
    unresolved_attempts: 0,
    seconds_on_screen: null,
    distance_m: null,
    by_zone: {},
    by_shot_type: {},
    videos: [],
    not_measured: [],
  }

  const result = mapPlayerAnalysisStats(empty)

  assert.equal(result.games, 0)
  assert.equal(result.secondsOnScreen, null)
  assert.deepEqual(result.byZone, {})
  assert.deepEqual(result.videos, [])
  assert.equal(result.fieldGoals.pct, null)
  assert.equal(hasPlayerAnalysisStats(result), false)
})

test('mapPlayerShotChart keeps result and has no made property', () => {
  const result = mapPlayerShotChart(apiChart())

  assert.equal(result.player.firstName, 'Ana')
  assert.equal(result.court.lengthM, 28)
  assert.equal(result.coverage.shotsCharted, 2)
  assert.equal(result.shots[0].result, 'unknown')
  assert.equal(result.shots[0].shotKey, 'job-1:3')
  assert.equal(result.shots[0].shotValue, 3)
  for (const shot of result.shots) {
    assert.equal('made' in shot, false)
  }
})

test('formatShootingPct converts a fraction to a rounded percentage', () => {
  assert.equal(formatShootingPct(0.667), '67%')
  assert.equal(formatShootingPct(null), '—')
  assert.equal(formatShootingPct(0), '0%')
})

test('playerShotsToCourtShots keeps unknown as not made and uses shotValue and shotKey', () => {
  const shots = playerShotsToCourtShots(mapPlayerShotChart(apiChart()))

  assert.equal(shots[0].result, 'unknown')
  assert.equal(shots[0].made, false)
  assert.equal(shots[0].points, 3)
  assert.equal(shots[0].shotId, 'job-1:3')
  assert.equal(shots[1].made, true)
  assert.equal(shots[1].points, 2)
  assert.equal(shots[1].shotId, 'job-2:3')
})

test('the client requests the exact analysis-stats and shot-chart paths', async () => {
  const requests: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    requests.push(path)
    return (path.endsWith('/shot-chart') ? apiChart() : apiStats()) as T
  }
  const service = createPlayerAnalysisService(request)

  const stats = await service.getStats('p/1 x')
  const chart = await service.getShotChart('p/1 x')

  assert.deepEqual(requests, [
    '/players/p%2F1%20x/analysis-stats',
    '/players/p%2F1%20x/shot-chart',
  ])
  assert.equal(stats.playerId, 'p-1')
  assert.equal(chart.playerId, 'p-1')
})

test('the player analysis mock is deterministic', () => {
  assert.equal(
    readSource('../src/services/mock/player-analysis.mock.ts').includes('Math.random('),
    false,
  )
})

test('PlayersPage wires PlayerAnalysisStatsSheet', () => {
  assert.match(
    readSource('../src/pages/players/PlayersPage.tsx'),
    /PlayerAnalysisStatsSheet/,
  )
})

test('TeamDetailPage does not use playerAnalysisService', () => {
  assert.equal(
    readSource('../src/pages/teams/TeamDetailPage.tsx').includes('playerAnalysisService'),
    false,
  )
})

const sheetPath = new URL('../src/pages/players/PlayerAnalysisStatsSheet.tsx', import.meta.url)
test(
  'PlayerAnalysisStatsSheet never claims minutes played',
  { skip: existsSync(sheetPath) ? false : 'PlayerAnalysisStatsSheet.tsx does not exist yet' },
  () => {
    assert.equal(/minutos jugados/i.test(readFileSync(sheetPath, 'utf8')), false)
  },
)
