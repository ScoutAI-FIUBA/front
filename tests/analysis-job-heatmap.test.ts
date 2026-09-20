import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCourtPositionsHeatmap,
  COURT_POSITIONS_HEATMAP_CELL_SIZE_M,
} from '../src/components/analysis/court-positions-heatmap.ts'
import { validCourtPositions } from '../src/components/analysis/court-positions-court.ts'
import {
  filterCourtPositionPlayers,
  loadAnalysisJobCourtPositions,
} from '../src/pages/analysis/analysis-job-court-positions.ts'
import type {
  AnalysisJobCourtPosition,
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
} from '../src/types/index.ts'

const court = { lengthM: 28, widthM: 15 }

function player(
  trackId: number,
  teamSide: 0 | 1 | null,
  positions: AnalysisJobCourtPosition[],
): AnalysisJobCourtPositionsPlayer {
  return {
    trackId,
    teamSide,
    jerseyNumber: null,
    positions,
    movement: {
      samples: positions.length,
      distanceM: 0,
      averagePosition: { xM: 0, yM: 0 },
    },
  }
}

function positionsResponse(players: AnalysisJobCourtPositionsPlayer[]): AnalysisJobCourtPositions {
  return {
    jobId: 'job-1',
    videoId: 'video-1',
    court,
    players,
    coverage: {
      sourceFile: 'projected_tracks.jsonl',
      recordsRead: players.reduce((total, item) => total + item.positions.length, 0),
      recordsOffCourt: 0,
      sampleEvery: 5,
      truncated: false,
    },
  }
}

test('bins valid samples into approximately one metre cells', () => {
  const result = buildCourtPositionsHeatmap(
    { lengthM: 4, widthM: 3 },
    [player(1, 0, [
      { frameIndex: 0, xM: 0.2, yM: 0.2 },
      { frameIndex: 5, xM: 0.8, yM: 0.8 },
      { frameIndex: 10, xM: 1.2, yM: 0.2 },
    ])],
  )

  assert.equal(COURT_POSITIONS_HEATMAP_CELL_SIZE_M, 1)
  assert.equal(result.totalSamples, 3)
  assert.deepEqual(
    result.cells.map(({ column, row, samples }) => ({ column, row, samples })),
    [
      { column: 0, row: 0, samples: 2 },
      { column: 1, row: 0, samples: 1 },
    ],
  )
})

test('keeps coordinates exactly on every court boundary', () => {
  const result = buildCourtPositionsHeatmap(
    { lengthM: 2, widthM: 2 },
    [player(1, 0, [
      { frameIndex: 0, xM: 0, yM: 0 },
      { frameIndex: 5, xM: 2, yM: 2 },
    ])],
  )

  assert.equal(result.totalSamples, 2)
  assert.deepEqual(
    result.cells.map(({ column, row }) => ({ column, row })),
    [{ column: 0, row: 0 }, { column: 1, row: 1 }],
  )
})

test('discards non-finite coordinates', () => {
  const result = buildCourtPositionsHeatmap(court, [player(1, 0, [
    { frameIndex: 0, xM: Number.NaN, yM: 2 },
    { frameIndex: 5, xM: 2, yM: Number.POSITIVE_INFINITY },
  ])])

  assert.equal(result.totalSamples, 0)
  assert.deepEqual(result.cells, [])
})

test('discards positions outside the court', () => {
  const result = buildCourtPositionsHeatmap(court, [player(1, 0, [
    { frameIndex: 0, xM: -0.1, yM: 2 },
    { frameIndex: 5, xM: 28.1, yM: 2 },
    { frameIndex: 10, xM: 2, yM: -0.1 },
    { frameIndex: 15, xM: 2, yM: 15.1 },
  ])])

  assert.equal(result.totalSamples, 0)
  assert.deepEqual(result.cells, [])
})

test('adapts the final cells to dynamic non-integer court dimensions', () => {
  const result = buildCourtPositionsHeatmap(
    { lengthM: 2.5, widthM: 1.5 },
    [player(1, 0, [{ frameIndex: null, xM: 2.4, yM: 1.4 }])],
  )
  const cell = result.cells[0]

  assert.equal(cell?.column, 2)
  assert.equal(cell?.row, 1)
  assert.equal(cell?.xM, 2)
  assert.equal(cell?.yM, 1)
  assert.equal(cell?.widthM, 0.5)
  assert.equal(cell?.heightM, 0.5)
})

