import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  analysisJobShooterSides,
  buildAnalysisJobPlayerShootingRows,
  filterAnalysisJobIdentifiedShotChartPlayers,
  formatAnalysisShootingMetric,
} from '../src/pages/analysis/analysis-job-player-stats.ts'
import {
  mapAnalysisJobShootingStats,
  type ApiAnalysisJobShootingStats,
} from '../src/services/api/analysis-job-stats.client.ts'
import { mapAnalysisJobShotChart, type ApiAnalysisJobShotChart } from '../src/services/api/analysis-job-shot-chart.client.ts'
import type { AnalysisJobPlayerShootingStats, AnalysisJobShotChartPlayer } from '../src/types/index.ts'

function player(
  overrides: Partial<AnalysisJobPlayerShootingStats> = {},
): AnalysisJobPlayerShootingStats {
  return {
    trackId: 9,
    stablePlayerId: 'stable-9',
    teamSide: 1,
    jerseyNumber: '22',
    observations: 842,
    onCourt: true,
    rosterPlayerId: 'roster-9',
    rosterName: 'Ana Pérez',
    displayName: 'Ana Pérez',
    points: 7,
    fieldGoalsMade: 3,
    fieldGoalsAttempted: 5,
    fieldGoalPercentage: 0.6,
    twoPointMade: 2,
    twoPointAttempted: 3,
    twoPointPercentage: 2 / 3,
    threePointMade: 1,
    threePointAttempted: 2,
    threePointPercentage: 0.5,
    byZone: {
      paint: { made: 2, attempted: 3, percentage: 2 / 3 },
      corner_three: { made: 1, attempted: 2, percentage: 0.5 },
    },
    ...overrides,
  }
}

test('builds visible player rows from the already-loaded analysis stats', () => {
  const rows = buildAnalysisJobPlayerShootingRows([
    player({
      trackId: 3,
      stablePlayerId: null,
      teamSide: 0,
      jerseyNumber: null,
      observations: 0,
      onCourt: false,
      rosterPlayerId: null,
      rosterName: null,
      displayName: 'Player 3',
      points: 2,
      byZone: {},
    }),
    player(),
    player({
      trackId: 14,
      stablePlayerId: 'stable-14',
      jerseyNumber: '14',
      observations: 0,
      onCourt: false,
      rosterPlayerId: null,
      rosterName: null,
      displayName: '#14',
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalPercentage: null,
      twoPointMade: 0,
      twoPointAttempted: 0,
      twoPointPercentage: null,
      threePointMade: 0,
      threePointAttempted: 0,
      threePointPercentage: null,
      byZone: {},
    }),
  ])

  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.label, 'Ana Pérez')
  assert.equal(rows[0]?.groupLabel, 'Grupo detectado B')
  assert.equal(rows[0]?.points, 7)
  assert.equal(rows[0]?.fieldGoals, '3/5 · 60%')
  assert.equal(rows[0]?.twoPoint, '2/3 · 66,7%')
  assert.equal(rows[0]?.threePoint, '1/2 · 50%')
  assert.deepEqual(rows[0]?.zones.map((zone) => zone.key), ['paint', 'corner_three'])
  assert.equal(rows[1]?.label, '#14')
  assert.equal(rows[1]?.points, 0)
  assert.equal(rows.some((row) => row.key === 'track:3'), false)
})

test('hides jersey-only players without a team group from the table and keeps grouped ones', () => {
  const rows = buildAnalysisJobPlayerShootingRows([
    player({ trackId: 30, stablePlayerId: 'stable-30', teamSide: null, jerseyNumber: '30', rosterPlayerId: null, rosterName: null }),
    player({ trackId: 31, stablePlayerId: 'stable-31', teamSide: 0, jerseyNumber: '31', rosterPlayerId: null, rosterName: null }),
    player(),
  ])

  assert.deepEqual(rows.map((row) => row.key), ['stable:stable-31', 'stable:stable-9'])
})

