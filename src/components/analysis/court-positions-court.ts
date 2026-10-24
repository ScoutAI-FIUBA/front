import type {
  AnalysisJobCourtPosition,
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
} from '../../types/index.ts'

export interface CourtPositionUiPoint {
  leftPercent: number
  topPercent: number
}

export function courtPositionPointToPercent(
  court: AnalysisJobCourtPositions['court'],
  position: Pick<AnalysisJobCourtPosition, 'xM' | 'yM'>,
): CourtPositionUiPoint | null {
  if (!Number.isFinite(court.lengthM) || court.lengthM <= 0) return null
  if (!Number.isFinite(court.widthM) || court.widthM <= 0) return null
  if (!Number.isFinite(position.xM) || !Number.isFinite(position.yM)) return null
  if (position.xM < 0 || position.xM > court.lengthM) return null
  if (position.yM < 0 || position.yM > court.widthM) return null

  return {
    leftPercent: (position.xM / court.lengthM) * 100,
    topPercent: (position.yM / court.widthM) * 100,
  }
}

export function validCourtPositions(
  court: AnalysisJobCourtPositions['court'],
  positions: AnalysisJobCourtPosition[],
): AnalysisJobCourtPosition[] {
  return positions.filter((position) => courtPositionPointToPercent(court, position) != null)
}

export function playerColor(player: AnalysisJobCourtPositionsPlayer): string {
  if (!player.stablePlayerId) {
    const hue = ((player.trackId * 137.508) % 360 + 360) % 360
    return `hsl(${hue.toFixed(1)} 72% 38%)`
  }
  const hash = [...player.stablePlayerId].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
    0,
  )
  const hue = ((hash * 137.508) % 360 + 360) % 360
  return `hsl(${hue.toFixed(1)} 72% 38%)`
}