test('normalizes the most populated cell to an intensity of one', () => {
  const result = buildCourtPositionsHeatmap(
    { lengthM: 4, widthM: 3 },
    [player(1, 0, [
      { frameIndex: 0, xM: 0.2, yM: 0.2 },
      { frameIndex: 5, xM: 0.3, yM: 0.3 },
      { frameIndex: 10, xM: 1.2, yM: 0.2 },
    ])],
  )

  assert.equal(result.maxSamplesPerCell, 2)
  assert.equal(result.cells[0]?.intensity, 1)
  assert.equal(result.cells[1]?.intensity, 0.5)
})

test('renormalizes density against the active local filter', () => {
  const players = [
    player(1, 0, [
      { frameIndex: 0, xM: 0.2, yM: 0.2 },
      { frameIndex: 5, xM: 0.3, yM: 0.3 },
      { frameIndex: 10, xM: 1.2, yM: 0.2 },
    ]),
    player(2, 1, [
      { frameIndex: 0, xM: 1.2, yM: 0.2 },
      { frameIndex: 5, xM: 1.3, yM: 0.3 },
      { frameIndex: 10, xM: 1.4, yM: 0.4 },
      { frameIndex: 15, xM: 1.5, yM: 0.5 },
    ]),
  ]

  const allTracks = buildCourtPositionsHeatmap(court, filterCourtPositionPlayers(players, 'all'))
  const sideZero = buildCourtPositionsHeatmap(court, filterCourtPositionPlayers(players, 'side-0'))
  const allCellZero = allTracks.cells.find((cell) => cell.column === 0 && cell.row === 0)
  const sideZeroCellZero = sideZero.cells.find((cell) => cell.column === 0 && cell.row === 0)

  assert.equal(allTracks.maxSamplesPerCell, 5)
  assert.equal(allCellZero?.intensity, 0.4)
  assert.equal(sideZero.maxSamplesPerCell, 2)
  assert.equal(sideZeroCellZero?.intensity, 1)
})

test('returns a dedicated empty result for visible tracks without valid positions', () => {
  const result = buildCourtPositionsHeatmap(court, [player(1, 0, [
    { frameIndex: 0, xM: -1, yM: -1 },
  ])])

  assert.equal(result.totalSamples, 0)
  assert.equal(result.maxSamplesPerCell, 0)
  assert.deepEqual(result.cells, [])
})

test('switching between trajectories and heatmap reuses one loaded response', async () => {
  let requests = 0
  const response = positionsResponse([player(1, 0, [
    { frameIndex: 0, xM: 2, yM: 3 },
    { frameIndex: 5, xM: 4, yM: 5 },
  ])])
  const service = {
    get: async () => {
      requests += 1
      return response
    },
  }
  const loaded = await loadAnalysisJobCourtPositions(
    { jobId: 'job-1', teamId: 'team-1', status: 'DONE' },
    service,
  )

  assert.ok(loaded)
  assert.equal(validCourtPositions(loaded.court, loaded.players[0]!.positions).length, 2)
  assert.equal(buildCourtPositionsHeatmap(loaded.court, loaded.players).totalSamples, 2)
  assert.equal(requests, 1)
})

test('changing the local filter rebuilds the heatmap without another request', async () => {
  let requests = 0
  const response = positionsResponse([
    player(1, 0, [{ frameIndex: 0, xM: 2, yM: 3 }]),
    player(2, 1, [{ frameIndex: 0, xM: 4, yM: 5 }]),
  ])
  const service = {
    get: async () => {
      requests += 1
      return response
    },
  }
  const loaded = await loadAnalysisJobCourtPositions(
    { jobId: 'job-1', teamId: 'team-1', status: 'DONE' },
    service,
  )

  assert.ok(loaded)
  const sideZero = filterCourtPositionPlayers(loaded.players, 'side-0')
  const oneTrack = filterCourtPositionPlayers(loaded.players, 'track:2')

  assert.equal(buildCourtPositionsHeatmap(loaded.court, sideZero).totalSamples, 1)
  assert.equal(buildCourtPositionsHeatmap(loaded.court, oneTrack).totalSamples, 1)
  assert.equal(requests, 1)
})