test('Shot Chart selector hides players without a team group even with a roster link', () => {
  const chartPlayers: AnalysisJobShotChartPlayer[] = [
    { trackId: 30, stablePlayerId: 'stable-30', teamSide: null, jerseyNumber: '30', displayName: '#30', shots: [] },
    { trackId: 31, stablePlayerId: 'stable-31', teamSide: 0, jerseyNumber: '31', displayName: '#31', shots: [] },
    { trackId: 32, stablePlayerId: 'stable-32', teamSide: null, jerseyNumber: null, displayName: 'x', shots: [] },
  ]

  assert.deepEqual(
    filterAnalysisJobIdentifiedShotChartPlayers(chartPlayers, [player({ trackId: 32, stablePlayerId: 'stable-32' })])
      .map((candidate) => candidate.trackId),
    [31],
  )
})

test('keeps missing percentages explicit and empty player stats empty', () => {
  assert.equal(formatAnalysisShootingMetric(0, 0, null), '0/0 · —')
  assert.deepEqual(buildAnalysisJobPlayerShootingRows([]), [])
})

test('Shot Chart keeps valid jersey options when Stats fails and returns no generic options', () => {
  const chartPlayers: AnalysisJobShotChartPlayer[] = [
    {
      trackId: 7,
      stablePlayerId: null,
      teamSide: 1,
      jerseyNumber: '07',
      displayName: '#07',
      shots: [],
    },
    {
      trackId: 9,
      stablePlayerId: null,
      teamSide: 1,
      jerseyNumber: null,
      displayName: 'Player 9',
      shots: [],
    },
  ]

  assert.deepEqual(
    filterAnalysisJobIdentifiedShotChartPlayers(chartPlayers, undefined).map((candidate) => candidate.trackId),
    [7],
  )
  assert.deepEqual(
    filterAnalysisJobIdentifiedShotChartPlayers(
      chartPlayers.map((candidate) => ({ ...candidate, jerseyNumber: null })),
      undefined,
    ),
    [],
  )
})

test('Tiros renders player stats responsively without requesting stats again', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /<PlayerShootingStatsSection/)
  assert.match(source, /players=\{currentStats\?\.players \?\? \[\]\}/)
  assert.match(source, />\s*Por jugador\s*</)
  assert.match(source, />Jugador</)
  assert.match(source, />PTS</)
  assert.match(source, />TC</)
  assert.match(source, />2P</)
  assert.match(source, />3P</)
  assert.match(source, /Ningún jugador de este equipo tiene tiros detectados\./)
  assert.match(source, /md:hidden/)
  assert.match(source, /hidden overflow-x-auto rounded-xl border md:block/)
  assert.doesNotMatch(source, /analysisJobStatsService/)
})

test('player stats integration preserves the existing shot chart and filters', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /<ShotChartCourt/)
  assert.match(source, /filterAnalysisJobShots\(chart\.shots, filters, ourSide\)/)
  assert.match(source, /aria-label="Filtrar por jugador"/)
  assert.match(source, /identifiedChartPlayers\.map/)
  assert.match(source, /filterAnalysisJobIdentifiedShotChartPlayers/)
  assert.match(source, /analysisJobShotTeamScope\(filters\.team, job\.ourTeamSide\)/)
  assert.match(source, /current\.player === filters\.player/)
  assert.match(source, /player: 'all'/)
  assert.match(source, /onSelectShot=\{selectShot\}/)
})

test('Tiros table lists only players of the analysed side', () => {
  const players = [
    player({ trackId: 1, stablePlayerId: 's-1', teamSide: 0, jerseyNumber: '1' }),
    player({ trackId: 2, stablePlayerId: 's-2', teamSide: 1, jerseyNumber: '2' }),
  ]

  assert.deepEqual(buildAnalysisJobPlayerShootingRows(players, [1]).map((row) => row.key), ['stable:s-2'])
  assert.deepEqual(buildAnalysisJobPlayerShootingRows(players, [0]).map((row) => row.key), ['stable:s-1'])
})

