import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
} from '../../types/index.ts'
import { validCourtPositions } from './court-positions-court.ts'

export const COURT_POSITIONS_HEATMAP_CELL_SIZE_M = 1

export interface CourtPositionsHeatmapCell {
  column: number
  row: number
  xM: number
  yM: number
  widthM: number
  heightM: number
  samples: number
  intensity: number
}

export interface CourtPositionsHeatmapData {
  cells: CourtPositionsHeatmapCell[]
  totalSamples: number
  maxSamplesPerCell: number
}

export function buildCourtPositionsHeatmap(
  court: AnalysisJobCourtPositions['court'],
  players: Pick<AnalysisJobCourtPositionsPlayer, 'positions'>[],
  cellSizeM = COURT_POSITIONS_HEATMAP_CELL_SIZE_M,
): CourtPositionsHeatmapData {
  if (!Number.isFinite(court.lengthM) || court.lengthM <= 0) {
    return { cells: [], totalSamples: 0, maxSamplesPerCell: 0 }
  }
  if (!Number.isFinite(court.widthM) || court.widthM <= 0) {
    return { cells: [], totalSamples: 0, maxSamplesPerCell: 0 }
  }
  if (!Number.isFinite(cellSizeM) || cellSizeM <= 0) {
    return { cells: [], totalSamples: 0, maxSamplesPerCell: 0 }
  }

  const columns = Math.ceil(court.lengthM / cellSizeM)
  const rows = Math.ceil(court.widthM / cellSizeM)
  const samplesByCell = new Map<number, number>()
  let totalSamples = 0

  for (const player of players) {
    for (const position of validCourtPositions(court, player.positions)) {
      const column = Math.min(columns - 1, Math.floor(position.xM / cellSizeM))
      const row = Math.min(rows - 1, Math.floor(position.yM / cellSizeM))
      const key = row * columns + column

      samplesByCell.set(key, (samplesByCell.get(key) ?? 0) + 1)
      totalSamples += 1
    }
  }

  const maxSamplesPerCell = Math.max(0, ...samplesByCell.values())
  const cells = [...samplesByCell.entries()]
    .map(([key, samples]) => {
      const column = key % columns
      const row = Math.floor(key / columns)
      const xM = column * cellSizeM
      const yM = row * cellSizeM

      return {
        column,
        row,
        xM,
        yM,
        widthM: Math.min(cellSizeM, court.lengthM - xM),
        heightM: Math.min(cellSizeM, court.widthM - yM),
        samples,
        intensity: maxSamplesPerCell > 0 ? samples / maxSamplesPerCell : 0,
      }
    })
    .sort((left, right) => left.row - right.row || left.column - right.column)

  return { cells, totalSamples, maxSamplesPerCell }
}
