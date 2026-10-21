import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildAnalysisJobPlayerShootingRows,
  filterAnalysisJobIdentifiedShotChartPlayers,
  formatAnalysisShootingMetric,
} from '../src/pages/analysis/analysis-job-player-stats.ts'
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
  assert.match(source, /No hay estadísticas por jugador/)
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
  assert.match(source, /filterAnalysisJobShots\(chart\.shots, filters\)/)
  assert.match(source, /aria-label="Filtrar por jugador"/)
  assert.match(source, /identifiedChartPlayers\.map/)
  assert.match(source, /filterAnalysisJobIdentifiedShotChartPlayers/)
  assert.match(source, /isAnalysisJobPlayerIdentified/)
  assert.match(source, /current\.player === filters\.player/)
  assert.match(source, /player: 'all'/)
  assert.match(source, /onSelectShot=\{selectShot\}/)
})