test('Tiros table and selector drop non-shooters and keep unresolved-only shooters', () => {
  const zero = {
    fieldGoalsMade: 0, fieldGoalsAttempted: 0, fieldGoalPercentage: null,
    twoPointMade: 0, twoPointAttempted: 0, twoPointPercentage: null,
    threePointMade: 0, threePointAttempted: 0, threePointPercentage: null,
    points: 0, byZone: {},
  }
  const players = [
    player({ trackId: 1, stablePlayerId: 's-1', teamSide: 0, jerseyNumber: '1', ...zero }),
    player({ trackId: 2, stablePlayerId: 's-2', teamSide: 0, jerseyNumber: '2', ...zero }),
    player({ trackId: 3, stablePlayerId: 's-3', teamSide: 0, jerseyNumber: '3' }),
  ]
  const unresolvedShot = {
    shotId: 1, trackId: 2, stablePlayerId: 's-2', teamSide: 0, jerseyNumber: '2', rosterPlayerId: null,
    rosterName: null, xM: 1, yM: 1, made: false, result: 'unknown', points: 2, zone: 'paint',
    distanceM: 1, shotType: null, timestampSeconds: null, attribution: null,
  } as const
  const keys = analysisJobShooterSides([], [unresolvedShot], [])

  assert.deepEqual(
    buildAnalysisJobPlayerShootingRows(players, [0], keys).map((row) => row.key),
    ['stable:s-2', 'stable:s-3'],
  )
  assert.deepEqual(buildAnalysisJobPlayerShootingRows(players.slice(0, 1), [0], keys), [])

  const chartPlayers: AnalysisJobShotChartPlayer[] = [
    { trackId: 1, stablePlayerId: 's-1', teamSide: 0, jerseyNumber: '1', displayName: '#1', shots: [] },
    { trackId: 2, stablePlayerId: 's-2', teamSide: 0, jerseyNumber: '2', displayName: '#2', shots: [unresolvedShot] },
    { trackId: 4, stablePlayerId: 's-4', teamSide: 1, jerseyNumber: '4', displayName: '#4', shots: [unresolvedShot] },
  ]
  assert.deepEqual(
    filterAnalysisJobIdentifiedShotChartPlayers(chartPlayers, [], [0], analysisJobShooterSides([], [], chartPlayers))
      .map((candidate) => candidate.trackId),
    [2],
  )
})

test('Tiros shows an empty message and a team filter scoped to the analysed side', () => {
  const source = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /Ningún jugador de este equipo tiene tiros detectados\./)
  assert.doesNotMatch(source, /No hay estadísticas por jugador/)
  assert.match(source, /Equipo analizado \(\{analysisJobTeamGroupLabel\(ourSide\)\}\)/)
  assert.match(source, /Rival \(\{analysisJobTeamGroupLabel\(rivalSide\)\}\)/)
  assert.match(source, /Ambos equipos/)
  assert.match(source, /Elegí qué grupo es tu equipo en Resumen para ver sus jugadores y tiros/)
  assert.match(source, /\(\$\{filters\.team === 'own' \? 'equipo analizado' : 'rival'\}\)/)
})

// Shape taken from a saved job: one made three by jersey 7 (team_id 1, our_team_side 1).
function savedJob(shotOverrides: Record<string, unknown> = {}) {
  const totals = {
    points: 0, field_goals_made: 0, field_goals_attempted: 0, field_goal_pct: null,
    two_point_made: 0, two_point_attempted: 0, two_point_pct: null,
    three_point_made: 0, three_point_attempted: 0, three_point_pct: null, by_zone: {},
  }
  const apiShot = {
    shot_id: 1, track_id: 4000007, stable_player_id: 'player-010', team_id: 1, jersey_number: '7',
    roster_player_id: 'ce3c070a-1a8f-4f9f-97b6-0fd8fa0bca74', roster_name: 'Jaylen Brown',
    made: true, outcome: 'made', result: 'made', points: 3, zone: 'corner_three', distance_m: 7.41,
    court_x_m: 23.82, court_y_m: 14.44, x_m: 23.82, y_m: 14.44, timestamp_seconds: 6.63,
    shot_type: 'jump_shot', attribution: 'action_box_vote', ...shotOverrides,
  }
  const coverage = {
    shots_detected: 1, shots_scored: 1, shots_without_court_position: 0, shots_without_shooter: 0,
    players_tracked: 3, players_on_court: 2, players_with_jersey_number: 2, players_linked_to_roster: 1,
    measures: [], not_measured: [], shots_charted: 1, filtered_to_track_id: null, filtered_to_stable_player_id: null,
  }
  const stats = mapAnalysisJobShootingStats({
    job_id: 'job', video_id: 'video', our_team_side: 1, teams: [], shots: [apiShot], coverage,
    players: [
      { track_id: 4000007, stable_player_id: 'player-010', team_id: 1, jersey_number: '7', observations: 651, on_court: true,
        roster_player_id: 'ce3c070a-1a8f-4f9f-97b6-0fd8fa0bca74', roster_name: 'Jaylen Brown', display_name: 'Jaylen Brown',
        ...totals, points: 3, field_goals_made: 1, field_goals_attempted: 1, three_point_made: 1, three_point_attempted: 1,
        by_zone: { corner_three: { made: 1, attempted: 1, pct: 1 } } },
      { track_id: 0, stable_player_id: 'player-001', team_id: 1, jersey_number: '30', observations: 651, on_court: true,
        roster_player_id: null, roster_name: null, display_name: '#30', ...totals },
    ],
  } as unknown as ApiAnalysisJobShootingStats)
  const chart = mapAnalysisJobShotChart({
    court: { length_m: 28, width_m: 15, hoop_inset_m: 1.575, hoops: { home: { x_m: 1.575, y_m: 7.5 }, away: { x_m: 26.425, y_m: 7.5 } }, three_point_radius_m: 6.75, corner_three_lateral_m: 6.6 },
    shots: [apiShot],
    players: [{ track_id: 4000007, stable_player_id: 'player-010', team_id: 1, jersey_number: '7', display_name: 'Jaylen Brown', shots: [apiShot] }],
    coverage,
  } as unknown as ApiAnalysisJobShotChart)
  return { stats, chart }
}

test('a shooter from the saved job appears in the table and selector of its own side', () => {
  const { stats, chart } = savedJob()
  const shooters = analysisJobShooterSides(stats.shots, chart.shots, chart.players)

  assert.deepEqual(
    buildAnalysisJobPlayerShootingRows(stats.players, [1], shooters).map((row) => row.key),
    ['stable:player-010'],
  )
  assert.deepEqual(
    filterAnalysisJobIdentifiedShotChartPlayers(chart.players, stats.players, [1], shooters).map((p) => p.trackId),
    [4000007],
  )
  assert.deepEqual(buildAnalysisJobPlayerShootingRows(stats.players, [0], shooters), [])
  assert.deepEqual(buildAnalysisJobPlayerShootingRows(stats.players, [0, 1], shooters).map((row) => row.groupLabel), ['Grupo detectado B'])
})

test('the rival scope lists the rival shooter even when the analysed side has none', () => {
  const { stats, chart } = savedJob({ team_id: 0 })
  const shooters = analysisJobShooterSides(stats.shots, chart.shots, chart.players)

  assert.deepEqual(buildAnalysisJobPlayerShootingRows(stats.players, [0], shooters).map((row) => row.key), ['stable:player-010'])
  assert.equal(buildAnalysisJobPlayerShootingRows(stats.players, [0], shooters)[0]?.groupLabel, 'Grupo detectado A')
})

test('a shooter matches by track key when the shot carries no stable id', () => {
  const { stats, chart } = savedJob({ stable_player_id: null })
  const shooters = analysisJobShooterSides(stats.shots, [], [])
  const noCounters = stats.players.map((p) => ({
    ...p, fieldGoalsAttempted: 0, threePointAttempted: 0, byZone: {},
  }))
  void chart

  assert.deepEqual(buildAnalysisJobPlayerShootingRows(noCounters, [1], shooters).map((row) => row.key), ['stable:player-010'])
})
